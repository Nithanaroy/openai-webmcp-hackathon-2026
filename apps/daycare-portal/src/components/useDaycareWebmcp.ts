"use client";

import {
  SEVERITY_OPTIONS,
  SYMPTOM_OPTIONS,
  crossReactivityFor,
} from "@/lib/data";
import type { PlanForm, Severity } from "@/lib/types";
import {
  asString,
  asStringArray,
  useModelContextTools,
  type WebmcpToolDef,
} from "@/lib/webmcp";

export interface DaycareApi {
  form: PlanForm;
  isComplete: boolean;
  patch: (p: Partial<PlanForm>) => void;
  addAllergen: (name: string, severity: Severity) => void;
  setSymptoms: (symptoms: string[]) => void;
  generate: () => boolean;
}

function normalizeSeverity(value: string | undefined): Severity {
  const v = (value ?? "").toLowerCase();
  return SEVERITY_OPTIONS.some((s) => s.value === v) ? (v as Severity) : "severe";
}

export function useDaycareWebmcp(apiRef: { current: DaycareApi }): void {
  useModelContextTools(() => {
    const tools: WebmcpToolDef[] = [
      {
        name: "get_plan_requirements",
        description:
          "List what the allergy action plan needs and which fields are still missing.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => {
          const f = apiRef.current.form;
          return {
            required: {
              child_name: Boolean(f.childName),
              date_of_birth: Boolean(f.childDob),
              guardian_name: Boolean(f.guardianName),
              guardian_phone: Boolean(f.guardianPhone),
              at_least_one_allergen: f.allergens.length > 0,
              auto_injector_storage: Boolean(f.epinephrineLocation),
              guardian_signature: Boolean(f.signature),
            },
            ready_to_generate: apiRef.current.isComplete,
          };
        },
      },
      {
        name: "get_cross_reactivity",
        description:
          "Related foods to discuss with the allergist, based on the listed allergens.",
        inputSchema: {
          type: "object",
          properties: {
            allergens: {
              type: "array",
              items: { type: "string" },
              description: "Allergen names. Omit to use the plan's current allergens.",
            },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: (input) => {
          const provided = asStringArray(input.allergens);
          const names = provided.length
            ? provided
            : apiRef.current.form.allergens.map((a) => a.name);
          return {
            discuss_with_allergist: crossReactivityFor(names),
            reference_only: "Not a diagnosis; the allergist confirms actual risk.",
          };
        },
      },
      {
        name: "set_child_info",
        description: "Set the child and guardian details on the plan.",
        inputSchema: {
          type: "object",
          properties: {
            child_name: { type: "string", description: "Child's full name." },
            dob: { type: "string", description: "Date of birth, YYYY-MM-DD." },
            guardian_name: { type: "string", description: "Parent or guardian name." },
            guardian_phone: { type: "string", description: "Guardian phone number." },
          },
          additionalProperties: false,
        },
        execute: (input) => {
          const patch: Partial<PlanForm> = {};
          const name = asString(input.child_name);
          const dob = asString(input.dob);
          const gName = asString(input.guardian_name);
          const gPhone = asString(input.guardian_phone);
          if (name) patch.childName = name;
          if (dob) patch.childDob = dob;
          if (gName) patch.guardianName = gName;
          if (gPhone) patch.guardianPhone = gPhone;
          apiRef.current.patch(patch);
          return "Child information updated.";
        },
      },
      {
        name: "add_allergen",
        description: "Add a diagnosed allergen with a severity level.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Allergen, e.g. 'Peanut'." },
            severity: {
              type: "string",
              enum: ["mild", "moderate", "severe"],
              description: "Reaction severity. Defaults to severe.",
            },
          },
          required: ["name"],
          additionalProperties: false,
        },
        execute: (input) => {
          const name = asString(input.name);
          if (!name) return "Provide an allergen name.";
          const severity = normalizeSeverity(asString(input.severity));
          apiRef.current.addAllergen(name, severity);
          return `Added ${name} (${severity}).`;
        },
      },
      {
        name: "set_symptoms",
        description: "Set the symptoms daycare staff should watch for.",
        inputSchema: {
          type: "object",
          properties: {
            symptoms: {
              type: "array",
              items: { type: "string" },
              description: `Any of: ${SYMPTOM_OPTIONS.join(", ")}.`,
            },
          },
          required: ["symptoms"],
          additionalProperties: false,
        },
        execute: (input) => {
          const symptoms = asStringArray(input.symptoms);
          apiRef.current.setSymptoms(symptoms);
          return `Recorded ${symptoms.length} symptom(s).`;
        },
      },
      {
        name: "set_emergency_medication",
        description: "Record the prescribed auto-injector and where it is stored at daycare.",
        inputSchema: {
          type: "object",
          properties: {
            medication: { type: "string", description: "e.g. 'EpiPen Jr 0.15 mg'." },
            storage_location: { type: "string", description: "Where it is kept at daycare." },
          },
          additionalProperties: false,
        },
        execute: (input) => {
          const patch: Partial<PlanForm> = {};
          const med = asString(input.medication);
          const loc = asString(input.storage_location);
          if (med) patch.epinephrineMedication = med;
          if (loc) patch.epinephrineLocation = loc;
          apiRef.current.patch(patch);
          return "Emergency medication details updated.";
        },
      },
      {
        name: "set_allergist",
        description: "Record the managing allergist and the upcoming appointment.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Allergist name." },
            clinic: { type: "string", description: "Clinic name." },
            phone: { type: "string", description: "Clinic phone." },
            appointment: { type: "string", description: "e.g. 'Aug 31, 9:00 AM'." },
          },
          additionalProperties: false,
        },
        execute: (input) => {
          const patch: Partial<PlanForm> = {};
          const name = asString(input.name);
          const clinic = asString(input.clinic);
          const phone = asString(input.phone);
          const appt = asString(input.appointment);
          if (name) patch.physicianName = name;
          if (clinic) patch.physicianClinic = clinic;
          if (phone) patch.physicianPhone = phone;
          if (appt) patch.appointmentInfo = appt;
          apiRef.current.patch(patch);
          return "Allergist and appointment updated.";
        },
      },
      {
        name: "sign_plan",
        description: "Add the guardian's signature and today's date to authorize the plan.",
        inputSchema: {
          type: "object",
          properties: {
            guardian_name: { type: "string", description: "Full name to sign as." },
          },
          required: ["guardian_name"],
          additionalProperties: false,
        },
        execute: (input) => {
          const name = asString(input.guardian_name);
          if (!name) return "Provide the guardian's full name to sign.";
          apiRef.current.patch({
            signature: name,
            signedDate: new Date().toISOString().slice(0, 10),
          });
          return `Signed by ${name}.`;
        },
      },
      {
        name: "generate_plan",
        description: "Generate the printable action plan once all required fields are filled.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: () => {
          const ok = apiRef.current.generate();
          return ok
            ? "Action plan generated and ready to print or save as PDF."
            : "Plan is incomplete. Call get_plan_requirements to see what is missing.";
        },
      },
    ];
    return tools;
  });
}
