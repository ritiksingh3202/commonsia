import {
  ARCHITECTURE_FLAT_INTERESTS,
  ARCHITECTURE_INTEREST_GROUPS,
} from "@/components/shared/architecture-taxonomy";

/** Re-export for grouped UIs (student setup, edit profile). */
export { ARCHITECTURE_INTEREST_GROUPS };

/** Year of study (academic setup + edit profile) */
export const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"] as const;

/** Major / program — select + Other */
export const PROGRAM_OPTIONS = ["B Arch", "M Arch", "B Planning", "B Des", "M Des"] as const;
export const PROGRAM_OTHER_VALUE = "__other__";

/** Interests — flat list (same order as grouped taxonomy). */
export const INTEREST_OPTIONS = ARCHITECTURE_FLAT_INTERESTS;

export const INTEREST_OTHERS_LABEL = "Others";

/** Software — presets + Other (pick to build skills list) */
export const SOFTWARE_OPTIONS = [
  "AutoCAD",
  "Revit",
  "SketchUp",
  "Rhino",
  "Archicad",
  "Grasshopper",
  "Design Builder",
] as const;
export const SOFTWARE_OTHER_LABEL = "Other";
