# Agent context for the demo (WebMCP driver — app-agnostic)

For demos where **you play the human** and drive a **non-browser agent** (e.g.
Copilot CLI, a Chrome DevTools MCP script) to stand in for a browser's built-in
WebMCP agent.

The whole point is fidelity to a **cold browser-agent experience**: when a judge
opens the app in ChatGPT's in-app browser (or Chrome with WebMCP), their agent
starts with **no prior knowledge** of the site — no idea what tools exist, who
the user is, or what the task is. It learns everything by discovering the page's
WebMCP tools.

So this doc deliberately contains **no** app-specific context — no tool names, no
patient, no task, no data, no behavior of specific tools. The only thing here
that a browser agent gets for free (and that a non-browser agent needs supplied)
is **how to reach the WebMCP API**. Everything else the agent must discover.

> Task details and any personal information come from what you *say* during the
> demo — see [demo-script.md](demo-script.md). They are not pre-loaded here.

---

## 1. Generic agent instruction (safe to give any driver agent)

Paste this as the driver agent's context. It carries no knowledge of the specific
site — only how a good agent should behave:

```
You are driving a live website on the user's behalf by calling the site's own
WebMCP tools — not by scraping or clicking the DOM. You have no prior knowledge
of this site.

- Discover what you can do: list the site's tools and read each tool's
  description and input schema. Do not assume any tool, data, or task exists
  until you have discovered it.
- Follow the tool descriptions. Prefer the site's tools over manual DOM actions.
- Do the busywork, but surface choices to the user and let them make the
  consequential and values-based decisions and authorizations — don't decide
  those for them.
- Never invent facts. Use only what the tools return or what the user tells you.
  If you need information you don't have, ask the user.
```

---

## 2. How to reach the WebMCP tools (non-browser agents)

A browser agent gets this for free. For a non-browser agent, expose the same API
by running JavaScript in the page — via **Chrome DevTools MCP `evaluate_script`**
or the **DevTools console**.

The imperative API lives on `document.modelContext`:

```js
// Discover
const tools = await document.modelContext.getTools();
// each tool: { name, description, inputSchema (JSON string), annotations, ... }

// Call — the args MUST be a JSON string; the result comes back as a string
const byName = Object.fromEntries(tools.map(t => [t.name, t]));
async function call(name, args = {}) {
  const res = await document.modelContext.executeTool(byName[name], JSON.stringify(args));
  try { return JSON.parse(res); } catch { return res; }
}
```

The agent should first `getTools()`, read the descriptions/schemas, and decide
what to call from that — exactly as a browser agent would.

---

## 3. Runner notes (for you, the presenter)

- Open the target URL in the browser **first**, then point the agent at that
  page/tab. (URLs are in [demo-script.md](demo-script.md).)
- Tools are scoped to the page. If you navigate away, that page's tools are gone.
- `await` every call. If a call doesn't return right away, a tool is waiting for
  **you** to act on the page (a card or dialog has appeared) — do it, and the
  call resolves. This is normal; let it happen rather than trying to force it.
- Give the agent the task and any personal details **out loud, as the human**,
  using the prompts in [demo-script.md](demo-script.md).
