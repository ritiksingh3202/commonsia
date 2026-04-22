"use client";

import { useMemo, useState } from "react";

import { monthName } from "@/components/mentor/mentor-setup-constants";

const WEEK_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Sunday = 0 … Saturday = 6 for the first of month */
function startWeekday(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay();
}

function toIso(year: number, monthIndex: number, day: number): string {
  const m = monthIndex + 1;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: monthName(i),
}));

type Props = {
  selected: ReadonlySet<string>;
  onToggleDate: (iso: string) => void;
  /** Remove all selected dates in this calendar month (0–11). */
  onClearDatesInMonth: (year: number, monthIndex: number) => void;
};

/**
 * Month view with **separate Year and Month** dropdowns (per product spec).
 * Click dates to toggle; selected days use primary styling.
 */
export function MentorCalendarPicker({ selected, onToggleDate, onClearDatesInMonth }: Props) {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 9 }, (_, i) => y - 3 + i);
  }, [now]);

  const dim = daysInMonth(year, month);
  const startPad = startWeekday(year, month);
  const cells: (number | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= dim; d++) cells.push(d);

  const countInView = useMemo(() => {
    let n = 0;
    for (const iso of selected) {
      const [yStr, moStr] = iso.split("-");
      const y = Number(yStr);
      const mo = Number(moStr);
      if (y === year && mo - 1 === month) n++;
    }
    return n;
  }, [selected, year, month]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="calendar-year" className="text-[12px] font-medium text-[#6b7280]">
            Year
          </label>
          <select
            id="calendar-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-base text-[#0a0a0a] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-[13px]"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="calendar-month" className="text-[12px] font-medium text-[#6b7280]">
            Month
          </label>
          <select
            id="calendar-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-base text-[#0a0a0a] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-[13px]"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-black/8 bg-white p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#9ca3af] sm:text-[12px]">
          {WEEK_HEADERS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 pt-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} className="aspect-square" />;
            }
            const iso = toIso(year, month, day);
            const isOn = selected.has(iso);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onToggleDate(iso)}
                className={`flex aspect-square items-center justify-center rounded-lg text-[13px] font-medium transition ${
                  isOn
                    ? "bg-primary text-white shadow-sm"
                    : "border border-black/[0.08] bg-white text-[#0a0a0a] hover:border-primary/30"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-primary">
          {countInView} date(s) selected for {monthName(month)} {year}
        </p>
        <button
          type="button"
          onClick={() => onClearDatesInMonth(year, month)}
          className="text-[13px] font-medium text-[#6b7280] underline decoration-black/20 underline-offset-2 hover:text-primary"
        >
          Clear dates this month
        </button>
      </div>
    </div>
  );
}
