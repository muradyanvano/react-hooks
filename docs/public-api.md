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
  useElementByPoint,
  type UseElementByPointOptions,
  type UseElementByPointReturn,
  type UseElementByPointScheduler,
  useElementHover,
  type UseElementHoverOptions,
  useFocus,
  useFocusWithin,
  type UseFocusOptions,
  type UseFocusReturn,
  type UseFocusTarget,
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

## `useElementByPoint`

### Signature

```ts
function useElementByPoint(
  options: UseElementByPointOptions<false>,
): UseElementByPointReturn<false>
function useElementByPoint(
  options: UseElementByPointOptions<true>,
): UseElementByPointReturn<true>
```

### Generic parameter

- `Multiple extends boolean = false` — when `true`, `element` is `readonly Element[]`; otherwise `Element | null`.

### Arguments

1. `options.x` / `options.y` — required client (viewport) coordinates, the same space as `event.clientX` / `event.clientY` and `element.getBoundingClientRect()`. Not page/document coordinates.
2. `options.multiple` — switches the result shape (see below).
3. `options.enabled` — declarative activation.
4. `options.document` — optional custom `Document` to hit-test against (for example an iframe's `contentDocument`).
5. `options.scheduler` — `'animationFrame' | 'sync'`.

### Return type

```ts
{
  element: Element | null | readonly Element[]
  isSupported: boolean
  isPaused: boolean
  update: () => void
  pause: () => void
  resume: () => void
}
```

### Defaults

```ts
{
  multiple: false,
  enabled: true,
  scheduler: 'animationFrame',
}
```

### Behavior

- Single mode (`multiple: false`) uses `document.elementFromPoint(x, y)`; multiple mode uses `document.elementsFromPoint(x, y)`, returning a copied, topmost-first `readonly Element[]` that also includes ancestor containers up to `<html>`
- Never mutates the returned element(s); purely reads
- `'animationFrame'` (default) batches the lookup into the target document's `defaultView.requestAnimationFrame`, coalescing rapid coordinate changes; a generation counter discards stale frames superseded by newer coordinates, a pause, a disable, or an unmount
- `'sync'` performs the lookup immediately in the same effect pass, bypassing `requestAnimationFrame`
- Non-finite `x`/`y` (`NaN`, `Infinity`) skip the lookup and clear the result instead of calling the native hit-test method
- `isSupported` reflects whether the resolved document exposes the method required by the current `multiple` mode
- `pause()` freezes the current result and stops scheduling new lookups; `resume()` clears the paused state and triggers a fresh lookup with the latest `x`/`y`/options (immediate when `scheduler: 'sync'`, otherwise scheduled on the next animation frame)
- `update()` forces an immediate lookup at the latest coordinates — useful when the DOM layout changed without `x`/`y` changing; it is a no-op while paused or disabled
- `enabled: false` clears the result and stops scheduling; re-enabling refreshes automatically
- Omitted `document` resolves the global `document` (evaluated inside effects/callbacks only); explicit `document: null` means "no usable document" and does not fall back
- Skips React state updates when the resolved element (or, in multiple mode, the element list by identity) is unchanged

### Exported types

- `UseElementByPointOptions`
- `UseElementByPointReturn`
- `UseElementByPointScheduler`

### SSR

Safe to import and call during server rendering. `isSupported: false` and an empty result (`null` / `[]`) during SSR; no `requestAnimationFrame`, listeners, or hit-testing calls. No `useLayoutEffect`.

### Limitations

- Coordinates are client (viewport) space only — no page/document coordinate convenience
- `elementsFromPoint` results include the full ancestor chain, not just visually distinct targets — filtering is the caller's responsibility
- No built-in polling for layout changes; call `update()` explicitly when needed
- A custom `document` must already exist and be same-origin-accessible; the hook does not create, load, or wait for one
- Requires `elementFromPoint` / `elementsFromPoint` support on the resolved document

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useElementHover`

Tracks whether the mouse pointer is hovering over a referenced DOM element.

### Signature

```ts
import type { RefObject } from 'react'

export interface UseElementHoverOptions {
  enabled?: boolean
  delayEnter?: number
  delayLeave?: number
  triggerOnRemoval?: boolean
}

export function useElementHover<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseElementHoverOptions,
): boolean
```

### Defaults

`{ enabled: true, delayEnter: 0, delayLeave: 0, triggerOnRemoval: false }`

Initial return value: `false`.

### Event model

Registers native `mouseenter` and `mouseleave` directly on the resolved target. Does not use bubbling `mouseover`/`mouseout`, pointer events, or React synthetic mouse handlers.

### Delays

- Non-finite or negative delay values normalize to `0`.
- Delay values are snapshotted when the boundary event occurs; changing options does not alter an already pending transition.
- Leave before delayed enter cancels the enter timer. Re-enter before delayed leave cancels the leave timer.

### Target lifecycle

- Reads `ref.current` after React commits; imperative ref assignment requires a later commit to synchronize.
- Target replacement or `null` resets hover immediately (no `delayLeave`).
- `enabled: false` detaches listeners, cancels timers, and resets to `false`.

### Removal detection

When `triggerOnRemoval: true`, a `MutationObserver` watches for removal of the target or an ancestor and starts a leave transition using the latest `delayLeave`. Disabled by default.

Implemented with a private observer (not composed from `useOnElementRemoval`) to keep hover listener lifecycle and removal leave transitions in one place without duplicate target-sync effects or extra tree-shaken surface.

### Exported types

- `UseElementHoverOptions`

### SSR

Safe to import and call during server rendering. Returns `false`; no listeners, timers, or observers. No `useLayoutEffect`.

### Limitations

- Mouse hover only — touch and keyboard focus do not affect the boolean
- No public pending-state API
- Re-enabling does not infer whether the pointer is already over the target
- `triggerOnRemoval` requires `MutationObserver`

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useFocus`

Tracks whether a referenced element has direct native focus and exposes imperative `focus` / `blur` methods.

### Signature

```ts
import type { RefObject } from 'react'

export type UseFocusTarget = HTMLElement | SVGElement

export interface UseFocusOptions {
  enabled?: boolean
  initialValue?: boolean
  focusVisible?: boolean
  preventScroll?: boolean
}

export interface UseFocusReturn {
  focused: boolean
  focus: () => void
  blur: () => void
}

export function useFocus<T extends UseFocusTarget>(
  ref: RefObject<T | null>,
  options?: UseFocusOptions,
): UseFocusReturn
```

### Defaults

`{ enabled: true, initialValue: false, focusVisible: false, preventScroll: false }`

Initial SSR return: `{ focused: false, focus, blur }` (methods are safe no-ops).

### Focus state

When `focusVisible: false`, `focused` is true when `target.ownerDocument.activeElement === target`.

When `focusVisible: true`, the target must also match `:focus-visible`. If matching cannot be evaluated, returns false conservatively.

Descendant focus does not count as direct focus.

### Events

Registers native `focus` and `blur` on the resolved target. Does not use React synthetic focus handlers.

### Imperative methods

- `focus()` calls native `focus({ preventScroll })` with latest options; no optimistic state.
- `blur()` calls native `blur()`; no optimistic state unless native events fail (not assumed).
- Both no-op when disabled, null target, or during SSR.

### Initial focus

When `initialValue: true`, focuses each newly resolved enabled target once after commit. Does not refocus on unrelated rerenders after the user moves focus elsewhere. Changing `initialValue` false→true focuses once; true→false does not blur.

### Target lifecycle

- Reads `ref.current` after React commits.
- Replacement resets `focused` without blurring the old browser focus automatically.
- `enabled: false` detaches listeners and resets hook state without blurring the element.

### Exported types

- `UseFocusTarget`
- `UseFocusOptions`
- `UseFocusReturn`

### SSR

Safe during server rendering. No listeners or DOM method calls. No `useLayoutEffect`.

### Limitations

- Direct focus only — not focus-within
- Disabled state does not blur the actual element
- External DOM removal may require React ref synchronization
- Cross-origin iframe elements cannot be accessed

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useFocusWithin`

Tracks whether a referenced element or any DOM descendant currently contains focus.

### Signature

```ts
import type { RefObject } from 'react'

export interface UseFocusWithinOptions {
  enabled?: boolean
}

export interface UseFocusWithinReturn {
  focused: boolean
}

export function useFocusWithin<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseFocusWithinOptions,
): UseFocusWithinReturn
```

### Defaults

`{ enabled: true }`

Initial SSR return: `{ focused: false }`

### Focus-within state

`focused` is true when `target.ownerDocument.activeElement` is the target itself or contained by the target. Parent-document focus does not count for iframe-owned targets.

### Events

Registers native bubbling `focusin` and `focusout` on the resolved target. Does not use React synthetic focus handlers.

When `focusout` reports an internal `relatedTarget`, state stays true. External `relatedTarget` sets false. Null or non-node `relatedTarget` schedules one microtask reconciliation against the owning document.

### Enabled lifecycle

When `enabled: false`, detaches listeners, invalidates pending microtasks, and resets `focused` without blurring actual browser focus. Re-enabling synchronizes actual containment.

### Target lifecycle

- Reads `ref.current` after React commits.
- Replacement resets `focused` without blurring the old target.
- Same-target commits re-synchronize containment.

### Difference from `useFocus`

- `useFocus` tracks direct focus only and exposes imperative `focus` / `blur`.
- `useFocusWithin` tracks container focus including descendants and is read-only.

### Exported types

- `UseFocusWithinOptions`
- `UseFocusWithinReturn`

### SSR

Safe during server rendering. No listeners, microtasks, or DOM calls. No `useLayoutEffect`.

### Limitations

- DOM containment only — React portals outside the subtree do not count
- Cross-origin iframe focus cannot be inspected
- Shadow DOM behavior varies; closed roots are not deeply inspected
- Disabled mode does not blur the active element
- Dynamic target replacement does not blur the old target
- Imperative `ref.current` changes require a later React commit before synchronization
- External DOM removal may require a focus event or React commit to resynchronize
- Ambiguous `focusout` events may reconcile on a microtask after `activeElement` settles
- SSR starts with `focused: false`
- Does not move, trap, or rove focus, and does not expose which descendant is focused

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useInfiniteScroll`

Loads more content when a scrollable target approaches a configured edge.

### Signature

```ts
import type { RefObject } from 'react'

export type UseInfiniteScrollDirection = 'top' | 'right' | 'bottom' | 'left'
export type UseInfiniteScrollTarget = HTMLElement | Window | Document

export function useInfiniteScroll<
  T extends UseInfiniteScrollTarget = HTMLElement,
>(
  ref: RefObject<T | null>,
  onLoadMore: UseInfiniteScrollLoadMore<T>,
  options?: UseInfiniteScrollOptions<T>,
): UseInfiniteScrollReturn
```

### Defaults

`{ enabled: true, distance: 0, direction: 'bottom', canLoadMore: () => true }`

Invalid `distance` values (negative, `NaN`, non-finite) normalize to `0`.

### Metrics

Element targets use native scroll metrics. `Window` / `Document` targets resolve metrics through `document.scrollingElement` with documentElement/body fallbacks, and attach the scroll listener to the provided window or document.

Distance formulas:

- `top`: `scrollTop`
- `bottom`: `scrollHeight - scrollTop - clientHeight`
- `left`: `scrollLeft`
- `right`: `scrollWidth - scrollLeft - clientWidth`

Load when `distanceToEdge <= distance`. Negative remainders from overscroll count as reached.

### Loading

Passive `scroll` listener. Loads are serialized. Failures normalize into `error` without unhandled rejections. After success, an owning-window animation frame remeasures and may chain while geometry progresses. No-progress stops auto-chaining until scroll, resize, `check()`, or `reset()`.

### Controls

- `check()` — stable; measures immediately; joins an active promise.
- `reset()` — stable; clears error and progress suppression; schedules a fresh measurement; does not clear consumer items or scroll position.

### Observation

Optional `ResizeObserver` on the scrolling root when available. No MutationObserver by default. No polyfill.

### SSR

Idle return `{ isLoading: false, error: null, check, reset }`. No listeners, observers, frames, or measurements during SSR.

### Limitations

- Scroll-metric based, not IntersectionObserver based
- Consumers own fetch/pagination/cancellation
- Active promises cannot be aborted
- `reset()` does not clear items or scroll position
- Top/left anchoring is consumer-owned
- RTL `scrollLeft` is not normalized
- Cross-origin iframe documents unsupported
- ResizeObserver may be unavailable
- Virtualized lists may need extra integration
- Provide accessible alternatives for long feeds

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useMouse`

Tracks mouse and optional touch coordinates for a target.

### Signature

```ts
export type UseMouseCoordinateType = 'page' | 'client' | 'screen' | 'movement'
export type UseMouseSourceType = 'mouse' | 'touch' | null
export type UseMouseTarget = Window | Document | HTMLElement | SVGElement

export function useMouse(options?: UseMouseOptions): UseMouseReturn
```

### Defaults

`{ enabled: true, type: 'page', target: window, touch: true, scroll: true, resetOnTouchEnd: false, initialValue: { x: 0, y: 0 }, eventFilter: (invoke) => invoke() }`

Omitted `target` resolves to `window` inside an effect. Explicit `target: null` registers nothing.

### Coordinates

- `page` — `pageX`/`pageY`; optional owning-window scroll recalculation from last client coordinates
- `client` — `clientX`/`clientY`
- `screen` — `screenX`/`screenY`
- `movement` — latest `movementX`/`movementY` (mouse only unless a custom extractor is supplied)
- Custom extractor — receives `MouseEvent` or `Touch`; `null`/`undefined` preserves state

### Events

Passive `mousemove` and `dragover` listeners. Optional passive `touchstart` / `touchmove` / `touchend` / `touchcancel`. No `preventDefault` / `stopPropagation`.

### SSR

Returns `{ x: initialValue.x, y: initialValue.y, sourceType: null }` with no listeners, scroll reads, or browser constructor access.

### Limitations

- Not Pointer Events
- No pressure/tilt/button-state API
- One tracked touch contact
- Element-relative coordinates require a custom extractor
- Cross-origin iframes unsupported
- High-frequency events may need `eventFilter` throttling
- Does not draw overlays or suppress native drag/touch behavior

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useMousePressed`

Tracks whether a mouse, touch, or drag press lifecycle is active.

### Signature

```ts
export function useMousePressed(
  options?: UseMousePressedOptions,
): UseMousePressedReturn
```

### Defaults

`{ enabled: true, touch: true, drag: true, capture: false, initialValue: false, target: window }`

### Lifecycle

- Press-start on target: `mousedown`, optional `touchstart`, optional `dragstart`
- Release on owning window while active: `mouseup`, `mouseleave`, `touchend`, `touchcancel`, `dragend`, `drop`
- Callbacks fire only on native transitions, not administrative resets

### SSR

Returns `{ pressed: initialValue, sourceType: null }` with no listeners.

### Limitations

- Boolean aggregate state only
- No keyboard or Pointer Events
- Consumer owns draggable configuration
- Does not call `preventDefault()`

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useParallax`

Tracks normalized parallax roll/tilt from mouse movement and optional device orientation.

### Signature

```ts
export function useParallax<T extends UseParallaxTarget = HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseParallaxOptions,
): UseParallaxReturn
```

### Defaults

`{ enabled: true, deviceOrientation: true, mouse: true, clamp: true }` with identity adjusters.

### Coordinates

- `roll` horizontal, `tilt` vertical
- Center `{ roll: 0, tilt: 0 }`; left/up negative; right/down positive
- Default clamp range `[-0.5, 0.5]`

### Lifecycle

- Mouse: passive `mousemove` on the resolved element target
- Orientation: passive `deviceorientation` on the owning window
- Screen angle compensation for `0/90/180/270`
- Most recent valid source wins; API presence alone does not switch source
- Never requests device-orientation permission

### SSR

Returns `{ roll: 0, tilt: 0, source: 'mouse' }` with no listeners or measurements.

### Limitations

- Permission and sensor availability vary by platform
- No built-in smoothing or permission helper
- Consumer owns transforms and reduced-motion behavior
- Cross-origin iframe targets unsupported

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useScroll`

Tracks scroll position, arrival, direction, and scrolling state for an element, window, or document target.

### Signature

```ts
import type { RefObject } from 'react'

export type UseScrollTarget = HTMLElement | SVGElement | Window | Document

export function useScroll<T extends UseScrollTarget = HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseScrollOptions,
): UseScrollReturn
```

### Defaults

`{ enabled: true, throttle: 0, idle: 200, observe: false, behavior: 'auto' }` with zero offsets and passive scroll listener options.

Invalid `throttle`, `idle`, and offset values (negative, `NaN`, non-finite) normalize to their defaults.

### Metrics

Element and SVG targets read native `scrollLeft` / `scrollTop` and dimensions. `Window` / `Document` targets resolve metrics through `document.scrollingElement` with documentElement/body fallbacks and attach the scroll listener to the provided window or document.

Arrival uses a 1px threshold (`ARRIVED_THRESHOLD`) plus optional per-edge offsets. Non-scrollable axes report both edges as arrived. Horizontal RTL containers detect `negative` or `reverse` scroll modes from computed direction and initial scroll position.

### Scroll session

Passive `scroll` listener. `throttle > 0` applies leading plus trailing measurements. `isScrolling` becomes true on the first scroll in a session and false after `idle + throttle` ms without a processed event. `onStop` receives the last scroll event from that session.

`directions` derive from the latest position delta. `measure()` and mutation-driven remeasurements reset directions without invoking scroll callbacks.

### Imperative controls

- `measure()` — stable; remeasures the attached target, resets directions, does not invoke `onScroll` / `onStop`.
- `scrollTo(position, behavior?)` — scrolls to finite coordinates; omitted axes preserve the current value.
- `setX(x, behavior?)` / `setY(y, behavior?)` — scroll one axis while preserving the other.

Imperative scroll with `behavior: 'auto'` triggers an immediate `measure()`. Other behaviors rely on subsequent scroll events or manual `measure()`.

Platform errors during reads or imperative scroll are contained and forwarded to optional `onError`.

### Observation

Optional `MutationObserver` when `observe: true` or `{ mutation: true }`. Observations coalesce through the owning window's animation frame or microtask. No polyfill is shipped.

### Target lifecycle

Sync target identity after every commit without putting `ref.current` in effect dependencies. After imperative `ref.current` assignment, a later React commit is required before attachment. Disabling detaches listeners/observers, preserves position, and resets directions only.

### SSR

Returns idle state with no listeners, observers, timers, or measurements. Imperative methods are safe no-ops when disabled, unattached, or outside a browser environment.

### Limitations

- Scroll-metric based, not IntersectionObserver based
- Smooth/instant imperative scroll does not auto-sync state
- Cross-origin iframe documents unsupported
- MutationObserver may be unavailable
- Elastic overscroll and RTL `scrollLeft` vary by browser
- External DOM changes may require `measure()` unless mutation observation is enabled
- Consumer owns focus and accessible scroll behavior

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useScrollLock`

Locks scrolling on an element, window, or document target by applying inline `overflow: hidden`.

### Signature

```ts
import type { RefObject } from 'react'

export type UseScrollLockTarget = HTMLElement | SVGElement | Window | Document

export interface UseScrollLockReturn {
  isLocked: boolean
  lock: () => void
  unlock: () => void
  toggle: () => void
}

export function useScrollLock<T extends UseScrollLockTarget = HTMLElement>(
  ref: RefObject<T | null>,
  initialLocked?: boolean,
): UseScrollLockReturn
```

### Defaults

`initialLocked = false`

`initialLocked` seeds React state once. Later changes to the argument do not update `isLocked`.

### Lock model

Applies inline `overflow: hidden` on the resolved style-capable element. Does not register scroll/`wheel`/`touchmove` suppressors and does not manage focus.

`Window` / `Document` targets resolve to the document scroll root (`scrollingElement`, then `documentElement` / `body`). Element and SVG targets lock themselves when inline style APIs are available. Targets that resolve to the same element share one registry record.

### Ownership

`isLocked` is requested state for this hook instance. A module-local `WeakMap` multi-owner registry tracks owners per resolved element. The first acquirer snapshots inline `overflow` / `overflow-x` / `overflow-y` (values and priorities, including `!important` on the shorthand) before applying `hidden`. Restore runs only when the final owner releases. Unmount and target replacement release this instance’s ownership.

### Controls

- `lock()` / `unlock()` / `toggle()` — stable; update requested state. Styles sync in effects when a resolvable target is attached.
- Idempotent for the same requested state.

### Target lifecycle

Sync target identity after every commit without putting `ref.current` in effect dependencies. After imperative `ref.current` assignment, a later React commit is required before attachment. Null or unresolved targets hold no lock.

### Exported types

- `UseScrollLockTarget`
- `UseScrollLockReturn`

### SSR

Safe to import and call during server rendering. Returns requested `isLocked` from `initialLocked` with no style writes. Methods are safe; browser effects apply and restore overflow.

### Limitations

- Applies `overflow: hidden` (shorthand). Browsers may temporarily expand that into axis longhands while locked; unlock restores snapshotted overflow / overflow-x / overflow-y (including shorthand `!important`)
- No event suppression, scrollbar compensation, or body `position: fixed` trick
- Not a focus trap or modal primitive
- Cross-origin iframe documents unsupported
- Does not call `scrollTo()`; scroll offsets usually remain, but scrollbar layout shifts can occur
- Programmatic scrolling may still change position
- Mobile Safari / webview body locking varies; no dedicated iOS fixed-body workaround
- SVG overflow behavior varies by browser
- `isLocked` is requested state (can be true with no applied DOM lock)

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useUserMedia`

Manages camera/microphone capture through `navigator.mediaDevices.getUserMedia`.

### Signature

```ts
export interface UseUserMediaOptions {
  enabled?: boolean
  autoSwitch?: boolean
  constraints?: MediaStreamConstraints
}

export interface UseUserMediaReturn {
  isSupported: boolean
  stream: MediaStream | null
  isActive: boolean
  isLoading: boolean
  error: Error | null
  start: () => Promise<MediaStream | null>
  stop: () => void
  restart: () => Promise<MediaStream | null>
}

export function useUserMedia(options?: UseUserMediaOptions): UseUserMediaReturn
```

### Defaults

`enabled = false`, `autoSwitch = true`, `constraints = { video: true, audio: false }` (fresh object each default).

### Behavior

- Support detection requires callable `navigator.mediaDevices.getUserMedia`; SSR starts `isSupported: false` and syncs after mount.
- `start()` uses latest constraints; atomic replacement keeps the old stream if the new request fails.
- `restart()` stops first, then reacquires; failure leaves idle.
- `stop()` invalidates pending work, detaches listeners, stops owned tracks, preserves `error`.
- `autoSwitch` deep-compares constraints (normalized key order; array order preserved) and reacquires while active/pending.
- Track `ended`: remain active while any track is live; clear when none remain.
- Imperative vs declarative origin mirrors `useDisplayMedia`.
- Compose with `useDevicesList` for device selection; do not couple the implementations.

### Exported types

- `UseUserMediaOptions`
- `UseUserMediaReturn`

### SSR

Idle unsupported return; no media request; methods are safe.

### Limitations

- Secure context / permission / gesture restrictions
- No recording, WebRTC, audio analysis, or AbortSignal for native prompts
- Constraint requests are not guaranteed settings
- `autoSwitch` reacquires rather than mutating live tracks

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useWebSocket`

Manages a browser `WebSocket` with send buffering, optional automatic reconnect, and application-level heartbeats.

### Signature

```ts
export type UseWebSocketStatus = 'OPEN' | 'CONNECTING' | 'CLOSED'

export type UseWebSocketSendData =
  string | ArrayBufferLike | Blob | ArrayBufferView

export type UseWebSocketReconnectRetries =
  number | ((attempt: number, event: CloseEvent) => boolean)

export type UseWebSocketReconnectDelay = number | ((attempt: number) => number)

export interface UseWebSocketAutoReconnectOptions {
  retries?: UseWebSocketReconnectRetries
  delay?: UseWebSocketReconnectDelay
  onFailed?: () => void
}

export interface UseWebSocketHeartbeatOptions {
  message?: string | ArrayBuffer | Blob
  responseMessage?: string | ArrayBuffer | Blob
  interval?: number
  pongTimeout?: number
}

export interface UseWebSocketOptions<T = unknown> {
  immediate?: boolean
  autoConnect?: boolean
  autoClose?: boolean
  autoReconnect?: boolean | UseWebSocketAutoReconnectOptions
  heartbeat?: boolean | UseWebSocketHeartbeatOptions
  protocols?: string | readonly string[]
  binaryType?: BinaryType
  onConnected?: (socket: WebSocket) => void
  onDisconnected?: (socket: WebSocket, event: CloseEvent) => void
  onError?: (socket: WebSocket, event: Event) => void
  onMessage?: (socket: WebSocket, event: MessageEvent<T>) => void
}

export interface UseWebSocketReturn<T = unknown> {
  data: T | null
  status: UseWebSocketStatus
  ws: WebSocket | null
  send: (data: UseWebSocketSendData, useBuffer?: boolean) => boolean
  open: () => void
  close: (code?: number, reason?: string) => void
}

export function useWebSocket<T = unknown>(
  url: string | URL | null | undefined,
  options?: UseWebSocketOptions<T>,
): UseWebSocketReturn<T>
```

### Defaults

`immediate = true`, `autoConnect = true`, `autoClose = true`, `autoReconnect = false`, `heartbeat = false`, `data = null`, `status = 'CLOSED'`, `ws = null`, `send` `useBuffer = true`.

Reconnect `true` / missing fields: `retries = -1`, `delay = 1000`.

Heartbeat `true` / missing fields: `message = 'ping'`, `responseMessage = message`, `interval = 1000`, `pongTimeout = 1000`.

Timing normalization: non-finite or negative delay/interval/pongTimeout values fall back to `1000`.

### Behavior

- Effect-only construction; generation guards reject stale socket/timer events.
- Semantic URL/protocol snapshots drive `autoConnect` replacement; equivalent values do not reconnect.
- Explicit `close` cancels reconnect, clears the outbound buffer, and never auto-reconnects.
- Buffer is FIFO, in-memory, unbounded; preserved across automatic reconnect; cleared on explicit close, endpoint change, and unmount.
- After close, `ws` keeps the closed instance until the next `open()` (SSR/idle remain `null`).
- `autoClose` only controls `beforeunload`; React unmount always releases ownership.
- Heartbeat responses are consumed internally; string responses use exact equality; `ArrayBuffer` responses compare bytes; `Blob` responses compare actual contents asynchronously (size/MIME are early gates only). A late Blob comparison after pong timeout or ownership change is ignored.
- Heartbeat timeout closes with `4000` / `Heartbeat timeout`.

### Exported types

- `UseWebSocketStatus`
- `UseWebSocketSendData`
- `UseWebSocketReconnectRetries`
- `UseWebSocketReconnectDelay`
- `UseWebSocketAutoReconnectOptions`
- `UseWebSocketHeartbeatOptions`
- `UseWebSocketOptions`
- `UseWebSocketReturn`

### SSR

Closed idle return (`data: null`, `status: 'CLOSED'`, `ws: null`); no WebSocket construction, listeners, or timers during render; methods are safe no-ops without a browser environment.

### Limitations

- No automatic JSON, Socket.IO, SSE, custom HTTP headers, or AbortSignal for pending connects
- Application heartbeats are not native WebSocket ping frames
- Buffer is not persisted; credentials in URLs are discouraged

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useLocalStorage`

Persists a value in `window.localStorage` with SSR-safe hydration, automatic serializers, same-document registry synchronization, and optional native cross-tab `storage` events.

### Signature

```ts
import type { Dispatch, SetStateAction } from 'react'

export interface UseLocalStorageSerializer<T> {
  read: (raw: string) => T
  write: (value: T) => string
}

export type UseLocalStorageMergeDefaults<T> =
  boolean | ((storedValue: T, defaultValue: T) => T)

export interface UseLocalStorageOptions<T> {
  serializer?: UseLocalStorageSerializer<T>
  mergeDefaults?: UseLocalStorageMergeDefaults<T>
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
  window?: Window | null
  onError?: (error: Error) => void
}

export interface UseLocalStorageReturn<T> {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  remove: () => void
  reset: () => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions<T>,
): UseLocalStorageReturn<T>
```

### Defaults

`mergeDefaults = false`, `writeDefaults = true`, `listenToStorageChanges = true`, omitted `window` resolves to the global window after mount, `onError` is a no-op.

Initial / SSR return: `value = defaultValue`, `isSupported = false`, `isReady = false`, `error = null`.

### Behavior

- Effect-only storage access; no `window` / `localStorage` reads during module evaluation or render.
- Automatic serializers for string, boolean, number, JSON object/array, Date, Map, Set, and null; custom serializers fully replace automatic read/write.
- Missing keys use the latest default; with `writeDefaults: true` the default is persisted during initialization only.
- Malformed values set `error`, call `onError`, fall back locally, and leave storage untouched.
- `mergeDefaults: true` shallow-merges plain objects only (stored fields win); arrays/maps/sets/dates/primitives are not shallow-merged.
- `setValue` supports functional updates, stable identity, and `Object.is` skip; failed writes keep local state and do not notify peers.
- `remove()` deletes the key; `reset()` writes the latest default.
- Same-document sync uses a private WeakMap registry; native `storage` events cover cross-tab. `listenToStorageChanges: false` disables both.
- Cross-tab removal/clear resets to the latest default without rewriting defaults.
- Dynamic key/window changes unsubscribe/resubscribe without migrating data; stale events are ignored.
- Latest default/serializer/merge/`onError` are read from refs without unnecessary listener churn.

### Exported types

- `UseLocalStorageSerializer`
- `UseLocalStorageMergeDefaults`
- `UseLocalStorageOptions`
- `UseLocalStorageReturn`

### SSR

Default-first return with safe no-op controls; no Storage method calls, listeners, timers, or layout effects during render.

### Limitations

- Synchronous storage can block the main thread; quotas and private modes may deny access
- Same-origin scripts can read stored data — not encryption; never store secrets casually
- JSON cannot preserve every JS type; consumers own migration/validation
- Multiple package copies do not share the in-memory registry
- Object mutation without `setValue` is not tracked

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useSessionStorage`

Persists a value in `window.sessionStorage` with the same SSR-safe hydration, automatic serializers, same-document registry synchronization, and optional native `storage` events as `useLocalStorage`.

Session storage survives reloads in the same browsing context and is cleared when that top-level session ends. It is not a durable cross-tab global store.

### Signature

```ts
import type { Dispatch, SetStateAction } from 'react'

export interface UseSessionStorageSerializer<T> {
  read: (raw: string) => T
  write: (value: T) => string
}

export type UseSessionStorageMergeDefaults<T> =
  boolean | ((storedValue: T, defaultValue: T) => T)

export interface UseSessionStorageOptions<T> {
  serializer?: UseSessionStorageSerializer<T>
  mergeDefaults?: UseSessionStorageMergeDefaults<T>
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
  window?: Window | null
  onError?: (error: Error) => void
}

export interface UseSessionStorageReturn<T> {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  remove: () => void
  reset: () => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

export function useSessionStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseSessionStorageOptions<T>,
): UseSessionStorageReturn<T>
```

### Defaults

Same as `useLocalStorage`: `mergeDefaults = false`, `writeDefaults = true`, `listenToStorageChanges = true`, omitted `window` resolves after mount, `onError` is a no-op.

Initial / SSR return: `value = defaultValue`, `isSupported = false`, `isReady = false`, `error = null`.

### Behavior

- Effect-only access to `sessionStorage` via the shared private browser-storage engine.
- Serializer, merge, remove/reset, error, registry, and pre-ready mutation ownership semantics match `useLocalStorage`.
- Local and session values with the same textual key remain independent (different Storage objects).
- Native session-storage events apply only to eligible related browsing contexts, not ordinary separate tabs.

### Exported types

- `UseSessionStorageSerializer`
- `UseSessionStorageMergeDefaults`
- `UseSessionStorageOptions`
- `UseSessionStorageReturn`

### SSR

Default-first return with safe no-op controls; no Storage method calls during render.

### Limitations

- Not durable across separate top-level tabs/windows
- Synchronous storage, quotas, privacy modes, and JSON type gaps still apply
- Not encryption

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useCookies`

Reactive `document.cookie` manager with SSR cookie-string injection, JSON-aware parsing, attribute formatting, same-document registry sync, Cookie Store observation when available, and a shared polling fallback.

### Signature

```ts
export type UseCookiesSameSite = true | 'strict' | 'lax' | 'none'

export interface UseCookiesGetOptions {
  doNotParse?: boolean
}

export interface UseCookiesSetOptions {
  path?: string
  domain?: string
  expires?: Date
  maxAge?: number
  secure?: boolean
  sameSite?: UseCookiesSameSite
  partitioned?: boolean
}

export interface UseCookiesChange {
  name: string
  value: unknown
  previousValue: unknown
  cause: 'set' | 'remove' | 'external'
}

export type UseCookiesChangeListener = (change: UseCookiesChange) => void

export interface UseCookiesOptions {
  doNotParse?: boolean
  autoUpdateDependencies?: boolean
  document?: Document | null
  initialCookies?: string
  watch?: boolean
  pollingInterval?: number
  onError?: (error: Error) => void
}

export interface UseCookiesReturn {
  get: <T = unknown>(
    name: string,
    options?: UseCookiesGetOptions,
  ) => T | undefined
  getAll: <T extends Record<string, unknown> = Record<string, unknown>>(
    options?: UseCookiesGetOptions,
  ) => T
  set: (name: string, value: unknown, options?: UseCookiesSetOptions) => boolean
  remove: (
    name: string,
    options?: Pick<UseCookiesSetOptions, 'path' | 'domain'>,
  ) => boolean
  refresh: () => void
  addChangeListener: (listener: UseCookiesChangeListener) => () => void
  removeChangeListener: (listener: UseCookiesChangeListener) => void
  isSupported: boolean
  isReady: boolean
  error: Error | null
}

export function useCookies(
  dependencies?: readonly string[] | null,
  options?: UseCookiesOptions,
): UseCookiesReturn
```

### Defaults

`dependencies = undefined` (watch all), `doNotParse = false`, `autoUpdateDependencies = false`, omitted `document`, omitted `initialCookies`, `watch = true`, `pollingInterval = 1000`, no-op `onError`.

SSR without `initialCookies`: empty snapshot, `isReady = false`, `isSupported = false`. With `initialCookies`: parsed values available and `isReady = true` while still unsupported until a client document is bound.

### Behavior notes

- Cookies are not Web Storage; do not share the private browser-storage engine.
- `set` returns whether assignment threw — not whether the browser accepted the cookie. Canonical reread drives React state.
- Duplicate visible names: first occurrence wins.
- With `doNotParse: false`, decoded values that are valid JSON become parsed primitives/objects (so `"true"` / `"42"` / `"null"` parse as JSON).
- Registry is keyed by `Document`. Cookie Store change events are preferred; otherwise one shared poller per document uses the smallest active positive interval.
- No `httpOnly` option — client JavaScript cannot create or read HttpOnly cookies.

### Exported types

- `UseCookiesSameSite`
- `UseCookiesGetOptions`
- `UseCookiesSetOptions`
- `UseCookiesChange`
- `UseCookiesChangeListener`
- `UseCookiesOptions`
- `UseCookiesReturn`

### Stability

Unreleased beta API. May change before `0.1.0`.

## `useJwt`

Decode compact JWS-style JWT header and payload contents synchronously.

**Decoding a JWT does not verify its signature or prove that its claims are trustworthy.**

### Signature

```ts
export interface UseJwtHeader {
  alg?: string
  typ?: string
  cty?: string
  kid?: string
  [claim: string]: unknown
}

export interface UseJwtPayload {
  iss?: string
  sub?: string
  aud?: string | readonly string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
  [claim: string]: unknown
}

export type UseJwtErrorPart = 'token' | 'header' | 'payload'

export interface UseJwtDecodeError {
  part: UseJwtErrorPart
  error: Error
}

export interface UseJwtOptions<Fallback = null> {
  fallbackValue?: Fallback
  onError?: (error: Error, part: UseJwtErrorPart) => void
}

export interface UseJwtReturn<
  Payload extends object,
  Header extends object,
  Fallback,
> {
  header: Header | Fallback
  payload: Payload | Fallback
  errors: readonly UseJwtDecodeError[]
}

export function useJwt<
  Payload extends object = UseJwtPayload,
  Header extends object = UseJwtHeader,
  Fallback = null,
>(
  encodedJwt: string | null | undefined,
  options?: UseJwtOptions<Fallback>,
): UseJwtReturn<Payload, Header, Fallback>
```

### Defaults

`fallbackValue = null`, no-op `onError`.

Leading/trailing whitespace around the entire token is trimmed. Whitespace inside segments is not removed.

### Behavior notes

- Supported tokens have exactly three dot-separated segments (`header.payload.signature`).
- Signature may be empty for an unsecured compact token; this never implies trust.
- Encrypted five-part compact tokens are unsupported.
- Header and payload decode independently after structure succeeds.
- Strict Base64URL and UTF-8 decoding is environment-independent (no exclusive `atob` / `Buffer` dependency).
- Header and payload must be non-null, non-array JSON objects.
- Decoding never throws from the hook; failures return `fallbackValue` and structured `errors`.
- `onError` runs in a client effect after a new error result. Notifications are deduplicated by effective token input (outer-trimmed string identity; `null`/`undefined` remain distinct) together with semantic error shape, so Strict Mode replay and callback-identity changes do not duplicate while a newly supplied invalid token still notifies. It does not run during SSR.
- Synchronous `errors` remain available during SSR.
- Token contents are not included in generated error messages.
- Generics document expected shapes; they do not validate runtime claim data.

### Security notes

- Never authorize users from client-side decoded claims alone.
- Signature verification belongs on a trusted server or trusted cryptographic verification layer.
- Do not trust `alg` without an allowlist; `alg: "none"` is not proof of validity.
- `exp` / `nbf` / `iat` are NumericDate seconds, not JavaScript milliseconds.
- This hook does not automatically reject expired or not-yet-valid tokens.
- Tokens may contain sensitive information because header and payload are encoded, not encrypted.
- Do not paste production tokens into Storybook, screenshots, logs, or public issues.
- Prefer labels such as “decoded successfully”, “structurally decodable”, or “signature not verified” — never “verified”, “authenticated”, or “trusted claims” merely because decoding succeeded.

### Exported types

- `UseJwtHeader`
- `UseJwtPayload`
- `UseJwtErrorPart`
- `UseJwtDecodeError`
- `UseJwtOptions`
- `UseJwtReturn`

### Stability

Unreleased beta API. May change before `0.1.0`.

---

## `useNProgress`

Package-native top-of-page progress indicator with shared document-level ownership. Zero external dependencies.

### Signature

```ts
export function useNProgress(
  currentProgress?: number | null,
  options?: UseNProgressOptions,
): UseNProgressReturn
```

### `UseNProgressOptions`

```ts
export interface UseNProgressOptions {
  minimum?: number // default: 0.08
  easing?: string // default: 'ease'
  speed?: number // default: 200
  trickle?: boolean // default: true
  trickleSpeed?: number // default: 200
  showSpinner?: boolean // default: true
  color?: string // default: '#4f46e5'
  height?: number // default: 3
  zIndex?: number // default: 1031
  removeDelay?: number // default: 200
  ariaLabel?: string // default: 'Page loading progress'
  document?: Document | null // default: globalThis.document; null = disabled
  parent?: HTMLElement | null // default: document.body; null = disabled
}
```

### `UseNProgressReturn`

```ts
export interface UseNProgressReturn {
  isLoading: boolean // true while this owner is active
  progress: number | null // current progress (null when idle)
  start: () => void // begin from minimum
  set: (value: number) => void // set exact progress
  increment: (amount?: number) => void // advance by auto or explicit amount
  done: (force?: boolean) => void // complete with animation
  remove: () => void // immediately release, no animation
}
```

### `currentProgress` semantics

| Value              | Behavior                                                               |
| ------------------ | ---------------------------------------------------------------------- |
| `undefined`        | Imperative mode; start/set/increment/done/remove control this instance |
| `null`             | Declaratively complete (equivalent to `done()`)                        |
| `number < 1`       | Activate and set to this normalized progress                           |
| `number >= 1`      | Declaratively complete                                                 |
| `NaN` / `Infinity` | Ignored; keeps previous coherent state                                 |

### DOM structure

```
<style data-react-hooks-nprogress-style>   (in document.head)
<div data-react-hooks-nprogress-root>
  <div role="progressbar" aria-label="…" aria-valuemin="0" aria-valuemax="100">
    <div data-react-hooks-nprogress-bar>
      <div data-react-hooks-nprogress-peg aria-hidden="true">
    </div>
  </div>
  <div data-react-hooks-nprogress-spinner aria-hidden="true">
    <div data-react-hooks-nprogress-spinner-icon>
  </div>
</div>
```

### Shared ownership

Multiple hook instances sharing the same `(document, parent)` pair share one visual channel:

- Displayed progress = minimum active owner progress
- Presentation options (color, height, etc.) = most recently updated active owner
- DOM is removed only when the last active owner completes

### SSR behavior

During server-side rendering, `useNProgress` returns `{ isLoading: false, progress: null }`. No DOM, styles, or timers are created. Methods are safe no-ops. Effects and DOM work activate after the client mounts.

### Limitations

- No automatic fetch/router interception — you must call `start()`/`done()` manually.
- No automatic routing-library coupling.
- No global CSS imports required (styles are injected per channel via `<style>` element).
- The spinner uses a CSS keyframe animation. On `prefers-reduced-motion: reduce`, the animation is disabled automatically.

### Exported names

- `useNProgress`
- `UseNProgressOptions`
- `UseNProgressReturn`

### Stability

Unreleased beta API. May change before `0.1.0`.

## Storybook

Interactive documentation lives in Storybook (`npm run storybook`). Stories import the public package entry and are excluded from the npm tarball. Each example provides Show code / Hide code and Copy code for a curated consumer TypeScript snippet. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind. A future GitHub Pages deployment is not configured yet.
