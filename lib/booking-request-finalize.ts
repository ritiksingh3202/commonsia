import { Prisma } from "@prisma/client";

import { sha256Hex } from "@/lib/booking-action-token";
import { sendBookingConfirmationEmails, sendBookingRejectedEmail } from "@/lib/booking-emails";
import { createGoogleMentorSessionEvent } from "@/lib/create-google-mentor-session-event";
import {
  CacheKeys,
  delKeys,
  forgetBookingActionRawToken,
  invalidateAfterBooking,
  mentorMonthAvailabilityKeysAround,
  peekBookingActionRawToken,
  releaseSlotBookingLock,
  slotCacheKeysAround,
  tryAcquireSlotBookingLock,
} from "@/lib/redis-cache";
import { granularSessionStartsWithinWindow } from "@/lib/booking-slot-catalog";
import { signCatalogAccess } from "@/lib/booking-slot-pick-token";
import { formatBookingWhatsAppDateOnly, formatBookingWhatsAppRange } from "@/lib/booking-whatsapp-format";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { prisma } from "@/lib/prisma";
import { getPublicSiteBaseUrl } from "@/lib/public-site-url";
import { whatsappDigitsFromProfile, zixflowSendTemplate } from "@/lib/zixflow";
import {
  applyZixflowBodyVarOrder,
  ZIXFLOW_DEFAULT_BOOKING_CONFIRMED_BODY_ORDER,
  ZIXFLOW_DEFAULT_TIME_SLOTS_BODY_ORDER,
} from "@/lib/zixflow-template-vars";

const FINALIZE_LOCK_PREFIX = "booking-request-finalize:";

/**
 * Two-step Accept: send `time_slots` + catalog URL before creating the calendar event.
 * If `ZIXFLOW_BOOKING_TIME_SLOTS_TEMPLATE` is set, this is ON unless explicitly disabled
 * (`BOOKING_SLOT_CATALOG_BEFORE_CONFIRM=false` / `0` / `no`) — avoids “template set but flag forgot on Vercel”.
 */
function bookingUsesWhatsAppSlotCatalog(): boolean {
  const tpl = process.env.ZIXFLOW_BOOKING_TIME_SLOTS_TEMPLATE?.trim();
  if (!tpl) return false;
  const flag = process.env.BOOKING_SLOT_CATALOG_BEFORE_CONFIRM?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") return false;
  return true;
}

export type HtmlActionResult = {
  ok: boolean;
  title: string;
  message: string;
  /** Present after successful slot confirmation — JSON APIs can surface Meet + times to the client. */
  meetLink?: string | null;
  confirmedSessionStartISO?: string | null;
  confirmedSessionEndISO?: string | null;
};

function bustBookingCaches(mentorId: string, studentId: string, startAt: Date): void {
  invalidateAfterBooking(studentId, mentorId);
  void delKeys([
    ...slotCacheKeysAround(mentorId, startAt),
    ...mentorMonthAvailabilityKeysAround(mentorId, startAt),
  ]);
}

async function sendConfirmedWhatsapps(opts: {
  studentWa: string | null;
  mentorWa: string | null;
  studentName: string | null;
  mentorName: string | null;
  startISO: string;
  meetLink: string | null;
}): Promise<{ studentNotified: boolean; mentorNotified: boolean }> {
  let studentNotified = false;
  let mentorNotified = false;

  const varsBase: Record<string, string> = {
    studentName: opts.studentName?.trim() || "Student",
    mentorName: opts.mentorName?.trim() || "Mentor",
    startISO: opts.startISO,
    meetLink: opts.meetLink?.trim() || "",
  };

  const confirmedOrder =
    process.env.ZIXFLOW_BOOKING_CONFIRMED_BODY_VARS_ORDER?.trim() || ZIXFLOW_DEFAULT_BOOKING_CONFIRMED_BODY_ORDER;
  const vars = applyZixflowBodyVarOrder(varsBase, confirmedOrder);

  const studentTpl = process.env.ZIXFLOW_BOOKING_CONFIRMED_TEMPLATE?.trim();
  if (opts.studentWa && !studentTpl) {
    console.warn(
      "[booking] Student WhatsApp number is on profile but ZIXFLOW_BOOKING_CONFIRMED_TEMPLATE is not set — no student confirmation message.",
    );
  }
  if (!opts.studentWa && studentTpl) {
    console.warn(
      "[booking] ZIXFLOW_BOOKING_CONFIRMED_TEMPLATE is set but student has no WhatsApp (or phone) digits — student confirmation skipped.",
    );
  }

  if (opts.studentWa && studentTpl) {
    try {
      const r = await zixflowSendTemplate({
        to: opts.studentWa,
        template: studentTpl,
        variables: vars,
      });
      studentNotified = r.ok;
      if (!r.ok) console.error("[booking] Zixflow confirm (student) failed:", r.error);
    } catch (e) {
      console.error("[booking] Zixflow confirm (student) threw:", e);
    }
  }

  const mentorTpl = process.env.ZIXFLOW_BOOKING_CONFIRMED_MENTOR_TEMPLATE?.trim();
  if (opts.mentorWa && !mentorTpl) {
    console.warn(
      "[booking] Mentor WhatsApp number is on profile but ZIXFLOW_BOOKING_CONFIRMED_MENTOR_TEMPLATE is not set — no mentor confirmation message.",
    );
  }
  if (!opts.mentorWa && mentorTpl) {
    console.warn(
      "[booking] ZIXFLOW_BOOKING_CONFIRMED_MENTOR_TEMPLATE is set but mentor has no WhatsApp (or phone) digits — mentor confirmation skipped.",
    );
  }

  if (opts.mentorWa && mentorTpl) {
    try {
      const r = await zixflowSendTemplate({
        to: opts.mentorWa,
        template: mentorTpl,
        variables: vars,
      });
      mentorNotified = r.ok;
      if (!r.ok) console.error("[booking] Zixflow confirm (mentor) failed:", r.error);
    } catch (e) {
      console.error("[booking] Zixflow confirm (mentor) threw:", e);
    }
  }

  return { studentNotified, mentorNotified };
}

/** Idempotent: safe to retry or double-click the WhatsApp link. */
export async function finalizeBookingRequestReject(opts: {
  bookingRequestId: string;
  rawToken?: string;
  /** WhatsApp quick-reply Decline — sender matched mentor profile WhatsApp digits. */
  verifiedMentorId?: string;
}): Promise<HtmlActionResult> {
  const hasToken = Boolean(opts.rawToken?.trim());
  const hasPhoneProof = Boolean(opts.verifiedMentorId?.trim());
  if (hasToken === hasPhoneProof) {
    return {
      ok: false,
      title: "Bad request",
      message: "Missing decline credentials.",
    };
  }

  const hash = opts.rawToken ? sha256Hex(opts.rawToken) : null;

  const existing = await prisma.bookingRequest.findUnique({
    where: { id: opts.bookingRequestId },
    select: {
      status: true,
      studentId: true,
      mentorId: true,
      startAt: true,
      actionTokenHash: true,
    },
  });

  if (!existing) {
    return {
      ok: false,
      title: "Link invalid",
      message: "This confirmation link is invalid or has expired.",
    };
  }

  if (opts.verifiedMentorId) {
    if (existing.mentorId !== opts.verifiedMentorId) {
      return {
        ok: false,
        title: "Forbidden",
        message: "This booking does not belong to your mentor account.",
      };
    }
  } else if (!opts.rawToken || existing.actionTokenHash !== hash) {
    return {
      ok: false,
      title: "Link invalid",
      message: "This confirmation link is invalid or has expired.",
    };
  }

  if (existing.status === "rejected") {
    return {
      ok: true,
      title: "Already declined",
      message: "You already declined this session request. Nothing else is needed.",
    };
  }

  if (existing.status === "accepted") {
    return {
      ok: true,
      title: "Already accepted",
      message: "This session was already accepted — check your calendar or Commonsia dashboard.",
    };
  }

  if (existing.status !== "pending" && existing.status !== "awaiting_slot") {
    return {
      ok: true,
      title: "No longer pending",
      message: "This request is no longer waiting for a response.",
    };
  }

  const lockKey = `${FINALIZE_LOCK_PREFIX}${opts.bookingRequestId}`;
  if (!(await tryAcquireSlotBookingLock(lockKey, 90))) {
    return {
      ok: true,
      title: "Processing",
      message: "Another action is processing this request. Refresh your bookings in a moment.",
    };
  }

  try {
    const full = await prisma.bookingRequest.findFirst({
      where: opts.verifiedMentorId
        ? {
            id: opts.bookingRequestId,
            mentorId: opts.verifiedMentorId,
            status: { in: ["pending", "awaiting_slot"] },
          }
        : {
            id: opts.bookingRequestId,
            status: { in: ["pending", "awaiting_slot"] },
            actionTokenHash: hash!,
          },
      include: {
        student: {
          select: { id: true, email: true, name: true, whatsappUrl: true },
        },
        mentor: {
          select: { id: true, email: true, name: true, whatsappUrl: true },
        },
      },
    });

    if (!full) {
      return {
        ok: true,
        title: "Already handled",
        message: "This request was already updated.",
      };
    }

    const upd = await prisma.bookingRequest.updateMany({
      where: opts.verifiedMentorId
        ? {
            id: full.id,
            mentorId: opts.verifiedMentorId,
            status: { in: ["pending", "awaiting_slot"] },
          }
        : {
            id: full.id,
            status: { in: ["pending", "awaiting_slot"] },
            actionTokenHash: hash!,
          },
      data: { status: "rejected", decidedAt: new Date(), actionRawTokenOpaque: null },
    });

    if (upd.count !== 1) {
      return {
        ok: true,
        title: "Already handled",
        message: "This request was already updated.",
      };
    }

    await forgetBookingActionRawToken(full.id);

    bustBookingCaches(full.mentorId, full.studentId, full.startAt);

    console.info("[booking] BookingRequest rejected:", full.id, "mentor:", full.mentorId, "student:", full.studentId);

    if (full.student.email) {
      await sendBookingRejectedEmail({
        studentEmail: full.student.email,
        studentName: full.student.name,
        mentorName: full.mentor.name,
        start: full.startAt,
        end: full.endAt,
        reason: null,
      });
    }

    return {
      ok: true,
      title: "Declined",
      message:
        "The student has been notified by email (when configured). The time slot is available again for others.",
    };
  } finally {
    releaseSlotBookingLock(lockKey);
  }
}

/** Accept flow: Calendar + Meet → persist BookingRequest + MentoringBooking → emails + WhatsApp. */
export async function finalizeBookingRequestAccept(opts: {
  bookingRequestId: string;
  rawToken?: string;
  /** WhatsApp quick-reply Accept — sender matched mentor profile WhatsApp digits (see Redis raw-token mirror). */
  verifiedMentorId?: string;
}): Promise<HtmlActionResult> {
  const hasToken = Boolean(opts.rawToken?.trim());
  const hasPhoneProof = Boolean(opts.verifiedMentorId?.trim());
  if (hasToken === hasPhoneProof) {
    return {
      ok: false,
      title: "Bad request",
      message: "Missing acceptance credentials.",
    };
  }

  const hash = opts.rawToken ? sha256Hex(opts.rawToken) : null;

  const existing = await prisma.bookingRequest.findUnique({
    where: { id: opts.bookingRequestId },
    select: {
      status: true,
      actionTokenHash: true,
      studentId: true,
      mentorId: true,
      startAt: true,
      endAt: true,
    },
  });

  if (!existing) {
    return {
      ok: false,
      title: "Link invalid",
      message: "This confirmation link is invalid or has expired.",
    };
  }

  if (opts.verifiedMentorId) {
    if (existing.mentorId !== opts.verifiedMentorId) {
      return {
        ok: false,
        title: "Forbidden",
        message: "This booking does not belong to your mentor account.",
      };
    }
  } else if (!opts.rawToken || existing.actionTokenHash !== hash) {
    return {
      ok: false,
      title: "Link invalid",
      message: "This confirmation link is invalid or has expired.",
    };
  }

  if (existing.status === "accepted") {
    return {
      ok: true,
      title: "Already accepted",
      message: "You already accepted this session — check Google Calendar or your Commonsia dashboard for the Meet link.",
    };
  }

  if (existing.status === "rejected") {
    return {
      ok: false,
      title: "Already declined",
      message: "This request was declined earlier; it cannot be accepted anymore.",
    };
  }

  if (existing.status === "awaiting_slot") {
    return {
      ok: true,
      title: "Pick a start time",
      message:
        "You already accepted this request. Open WhatsApp and tap one of the session links from the Commonsia catalog message.",
    };
  }

  if (existing.status !== "pending") {
    return {
      ok: true,
      title: "No longer pending",
      message: "This request is no longer waiting for a response.",
    };
  }

  const finalizeLock = `${FINALIZE_LOCK_PREFIX}${opts.bookingRequestId}`;
  if (!(await tryAcquireSlotBookingLock(finalizeLock, 120))) {
    return {
      ok: true,
      title: "Processing",
      message: "Another tap is finishing this booking. Please wait a few seconds and check Calendar.",
    };
  }

  const mentorSlotLockKey = CacheKeys.bookingSlotLock(existing.mentorId, existing.startAt.toISOString());
  let slotLocked = false;

  try {
    const full = await prisma.bookingRequest.findFirst({
      where: opts.verifiedMentorId
        ? {
            id: opts.bookingRequestId,
            mentorId: opts.verifiedMentorId,
            status: "pending",
          }
        : {
            id: opts.bookingRequestId,
            status: "pending",
            actionTokenHash: hash!,
          },
      include: {
        student: {
          select: { id: true, email: true, name: true, whatsappUrl: true, phone: true },
        },
        mentor: {
          select: {
            id: true,
            email: true,
            name: true,
            whatsappUrl: true,
            phone: true,
            mentorAvailabilityJson: true,
          },
        },
      },
    });

    if (!full) {
      return {
        ok: true,
        title: "Already handled",
        message: "This request was already updated.",
      };
    }

    if (bookingUsesWhatsAppSlotCatalog()) {
      console.info("[booking] Accept → time_slots catalog path", {
        bookingRequestId: full.id,
        template: process.env.ZIXFLOW_BOOKING_TIME_SLOTS_TEMPLATE?.trim() ?? "",
      });
      const sessionDur = mergeAvailabilityForSlot(full.mentor.mentorAvailabilityJson).sessionDurationMinutes;
      const stepRaw = Number(process.env.BOOKING_SLOT_CATALOG_STEP_MINUTES?.trim());
      const slotStepMinutes = Number.isFinite(stepRaw) && stepRaw >= 5 ? stepRaw : 15;
      const slots = granularSessionStartsWithinWindow(full.startAt, full.endAt, sessionDur, slotStepMinutes);
      const baseUrl = getPublicSiteBaseUrl();

      if (slots.length === 0) {
        return {
          ok: false,
          title: "No available starts",
          message:
            "This booking window does not fit the mentor’s session length. Ask the student to choose a wider slot.",
        };
      }

      const rawForSigning =
        opts.rawToken?.trim() ||
        (opts.verifiedMentorId
          ? full.actionRawTokenOpaque?.trim() || (await peekBookingActionRawToken(full.id))
          : "");
      if (!rawForSigning) {
        return {
          ok: false,
          title: "Cannot finish Accept from chat",
          message:
            "No signing token found for this booking (run DB migrations so `actionRawTokenOpaque` exists, set Upstash Redis, or tap the Accept link in the original WhatsApp message instead of quick-reply only).",
        };
      }

      const catalogTok = signCatalogAccess({
        bookingRequestId: full.id,
        rawToken: rawForSigning,
      });
      if (!catalogTok) {
        return {
          ok: false,
          title: "Configuration error",
          message:
            "BOOKING_ACTION_SECRET is not configured correctly — catalog links cannot be generated.",
        };
      }
      const catalogUrl = `${baseUrl}/select-slot?bookingId=${encodeURIComponent(full.id)}&token=${encodeURIComponent(catalogTok)}`;

      const tpl = process.env.ZIXFLOW_BOOKING_TIME_SLOTS_TEMPLATE!.trim();
      let mentorTo = whatsappDigitsFromProfile({
        whatsappUrl: full.mentor.whatsappUrl,
        phone: full.mentor.phone,
      });
      const fb = process.env.ZIXFLOW_FALLBACK_TO_DIGITS?.trim().replace(/\D/g, "") ?? "";
      if (!mentorTo?.trim() && fb) mentorTo = fb;

      if (!mentorTo?.trim()) {
        console.warn("[booking] time_slots skipped: mentor has no WhatsApp digits on profile.", full.id);
        return {
          ok: false,
          title: "WhatsApp required",
          message:
            "Add a WhatsApp number (wa.me link or phone with country code) on your mentor profile so we can send the slot picker. Then tap Accept again.",
        };
      }

      let variables = applyZixflowBodyVarOrder(
        {
          /** Meta {{1}}–{{4}} + catalog button URL when exposed as `body_5` in Zixflow. */
          mentorName: full.mentor.name ?? "Mentor",
          studentName: full.student.name ?? "Student",
          requestedDate: formatBookingWhatsAppDateOnly(full.startAt),
          requestedRange: formatBookingWhatsAppRange(full.startAt, full.endAt),
          catalogUrl,
        },
        process.env.ZIXFLOW_BOOKING_TIME_SLOTS_BODY_VARS_ORDER?.trim() || ZIXFLOW_DEFAULT_TIME_SLOTS_BODY_ORDER,
      );
      const catalogBtnVar = process.env.ZIXFLOW_BOOKING_CATALOG_URL_TEMPLATE_VAR?.trim();
      if (catalogBtnVar) variables = { ...variables, [catalogBtnVar]: catalogUrl };

      let sendResult: { ok: true } | { ok: false; error: string };
      try {
        sendResult = await zixflowSendTemplate({
          to: mentorTo.trim(),
          template: tpl,
          variables,
        });
      } catch (e) {
        console.error("[booking] Zixflow time_slots template threw:", e);
        sendResult = { ok: false, error: (e as Error)?.message || "unknown_error" };
      }

      if (!sendResult.ok) {
        console.error("[booking] Zixflow time_slots FAILED (booking stays pending):", sendResult.error, "bookingRequestId=", full.id);
        return {
          ok: false,
          title: "Could not send slot picker",
          message: `${sendResult.error} — fix Zixflow/template/env on the server, then tap Accept again.`,
        };
      }

      console.info("[booking] Zixflow time_slots accepted for bookingRequestId=", full.id);

      try {
        const u = await prisma.bookingRequest.updateMany({
          where: opts.verifiedMentorId
            ? { id: full.id, mentorId: opts.verifiedMentorId, status: "pending" }
            : { id: full.id, status: "pending", actionTokenHash: hash! },
          data: { status: "awaiting_slot", actionRawTokenOpaque: null },
        });
        if (u.count !== 1) {
          return {
            ok: true,
            title: "Already handled",
            message: "This request was already updated.",
          };
        }
      } catch (e) {
        console.error("[booking] awaiting_slot transition failed after successful Zixflow send:", e, full.id);
        return {
          ok: false,
          title: "Partial success",
          message:
            "The slot message may have been sent, but saving failed. Check WhatsApp or contact support — avoid accepting twice.",
        };
      }

      await forgetBookingActionRawToken(full.id);

      bustBookingCaches(full.mentorId, full.studentId, full.startAt);

      return {
        ok: true,
        title: "Almost done",
        message:
          "Check WhatsApp — open View catalog (or the link in the message) to pick an exact start time and confirm the session.",
      };
    }

    const sessionDurMinCatalogGuard = mergeAvailabilityForSlot(full.mentor.mentorAvailabilityJson).sessionDurationMinutes;
    const windowMin = Math.round((full.endAt.getTime() - full.startAt.getTime()) / 60_000);
    if (windowMin > sessionDurMinCatalogGuard + 1) {
      return {
        ok: false,
        title: "Catalog step required",
        message:
          "This request spans a multi-hour availability window. Enable ZIXFLOW_BOOKING_TIME_SLOTS_TEMPLATE on the server so the mentor can pick an exact start time, then accept again.",
      };
    }

    if (!(await tryAcquireSlotBookingLock(mentorSlotLockKey, 75))) {
      return {
        ok: false,
        title: "Slot busy",
        message:
          "This slot was claimed just now (another booking or duplicate tap). Ask the student to pick another time.",
      };
    }
    slotLocked = true;

    if (!full.student.email?.trim()) {
      return {
        ok: false,
        title: "Student email missing",
        message:
          "Cannot send calendar invites — the student profile has no email. Ask them to add one on Commonsia, then request a new slot.",
      };
    }

    const eventTitle =
      full.title?.trim() ||
      `Commonsia: Session with ${full.mentor.name?.trim() || "mentor"}`;
    const eventDescription =
      full.description?.trim() ||
      [
        "Scheduled via Commonsia (mentor accepted the WhatsApp request).",
        full.mentor.name ? `Mentor: ${full.mentor.name}` : null,
        full.student.name ? `Student: ${full.student.name}` : null,
      ]
        .filter(Boolean)
        .join("\n");

    const { calendarEvent, meetLink, organizer } = await createGoogleMentorSessionEvent({
      student: full.student,
      mentor: full.mentor,
      start: full.startAt,
      end: full.endAt,
      title: eventTitle,
      description: eventDescription,
    });

    const googleEventId = calendarEvent?.id?.trim() ?? null;

    let mentoringBookingId: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        const u = await tx.bookingRequest.updateMany({
          where: opts.verifiedMentorId
            ? { id: full.id, mentorId: opts.verifiedMentorId, status: "pending" }
            : { id: full.id, status: "pending", actionTokenHash: hash! },
          data: {
            status: "accepted",
            decidedAt: new Date(),
            googleEventId,
            googleMeetLink: meetLink,
            actionRawTokenOpaque: null,
          },
        });
        if (u.count !== 1) {
          throw new Error("BOOKING_REQUEST_CONFLICT");
        }

        const mb = await tx.mentoringBooking.create({
          data: {
            studentId: full.studentId,
            mentorId: full.mentorId,
            startAt: full.startAt,
            endAt: full.endAt,
            title: eventTitle,
            googleEventId,
            googleMeetLink: meetLink,
            bookingRequestId: full.id,
          },
          select: { id: true },
        });
        mentoringBookingId = mb.id;
      });
    } catch (e) {
      if (e instanceof Error && e.message === "BOOKING_REQUEST_CONFLICT") {
        return {
          ok: true,
          title: "Already handled",
          message: "This request was accepted by another tap already.",
        };
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return {
          ok: true,
          title: "Already confirmed",
          message: "This session already exists in your bookings.",
        };
      }
      console.error("[booking] accept transaction failed:", e);
      return {
        ok: false,
        title: "Could not save",
        message:
          "Calendar may have been updated but Commonsia could not finish saving. Contact support if this repeats.",
      };
    }

    await forgetBookingActionRawToken(full.id);

    bustBookingCaches(full.mentorId, full.studentId, full.startAt);

    await sendBookingConfirmationEmails({
      studentEmail: full.student.email,
      studentName: full.student.name,
      mentorEmail: full.mentor.email,
      mentorName: full.mentor.name,
      start: full.startAt,
      end: full.endAt,
      meetLink,
      calendarSynced: calendarEvent != null,
    });

    const waResult = await sendConfirmedWhatsapps({
      studentWa: whatsappDigitsFromProfile(full.student),
      mentorWa: whatsappDigitsFromProfile(full.mentor),
      studentName: full.student.name,
      mentorName: full.mentor.name,
      startISO: full.startAt.toISOString(),
      meetLink,
    });

    if (mentoringBookingId) {
      await prisma.mentoringBooking.update({
        where: { id: mentoringBookingId },
        data: {
          ...(waResult.studentNotified ? { whatsappStudentNotifiedAt: new Date() } : {}),
          ...(waResult.mentorNotified ? { whatsappMentorNotifiedAt: new Date() } : {}),
        },
      });
    }

    const organizerHint =
      organizer === "admin"
        ? " Used the Commonsia calendar account."
        : organizer
          ? ""
          : " Calendar invites were not sent automatically — connect Google Calendar or set GOOGLE_ADMIN_REFRESH_TOKEN.";
    return {
      ok: true,
      title: "Accepted",
      message: `Session confirmed.${organizerHint} Meet link (if available): ${meetLink ?? "check your email or Calendar invite."}`,
    };
  } finally {
    releaseSlotBookingLock(finalizeLock);
    if (slotLocked) releaseSlotBookingLock(mentorSlotLockKey);
  }
}

/** Mentor opened a signed slot link after the `time_slots` WhatsApp step (`BOOKING_SLOT_CATALOG_BEFORE_CONFIRM`). */
export async function finalizeBookingRequestSlotPick(opts: {
  bookingRequestId: string;
  rawToken: string;
  slotStartISO: string;
}): Promise<HtmlActionResult> {
  const hash = sha256Hex(opts.rawToken);
  const slotStart = new Date(opts.slotStartISO);
  if (Number.isNaN(slotStart.getTime())) {
    return {
      ok: false,
      title: "Invalid time",
      message: "This confirmation link uses an invalid session start.",
    };
  }

  const existing = await prisma.bookingRequest.findUnique({
    where: { id: opts.bookingRequestId },
    select: {
      status: true,
      actionTokenHash: true,
      studentId: true,
      mentorId: true,
      startAt: true,
      endAt: true,
    },
  });

  if (!existing || existing.actionTokenHash !== hash) {
    return {
      ok: false,
      title: "Link invalid",
      message: "This confirmation link is invalid or has expired.",
    };
  }

  if (existing.status === "accepted") {
    return {
      ok: true,
      title: "Already confirmed",
      message: "This session was already confirmed — check Google Calendar or your Commonsia dashboard.",
    };
  }

  if (existing.status !== "awaiting_slot") {
    return {
      ok: false,
      title: "Cannot confirm",
      message: "This booking is not waiting for a time selection anymore.",
    };
  }

  const finalizeLock = `${FINALIZE_LOCK_PREFIX}${opts.bookingRequestId}`;
  if (!(await tryAcquireSlotBookingLock(finalizeLock, 120))) {
    return {
      ok: true,
      title: "Processing",
      message: "Another tap is finishing this booking. Please wait a few seconds.",
    };
  }

  const mentorSlotLockKey = CacheKeys.bookingSlotLock(existing.mentorId, slotStart.toISOString());
  let slotLocked = false;

  try {
    const full = await prisma.bookingRequest.findFirst({
      where: {
        id: opts.bookingRequestId,
        status: "awaiting_slot",
        actionTokenHash: hash,
      },
      include: {
        student: {
          select: { id: true, email: true, name: true, whatsappUrl: true, phone: true },
        },
        mentor: {
          select: {
            id: true,
            email: true,
            name: true,
            whatsappUrl: true,
            phone: true,
            mentorAvailabilityJson: true,
          },
        },
      },
    });

    if (!full) {
      return {
        ok: true,
        title: "Already handled",
        message: "This request was already updated.",
      };
    }

    const sessionDur = mergeAvailabilityForSlot(full.mentor.mentorAvailabilityJson).sessionDurationMinutes;
    const slotEnd = new Date(slotStart.getTime() + sessionDur * 60_000);

    if (slotStart.getTime() < full.startAt.getTime() || slotEnd.getTime() > full.endAt.getTime()) {
      return {
        ok: false,
        title: "Invalid slot",
        message: "That start time is outside the requested booking window.",
      };
    }

    if (!(await tryAcquireSlotBookingLock(mentorSlotLockKey, 75))) {
      return {
        ok: false,
        title: "Slot busy",
        message:
          "This exact start time was claimed just now. Pick another slot from WhatsApp or ask the student to reschedule.",
      };
    }
    slotLocked = true;

    if (!full.student.email?.trim()) {
      return {
        ok: false,
        title: "Student email missing",
        message:
          "Cannot send calendar invites — the student profile has no email. Ask them to add one on Commonsia.",
      };
    }

    const eventTitle =
      full.title?.trim() ||
      `Commonsia: Session with ${full.mentor.name?.trim() || "mentor"}`;
    const eventDescription =
      full.description?.trim() ||
      [
        "Scheduled via Commonsia (mentor chose exact start from WhatsApp catalog).",
        full.mentor.name ? `Mentor: ${full.mentor.name}` : null,
        full.student.name ? `Student: ${full.student.name}` : null,
      ]
        .filter(Boolean)
        .join("\n");

    const { calendarEvent, meetLink, organizer } = await createGoogleMentorSessionEvent({
      student: full.student,
      mentor: full.mentor,
      start: slotStart,
      end: slotEnd,
      title: eventTitle,
      description: eventDescription,
    });

    const googleEventId = calendarEvent?.id?.trim() ?? null;

    let mentoringBookingId: string | null = null;

    try {
      await prisma.$transaction(async (tx) => {
        const u = await tx.bookingRequest.updateMany({
          where: { id: full.id, status: "awaiting_slot", actionTokenHash: hash },
          data: {
            status: "accepted",
            decidedAt: new Date(),
            startAt: slotStart,
            endAt: slotEnd,
            googleEventId,
            googleMeetLink: meetLink,
          },
        });
        if (u.count !== 1) {
          throw new Error("BOOKING_REQUEST_CONFLICT");
        }

        const mb = await tx.mentoringBooking.create({
          data: {
            studentId: full.studentId,
            mentorId: full.mentorId,
            startAt: slotStart,
            endAt: slotEnd,
            title: eventTitle,
            googleEventId,
            googleMeetLink: meetLink,
            bookingRequestId: full.id,
          },
          select: { id: true },
        });
        mentoringBookingId = mb.id;
      });
    } catch (e) {
      if (e instanceof Error && e.message === "BOOKING_REQUEST_CONFLICT") {
        return {
          ok: true,
          title: "Already handled",
          message: "This request was already confirmed.",
        };
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return {
          ok: true,
          title: "Already confirmed",
          message: "This session already exists in your bookings.",
        };
      }
      console.error("[booking] slot-pick transaction failed:", e);
      return {
        ok: false,
        title: "Could not save",
        message:
          "Calendar may have been updated but Commonsia could not finish saving. Contact support if this repeats.",
      };
    }

    bustBookingCaches(full.mentorId, full.studentId, slotStart);

    await sendBookingConfirmationEmails({
      studentEmail: full.student.email,
      studentName: full.student.name,
      mentorEmail: full.mentor.email,
      mentorName: full.mentor.name,
      start: slotStart,
      end: slotEnd,
      meetLink,
      calendarSynced: calendarEvent != null,
    });

    const waSlot = await sendConfirmedWhatsapps({
      studentWa: whatsappDigitsFromProfile(full.student),
      mentorWa: whatsappDigitsFromProfile(full.mentor),
      studentName: full.student.name,
      mentorName: full.mentor.name,
      startISO: slotStart.toISOString(),
      meetLink,
    });

    if (mentoringBookingId) {
      await prisma.mentoringBooking.update({
        where: { id: mentoringBookingId },
        data: {
          ...(waSlot.studentNotified ? { whatsappStudentNotifiedAt: new Date() } : {}),
          ...(waSlot.mentorNotified ? { whatsappMentorNotifiedAt: new Date() } : {}),
        },
      });
    }

    const organizerHint =
      organizer === "admin"
        ? " Used the Commonsia calendar account."
        : organizer
          ? ""
          : " Calendar invites were not sent automatically — connect Google Calendar or set GOOGLE_ADMIN_REFRESH_TOKEN.";
    return {
      ok: true,
      title: "Confirmed",
      message: `Session confirmed.${organizerHint} Meet link (if available): ${meetLink ?? "check your email or Calendar invite."}`,
      meetLink,
      confirmedSessionStartISO: slotStart.toISOString(),
      confirmedSessionEndISO: slotEnd.toISOString(),
    };
  } finally {
    releaseSlotBookingLock(finalizeLock);
    if (slotLocked) releaseSlotBookingLock(mentorSlotLockKey);
  }
}
