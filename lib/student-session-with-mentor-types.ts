export type SessionWithMentorPayload = {
  mentor: { name: string | null; image: string | null };
  student: { name: string | null; image: string | null };
  booking: {
    id: string;
    startAt: string;
    endAt: string;
    googleMeetLink: string | null;
    /** Preformatted range — same on server and client to avoid hydration mismatch. */
    displayRange: string;
  } | null;
};
