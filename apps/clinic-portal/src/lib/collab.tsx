"use client";

import { useCallback, useState } from "react";

// Human-in-the-loop collaboration primitive.
//
// A WebMCP tool's async `execute` can call `requestDecision`/`requestConfirm`
// and AWAIT the returned promise. The promise only resolves when the human
// acts on the page — so the agent physically cannot complete a consequential
// step without the human. The site (the domain expert) decides where these
// checkpoints live, not the user and not the agent.

export interface DecisionAttribute {
  label: string;
  value: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  sublabel?: string;
  detail?: string;
  badge?: string;
  /** The agent's recommendation, highlighted but not auto-selected. */
  suggested?: boolean;
  attributes?: DecisionAttribute[];
}

export interface DecisionRequest {
  title: string;
  prompt: string;
  options: DecisionOption[];
}

export interface ConfirmRow {
  label: string;
  value: string;
}

export interface ConfirmRequest {
  title: string;
  intro?: string;
  rows: ConfirmRow[];
  confirmLabel: string;
  cancelLabel?: string;
  caution?: string;
}

export type Pending =
  | ({ kind: "decision" } & DecisionRequest & {
      resolve: (optionId: string) => void;
      reject: (err?: unknown) => void;
    })
  | ({ kind: "confirm" } & ConfirmRequest & {
      resolve: (approved: boolean) => void;
      reject: (err?: unknown) => void;
    });

export type Actor = "agent" | "human" | "system";

export interface LedgerEntry {
  id: string;
  at: number;
  actor: Actor;
  text: string;
}

export interface CollabController {
  /** Append an entry to the visible activity ledger. */
  log: (actor: Actor, text: string) => void;
  /** Surface a values trade-off and block until the human chooses. */
  requestDecision: (req: DecisionRequest, signal?: AbortSignal) => Promise<string>;
  /** Surface a consequential commit and block until the human authorizes. */
  requestConfirm: (req: ConfirmRequest, signal?: AbortSignal) => Promise<boolean>;
}

export interface Collab extends CollabController {
  ledger: LedgerEntry[];
  pending: Pending | null;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function useCollab(): Collab {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);

  const append = useCallback((actor: Actor, text: string) => {
    setLedger((l) => [...l, { id: uid(), at: Date.now(), actor, text }]);
  }, []);

  const requestDecision = useCallback(
    (req: DecisionRequest, signal?: AbortSignal) =>
      new Promise<string>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const onAbort = () => {
          setPending(null);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        const done = () => {
          signal?.removeEventListener("abort", onAbort);
          setPending(null);
        };
        setPending({
          kind: "decision",
          ...req,
          resolve: (optionId) => {
            const opt = req.options.find((o) => o.id === optionId);
            done();
            append("human", `Chose: ${opt?.label ?? optionId}`);
            resolve(optionId);
          },
          reject: (err) => {
            done();
            reject(err);
          },
        });
      }),
    [append],
  );

  const requestConfirm = useCallback(
    (req: ConfirmRequest, signal?: AbortSignal) =>
      new Promise<boolean>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const onAbort = () => {
          setPending(null);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        const done = () => {
          signal?.removeEventListener("abort", onAbort);
          setPending(null);
        };
        setPending({
          kind: "confirm",
          ...req,
          resolve: (approved) => {
            done();
            append("human", approved ? `Authorized: ${req.title}` : `Declined: ${req.title}`);
            resolve(approved);
          },
          reject: (err) => {
            done();
            reject(err);
          },
        });
      }),
    [append],
  );

  return { ledger, pending, log: append, requestDecision, requestConfirm };
}
