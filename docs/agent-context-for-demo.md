# WebMCP — agent context

This document makes you (an AI agent) familiar with **WebMCP** so you can act on a
website through the tools it exposes, rather than by scraping or clicking the DOM.

A browser-native agent discovers and calls WebMCP tools automatically. If you are
not a browser-native agent, you can act as a WebMCP client yourself by running
JavaScript in the page (for example through a DevTools / `evaluate` channel).

## Core idea

- A WebMCP site **declares what an agent can do as tools**. You discover those
  tools at runtime and call them. You do **not** scrape the page or simulate
  clicks/typing.
- You start with **no prior knowledge** of the site. What actions are available,
  what inputs they take, and the data behind them all come from discovering and
  calling the tools — and from what the user tells you.

## Detect support

```js
const supported = typeof document.modelContext?.getTools === "function";
```

## Discover the tools

```js
const tools = await document.modelContext.getTools();
// each tool: { name, description, inputSchema, annotations, ... }
```

- `inputSchema` is a JSON Schema (delivered as a JSON string) describing the
  tool's arguments.
- `annotations` may carry hints such as `readOnlyHint` (the tool only reads, it
  doesn't change anything).
- **Read every tool's `description` and `inputSchema` before acting.** They tell
  you what each tool does and exactly what to pass.

## Call a tool

```js
const byName = Object.fromEntries(tools.map(t => [t.name, t]));

async function call(name, args = {}) {
  const res = await document.modelContext.executeTool(byName[name], JSON.stringify(args));
  try { return JSON.parse(res); } catch { return res; }
}
```

- `executeTool` takes the **tool object** (from `getTools()`) and its arguments
  as a **JSON string**.
- The result comes back as a **string** — parse it if it is JSON.
- `await` every call. A tool may not resolve immediately: it can **pause until
  the user acts on the page** (for example a card or dialog it renders for a
  choice or a confirmation). That is intended — let the user act, and the call
  resolves. Do not try to bypass it.

## The tool set can change

The available tools can change as the page changes. Re-check with `getTools()`
(and, where available, listen for the `toolchange` event) rather than assuming a
fixed list. Tools are scoped to the current page; if the page navigates, discover
again.

## How to behave

- **Prefer the site's tools** over manual DOM interaction — that is the reliable,
  intended path.
- **Follow each tool's description and input schema** exactly.
- Do the busywork, but **surface choices to the user** and let them make the
  consequential and values-based decisions and authorizations. Don't decide those
  for them.
- **Never invent data.** Use only what the tools return or what the user tells
  you; if you are missing something, ask.
