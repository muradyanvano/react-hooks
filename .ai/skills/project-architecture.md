# Project architecture

- This repository is an ESM-only React hooks library package (`@muradyanvano/react-hooks`), not an application.
- Public surface starts at `src/index.ts` and builds to `dist/index.js` + `dist/index.d.ts`.
- Hook implementations live under `src/hooks/<hookName>/` with colocated runtime and type tests.
- Keep React externalized; never bundle `react`, `react-dom`, or JSX runtimes.
- Publish allowlist is controlled by `package.json` `files`; do not ship `.ai`, `docs` (unless explicitly added), tests, coverage, source, demos, or tooling configs in the tarball.
- Keep `"private": true` until publishing is explicitly authorized.
- Do not add Storybook, docs sites, Changesets, GitHub Actions, or publishing automation unless requested.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
