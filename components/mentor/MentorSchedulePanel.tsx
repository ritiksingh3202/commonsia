"use client";

import { useMemo, useState } from "react";

import { scheduleCustomExtraSlotLabels, sortSlotLabels } from "@/lib/mentor-availability-slots";
import {
  type AvailabilityWindowKind,
  type WeekdayKey,
  WEEKDAY_KEYS,
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
    kind: "weekly",
    title: "Recurring weekly",
    description:
      "Repeating weekly hours. You can switch mode or edit times anytime in availability settings.",
  },
  {
    kind: "fifteen_days",
    title: "15 days",
    description:
      "Rolling two-week window: pick days in the next 15 days (biweekly-style). Change later if needed.",
  },
  {
    kind: "monthly",
    title: "In a month",
    description:
      "One calendar month at a time. Update your availability whenever plans change.",
  },
  {
    kind: "custom",
    title: "Custom",
    description:
      "Pick any future dates. Adjust anytime from availability settings.",
  },
];

type MentorSchedulePanelProps = {
  kind: AvailabilityWindowKind;
  onKindChange: (k: AvailabilityWindowKind) => void;
  /** Weekly */
  gridLabels: string[];
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
  onToggleSpecificSlot: (iso: string, label: string) => void;
  onClearCalendarSelection: () => void;
  calendarSelectable: (iso: string) => boolean;
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

function isoFromYmd(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Renders stored labels like `10:00 AM` with clear AM / PM. */
function SlotPillContent({ label }: { label: string }) {
  const m = label.trim().match(/^(\d{1,2}:\d{2})\s+(AM|PM)$/i);
  if (!m) return <span className="tabular-nums">{label}</span>;
  const ap = m[2].toUpperCase();
  return (
    <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
      <span className="tabular-nums tracking-tight">{m[1]}</span>
      <span className="text-[0.65rem] font-semibold uppercase leading-none sm:text-[0.7rem]">
        {ap}
      </span>
    </span>
  );
}

function AddCustomTimeSelect({
  options,
  disabledIds,
  onPick,
}: {
  options: string[];
  disabledIds: Set<string>;
  onPick: (label: string) => void;
}) {
  const [v, setV] = useState("");
  const pickable = options.filter((lab) => !disabledIds.has(lab));
  if (pickable.length === 0) return null;
  return (
    <div className="mt-3">
      <label className="mb-1 block text-[11px] font-medium text-neutral-500">
        Add another time (IST)
      </label>
      <select
        value={v}
        className="w-full max-w-xs rounded-lg border border-neutral-200 bg-white px-2 py-2 text-xs text-neutral-800 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(e) => {
          const label = e.target.value;
          if (label) {
            onPick(label);
            setV("");
          } else {
            setV(label);
          }
        }}
      >
        <option value="">Choose a time…</option>
        {pickable.map((lab) => (
          <option key={lab} value={lab}>
            {lab}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MentorSchedulePanel({
  kind,
  onKindChange,
  gridLabels,
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
  onToggleSpecificSlot,
  onClearCalendarSelection,
  calendarSelectable,
}: MentorSchedulePanelProps) {
  const extraSlotLabels = useMemo(() => scheduleCustomExtraSlotLabels(), []);
  const cells = calendarCells(calendarViewYear, calendarViewMonth);
  const selectedDates = Object.keys(specificDatesSlots).sort();
  const selectedCount = selectedDates.length;

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
              Pick one of the four options below and add at least one time slot (required). You can change
              mode or edit later anytime.
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
                onClick={() => onKindChange(card.kind)}
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

      {kind === "weekly" ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IconClockGlyph className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Select your available time slots
              </h3>
              <p className="text-sm text-neutral-600">
                Times are in IST (India Standard Time), 10:00 AM–8:00 PM by default. Use the menu under a day
                to add other times.
              </p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm">
            <span className="font-medium text-neutral-800">
              {weeklyTotal} time slot{weeklyTotal === 1 ? "" : "s"} selected
              across the week
            </span>
            <button
              type="button"
              onClick={onClearWeekly}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-6">
            {WEEKDAY_KEYS.map((day: WeekdayKey) => {
              const slots = weeklySlots[day] ?? [];
              const n = slots.length;
              return (
                <div key={day} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">
                      {WEEKDAY_LABELS[day]}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {n} slot{n === 1 ? "" : "s"} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-7">
                    {gridLabels.map((lab) => {
                      const on = slots.includes(lab);
                      return (
                        <button
                          key={lab}
                          type="button"
                          onClick={() => onToggleWeeklySlot(day, lab)}
                          className={cx(
                            "min-h-[2.75rem] rounded-lg border px-1 py-1.5 text-center text-[10px] font-medium transition-colors sm:min-h-[3rem] sm:text-xs",
                            on
                              ? "border-primary bg-primary text-white"
                              : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
                          )}
                        >
                          <SlotPillContent label={lab} />
                        </button>
                      );
                    })}
                  </div>
                  <AddCustomTimeSelect
                    options={extraSlotLabels}
                    disabledIds={new Set(slots)}
                    onPick={(lab) => onToggleWeeklySlot(day, lab)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : (
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
                  Choose the dates you&apos;re available.
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
                const iso = isoFromYmd(calendarViewYear, calendarViewMonth, d);
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
                  For each selected date, choose times in IST (default grid 10:00 AM–8:00 PM). Use the menu to
                  add other times.
                </p>
              </div>
            </div>
            {selectedDates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
                Select one or more dates in the calendar above.
              </p>
            ) : (
              <div className="space-y-6">
                {selectedDates.map((iso) => {
                  const slots = sortSlotLabels(specificDatesSlots[iso] ?? []);
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
                          {slots.length} slot{slots.length === 1 ? "" : "s"}{" "}
                          selected
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-7">
                        {gridLabels.map((lab) => {
                          const on = slots.includes(lab);
                          return (
                            <button
                              key={lab}
                              type="button"
                              onClick={() => onToggleSpecificSlot(iso, lab)}
                              className={cx(
                                "min-h-[2.75rem] rounded-lg border px-1 py-1.5 text-center text-[10px] font-medium transition-colors sm:min-h-[3rem] sm:text-xs",
                                on
                                  ? "border-primary bg-primary text-white"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
                              )}
                            >
                              <SlotPillContent label={lab} />
                            </button>
                          );
                        })}
                      </div>
                      <AddCustomTimeSelect
                        options={extraSlotLabels}
                        disabledIds={new Set(slots)}
                        onPick={(lab) => onToggleSpecificSlot(iso, lab)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
