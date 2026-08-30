# Hook design

Reusable standards for hooks in this package.

- Keep public APIs small and explicit; export types from the root entry only when they are part of the supported surface.
- Stay SSR-safe: no `window` / `document` / browser globals at module evaluation time; attach listeners in effects.
- Stay StrictMode-safe: every subscription must clean up so remounts do not leave duplicate active listeners.
- Prefer a ref for the latest callback so handler identity changes do not force listener churn.
- Read mutable values such as `ref.current` at event time, not once when the effect starts.
- Prefer focused local implementation over speculative shared hooks (`useEventListener`, `useLatest`, …) until reuse is proven.
- Provide runtime behavior tests and compile-time type tests for public hooks.
- Preserve TypeScript generics and reject incorrect element/ref types instead of widening.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
