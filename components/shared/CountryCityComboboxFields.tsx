"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { COUNTRY_OPTIONS, citiesForCountry } from "@/lib/country-city-options";
import { setupField, setupLabel } from "@/components/student/student-ui";

export type CountryCityComboboxFieldsProps = {
  countryInputId: string;
  cityInputId: string;
  country: string;
  city: string;
  setCountry: (v: string) => void;
  setCity: (v: string) => void;
  /** Merged into `/api/profile` PATCH (include `role` from caller when scheduling). */
  scheduleProfilePatch: (patch: Record<string, unknown>) => void;
};

const OTHER_LABEL = "Other (not in list)";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Generic searchable dropdown: button that reveals a panel **below** itself with a
 * filter input + scrollable options + trailing "Other (not in list)" that flips the
 * field into free-text mode. Browser autofill is disabled so native country/city
 * pickers never float in from the side.
 */
function SearchableDropdownField({
  label,
  required,
  helper,
  inputId,
  value,
  onChange,
  onPickOther,
  options,
  placeholder,
  disabled = false,
  emptyLabel,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  inputId: string;
  value: string;
  onChange: (v: string) => void;
  /** Called after user picks "Other..." — parent may want to flip into custom mode. */
  onPickOther?: () => void;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const normalizedOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  const openPanel = () => {
    if (disabled) return;
    setOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label htmlFor={inputId} className={setupLabel}>
        {label} {required ? <span className="text-primary">*</span> : null}
      </label>
      {helper ? (
        <p className="mt-1 text-[11px] leading-snug text-[#6b7280]">{helper}</p>
      ) : null}
      <button
        id={inputId}
        type="button"
        onClick={openPanel}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`${setupField} mt-1.5 flex items-center justify-between gap-2 pr-9 text-left ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-[#717182]"}`}>
          {value || placeholder}
        </span>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717182]">
          <ChevronIcon open={open} />
        </span>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[min(60vh,320px)] overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg ring-1 ring-black/5"
        >
          <div className="border-b border-black/[0.06] bg-neutral-50/60 p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-base text-[#0a0a0a] outline-none placeholder:text-[#9ca3af] focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-[13px]"
            />
          </div>
          <div className="max-h-[min(52vh,260px)] overflow-y-auto overscroll-contain py-1">
            {normalizedOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-[13px] text-[#6b7280]">
                {emptyLabel ?? "No matches. Try different keywords or pick Other."}
              </p>
            ) : (
              normalizedOptions.map((opt) => {
                const selected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-[14px] transition hover:bg-neutral-50 sm:py-2 sm:text-[13px] ${
                      selected ? "bg-primary/5 font-medium text-primary" : "text-[#0a0a0a]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt}</span>
                    {selected ? (
                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPickOther?.();
            }}
            className="flex w-full items-center gap-2 border-t border-black/[0.08] bg-neutral-50/80 px-3 py-3 text-left text-[14px] font-medium text-primary transition hover:bg-primary/5 sm:py-2.5 sm:text-[13px]"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            {OTHER_LABEL}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Country + city as searchable dropdowns with a trailing "Other" escape hatch that
 * flips either field into free-text entry. Browser autofill is disabled so neither
 * field opens a native list off to the right of the page.
 */
export function CountryCityComboboxFields({
  countryInputId,
  cityInputId,
  country,
  city,
  setCountry,
  setCity,
  scheduleProfilePatch,
}: CountryCityComboboxFieldsProps) {
  const countryInList = useMemo(
    () => COUNTRY_OPTIONS.some((c) => c.toLowerCase() === country.trim().toLowerCase()),
    [country],
  );
  const citySuggestions = useMemo(() => citiesForCountry(country), [country]);
  const cityInList = useMemo(
    () => citySuggestions.some((c) => c.toLowerCase() === city.trim().toLowerCase()),
    [city, citySuggestions],
  );

  /** Custom-entry mode for either field. Persists across renders via local state. */
  const [countryCustom, setCountryCustom] = useState<boolean>(
    () => Boolean(country.trim()) && !countryInList,
  );
  const [cityCustom, setCityCustom] = useState<boolean>(
    () => Boolean(city.trim()) && !cityInList,
  );

  /**
   * Keep custom-mode in sync when the profile arrives asynchronously (autosave rehydrate).
   * If a new value pops in that's already listed, drop out of custom mode automatically.
   */
  useEffect(() => {
    if (!country.trim()) return;
    if (countryInList && countryCustom) setCountryCustom(false);
  }, [country, countryInList, countryCustom]);

  useEffect(() => {
    if (!city.trim()) return;
    if (cityInList && cityCustom) setCityCustom(false);
  }, [city, cityInList, cityCustom]);

  const updateCountry = useCallback(
    (v: string, opts?: { resetCity?: boolean }) => {
      const trimmed = v.trim();
      setCountry(v);
      const patch: Record<string, unknown> = { country: trimmed || null };
      if (opts?.resetCity) {
        setCity("");
        setCityCustom(false);
        patch.city = null;
      }
      scheduleProfilePatch(patch);
    },
    [setCountry, setCity, scheduleProfilePatch],
  );

  const updateCity = useCallback(
    (v: string) => {
      setCity(v);
      scheduleProfilePatch({ city: v.trim() || null });
    },
    [setCity, scheduleProfilePatch],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        {countryCustom ? (
          <div>
            <label htmlFor={countryInputId} className={setupLabel}>
              Country <span className="text-primary">*</span>
            </label>
            <p className="mt-1 text-[11px] leading-snug text-[#6b7280]">
              Type your country name.
            </p>
            <input
              id={countryInputId}
              name="country"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={country}
              onChange={(e) => updateCountry(e.target.value, { resetCity: true })}
              placeholder="Type your country"
              className={`${setupField} mt-1.5`}
              required
            />
            <button
              type="button"
              onClick={() => {
                setCountryCustom(false);
                updateCountry("", { resetCity: true });
              }}
              className="mt-1.5 text-[12px] font-medium text-primary underline-offset-2 hover:underline"
            >
              ← Choose from list
            </button>
          </div>
        ) : (
          <SearchableDropdownField
            label="Country"
            required
            inputId={countryInputId}
            value={country}
            onChange={(v) => updateCountry(v, { resetCity: true })}
            onPickOther={() => {
              setCountryCustom(true);
              updateCountry("", { resetCity: true });
            }}
            options={COUNTRY_OPTIONS}
            placeholder="Select your country"
          />
        )}
      </div>

      <div className="space-y-1.5">
        {cityCustom ? (
          <div>
            <label htmlFor={cityInputId} className={setupLabel}>
              City <span className="text-primary">*</span>
            </label>
            <p className="mt-1 text-[11px] leading-snug text-[#6b7280]">
              Type your city or town.
            </p>
            <input
              id={cityInputId}
              name="city"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={city}
              onChange={(e) => updateCity(e.target.value)}
              placeholder="Type your city"
              className={`${setupField} mt-1.5`}
              required
            />
            <button
              type="button"
              onClick={() => {
                setCityCustom(false);
                updateCity("");
              }}
              className="mt-1.5 text-[12px] font-medium text-primary underline-offset-2 hover:underline"
            >
              ← Choose from list
            </button>
          </div>
        ) : (
          <SearchableDropdownField
            label="City"
            required
            inputId={cityInputId}
            value={city}
            onChange={(v) => updateCity(v)}
            onPickOther={() => {
              setCityCustom(true);
              updateCity("");
            }}
            options={citySuggestions}
            disabled={!country.trim()}
            placeholder={country.trim() ? "Select your city" : "Pick a country first"}
            emptyLabel="No cities match — try Other to type your own."
          />
        )}
      </div>
    </div>
  );
}
