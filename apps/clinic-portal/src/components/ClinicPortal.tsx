"use client";

import { useMemo, useReducer, useRef } from "react";
import {
  CATEGORIES,
  DISCHARGE_SUMMARY,
  PATIENT,
  PROVIDERS,
  ONSET_WINDOWS,
  TRIGGER_OPTIONS,
  ageInMonths,
  formatSlotDate,
  slotsFor,
} from "@/lib/data";
import {
  canProceed,
  computeSteps,
  initialState,
  isGroupNumberValid,
  schedulingReducer,
} from "@/lib/scheduling";
import type { Provider, StepId } from "@/lib/types";
import { useClinicWebmcp, type ClinicApi } from "@/components/useClinicWebmcp";

const STEP_LABELS: Record<StepId, string> = {
  reason: "Reason",
  "visit-type": "Visit type",
  provider: "Provider",
  screening: "Screening",
  insurance: "Insurance",
  slot: "Time slot",
  review: "Review",
};

export default function ClinicPortal() {
  const [state, dispatch] = useReducer(schedulingReducer, initialState);

  // Expose the same booking logic to a WebMCP agent. The ref keeps tool
  // handlers reading live state without re-registering on every change.
  const apiRef = useRef<ClinicApi>({ state, dispatch });
  apiRef.current = { state, dispatch };
  useClinicWebmcp(apiRef);

  const steps = useMemo(() => computeSteps(state), [state]);
  const currentStep = steps[state.stepIndex];
  const ageMonths = ageInMonths(PATIENT.dob);
  const ageLabel = `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m`;

  if (state.confirmation) {
    return <ConfirmationScreen confirmation={state.confirmation} onReset={() => dispatch({ type: "RESET" })} />;
  }

  const proceedOk = canProceed(state, currentStep);
  const isReview = currentStep === "review";

  function handlePrimary() {
    if (!isReview) {
      dispatch({ type: "NEXT" });
      return;
    }
    const provider = PROVIDERS.find((p) => p.id === state.providerId)!;
    const slot = slotsFor(state.providerId!, state.visitType!).find(
      (s) => s.id === state.slotId,
    )!;
    dispatch({
      type: "CONFIRM",
      confirmation: {
        ref: `RVS-${Math.floor(100000 + Math.random() * 899999)}`,
        provider,
        slot,
        bookedAt: new Date().toISOString(),
      },
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[300px_1fr]">
      <PatientPanel ageLabel={ageLabel} />

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <Stepper steps={steps} activeIndex={state.stepIndex} />

        <div className="px-6 py-6">
          {currentStep === "reason" && <ReasonStep state={state} dispatch={dispatch} />}
          {currentStep === "visit-type" && <VisitTypeStep state={state} dispatch={dispatch} />}
          {currentStep === "provider" && (
            <ProviderStep state={state} dispatch={dispatch} ageMonths={ageMonths} />
          )}
          {currentStep === "screening" && <ScreeningStep state={state} dispatch={dispatch} />}
          {currentStep === "insurance" && <InsuranceStep state={state} dispatch={dispatch} />}
          {currentStep === "slot" && <SlotStep state={state} dispatch={dispatch} />}
          {currentStep === "review" && <ReviewStep state={state} ageLabel={ageLabel} />}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={() => dispatch({ type: "BACK" })}
            disabled={state.stepIndex === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {!proceedOk && (
              <span className="text-xs text-slate-400">
                Complete required fields to continue
              </span>
            )}
            <button
              type="button"
              onClick={handlePrimary}
              disabled={!proceedOk}
              className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isReview ? "Confirm appointment" : "Continue"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

type StepProps = {
  state: ReturnType<typeof schedulingReducer>;
  dispatch: React.Dispatch<Parameters<typeof schedulingReducer>[1]>;
};

function PatientPanel({ ageLabel }: { ageLabel: string }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
            {PATIENT.firstName[0]}
            {PATIENT.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {PATIENT.firstName} {PATIENT.lastName}
            </p>
            <p className="text-xs text-slate-500">MRN {PATIENT.mrn}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Age" value={ageLabel} />
          <Row label="DOB" value={PATIENT.dob} />
          <Row label="Guardian" value={PATIENT.guardianName} />
          <Row label="Insurance" value={PATIENT.primaryInsurance} />
        </dl>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Recent urgent care visit
        </p>
        <p className="mt-1 font-medium text-amber-900">
          {DISCHARGE_SUMMARY.facility} · {DISCHARGE_SUMMARY.visitDate}
        </p>
        <p className="mt-2 text-amber-800">{DISCHARGE_SUMMARY.chiefComplaint}</p>
        <p className="mt-2 text-amber-800">
          <span className="font-semibold">Plan: </span>
          {DISCHARGE_SUMMARY.plan}
        </p>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Stepper({ steps, activeIndex }: { steps: StepId[]; activeIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-100 px-6 py-4 text-sm">
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-sky-600 text-white"
                  : done
                    ? "bg-sky-100 text-sky-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </span>
            <span className={active ? "font-semibold text-slate-900" : "text-slate-500"}>
              {STEP_LABELS[s]}
            </span>
            {i < steps.length - 1 && <span className="mx-1 text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ReasonStep({ state, dispatch }: StepProps) {
  const category = CATEGORIES.find((c) => c.value === state.category);
  return (
    <div>
      <StepHeading
        title="What is the reason for this visit?"
        subtitle="Choose the department and the specific reason."
      />
      <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        Based on the recent urgent-care note, this likely belongs under{" "}
        <span className="font-semibold">Allergy &amp; Immunology</span>. Please
        confirm.
      </div>
      <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
      <div className="grid gap-2 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => dispatch({ type: "SET_CATEGORY", category: c.value })}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
              state.category === c.value
                ? "border-sky-500 bg-sky-50 text-sky-800"
                : "border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category && (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Specific reason
          </label>
          <select
            value={state.subReason ?? ""}
            onChange={(e) => dispatch({ type: "SET_SUBREASON", subReason: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
          >
            <option value="" disabled>
              Select a reason…
            </option>
            {category.subReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function VisitTypeStep({ state, dispatch }: StepProps) {
  const options = [
    {
      value: "routine" as const,
      title: "Routine visit",
      desc: "Standard scheduling. Next available appointments are several weeks out.",
    },
    {
      value: "urgent-referral" as const,
      title: "Urgent Referral — Anaphylaxis Risk",
      desc: "Prioritized scheduling. Requires a pre-visit screening and insurance prior authorization.",
    },
  ];
  return (
    <div>
      <StepHeading
        title="Select the visit type"
        subtitle="This determines appointment availability and required paperwork."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const selected = state.visitType === o.value;
          const urgent = o.value === "urgent-referral";
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => dispatch({ type: "SET_VISIT_TYPE", visitType: o.value })}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? urgent
                    ? "border-rose-400 bg-rose-50"
                    : "border-sky-500 bg-sky-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  urgent ? "text-rose-700" : "text-slate-900"
                }`}
              >
                {o.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{o.desc}</p>
            </button>
          );
        })}
      </div>
      {state.visitType === "urgent-referral" && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          Selecting the urgent referral adds two required steps —{" "}
          <span className="font-semibold">anaphylaxis screening</span> and{" "}
          <span className="font-semibold">insurance prior authorization</span> —
          before you can pick a time.
        </div>
      )}
    </div>
  );
}

function ProviderStep({
  state,
  dispatch,
  ageMonths,
}: StepProps & { ageMonths: number }) {
  return (
    <div>
      <StepHeading
        title="Choose a scheduling path"
        subtitle="Two clinically valid options with a real speed-vs-scope trade-off."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const selected = state.providerId === p.id;
          const oitBlocked =
            p.offersOIT && p.minAgeMonthsForOIT !== undefined && ageMonths < p.minAgeMonthsForOIT;
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-xl border p-4 transition ${
                selected ? "border-sky-500 ring-2 ring-sky-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {p.strategyLabel}
                </span>
                <span className="text-xs font-medium text-emerald-600">
                  {p.earliestLabel}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">{p.org}</p>
              <dl className="mt-3 space-y-2 text-xs text-slate-600">
                <div>
                  <dt className="font-semibold text-slate-700">Clinical tier</dt>
                  <dd>{p.tier}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700">Capability</dt>
                  <dd>{p.capability}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700">Trade-off</dt>
                  <dd>{p.tradeoff}</dd>
                </div>
              </dl>
              {oitBlocked && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  OIT desensitization track is waitlist-only for this patient
                  (minimum age 4y). Consult can still be booked.
                </div>
              )}
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_PROVIDER", providerId: p.id })}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-sky-600 text-white"
                    : "border border-sky-500 text-sky-700 hover:bg-sky-50"
                }`}
              >
                {selected ? "Selected" : "Choose this path"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScreeningStep({ state, dispatch }: StepProps) {
  const s = state.screening;
  return (
    <div>
      <StepHeading
        title="Pre-visit anaphylaxis screening"
        subtitle="Required for urgent allergy referrals. All fields are mandatory."
      />
      <div className="space-y-5">
        <YesNo
          label="Did the reaction involve difficulty breathing, throat tightness, or facial swelling?"
          value={s.airwayInvolvement}
          onChange={(v) => dispatch({ type: "PATCH_SCREENING", patch: { airwayInvolvement: v } })}
        />
        <YesNo
          label="Was epinephrine (EpiPen) administered?"
          value={s.epinephrineGiven}
          onChange={(v) => dispatch({ type: "PATCH_SCREENING", patch: { epinephrineGiven: v } })}
        />
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Time from exposure to first symptoms
          </label>
          <select
            value={s.onsetWindow ?? ""}
            onChange={(e) =>
              dispatch({ type: "PATCH_SCREENING", patch: { onsetWindow: e.target.value } })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          >
            <option value="" disabled>
              Select…
            </option>
            {ONSET_WINDOWS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Suspected triggers (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((t) => {
              const on = s.triggers.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => dispatch({ type: "TOGGLE_TRIGGER", trigger: t })}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    on
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Overall reaction severity (1 = mild, 5 = severe)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => dispatch({ type: "PATCH_SCREENING", patch: { severity: n } })}
                className={`h-10 w-10 rounded-lg border text-sm font-semibold transition ${
                  s.severity === n
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: "yes" | "no";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex gap-2">
        {(["yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${
              value === v
                ? "border-sky-500 bg-sky-50 text-sky-700"
                : "border-slate-300 text-slate-600 hover:border-slate-400"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function InsuranceStep({ state, dispatch }: StepProps) {
  const groupValid = isGroupNumberValid(state.insurance.groupNumber);
  const touched = state.insurance.groupNumber.length > 0;
  return (
    <div>
      <StepHeading
        title="Insurance prior authorization"
        subtitle="Urgent specialist referrals require a valid group number and an uploaded referral."
      />
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Insurance group number
          </label>
          <input
            value={state.insurance.groupNumber}
            onChange={(e) =>
              dispatch({
                type: "PATCH_INSURANCE",
                patch: { groupNumber: e.target.value.toUpperCase() },
              })
            }
            placeholder="e.g. BP482019"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
              touched && !groupValid
                ? "border-rose-400 focus:border-rose-500"
                : "border-slate-300 focus:border-sky-500"
            }`}
          />
          <p className={`mt-1 text-xs ${touched && !groupValid ? "text-rose-600" : "text-slate-400"}`}>
            Format: two letters followed by six digits (e.g. BP482019).
          </p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Prior authorization reference (optional)
          </label>
          <input
            value={state.insurance.priorAuthRef}
            onChange={(e) =>
              dispatch({ type: "PATCH_INSURANCE", patch: { priorAuthRef: e.target.value } })
            }
            placeholder="Auto-generated if left blank"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Urgent care referral document
          </label>
          {state.insurance.referralUploaded ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <span>referral_northgate_urgentcare.pdf</span>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "PATCH_INSURANCE", patch: { referralUploaded: false } })
                }
                className="text-xs font-medium text-emerald-700 underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "PATCH_INSURANCE", patch: { referralUploaded: true } })
              }
              className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-600"
            >
              Click to upload referral (simulated)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotStep({ state, dispatch }: StepProps) {
  const slots = slotsFor(state.providerId!, state.visitType!);
  const grouped = slots.reduce<Record<string, typeof slots>>((acc, slot) => {
    (acc[slot.date] ??= []).push(slot);
    return acc;
  }, {});
  return (
    <div>
      <StepHeading
        title="Select an appointment time"
        subtitle="Availability reflects the chosen provider and visit type."
      />
      <div className="space-y-5">
        {Object.entries(grouped).map(([date, daySlots]) => (
          <div key={date}>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              {formatSlotDate(date)}
            </p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => dispatch({ type: "SET_SLOT", slotId: slot.id })}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    state.slotId === slot.id
                      ? "border-sky-500 bg-sky-600 text-white"
                      : "border-slate-300 text-slate-700 hover:border-sky-400"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({
  state,
  ageLabel,
}: {
  state: StepProps["state"];
  ageLabel: string;
}) {
  const provider = PROVIDERS.find((p) => p.id === state.providerId);
  const slot = slotsFor(state.providerId!, state.visitType!).find(
    (s) => s.id === state.slotId,
  );
  return (
    <div>
      <StepHeading
        title="Review &amp; confirm"
        subtitle="Verify the details before booking."
      />
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        <SummaryRow label="Patient" value={`${PATIENT.firstName} ${PATIENT.lastName} (${ageLabel})`} />
        <SummaryRow label="Reason" value={`${state.subReason}`} />
        <SummaryRow
          label="Visit type"
          value={state.visitType === "urgent-referral" ? "Urgent Referral — Anaphylaxis Risk" : "Routine"}
        />
        <SummaryRow label="Provider" value={provider ? `${provider.name} · ${provider.org}` : "—"} />
        <SummaryRow
          label="Appointment"
          value={slot ? `${formatSlotDate(slot.date)} at ${slot.time}` : "—"}
        />
        {state.visitType === "urgent-referral" && (
          <>
            <SummaryRow
              label="Triggers"
              value={state.screening.triggers.join(", ") || "—"}
            />
            <SummaryRow label="Insurance group" value={state.insurance.groupNumber} />
          </>
        )}
      </dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function ConfirmationScreen({
  confirmation,
  onReset,
}: {
  confirmation: NonNullable<StepProps["state"]["confirmation"]>;
  onReset: () => void;
}) {
  const { provider, slot, ref } = confirmation;
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          Appointment confirmed
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirmation reference <span className="font-mono font-semibold">{ref}</span>
        </p>
        <dl className="mt-6 space-y-2 rounded-xl border border-slate-200 p-4 text-left text-sm">
          <SummaryRow label="Patient" value={`${PATIENT.firstName} ${PATIENT.lastName}`} />
          <SummaryRow label="Provider" value={provider.name} />
          <SummaryRow label="Location" value={provider.org} />
          <SummaryRow
            label="When"
            value={`${formatSlotDate(slot.date)} at ${slot.time}`}
          />
        </dl>
        <p className="mt-6 text-xs text-slate-400">
          Next: confirm an in-stock auto-injector at the pharmacy and generate the
          daycare allergy action plan. These are separate systems — you&apos;ll
          need to re-enter this information there.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Book another appointment
        </button>
      </div>
    </div>
  );
}
