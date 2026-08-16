# Say2Build — Product brief

## One-line definition

**Say2Build is a lightweight Web Project Brain for beginner AI builders.** A user can keep thinking and changing direction in normal language while Say2Build maintains the project's current truth, surfaces real conflicts, and turns the next step into a focused task for Codex, Claude Code, Cursor, or another coding agent.

## Why it exists

AI coding agents make implementation faster, but beginners often lack the invisible planning habits experienced builders rely on. They start coding immediately, make decisions across long conversations, change their mind, and eventually lose track of what is currently true.

Say2Build adds **just enough structure** without demanding a formal PRD or a rigid software-development process.

## Core principles

- **Build freely. Don't let the project forget.**
- Vague ideas are valid input.
- Ask less, think more.
- Low-risk choices can be inferred; high-impact conflicts deserve user choice.
- Chat history is not project truth.
- Persist the minimum sufficient project memory.
- A mentioned idea is not automatically MVP scope.
- Old decisions should be superseded, not silently stacked.
- Always keep a concrete next action.
- Stop planning when the project is clear enough to build.

## MVP user loop

1. User starts with a rough idea.
2. Say2Build interprets it and makes low-risk assumptions.
3. It asks only the few questions that can change product shape, with a recommendation.
4. Durable information is applied to the Project Brain.
5. The user keeps chatting, revising, or parking ideas.
6. Real conflicts are surfaced in plain language.
7. When the project is clear enough, Say2Build generates a focused build task.
8. The user copies or downloads that task for a coding agent.

## P0 capabilities

- Create a Project Brain from a vague idea.
- Lightweight clarification with recommendations.
- Persistent local Current Project Brain.
- Delta-based updates and deterministic reducer.
- Decision / constraint / later-idea separation.
- Conflict handling and supersession.
- Current consensus + one Next Action.
- Undo last Project Brain update.
- Generate `PROJECT.md` and task Markdown.
- Export / import machine-restorable project JSON.
- No-key demo mode plus optional live AI.
- Fixed behavioral eval fixtures.

## Non-goals

The MVP is intentionally **not** a coding IDE, terminal, repository browser, Jira replacement, multi-agent orchestration system, or automatic code executor.
