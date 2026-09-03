# Demo script — the human's prompts

You play the parent. Open each portal, **paste the prompt** to your agent, let it
work, and **click the on-screen card** when it appears. The prompts carry the
facts a parent would naturally know — the agent discovers everything else from the
page's tools.

> The agent gets no app-specific briefing (see
> [agent-context-for-demo.md](agent-context-for-demo.md)) — only these spoken
> prompts + whatever it discovers on the page. That mirrors a real judge's
> browser agent.

## Portals

| Act | Portal | Open this URL |
|---|---|---|
| 1 | Clinic — HealthConnect MyChart | https://clinic-portal-eta-beryl.vercel.app |
| 2 | Pharmacy — CarePoint | https://pharmacy-portal-pi.vercel.app |
| 3 | Daycare — BrightPath | https://daycare-portal.vercel.app |

(Local equivalents: `localhost:3000` / `3001` / `3002`.)

---

## Act 1 — Clinic

**Open** the clinic URL, point the agent at the page, then paste:

```
We just got back from urgent care — my son Joey broke out in hives about 20
minutes after eating peanut butter. They prescribed an EpiPen but didn't need to
use it, and said to see an allergist urgently. I'm on our clinic portal and I'm
completely lost, and I don't understand half of this discharge sheet. Can you get
the right appointment started for me? I've got our BluePeak PPO card here — the
group number is BP482019.
```

The assistant reads the chart, explains the jargon, and drafts the visit,
screening, and insurance. It then **stops at a card asking you to choose a
scheduling path.** Paste:

```
I can't wait three weeks and worry at daycare every day. Let's do the soonest one.
```

**👉 Click** the soonest option, then **Confirm booking** when the review appears.

---

## Act 2 — Pharmacy

**Open** the pharmacy URL, point the agent at the page, then paste:

```
Now I need to actually get the EpiPen Jr. Can you find one in stock near me? My
ZIP is 94110.
```

The assistant searches and **stops at a card asking which pharmacy.** Paste:

```
The closest 24-hour one is fine — go ahead and hold it.
```

**👉 Click** that pharmacy, then **Place hold**. (A 30-minute countdown starts.)

---

## Act 3 — Daycare

**Open** the daycare URL, point the agent at the page, then paste:

```
Joey's daycare needs an allergy action plan before Monday. It's for Joey Rivera —
severe peanut allergy. His EpiPen Jr is kept in the front office medication
cabinet. Our allergist is Dr. Maria Chen at Riverside Regional Allergy & Asthma
Clinic, with an appointment tomorrow at 9 AM. I'm Dana Rivera and my number is
(555) 812-4407.
```

The assistant fills the plan (and flags cross-reactive foods to raise with the
allergist), then **stops at a review card for your signature.** Paste:

```
That all looks right — sign it as Dana Rivera.
```

**👉 Click** **Sign**, then **Print / Save as PDF**.

---

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
