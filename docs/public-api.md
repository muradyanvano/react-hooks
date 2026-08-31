# Public API

Status: early prerelease (`0.1.0-beta.1`, unreleased, not published to npm).

## Package entry

```ts
import {
  useOnClickOutside,
  useOnElementRemoval,
  useOnKeyStroke,
  useEventListener,
  useOnLongPress,
  useOnStartTyping,
  useDevicesList,
  useDisplayMedia,
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
  type UseOnLongPressDelay,
  type UseOnLongPressHandler,
  type UseOnLongPressOptions,
  type UseOnLongPressReleaseDetails,
  type UseOnLongPressReleaseHandler,
  type UseOnStartTypingCharacterValidator,
  type UseOnStartTypingEditableDetector,
  type UseOnStartTypingHandler,
  type UseOnStartTypingOptions,
  type UseDevicesListUpdatedHandler,
  type UseDevicesListOptions,
  type UseDevicesListReturn,
  type UseDisplayMediaOptions,
  type UseDisplayMediaReturn,
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

## `useOnLongPress`

### Signature

```ts
function useOnLongPress<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnLongPressHandler,
  options?: UseOnLongPressOptions<T>,
): void
```

### Generic parameter

- `T extends Element` — element type held by the ref (`HTMLButtonElement`, `SVGSVGElement`, …).

### Arguments

1. `ref` — React ref to the target element. May be `null` until mount.
2. `handler` — called once with the original `pointerdown` `PointerEvent` after the delay.
3. `options` — optional configuration.

### Return type

`void`

### Defaults

```ts
{
  enabled: true,
  delay: 500,
  distanceThreshold: 10,
  button: 0,
  self: false,
  preventDefault: false,
  stopPropagation: false,
  capture: false,
  // onRelease: absent
}
```

### Behavior

- Pointer Events only (`pointerdown` / `pointermove` / `pointerup` / `pointercancel`)
- Starts on matching `event.button`; tracks one active pointer ID
- Attaches temporary move/up/cancel listeners to `element.ownerDocument`
- Cancels pending activation on excessive movement, blur, disable, target change, unmount, or `pointercancel`
- Snapshots delay and distance threshold at pointerdown; uses latest `handler` / `onRelease` when invoked
- `onRelease` runs on matching `pointerup` only (not cancel/cleanup paths)
- Imperative `ref.current` updates need a later React commit to sync

### Delay / threshold normalization

- Delay: finite ≥ 0 used; negative → `0`; non-finite → `500`
- Threshold: finite ≥ 0 used; negative → `0`; non-finite → `10`; `false` disables cancellation

### Exported types

- `UseOnLongPressDelay`
- `UseOnLongPressHandler`
- `UseOnLongPressOptions`
- `UseOnLongPressReleaseDetails`
- `UseOnLongPressReleaseHandler`

### SSR

Import-safe and effect-only. No listeners or timers during server rendering. No `useLayoutEffect`.

### Limitations

- No mouse/touch fallback listeners or Pointer Events polyfill
- No automatic click suppression
- No keyboard long-press
- No public progress / gesture-state API

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useOnStartTyping`

### Signature

```ts
function useOnStartTyping(
  handler: UseOnStartTypingHandler,
  options?: UseOnStartTypingOptions,
): void
```

### Arguments

1. `handler` — called with the original `KeyboardEvent` when typing intent is accepted.
2. `options` — optional configuration.

### Return type

`void`

### Defaults

```ts
{
  enabled: true,
  // isTypedCharacterValid: ASCII alphanumeric default (see below)
  // isFocusedElementEditable: DOM editable detector (see below)
}
```

Default character validator:

```ts
!event.ctrlKey &&
  !event.altKey &&
  !event.metaKey &&
  !event.isComposing &&
  !event.repeat &&
  /^[a-z0-9]$/i.test(event.key)
```

### Behavior

- Registers a document `keydown` listener while `enabled` is true
- Skips when focus is in an editable control or contenteditable region (open shadow roots included when detectable)
- Nested `contenteditable="false"` islands are non-editable
- Custom `isTypedCharacterValid` replaces character validity entirely (caller owns modifier/repeat/composition filtering)
- Custom `isFocusedElementEditable` replaces the editable detector entirely
- Editable check runs before the character validator
- Does not call `preventDefault` or `stopPropagation`
- Latest `handler` / validators are used without re-registering the listener
- Changing `enabled` registers or removes the listener

### Exported types

- `UseOnStartTypingHandler`
- `UseOnStartTypingCharacterValidator`
- `UseOnStartTypingEditableDetector`
- `UseOnStartTypingOptions`

### SSR

Import-safe and effect-only. No document listener during server rendering. No `useLayoutEffect`.

### Limitations

- ASCII alphanumeric default only
- `keydown`-based; no IME reconstruction
- Does not manage input values
- Initial-character insertion after focus can be browser-dependent
- Not a keyboard-shortcut API (`useOnKeyStroke` remains appropriate for shortcuts)

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useDevicesList`

### Signature

```ts
function useDevicesList(options?: UseDevicesListOptions): UseDevicesListReturn
```

### Defaults

```ts
{
  enabled: true,
  requestPermissions: false,
  constraints: { audio: true, video: true }, // fresh object per default resolution
}
```

### Behavior

- Enumerates via `navigator.mediaDevices.enumerateDevices` when enabled and supported
- Groups by `videoinput` / `audioinput` / `audiooutput`
- Listens for `devicechange` on the same `MediaDevices` instance
- `ensurePermissions()` calls `getUserMedia` with latest constraints, stops every track in `finally`, then refreshes
- `permissionGranted` is set only after this hook’s successful `getUserMedia`
- Async races use generation IDs; overlapping work keeps `isLoading` accurate via a counter
- `refresh()` / `ensurePermissions()` no-op safely when disabled; enumeration failures resolve without throwing and preserve the last successful list

### Exported types

- `UseDevicesListUpdatedHandler`
- `UseDevicesListOptions`
- `UseDevicesListReturn`

### SSR

Unsupported empty state. No enumeration, permission, or listeners during server render. No `useLayoutEffect`.

### Limitations

- Lists devices only
- Labels may be empty until permission
- Audio-output support varies
- Automatic permission may be blocked
- Not a full Permissions API

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useDisplayMedia`

### Signature

```ts
function useDisplayMedia(
  options?: UseDisplayMediaOptions,
): UseDisplayMediaReturn
```

### Defaults

```ts
{
  enabled: false,
  video: true,
  audio: false,
}
```

Defaults are fresh boolean values (not a shared mutable constraints object).

### Behavior

- Detects support via callable `navigator.mediaDevices.getDisplayMedia`
- Prefer imperative `start()` from a user gesture; attach `stream` to `video.srcObject` in an effect
- `start()` reads the latest `video` / `audio` options, clears stale errors, sets loading, and returns the acquired stream or `null`
- Keeps an existing active stream when a replacement request fails; successful replacement stops the previous stream and detaches its listeners
- Overlapping requests use generation IDs; stale streams are stopped; stale rejections do not overwrite newer state
- `stop()` stops every owned track once, removes `ended` listeners, and clears sharing state (leaves `error` unchanged)
- Track `ended` events synchronize idle state and stop remaining live tracks for that owned stream
- `enabled: false → true` makes one best-effort declarative `start()`; `true → false` stops only declaratively started streams
- Imperative streams are not stopped merely because `enabled` remains `false`
- Constraint changes do not auto-restart or change `start` / `stop` identity

### Exported types

- `UseDisplayMediaOptions`
- `UseDisplayMediaReturn`

### SSR

Unsupported idle state (`isSupported: false`, `stream: null`, idle flags). `start()` resolves to `null`; `stop()` is a no-op. No `useLayoutEffect`.

### Limitations

- Secure context and user gesture typically required
- Browser/OS surface chooser is required; silent selection is impossible
- System audio varies
- Requests cannot be aborted with `AbortSignal`
- Does not record or transmit captured content
- Declarative `enabled` may be blocked without a gesture

### Stability

Unreleased beta API. May change before `0.1.0`.

## Storybook

Interactive documentation lives in Storybook (`npm run storybook`). Stories import the public package entry and are excluded from the npm tarball. Each example provides Show code / Hide code and Copy code for a curated consumer TypeScript snippet. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind. A future GitHub Pages deployment is not configured yet.
