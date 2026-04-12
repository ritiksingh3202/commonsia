import { expandIntervalToSlotLabels } from "@/lib/mentor-availability-slots";

/** Quick ranges for schedule UI (24h time inputs for expansion). */
export const SCHEDULE_TIME_PRESETS = [
  { id: "10-12", label: "10am – 12pm", start: "10:00", end: "12:00" },
  { id: "12-14", label: "12pm – 2pm", start: "12:00", end: "14:00" },
  { id: "14-16", label: "2pm – 4pm", start: "14:00", end: "16:00" },
  { id: "16-18", label: "4pm – 6pm", start: "16:00", end: "18:00" },
  { id: "18-20", label: "6pm – 8pm", start: "18:00", end: "20:00" },
] as const;

export function slotsForPreset(start: string, end: string): string[] {
  return expandIntervalToSlotLabels(start, end);
}
