import { sha256Hex } from "@/lib/booking-action-token";
import { granularSessionStartsWithinWindow } from "@/lib/booking-slot-catalog";
import { verifyCatalogAccessSignedToken } from "@/lib/booking-slot-pick-token";
import {
  formatBookingWhatsAppDateOnly,
  formatBookingWhatsAppRange,
  formatBookingWhatsAppTimeShort,
} from "@/lib/booking-whatsapp-format";
import { loadMentorHeldSessionIntervals, sessionIntervalOverlapsHeld } from "@/lib/mentor-held-booking-slots";
import { hasMentorProfilePhotoForBookingUi, mentorAvatarSrcForBookingUi } from "@/lib/mentor-directory";
import { mergeAvailabilityForSlot } from "@/lib/mentor-availability-merge";
import { prisma } from "@/lib/prisma";
import { expertiseToStringList } from "@/lib/setup-load-user";

export type SelectSlotPickerPayload = {
  bookingRequestId: string;
  catalogToken: string;
  mentor: {
    id: string;
    name: string;
    imageUrl: string;
    hasProfilePhoto: boolean;
    expertiseLine: string;
  };
  student: {
    id: string;
    name: string;
    imageUrl: string;
    hasProfilePhoto: boolean;
    university: string | null;
    yearOfStudy: string | null;
  };
  requestedDateLabel: string;
  requestedRangeLabel: string;
  slots: { startISO: string; labelShort: string; disabled: boolean }[];
};

export type SelectSlotLoadResult =
  | { kind: "ready"; payload: SelectSlotPickerPayload }
  | { kind: "notice"; title: string; message: string };

function expertiseLineFromJson(raw: unknown): string {
  const tags = expertiseToStringList(raw).map((s) => s.trim()).filter(Boolean);
  const line = tags.join(", ");
  if (line.length <= 140) return line;
  return `${line.slice(0, 137)}…`;
}

/**
 * Loads booking + granular slots for `/select-slot` after verifying the signed catalog token matches `bookingRequestId`.
 */
export async function loadSelectSlotPickerState(
  bookingRequestIdRaw: string,
  catalogTokenRaw: string,
): Promise<SelectSlotLoadResult> {
  const bookingRequestId = bookingRequestIdRaw.trim();
  const catalogToken = catalogTokenRaw.trim();
  if (!bookingRequestId || !catalogToken) {
    return {
      kind: "notice",
      title: "Missing link",
      message: "Open the View catalog link from your WhatsApp message.",
    };
  }

  const verified = verifyCatalogAccessSignedToken(catalogToken);
  if (!verified.ok || verified.bookingRequestId !== bookingRequestId) {
    return {
      kind: "notice",
      title: "Link invalid",
      message: "This link is invalid or has expired. Ask the student to send a new booking request.",
    };
  }

  const hash = sha256Hex(verified.rawToken);

  const booking = await prisma.bookingRequest.findFirst({
    where: {
      id: bookingRequestId,
      actionTokenHash: hash,
    },
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          mentorExpertise: true,
          mentorAvailabilityJson: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          university: true,
          yearOfStudy: true,
        },
      },
    },
  });

  if (!booking) {
    return {
      kind: "notice",
      title: "Nothing to choose",
      message: "This booking is no longer available or the link does not match.",
    };
  }

  if (booking.status === "accepted") {
    return {
      kind: "notice",
      title: "Already confirmed",
      message: "This session was already confirmed — check Google Calendar or your Commonsia dashboard.",
    };
  }

  if (booking.status !== "awaiting_slot") {
    return {
      kind: "notice",
      title: "Nothing to choose",
      message: "This booking is no longer waiting for a time selection. Check WhatsApp or your Commonsia dashboard.",
    };
  }

  const sessionDur = mergeAvailabilityForSlot(booking.mentor.mentorAvailabilityJson).sessionDurationMinutes;
  const stepRaw = Number(process.env.BOOKING_SLOT_CATALOG_STEP_MINUTES?.trim());
  const slotStepMinutes = Number.isFinite(stepRaw) && stepRaw >= 5 ? stepRaw : 15;

  const starts = granularSessionStartsWithinWindow(booking.startAt, booking.endAt, sessionDur, slotStepMinutes);

  const held = await loadMentorHeldSessionIntervals(prisma, booking.mentorId, booking.startAt, {
    excludeBookingRequestId: booking.id,
  });

  const durMs = Math.max(5, sessionDur) * 60_000;

  const mentorName = booking.mentor.name?.trim() || booking.mentor.email?.split("@")[0]?.trim() || "Mentor";
  const studentName = booking.student.name?.trim() || booking.student.email?.split("@")[0]?.trim() || "Student";

  const mentorImg = mentorAvatarSrcForBookingUi(booking.mentor.id, booking.mentor.image);
  const slots = starts.map((s) => {
    const sm = s.getTime();
    const em = sm + durMs;
    const disabled = sessionIntervalOverlapsHeld(sm, em, held);
    return {
      startISO: s.toISOString(),
      labelShort: formatBookingWhatsAppTimeShort(s),
      disabled,
    };
  });

  if (slots.length === 0) {
    return {
      kind: "notice",
      title: "No slots",
      message:
        "There are no valid start times in this window for your session length. Ask the student to pick another slot.",
    };
  }

  if (slots.every((x) => x.disabled)) {
    return {
      kind: "notice",
      title: "No open times",
      message:
        "Every start time in this window overlaps another booking. Ask the student to choose a different window.",
    };
  }

  const payload: SelectSlotPickerPayload = {
    bookingRequestId: booking.id,
    catalogToken,
    mentor: {
      id: booking.mentor.id,
      name: mentorName,
      imageUrl: mentorImg ?? "",
      hasProfilePhoto: hasMentorProfilePhotoForBookingUi(booking.mentor.image),
      expertiseLine: expertiseLineFromJson(booking.mentor.mentorExpertise),
    },
    student: {
      id: booking.student.id,
      name: studentName,
      imageUrl: booking.student.image?.trim() ?? "",
      hasProfilePhoto: Boolean(booking.student.image?.trim()),
      university: booking.student.university?.trim() || null,
      yearOfStudy: booking.student.yearOfStudy?.trim() || null,
    },
    requestedDateLabel: formatBookingWhatsAppDateOnly(booking.startAt),
    requestedRangeLabel: formatBookingWhatsAppRange(booking.startAt, booking.endAt),
    slots,
  };

  return { kind: "ready", payload };
}
