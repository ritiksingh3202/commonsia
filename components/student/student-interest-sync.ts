import { coerceStudentInterestSelection } from "@/components/shared/architecture-taxonomy";

import { INTEREST_OPTIONS, INTEREST_OTHERS_LABEL } from "./student-setup-constants";

export function interestStateFromServer(
  list: string[],
  otherInterests: string | null | undefined,
): { sel: Set<string>; others: string } {
  const { ids, strayForOthers } = coerceStudentInterestSelection(list, INTEREST_OTHERS_LABEL);
  const base = (otherInterests ?? "").trim();
  let others = base;
  if (strayForOthers.length) {
    ids.add(INTEREST_OTHERS_LABEL);
    const extra = strayForOthers.join(", ");
    others = base ? `${base}\n${extra}` : extra;
  }
  return { sel: ids, others };
}

export function interestsPayloadFromSelection(
  sel: Set<string>,
  othersDetail: string,
): { interests: string[] | null; otherInterests: string | null } {
  const interestsList: string[] = [];
  for (const opt of INTEREST_OPTIONS) {
    if (sel.has(opt)) interestsList.push(opt);
  }
  let otherInt: string | null = null;
  if (sel.has(INTEREST_OTHERS_LABEL)) {
    otherInt = othersDetail.trim() || null;
    interestsList.push(INTEREST_OTHERS_LABEL);
  }
  return {
    interests: interestsList.length ? interestsList : null,
    otherInterests: sel.has(INTEREST_OTHERS_LABEL) ? otherInt : null,
  };
}
