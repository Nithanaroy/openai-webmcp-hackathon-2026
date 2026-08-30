# openai-webmcp-hackathon2026

Baseline system for the **WebMCP Challenge** submission: a set of independent,
deliberately-fragmented healthcare portals that a parent must stitch together by
hand to manage a toddler's first acute allergic reaction.

> **Phase 1 (this repo, current):** Build the mock portals as realistic,
> genuinely-dynamic web apps **without** WebMCP. Record the baseline human /
> DOM-agent experience — cost, time, reliability, error rate — of completing the
> end-to-end task across all three sites.
>
> **Phase 2 (later):** Add WebMCP tool contracts to each site and measure the
> delta.

## Scenario

A toddler (Joey) has a first acute allergic reaction (hives after peanut
butter). After urgent care, the parent must, before daycare on Monday:

1. **Clinic portal** — book an urgent allergist referral (dynamic scheduling
   wizard with anaphylaxis-risk flags, conditional pre-visit questionnaires,
   age constraints, insurance authorization).
2. **Pharmacy portal** — locate an in-stock pediatric epinephrine auto-injector
   (supply-shortage simulation across locations).
3. **Daycare portal** — produce a signed State Childcare Allergy Action Plan
   (with cross-reactivity reference) and export it as a PDF.

These three portals **share no state**. The human (Phase 1) or the agent
(Phase 2) is the only thing that carries context between them.

## Repository layout

```
apps/
  clinic-portal/     # Next.js — flagship dynamic scheduling wizard
  pharmacy-portal/   # Next.js — auto-injector stock lookup
  daycare-portal/    # Next.js — allergy action plan + PDF export
docs/
  brainstorm.md      # original pitch
  baseline-plan.md   # infra + measurement plan for Phase 1
```

Each app is a **standalone Next.js project** with its own `package.json` and its
own independent Vercel deployment (Root Directory set per project). There is no
monorepo workspace linking — the isolation is intentional and mirrors the
real-world fragmentation the submission is about.

## Tooling

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Node:** 20.x (pinned per app via Volta). The machine default is Node 16, so
  use `volta run --node 20.20.0 <cmd>` if a shim ever resolves to the wrong
  version.
- **Hosting:** Vercel (one project per `apps/*` folder).

## Local development

```bash
cd apps/clinic-portal
npm install          # first time only
npm run dev          # http://localhost:3000
```

Run each app on its own port when running several at once:

```bash
npm run dev -- -p 3001   # pharmacy-portal
npm run dev -- -p 3002   # daycare-portal
```
