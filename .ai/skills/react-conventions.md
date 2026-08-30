# React conventions

- React is a `peerDependency` (`^18 || ^19`) and a `devDependency` for local work.
- `react-dom` stays in `devDependencies` only unless a public API truly requires it as a peer.
- Library imports must be SSR-safe: no browser globals at module evaluation time.
- Prefer hooks and utilities that work in React 18 and 19 without ReactDOM coupling.
- Use a React 18-compatible latest-handler strategy. Do not rely on `useEffectEvent` while React 18 remains in the peer range.
- Prefer `useEffect` for subscriptions and observer setup. Avoid `useLayoutEffect` unless before-paint work is required; React 18 emits an SSR warning when server-rendering components that call it. Keyboard listeners should use `useEffect`, not `useLayoutEffect`.
- Resolve browser constructors such as `MutationObserver` from the target’s owning window inside effects, with guards for missing `defaultView` or missing constructors. Resolve default `window` targets inside effects only; never at module scope.
- Detect usable `EventTarget`s via `addEventListener` / `removeEventListener` capability rather than `instanceof EventTarget`. Validate keyboard events by shape (`typeof key === 'string'`) rather than the realm’s `KeyboardEvent` constructor.
- Keep the main development install on the current React major. Validate React 18 SSR via the packed-consumer script (`npm run test:ssr:react18`) rather than downgrading the workspace.
- Implement hooks only when product requirements define them; follow `hook-design.md`.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
