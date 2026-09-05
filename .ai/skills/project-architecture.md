# Project architecture

- This repository is an ESM-only React hooks library package (`@muradyanvano/react-hooks`), not an application.
- Public surface starts at `src/index.ts` and builds to `dist/index.js` + `dist/index.d.ts`.
- Hook implementations live under `src/hooks/<hookName>/` with colocated runtime and type tests.
- Shared private helpers may live under `src/hooks/<sharedName>/` when multiple public hooks reuse one engine (for example `browserStorage` for `useLocalStorage` / `useSessionStorage`). Keep shared engines private — do not export them from `src/index.ts` or add package subpaths.
- Storybook lives under `.storybook/` and `src/stories/`; it documents public behavior and stays outside the npm tarball. Hosted docs deploy from `storybook-static` via `.github/workflows/pages.yml` to `https://muradyanvano1995.github.io/react-hooks/` using `STORYBOOK_BASE_PATH=/react-hooks/` (do not change the library Vite `base` for Pages).
- Keep React externalized; never bundle `react`, `react-dom`, or JSX runtimes.
- Externalize intentional runtime dependencies such as `qrcode` (used by `useQRCode`) so Node/browser resolution and tree-shaking remain correct; do not inline Node-specific encoder internals into the library bundle.
- Publish allowlist is controlled by `package.json` `files`; do not ship `.ai`, Storybook, Tailwind Storybook CSS, tests, coverage, source, demos, or tooling configs in the tarball.
- CI lives in `.github/workflows/` (`ci.yml`, `layout-audit.yml`, `pages.yml`, `publish.yml`). npm publish uses Trusted Publishing (OIDC) — no `NPM_TOKEN`. Browser jobs install Playwright Chromium after `npm ci`.
- Do not add Changesets, semantic-release, Release Please, or other release frameworks unless requested.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
