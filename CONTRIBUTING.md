# Contributing to Say2Build

Thanks for helping make Vibe Coding less chaotic without making it rigid.

## Before opening a PR

1. Keep the change aligned with the product guardrails in `AGENTS.md`.
2. Avoid turning the UI into an enterprise project-management dashboard.
3. Keep Project Brain mutations deterministic and testable.
4. Run:

```bash
npm run check
```

## Good first contributions

- Additional reducer edge-case tests.
- Better behavioral eval fixtures.
- Accessibility and keyboard improvements.
- Cleaner artifact rendering.
- Language/localization improvements that preserve plain-language UX.

## Product changes

For a new core concept, explain which user problem it solves and why it belongs in the Project Brain rather than the coding-agent execution layer.
