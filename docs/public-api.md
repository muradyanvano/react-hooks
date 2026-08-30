# Public API

Status: early prerelease (`0.1.0-beta.1`, unreleased, not published to npm).

## Package entry

```ts
import {
  useOnClickOutside,
  useOnElementRemoval,
  useOnKeyStroke,
  useEventListener,
  type UseOnClickOutsideEventType,
  type UseOnClickOutsideHandler,
  type UseOnClickOutsideOptions,
  type UseOnElementRemovalHandler,
  type UseOnElementRemovalOptions,
  type KeyStrokeEventType,
  type KeyStrokeFilter,
  type KeyStrokePredicate,
  type KeyStrokeTarget,
  type UseOnKeyStrokeHandler,
  type UseOnKeyStrokeOptions,
  type UseEventListenerHandler,
  type UseEventListenerOptions,
  type UseEventListenerTarget,
} from '@muradyanvano/react-hooks'
```

Root entry only. No public subpath exports. No default export.

## `useOnClickOutside`

### Signature

```ts
function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: UseOnClickOutsideHandler,
  options?: UseOnClickOutsideOptions,
): void
```

### Generic parameter

- `T extends HTMLElement` — element type held by the ref (`HTMLDivElement`, `HTMLButtonElement`, …).

### Arguments

1. `ref` — React ref to the target element. May be `null` until mount.
2. `handler` — called with the original `PointerEvent` or `MouseEvent`.
3. `options` — optional configuration.

### Return type

`void`

### Defaults

```ts
{
  enabled: true,
  eventType: 'pointerdown',
  capture: true,
}
```

### Behavior

- Listens on `document`
- Invokes `handler` for events whose target is outside the referenced element
- Skips events on the element or its descendants
- Skips non-`Node` targets and disconnected nodes
- Reads `ref.current` at event time
- Keeps the latest handler without re-subscribing solely for handler identity changes
- Re-subscribes when `enabled`, `eventType`, or `capture` change
- Removes the listener on cleanup / unmount

### Exported types

- `UseOnClickOutsideEventType`
- `UseOnClickOutsideOptions`
- `UseOnClickOutsideHandler`

### SSR

Safe to import and call during server rendering. Listeners are effect-only.

### Limitations

- One ref (no arrays)
- No ignore lists / selectors
- No iframe helpers
- Not a complete Shadow DOM surface

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useOnElementRemoval`

### Signature

```ts
function useOnElementRemoval<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnElementRemovalHandler<T>,
  options?: UseOnElementRemovalOptions,
): void
```

### Generic parameter

- `T extends Element` — element type held by the ref (`HTMLDivElement`, `SVGSVGElement`, …). Not limited to `HTMLElement`.

### Arguments

1. `ref` — React ref to the target element. May be `null` until mount.
2. `handler` — called once with the removed element instance.
3. `options` — optional configuration.

### Return type

`void`

### Defaults

```ts
{
  enabled: true,
}
```

### Behavior

- Uses `MutationObserver` on the target’s owning document with `{ childList: true, subtree: true }`
- Detects direct removal and ancestor removal that contains the target
- Captures the observed element instance so the handler still receives it if `ref.current` is cleared
- Invokes the latest handler once, then disconnects
- Does not recreate the observer solely because handler identity changes
- Re-syncs the observed element after React commits when `ref.current` identity changes across renders (effect-based sync; does not use `useLayoutEffect`)
- Disconnects on cleanup, disable, detection, and unmount
- Skips already-disconnected targets at setup

### Exported types

- `UseOnElementRemovalOptions`
- `UseOnElementRemovalHandler`

### SSR

Safe to import and call during server rendering. Observers are effect-only. No browser globals are read at module evaluation time.

### Lifecycle limitation

Not a replacement for React effect cleanup. When the observing component unmounts, React may disconnect the observer before an asynchronous mutation callback runs. Prefer this hook for external/imperative removals, or observation from a still-mounted component.

### Limitations

- One ref (no arrays)
- No ignore lists
- No public observer abstraction
- Imperative `ref.current` assignment after mount requires a subsequent React commit for observation sync

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useOnKeyStroke`

### Signature

```ts
function useOnKeyStroke(
  key: KeyStrokeFilter,
  handler: UseOnKeyStrokeHandler,
  options?: UseOnKeyStrokeOptions,
): void
```

### Arguments

1. `key` — `true`, exact `event.key` string, readonly string array, or predicate.
2. `handler` — receives the original `KeyboardEvent`.
3. `options` — optional configuration.

### Return type

`void`

### Defaults

```ts
{
  enabled: true,
  eventType: 'keydown',
  target: window, // resolved inside effects when omitted
  dedupe: false,
  capture: false,
  passive: false,
}
```

### Behavior

- Exact, case-sensitive `event.key` matching
- `true` matches every valid keyboard event
- Predicates support modifiers; combination strings are not parsed
- `dedupe: true` ignores `event.repeat` before filter evaluation
- Omitted `target` defaults to `window`; explicit `null` registers nothing
- Ref targets sync after React commits via `useEffect`
- Latest handler/filter/dedupe without listener churn
- Re-registers when `enabled`, resolved target, `eventType`, `capture`, or `passive` change
- Validates keyboard-event shape via string `key` (no realm `KeyboardEvent` constructor)
- Detects usable targets via `addEventListener` / `removeEventListener` capability

### Exported types

- `KeyStrokeEventType`
- `KeyStrokeFilter`
- `KeyStrokePredicate`
- `KeyStrokeTarget`
- `UseOnKeyStrokeHandler`
- `UseOnKeyStrokeOptions`

### SSR

Safe to import and call during server rendering. Listeners are effect-only. No browser globals at module evaluation. No `useLayoutEffect`.

### Limitations

- No combination-string parser
- No automatic editable-target filtering
- Imperative target-ref assignment requires a later React commit
- `passive: true` means consumers must not rely on `preventDefault()`

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useEventListener`

### Call forms

```ts
// Default window target
function useEventListener<K extends keyof WindowEventMap>(
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<WindowEventMap[K]>,
  options?: UseEventListenerOptions,
): void

// Explicit target (Window / Document / HTMLElement / SVGElement /
// MediaQueryList / EventTarget / RefObject / null) with matching event maps
function useEventListener(
  target: UseEventListenerTarget | null,
  eventName: string | readonly string[],
  handler: UseEventListenerHandler,
  options?: UseEventListenerOptions,
): void
```

Overloads provide native event-map inference. Custom events use a typed handler annotation (or a window-form generic for non-`WindowEventMap` names).

### Return type

`void`

### Defaults

```ts
{
  enabled: true,
  capture: false,
  passive: false,
  once: false,
  // signal: absent
}
```

### Behavior

- Omitted target → `window` inside effects; explicit `null` → no listen
- Ref targets sync after React commits via `useEffect`
- Latest handler without registration churn
- Event-name arrays dedupe by first occurrence; equivalent contents avoid churn
- Re-registers when resolved target, names, `enabled`, `capture`, `passive`, `once`, or `signal` change
- `enabled` is not passed to `addEventListener`
- `once` applies independently per registered name
- Capability-based target detection (no `instanceof EventTarget`)

### Exported types

- `UseEventListenerTarget`
- `UseEventListenerHandler`
- `UseEventListenerOptions`

### SSR

Omitted-window form is SSR-safe to call. Evaluating `document`/`window` as a call argument is the consumer’s responsibility and is not intrinsically SSR-safe. Prefer refs or client-only boundaries for explicit browser globals.

### Limitations

- Single target per call
- No manual cleanup return value
- Mixed native+custom names in one array are not a supported inference path — prefer separate calls

### Stability

Unreleased beta API. May change before `0.1.0`.

## Storybook

Interactive documentation lives in Storybook (`npm run storybook`). Stories import the public package entry and are excluded from the npm tarball. Each example provides Show code / Hide code and Copy code for a curated consumer TypeScript snippet. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind. A future GitHub Pages deployment is not configured yet.
