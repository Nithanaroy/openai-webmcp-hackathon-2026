# Demo Agent Context (WebMCP driver)

This doc gives an AI agent everything it needs to drive the three demo portals
**as if it were an in-browser WebMCP agent** — for demos where you (the presenter)
play the human and no ChatGPT in-app browser / Chrome WebMCP agent is available.

It contains:

1. A copy-paste **system prompt** for the driver agent.
2. **How to invoke** the WebMCP tools (runtime mechanics + gate behavior).
3. The **on-file data & scenario facts** the agent should use.
4. The **per-portal tool catalog**.
5. A **demo script**: the human lines to say + the tool calls the agent should make
   + exactly where you (the human) click.

> The portals expose real WebMCP tools via `document.modelContext`. In a real
> deployment the browser's agent discovers and calls them automatically. Here we
> feed the agent the same knowledge by hand.

---

## 0. Environment

| Portal | URL (local dev) | What it does |
|---|---|---|
| Clinic — HealthConnect MyChart | http://localhost:3000 | Book the urgent allergist referral |
| Pharmacy — CarePoint | http://localhost:3001 | Find & hold an in-stock auto-injector |
| Daycare — BrightPath | http://localhost:3002 | Fill & sign the allergy action plan |

Key facts about the environment:

- **Tools are per-page.** Each portal registers its own tools on its own
  `document.modelContext`. The agent must be **on that tab** to see/call them.
  Navigating away unloads that page's tools. The three portals **do not share
  state** — the agent (and the human) carry context across them.
- **Fixed "today" = 2026-08-30** (deterministic demo). "Tomorrow" = Mon Aug 31.
- **Some tools block.** Judgment/commit tools return a promise that only resolves
  **after the human clicks** the on-page card. That pause is the point — it's
  where the human makes the call. See §2.

---

## 1. System prompt (copy-paste into your driver agent)

```
You are the Care Assistant, an agent embedded in a family's healthcare portals.
You help an exhausted, non-expert parent handle the logistics after their
toddler's first allergic reaction. You act by calling the website's WebMCP tools
— never by scraping or clicking the DOM yourself.

DIVISION OF LABOR (critical):
- You do the busywork: read context, translate jargon, and DRAFT every form.
- The human makes the judgment calls and authorizes anything consequential.
- Some tools intentionally PAUSE and wait for the human to choose or confirm on
  the page (e.g. choosing a scheduling path, choosing a pharmacy, confirming a
  booking or hold, signing the plan). Call them anyway — they are how the human
  stays in control. When one pauses, tell the human what you prepared and ask
  them to make the call on screen. Do not try to bypass or pre-decide it.
- Never invent clinical facts. Use only the on-file data and what the human tells
  you. You may recommend an option, but the human decides.

HOW TO ACT:
- Discover tools with document.modelContext.getTools().
- Call a tool with document.modelContext.executeTool(tool, JSON.stringify(args)).
  The second argument MUST be a JSON string. The result comes back as a string
  (JSON or plain text) — parse it if it's JSON.
- Prefer the fewest tool calls that complete the parent's intent. Fill drafts
  first, then hand off to the human at the gate tools.

SCENARIO / ON-FILE DATA (use these values unless the human overrides them):
- Child: Joey Rivera, DOB 2023-11-02 (~2y 10m), MRN RVS-4820193.
- Guardian: Dana Rivera. Insurance: BluePeak PPO, group number BP482019
  (format: two letters + six digits).
- Urgent care: Northgate Urgent Care (2026-08-29) — generalized hives ~20 min
  after peanut butter; no airway compromise; EpiPen Jr prescribed (not
  administered); referred to allergy/immunology as URGENT; strict peanut
  avoidance.
- Prescription: EpiPen Jr 0.15 mg auto-injector, qty 2 (twin pack).
- Two clinic paths: A = regional (Dr. Maria Chen, earliest tomorrow 9:00 AM,
  standard testing); B = academic (Dr. Alan Whitfield, ~3 weeks, offers OIT but
  waitlist-only under age 4 — so waitlist-only for Joey). Recommend A for speed
  unless the parent prioritizes the long-term OIT program.
```

---

## 2. How to invoke WebMCP tools (runtime mechanics)

The imperative API lives on `document.modelContext`:

```js
// 1) Discover
const tools = await document.modelContext.getTools();
// tools[i] = { name, description, inputSchema (JSON string), annotations, ... }

// 2) Call — args MUST be a JSON string; result comes back as a string
const byName = Object.fromEntries(tools.map(t => [t.name, t]));
async function call(name, args = {}) {
  const res = await document.modelContext.executeTool(byName[name], JSON.stringify(args));
  try { return JSON.parse(res); } catch { return res; }
}

// Example
await call("get_patient_context");
await call("set_visit_details", { reason: "New food allergy evaluation", urgency: "urgent" });
```

**Gate behavior (important).** These tools do NOT resolve immediately — their
promise stays pending until the human clicks the on-page card:

- Clinic: `propose_scheduling_paths` (human picks A/B), `book_appointment` (human confirms).
- Pharmacy: `reserve_injector` (human picks pharmacy, then confirms the hold).
- Daycare: `sign_plan` (human reviews the full plan, then signs).

So `await call("book_appointment", …)` will hang until you click **Confirm booking**
in the page. That's expected — narrate it and let the human act. Everything else
resolves right away.

### Driving it without an in-browser agent

Any of these work:

- **Chrome "Model Context Tool Inspector" extension** — talk to it in natural
  language; it discovers and calls the tools. Paste §1 as context. (Chrome Web
  Store: "Model Context Tool Inspector".)
- **DevTools console** — paste the helper above and run `call(...)` by hand while
  you narrate.
- **A scripted driver** (e.g. Chrome DevTools MCP `evaluate_script`) running the
  `call()` helper. Use this to script a flawless recorded run.

---

## 3. Tool catalog (per portal)

Legend: **[read]** = safe, no change · **[draft]** = fills the form, nothing
committed · **[JUDGMENT gate]** = pauses for the human to choose · **[COMMIT
gate]** = pauses for the human to authorize.

### Clinic — http://localhost:3000 (9 tools)
- `get_patient_context` **[read]** — child profile + discharge summary.
- `explain_terms` **[read]** — plain-language definitions (anaphylaxis, IgE, OIT,
  cross-reactivity, urticaria, skin-prick test, referral).
- `get_appointment_options` **[read]** — compare the two paths as data.
- `set_visit_details` **[draft]** — `{ reason, urgency: "routine"|"urgent" }`.
  Urgent injects required screening + insurance steps.
- `complete_screening` **[draft]** — `{ airway_involved, epinephrine_given, onset,
  triggers[], severity }`.
- `submit_insurance` **[draft]** — `{ group_number, referral_uploaded? }`.
- `list_available_slots` **[read]** — times for the chosen path/visit type.
- `propose_scheduling_paths` **[JUDGMENT gate]** — `{ suggested?: "A"|"B" }`;
  shows the A/B canvas and waits for the human.
- `book_appointment` **[COMMIT gate]** — `{ date?, time? }`; shows a review card
  and waits for the human to confirm.

### Pharmacy — http://localhost:3001 (5 tools)
- `get_prescription` **[read]** — prescribed injector/dose/qty.
- `check_stock` **[read]** — `{ medication?, zip? }` availability summary.
- `find_pharmacies` **[draft]** — `{ zip, medication? }`; shows results on the page.
- `reserve_injector` **[JUDGMENT + COMMIT gate]** — `{ pharmacy?: name }`; if
  several are in stock the human picks one (distance/price/hours), then confirms
  the hold.
- `cancel_reservation` — drop the current hold.

### Daycare — http://localhost:3002 (9 tools)
- `get_plan_requirements` **[read]** — what's filled / still missing.
- `get_cross_reactivity` **[read]** — related foods to discuss (peanut → tree
  nuts / soy / legumes). Reference only, not a diagnosis.
- `set_child_info` **[draft]** — `{ child_name, dob, guardian_name, guardian_phone }`.
- `add_allergen` **[draft]** — `{ name, severity?: "mild"|"moderate"|"severe" }`.
- `set_symptoms` **[draft]** — `{ symptoms[] }`.
- `set_emergency_medication` **[draft]** — `{ medication, storage_location }`.
- `set_allergist` **[draft]** — `{ name?, clinic?, phone?, appointment? }`.
- `sign_plan` **[COMMIT gate]** — `{ guardian_name? }`; shows the whole plan for
  review, then the human signs. On approval the printable plan is generated.
- `generate_plan` — generate once all required fields are filled (used after signing).

---

## 4. Demo script (you play the human)

Three short acts, one per tab. Say the **You** lines out loud; the **Agent** rows
are the tool calls it should make; the **👉 You click** rows are the gate moments.

### Act 1 — Clinic (tab: localhost:3000)

**You (opening, panicked):**
> "We just got back from urgent care — Joey broke out in hives after peanut
> butter. They prescribed an EpiPen and said to see an allergist urgently. I'm
> staring at the clinic portal and I'm lost, and I don't understand half of this
> discharge sheet. Can you get the appointment started? They didn't actually use
> the EpiPen on him."

**Agent:**
1. `get_patient_context`
2. `explain_terms` `{ terms: ["urticaria","anaphylaxis","IgE","cross-reactivity"] }`
3. `set_visit_details` `{ reason: "New food allergy evaluation", urgency: "urgent" }`
4. `complete_screening` `{ airway_involved: false, epinephrine_given: false, onset: "Less than 30 minutes", triggers: ["Peanut"], severity: 3 }`
5. `submit_insurance` `{ group_number: "BP482019", referral_uploaded: true }`
6. `propose_scheduling_paths` `{ suggested: "A" }`  ← **pauses**

**You (at the A/B card):**
> "I can't wait three weeks and worry at daycare every day. Book the soonest one."

**👉 You click:** *Choose this* on **Strategy A** (Dr. Maria Chen, tomorrow 9:00 AM).

**Agent:** 7. `book_appointment` `{ time: "9:00 AM" }`  ← **pauses**

**👉 You click:** *Confirm booking*. → Appointment confirmed (RVS-…).

### Act 2 — Pharmacy (tab: localhost:3001)

**You:**
> "Now I need the actual EpiPen. Can you find one in stock near me? My ZIP is 94110."

**Agent:**
1. `get_prescription`
2. `find_pharmacies` `{ zip: "94110" }`
3. `reserve_injector` `{ pharmacy: "Bayview" }`  ← **pauses** (pharmacy choice)

**You (at the pharmacy card):**
> "The 24-hour one that's closest is fine — hold it."

**👉 You click:** *Choose this* on **Bayview Care Pharmacy (24h)** → then *Place hold*.
→ Hold placed (PH-…), 30-minute countdown.

### Act 3 — Daycare (tab: localhost:3002)

**You:**
> "Daycare needs an allergy action plan before Monday. It's the same info — Joey,
> peanut allergy, the EpiPen Jr, and the allergist we just booked."

**Agent:**
1. `set_child_info` `{ child_name: "Joey Rivera", dob: "2023-11-02", guardian_name: "Dana Rivera", guardian_phone: "(555) 812-4407" }`
2. `add_allergen` `{ name: "Peanut", severity: "severe" }`
3. `get_cross_reactivity`  → mentions tree nuts / soy / legumes to raise with the allergist
4. `set_symptoms` `{ symptoms: ["Hives / rash","Swelling of lips or face","Difficulty breathing"] }`
5. `set_emergency_medication` `{ medication: "EpiPen Jr 0.15 mg", storage_location: "Front office medication cabinet" }`
6. `set_allergist` `{ name: "Dr. Maria Chen, MD", clinic: "Riverside Regional Allergy & Asthma Clinic", appointment: "Aug 31, 9:00 AM" }`
7. `sign_plan`  ← **pauses** (full-plan review)

**You (at the review card):**
> "That all looks right — sign it as Dana Rivera."

**👉 You click:** *Sign as Dana Rivera*. → Printable action plan generated (Print / Save as PDF).

---

## 5. Talking points to land (while the gates are open)

- "The assistant did the busywork — read the discharge note, translated the
  jargon, drafted the screening and insurance. But it **stopped** and handed the
  real decision to me."
- "This is the choice no one else can make for me: **speed vs. scope**. The site
  surfaced the trade-off; I made the call."
- "Nothing consequential happened without my confirmation — the booking, the
  hold, the signature all waited for me."
- "Same info, three disconnected systems — the assistant carried the context so I
  didn't re-type it or fight three different portals."
