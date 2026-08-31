# Testing

- Use Vitest + jsdom + Testing Library (`react`, `user-event`, `jest-dom`) for unit tests (`--project=unit`).
- Filenames: `name.test.ts`, `name.test.tsx`, `name.type-test.ts` only for package unit/type tests.
- Prefer behavior-focused tests; avoid implementation-detail assertions and brittle snapshots.
- Colocate hook runtime tests and type tests next to the hook implementation.
- Type-test files must be typechecked, excluded from `dist`, and omitted from the npm tarball.
- Cover SSR/import safety for hooks that touch browser APIs in effects, including console warning/error assertions for layout-effect SSR messages when relevant.
- For keyboard hooks, prefer real DOM `KeyboardEvent` dispatch; spy only for registration/cleanup assertions. Assert `event.repeat` / dedupe and filter behavior without arbitrary sleeps.
- For `useEventListener`, cover native inference with type tests (including negative cases), listener option lifecycle (`once`, `signal`, capture/passive), event-name normalization/churn, and SSR omitted-window safety.
- For long-press hooks, use Vitest fake timers deterministically and always restore real timers. Dispatch real `PointerEvent`s with explicit `pointerId` / coordinates. Cover delay normalization, movement cancellation, release metrics, blur/cancel/disable cleanup (no `onRelease`), StrictMode listener/timer uniqueness, and SSR import safety. Storybook browser tests may use short known delays with `waitFor` instead of unexplained arbitrary sleeps.
- For typing-intent hooks, cover default ASCII alphanumeric acceptance/rejection, modifier/repeat/composition filtering, editable focus protection (input/textarea/select/contenteditable/shadow), custom validator and detector freshness without listener churn, enabled lifecycle, StrictMode single active listener, SSR import safety, and focus-activation demos without asserting unreliable synthetic character insertion.
- For media-device hooks, mock `navigator.mediaDevices` deterministically (never request real hardware in unit tests or automated Storybook play flows). Cover support detection, enumeration, grouping, `devicechange`, refresh/permission success and failure, track `stop()` cleanup, async races with deferred promises, enabled lifecycle, automatic `requestPermissions` transitions, and SSR empty unsupported state. Live-hardware Storybook play tests may assert UI only — never click Allow / `ensurePermissions`.
- Storybook interaction and accessibility checks run through `npm run test:storybook` (`--project=storybook`).
- React 18 packed-consumer SSR checks run through `npm run test:ssr:react18` and are part of `verify:ci` (not every unit-test run) because they install React 18 into a temporary directory.
- Setup lives in `vitest.setup.ts` (unit) and `.storybook/vitest.setup.ts` (Storybook).
- Coverage via `npm run test:coverage` covers library source only.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
