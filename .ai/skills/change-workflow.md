# Change workflow

- Do not commit, push, tag, publish, release, or deploy unless explicitly asked.
- Follow [docs/releasing.md](../../docs/releasing.md) for first-release bootstrap and later releases.
- First `1.0.0` npm publish is interactive (Trusted Publishing requires an existing package page). Later releases publish from GitHub Release → `publish.yml` via OIDC.
- `publish.yml` builds `dist/` (`npm run build:lib`) before `--require-publishable` validation; runners start from a clean checkout and do not commit `dist/`.
- Never add `NPM_TOKEN` / `NODE_AUTH_TOKEN` publish credentials unless explicitly authorized.
- Implement only requested hooks and directly related tests/docs/guidance/Storybook updates.
- Prefer small, reversible config and docs changes over speculative product surface.
- Always update affected documentation and `.ai` skills in the same change when behavior, APIs, tooling, or agent workflow changes. Do not leave README, `docs/public-api.md`, Storybook, CHANGELOG, `AGENTS.md`, or skills stale.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
