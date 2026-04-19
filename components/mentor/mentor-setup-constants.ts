import { ARCHITECTURE_FLAT_INTERESTS } from "@/components/shared/architecture-taxonomy";

/** Re-export for grouped expertise UI. */
export { ARCHITECTURE_INTEREST_GROUPS } from "@/components/shared/architecture-taxonomy";

/** Areas of expertise — same taxonomy as student interests + free-text Other. */
export const MENTOR_EXPERTISE_OTHER = "Other" as const;

export const MENTOR_EXPERTISE_OPTIONS = [
  ...ARCHITECTURE_FLAT_INTERESTS,
  MENTOR_EXPERTISE_OTHER,
] as const;

export const MENTOR_YEARS_OPTIONS = [
  "0–2 years",
  "2–5 years",
  "6–10 years",
  "10+ years",
] as const;

/** Map legacy DB values to current {@link MENTOR_YEARS_OPTIONS} labels. */
export function normalizeMentorYearsBand(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  const legacy: Record<string, string> = {
    "3–5 years": "2–5 years",
    "3-5 years": "2–5 years",
  };
  const mapped = legacy[v] ?? v;
  return (MENTOR_YEARS_OPTIONS as readonly string[]).includes(mapped) ? mapped : "";
}

/** Stored in `mentorMentorshipFocus` as comma-separated titles (order: Academic → Career → Portfolio). */
export const MENTORSHIP_PREFERENCE_OPTIONS = [
  {
    id: "academic_subjects",
    title: "Academic Subjects",
    description:
      "Guide students through studio projects, design concepts, technical subjects, and course-related challenges.",
  },
  {
    id: "career_guidance",
    title: "Career Guidance",
    description:
      "Help students with internships, job search, higher studies abroad, and navigating the architecture industry.",
  },
  {
    id: "portfolio_review",
    title: "Portfolio Review",
    description:
      "Review and give feedback on student academic or professional portfolios, project presentations, and documentation.",
  },
] as const;

export const MENTORSHIP_PREFERENCE_ORDER = MENTORSHIP_PREFERENCE_OPTIONS.map((o) => o.title);

export const MENTOR_SESSION_PREFS = [
  "Weekly session",
  "Bi-weekly",
  "Monthly",
  "Flexible",
] as const;

export const MENTOR_MENTEE_CAPACITY_OPTIONS = [
  "1–2 students",
  "3–5 students",
  "6–10 students",
  "10+ students",
] as const;

export const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthName(m: number): string {
  return MONTH_NAMES[m] ?? "";
}

/** Hourly labels from 6 AM through 9 PM. */
export function buildHourlyTimeSlots(): string[] {
  const out: string[] = [];
  for (let h = 6; h <= 21; h++) {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const hh = String(h12).padStart(2, "0");
    out.push(`${hh}:00 ${ampm}`);
  }
  return out;
}

export const MENTOR_TIME_SLOTS = buildHourlyTimeSlots();

/** 30-minute steps, 6:00 AM – 9:00 PM (matches detailed booking mockups). */
export function buildHalfHourTimeSlots(): string[] {
  const out: string[] = [];
  for (let h = 6; h <= 21; h++) {
    for (const mm of [0, 30] as const) {
      if (h === 21 && mm === 30) break;
      const hour24 = h;
      const minute = mm;
      const ampm = hour24 >= 12 ? "PM" : "AM";
      let hr12 = hour24 % 12;
      if (hr12 === 0) hr12 = 12;
      const hh = String(hr12).padStart(2, "0");
      const mmStr = String(minute).padStart(2, "0");
      out.push(`${hh}:${mmStr} ${ampm}`);
    }
  }
  return out;
}

export const MENTOR_TIME_SLOTS_HALF = buildHalfHourTimeSlots();

export type SessionTemplateRow = {
  id: string;
  name: string;
  durationMinutes: number;
  enabled: boolean;
};

export type BlockedDateEntry = {
  date: string;
  reason?: string;
};

/** Smart Automation: how the mentor thinks about repeating availability (drives Schedule tab). */
export type AvailabilityWindowKind = "weekends" | "fifteen_days" | "monthly" | "custom";

/** Legacy DB value `"weekly"` is treated as {@link AvailabilityWindowKind} weekends. */
export function normalizeAvailabilityWindowKind(raw: string | undefined | null): AvailabilityWindowKind {
  if (raw === "fifteen_days" || raw === "monthly" || raw === "custom" || raw === "weekends") return raw;
  return "weekends";
}

export const AVAILABILITY_WINDOW_OPTIONS: { value: AvailabilityWindowKind; label: string }[] = [
  { value: "weekends", label: "Weekends" },
  { value: "fifteen_days", label: "15 days (bi-weekly)" },
  { value: "monthly", label: "In a month" },
  { value: "custom", label: "Custom" },
];

/** Capacity band (maps to numeric maxStudents when saving). */
export type MenteeCapacityBand = "0-5" | "5-10" | "10+";

export const MENTEE_CAPACITY_BAND_OPTIONS: { value: MenteeCapacityBand; label: string }[] = [
  { value: "0-5", label: "0–5 mentees" },
  { value: "5-10", label: "5–10 mentees" },
  { value: "10+", label: "10+ mentees" },
];

export function menteeBandToMaxStudents(b: MenteeCapacityBand | undefined): number {
  if (b === "0-5") return 5;
  if (b === "10+") return 25;
  return 10;
}

export function maxStudentsToMenteeBand(n: number): MenteeCapacityBand {
  if (n <= 5) return "0-5";
  if (n >= 15) return "10+";
  return "5-10";
}

export type MentorAvailabilityJson = {
  sessionDurationMinutes: 15 | 30 | 45 | 60 | 90;
  availabilityType: "weekly" | "specific";
  specificDates: string[];
  /** When availabilityType is "specific", time chips per ISO date (YYYY-MM-DD). */
  specificDateSlots: Record<string, string[]>;
  weeklySlots: Record<WeekdayKey, string[]>;
  maxStudents: number;
  /** Planning horizon in days (e.g. 15 when window is “15 days”). */
  planningHorizonDays?: number;
  availabilityWindowKind?: AvailabilityWindowKind;
  /** 0=Sun … 6=Sat — recurring weekday for 15-day / monthly patterns. */
  recurringWeekdayJs?: number | null;
  /** Anchor ISO date (YYYY-MM-DD) on that weekday; bi-weekly parity is computed from whole weeks since anchor. */
  biweeklyAnchorIso?: string | null;
  /** Slot labels (IST half-hour starts) applied on each matching pattern day. */
  patternSlotLabels?: string[];
  menteeCapacityBand?: MenteeCapacityBand;
  autoAcceptSessionRequests?: boolean;
  bufferBetweenSessions?: string;
  advanceBookingWindow?: string;
  /** Smart Automation tab */
  smartAutomationEnabled?: boolean;
  maxSessionsPerWeek?: number;
  bufferMinutes?: number;
  /** Session types tab — first enabled row drives `sessionDurationMinutes` on save */
  sessionTemplates?: SessionTemplateRow[];
  /** Weekly mode: do not offer slots on these ISO dates */
  blockedDates?: BlockedDateEntry[];
  /** Weekly mode: extra slot labels (same format as weeklySlots) per ISO date */
  extraAvailabilitySlots?: Record<string, string[]>;
  acceptingNewMentees?: boolean;
};

export function defaultSessionTemplates(): SessionTemplateRow[] {
  return [{ id: "st-default", name: "Session", durationMinutes: 30, enabled: true }];
}

export function emptyWeeklySlots(): Record<WeekdayKey, string[]> {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

export function defaultMentorAvailability(): MentorAvailabilityJson {
  return {
    sessionDurationMinutes: 30,
    availabilityType: "weekly",
    specificDates: [],
    specificDateSlots: {},
    weeklySlots: emptyWeeklySlots(),
    maxStudents: 10,
    planningHorizonDays: 14,
    availabilityWindowKind: "weekends",
    menteeCapacityBand: "5-10",
    autoAcceptSessionRequests: true,
    bufferBetweenSessions: "0",
    advanceBookingWindow: "",
    smartAutomationEnabled: true,
    maxSessionsPerWeek: 2,
    bufferMinutes: 0,
    sessionTemplates: defaultSessionTemplates(),
    blockedDates: [],
    extraAvailabilitySlots: {},
    acceptingNewMentees: true,
  };
}
