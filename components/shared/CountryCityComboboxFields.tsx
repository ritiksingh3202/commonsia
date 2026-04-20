"use client";

import { useId, useMemo, useRef } from "react";

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

function ChevronHint() {
  return (
    <span className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#717182]">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/**
 * Country + city as text inputs with `<datalist>` suggestions (type freely or pick from the list).
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
  const rid = useId().replace(/:/g, "");
  const countryListId = `${rid}-country-dl`;
  const cityListId = `${rid}-city-dl`;
  const countryTrimFocus = useRef("");

  const citySuggestions = useMemo(() => citiesForCountry(country), [country]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label htmlFor={countryInputId} className={setupLabel}>
          Country <span className="text-primary">*</span>
        </label>
        <p className="text-[11px] leading-snug text-[#6b7280]">Choose from the list or type your country.</p>
        <div className="relative">
          <input
            id={countryInputId}
            name="country"
            type="text"
            list={countryListId}
            autoComplete="country-name"
            value={country}
            onChange={(e) => {
              const v = e.target.value;
              setCountry(v);
              scheduleProfilePatch({ country: v.trim() || null });
            }}
            onFocus={() => {
              countryTrimFocus.current = country.trim();
            }}
            onBlur={() => {
              const next = country.trim();
              if (next !== countryTrimFocus.current) {
                setCity("");
                scheduleProfilePatch({ country: next || null, city: null });
              }
            }}
            placeholder="e.g., India, United States"
            className={`${setupField} pr-9`}
            required
          />
          <datalist id={countryListId}>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <ChevronHint />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={cityInputId} className={setupLabel}>
          City <span className="text-primary">*</span>
        </label>
        <p className="text-[11px] leading-snug text-[#6b7280]">
          Suggestions update from your country; you can still type any city or town.
        </p>
        <div className="relative">
          <input
            id={cityInputId}
            name="city"
            type="text"
            list={cityListId}
            autoComplete="address-level2"
            value={city}
            onChange={(e) => {
              const v = e.target.value;
              setCity(v);
              scheduleProfilePatch({ city: v.trim() || null });
            }}
            placeholder={country.trim() ? "e.g., Mumbai, Brooklyn" : "Enter country first for better suggestions"}
            className={`${setupField} pr-9`}
            required
          />
          <datalist id={cityListId}>
            {citySuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <ChevronHint />
        </div>
      </div>
    </div>
  );
}
