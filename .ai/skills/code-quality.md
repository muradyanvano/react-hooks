# Code quality

- Keep ESLint and Prettier enabled; do not disable important rules globally without documenting why in the PR or skill update.
- `*.type-test.ts` / `*.type-test.tsx` may turn off `react-hooks/rules-of-hooks` only — those files assert call signatures and are not executed as components.
- Do not relax `@typescript-eslint/no-unused-vars` for type tests. Prefer `expectTypeOf` assertions for inferred callback parameters, or `void event` in `@ts-expect-error` negative cases (same pattern as existing type tests).
- Prefer fixing root causes over weakening `strict`, lint, tests, coverage, or package allowlists.
- Run `npm run verify` before considering foundation or library changes complete.
- Use `npm run validate:release` when changing package metadata, publish allowlists, or GitHub Actions release/publish workflows.
- Never introduce `any` in library or test source.
- Ignore `dist` and `coverage` for lint and format.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
