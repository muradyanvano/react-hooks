# Testing

- Use Vitest + jsdom + Testing Library (`react`, `user-event`, `jest-dom`) for unit tests (`--project=unit`).
- Filenames: `name.test.ts`, `name.test.tsx`, `name.type-test.ts` only for package unit/type tests.
- Prefer behavior-focused tests; avoid implementation-detail assertions and brittle snapshots.
- Colocate hook runtime tests and type tests next to the hook implementation.
- Type-test files must be typechecked, excluded from `dist`, and omitted from the npm tarball.
- Cover SSR/import safety for hooks that touch browser APIs in effects.
- Storybook interaction and accessibility checks run through `npm run test:storybook` (`--project=storybook`).
- Setup lives in `vitest.setup.ts` (unit) and `.storybook/vitest.setup.ts` (Storybook).
- Coverage via `npm run test:coverage` covers library source only.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
