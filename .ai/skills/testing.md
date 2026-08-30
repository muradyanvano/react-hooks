# Testing

- Use Vitest + jsdom + Testing Library (`react`, `user-event`, `jest-dom`).
- Filenames: `name.test.ts`, `name.test.tsx`, `name.type-test.ts` only.
- Prefer behavior-focused tests; avoid implementation-detail assertions and brittle snapshots.
- Colocate hook runtime tests and type tests next to the hook implementation.
- Type-test files must be typechecked, excluded from `dist`, and omitted from the npm tarball.
- Cover SSR/import safety for hooks that touch browser APIs in effects.
- Setup lives in `vitest.setup.ts` (jest-dom matchers).
- Coverage via `npm run test:coverage`.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
