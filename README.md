# CareBridge — humans in control of multi-page agent workflows

**WebMCP Challenge submission.** Real tasks sprawl across many disconnected web
apps, and today's agents tend to just finish them for you. CareBridge shows how
**WebMCP turns a website into a better collaborator**: the human stays in control
of the decisions that matter, and the agent gains reliable memory across pages.

Three deliberately-disconnected healthcare portals (clinic, pharmacy, daycare)
demonstrate three design + implementation contributions:

1. **A human checkpoint the agent cannot skip (async/await confirmation).** A
   WebMCP tool's `execute` can be `async` and await a promise that only resolves
   when the human acts on the page. Until then the agent has no result to
   continue from, so it genuinely cannot proceed. The **site** decides where a
   human is mandatory — a **judgement gate** (choose a trade-off) and a **commit
   gate** (authorize a booking / hold / signature).
2. **A shared activity log.** A live panel shows who did what as it happens —
   every agent tool call and every human decision, one line each (blue = agent,
   green = you). A small, reusable transparency pattern for agent-native apps.
3. **Reliable working memory from clean structured outputs (the aha).** WebMCP
   tools return small, structured data instead of whole pages, so the agent keeps
   those clean facts in its **in-session working memory** and carries them across
   otherwise-disconnected sites — a *virtual bundling* of tools from different
   pages into one task. DOM scraping would bloat the context window (more context
   → more forgetting), so by the third site the agent would make you repeat
   everything. **The takeaway for WebMCP authors: design your tool outputs for how
   they'll live in the agent's cross-page memory, not just for your current page.**

> **Honest scope:** working memory is *in-session* — it lives in the agent's
> conversation, not in the tools (WebMCP tools are page-scoped). The cross-page
> coherence comes from the agent remembering compact, structured tool outputs.

## The demo (illustration)

A toddler (Joey) has a first peanut reaction. An exhausted, non-expert parent
must book an urgent allergist, secure a scarce pediatric EpiPen, and get a signed
daycare action plan — across three portals that **share no backend**. The agent
does the busywork; the parent makes every real call; and the context flows so
nothing is re-typed.

1. **Clinic portal** — book an urgent allergist referral (dynamic scheduling
   wizard with anaphylaxis-risk flags, conditional pre-visit questionnaires, age
   constraints, insurance authorization).
2. **Pharmacy portal** — locate an in-stock pediatric epinephrine auto-injector
   (supply-shortage simulation across locations).
3. **Daycare portal** — produce a signed State Childcare Allergy Action Plan
   (with cross-reactivity reference) and export it as a PDF.

**Live apps:** clinic https://clinic-portal-eta-beryl.vercel.app · pharmacy
https://pharmacy-portal-pi.vercel.app · daycare https://daycare-portal.vercel.app

See [docs/demo-script-chatgpt.md](docs/demo-script-chatgpt.md) to run it in
ChatGPT's in-app browser, and [docs/pitch-demo-points.md](docs/pitch-demo-points.md)
for the one-point-per-portal pitch.

## Repository layout

```
apps/
  clinic-portal/     # Next.js — scheduling wizard + WebMCP tools
  pharmacy-portal/   # Next.js — auto-injector finder + WebMCP tools
  daycare-portal/    # Next.js — allergy action plan + WebMCP tools
    src/lib/webmcp.ts             # registerTool helper (feature-detect + teardown)
    src/lib/collab.tsx            # human-in-the-loop gates + activity log
    src/components/use*Webmcp.ts  # this site's WebMCP tool definitions
    src/components/CollabPanel.tsx# the shared activity log + gate overlay UI
docs/
  pitch-demo-points.md       # one pitch point per portal (the 3 contributions)
  demo-script-chatgpt.md     # run the demo in ChatGPT's in-app browser
  agent-context-for-demo.md  # WebMCP primer for non-browser agents
  brainstorm.md              # original pitch (historical)
  baseline-plan.md           # early baseline plan (historical)
```

Each app is a **standalone Next.js project** with its own `package.json` and its
own independent Vercel deployment (Root Directory set per project). There is no
monorepo workspace linking — the isolation is intentional and mirrors the
real-world fragmentation the demo is about: the sites share no backend, so the
**agent** is what carries context between them.

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
