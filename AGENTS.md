# Agent instructions

Operational guidance for coding agents working in `@muradyanvano/react-hooks`.

## Project

Early prerelease ESM-only React hooks library (`0.1.0-beta.1`). Not published to npm yet (`private: true`). React peer range: `^18.0.0 || ^19.0.0`.

Public entry: `src/index.ts` → `dist/index.js` + `dist/index.d.ts`.

Current hooks:

- `useOnClickOutside`
- `useOnElementRemoval`
- `useOnKeyStroke`
- `useEventListener`
- `useOnLongPress`
- `useOnStartTyping`
- `useDevicesList`
- `useDisplayMedia`
- `useElementByPoint`
- `useElementHover`
- `useFocus`
- `useFocusWithin`
- `useInfiniteScroll`
- `useMouse`
- `useMousePressed`
- `useParallax`
- `useScroll`
- `useScrollLock`
- `useUserMedia`
- `useWebSocket`
- `useLocalStorage`
- `useSessionStorage`
- `useCookies`
- `useJwt`
- `useNProgress`
- `useQRCode`
- `useFavicon`
- `useEyeDropper`
- `useFullscreen`
- `useUrlSearchParams`
- `usePageLeave`
- `useTextSelection`
- `useBase64`
- `useDebounceFn`
- `useEventBus`

Do not invent hooks, APIs, or product behavior before they are specified.

## Keep docs and skills in sync

Whenever a change affects behavior, APIs, tooling, or agent workflow, update the related documentation and `.ai` skills in the **same change** — do not leave them stale.

| When you change…                                    | Also update…                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Public hook behavior or types                       | `README.md`, `docs/public-api.md`, related Storybook stories/snippets, `CHANGELOG.md` |
| Architecture, build, exports, or tooling boundaries | `.ai/skills/project-architecture.md`, `AGENTS.md` if the overview is affected         |
| TypeScript or React conventions                     | `.ai/skills/typescript-conventions.md`, `.ai/skills/react-conventions.md`             |
| Hook design patterns or contracts                   | `.ai/skills/hook-design.md`                                                           |
| Storybook docs or examples                          | `.ai/skills/storybook.md`                                                             |
| Tests, coverage, or Vitest setup                    | `.ai/skills/testing.md`                                                               |
| Lint, format, or verify scripts                     | `.ai/skills/code-quality.md`                                                          |
| Commits, releases, or publishing policy             | `.ai/skills/change-workflow.md`                                                       |
| Agent entry points or skill index                   | `AGENTS.md`, `.ai/README.md`                                                          |

If instructions in a skill no longer match the repo, fix the skill before finishing the task.

## Task skills

Read only the skills relevant to the current task. Detailed rules live under `.ai/skills/`:

| Skill                                                             | Read when                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| [project-architecture.md](.ai/skills/project-architecture.md)     | Package layout, build output, exports, tooling boundaries |
| [typescript-conventions.md](.ai/skills/typescript-conventions.md) | TypeScript configs or library/source types                |
| [react-conventions.md](.ai/skills/react-conventions.md)           | React-facing code, peers, JSX policy                      |
| [hook-design.md](.ai/skills/hook-design.md)                       | Implementing or changing hooks and public contracts       |
| [storybook.md](.ai/skills/storybook.md)                           | Storybook docs, stories, Storybook tooling                |
| [testing.md](.ai/skills/testing.md)                               | Tests, coverage, Vitest configuration                     |
| [code-quality.md](.ai/skills/code-quality.md)                     | Lint, format, verification scripts                        |
| [change-workflow.md](.ai/skills/change-workflow.md)               | Commits, releases, publishing, deferred work              |

## Layout

```
src/
├── index.ts                 # Public barrel export
├── hooks/<hookName>/        # Hook impl + colocated tests
└── stories/                 # Storybook (dev-only, not in tarball)
    └── docs/                # HOOK_CATALOG + HookDocumentationPage (Storybook-only)

.storybook/                  # Storybook config
docs/public-api.md           # Formal API reference
.ai/skills/                  # Task-specific agent guidance
```

Hook implementations: `src/hooks/<hookName>/<hookName>.ts` with `.test.tsx` and `.type-test.ts` beside them.

## Core constraints

- **SSR-safe imports** — no `window`, `document`, `MutationObserver`, or other browser globals at module evaluation time.
- **StrictMode-safe effects** — every listener/observer cleans up on unmount; no duplicate active subscriptions.
- **React externalized** — never bundle `react`, `react-dom`, or JSX runtimes.
- **Small public surface** — export types from `src/index.ts` only when part of the supported API.
- **React 18 compatible** — use a ref-based latest-handler strategy; do not rely on `useEffectEvent` or other React 19-only APIs.
- **Focused implementations** — do not refactor existing hooks onto `useEventListener` unless explicitly requested.
- **Publish allowlist** — only `dist/`, `LICENSE`, `README.md`, `CHANGELOG.md` ship in the tarball. Never ship `.ai`, Storybook, Tailwind, tests, or tooling configs.

## Verification

```bash
npm install
npm run verify          # format, typecheck, lint, unit tests, lib build, Storybook build
npm run verify:ci       # verify + Storybook browser tests + React 18 SSR consumer check
```

Useful focused commands:

| Script                     | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `npm run storybook`        | Local Storybook docs                       |
| `npm test`                 | Unit tests (Vitest, jsdom)                 |
| `npm run test:storybook`   | Storybook interaction/a11y checks          |
| `npm run test:ssr:react18` | Packed-consumer SSR check against React 18 |
| `npm run build:lib`        | ESM library + declarations                 |
| `npm run pack:dry-run`     | Inspect future publish tarball             |

Run `npm run verify` before considering foundation or library changes complete.

## Change rules

- Implement only requested hooks and directly related tests, docs, guidance, and Storybook updates.
- **Always** update affected documentation and `.ai` skills when the change makes them inaccurate or incomplete (see [Keep docs and skills in sync](#keep-docs-and-skills-in-sync)).
- Do not commit, push, tag, publish, release, or deploy unless explicitly asked.
- Keep `private: true` until publishing is authorized.
- Do not add docs-site deployment, Changesets, or publishing automation unless requested.

## References

- [README.md](README.md) — consumer-facing hook documentation
- [docs/public-api.md](docs/public-api.md) — formal API reference
- [CHANGELOG.md](CHANGELOG.md) — release history
