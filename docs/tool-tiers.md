# WebMCP Tool Tiers — action plan, UI state & UX

The design contract behind the four tool tiers used across all three portals
(`[READ]` / `[DRAFT]` / `[JUDGEMENT]` / `[COMMIT]`). This is the spine of the
human–agent collaboration and the narration for user-journey slides 4–6.

## At a glance

| Tier | Blocks? | Mutates task state? | Needs human? | WebMCP shape | Where it shows in UI |
|---|---|---|---|---|---|
| **[READ]** | No | No | No | `readOnlyHint: true`, resolves instantly | Ledger note only (page unchanged) |
| **[DRAFT]** | No | Yes (reversible) | No | mutating, resolves instantly | Fields fill + wizard advances on the real page |
| **[JUDGEMENT]** | **Yes** | No (until choice) | **Yes — chooses** | async `execute` awaits `requestDecision` | Blocking modal: side-by-side trade-off canvas |
| **[COMMIT]** | **Yes** | Yes (consequential) | **Yes — authorizes** | async `execute` awaits `requestConfirm` | Blocking modal: review card + caution |

Architectural line: **READ/DRAFT resolve immediately; JUDGEMENT/COMMIT return a
promise that stays pending until the human clicks.** That single fact keeps the
human in control.

---

## [READ] — orient without touching anything
- **Action plan:** return information from on-file data or current state. No
  `dispatch` / `setState` to the form or wizard. Annotated `readOnlyHint: true`.
  Examples: `get_patient_context`, `explain_terms`, `list_available_slots`,
  `check_stock`, `get_cross_reactivity`, `get_plan_requirements`.
- **UI state:** the task/form is **unchanged**. Some reads post a short
  *informational* ledger entry ("Assistant: Read the chart", "Translated the
  terms"); nothing on the page mutates.
- **UX:** the assistant is *understanding / explaining*. This is where **pain #3
  (jargon)** dies — `explain_terms` and `get_cross_reactivity` translate without
  the parent leaving the page. Feels safe; nothing can go wrong.

## [DRAFT] — fill the form, visibly and reversibly
- **Action plan:** go through the app's own state engine (`dispatch` / `setState`)
  to populate fields, run real validation, and advance the wizard (`GOTO`). Logs
  "Assistant: Drafted X." **Nothing is submitted.** Examples: `set_visit_details`,
  `complete_screening`, `submit_insurance`, `find_pharmacies`, `set_child_info`,
  `add_allergen`, `set_symptoms`, `set_allergist`.
- **UI state:** the **real page fills in** — fields populate, the dynamic form
  mutates correctly (choosing "urgent" injects the screening + insurance steps),
  validators fire (group-number format). Because it uses the app's own reducer,
  the render is always consistent (the anti-DOM-scraping point).
- **UX:** the parent *watches the portal fill itself* and can review or override
  any field. This is where **pain #1 (too many forms)** and **pain #2 (dynamic
  forms)** die. Everything is reversible — which is what makes the later COMMIT
  review trustworthy: the human confirms *real, visible* content, not a black box.

## [JUDGEMENT] — hand the values call to the human
- **Action plan:** the agent *prepares* options from state, logs "Prepared both
  paths…", then calls `collab.requestDecision(...)` and **awaits** — the tool call
  blocks. It may pass a `suggested` option but does **not** pre-select. On the
  human's pick it applies the choice and returns a message naming *the human's*
  decision. Examples: `propose_scheduling_paths`; the pharmacy-choice phase of
  `reserve_injector`.
- **UI state:** a **blocking overlay** renders the **Decision Canvas** — options
  side-by-side with their trade-off attributes (speed vs. scope; distance / price
  / hours), the agent's suggestion badged but not chosen. Ledger: "Waiting for
  you: make a choice." No downstream state is set until the pick; then "You: Chose
  Strategy A."
- **UX:** the assistant *stops and defers*. There's no objectively-right answer —
  it's a values judgment (speed vs. scope, OIT age-gate), so the site forces the
  parent to make it. The **"human as strategic trade-off maker."** Reversible:
  a choice among valid options, nothing committed yet.

## [COMMIT] — authorize the consequential action
- **Action plan:** the agent stages everything, checks prerequisites (guards),
  logs "Prepared a booking / hold / plan for review", then calls
  `collab.requestConfirm(...)` with an exact review summary and **awaits**. On
  **confirm** it performs the real action (`CONFIRM` booking / `reserve()` /
  `sign + finalize`) and returns a reference (`RVS-…`, `PH-…`). On **decline** →
  no effect. Examples: `book_appointment`, the hold phase of `reserve_injector`,
  `sign_plan`.
- **UI state:** a **blocking confirm modal** showing the precise details to be
  committed **plus a caution line** ("This reserves a real appointment slot" /
  "Signing authorizes staff to administer epinephrine"). Ledger: "Waiting for you:
  review & confirm." On confirm → the real transition (confirmation screen /
  reservation banner with countdown / printable plan) + "You: Authorized X."
- **UX:** **nothing consequential happens without an explicit, single-click
  authorization** over a pre-validated summary. This is the trust anchor.

---

## The distinction that matters most

**JUDGEMENT vs COMMIT** are both blocking modals, but they answer different
questions:

- **JUDGEMENT** = *"Which one?"* — multiple valid options, no correct answer, the
  human's **preference** decides. The agent must not choose.
- **COMMIT** = *"Go ahead?"* — a single prepared answer; the human's
  **authorization** is what's needed. The agent knows the "what"; it needs the
  "yes."

**DRAFT** is the connective tissue: because drafts fill *visibly and reversibly*,
the COMMIT review is meaningful (real content) and the JUDGEMENT is informed (the
parent sees what's been prepared behind the choice).
