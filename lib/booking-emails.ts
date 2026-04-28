/**
 * Optional transactional emails when a session is booked.
 *
 * **How it works:** When `RESEND_API_KEY` is set (and `RESEND_FROM_EMAIL` uses a
 * [verified domain sender](https://resend.com/docs/dashboard/domains/introduction)), Commonsia
 * sends one HTML message **per recipient** (student + mentor when emails differ) via
 * [Resend’s API](https://resend.com/docs/api-reference/emails/send-email). That is independent
 * of Google Calendar: Calendar may still send its own invites when the event is created on a
 * connected account. Without `RESEND_API_KEY`, this function returns immediately and only
 * Calendar notifications apply (if any).
 */
export async function sendBookingConfirmationEmails(opts: {
  studentEmail: string;
  studentName: string | null;
  mentorEmail: string | null;
  mentorName: string | null;
  start: Date;
  end: Date;
  meetLink: string | null;
  calendarSynced: boolean;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(
      "[booking] RESEND_API_KEY not set — skipping Commonsia confirmation emails to student and mentor. Set RESEND_API_KEY and RESEND_FROM_EMAIL (verified domain) to enable.",
    );
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Commonsia Bookings <onboarding@resend.dev>";

  const when = opts.start.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const durationMin = Math.max(1, Math.round((opts.end.getTime() - opts.start.getTime()) / 60_000));
  const studentN = opts.studentName?.trim() || "Student";
  const mentorN = opts.mentorName?.trim() || "Mentor";
  const meetBlock = opts.meetLink?.trim()
    ? `<p><a href="${opts.meetLink.trim()}">Join Google Meet</a></p>`
    : "<p>Google Meet link: <em>not available yet—check back after calendar sync or your calendar invite.</em></p>";
  const calNote = opts.calendarSynced
    ? "<p>This session was added to Google Calendar. You may also receive a calendar invite from Google.</p>"
    : "<p><strong>Note:</strong> Google Calendar was not connected when this was saved, so calendar invites may not have been sent. Connect Calendar and re-book if needed.</p>";

  const html = (greeting: string, extra: string) => `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${greeting}</p>
<p><strong>${studentN}</strong> and <strong>${mentorN}</strong> have a Commonsia mentoring session scheduled.</p>
<p><strong>When:</strong> ${when} (${durationMin} min)</p>
${meetBlock}
${calNote}
<p style="font-size:13px;color:#666">— Commonsia</p>
${extra}
</body></html>`;

  const recipients: { email: string; greeting: string; extra: string }[] = [];
  const se = opts.studentEmail.trim().toLowerCase();
  if (se) {
    recipients.push({
      email: opts.studentEmail.trim(),
      greeting: `Hi ${studentN},`,
      extra: "",
    });
  }
  const me = opts.mentorEmail?.trim().toLowerCase();
  if (me && me !== se) {
    recipients.push({
      email: opts.mentorEmail!.trim(),
      greeting: `Hi ${mentorN},`,
      extra: "",
    });
  }

  const subject = `Session booked: ${studentN} & ${mentorN}`;

  for (const r of recipients) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [r.email],
          subject,
          html: html(r.greeting, r.extra),
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Resend booking email failed:", res.status, t);
      }
    } catch (e) {
      console.error("Resend booking email error:", e);
    }
  }
}

export async function sendBookingRejectedEmail(opts: {
  studentEmail: string;
  studentName: string | null;
  mentorName: string | null;
  start: Date;
  end: Date;
  reason?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(
      "[booking] RESEND_API_KEY not set — skipping Commonsia rejection email. Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable.",
    );
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Commonsia Bookings <onboarding@resend.dev>";

  const when = opts.start.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const durationMin = Math.max(1, Math.round((opts.end.getTime() - opts.start.getTime()) / 60_000));
  const studentN = opts.studentName?.trim() || "Student";
  const mentorN = opts.mentorName?.trim() || "Mentor";
  const reason = opts.reason?.trim();

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>Hi ${studentN},</p>
<p>Your session request with <strong>${mentorN}</strong> was not accepted.</p>
<p><strong>When:</strong> ${when} (${durationMin} min)</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
<p>You can request another time slot from the mentor’s profile.</p>
<p style="font-size:13px;color:#666">— Commonsia</p>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.studentEmail.trim()],
        subject: `Session request not accepted: ${mentorN}`,
        html,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("Resend booking rejection email failed:", res.status, t);
    }
  } catch (e) {
    console.error("Resend booking rejection email error:", e);
  }
}
