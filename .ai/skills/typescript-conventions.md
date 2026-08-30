# TypeScript conventions

- Keep library TypeScript strict: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, unused checks, and fallthrough checks.
- Use modern ESM/`bundler` resolution compatible with Vite.
- JSX: `react-jsx`.
- Declarations are produced by the library build (`vite-plugin-dts` with `bundleTypes` into `dist/index.d.ts`).
- Separate library source config (`tsconfig.lib.json`) from tooling config (`tsconfig.node.json`).
- Do not weaken strictness to silence errors.
- Keep type-test files typechecked and excluded from emit/`dist`.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
