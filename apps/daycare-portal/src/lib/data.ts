import type { PlanForm, Severity } from "./types";

// Non-diagnostic cross-reactivity reference. Used only to remind guardians which
// related foods to discuss with the allergist — not clinical advice.
export const CROSS_REACTIVITY: Record<string, string[]> = {
  peanut: ["Tree nuts", "Soy", "Other legumes (peas, lentils)"],
  "tree nut": ["Other tree nuts", "Peanut"],
  "cow's milk": ["Goat's milk", "Sheep's milk"],
  egg: ["Other poultry eggs"],
  shellfish: ["Other shellfish (crab, lobster, shrimp)"],
  wheat: ["Other gluten grains (barley, rye)"],
  soy: ["Other legumes", "Peanut"],
};

export const COMMON_ALLERGENS = [
  "Peanut",
  "Tree nut",
  "Cow's milk",
  "Egg",
  "Soy",
  "Wheat",
  "Shellfish",
  "Fish",
  "Sesame",
];

export const SYMPTOM_OPTIONS = [
  "Hives / rash",
  "Swelling of lips or face",
  "Vomiting",
  "Coughing / wheezing",
  "Difficulty breathing",
  "Throat tightness",
  "Loss of consciousness",
];

export const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe (anaphylaxis risk)" },
];

// Pre-filled with context the guardian would have to carry over from the other
// two portals — captured here to make the re-entry friction explicit.
export const PREFILL: Partial<PlanForm> = {
  childName: "Joey Rivera",
  childDob: "2023-11-02",
  guardianName: "Dana Rivera",
};

export function crossReactivityFor(allergenNames: string[]): string[] {
  const out = new Set<string>();
  for (const name of allergenNames) {
    const related = CROSS_REACTIVITY[name.trim().toLowerCase()];
    if (related) related.forEach((r) => out.add(r));
  }
  // Don't suggest something already on the allergen list.
  const existing = new Set(allergenNames.map((n) => n.toLowerCase()));
  return [...out].filter((r) => !existing.has(r.toLowerCase()));
}
