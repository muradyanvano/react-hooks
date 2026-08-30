# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.1] - Unreleased

### Added

- Package foundation for `@muradyanvano/react-hooks`
- ESM-only Vite library build with TypeScript declarations
- Strict TypeScript, ESLint, Prettier, and Vitest tooling
- `useOnClickOutside` hook with public types:
  - `UseOnClickOutsideEventType`
  - `UseOnClickOutsideOptions`
  - `UseOnClickOutsideHandler`
- Runtime, type, and SSR coverage for `useOnClickOutside`
- `useOnElementRemoval` hook with public types:
  - `UseOnElementRemovalOptions`
  - `UseOnElementRemovalHandler`
- Runtime, type, and SSR coverage for `useOnElementRemoval`
- React 18 packed-consumer SSR check (`npm run test:ssr:react18`) integrated into `verify:ci`
- Public API notes in `docs/public-api.md`
- Storybook documentation environment (local only; not deployed):
  - Introduction and Getting Started pages
  - Interactive `useOnClickOutside` and `useOnElementRemoval` examples, Controls, and Actions
  - Accessibility addon checks and browser interaction tests
  - Tailwind CSS v4 styling limited to Storybook
  - Shared example showcase with Show/Hide code, Copy code, and Shiki TSX highlighting (`github-light-high-contrast`)
  - MDX pages use relative Storybook manager links (`target="_top"`) so docs navigation does not 404 in the iframe
