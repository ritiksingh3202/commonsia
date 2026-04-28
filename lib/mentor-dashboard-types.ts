export type MentorBookingStats = {
  /** All completed sessions (ended in the past). */
  completedSessionCount: number;
  /** Sum of session lengths in minutes (completed only). */
  totalMentoringMinutes: number;
  /** Completed sessions whose end falls in the current calendar month. */
  sessionsThisMonth: number;
  /** Minutes from sessions ending this calendar month. */
  minutesThisMonth: number;
};

export type MentorUpcomingSession = {
  id: string;
  startAt: Date;
  endAt: Date;
  title: string | null;
  googleMeetLink: string | null;
  googleEventId: string | null;
  student: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export type MentorMenteeRow = {
  threadId: string;
  studentId: string;
  name: string;
  image: string | null;
  subtitle: string;
  focus: string;
  lastSessionLabel: string;
  progressPct: number;
};

export type MentorActivityRow = {
  id: string;
  at: Date;
  title: string;
  /** tailwind tone for icon wrapper */
  tone: string;
  icon: "calendar" | "chat" | "star";
};

export type MentorDashboardLiveData = MentorBookingStats & {
  activeMenteeCount: number;
  menteesJoinedThisMonth: number;
  upcomingSessionCount: number;
  upcomingSessions: MentorUpcomingSession[];
  averageRating: number | null;
  reviewCount: number;
  /** 0–100 composite from ratings, sessions, and reviews. */
  impactScore: number;
  mentees: MentorMenteeRow[];
  activities: MentorActivityRow[];
};

