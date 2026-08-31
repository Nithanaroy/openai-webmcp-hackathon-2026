"use client";

import { useEffect, useState } from "react";
import { getModelContext } from "@/lib/webmcp";

// Shows the WebMCP tools this page has registered, discovered live via
// document.modelContext.getTools(). Reflects reality rather than a hardcoded
// list, and gracefully degrades when WebMCP isn't available.
export default function WebmcpBadge({ accent = "sky" }: { accent?: "sky" | "teal" | "emerald" }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mc = getModelContext();
    if (!mc || typeof mc.getTools !== "function") {
      setSupported(false);
      return;
    }
    setSupported(true);
    let active = true;
    const refresh = () => {
      mc.getTools?.()
        .then((list) => {
          if (active) setTools(list.map((t) => t.name).sort());
        })
        .catch(() => {});
    };
    refresh();
    mc.addEventListener?.("toolchange", refresh);
    return () => {
      active = false;
      mc.removeEventListener?.("toolchange", refresh);
    };
  }, []);

  const accents: Record<string, string> = {
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  const dot = supported ? "bg-emerald-500" : "bg-slate-300";

  return (
    <div className={`rounded-xl border ${accents[accent]} px-3 py-2 text-xs`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 font-medium"
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {supported === false
          ? "WebMCP site tools available in a WebMCP-enabled browser"
          : `WebMCP site tools active${tools.length ? ` (${tools.length})` : ""}`}
        {supported && tools.length > 0 && (
          <span className="ml-auto text-[10px] opacity-70">{open ? "hide" : "show"}</span>
        )}
      </button>
      {supported === false && (
        <p className="mt-1 opacity-80">
          Open this page in ChatGPT&apos;s in-app browser (or Chrome with WebMCP
          enabled) and the assistant can complete this task for you.
        </p>
      )}
      {open && tools.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {tools.map((t) => (
            <li
              key={t}
              className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[10px]"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
