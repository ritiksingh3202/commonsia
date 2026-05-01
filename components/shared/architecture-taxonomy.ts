/**
 * Shared category → tag structure for student interests and mentor expertise (reference UI).
 */
export const ARCHITECTURE_INTEREST_GROUPS = [
  {
    title: "Architecture & Design",
    items: [
      "Architectural Design",
      "Conceptual Design",
      "Residential Architecture",
      "Commercial Architecture",
      "Institutional Architecture",
      "Interior Architecture",
      "Landscape Architecture",
    ],
  },
  {
    title: "Urbanism & Planning",
    items: ["Urban Design", "Urban Planning", "Regional Planning"],
  },
  {
    title: "Sustainability & Environment",
    items: [
      "Sustainable Architecture",
      "Climate Responsive Design",
      "Green Building (LEED / GRIHA)",
    ],
  },
  {
    title: "Building Science",
    items: [
      "Daylighting Design",
      "Thermal Comfort & Building Physics",
      "Building Performance Simulation",
    ],
  },
  {
    title: "Engineering & Technical Systems",
    items: ["Structural Systems", "Building Services (MEP)", "Façade Design"],
  },
  {
    title: "Digital Tools",
    items: [
      "BIM & Digital Construction",
      "Parametric Design (Grasshopper)",
      "Computational Design",
      "Digital Fabrication",
    ],
  },
  {
    title: "Construction & Practice",
    items: ["Construction Management", "Project Management", "Real Estate Development"],
  },
  {
    title: "Career & Portfolio",
    items: [
      "Portfolio Review",
      "Internship & Job Guidance",
      "M.Arch / MS Abroad Guidance",
    ],
  },
] as const satisfies readonly { readonly title: string; readonly items: readonly string[] }[];

const _flat: string[] = [];
for (const g of ARCHITECTURE_INTEREST_GROUPS) {
  for (const it of g.items) _flat.push(it);
}
export const ARCHITECTURE_FLAT_INTERESTS: readonly string[] = _flat;

/** Map legacy saved labels → current taxonomy (student). */
export const LEGACY_STUDENT_INTEREST_MAP: Record<string, string> = {
  "Sustainable Design": "Sustainable Architecture",
  "Vernacular Architecture": "Architectural Design",
  "Parametric Design": "Parametric Design (Grasshopper)",
  "Interior Design": "Interior Architecture",
  "Universal Design": "Conceptual Design",
  "Landscape Design": "Landscape Architecture",
};

/** Map legacy mentor expertise → current taxonomy. */
export const LEGACY_MENTOR_EXPERTISE_MAP: Record<string, string> = {
  "Residential Design": "Residential Architecture",
  "Commercial Architecture": "Commercial Architecture",
  "Sustainable Design": "Sustainable Architecture",
  "Urban Planning": "Urban Planning",
  "Interior Architecture": "Interior Architecture",
  "Landscape Architecture": "Landscape Architecture",
  "Historic Preservation": "Institutional Architecture",
  "Digital Fabrication": "Digital Fabrication",
  "BIM & Technology": "BIM & Digital Construction",
  "Construction Management": "Construction Management",
};

const studentFlatSet = new Set(ARCHITECTURE_FLAT_INTERESTS);

/** Normalize saved student interest tokens into current presets + stray labels for “Others”. */
export function coerceStudentInterestSelection(
  interestStrings: string[],
  othersLabel: string,
): { ids: Set<string>; strayForOthers: string[] } {
  const ids = new Set<string>();
  const stray: string[] = [];
  for (const raw of interestStrings) {
    if (raw === othersLabel) {
      ids.add(othersLabel);
      continue;
    }
    const mapped = LEGACY_STUDENT_INTEREST_MAP[raw] ?? raw;
    if (studentFlatSet.has(mapped)) ids.add(mapped);
    else stray.push(raw);
  }
  return { ids, strayForOthers: stray };
}

/** Normalize saved mentor expertise tokens into current presets + stray labels for “Other”. */
export function coerceMentorExpertiseSelection(
  expertiseStrings: string[],
  otherLabel: string,
): { ids: Set<string>; strayForOther: string[] } {
  const ids = new Set<string>();
  const stray: string[] = [];
  for (const raw of expertiseStrings) {
    if (raw === otherLabel) {
      ids.add(otherLabel);
      continue;
    }
    const mapped = LEGACY_MENTOR_EXPERTISE_MAP[raw] ?? raw;
    if (studentFlatSet.has(mapped)) ids.add(mapped);
    else if (mapped.trim()) stray.push(mapped);
  }
  return { ids, strayForOther: stray };
}

export function mentorExpertiseStateFromServer(
  list: string[],
  otherLabel: string,
): { sel: Set<string>; other: string } {
  const { ids, strayForOther } = coerceMentorExpertiseSelection(list, otherLabel);
  let other = "";
  if (strayForOther.length) {
    ids.add(otherLabel);
    other = strayForOther.join("\n");
  }
  return { sel: ids, other };
}

/** Stable order: taxonomy order, then optional free-text from “Other” (newline / semicolon separates multiple custom tags; commas stay inside one tag). */
export function mentorExpertiseListFromSelection(
  sel: Set<string>,
  otherDetail: string,
  otherLabel: string,
): string[] {
  const out: string[] = [];
  for (const label of ARCHITECTURE_FLAT_INTERESTS) {
    if (sel.has(label)) out.push(label);
  }
  if (sel.has(otherLabel)) {
    const raw = otherDetail.trim();
    if (!raw) return out;
    const parts = raw.split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) out.push(p);
  }
  return out;
}
