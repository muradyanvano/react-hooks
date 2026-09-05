# Contributing

Related: [Getting started](./getting-started.md) · [Releasing](./releasing.md) · [AGENTS.md](../AGENTS.md)

## Setup

```bash
npm install
npm run verify
```

Node must satisfy `engines.node` (`^20.19.0 || >=22.12.0`). The repository pins `packageManager` to `npm@11.8.0`.

## Useful scripts

| Script                     | Purpose                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run storybook`        | Local Storybook                                                                                       |
| `npm run build:storybook`  | Static Storybook build                                                                                |
| `npm run test:storybook`   | Storybook browser interaction/a11y checks                                                             |
| `npm run test:layout`      | Multi-viewport Storybook layout audit (slow)                                                          |
| `npm run test:reset`       | Reset-after-play browser audit                                                                        |
| `npm run test:ssr:react18` | Packed-consumer SSR check against React 18                                                            |
| `npm run build:lib`        | ESM library + declarations                                                                            |
| `npm run pack:dry-run`     | Inspect publish tarball                                                                               |
| `npm run verify`           | Format, typecheck, lint, unit tests, lib + Storybook builds                                           |
| `npm run verify:ci`        | `verify` + Storybook browser tests + React 18 SSR                                                     |
| `npm run validate:release` | Package metadata / allowlist / workflow safety checks (add `--require-publishable` after `build:lib`) |

## Guidelines

- Do not change public hook APIs or runtime behavior unless that is the explicit goal of the change.
- Keep React and intentional runtime dependencies (`qrcode`) externalized from the library bundle.
- Do not ship Storybook, Tailwind Storybook CSS, tests, mocks, or tooling configs in the npm tarball (`files` allowlist).
- Update `README.md`, `docs/public-api.md`, Storybook, `CHANGELOG.md`, and `.ai` skills when behavior or agent workflow changes.
- Do not commit, push, tag, publish, release, or deploy unless asked.

## Pull requests

Ordinary PRs run `.github/workflows/ci.yml`. The long multi-viewport layout audit runs on a separate scheduled / manual workflow.
