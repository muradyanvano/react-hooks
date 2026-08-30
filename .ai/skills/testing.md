# Testing

- Use Vitest + jsdom + Testing Library (`react`, `user-event`, `jest-dom`).
- Filenames: `name.test.ts`, `name.test.tsx`, `name.type-test.ts` only.
- Do not create fake hook tests before hooks exist.
- Prefer behavior-focused tests; avoid implementation-detail assertions.
- Setup lives in `vitest.setup.ts` (jest-dom matchers).
- Coverage via `npm run test:coverage`.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
