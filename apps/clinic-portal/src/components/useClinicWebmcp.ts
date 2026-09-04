"use client";

import type { Dispatch } from "react";
import {
  CATEGORIES,
  DISCHARGE_SUMMARY,
  PATIENT,
  PROVIDERS,
  ageInMonths,
  formatSlotDate,
  slotsFor,
} from "@/lib/data";
import {
  canProceed,
  isGroupNumberValid,
  type Action,
  type SchedulingState,
} from "@/lib/scheduling";
import {
  asBool,
  asNumber,
  asString,
  asStringArray,
  useModelContextTools,
  type WebmcpToolDef,
} from "@/lib/webmcp";
import type { CollabController } from "@/lib/collab";

export interface ClinicApi {
  state: SchedulingState;
  dispatch: Dispatch<Action>;
  collab: CollabController;
}

const AGE_MONTHS = ageInMonths(PATIENT.dob);
const AGE_LABEL = `${Math.floor(AGE_MONTHS / 12)}y ${AGE_MONTHS % 12}m`;

// Plain-language definitions for the jargon a stressed parent faces (pain #3).
const GLOSSARY: Record<string, string> = {
  anaphylaxis:
    "A severe, fast, whole-body allergic reaction that can affect breathing — treat with epinephrine and call 911.",
  "ige": "A blood antibody; a 'specific-IgE panel' is a blood test that checks which foods trigger an allergy.",
  oit: "Oral immunotherapy — slowly giving tiny, increasing amounts of a food under medical supervision to build tolerance.",
  "cross-reactivity":
    "When being allergic to one food raises the chance of reacting to related foods (e.g. peanut with tree nuts or soy).",
  urticaria: "The medical word for hives — raised, itchy welts on the skin.",
  "skin-prick test":
    "A quick clinic test placing a tiny amount of allergen on the skin to see if a small bump forms.",
  referral: "A note from one clinician asking a specialist to see your child.",
};

function providerNameById(id: "regional" | "academic"): string {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}

export function useClinicWebmcp(apiRef: { current: ClinicApi }): void {
  useModelContextTools(() => {
    const tools: WebmcpToolDef[] = [
      {
        name: "get_patient_context",
        description:
          "Read the child's profile and the urgent-care discharge summary on file.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => {
          apiRef.current.collab.log("agent", "Read the child's chart and urgent-care summary.");
          return {
            patient: `${PATIENT.firstName} ${PATIENT.lastName}`,
            age: AGE_LABEL,
            dob: PATIENT.dob,
            guardian: PATIENT.guardianName,
            insurance: PATIENT.primaryInsurance,
            urgent_care: `${DISCHARGE_SUMMARY.facility} (${DISCHARGE_SUMMARY.visitDate}): ${DISCHARGE_SUMMARY.chiefComplaint} Plan: ${DISCHARGE_SUMMARY.plan}`,
          };
        },
      },
      {
        name: "get_appointment_options",
        description:
          "Compare the two scheduling paths (speed vs. scope) so the parent can choose.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () =>
          PROVIDERS.map((p) => ({
            strategy: p.strategyLabel,
            provider: p.name,
            where: p.org,
            earliest: p.earliestLabel,
            good_for: p.capability,
            tradeoff: p.tradeoff,
            oit_for_this_child:
              p.offersOIT && p.minAgeMonthsForOIT !== undefined
                ? AGE_MONTHS < p.minAgeMonthsForOIT
                  ? "waitlist only (min age 4)"
                  : "available"
                : "not offered",
          })),
      },
      {
        name: "explain_terms",
        description:
          "Translate medical terms from the referral into plain language for the parent.",
        inputSchema: {
          type: "object",
          properties: {
            terms: {
              type: "array",
              items: { type: "string" },
              description: "Terms to define. Omit to get all common terms.",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input) => {
          const requested = asStringArray(input.terms).map((t) => t.toLowerCase());
          const entries = Object.entries(GLOSSARY).filter(
            ([k]) => requested.length === 0 || requested.some((r) => k.includes(r) || r.includes(k)),
          );
          apiRef.current.collab.log("agent", "Translated the medical terms into plain language.");
          return Object.fromEntries(entries);
        },
      },
      {
        name: "set_visit_details",
        description:
          "Set the visit reason and urgency. Urgent adds required screening + insurance steps.",
        inputSchema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "e.g. 'New food allergy evaluation' or 'Anaphylaxis follow-up'.",
            },
            urgency: {
              type: "string",
              enum: ["routine", "urgent"],
              description: "Use 'urgent' for anaphylaxis-risk referrals.",
            },
          },
          required: ["reason", "urgency"],
          additionalProperties: false,
        },
        execute: (input) => {
          const { dispatch, collab } = apiRef.current;
          const reason = asString(input.reason) ?? "";
          let cat = CATEGORIES.find((c) =>
            c.subReasons.some((s) => s.toLowerCase() === reason.toLowerCase()),
          );
          let sub = cat?.subReasons.find((s) => s.toLowerCase() === reason.toLowerCase());
          if (!cat) {
            cat =
              CATEGORIES.find((c) =>
                c.subReasons.some((s) => reason && s.toLowerCase().includes(reason.toLowerCase())),
              ) ?? CATEGORIES.find((c) => c.value === "allergy-immunology")!;
            sub =
              cat.subReasons.find(
                (s) => reason && s.toLowerCase().includes(reason.toLowerCase()),
              ) ?? cat.subReasons[0];
          }
          const visitType =
            asString(input.urgency) === "urgent" ? "urgent-referral" : "routine";
          dispatch({ type: "SET_CATEGORY", category: cat.value });
          dispatch({ type: "SET_SUBREASON", subReason: sub! });
          dispatch({ type: "SET_VISIT_TYPE", visitType });
          dispatch({ type: "GOTO", step: "visit-type" });
          collab.log(
            "agent",
            `Drafted visit details${
              visitType === "urgent-referral"
                ? " (urgent referral — screening & insurance required)"
                : ""
            }.`,
          );
          return `Reason set to "${sub}" (${cat.label}); visit type: ${
            visitType === "urgent-referral" ? "Urgent Referral — Anaphylaxis Risk" : "Routine"
          }.${visitType === "urgent-referral" ? " Screening and insurance are now required." : ""}`;
        },
      },
      {
        name: "propose_scheduling_paths",
        description:
          "Present the two scheduling paths and let the parent choose. Optionally pass your suggested strategy; the parent still decides.",
        inputSchema: {
          type: "object",
          properties: {
            suggested: {
              type: "string",
              enum: ["A", "B", "regional", "academic"],
              description: "Optional: the path you'd recommend. The parent makes the final call.",
            },
          },
          additionalProperties: false,
        },
        execute: async (input, ctx) => {
          const { dispatch, collab } = apiRef.current;
          const sug = (asString(input.suggested) ?? "").toLowerCase();
          const suggestedId =
            sug === "a" || sug === "regional"
              ? "regional"
              : sug === "b" || sug === "academic"
                ? "academic"
                : undefined;
          collab.log("agent", "Prepared both scheduling paths for you to compare.");
          const options = PROVIDERS.map((p) => {
            const oit =
              p.offersOIT && p.minAgeMonthsForOIT !== undefined
                ? AGE_MONTHS < p.minAgeMonthsForOIT
                  ? "Waitlist only (min age 4)"
                  : "Available"
                : "Not offered";
            return {
              id: p.id,
              label: `${p.strategyLabel}: ${p.name}`,
              sublabel: p.org,
              badge: p.earliestLabel,
              suggested: p.id === suggestedId,
              attributes: [
                { label: "Earliest", value: p.earliestLabel },
                { label: "Clinical tier", value: p.tier },
                { label: "Capability", value: p.capability },
                { label: "OIT for this child", value: oit },
                { label: "Trade-off", value: p.tradeoff },
              ],
            };
          });
          let chosen: string;
          try {
            chosen = await collab.requestDecision(
              {
                title: "Choose a scheduling path",
                prompt:
                  "Two clinically valid options with a real speed-vs-scope trade-off. This one's your call.",
                options,
              },
              ctx?.signal,
            );
          } catch {
            return "Still waiting on the parent to choose a scheduling path.";
          }
          const id = chosen as "regional" | "academic";
          dispatch({ type: "SET_PROVIDER", providerId: id });
          dispatch({ type: "GOTO", step: "provider" });
          return `Parent chose ${providerNameById(id)} (${
            id === "regional" ? "Strategy A — speed" : "Strategy B — scope"
          }).`;
        },
      },
      {
        name: "complete_screening",
        description:
          "Fill the required anaphylaxis pre-visit screening for an urgent referral.",
        inputSchema: {
          type: "object",
          properties: {
            airway_involved: { type: "boolean", description: "Breathing/throat/swelling involved?" },
            epinephrine_given: { type: "boolean", description: "Was epinephrine administered?" },
            onset: {
              type: "string",
              description: "Time from exposure to symptoms, e.g. 'Less than 30 minutes'.",
            },
            triggers: {
              type: "array",
              items: { type: "string" },
              description: "Suspected trigger foods, e.g. ['Peanut'].",
            },
            severity: { type: "number", description: "1 (mild) to 5 (severe)." },
          },
          required: ["airway_involved", "epinephrine_given", "onset", "triggers", "severity"],
          additionalProperties: false,
        },
        execute: (input) => {
          const { dispatch, collab } = apiRef.current;
          const severity = Math.min(5, Math.max(1, asNumber(input.severity) ?? 1));
          dispatch({
            type: "PATCH_SCREENING",
            patch: {
              airwayInvolvement: asBool(input.airway_involved) ? "yes" : "no",
              epinephrineGiven: asBool(input.epinephrine_given) ? "yes" : "no",
              onsetWindow: asString(input.onset),
              triggers: asStringArray(input.triggers),
              severity,
            },
          });
          dispatch({ type: "GOTO", step: "screening" });
          collab.log("agent", "Drafted the anaphylaxis screening from the discharge notes.");
          return "Screening completed.";
        },
      },
      {
        name: "submit_insurance",
        description: "Provide the insurance group number and attach the referral document.",
        inputSchema: {
          type: "object",
          properties: {
            group_number: { type: "string", description: "Format: two letters + six digits, e.g. BP482019." },
            referral_uploaded: { type: "boolean", description: "Attach the urgent-care referral. Defaults true." },
          },
          required: ["group_number"],
          additionalProperties: false,
        },
        execute: (input) => {
          const { dispatch, collab } = apiRef.current;
          const group = (asString(input.group_number) ?? "").toUpperCase();
          if (!isGroupNumberValid(group)) {
            return "Invalid group number. Use two letters followed by six digits, e.g. BP482019.";
          }
          dispatch({
            type: "PATCH_INSURANCE",
            patch: { groupNumber: group, referralUploaded: asBool(input.referral_uploaded) ?? true },
          });
          dispatch({ type: "GOTO", step: "insurance" });
          collab.log("agent", "Drafted insurance details and attached the referral.");
          return `Insurance group ${group} accepted; referral attached.`;
        },
      },
      {
        name: "list_available_slots",
        description: "List appointment times for the chosen provider and visit type.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => {
          const { state } = apiRef.current;
          if (!state.providerId || !state.visitType) {
            return "Set the visit type and provider first.";
          }
          return slotsFor(state.providerId, state.visitType).map((s) => ({
            slot_id: s.id,
            date: formatSlotDate(s.date),
            time: s.time,
          }));
        },
      },
      {
        name: "book_appointment",
        description:
          "Book a time slot and confirm. Picks the earliest slot if none is specified.",
        inputSchema: {
          type: "object",
          properties: {
            date: { type: "string", description: "Preferred date (optional)." },
            time: { type: "string", description: "Preferred time, e.g. '9:00 AM' (optional)." },
          },
          additionalProperties: false,
        },
        // Consequential: books a real slot. Chrome 154 consequentialHint tells
        // agents to confirm first; our commit gate also blocks until the human does.
        annotations: { readOnlyHint: false, consequentialHint: true },
        execute: async (input, ctx) => {
          const { state, dispatch, collab } = apiRef.current;
          if (!state.visitType) return "Set the visit type first (set_visit_details).";
          if (!state.providerId)
            return "The parent needs to choose a scheduling path first (propose_scheduling_paths).";
          if (state.visitType === "urgent-referral") {
            if (!canProceed(state, "screening")) return "Screening is incomplete (complete_screening).";
            if (!canProceed(state, "insurance")) return "Insurance is incomplete (submit_insurance).";
          }
          const slots = slotsFor(state.providerId, state.visitType);
          const time = asString(input.time)?.toLowerCase();
          const date = asString(input.date)?.toLowerCase();
          const slot =
            slots.find(
              (s) =>
                (!time || s.time.toLowerCase() === time) &&
                (!date || formatSlotDate(s.date).toLowerCase().includes(date)),
            ) ?? slots[0];
          if (!slot) return "No slots available for this selection.";
          const provider = PROVIDERS.find((p) => p.id === state.providerId)!;
          collab.log(
            "agent",
            `Prepared a booking: ${provider.name}, ${formatSlotDate(slot.date)} at ${slot.time}.`,
          );
          let approved: boolean;
          try {
            approved = await collab.requestConfirm(
              {
                title: "Confirm this appointment",
                intro:
                  "Review what the assistant prepared. Nothing is booked until you confirm.",
                rows: [
                  { label: "Patient", value: `${PATIENT.firstName} ${PATIENT.lastName}` },
                  { label: "Provider", value: provider.name },
                  { label: "Location", value: provider.org },
                  { label: "When", value: `${formatSlotDate(slot.date)} at ${slot.time}` },
                  {
                    label: "Visit type",
                    value:
                      state.visitType === "urgent-referral"
                        ? "Urgent Referral — Anaphylaxis Risk"
                        : "Routine",
                  },
                ],
                confirmLabel: "Confirm booking",
                caution: "This reserves a real appointment slot.",
              },
              ctx?.signal,
            );
          } catch {
            return "Booking is waiting on the parent's confirmation.";
          }
          if (!approved) return "The parent declined the booking.";
          const ref = `RVS-${Math.floor(100000 + Math.random() * 899999)}`;
          dispatch({ type: "SET_SLOT", slotId: slot.id });
          dispatch({
            type: "CONFIRM",
            confirmation: { ref, provider, slot, bookedAt: new Date().toISOString() },
          });
          return `Booked ${provider.name} on ${formatSlotDate(slot.date)} at ${slot.time}. Confirmation ${ref}.`;
        },
      },
    ];
    return tools;
  });
}
