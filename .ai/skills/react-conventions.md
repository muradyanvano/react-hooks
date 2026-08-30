# React conventions

- React is a `peerDependency` (`^18 || ^19`) and a `devDependency` for local work.
- `react-dom` stays in `devDependencies` only unless a public API truly requires it as a peer.
- Library imports must be SSR-safe: no browser globals at module evaluation time.
- Prefer hooks and utilities that work in React 18 and 19 without ReactDOM coupling.
- Do not invent hook names or APIs until product requirements are provided.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
