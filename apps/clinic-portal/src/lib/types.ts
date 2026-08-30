// Domain types for the Riverside Pediatrics scheduling portal.
// Phase 1: no WebMCP. Pure in-app state modelling the "volatile portal".

export type ISODate = string; // YYYY-MM-DD

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: ISODate;
  mrn: string;
  guardianName: string;
  primaryInsurance: string;
}

export type VisitCategory =
  | "general-pediatrics"
  | "allergy-immunology"
  | "dermatology"
  | "gastroenterology";

export interface CategoryOption {
  value: VisitCategory;
  label: string;
  subReasons: string[];
}

export type VisitType = "routine" | "urgent-referral";

export type ProviderId = "regional" | "academic";

export interface Provider {
  id: ProviderId;
  strategyLabel: string; // "Strategy A"
  name: string;
  org: string;
  tier: string;
  capability: string;
  tradeoff: string;
  earliestLabel: string;
  offersOIT: boolean;
  minAgeMonthsForOIT?: number;
  leadTimeDays: number; // days until earliest urgent slot
  routineLeadTimeDays: number; // days until earliest routine slot
}

export interface Slot {
  id: string;
  providerId: ProviderId;
  date: ISODate;
  time: string; // "9:00 AM"
  weekday: string;
}

export interface ScreeningAnswers {
  airwayInvolvement?: "yes" | "no";
  epinephrineGiven?: "yes" | "no";
  onsetWindow?: string;
  triggers: string[];
  severity?: number; // 1-5
}

export interface InsuranceAuth {
  groupNumber: string;
  priorAuthRef: string;
  referralUploaded: boolean;
}

export type StepId =
  | "reason"
  | "visit-type"
  | "provider"
  | "screening"
  | "insurance"
  | "slot"
  | "review";

export interface Confirmation {
  ref: string;
  provider: Provider;
  slot: Slot;
  bookedAt: string;
}
