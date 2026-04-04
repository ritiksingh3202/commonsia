/** Year of study (academic setup + edit profile) */
export const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"] as const;

/** Major / program — select + optional Other */
export const PROGRAM_OPTIONS = ["B Arch", "M Arch", "PhD", "Post Doc"] as const;
export const PROGRAM_OTHER_VALUE = "__other__";

/** Interests in architecture — 7 presets + Others (8 total) */
export const INTEREST_OPTIONS = [
  "Residential Design",
  "Commercial Architecture",
  "Sustainable Design",
  "Urban Planning",
  "Interior Architecture",
  "Landscape Architecture",
  "Historic Preservation",
] as const;
export const INTEREST_OTHERS_LABEL = "Others";

/** Software — 7 presets + Other (pick to build skills list) */
export const SOFTWARE_OPTIONS = [
  "AutoCAD",
  "Revit",
  "SketchUp",
  "Rhino",
  "Archicad",
  "Adobe Creative Suite",
  "Lumion / Enscape",
] as const;
export const SOFTWARE_OTHER_LABEL = "Other";

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
