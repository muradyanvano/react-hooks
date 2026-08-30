# React conventions

- React is a `peerDependency` (`^18 || ^19`) and a `devDependency` for local work.
- `react-dom` stays in `devDependencies` only unless a public API truly requires it as a peer.
- Library imports must be SSR-safe: no browser globals at module evaluation time.
- Prefer hooks and utilities that work in React 18 and 19 without ReactDOM coupling.
- Use a React 18-compatible latest-handler strategy (ref updated during render). Do not rely on `useEffectEvent` while React 18 remains in the peer range.
- Resolve browser constructors such as `MutationObserver` from the target’s owning window inside effects, with guards for missing `defaultView` or missing constructors.
- Implement hooks only when product requirements define them; follow `hook-design.md`.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
