"use client";

import { useMemo, useRef, useState } from "react";
import {
  COMMON_ALLERGENS,
  PREFILL,
  SEVERITY_OPTIONS,
  SYMPTOM_OPTIONS,
  crossReactivityFor,
} from "@/lib/data";
import type { Allergen, PlanForm, Severity } from "@/lib/types";
import { useDaycareWebmcp, type DaycareApi } from "@/components/useDaycareWebmcp";
import { useCollab } from "@/lib/collab";
import { CollabLedger, CollabOverlay } from "@/components/CollabPanel";

const EMPTY: PlanForm = {
  childName: PREFILL.childName ?? "",
  childDob: PREFILL.childDob ?? "",
  guardianName: PREFILL.guardianName ?? "",
  guardianPhone: "",
  emergencyContact: { name: "", relationship: "", phone: "" },
  allergens: [],
  symptoms: [],
  epinephrineMedication: "",
  epinephrineLocation: "",
  physicianName: "",
  physicianClinic: "",
  physicianPhone: "",
  appointmentInfo: "",
  signature: "",
  signedDate: new Date().toISOString().slice(0, 10),
};

export default function DaycarePlan() {
  const [form, setForm] = useState<PlanForm>(EMPTY);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [newAllergen, setNewAllergen] = useState("");
  const [newSeverity, setNewSeverity] = useState<Severity>("severe");

  const crossReactive = useMemo(
    () => crossReactivityFor(form.allergens.map((a) => a.name)),
    [form.allergens],
  );

  const complete =
    form.childName.trim() &&
    form.childDob &&
    form.guardianName.trim() &&
    form.guardianPhone.trim() &&
    form.allergens.length > 0 &&
    form.epinephrineLocation.trim() &&
    form.signature.trim();

  function patch(p: Partial<PlanForm>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function addAllergen() {
    const name = newAllergen.trim();
    if (!name) return;
    const allergen: Allergen = {
      id: crypto.randomUUID(),
      name,
      severity: newSeverity,
      reaction: "",
    };
    setForm((f) => ({ ...f, allergens: [...f.allergens, allergen] }));
    setNewAllergen("");
  }

  function removeAllergen(id: string) {
    setForm((f) => ({ ...f, allergens: f.allergens.filter((a) => a.id !== id) }));
  }

  function toggleSymptom(s: string) {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(s)
        ? f.symptoms.filter((x) => x !== s)
        : [...f.symptoms, s],
    }));
  }

  const collab = useCollab();

  // Expose the plan actions to a WebMCP agent via a live ref.
  const apiRef = useRef<DaycareApi>({} as DaycareApi);
  apiRef.current = {
    form,
    isComplete: Boolean(complete),
    patch,
    addAllergen: (name, severity) =>
      setForm((f) => ({
        ...f,
        allergens: [...f.allergens, { id: crypto.randomUUID(), name, severity, reaction: "" }],
      })),
    setSymptoms: (symptoms) => setForm((f) => ({ ...f, symptoms })),
    generate: () => {
      if (complete) {
        setMode("preview");
        return true;
      }
      return false;
    },
    finalize: () => setMode("preview"),
    collab,
  };
  useDaycareWebmcp(apiRef);

  if (mode === "preview") {
    return (
      <>
        <PlanDocument
          form={form}
          onBack={() => setMode("edit")}
          onPrint={() => window.print()}
        />
        <CollabOverlay pending={collab.pending} />
      </>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
      <div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Re-enter your child&apos;s details, allergy, prescribed auto-injector, and
        the allergist appointment from the other systems. This form does not share
        data with the clinic or pharmacy.
      </div>

      <Section title="Child information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Child's full name">
            <input
              value={form.childName}
              onChange={(e) => patch({ childName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              value={form.childDob}
              onChange={(e) => patch({ childDob: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Parent / guardian">
            <input
              value={form.guardianName}
              onChange={(e) => patch({ guardianName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Guardian phone">
            <input
              value={form.guardianPhone}
              onChange={(e) => patch({ guardianPhone: e.target.value })}
              placeholder="(555) 123-4567"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Allergens">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Allergen">
            <input
              list="allergen-options"
              value={newAllergen}
              onChange={(e) => setNewAllergen(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergen())}
              placeholder="e.g. Peanut"
              className={inputCls}
            />
            <datalist id="allergen-options">
              {COMMON_ALLERGENS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Field>
          <Field label="Severity">
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as Severity)}
              className={inputCls}
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={addAllergen}
            className="h-[38px] rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Add
          </button>
        </div>

        {form.allergens.length > 0 && (
          <ul className="mt-4 space-y-2">
            {form.allergens.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-slate-900">{a.name}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.severity === "severe"
                        ? "bg-rose-100 text-rose-700"
                        : a.severity === "moderate"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {a.severity}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeAllergen(a.id)}
                  className="text-xs font-medium text-slate-400 hover:text-rose-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {crossReactive.length > 0 && (
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <p className="font-semibold">Cross-reactivity to discuss with your allergist</p>
            <p className="mt-1 text-sky-800">
              Because of the allergens above, ask about: {crossReactive.join(", ")}.
            </p>
            <p className="mt-1 text-xs text-sky-600">
              Reference only — not a diagnosis. Your allergist confirms actual risk.
            </p>
          </div>
        )}
      </Section>

      <Section title="Symptoms to watch for">
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => {
            const on = form.symptoms.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  on
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Emergency medication">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prescribed auto-injector">
            <input
              value={form.epinephrineMedication}
              onChange={(e) => patch({ epinephrineMedication: e.target.value })}
              placeholder="e.g. EpiPen Jr 0.15 mg"
              className={inputCls}
            />
          </Field>
          <Field label="Where it is stored at daycare">
            <input
              value={form.epinephrineLocation}
              onChange={(e) => patch({ epinephrineLocation: e.target.value })}
              placeholder="e.g. Front office medication cabinet"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Allergist & appointment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Allergist name">
            <input
              value={form.physicianName}
              onChange={(e) => patch({ physicianName: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Clinic">
            <input
              value={form.physicianClinic}
              onChange={(e) => patch({ physicianClinic: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Clinic phone">
            <input
              value={form.physicianPhone}
              onChange={(e) => patch({ physicianPhone: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Upcoming appointment">
            <input
              value={form.appointmentInfo}
              onChange={(e) => patch({ appointmentInfo: e.target.value })}
              placeholder="e.g. Aug 31, 9:00 AM"
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section title="Guardian authorization">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type full name to sign">
            <input
              value={form.signature}
              onChange={(e) => patch({ signature: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={form.signedDate}
              onChange={(e) => patch({ signedDate: e.target.value })}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <div className="mt-6 flex items-center justify-end gap-3">
        {!complete && (
          <span className="text-xs text-slate-400">
            Complete child info, at least one allergen, storage location, and
            signature.
          </span>
        )}
        <button
          type="button"
          onClick={() => setMode("preview")}
          disabled={!complete}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Generate action plan
        </button>
      </div>
      </div>

      <CollabLedger ledger={collab.ledger} pending={collab.pending} />
      <CollabOverlay pending={collab.pending} />
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function PlanDocument({
  form,
  onBack,
  onPrint,
}: {
  form: PlanForm;
  onBack: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ← Back to edit
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <article className="print-doc rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="border-b border-slate-200 pb-4 text-center">
          <h1 className="text-lg font-bold text-slate-900">
            State Childcare Allergy &amp; Anaphylaxis Action Plan
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            BrightPath Childcare · Emergency care authorization
          </p>
        </header>

        <DocRow label="Child" value={form.childName} />
        <DocRow label="Date of birth" value={form.childDob} />
        <DocRow label="Parent / guardian" value={`${form.guardianName} · ${form.guardianPhone}`} />
        {form.emergencyContact.name && (
          <DocRow
            label="Emergency contact"
            value={`${form.emergencyContact.name} (${form.emergencyContact.relationship}) · ${form.emergencyContact.phone}`}
          />
        )}

        <DocHeading>Diagnosed allergens</DocHeading>
        <ul className="ml-4 list-disc text-sm text-slate-800">
          {form.allergens.map((a) => (
            <li key={a.id}>
              {a.name} — <span className="capitalize">{a.severity}</span>
            </li>
          ))}
        </ul>

        {form.symptoms.length > 0 && (
          <>
            <DocHeading>Watch for these symptoms</DocHeading>
            <p className="text-sm text-slate-800">{form.symptoms.join(", ")}</p>
          </>
        )}

        <DocHeading>If a reaction occurs</DocHeading>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-slate-800">
          <li>
            Administer <strong>{form.epinephrineMedication || "prescribed auto-injector"}</strong>{" "}
            immediately for signs of a severe reaction.
          </li>
          <li>Call 911 and state that epinephrine was given.</li>
          <li>Contact the parent/guardian at {form.guardianPhone || "the number above"}.</li>
        </ol>
        <p className="mt-2 text-sm text-slate-800">
          <span className="font-semibold">Auto-injector location: </span>
          {form.epinephrineLocation}
        </p>

        {(form.physicianName || form.appointmentInfo) && (
          <>
            <DocHeading>Managing allergist</DocHeading>
            <p className="text-sm text-slate-800">
              {[form.physicianName, form.physicianClinic, form.physicianPhone]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {form.appointmentInfo && (
              <p className="text-sm text-slate-800">Appointment: {form.appointmentInfo}</p>
            )}
          </>
        )}

        <div className="mt-8 flex items-end justify-between border-t border-slate-200 pt-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{form.signature}</p>
            <p className="text-xs text-slate-500">Guardian signature</p>
          </div>
          <p className="text-xs text-slate-500">Signed {form.signedDate}</p>
        </div>
      </article>
    </div>
  );
}

function DocRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-3 text-sm text-slate-800">
      <span className="font-semibold">{label}: </span>
      {value}
    </p>
  );
}

function DocHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-5 mb-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
      {children}
    </h2>
  );
}
