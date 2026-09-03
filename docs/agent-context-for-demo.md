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

## Accessing the page (non-browser agents via Chrome DevTools MCP)

Everything below runs JavaScript in the page. If your channel is **Chrome
DevTools MCP** (e.g. Copilot CLI with the `chrome-devtools` MCP server), reach
`document.modelContext` like this:

1. **Get a page handle** — open the URL with `new_page(url)`, or find an already
   open tab with `list_pages` + `select_page`, to obtain a `pageId`.
2. **Run WebMCP JS** with the `evaluate_script(pageId, fn)` tool, passing an
   `async` function that uses `document.modelContext`. `evaluate_script` returns
   **JSON-serializable** values, so return plain strings/objects (not a raw tool
   handle).

```js
// evaluate_script(pageId, fn):
async () => {
  const tools = await document.modelContext.getTools();
  return tools.map(t => ({ name: t.name, description: t.description }));
}
```

### Tools that wait for the user

Some tools don't resolve until the user acts on the page (see *Call a tool*).
Just `await` the call inside the `evaluate_script` — it returns as soon as the
user clicks the card / confirms the dialog:

```js
async () => {
  const t = (await document.modelContext.getTools()).find(x => x.name === NAME);
  const res = await document.modelContext.executeTool(t, JSON.stringify(ARGS));
  try { return JSON.parse(res); } catch { return res; }
}
```

The `evaluate_script` call blocks while it waits, so make sure the user acts
before the call's timeout. If your `evaluate_script` exposes a `timeout`, raise it
(e.g. `60000` ms) to give the user time. Don't poll in a loop — a single awaiting
call is simpler and won't stop early.

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
- Read/inform tools resolve immediately. A tool that needs a human **decision or
  confirmation stays pending until the user acts on the page** (a card or dialog
  it renders); it resolves when they do. That pause is intended — don't try to
  bypass it. If you are driving through `evaluate_script`, simply `await` the call
  (see *Accessing the page*) and give the user time to click before the timeout.

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
