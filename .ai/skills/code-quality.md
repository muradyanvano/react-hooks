# Code quality

- Keep ESLint and Prettier enabled; do not disable important rules globally without documenting why in the PR or skill update.
- Prefer fixing root causes over weakening `strict`, lint, tests, coverage, or package allowlists.
- Run `npm run verify` before considering foundation or library changes complete.
- Never introduce `any` in library or test source.
- Ignore `dist` and `coverage` for lint and format.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
