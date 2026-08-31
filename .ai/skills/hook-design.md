# Hook design

Reusable standards for hooks in this package.

- Keep public APIs small and explicit; export types from the root entry only when they are part of the supported surface.
- Stay SSR-safe: no `window` / `document` / `MutationObserver` / browser globals at module evaluation time; attach observers and listeners in effects.
- Stay StrictMode-safe: every subscription must clean up so remounts do not leave duplicate active listeners or observers.
- Prefer a ref for the latest callback so handler identity changes do not force listener/observer churn. Prefer a React 18-compatible latest-handler strategy; do not rely on APIs unavailable in React 18.
- For event listeners, read mutable values such as `ref.current` at event time when that matches the hook’s contract.
- For removal / mutation observers, capture the observed element instance when observation starts. Do not depend on `ref.current` still pointing at a removed node when the observer callback runs.
- Mutable React refs do not trigger renders. After imperative `ref.current` assignment, sync observation from a committed render (compare element identity, then schedule observation). Do not put `ref.current` in an effect dependency array and assume React tracks it.
- Prefer `useEffect` for observer/listener lifecycle and target synchronization. Use `useLayoutEffect` only when synchronous layout measurement or DOM mutation before paint is required. When `useLayoutEffect` is used in a React 18-compatible package, verify React 18 SSR behavior with a packed consumer (`npm run test:ssr:react18`).
- Keyboard listeners should match exact `event.key` values, keep latest filters/handlers without listener churn, resolve default `window` only inside effects, treat explicit `null` targets as “no listen”, and document passive-listener / editable-target limitations honestly.
- Prefer focused local implementation over speculative shared hooks (`useMutationObserver`, `useLatest`, …) until reuse is proven across multiple hooks. Public `useEventListener` exists as its own hook; do not refactor other hooks onto it until a separate, evidence-based phase.
- For typed event listeners: prefer native event-map overloads, keep latest handlers without churn, normalize event-name arrays, resolve default `window` only inside effects, treat explicit `null` as “no listen”, pass native `AddEventListenerOptions` (minus `enabled`), and document that evaluating `document`/`window` as call arguments is the consumer’s SSR responsibility.
- For long-press / pointer gestures: use Pointer Events only (`pointerdown` / `pointermove` / `pointerup` / `pointercancel`); track one active `pointerId`; snapshot delay/threshold/coordinates at pointerdown; attach temporary listeners to `element.ownerDocument`; use owning-window timers/`performance` when available; clear timers and temporary listeners on cancel, blur, disable, target change, and unmount; report maximum Euclidean distance; call `onRelease` only on matching `pointerup` (not cancel/cleanup); keep latest `handler` / `onRelease` without restarting the gesture; do not auto-suppress click; do not treat long press as the sole accessible action path.
- Document honest lifecycle limits: observer hooks are not replacements for React effect cleanup when the observing component itself unmounts.
- Provide runtime behavior tests and compile-time type tests for public hooks.
- Preserve TypeScript generics and reject incorrect element/ref types instead of widening. Prefer `Element` over `HTMLElement` when SVG and other element subtypes are in scope.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
