import type {
  CategoryOption,
  Patient,
  Provider,
  ProviderId,
  Slot,
  VisitType,
} from "./types";

// Deterministic "today" so the demo is reproducible regardless of real clock.
export const TODAY = new Date("2026-08-30T09:00:00");

export const PATIENT: Patient = {
  id: "pat-joey-rivera",
  firstName: "Joey",
  lastName: "Rivera",
  dob: "2023-11-02", // ~2 years 10 months on TODAY (toddler, < 3y)
  mrn: "RVS-4820193",
  guardianName: "Dana Rivera",
  primaryInsurance: "BluePeak PPO",
};

export const DISCHARGE_SUMMARY = {
  facility: "Northgate Urgent Care",
  visitDate: "2026-08-29",
  chiefComplaint:
    "Generalized urticaria (hives) ~20 min after ingesting peanut butter.",
  assessment:
    "Suspected IgE-mediated food allergy (peanut). No airway compromise on exam.",
  plan: "Epinephrine auto-injector prescribed. Refer to allergy/immunology — urgent. Strict peanut avoidance.",
};

export const CATEGORIES: CategoryOption[] = [
  {
    value: "general-pediatrics",
    label: "General Pediatrics",
    subReasons: ["Well-child visit", "Fever", "Cough / cold", "Rash (non-urgent)"],
  },
  {
    value: "allergy-immunology",
    label: "Allergy & Immunology",
    subReasons: [
      "New food allergy evaluation",
      "Anaphylaxis follow-up",
      "Environmental allergy testing",
      "Eczema / atopic dermatitis",
    ],
  },
  {
    value: "dermatology",
    label: "Dermatology",
    subReasons: ["Chronic rash", "Eczema", "Skin lesion"],
  },
  {
    value: "gastroenterology",
    label: "Gastroenterology",
    subReasons: ["Reflux", "Food intolerance", "Abdominal pain"],
  },
];

export const PROVIDERS: Provider[] = [
  {
    id: "regional",
    strategyLabel: "Strategy A",
    name: "Dr. Maria Chen, MD",
    org: "Riverside Regional Allergy & Asthma Clinic",
    tier: "Board-Certified Allergist",
    capability: "Standard specific-IgE blood panel & skin-prick testing.",
    tradeoff:
      "Speed over scope — gets daycare clearance paperwork signed immediately, but no long-term desensitization program.",
    earliestLabel: "Tomorrow, 9:00 AM",
    offersOIT: false,
    leadTimeDays: 1,
    routineLeadTimeDays: 16,
  },
  {
    id: "academic",
    strategyLabel: "Strategy B",
    name: "Dr. Alan Whitfield, MD, PhD",
    org: "University Pediatric Immunology Center",
    tier: "Pediatric Immunology Research Team",
    capability:
      "Comprehensive IgE matrix plus oral immunotherapy (OIT) desensitization tracks.",
    tradeoff:
      "Scope over speed — long wait requires strict daycare isolation now, but offers a pathway to desensitize the allergy over time.",
    earliestLabel: "In ~3 weeks",
    offersOIT: true,
    minAgeMonthsForOIT: 48, // OIT track requires age >= 4y
    leadTimeDays: 21,
    routineLeadTimeDays: 38,
  },
];

export const ONSET_WINDOWS = [
  "Less than 30 minutes",
  "30 minutes – 2 hours",
  "2 – 6 hours",
  "More than 6 hours",
];

export const TRIGGER_OPTIONS = [
  "Peanut",
  "Tree nut",
  "Soy",
  "Egg",
  "Cow's milk",
  "Wheat",
  "Shellfish",
];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekday(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

const URGENT_TIMES = ["9:00 AM", "9:40 AM", "11:20 AM", "2:00 PM"];
const ROUTINE_TIMES = ["10:30 AM", "1:15 PM", "3:45 PM"];

// Dynamic slot availability: depends on provider AND visit type.
// Toggling visit type mutates the slot set — the core "volatile portal" behavior.
export function slotsFor(providerId: ProviderId, visitType: VisitType): Slot[] {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return [];
  const urgent = visitType === "urgent-referral";
  const lead = urgent ? provider.leadTimeDays : provider.routineLeadTimeDays;
  const times = urgent ? URGENT_TIMES : ROUTINE_TIMES;

  const slots: Slot[] = [];
  // Offer slots on the earliest day and the following business day.
  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const date = addDays(TODAY, lead + dayOffset);
    times.forEach((time, i) => {
      // Thin out availability a little so it feels real.
      if (dayOffset === 1 && i % 2 === 1) return;
      slots.push({
        id: `${providerId}-${fmtDate(date)}-${time.replace(/[:\s]/g, "")}`,
        providerId,
        date: fmtDate(date),
        time,
        weekday: weekday(date),
      });
    });
  }
  return slots;
}

export function ageInMonths(dob: string, at: Date = TODAY): number {
  const d = new Date(dob);
  return (
    (at.getFullYear() - d.getFullYear()) * 12 +
    (at.getMonth() - d.getMonth()) -
    (at.getDate() < d.getDate() ? 1 : 0)
  );
}

export function formatSlotDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
