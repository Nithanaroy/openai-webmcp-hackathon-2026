# Demo script — the human's prompts & clicks

> For a **non-browser agent** (e.g. Copilot CLI + Chrome DevTools MCP) paired with
> [agent-context-for-demo.md](agent-context-for-demo.md). For the **ChatGPT in-app
> browser** agent, use [demo-script-chatgpt.md](demo-script-chatgpt.md) instead.

You play the parent. You interact in **two ways, and each step needs only one of
them**:

- **Type** (paste to the agent) — only to *start* a task on a portal.
- **Click** (on the page) — only when the site *pauses for your decision or
  authorization*. The click **is** your answer; you don't also type it.

> Your clicks are the human-in-the-loop the site is built around. They do **not**
> violate the agent's "no DOM actions" rule — that rule is for the *agent* (it
> must never scrape or click). You, the human, click the cards it surfaces. The
> agent still does all the driving through WebMCP tools.

## Portals

| Act | Portal | Open this URL |
|---|---|---|
| 1 | Clinic — HealthConnect MyChart | https://clinic-portal-eta-beryl.vercel.app |
| 2 | Pharmacy — CarePoint | https://pharmacy-portal-pi.vercel.app |
| 3 | Daycare — BrightPath | https://daycare-portal.vercel.app |

(Local equivalents: `localhost:3000` / `3001` / `3002`.)

---

## Act 1 — Clinic

**Point the agent at the clinic.** The prompt includes the URL, so the agent can
open the page itself.

**⌨️ Type to the agent** (this is your only typing for this act):

```
We just got back from urgent care — my son Joey broke out in hives about 20
minutes after eating peanut butter. They prescribed an EpiPen but didn't need to
use it, and said to see an allergist urgently. Our clinic portal is
https://clinic-portal-eta-beryl.vercel.app — I'm completely lost, and I don't
understand half of this discharge sheet. Can you get the right appointment
started for me? I've got our BluePeak PPO card here — the group number is
BP482019.
```

The assistant reads the chart, explains the jargon, and drafts the visit,
screening, and insurance. Then it **pauses** and hands you two decisions:

- **🖱️ Click** the soonest scheduling option (your choice — no need to type it).
- **🖱️ Click Confirm booking** on the review card (your authorization).

*(To camera, while the choice card is open: "I can't wait three weeks and worry
at daycare every day — I'll take the soonest one.")*

---

## Act 2 — Pharmacy

**Point the agent at the pharmacy.** The prompt includes the URL, so the agent
can open the page itself.

**⌨️ Type to the agent:**

```
Now I need to actually get the EpiPen Jr. On this pharmacy site —
https://pharmacy-portal-pi.vercel.app — can you find one in stock near me? My ZIP
is 94110.
```

The assistant searches, then **pauses**:

- **🖱️ Click** the pharmacy you want (weigh distance / price / hours — your call).
- **🖱️ Click Place hold** to authorize it. (A 30-minute countdown starts.)

*(To camera: "The closest 24-hour one is fine — hold it.")*

---

## Act 3 — Daycare

**Point the agent at the daycare.** The prompt includes the URL, so the agent can
open the page itself.

**⌨️ Type to the agent:**

```
Joey's daycare needs an allergy action plan before Monday — the daycare portal is
https://daycare-portal.vercel.app. It's for Joey Rivera — severe peanut allergy.
His EpiPen Jr is kept in the front office medication cabinet. Our allergist is Dr.
Maria Chen at Riverside Regional Allergy & Asthma Clinic, with an appointment
tomorrow at 9 AM. I'm Dana Rivera and my number is (555) 812-4407.
```

The assistant fills the plan (and flags cross-reactive foods to raise with the
allergist), then **pauses** at a review card:

- **🖱️ Click Sign** to authorize the plan, then **Print / Save as PDF**.

*(To camera: "That all looks right — sign it as Dana Rivera.")*

---

## The one-line version of the whole demo

**You type three times (once to start each portal) and click at each pause.** The
agent does everything in between through the site's WebMCP tools; you only ever
make the judgment calls and the authorizations.

## Narration beats (say these while the cards are open)

- "The assistant did the busywork — read the discharge note, translated the
  jargon, drafted the screening and insurance. But it **stopped** and handed the
  real decision to me."
- "This is the choice no one else can make for me: **speed vs. scope**. The site
  surfaced the trade-off; I made the call."
- "Nothing consequential happened without my confirmation — the booking, the
  hold, the signature all waited for me."
- "Same info, three disconnected systems — I carried the context across them
  without re-typing or fighting three portals."
