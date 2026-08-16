# AGENTS.md

## Project intent
Say2Build is a lightweight Project Brain for beginner AI builders. It helps a user think in natural language while preserving the project's current truth and producing one focused next task for a coding agent.

## Product guardrails
- Keep the conversation natural; do not turn the product into a PRD form.
- Ask only when an ambiguity materially changes product shape.
- Low-risk, reversible choices should be handled without repeated confirmation.
- Persist durable project truth, not every sentence from the chat.
- A casual idea is not confirmed scope.
- When a confirmed direction changes, supersede the old truth instead of keeping contradictory active decisions.
- Always keep one concrete next action.
- Do not turn Say2Build into a coding IDE, terminal, repository browser, or multi-agent runner.
- Prefer plain language; introduce professional terms only when they help the user learn while building.

## Repository guide
- `public/` — dependency-free browser app and deterministic Project Brain logic.
- `public/modules/brain.js` — Project Brain state, validation, reducer, and consensus helpers.
- `public/modules/artifacts.js` — deterministic PROJECT.md / AGENTS.md / task.md renderers.
- `public/modules/demo-engine.js` — no-key demo behavior.
- `server/` — optional live-AI adapters using the OpenAI Responses API.
- `api/` — serverless HTTP wrappers.
- `tests/` — Node built-in unit tests.
- `evals/` — behavioral evaluation fixtures.
- `docs/` — product and architecture documentation.

## Commands
```bash
npm start
npm test
npm run check
```

There are intentionally no runtime npm dependencies in v0.1.

## Stable engineering rules
- Project Brain state is the source of truth; Markdown artifacts are derived views.
- AI proposes incremental changes; deterministic code applies and validates them.
- Keep pure Project Brain logic outside UI components and HTTP handlers.
- Never expose `OPENAI_API_KEY` to browser JavaScript.
- Preserve demo mode when live AI is unavailable.
- Prefer deterministic rendering over another model call when the output can be generated from state.

## Verification expectations
Before finishing a change:
1. Run `npm run check`.
2. For UI changes, load the landing page and one seeded workspace at desktop width.
3. Verify local persistence and at least one export path for state-affecting changes.
4. Report what changed, files changed, verification performed, and anything unresolved.
