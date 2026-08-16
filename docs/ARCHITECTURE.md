# Say2Build — Architecture

## Design rule

> **AI judges the change. Code applies the change.**

The model does not rewrite the entire Project Brain after each message. It returns an incremental `BrainTurnResult`; a deterministic reducer validates and applies the proposed changes.

```text
User turn
   │
   ▼
Current Project Brain + recent chat
   │
   ▼
Conversation Interpreter
   │
   ▼
BrainTurnResult (proposed changes)
   │
   ▼
Validation + deterministic reducer
   │
   ▼
Project Brain (source of truth)
   ├────────► Current consensus UI
   ├────────► PROJECT.md / AGENTS.md
   └────────► TaskSpec / task.md
```

## Why v0.1 is dependency-free

The canonical product spec originally targeted Next.js + TypeScript + Tailwind + Zod + IndexedDB. During the first implementation pass, the available build environment could not reliably reach the npm registry. Rather than block the product behind dependency installation, v0.1 preserves the important architectural boundaries using browser-native modules and Node's built-in HTTP/fetch APIs.

This is a deliberate delivery trade-off, not a change to the product model:

- Browser app remains a hosted Web App.
- Project Brain logic remains pure and testable.
- AI output remains structured.
- API keys remain server-side.
- Local-first persistence remains the default.
- Artifacts remain deterministic derived views.

The zero-dependency version also makes the GitHub quick start unusually simple: `npm start` is enough on Node 20+.

## Runtime layers

### Browser

`public/app.js` renders the landing page, workspace, interaction cards, artifact previews, and export flow.

### Project Brain

`public/modules/brain.js` owns the current project state and reducer rules. Important invariants include:

- one scope item cannot be active in multiple scope buckets;
- high-impact AI inference cannot silently supersede confirmed truth;
- superseded decisions leave the Current View;
- stable constraints cannot be silently replaced;
- empty change lists are valid for chat-only turns.

### Persistence

The MVP uses browser `localStorage`, because projects are small structured documents and the first product goal is zero-friction local persistence. The repository boundary is isolated so storage can later move to IndexedDB or cloud sync without changing Project Brain semantics.

### Live AI

When `OPENAI_API_KEY` is configured, the Node/serverless adapter sends the compact Project Brain, recent messages, and latest user turn to the OpenAI Responses API with a strict JSON Schema output format.

When no key is present (or the live API is unavailable), the browser automatically falls back to `demo-engine.js`. This keeps the full UX testable without credentials.

### Artifacts

`PROJECT.md`, `AGENTS.md`, task Markdown, and project JSON are generated from state. They are never independent stores of truth.

## Deployment modes

- **Local:** `npm start` → Node built-in static/API server.
- **Static demo:** publish `public/` to GitHub Pages. Demo Brain works; live AI is unavailable.
- **Serverless live AI:** deploy the full repository with server-side environment variables.
