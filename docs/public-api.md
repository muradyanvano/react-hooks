# Public API

Status: early prerelease (`0.1.0-beta.1`, unreleased, not published to npm).

## Package entry

```ts
import {
  useOnClickOutside,
  useOnElementRemoval,
  type UseOnClickOutsideEventType,
  type UseOnClickOutsideHandler,
  type UseOnClickOutsideOptions,
  type UseOnElementRemovalHandler,
  type UseOnElementRemovalOptions,
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
- Re-syncs the observed element after React commits when `ref.current` identity changes across renders
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

## Storybook

Interactive documentation lives in Storybook (`npm run storybook`). Stories import the public package entry and are excluded from the npm tarball. Each example provides Show code / Hide code and Copy code for a curated consumer TypeScript snippet. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind. A future GitHub Pages deployment is not configured yet.
