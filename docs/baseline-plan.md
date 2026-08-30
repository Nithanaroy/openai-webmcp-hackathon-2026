# Phase 1 — Baseline Plan (no WebMCP)

The goal of Phase 1 is to build the three mock portals and **record the
"before" story**: what it costs a human (and a naive DOM-scraping agent) to
complete the end-to-end task when each site is an isolated, dynamic SPA with no
machine-readable tool surface.

## Why baseline-first

The submission's whole argument is a **delta**: "here is the friction today, and
here is how WebMCP removes it." We cannot credibly show the delta without first
measuring the friction. Phase 1 produces that measurement and the demo B-roll of
the "hard way."

## The three portals

| Portal | Core friction we are modeling | Key dynamic behaviors |
|---|---|---|
| **clinic-portal** (flagship) | Volatile, multi-step scheduling wizard | Visit-type toggle mutates available slots; anaphylaxis-risk flag injects a mandatory pre-visit questionnaire; toddler age gates certain appointment types; insurance auth sub-panel; two provider "strategies" (fast vs. academic) as a decision canvas |
| **pharmacy-portal** | Supply-chain scarcity + location hunt | Live stock varies by location and dosage; some locations out of stock; hold/reserve flow with expiry timer |
| **daycare-portal** | Structured document generation | Allergen entry with cross-reactivity hints (peanut → tree nut / soy); required-field validation; export a printable State Childcare Allergy Action Plan PDF |

Each portal deliberately holds **no shared state** with the others. Context only
crosses site boundaries through the human (Phase 1) or the agent (Phase 2).

## Baseline task (the thing we time)

> Starting from the urgent-care discharge summary, (1) book an urgent allergist
> referral for tomorrow, (2) confirm an in-stock EpiPen Jr near home, and
> (3) generate the signed daycare allergy action plan PDF — correctly and
> without validation errors.

## Metrics to record (Phase 1 "before")

- **Time to complete** the full three-site task (wall clock).
- **Steps / clicks / keystrokes** per site and total.
- **Context re-entry**: how many data points must be manually re-typed across
  sites because there is no shared state (e.g. child DOB, allergen, insurance).
- **Error / retry rate**: validation failures, wrong slot picked, stock miss.
- **Reliability of a naive DOM agent**: where a scripted/scraping approach breaks
  (dynamic re-render, modal popups, conditional fields) — qualitative for now.
- **Cost proxy**: for an LLM DOM agent, approximate token/turn count to drive the
  UI blindly (recorded in Phase 2 comparison).

We will capture these in a simple results table (added once the portals run).

## Infra decisions

- **Framework:** Next.js (App Router) + TypeScript + Tailwind, one app per
  folder under `apps/`.
- **State:** in-app React state only (`useReducer` / context per app). No backend
  DB in Phase 1 — dynamic data is seeded in-memory / from local JSON so the
  "volatile portal" behavior is fully client-driven and deterministic for demos.
- **Hosting:** Vercel, one project per `apps/*` (Root Directory set per project).
- **No WebMCP yet.** No `document.modelContext.registerTool` calls in Phase 1.

## Sequencing

1. Scaffold + build `clinic-portal` (flagship, most friction). ✅ first
2. Scaffold + build `pharmacy-portal`.
3. Scaffold + build `daycare-portal`.
4. Deploy all three to Vercel.
5. Record the baseline run (screen capture + metrics table).

Commit and push after each meaningful increment.
