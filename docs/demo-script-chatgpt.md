# Demo script — ChatGPT in-app browser (site tools / WebMCP)

For the **ChatGPT in-app browser agent**, which already understands WebMCP
("site tools"). It needs **no** primer — do **not** give it
[agent-context-for-demo.md](agent-context-for-demo.md). The prompts below do two
extra jobs:

1. **Steer it to the site's WebMCP tools, not computer-use.** Left alone, the
   agent may fill forms by clicking/typing the page (actuation). We want it to use
   the site's built-in **site tools** instead — that's the whole point of the demo.
2. **Accept the demo's sample dates.** The apps use fixed sample dates, which may
   look "in the past" or "unavailable" to the agent. The prompts tell it to take
   whatever the tools offer and pick the earliest, so it doesn't block.

You still interact in **two ways, one per step**:

- **Type** (paste to ChatGPT) — only to *start* a task on a portal.
- **Click** (on the page) — only when the site *pauses for your decision or
  authorization*. The click **is** your answer; you don't also type it.

> Your clicks are the human-in-the-loop the site is built around. They're your
> input at the site's own gates — the agent still does all the driving through
> site tools.

## Portals

| Act | Portal | URL |
|---|---|---|
| 1 | Clinic — HealthConnect MyChart | https://clinic-portal-eta-beryl.vercel.app |
| 2 | Pharmacy — CarePoint | https://pharmacy-portal-pi.vercel.app |
| 3 | Daycare — BrightPath | https://daycare-portal.vercel.app |

---

## Act 1 — Clinic

**⌨️ Type to ChatGPT** (this is your only typing for this act):

```
Open our clinic portal at https://clinic-portal-eta-beryl.vercel.app and use the
page's built-in site tools (WebMCP) to help me — please don't fill anything by
clicking or typing in the page yourself; drive it through the site tools.

We just got back from urgent care — my son Joey broke out in hives about 20
minutes after eating peanut butter. They prescribed an EpiPen but didn't need to
use it, and said to see an allergist urgently. I'm lost and don't understand half
of the discharge sheet. Can you get the right appointment started for me? Our
insurance is BluePeak PPO, group number BP482019.

This is a demo app with fixed sample dates — treat the appointment times the
tools offer as valid, just pick the earliest available one, and don't reject any
date as being in the past or worry about today's real calendar.
```

The assistant reads the chart, explains the jargon, and drafts the visit,
screening, and insurance via site tools. Then it **pauses** and hands you two
decisions:

- **🖱️ Click** the soonest scheduling option (your choice — no need to type it).
- **🖱️ Click Confirm booking** on the review card (your authorization).

*(To camera: "I can't wait three weeks and worry at daycare every day — I'll take
the soonest one.")*

---

## Act 2 — Pharmacy

**⌨️ Type to ChatGPT:**

```
Open the pharmacy site at https://pharmacy-portal-pi.vercel.app and use its
built-in site tools (WebMCP) — don't click or type in the page yourself.

I need to get the EpiPen Jr that was prescribed for Joey. Can you find one in
stock near me? My ZIP is 94110.
```

The assistant searches via site tools, then **pauses**:

- **🖱️ Click** the pharmacy you want (weigh distance / price / hours — your call).
- **🖱️ Click Place hold** to authorize it. (A 30-minute countdown starts.)

*(To camera: "The closest 24-hour one is fine — hold it.")*

---

## Act 3 — Daycare

**⌨️ Type to ChatGPT:**

```
Open the daycare portal at https://daycare-portal.vercel.app and use its built-in
site tools (WebMCP) — don't fill the form by clicking or typing yourself.

Joey's daycare needs an allergy action plan. It's for Joey Rivera — severe peanut
allergy. His EpiPen Jr is kept in the front office medication cabinet. Our
allergist is Dr. Maria Chen at Riverside Regional Allergy & Asthma Clinic, for the
soonest appointment we just booked. I'm Dana Rivera and my number is
(555) 812-4407. It's a demo, so use whatever dates the tools accept — don't block
on a specific calendar date.
```

The assistant fills the plan via site tools (and flags cross-reactive foods to
raise with the allergist), then **pauses** at a review card:

- **🖱️ Click Sign** to authorize the plan, then **Print / Save as PDF**.

*(To camera: "That all looks right — sign it as Dana Rivera.")*

---

## The one-line version of the whole demo

**You type three times (once to start each portal) and click at each pause.** The
agent does everything in between through the site's WebMCP tools — not by driving
the mouse and keyboard — and you make the judgment calls and authorizations.

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
