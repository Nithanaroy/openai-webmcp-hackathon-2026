import type {
  InsuranceAuth,
  ProviderId,
  ScreeningAnswers,
  StepId,
  VisitCategory,
  VisitType,
  Confirmation,
} from "./types";

export interface SchedulingState {
  stepIndex: number;
  category?: VisitCategory;
  subReason?: string;
  visitType?: VisitType;
  providerId?: ProviderId;
  screening: ScreeningAnswers;
  insurance: InsuranceAuth;
  slotId?: string;
  confirmation?: Confirmation;
}

export const initialState: SchedulingState = {
  stepIndex: 0,
  screening: { triggers: [] },
  insurance: { groupNumber: "", priorAuthRef: "", referralUploaded: false },
};

export type Action =
  | { type: "SET_CATEGORY"; category: VisitCategory }
  | { type: "SET_SUBREASON"; subReason: string }
  | { type: "SET_VISIT_TYPE"; visitType: VisitType }
  | { type: "SET_PROVIDER"; providerId: ProviderId }
  | { type: "PATCH_SCREENING"; patch: Partial<ScreeningAnswers> }
  | { type: "TOGGLE_TRIGGER"; trigger: string }
  | { type: "PATCH_INSURANCE"; patch: Partial<InsuranceAuth> }
  | { type: "SET_SLOT"; slotId: string }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "CONFIRM"; confirmation: Confirmation }
  | { type: "RESET" };

// The active step sequence is derived from the visit type: choosing the urgent
// anaphylaxis referral injects two extra mandatory steps (screening + insurance).
export function computeSteps(state: SchedulingState): StepId[] {
  const steps: StepId[] = ["reason", "visit-type", "provider"];
  if (state.visitType === "urgent-referral") {
    steps.push("screening", "insurance");
  }
  steps.push("slot", "review");
  return steps;
}

export function schedulingReducer(
  state: SchedulingState,
  action: Action,
): SchedulingState {
  switch (action.type) {
    case "SET_CATEGORY":
      return { ...state, category: action.category, subReason: undefined };
    case "SET_SUBREASON":
      return { ...state, subReason: action.subReason };
    case "SET_VISIT_TYPE":
      // Changing visit type invalidates downstream provider/slot selections
      // because slot availability is a function of visit type.
      return {
        ...state,
        visitType: action.visitType,
        providerId: undefined,
        slotId: undefined,
      };
    case "SET_PROVIDER":
      return { ...state, providerId: action.providerId, slotId: undefined };
    case "PATCH_SCREENING":
      return { ...state, screening: { ...state.screening, ...action.patch } };
    case "TOGGLE_TRIGGER": {
      const has = state.screening.triggers.includes(action.trigger);
      return {
        ...state,
        screening: {
          ...state.screening,
          triggers: has
            ? state.screening.triggers.filter((t) => t !== action.trigger)
            : [...state.screening.triggers, action.trigger],
        },
      };
    }
    case "PATCH_INSURANCE":
      return { ...state, insurance: { ...state.insurance, ...action.patch } };
    case "SET_SLOT":
      return { ...state, slotId: action.slotId };
    case "NEXT": {
      const steps = computeSteps(state);
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, steps.length - 1) };
    }
    case "BACK":
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) };
    case "CONFIRM":
      return { ...state, confirmation: action.confirmation };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

const GROUP_NUMBER_RE = /^[A-Z]{2}\d{6}$/;

// Per-step gate that a human must satisfy before advancing — this is the
// friction we are measuring in Phase 1.
export function canProceed(state: SchedulingState, step: StepId): boolean {
  switch (step) {
    case "reason":
      return Boolean(state.category && state.subReason);
    case "visit-type":
      return Boolean(state.visitType);
    case "provider":
      return Boolean(state.providerId);
    case "screening":
      return Boolean(
        state.screening.airwayInvolvement &&
          state.screening.epinephrineGiven &&
          state.screening.onsetWindow &&
          state.screening.severity &&
          state.screening.triggers.length > 0,
      );
    case "insurance":
      return (
        GROUP_NUMBER_RE.test(state.insurance.groupNumber) &&
        state.insurance.referralUploaded
      );
    case "slot":
      return Boolean(state.slotId);
    case "review":
      return true;
    default:
      return false;
  }
}

export function isGroupNumberValid(value: string): boolean {
  return GROUP_NUMBER_RE.test(value);
}
