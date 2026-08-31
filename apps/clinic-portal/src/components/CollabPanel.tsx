"use client";

import type { Collab, LedgerEntry, Pending } from "@/lib/collab";

const ACTOR_META: Record<LedgerEntry["actor"], { dot: string; label: string }> = {
  agent: { dot: "bg-sky-500", label: "Assistant" },
  human: { dot: "bg-emerald-500", label: "You" },
  system: { dot: "bg-slate-400", label: "System" },
};

export function CollabLedger({ ledger, pending }: Pick<Collab, "ledger" | "pending">) {
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
            AI
          </span>
          <p className="text-sm font-semibold text-slate-900">Care Assistant</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          The assistant handles the busywork. You make the judgment calls and
          authorize anything that matters.
        </p>

        <ol className="mt-4 space-y-2.5">
          {ledger.length === 0 && (
            <li className="text-xs text-slate-400">
              No activity yet. Ask the assistant to help with your appointment.
            </li>
          )}
          {ledger.map((e) => {
            const meta = ACTOR_META[e.actor];
            return (
              <li key={e.id} className="flex gap-2.5 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                <span className="text-slate-700">
                  <span className="font-medium text-slate-500">{meta.label}: </span>
                  {e.text}
                </span>
              </li>
            );
          })}
          {pending && (
            <li className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
              <span className="font-medium text-amber-700">
                Waiting for you:{" "}
                {pending.kind === "decision" ? "make a choice" : "review & confirm"}
              </span>
            </li>
          )}
        </ol>
      </div>
    </aside>
  );
}

export function CollabOverlay({ pending }: { pending: Pending | null }) {
  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Your input needed
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{pending.title}</h2>
          {pending.kind === "decision" && (
            <p className="mt-1 text-sm text-slate-500">{pending.prompt}</p>
          )}
          {pending.kind === "confirm" && pending.intro && (
            <p className="mt-1 text-sm text-slate-500">{pending.intro}</p>
          )}
        </div>

        <div className="px-6 py-5">
          {pending.kind === "decision" ? (
            <DecisionBody pending={pending} />
          ) : (
            <ConfirmBody pending={pending} />
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionBody({ pending }: { pending: Extract<Pending, { kind: "decision" }> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pending.options.map((o) => (
        <div
          key={o.id}
          className={`flex flex-col rounded-xl border p-4 ${
            o.suggested ? "border-sky-300 bg-sky-50/40" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            {o.badge && (
              <span className="text-xs font-medium text-emerald-600">{o.badge}</span>
            )}
            {o.suggested && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                Assistant suggests
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">{o.label}</p>
          {o.sublabel && <p className="text-xs text-slate-500">{o.sublabel}</p>}
          {o.attributes && o.attributes.length > 0 && (
            <dl className="mt-3 space-y-1.5 text-xs">
              {o.attributes.map((a) => (
                <div key={a.label}>
                  <dt className="font-semibold text-slate-700">{a.label}</dt>
                  <dd className="text-slate-600">{a.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {o.detail && <p className="mt-3 text-xs text-slate-600">{o.detail}</p>}
          <button
            type="button"
            onClick={() => pending.resolve(o.id)}
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Choose this
          </button>
        </div>
      ))}
    </div>
  );
}

function ConfirmBody({ pending }: { pending: Extract<Pending, { kind: "confirm" }> }) {
  return (
    <div>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {pending.rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-slate-500">{r.label}</dt>
            <dd className="text-right font-medium text-slate-800">{r.value}</dd>
          </div>
        ))}
      </dl>
      {pending.caution && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          {pending.caution}
        </p>
      )}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => pending.resolve(false)}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          {pending.cancelLabel ?? "Cancel"}
        </button>
        <button
          type="button"
          onClick={() => pending.resolve(true)}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {pending.confirmLabel}
        </button>
      </div>
    </div>
  );
}
