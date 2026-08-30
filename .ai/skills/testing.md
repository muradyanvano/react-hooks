# Testing

- Use Vitest + jsdom + Testing Library (`react`, `user-event`, `jest-dom`) for unit tests (`--project=unit`).
- Filenames: `name.test.ts`, `name.test.tsx`, `name.type-test.ts` only for package unit/type tests.
- Prefer behavior-focused tests; avoid implementation-detail assertions and brittle snapshots.
- Colocate hook runtime tests and type tests next to the hook implementation.
- Type-test files must be typechecked, excluded from `dist`, and omitted from the npm tarball.
- Cover SSR/import safety for hooks that touch browser APIs in effects, including console warning/error assertions for layout-effect SSR messages when relevant.
- For keyboard hooks, prefer real DOM `KeyboardEvent` dispatch; spy only for registration/cleanup assertions. Assert `event.repeat` / dedupe and filter behavior without arbitrary sleeps.
- For `useEventListener`, cover native inference with type tests (including negative cases), listener option lifecycle (`once`, `signal`, capture/passive), event-name normalization/churn, and SSR omitted-window safety.
- Storybook interaction and accessibility checks run through `npm run test:storybook` (`--project=storybook`).
- React 18 packed-consumer SSR checks run through `npm run test:ssr:react18` and are part of `verify:ci` (not every unit-test run) because they install React 18 into a temporary directory.
- Setup lives in `vitest.setup.ts` (unit) and `.storybook/vitest.setup.ts` (Storybook).
- Coverage via `npm run test:coverage` covers library source only.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
