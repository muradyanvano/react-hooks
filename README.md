# @muradyanvano/react-hooks

Early prerelease React hooks library designed for React.

This package is **not published to npm yet**. Consume it from this repository only until publishing is authorized.

## Status

- Version: `0.1.0-beta.1` (unreleased)
- Module format: ESM-only
- React peer range: `^18.0.0 || ^19.0.0`
- Goal: SSR-safe imports with no browser globals required at module evaluation time
- Publishing has not been authorized

## Documentation

Local Storybook documents public package behavior with interactive examples, Controls, Actions, accessibility checks, and interaction tests.

Every example includes collapsible consumer-facing TypeScript code with Show code / Hide code and Copy code controls. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.

```bash
npm run storybook
npm run build:storybook
```

A future GitHub Pages URL may host the static Storybook build. Deployment is not configured yet.

## Available hooks

### `useOnClickOutside`

Invokes a handler when a document-level pointer or click event happens outside a referenced element.

```tsx
import { useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function Menu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(containerRef, () => {
    setOpen(false)
  })

  return (
    <div ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        Toggle menu
      </button>

      {open ? <div>Menu content</div> : null}
    </div>
  )
}
```

The toggle control is inside the referenced container so the default `pointerdown` listener does not close the menu when opening it.

#### Options

| Option      | Type                       | Default         | Description                                       |
| ----------- | -------------------------- | --------------- | ------------------------------------------------- |
| `enabled`   | `boolean`                  | `true`          | When `false`, no document listener is registered. |
| `eventType` | `'pointerdown' \| 'click'` | `'pointerdown'` | Document event to listen for.                     |
| `capture`   | `boolean`                  | `true`          | Capture-phase listener registration.              |

#### Event semantics

- `pointerdown` (default): registers a `pointerdown` listener; the handler receives the original `PointerEvent`. Pointer Events cover mouse, touch, and pen.
- `click`: registers a `click` listener; the handler receives the original `MouseEvent`.

#### SSR and StrictMode

- Importing the package does not touch `window` or `document`.
- The hook registers listeners only in an effect, so server rendering does not attach document listeners.
- Effects clean up correctly under React StrictMode, so duplicate active listeners are not left behind.

#### Current limitations

- Single ref only (no ref arrays)
- No ignored selectors / ignored elements
- No iframe-specific handling
- Not a full Shadow DOM API (uses `composedPath()` when available, then `contains()`)

### `useOnElementRemoval`

Invokes a handler when a referenced element is removed from its owning document tree — either directly or because an ancestor is removed.

```tsx
import { useEffect, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

export function ExternalWidgetHost() {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [readyTick, setReadyTick] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (host == null) {
      return
    }

    const widget = document.createElement('div')
    widget.textContent = 'External widget'
    host.append(widget)
    widgetRef.current = widget
    // Assignment happens in an effect; bump state so the hook re-syncs after commit.
    setReadyTick((tick) => tick + 1)

    return () => {
      widget.remove()
      widgetRef.current = null
    }
  }, [])

  useOnElementRemoval(widgetRef, (element) => {
    console.log('Widget removed:', element, readyTick)
  })

  return <div ref={hostRef} />
}
```

#### Options

| Option    | Type      | Default | Description                                             |
| --------- | --------- | ------- | ------------------------------------------------------- |
| `enabled` | `boolean` | `true`  | When `false`, no `MutationObserver` is created or kept. |

#### Defaults and SSR

- Default `enabled` is `true`.
- Importing the package does not touch `window`, `document`, or `MutationObserver`.
- Observers are created only in effects, so server rendering does not observe the DOM.

#### Lifecycle limitation

The hook is intended for removal performed outside React’s normal ownership flow, or for observing an element from a component that remains mounted. It is **not** a replacement for React effect cleanup. When the observing component unmounts, React may disconnect the observer before an asynchronous mutation callback runs.

#### Current limitations

- Single ref only
- No ignore lists
- No public `MutationObserver` abstraction
- Requires a React commit after imperative `ref.current` assignment so observation can sync

See Storybook (`Hooks/useOnElementRemoval`) for interactive examples.

### `useOnKeyStroke`

Registers a keyboard listener for matching key strokes. Matching uses exact, case-sensitive `event.key` values (not `event.code`).

```tsx
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

useOnKeyStroke('Escape', () => {
  closeDialog()
})

useOnKeyStroke(['ArrowUp', 'ArrowDown'], (event) => {
  event.preventDefault()
  moveSelection(event.key)
})

useOnKeyStroke(
  (event) =>
    event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey),
  (event) => {
    event.preventDefault()
    openCommandMenu()
  },
)
```

Target ref example:

```tsx
import { useRef } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

export function Region() {
  const regionRef = useRef<HTMLDivElement>(null)

  useOnKeyStroke('Enter', handleEnter, {
    target: regionRef,
  })

  return (
    <div ref={regionRef} tabIndex={0}>
      Focus this region and press Enter
    </div>
  )
}
```

#### Options

| Option      | Type                               | Default     | Description                                              |
| ----------- | ---------------------------------- | ----------- | -------------------------------------------------------- |
| `enabled`   | `boolean`                          | `true`      | When `false`, no listener is registered.                 |
| `eventType` | `'keydown' \| 'keyup'`             | `'keydown'` | Keyboard event to listen for.                            |
| `target`    | `EventTarget \| RefObject \| null` | `window`    | Omitted → `window`. Explicit `null` → no listen.         |
| `dedupe`    | `boolean`                          | `false`     | When `true`, ignore `event.repeat`.                      |
| `capture`   | `boolean`                          | `false`     | Capture-phase listener.                                  |
| `passive`   | `boolean`                          | `false`     | Passive listeners should not rely on `preventDefault()`. |

#### Behavior notes

- Filters: string, readonly string array, `true` (all keys), or predicate.
- Predicates are the API for modifier combinations — no `Ctrl+K` string parser.
- Does **not** auto-ignore inputs/textareas/contenteditable; use a predicate when needed.
- Default `passive: false` allows `preventDefault()`.
- SSR-safe: no `window` access at import; listeners are effect-only.
- Imperative target-ref updates need a later React commit to sync.

#### Current limitations

- No combination-string parsing
- No public editable-target helper
- No `useOnKeyDown` / `useOnKeyUp` aliases
- Single active listener per hook instance

See Storybook (`Hooks/useOnKeyStroke`) for interactive examples.

### `useEventListener`

Registers a DOM event listener with strong native event-map inference. Omitted target defaults to `window` (resolved inside effects). Returns `void` — use `enabled` for declarative control.

```tsx
import { useRef } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

// Default window target (SSR-safe call form)
useEventListener('resize', (event) => {
  console.log(event.type)
})

// Explicit document target — evaluating `document` requires a client environment
useEventListener(document, 'visibilitychange', () => {
  console.log(document.visibilityState)
})

// Ref target
const buttonRef = useRef<HTMLButtonElement>(null)
useEventListener(buttonRef, 'click', (event) => {
  console.log(event.clientX)
})

// Multiple events
useEventListener(buttonRef, ['mouseenter', 'mouseleave'], (event) => {
  console.log(event.type)
})

// Custom event (annotate the handler for typed detail)
useEventListener(
  buttonRef,
  'item:selected',
  (event: CustomEvent<{ id: string }>) => {
    console.log(event.detail.id)
  },
)
```

#### Options

| Option    | Type          | Default | Description                                              |
| --------- | ------------- | ------- | -------------------------------------------------------- |
| `enabled` | `boolean`     | `true`  | When `false`, no listeners are registered.               |
| `capture` | `boolean`     | `false` | Capture-phase listener.                                  |
| `passive` | `boolean`     | `false` | Passive listeners should not rely on `preventDefault()`. |
| `once`    | `boolean`     | `false` | Native once — applies per registered event name.         |
| `signal`  | `AbortSignal` | —       | Aborts/removes the listener natively.                    |

`UseEventListenerOptions` extends `AddEventListenerOptions` with `enabled`. `enabled` is never passed to the browser.

#### Behavior notes

- Latest handler without listener churn.
- Event-name arrays are deduped; equivalent contents avoid re-registration.
- Explicit `null` target registers nothing (does not fall back to `window`).
- Imperative target-ref updates need a later React commit to sync.
- Accessing `window`/`document` inside handlers is client-time behavior.
- Passing `document`/`window` as a **call argument** is not intrinsically SSR-safe — the consumer evaluates that global before the hook runs. Prefer omitted window form, a ref, or a client-only boundary.

#### Current limitations

- One target per call (no target arrays)
- One handler registration set (no multi-listener sugar beyond event-name arrays)
- No manual cleanup return value
- Existing hooks are not yet implemented on top of `useEventListener`

See Storybook (`Hooks/useEventListener`) for interactive examples.

### `useOnLongPress`

Invokes a handler after a sustained pointer press on a referenced element. Uses Pointer Events only (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`). Consumers need an environment with Pointer Events support.

```tsx
import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

export function HoldToFavorite() {
  const [favorited, setFavorited] = useState(false)
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setFavorited(true)
    },
    {
      delay: 500,
      onRelease: (details) => {
        console.log(details.isLongPress, details.duration, details.distance)
      },
    },
  )

  return (
    <div>
      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        {favorited ? 'Favorited' : 'Hold to favorite'}
      </button>
      <button type="button" onClick={() => setFavorited(true)}>
        Favorite with click
      </button>
    </div>
  )
}
```

#### Options

| Option              | Type                                          | Default | Description                                                                                  |
| ------------------- | --------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `enabled`           | `boolean`                                     | `true`  | When `false`, no target listener is registered.                                              |
| `delay`             | `number \| ((event: PointerEvent) => number)` | `500`   | Hold duration in ms. Function delay is resolved once at pointerdown.                         |
| `distanceThreshold` | `number \| false`                             | `10`    | Cancel pending activation after this Euclidean movement (px). `false` disables cancellation. |
| `button`            | `number`                                      | `0`     | Required `event.button` to start a gesture.                                                  |
| `self`              | `boolean`                                     | `false` | When `true`, only presses whose `event.target === element` are accepted.                     |
| `preventDefault`    | `boolean`                                     | `false` | Call `preventDefault()` on accepted pointerdown.                                             |
| `stopPropagation`   | `boolean`                                     | `false` | Call `stopPropagation()` on accepted pointerdown.                                            |
| `capture`           | `boolean`                                     | `false` | Capture-phase registration for the stable target `pointerdown` listener.                     |
| `onRelease`         | `(details) => void`                           | —       | Called once on matching `pointerup` with release metrics.                                    |

#### Delay and movement

- Fixed or function delays are supported. Negative delays clamp to `0`; non-finite values fall back to `500`.
- Zero delay still schedules asynchronously (does not run inside the pointerdown stack).
- Distance uses `Math.hypot` from the start coordinates; release reports the **maximum** distance observed, including pointerup.
- Movement past the threshold cancels the pending timer but still reports `onRelease` with `isLongPress: false` on later pointerup.
- `distanceThreshold: false` disables movement cancellation while still reporting distance.

#### Release details

```ts
{
  element: T
  event: PointerEvent // matching pointerup
  duration: number // pointerdown → pointerup (ms)
  distance: number // maximum Euclidean distance
  isLongPress: boolean
}
```

`onRelease` is **not** called for `pointercancel`, blur, unmount, disabled cleanup, or target replacement. Movement cancellation still waits for pointerup to report metrics.

#### Accessibility

Long press is pointer-specific. Do not use it as the only way to perform an essential action. Provide an equivalent standard control for keyboard users and people who cannot reliably hold a timed press. Destructive actions should include confirmation and an alternative path.

#### Click behavior

This hook does **not** suppress the click that a browser may generate after pointerup. Long press and click are separate interactions — consumers that combine both must define their own coordination. `preventDefault` on pointerdown is not documented as guaranteed click suppression; CSS such as `touch-action` / `user-select` may still be needed.

#### SSR and StrictMode

- Importing the package does not touch `window`, `document`, `PointerEvent`, or timers.
- Listeners and timers are created only in effects.
- Effects clean up correctly under React StrictMode (no duplicate listeners/timers).

#### Current limitations

- Pointer Events only (no separate mouse/touch fallbacks; no polyfill)
- No automatic click suppression
- No keyboard long-press detection
- No `once` option
- No public gesture-state / progress API
- Single active gesture per hook instance
- Imperative `ref.current` updates need a later React commit to sync

See Storybook (`Hooks/useOnLongPress`) for interactive examples.

### `useOnStartTyping`

Detects when a user begins typing while focus is outside an editable element. A common use case is focusing a search field when typing starts anywhere on the page.

```tsx
import { useRef } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function Search() {
  const inputRef = useRef<HTMLInputElement>(null)

  useOnStartTyping(() => {
    inputRef.current?.focus()
  })

  return (
    <input
      ref={inputRef}
      type="search"
      placeholder="Start typing to search"
      aria-label="Search"
    />
  )
}
```

The hook does **not** call `preventDefault` or `stopPropagation`, so the initial typed character may continue into a newly focused input (browser-dependent).

#### Options

| Option                     | Type                                | Default                    | Description                                                  |
| -------------------------- | ----------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `enabled`                  | `boolean`                           | `true`                     | When `false`, no document listener is registered.            |
| `isTypedCharacterValid`    | `(event: KeyboardEvent) => boolean` | ASCII alphanumeric default | Completely replaces the default character-validity decision. |
| `isFocusedElementEditable` | `() => boolean`                     | DOM editable detector      | Completely replaces the default editable-element check.      |

#### Default character validation

Accepts Latin letters `A–Z` / `a–z` and digits `0–9`. Rejects whitespace, punctuation, symbols, navigation/control keys, empty `event.key`, Ctrl/Alt/Meta modifiers, `event.repeat`, and `event.isComposing`. Shift is allowed so uppercase letters remain valid.

Equivalent rule:

```ts
!event.ctrlKey &&
  !event.altKey &&
  !event.metaKey &&
  !event.isComposing &&
  !event.repeat &&
  /^[a-z0-9]$/i.test(event.key)
```

A custom `isTypedCharacterValid` is responsible for any modifier, repeat, and composition filtering it requires. Editable-element protection remains a separate check and always runs first.

#### Editable-element protection

By default the handler is skipped when focus is in an `<input>`, `<textarea>`, `<select>`, a contenteditable region, a descendant of one, or an editable control inside an open shadow root (where detectable). Nested `contenteditable="false"` islands are treated as non-editable.

#### Execution order

1. Listener is active only while `enabled` is true.
2. If the focused element is editable, stop (validator is not called).
3. If the character validator rejects the event, stop.
4. Call the latest handler with the original `KeyboardEvent`.

#### SSR and StrictMode

- Importing the package does not touch `document` or `window`.
- The document `keydown` listener is registered only in `useEffect`.
- Effects clean up correctly under React StrictMode (one active listener per mounted instance).

#### Current limitations

- Default validator is ASCII Latin letters and digits only
- Based on `keydown`, not `beforeinput` / text-input events
- Does not reconstruct IME-composed text
- Does not manage input values
- Initial-character insertion after focus can be browser-dependent
- Not a shortcut hook — use `useOnKeyStroke` for explicit key or shortcut handling

See Storybook (`Hooks/useOnStartTyping`) for interactive examples.

### `useDevicesList`

Provides a reactive list of available media devices through `navigator.mediaDevices`. Groups cameras, microphones, and speakers; refreshes on `devicechange`; and offers an explicit permission workflow that immediately stops temporary tracks.

```tsx
import { useDevicesList } from '@muradyanvano/react-hooks'

export function DevicePicker() {
  const { videoInputs, audioInputs, permissionGranted, ensurePermissions } =
    useDevicesList()

  return (
    <section>
      {!permissionGranted ? (
        <button
          type="button"
          onClick={() => {
            void ensurePermissions()
          }}
        >
          Allow camera and microphone
        </button>
      ) : null}

      <p>Cameras: {videoInputs.length}</p>
      <p>Microphones: {audioInputs.length}</p>
    </section>
  )
}
```

Prefer explicit `ensurePermissions()` after a user gesture. Do not rely on `requestPermissions: true` as the primary pattern — browsers may block automatic prompts.

#### Options

| Option               | Type                                            | Default                        | Description                                      |
| -------------------- | ----------------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `enabled`            | `boolean`                                       | `true`                         | When `false`, no enumeration or listener.        |
| `requestPermissions` | `boolean`                                       | `false`                        | Best-effort automatic permission after mount.    |
| `constraints`        | `MediaStreamConstraints`                        | `{ audio: true, video: true }` | Passed to `getUserMedia` (fresh copy each call). |
| `onUpdated`          | `(devices: readonly MediaDeviceInfo[]) => void` | —                              | Called after successful enumeration.             |

#### Return values

| Field                                          | Description                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `isSupported`                                  | `true` when `navigator.mediaDevices.enumerateDevices` exists.                |
| `devices`                                      | Latest successful enumeration (readonly).                                    |
| `videoInputs` / `audioInputs` / `audioOutputs` | Filtered by `device.kind`, preserving order.                                 |
| `permissionGranted`                            | `true` only after this hook’s successful `getUserMedia` attempt.             |
| `isLoading`                                    | `true` while refresh/permission operations are in flight (supports overlap). |
| `error`                                        | Normalized `Error` or `null`.                                                |
| `refresh`                                      | Re-enumerate; no-ops when disabled/unsupported; does not throw on failure.   |
| `ensurePermissions`                            | Request media, stop all tracks, refresh; returns `boolean`.                  |

#### Privacy and permission

- Device labels/IDs may be empty until permission is granted.
- Permission generally requires a secure context and a user gesture.
- `permissionGranted` reflects this hook’s latest attempt, not a full Permissions API.
- Temporary streams are never stored in React state or attached to elements.

#### SSR and StrictMode

- Unsupported empty state during SSR; no enumeration, permission, or listeners.
- Listeners and async work clean up under Strict Mode; temporary tracks are always stopped.

#### Current limitations

- Lists devices only — does not open, preview, or switch streams
- Audio-output support varies by browser/platform
- `devicechange` timing varies
- Automatic permission requests may be blocked
- Permission requests cannot be cancelled after `getUserMedia` begins

See Storybook (`Hooks/useDevicesList`) for interactive examples. Most stories use mocks; **Live hardware** uses real devices for local testing. Pages generally cannot revoke camera/microphone — clear the site permission in browser settings, then remount (or reload) to re-test the prompt.

### `useDisplayMedia`

Manages browser screen capture through `navigator.mediaDevices.getDisplayMedia`. Prefer an explicit `start()` call from a button click. The hook owns streams it creates, stops tracks on `stop()` / replacement / unmount, and synchronizes when the user ends sharing in the browser UI.

```tsx
import { useEffect, useRef } from 'react'
import { useDisplayMedia } from '@muradyanvano/react-hooks'

export function ScreenShare() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { stream, isSharing, isLoading, error, start, stop } = useDisplayMedia()

  useEffect(() => {
    const video = videoRef.current
    if (video == null) {
      return
    }

    video.srcObject = stream

    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <section>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Screen share preview"
      />

      {isSharing ? (
        <button type="button" onClick={stop}>
          Stop sharing
        </button>
      ) : (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            void start()
          }}
        >
          {isLoading ? 'Starting…' : 'Start sharing my screen'}
        </button>
      )}

      {error != null ? <p role="alert">{error.message}</p> : null}
    </section>
  )
}
```

#### Options

| Option    | Type                               | Default | Description                                                                |
| --------- | ---------------------------------- | ------- | -------------------------------------------------------------------------- |
| `enabled` | `boolean`                          | `false` | Advanced declarative auto-start. Prefer imperative `start()` from a click. |
| `video`   | `boolean \| MediaTrackConstraints` | `true`  | Passed to `getDisplayMedia` (read at call time; not mutated).              |
| `audio`   | `boolean \| MediaTrackConstraints` | `false` | System-audio request; availability varies by browser, OS, and surface.     |

#### Return values

| Field         | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| `isSupported` | `true` when `navigator.mediaDevices.getDisplayMedia` is callable.     |
| `stream`      | Current owned `MediaStream`, or `null`.                               |
| `isSharing`   | `true` while an owned stream is active.                               |
| `isLoading`   | `true` while a `start()` request is pending (supports overlap).       |
| `error`       | Normalized `Error` from the latest failed attempt, or `null`.         |
| `start`       | Requests display media; returns the stream or `null` (never throws).  |
| `stop`        | Stops owned tracks, removes listeners, clears `stream` / `isSharing`. |

#### Behavior notes

- Default `enabled: false` means no automatic screen-sharing request.
- Changing `video` / `audio` alone does not restart sharing or re-prompt.
- A failed replacement keeps the existing active stream until a later success.
- Overlapping `start()` calls: the latest request wins; stale streams are stopped.
- Browser “Stop sharing” ends tracks; the hook clears state and stops remaining tracks.
- Cancellation (`NotAllowedError` / `AbortError`) is a normal recoverable `error` state.
- Secure context and a user gesture are typically required for `start()`.

#### SSR and StrictMode

- Unsupported idle state during SSR; no `getDisplayMedia`, listeners, or streams.
- Unmount and Strict Mode cleanups stop owned tracks and invalidate pending requests.

#### Current limitations

- Requires a secure context and browser support for `getDisplayMedia`
- Users choose the shared surface; apps cannot silently select a screen or window
- System-audio capture varies by browser, OS, and selected surface
- `getDisplayMedia` cannot be aborted with `AbortSignal`
- Constraint support varies
- The hook does not record, encode, upload, or transmit captured content
- Declarative `enabled` may be blocked without a user gesture

See Storybook (`Hooks/useDisplayMedia`) for interactive examples. **Live screen sharing** uses the real browser chooser; other stories use deterministic mocks for automated tests.

### `useElementByPoint`

Reactively resolves the DOM `Element` (or elements) sitting at viewport coordinates via `document.elementFromPoint` / `elementsFromPoint`. Coordinates are client (viewport) space — the same as `event.clientX` / `event.clientY` and `element.getBoundingClientRect()`, not page/document coordinates. The hook only reads the DOM; it never mutates the element(s) it returns.

```tsx
import { useEffect, useRef, useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function ElementInspector() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const { element } = useElementByPoint({ x, y })

  useEffect(() => {
    const target = targetRef.current
    if (target == null) {
      return
    }

    const rect = target.getBoundingClientRect()
    setX(Math.round(rect.left + rect.width / 2))
    setY(Math.round(rect.top + rect.height / 2))
  }, [])

  return (
    <section>
      <label>
        X
        <input
          type="number"
          value={x}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber
            setX(Number.isNaN(next) ? 0 : next)
          }}
        />
      </label>

      <label>
        Y
        <input
          type="number"
          value={y}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber
            setY(Number.isNaN(next) ? 0 : next)
          }}
        />
      </label>

      <div ref={targetRef}>Inspectable target</div>

      <output>
        {element == null ? 'No element' : element.tagName.toLowerCase()}
      </output>
    </section>
  )
}
```

#### Options

| Option      | Type                         | Default            | Description                                                                                                                               |
| ----------- | ---------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `x`         | `number`                     | —                  | Required client (viewport) X coordinate.                                                                                                  |
| `y`         | `number`                     | —                  | Required client (viewport) Y coordinate.                                                                                                  |
| `multiple`  | `boolean`                    | `false`            | `true` switches the result to a readonly `Element[]` via `elementsFromPoint`.                                                             |
| `enabled`   | `boolean`                    | `true`             | When `false`, clears the result and stops scheduling lookups.                                                                             |
| `document`  | `Document \| null`           | global `document`  | Custom document to hit-test against (for example an iframe's `contentDocument`). Explicit `null` disables lookup instead of falling back. |
| `scheduler` | `'animationFrame' \| 'sync'` | `'animationFrame'` | Batch into the next `requestAnimationFrame`, or look up immediately.                                                                      |

#### Return values

| Field         | Description                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `element`     | `Element \| null` (default mode) or `readonly Element[]` (`multiple: true`).                                                                               |
| `isSupported` | `true` when the resolved document exposes the required hit-test method.                                                                                    |
| `isPaused`    | `true` after `pause()` until the next `resume()`.                                                                                                          |
| `update`      | Forces an immediate lookup at the latest coordinates. No-op while paused/disabled.                                                                         |
| `pause`       | Freezes the current result and stops scheduling new lookups.                                                                                               |
| `resume`      | Sets `isPaused` false and triggers a fresh lookup with the latest coordinates (immediate when `scheduler: 'sync'`, otherwise on the next animation frame). |

#### Behavior notes

- Non-finite `x`/`y` (`NaN`, `Infinity`) clear the result without calling the native hit-test method.
- `elementsFromPoint` reports the full topmost-first ancestor chain up to `<html>`, not just visually distinct targets — filter before rendering.
- `update()` exists because the hook only reacts to `x`/`y`/option changes; a layout shift with no coordinate change needs an explicit refresh.
- `document.elementFromPoint` / `elementsFromPoint` return `null` / `[]` for coordinates outside the current viewport — native browser behavior, not something this hook adds.
- The hook never mutates, clones, or styles the returned element(s).

#### SSR and StrictMode

- Importing the package does not touch `window`, `document`, or `requestAnimationFrame`.
- `isSupported: false` and an empty result during SSR; no scheduling or hit-testing calls.
- Effects clean up correctly under React StrictMode; stale animation frames are cancelled via a generation counter.

#### Current limitations

- Client (viewport) coordinates only — no page/document coordinate convenience
- No built-in polling for layout changes; call `update()` explicitly
- A custom `document` must already exist and be same-origin-accessible

See Storybook (`Hooks/useElementByPoint`) for interactive examples, including coordinate tracking, multi-element stacking, pause/resume, manual `update()`, SVG detection, out-of-viewport behavior, and a custom-document (iframe) fixture.

### `useElementHover`

Tracks whether the mouse pointer is hovering over a referenced DOM element via native `mouseenter` / `mouseleave` listeners on the target. Keyboard focus and touch presses do not affect the returned boolean.

```tsx
import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function HoverCard() {
  const targetRef = useRef<HTMLButtonElement>(null)

  const isHovered = useElementHover(targetRef, {
    delayEnter: 150,
    delayLeave: 100,
  })

  return (
    <button ref={targetRef} type="button">
      {isHovered ? 'Thank you!' : 'Hover me'}
    </button>
  )
}
```

Button semantics remain available to keyboard users, but keyboard focus does not change this hook's mouse-hover state.

#### Options

| Option             | Type      | Default | Description                                                                  |
| ------------------ | --------- | ------- | ---------------------------------------------------------------------------- |
| `enabled`          | `boolean` | `true`  | When `false`, detaches listeners, cancels timers, and resets hover to false. |
| `delayEnter`       | `number`  | `0`     | Milliseconds before hover becomes `true` after `mouseenter`.                 |
| `delayLeave`       | `number`  | `0`     | Milliseconds before hover becomes `false` after `mouseleave` or removal.     |
| `triggerOnRemoval` | `boolean` | `false` | When `true`, detects target/ancestor removal via `MutationObserver`.         |

#### Return value

Returns a `boolean` that is `true` only after the configured enter transition completes.

#### Behavior notes

- Uses direct native `mouseenter` / `mouseleave` on the resolved target — moving between descendants does not toggle the boolean.
- Opposite transitions cancel pending timers (leave before delayed enter, re-enter before delayed leave).
- Delay values are snapshotted at event time; changing options does not reschedule an already pending transition.
- Target replacement resets hover immediately (no `delayLeave`).
- Re-enabling starts from `false` and waits for a future `mouseenter` — the hook does not infer pointer position.
- Imperative `ref.current` assignment requires a later React commit before the hook synchronizes.

#### SSR and StrictMode

- Importing the package does not touch browser globals.
- Returns `false` during SSR with no listeners, timers, or observers.
- Effects clean up correctly under React StrictMode.

#### Current limitations

- Mouse hover only — not touch, pointer-down, keyboard focus, or CSS `:hover`
- No public pending-state API — only the final boolean is exposed
- `triggerOnRemoval` requires `MutationObserver` and adds runtime cost

See Storybook (`Hooks/useElementHover`) for the primary two-button **Hover me** example, delayed enter/leave demos, nested content, removal detection, dynamic targets, SVG targets, and a playground.

## Development

```bash
npm install
npm run verify
```

Useful scripts:

| Script                                                      | Purpose                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run storybook`                                         | Start local Storybook docs                                          |
| `npm run build:storybook`                                   | Build static Storybook output                                       |
| `npm run test:storybook`                                    | Run Storybook browser interaction/a11y checks                       |
| `npm run test:ssr:react18`                                  | Packed-consumer SSR check against React 18                          |
| `npm run build` / `npm run build:lib`                       | Build the ESM library and declarations                              |
| `npm run typecheck`                                         | TypeScript project build                                            |
| `npm run lint`                                              | ESLint                                                              |
| `npm run format` / `npm run format:check`                   | Prettier                                                            |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Unit tests (Vitest)                                                 |
| `npm run pack:dry-run`                                      | Inspect the future publish tarball                                  |
| `npm run verify`                                            | Format, typecheck, lint, unit tests, library build, Storybook build |
| `npm run verify:ci`                                         | `verify` plus Storybook browser tests and React 18 SSR consumer     |

## License

MIT © Vano Muradyan
