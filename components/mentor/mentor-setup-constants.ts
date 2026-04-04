/** Areas of expertise — mentor setup step 1 (same family as student interests). */
export const MENTOR_EXPERTISE_OTHER = "Other" as const;

export const MENTOR_EXPERTISE_OPTIONS = [
  "Residential Design",
  "Commercial Architecture",
  "Sustainable Design",
  "Urban Planning",
  "Interior Architecture",
  "Landscape Architecture",
  "Historic Preservation",
  "BIM & Technology",
  "Construction Management",
  MENTOR_EXPERTISE_OTHER,
] as const;

export const MENTOR_YEARS_OPTIONS = [
  "0–2 years",
  "3–5 years",
  "6–10 years",
  "10+ years",
] as const;

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

export type MentorAvailabilityJson = {
  sessionDurationMinutes: 30 | 45 | 60 | 90;
  availabilityType: "weekly" | "specific";
  specificDates: string[];
  /** When availabilityType is "specific", time chips per ISO date (YYYY-MM-DD). */
  specificDateSlots: Record<string, string[]>;
  weeklySlots: Record<WeekdayKey, string[]>;
  maxStudents: number;
  autoAcceptSessionRequests?: boolean;
  bufferBetweenSessions?: string;
  advanceBookingWindow?: string;
};

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
    sessionDurationMinutes: 60,
    availabilityType: "weekly",
    specificDates: [],
    specificDateSlots: {},
    weeklySlots: emptyWeeklySlots(),
    maxStudents: 5,
    autoAcceptSessionRequests: false,
    bufferBetweenSessions: "",
    advanceBookingWindow: "",
  };
}
