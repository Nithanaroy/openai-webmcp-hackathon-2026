"use client";

import { useEffect, useRef } from "react";

// Minimal typings for the WebMCP Imperative API (document.modelContext).
// See: https://developer.chrome.com/docs/ai/webmcp/imperative-api

export interface WebmcpAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  /**
   * High-stakes / irreversible / real-world action. Standardized in Chrome 154
   * (ToolAnnotations.consequentialHint) to signal agents to require explicit
   * user confirmation before executing. Our commit-gate tools also enforce the
   * pause: an async execute that awaits the human's on-page confirmation.
   */
  consequentialHint?: boolean;
}

export interface WebmcpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebmcpAnnotations;
  execute: (
    input: Record<string, unknown>,
    ctx: { signal: AbortSignal },
  ) => unknown | Promise<unknown>;
}

export interface WebmcpToolInfo {
  name: string;
  description?: string;
  annotations?: WebmcpAnnotations;
  origin?: string;
}

interface ModelContext {
  registerTool: (
    def: WebmcpToolDef,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ) => Promise<void> | void;
  getTools?: () => Promise<WebmcpToolInfo[]>;
  addEventListener?: (type: string, cb: () => void) => void;
  removeEventListener?: (type: string, cb: () => void) => void;
}

export function getModelContext(): ModelContext | undefined {
  if (typeof document === "undefined") return undefined;
  const mc = (document as unknown as { modelContext?: ModelContext }).modelContext;
  if (!mc || typeof mc.registerTool !== "function") return undefined;
  return mc;
}

export function isWebmcpSupported(): boolean {
  return getModelContext() !== undefined;
}

/**
 * Register a fixed set of WebMCP tools for the lifetime of the calling
 * component. `build` is invoked once on mount; each tool's `execute` handler
 * should read live application state from refs so it always acts on current
 * values without needing re-registration.
 */
export function useModelContextTools(build: () => WebmcpToolDef[]): void {
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    const mc = getModelContext();
    if (!mc) return;
    const controller = new AbortController();
    for (const def of buildRef.current()) {
      // registerTool may return a promise that rejects with AbortError when the
      // effect tears down (React dev double-invokes effects). Swallow that;
      // surface anything unexpected.
      Promise.resolve(mc.registerTool(def, { signal: controller.signal })).catch(
        (err) => {
          if (controller.signal.aborted) return;
          console.error(`WebMCP: failed to register tool "${def.name}"`, err);
        },
      );
    }
    return () => controller.abort();
  }, []);
}

// Small input coercion helpers (WebMCP inputs arrive as untyped JSON).
export const asString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
export const asBool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;
export const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" ? v : undefined;
export const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
