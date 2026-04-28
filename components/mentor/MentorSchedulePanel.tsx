"use client";

import { useMemo, useState } from "react";

import {
  WEEKEND_TIME_PRESETS,
  presetIdsFromSlotLabels,
  slotLabelsForPresetRange,
} from "@/lib/mentor-availability-patterns";
import { isoFromCalendarYmd, jsWeekdayFromIsoLocal, sortSlotLabels } from "@/lib/mentor-availability-slots";
import {
  type AvailabilityWindowKind,
  type WeekdayKey,
  WEEKDAY_LABELS,
  monthName,
} from "./mentor-setup-constants";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

function IconCalendarGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7V5m8 2V5m-9 4h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClockGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export const SCHEDULE_KIND_CARDS: {
  kind: AvailabilityWindowKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "weekends",
    title: "Weekends",
    description: "Saturday and/or Sunday only. Tick each day you mentor, then choose two-hour IST ranges.",
  },
  {
    kind: "fifteen_days",
    title: "15 days (bi-weekly)",
    description:
      "Choose one weekday — you appear every other week on that day within a rolling 15-day window.",
  },
  {
    kind: "monthly",
    title: "In a month",
    description:
      "One weekday per calendar month. After a session on that weekday, the next opening is the same weekday next month.",
  },
  {
    kind: "custom",
    title: "Custom",
    description:
      "Tap exact calendar dates and time ranges. The same day-of-month repeats every month forward for booking.",
  },
];

type MentorSchedulePanelProps = {
  kind: AvailabilityWindowKind;
  onKindChange: (k: AvailabilityWindowKind) => void;
  weeklySlots: Record<WeekdayKey, string[]>;
  onToggleWeeklySlot: (day: WeekdayKey, label: string) => void;
  onClearWeekly: () => void;
  weeklyTotal: number;
  /** Calendar + specific dates */
  calendarViewYear: number;
  calendarViewMonth: number;
  onCalendarPrev: () => void;
  onCalendarNext: () => void;
  specificDatesSlots: Record<string, string[]>;
  onToggleCalendarDate: (iso: string) => void;
  onToggleCustomDatePreset?: (iso: string, presetId: string) => void;
  onToggleSharedCustomDatePreset?: (presetId: string) => void;
  onClearCalendarSelection: () => void;
  calendarSelectable: (iso: string) => boolean;
  /** 15-day / monthly rhythm */
  recurringWeekdayJs?: number;
  onRecurringWeekdayJs?: (js: number) => void;
  patternSlotLabels?: string[];
  onTogglePatternPreset?: (presetId: string) => void;
  onClearPatternSlots?: () => void;
  onClearWeeklyDay?: (day: WeekdayKey) => void;
};

const CAL_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function calendarCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function MentorSchedulePanel({
  kind,
  onKindChange,
  weeklySlots,
  onToggleWeeklySlot,
  onClearWeekly,
  weeklyTotal,
  calendarViewYear,
  calendarViewMonth,
  onCalendarPrev,
  onCalendarNext,
  specificDatesSlots,
  onToggleCalendarDate,
  onToggleCustomDatePreset,
  onToggleSharedCustomDatePreset,
  onClearCalendarSelection,
  calendarSelectable,
  recurringWeekdayJs = 5,
  onRecurringWeekdayJs,
  patternSlotLabels = [],
  onTogglePatternPreset,
  onClearPatternSlots,
  onClearWeeklyDay,
}: MentorSchedulePanelProps) {
  const patternPresetIds = useMemo(() => presetIdsFromSlotLabels(patternSlotLabels), [patternSlotLabels]);
  const [weekendArmed, setWeekendArmed] = useState<Record<"sat" | "sun", boolean>>(() => ({
    sat: (weeklySlots.sat?.length ?? 0) > 0,
    sun: (weeklySlots.sun?.length ?? 0) > 0,
  }));
  const cells = calendarCells(calendarViewYear, calendarViewMonth);
  const selectedDates = Object.keys(specificDatesSlots).sort();
  const selectedCount = selectedDates.length;

  const sameWeekdayMulti =
    selectedDates.length >= 2 &&
    selectedDates.every((iso) => jsWeekdayFromIsoLocal(iso) === jsWeekdayFromIsoLocal(selectedDates[0]!));

  const presetFullySelectedForIso = (iso: string, presetId: string) => {
    const p = WEEKEND_TIME_PRESETS.find((x) => x.id === presetId);
    if (!p) return false;
    const labs = slotLabelsForPresetRange(p.range[0], p.range[1]);
    const s = specificDatesSlots[iso] ?? [];
    return labs.length > 0 && labs.every((lab) => s.includes(lab));
  };

  const sharedCustomPresetOn = (presetId: string) => {
    if (selectedDates.length === 0) return false;
    return selectedDates.every((iso) => presetFullySelectedForIso(iso, presetId));
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconCalendarGlyph className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Availability type
            </h3>
            <p className="text-sm text-neutral-600">
              Pick one of the four options below and add at least one two-hour range (required). You can change mode or
              edit later anytime.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SCHEDULE_KIND_CARDS.map((card) => {
            const sel = kind === card.kind;
            return (
              <button
                key={card.kind}
                type="button"
                onClick={() => {
                  if (card.kind === "weekends" && kind !== "weekends") {
                    setWeekendArmed({
                      sat: (weeklySlots.sat?.length ?? 0) > 0,
                      sun: (weeklySlots.sun?.length ?? 0) > 0,
                    });
                  }
                  onKindChange(card.kind);
                }}
                className={cx(
                  "flex flex-col rounded-xl border-2 p-4 text-left transition-colors",
                  sel
                    ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30"
                    : "border-neutral-200 bg-white hover:border-neutral-300",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cx(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      sel
                        ? "border-primary bg-primary"
                        : "border-neutral-300 bg-white",
                    )}
                    aria-hidden
                  >
                    {sel ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {card.title}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-snug text-neutral-600 sm:text-sm">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {kind === "custom" ? (
        <>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <IconCalendarGlyph className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Select specific dates
                </h3>
                <p className="text-sm text-neutral-600">
                  Choose the dates you&apos;re available. One tap sets that calendar day each month forward (same time
                  ranges) for students to book.
                </p>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onCalendarPrev}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
              >
                ←
              </button>
              <span className="text-sm font-semibold text-neutral-900">
                {monthName(calendarViewMonth)} {calendarViewYear}
              </span>
              <button
                type="button"
                onClick={onCalendarNext}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-neutral-500 sm:text-xs">
              {CAL_WEEK.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                if (d === null) {
                  return (
                    <div
                      key={`e-${i}`}
                      className="aspect-square rounded-lg border border-transparent"
                    />
                  );
                }
                const iso = isoFromCalendarYmd(calendarViewYear, calendarViewMonth, d);
                const selectable = calendarSelectable(iso);
                const selected = iso in specificDatesSlots;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!selectable}
                    onClick={() => selectable && onToggleCalendarDate(iso)}
                    className={cx(
                      "aspect-square rounded-lg border text-sm font-medium transition-colors",
                      !selectable && "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300",
                      selectable &&
                        !selected &&
                        "border-neutral-200 bg-white text-neutral-800 hover:border-primary/50",
                      selectable &&
                        selected &&
                        "border-primary bg-primary text-white",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-neutral-800">
                  {selectedCount} date{selectedCount === 1 ? "" : "s"} selected
                  for {monthName(calendarViewMonth)} {calendarViewYear}
                </span>
                <button
                  type="button"
                  onClick={onClearCalendarSelection}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Clear selected dates
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <IconClockGlyph className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Time slots per date
                </h3>
                <p className="text-sm text-neutral-600">
                  For each selected date, choose one or more two-hour time ranges (IST).
                </p>
              </div>
            </div>
            {selectedDates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
                Select one or more dates in the calendar above.
              </p>
            ) : sameWeekdayMulti && onToggleSharedCustomDatePreset ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">
                      All {CAL_WEEK[jsWeekdayFromIsoLocal(selectedDates[0]!)]}s selected ({selectedDates.length}{" "}
                      days)
                    </span>
                    <span className="text-xs text-neutral-600">One set of ranges applies to every selected day.</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {WEEKEND_TIME_PRESETS.map((p) => {
                      const on = sharedCustomPresetOn(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onToggleSharedCustomDatePreset(p.id)}
                          className={cx(
                            "rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors sm:text-xs",
                            on
                              ? "border-primary bg-primary text-white"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40",
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedDates.map((iso) => {
                  const slots = sortSlotLabels(specificDatesSlots[iso] ?? []);
                  const rangeCount = presetIdsFromSlotLabels(slots).size;
                  return (
                    <div
                      key={iso}
                      className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 sm:p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-neutral-900">
                          {iso}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {rangeCount} range{rangeCount === 1 ? "" : "s"} selected
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {WEEKEND_TIME_PRESETS.map((p) => {
                          const on = presetFullySelectedForIso(iso, p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => onToggleCustomDatePreset?.(iso, p.id)}
                              className={cx(
                                "rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors sm:text-xs",
                                on
                                  ? "border-primary bg-primary text-white"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40",
                              )}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : kind === "fifteen_days" || kind === "monthly" ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconClockGlyph className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Rhythm &amp; time slots</h3>
              <p className="text-sm text-neutral-600">
                {kind === "fifteen_days"
                  ? "Pick one weekday — bookings open on every other occurrence within about 15 days."
                  : "Pick one weekday per month. After you complete a session on that weekday in a month, students see the next opening in the following month."}
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm">
            <span className="font-medium text-neutral-800">
              {presetIdsFromSlotLabels(patternSlotLabels).size} time range
              {presetIdsFromSlotLabels(patternSlotLabels).size === 1 ? "" : "s"} on your rhythm day
            </span>
            <button
              type="button"
              onClick={() => onClearPatternSlots?.()}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Clear times
            </button>
          </div>
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Weekday</p>
            <div className="flex flex-wrap gap-1.5">
              {CAL_WEEK.map((label, js) => {
                const sel = recurringWeekdayJs === js;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onRecurringWeekdayJs?.(js)}
                    className={cx(
                      "min-w-[2.75rem] rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold transition-colors",
                      sel
                        ? "border-primary bg-primary text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Preset two-hour bands
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKEND_TIME_PRESETS.map((p) => {
                const on = patternPresetIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onTogglePatternPreset?.(p.id)}
                    className={cx(
                      "rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors sm:text-xs",
                      on
                        ? "border-primary bg-primary text-white"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconClockGlyph className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Weekend time slots</h3>
              <p className="text-sm text-neutral-600">
                Tick the days you mentor on, then choose two-hour time ranges for each day (IST).
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm">
            <span className="font-medium text-neutral-800">
              {(weeklySlots.sat?.length ?? 0) + (weeklySlots.sun?.length ?? 0) > 0
                ? `${presetIdsFromSlotLabels([...(weeklySlots.sat ?? []), ...(weeklySlots.sun ?? [])]).size} range(s) across Sat–Sun`
                : "Pick at least one day and time range"}
            </span>
            <button
              type="button"
              onClick={() => {
                onClearWeekly();
                setWeekendArmed({ sat: false, sun: false });
              }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-4">
            {(["sat", "sun"] as const).map((day) => {
              const slots = weeklySlots[day] ?? [];
              const armed = weekendArmed[day];
              return (
                <div key={day} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={armed}
                      onClick={() => {
                        if (armed) {
                          onClearWeeklyDay?.(day);
                          setWeekendArmed((p) => ({ ...p, [day]: false }));
                        } else {
                          setWeekendArmed((p) => ({ ...p, [day]: true }));
                        }
                      }}
                      className="flex shrink-0 items-center gap-2 rounded-lg text-left"
                    >
                      <span
                        className={cx(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition",
                          armed
                            ? "border-primary bg-primary text-white"
                            : "border-neutral-300 bg-white text-transparent",
                        )}
                      >
                        ✓
                      </span>
                      <span className="text-sm font-semibold text-neutral-900">{WEEKDAY_LABELS[day]}</span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="mb-2 text-[11px] text-neutral-500">
                        {armed
                          ? "Time ranges (tap to toggle)"
                          : "Tick this day first, then choose one or more ranges."}
                      </p>
                      <div
                        className={cx(
                          "flex flex-wrap gap-2 transition",
                          !armed && "pointer-events-none opacity-40",
                        )}
                      >
                        {WEEKEND_TIME_PRESETS.map((p) => {
                          const labs = slotLabelsForPresetRange(p.range[0], p.range[1]);
                          const on = labs.length > 0 && labs.every((lab) => slots.includes(lab));
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={!armed}
                              onClick={() => {
                                if (on) {
                                  for (const lab of labs) {
                                    if (slots.includes(lab)) onToggleWeeklySlot(day, lab);
                                  }
                                } else {
                                  for (const lab of labs) {
                                    if (!slots.includes(lab)) onToggleWeeklySlot(day, lab);
                                  }
                                }
                              }}
                              className={cx(
                                "rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors sm:text-xs",
                                on
                                  ? "border-primary bg-primary text-white"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40",
                              )}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
