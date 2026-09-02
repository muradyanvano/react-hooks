# React conventions

- React is a `peerDependency` (`^18 || ^19`) and a `devDependency` for local work.
- `react-dom` stays in `devDependencies` only unless a public API truly requires it as a peer.
- Library imports must be SSR-safe: no browser globals at module evaluation time.
- Prefer hooks and utilities that work in React 18 and 19 without ReactDOM coupling.
- Use a React 18-compatible latest-handler strategy. Do not rely on `useEffectEvent` while React 18 remains in the peer range.
- Prefer `useEffect` for subscriptions and observer setup. Avoid `useLayoutEffect` unless before-paint work is required; React 18 emits an SSR warning when server-rendering components that call it. Keyboard and generic event listeners should use `useEffect`, not `useLayoutEffect`.
- Resolve browser constructors such as `MutationObserver` from the target’s owning window inside effects, with guards for missing `defaultView` or missing constructors. Resolve default `window` targets inside effects only; never at module scope. Consumers who pass `document`/`window` as arguments evaluate those globals themselves.
- Detect usable `EventTarget`s via `addEventListener` / `removeEventListener` capability rather than `instanceof EventTarget`. Validate keyboard events by shape (`typeof key === 'string'`) rather than the realm’s `KeyboardEvent` constructor. Prefer capability checks over realm-specific `instanceof Element` / `PointerEvent` when crossing documents/windows.
- For editable-element detection, prefer owning-window form-control constructors, then walk ancestors using contentEditable IDL/attribute state (including open shadow roots via `shadowRoot.activeElement`). Do not rely solely on tag-name strings when constructors are available. Nested `contenteditable="false"` stops inheritance.
- For media-device capability detection, read `navigator.mediaDevices` only inside render/effects with `typeof navigator` guards — never at module scope. Treat `enumerateDevices` and `getUserMedia` as independent capabilities.
- For screen-capture capability detection (`getDisplayMedia`), check `navigator.mediaDevices` and `typeof getDisplayMedia === 'function'` inside render/effects only, never at module scope, since support varies by browser and can be revoked by permissions policy after load.
- For an optional custom-`document` capability (`useElementByPoint`), distinguish an omitted option (fall back to the global `document`, resolved inside effects/callbacks only, never at module scope) from an explicit `document: null` (treat as "no usable document" rather than falling back). Detect `elementFromPoint` / `elementsFromPoint` support via capability checks (`typeof doc.elementFromPoint === 'function'`) on whichever document is resolved, not only the global one, since a caller-supplied `Document` (for example an iframe's `contentDocument`) may have different capabilities or may not be ready yet.
- Hover-tracking hooks (`useElementHover`) return a boolean from native target-bound `mouseenter`/`mouseleave` only; do not map keyboard focus or touch to hover state in the hook itself.
- Direct-focus hooks (`useFocus`) return `{ focused, focus, blur }` from native target-bound `focus`/`blur` and `ownerDocument.activeElement`; do not treat descendant focus as direct focus. Focus-within semantics belong in `useFocusWithin`.
- Infinite-scroll hooks (`useInfiniteScroll`) measure scroll metrics and schedule post-load frames through the target’s owning window; resolve `ResizeObserver` from that window when available; never touch browser globals at module scope.
- Mouse-coordinate hooks (`useMouse`) resolve omitted `window` targets and owning-window scroll offsets inside effects only; detect mouse/touch events by shape rather than realm-specific constructors when crossing documents; never touch `MouseEvent` / `TouchEvent` / DOM globals at module scope.
- Mouse-pressed hooks (`useMousePressed`) attach temporary release listeners to the target’s owning window only while a lifecycle is active; reuse existing `UseMouseSourceType`; never touch browser globals at module scope.
- For pointer gestures, attach temporary listeners to the target’s `ownerDocument` and use that document’s `defaultView` for timers, `performance`, and blur cancellation when available.
- Keep the main development install on the current React major. Validate React 18 SSR via the packed-consumer script (`npm run test:ssr:react18`) rather than downgrading the workspace.
- Implement hooks only when product requirements define them; follow `hook-design.md`.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
