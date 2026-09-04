# Pitch — demo points (one per portal)

For the ~90-second demo portion of the 3-minute pitch. One clear point per portal,
building an arc: **unskippable human decision → shared activity log → clean working
memory.** Plain language for a PM to pitch from.

## Demo 1 — Clinic: a human decision the agent can't skip
- **Feature:** The website can require a human decision that the agent is unable to bypass.
- **On screen:** The agent reads the discharge notes, fills the whole (shifting) form, then stops at a "choose your appointment path" card and waits for the parent to pick.
- **How it works (our design):** The site exposes its actions as WebMCP tools. For a decision that needs a person, the tool doesn't return an answer right away — it pauses (built with async/await) until the human clicks. The agent has no result to continue from, so it genuinely can't proceed. The *site* decides where a human is mandatory, not the agent.
- **Why it matters:** Unlike an agent that could just click a button itself, here the important choices stay with the human by design.

## Demo 2 — Pharmacy: a shared activity log
- **Feature:** A live side panel shows who did what — the agent's steps and the human's decisions, as they happen.
- **On screen:** As the agent checks stock and prepares the hold, each step appears in the panel; when the parent picks the pharmacy and confirms, those lines appear too (blue = agent, green = human).
- **How it works (our design):** Every tool the agent runs and every human decision writes one line to a shared log on the page. It's a simple, reusable UX pattern for agent-native apps.
- **Why it matters:** As agents do more on our behalf, transparency is what keeps people comfortable — you can always see what was done for you and what you chose.

## Demo 3 — Daycare: clean working memory
- **Feature:** The agent reuses details from the first two sites to complete the third, with almost no re-typing.
- **On screen:** On the daycare form the agent already has the child's allergen, the auto-injector, and the appointment it just booked — the parent only reviews and signs.
- **How it works (our design):** WebMCP tools return small, structured data instead of whole web pages. The agent keeps those clean facts in its working memory for the session and carries them across otherwise-disconnected sites. Without WebMCP, the agent would scrape each full page — which bloats its context, and more context means more forgetting — so by the third site it would make the parent repeat everything.
- **Why it matters:** Structured tool data gives the agent reliable in-session ("working") memory, something agents usually lack — so three separate systems feel like one.
- **Note for the demo runner:** for this to be visibly true, the daycare prompt must *not* re-state the allergist/appointment/EpiPen — ask the agent to use what was set up on the previous two sites. See [demo-script.md](demo-script.md) / [demo-script-chatgpt.md](demo-script-chatgpt.md).

## Precision guards (so a judge can't nitpick)
- Say the agent **remembers the tools' structured outputs**, not that "the tools persist across sites" (WebMCP tools are page-scoped; the memory lives in the agent's session).
- "Working memory" is **in-session** (the conversation) — the honest, defensible claim.
