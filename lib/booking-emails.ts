/**
 * Optional transactional emails when a session is booked.
 * Google Calendar already emails **guests** on the event; the organizer usually does not get a separate invite.
 * Set RESEND_API_KEY (+ RESEND_FROM_EMAIL) to also email both parties from Commonsia.
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
  if (!apiKey) return;

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
