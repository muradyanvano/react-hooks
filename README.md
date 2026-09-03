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

### `useFocus`

Tracks whether a referenced element has **direct native focus** and exposes stable `focus()` / `blur()` methods. Descendant focus does not count — use `useFocusWithin` for container-level focus tracking.

```tsx
import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function SearchField() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, {
    preventScroll: true,
  })

  return (
    <section>
      <label htmlFor="search">Search</label>
      <input ref={inputRef} id="search" type="search" />

      <p>{focused ? 'Search has focus' : 'Search is not focused'}</p>

      <button type="button" onClick={focus}>
        Focus search
      </button>

      <button type="button" onClick={blur}>
        Blur search
      </button>
    </section>
  )
}
```

#### Options

| Option          | Type      | Default | Description                                                                      |
| --------------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `enabled`       | `boolean` | `true`  | When `false`, detaches listeners, resets `focused` to false, and no-ops methods. |
| `initialValue`  | `boolean` | `false` | When `true`, focuses the target once when it becomes available after commit.     |
| `focusVisible`  | `boolean` | `false` | When `true`, `focused` requires native `:focus-visible` matching.                |
| `preventScroll` | `boolean` | `false` | Passed to hook-initiated `focus({ preventScroll })` calls.                       |

#### Return value

```ts
{ focused: boolean; focus: () => void; blur: () => void }
```

#### Behavior notes

- Uses native `focus` / `blur` listeners on the resolved target — not React synthetic handlers.
- State follows `target.ownerDocument.activeElement === target` (with optional `:focus-visible` filter).
- `focus()` / `initialValue` do not set `focused` optimistically; native focus events synchronize state.
- Disabling resets the hook boolean but does **not** blur the element in the browser.
- Target replacement resets hook state without automatically blurring the old target.
- Changing `initialValue` from false to true focuses once; true to false does not blur.
- Imperative `ref.current` assignment requires a later React commit before synchronization.

#### SSR and StrictMode

- Returns `{ focused: false, focus, blur }` during SSR; methods are safe no-ops.
- No listeners or DOM calls at module evaluation.
- Effects clean up correctly under React StrictMode.

#### Current limitations

- Direct focus only — not descendant focus-within
- `:focus-visible` matching is conservative when unsupported (returns false)
- `preventScroll` support varies in older environments
- External DOM removal without a React commit may not synchronize immediately

See Storybook (`Hooks/useFocus`) for the primary **Focus controls** example (paragraph, input, button), initial focus, prevent scroll, focus-visible filtering, dynamic targets, SVG targets, custom documents, and a playground.

### `useFocusWithin`

Tracks whether a referenced element **or any DOM descendant** currently contains focus, aligned with CSS `:focus-within`. Read-only — it does not move focus.

```tsx
import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const { focused } = useFocusWithin(formRef)

  return (
    <form ref={formRef}>
      <p>Focus in form: {String(focused)}</p>

      <label>
        First Name
        <input name="firstName" />
      </label>

      <label>
        Last Name
        <input name="lastName" />
      </label>

      <label>
        Email
        <input name="email" type="email" />
      </label>

      <label>
        Password
        <input name="password" type="password" />
      </label>
    </form>
  )
}
```

#### Options

| Option    | Type      | Default | Description                                                                      |
| --------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `enabled` | `boolean` | `true`  | When `false`, detaches listeners and resets `focused` to false without blurring. |

#### Return value

```ts
{
  focused: boolean
}
```

#### Behavior notes

- Uses native bubbling `focusin` / `focusout` on the resolved container — not React synthetic handlers.
- State follows `target.ownerDocument.activeElement` containment (target itself or a descendant).
- Moving focus between descendants keeps `focused` true; leaving the container sets false.
- When `relatedTarget` is unavailable, a microtask reconciles against the owning document.
- Disabling resets the hook boolean but does **not** blur actual browser focus.
- React portals outside the DOM subtree do not count — containment is DOM-based, not component ownership.
- Imperative `ref.current` assignment requires a later React commit before synchronization.

#### SSR and StrictMode

- Returns `{ focused: false }` during SSR; no listeners or microtasks.
- Hydration begins false, then synchronizes after mount.
- Effects clean up correctly under React StrictMode.

#### Current limitations

- Focus-within means actual DOM containment, not React component ownership
- Portals outside the subtree do not count
- Shadow DOM behavior depends on browser retargeting and `activeElement` rules; closed roots are not deeply inspected
- Cross-origin iframe focus cannot be inspected
- Disabled mode and dynamic target replacement do not blur the active or previous target
- Imperative `ref.current` changes require a later React commit before synchronization
- External DOM removal without a React commit may not synchronize immediately
- Ambiguous `focusout` events may reconcile on a microtask after `activeElement` settles
- SSR starts with `focused: false`
- Does not expose which descendant is focused
- Does not trap focus or manage roving tab index

See Storybook (`Hooks/useFocusWithin`) for the primary **Focus in form** example (First Name, Last Name, Email, Password), field groups, moving within, target focus, nested controls, portal boundaries, SVG groups, custom documents, and a playground.

### `useInfiniteScroll`

Loads more content when a scrollable target approaches a configured edge. Supports `HTMLElement`, `Window`, and `Document` targets with `top` / `right` / `bottom` / `left` directions.

```tsx
import { useRef, useState } from 'react'
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

async function loadMoreItems(offset: number) {
  await new Promise((resolve) => setTimeout(resolve, 120))
  return Array.from({ length: 4 }, (_, index) => offset + index + 1)
}

export function InfiniteList() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(() =>
    Array.from({ length: 6 }, (_, index) => index + 1),
  )
  const itemsRef = useRef(items)
  itemsRef.current = items

  const { isLoading, reset } = useInfiniteScroll(
    containerRef,
    async () => {
      const nextItems = await loadMoreItems(itemsRef.current.length)
      setItems((current) => [...current, ...nextItems])
    },
    {
      distance: 10,
      canLoadMore: () => itemsRef.current.length < 50,
    },
  )

  const handleReset = () => {
    setItems([1, 2, 3, 4, 5, 6])
    reset()
  }

  return (
    <>
      <div ref={containerRef} style={{ maxHeight: 320, overflowY: 'auto' }}>
        {items.map((item) => (
          <article key={item}>Item {item}</article>
        ))}
      </div>

      <p>{isLoading ? 'Loading…' : `${items.length} items`}</p>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </>
  )
}
```

#### Options

| Option        | Type                                     | Default      | Description                                                      |
| ------------- | ---------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `enabled`     | `boolean`                                | `true`       | When `false`, detaches listeners/observers and does not load.    |
| `distance`    | `number`                                 | `0`          | Edge proximity threshold. Negative/non-finite values become `0`. |
| `direction`   | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'`   | Which edge triggers loading.                                     |
| `canLoadMore` | `(state) => boolean`                     | `() => true` | Return `false` when the dataset is complete.                     |

#### Return value

```ts
{
  isLoading: boolean
  error: Error | null
  check: () => Promise<void>
  reset: () => void
}
```

#### Behavior notes

- Passive `scroll` listener on the resolved target; metrics come from the element or `document.scrollingElement`.
- Load condition: `distanceToEdge <= distance`.
- Loads are serialized. `check()` joins an in-flight attempt.
- After a successful load, the hook remeasures (animation frame) and may chain while geometry progresses and the edge remains within distance.
- No-progress protection stops auto-chaining until a later scroll, resize, `check()`, or `reset()`.
- `reset()` clears errors and progress suppression, then remeasures. It does not clear items or change scroll position — pair with `setItems(initial)`.
- Optional `ResizeObserver` rechecks on geometry changes when available.
- Top/left directions usually need consumer CSS (reversed flow) and consumer-managed scroll anchoring after prepending.

#### Current limitations

- Scroll-metric based, not IntersectionObserver based
- Consumers own fetching, pagination, deduplication, and cancellation
- Active promises cannot be aborted by the hook
- `reset()` does not clear items or mutate scroll position
- Top/left prepending may require consumer-managed anchoring
- RTL horizontal `scrollLeft` behavior varies by browser
- Elastic overscroll may produce temporary unusual values
- Cross-origin iframe documents are unsupported
- ResizeObserver may be unavailable
- External DOM changes may require `check()` or `reset()`
- Virtualized lists may need virtualizer measurement integration
- SSR starts idle with no measurement
- Provide an accessible fallback/navigation strategy for long feeds
- `canLoadMore` should become false at the end of the dataset

See Storybook (`Hooks/useInfiniteScroll`) for the primary **Infinite list** example and additional direction, async, error, and playground stories.

### `useMouse`

Tracks mouse and optional touch coordinates for a target. Listens to `mousemove` and `dragover`, and optionally touch events.

```tsx
import { useMouse } from '@muradyanvano/react-hooks'

export function PointerCoordinates() {
  const { x, y, sourceType } = useMouse()

  return (
    <p>
      x: {x}, y: {y}, source: {sourceType ?? 'idle'}
    </p>
  )
}
```

Custom target with an element-relative extractor:

```tsx
import { useRef } from 'react'
import {
  useMouse,
  type UseMouseEventExtractor,
} from '@muradyanvano/react-hooks'

export function ElementRelativeTracker() {
  const surfaceRef = useRef<HTMLDivElement>(null)

  const extractor: UseMouseEventExtractor = (event) => {
    if (!(event instanceof MouseEvent)) {
      return null
    }

    return [event.offsetX, event.offsetY]
  }

  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    type: extractor,
    touch: false,
  })

  return (
    <div ref={surfaceRef}>
      offset x: {x}, y: {y}, source: {sourceType ?? 'idle'}
    </div>
  )
}
```

#### Options

| Option            | Type                                                                   | Default          | Description                                                                 |
| ----------------- | ---------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `enabled`         | `boolean`                                                              | `true`           | When `false`, no listeners are registered. Preserves last coordinates.      |
| `type`            | `'page' \| 'client' \| 'screen' \| 'movement' \| extractor`            | `'page'`         | Built-in coordinate mode or a custom extractor.                             |
| `target`          | `Window \| Document \| HTMLElement \| SVGElement \| RefObject \| null` | `window`         | Omitted → `window`. Explicit `null` → no listen.                            |
| `touch`           | `boolean`                                                              | `true`           | When `false`, no touch listeners are registered.                            |
| `scroll`          | `boolean`                                                              | `true`           | Recalculate page coordinates on owning-window scroll after first position.  |
| `resetOnTouchEnd` | `boolean`                                                              | `false`          | Reset to `initialValue` after the final active touch ends.                  |
| `initialValue`    | `{ x: number; y: number }`                                             | `{ x: 0, y: 0 }` | SSR/first-paint coordinates; also used by touch-end reset.                  |
| `eventFilter`     | `(invoke, event) => void`                                              | immediate invoke | Consumer-controlled scheduling/throttling for mouse/drag/touchmove updates. |

#### Behavior notes

- `mousemove` and `dragover` set `sourceType: 'mouse'`.
- Touch uses the first active touch (`touches`, then `changedTouches` fallback).
- Built-in `page` mode can update on owning-window scroll using the last client coordinates.
- Custom extractors own coordinate semantics; `null`/`undefined` preserves state; throws are contained.
- `eventFilter` delayed `invoke()` calls become no-ops after disable, target replacement, or unmount.
- Option-object identity and callback identity changes do not reset live coordinates.
- Changing `initialValue` after mount does not rewrite the current position.

#### SSR and StrictMode

- Importing the package does not touch `window`, `document`, `MouseEvent`, or `TouchEvent`.
- SSR returns `{ x: initialValue.x, y: initialValue.y, sourceType: null }` with no listeners.
- Effects clean up correctly under React StrictMode (one effective listener set).

#### Current limitations

- Mouse and optional touch only — not unified Pointer Events
- No pressure, tilt, pointer ID, or button-state API
- Movement values vary by browser and pointer-lock context
- One touch contact is tracked, not every concurrent touch
- Element targets do not automatically produce element-relative coordinates — use an extractor
- Cross-origin iframe targets are unsupported
- High-frequency events can cause frequent React renders — use `eventFilter` to throttle
- Consumer-delayed filters cannot be cancelled by the hook, but stale invocations are ignored
- The hook does not draw a cursor/marker and does not call `preventDefault()`

See Storybook (`Hooks/useMouse`) for the primary tracker, extractor, touch, drag, scroll, and playground examples.

### `useMousePressed`

Tracks whether a mouse, touch, or drag press lifecycle is currently active. Press-start listeners attach to the target; release listeners attach to the owning window only while a lifecycle is active.

```tsx
import { useRef } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

export function PressPad() {
  const targetRef = useRef<HTMLDivElement>(null)

  const { pressed, sourceType } = useMousePressed({
    target: targetRef,
  })

  return (
    <div ref={targetRef}>
      <p>{pressed ? 'Pressed' : 'Released'}</p>
      <p>Source: {sourceType ?? 'none'}</p>
    </div>
  )
}
```

#### Options

| Option         | Type                                                                   | Default  | Description                                                                  |
| -------------- | ---------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `enabled`      | `boolean`                                                              | `true`   | When `false`, no listeners are registered and state resets administratively. |
| `touch`        | `boolean`                                                              | `true`   | When `false`, no touch listeners are registered.                             |
| `drag`         | `boolean`                                                              | `true`   | When `false`, no drag listeners are registered.                              |
| `capture`      | `boolean`                                                              | `false`  | Capture phase for all hook-owned listeners.                                  |
| `initialValue` | `boolean`                                                              | `false`  | Initial `pressed` value; `sourceType` starts as `null`.                      |
| `target`       | `Window \| Document \| HTMLElement \| SVGElement \| RefObject \| null` | `window` | Omitted → `window`. Explicit `null` → no listen.                             |
| `onPressed`    | `(event) => void`                                                      | —        | Called once when transitioning to pressed.                                   |
| `onReleased`   | `(event) => void`                                                      | —        | Called once when transitioning to released via a native release event.       |

#### Behavior notes

- Mouse: `mousedown` on target; `mouseup` / `mouseleave` on owning window release.
- Touch: `touchstart` on target; final `touchend` / `touchcancel` on owning window release.
- Drag: `dragstart` on target; `dragend` / `drop` on owning window release.
- `mousedown` followed by `dragstart` is one lifecycle (one `onPressed`).
- Multi-touch stays pressed until the final active touch ends.
- Releasing outside the target still clears state via owning-window listeners.
- Administrative resets (disable, target change, touch/drag/capture change) do not call `onReleased`.
- `initialValue: true` starts pressed with unknown source until a real release event.

#### SSR and StrictMode

- SSR returns `{ pressed: initialValue, sourceType: null }` with no listeners.
- Effects clean up correctly under React StrictMode.

#### Current limitations

- Aggregate boolean only — no button, touch count, or pointer ID
- Not Pointer Events; no keyboard pressed state
- Does not call `preventDefault()` or make elements draggable
- Cross-origin iframe targets unsupported
- Administrative lifecycle changes reset without `onReleased`

See Storybook (`Hooks/useMousePressed`) for press-and-hold, drag, capture, and playground examples.

### `useParallax`

Tracks normalized parallax `roll` / `tilt` for a target element from mouse movement and optional device orientation. The hook returns values only — consumers own CSS transforms and motion design.

```tsx
import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function ParallaxCard() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(targetRef)

  return (
    <div ref={targetRef}>
      <div
        style={{
          transform: `translate3d(
            ${roll * 20}px,
            ${tilt * 20}px,
            0
          )`,
        }}
      >
        Move over the card
      </div>

      <p>
        roll: {roll.toFixed(3)}, tilt: {tilt.toFixed(3)}, source: {source}
      </p>
    </div>
  )
}
```

#### Options

| Option                        | Type                        | Default  | Description                                                                 |
| ----------------------------- | --------------------------- | -------- | --------------------------------------------------------------------------- |
| `enabled`                     | `boolean`                   | `true`   | When `false`, no listeners are registered and state resets to center/mouse. |
| `deviceOrientation`           | `boolean`                   | `true`   | When `false`, no `deviceorientation` listener is registered.                |
| `mouse`                       | `boolean`                   | `true`   | When `false`, no target `mousemove` listener is registered.                 |
| `clamp`                       | `boolean`                   | `true`   | Clamp final adjusted values to `[-0.5, 0.5]`.                               |
| `deviceOrientationTiltAdjust` | `(value: number) => number` | identity | Adjust normalized orientation tilt.                                         |
| `deviceOrientationRollAdjust` | `(value: number) => number` | identity | Adjust normalized orientation roll.                                         |
| `mouseTiltAdjust`             | `(value: number) => number` | identity | Adjust normalized mouse tilt.                                               |
| `mouseRollAdjust`             | `(value: number) => number` | identity | Adjust normalized mouse roll.                                               |

#### Coordinate convention

- `roll` is the horizontal axis; `tilt` is the vertical axis.
- Center is `{ roll: 0, tilt: 0 }`.
- Left / up are negative; right / down are positive.
- With default adjustment and clamping, both stay within `-0.5…0.5`.

#### Behavior notes

- Mouse: passive `mousemove` on the target; geometry is re-read via `getBoundingClientRect()` per event.
- Device orientation: passive `deviceorientation` on the target’s owning window; `gamma` → horizontal, `beta` → vertical; screen angle `0/90/180/270` rotates the sensor vector to visual axes.
- Source starts as `'mouse'`. Valid orientation samples switch to `'deviceOrientation'`; later mouse events can switch back. API presence alone does not switch source.
- The hook never calls `DeviceOrientationEvent.requestPermission()` — request permission from a user gesture in consumer code when required.
- Adjusters use latest-value refs without listener churn. Throwing or non-finite adjusters preserve previous state.
- Changing `clamp` or adjusters does not reset state or re-register listeners.
- Target replacement, null target, and `enabled: false` reset to `{ roll: 0, tilt: 0, source: 'mouse' }`.

#### SSR and StrictMode

- SSR returns `{ roll: 0, tilt: 0, source: 'mouse' }` with no listeners or measurements.
- Effects clean up correctly under React StrictMode.

#### Current limitations

- Device-orientation permission/availability varies by browser; secure context and user gesture may be required
- No smoothing, spring, easing, calibration, or sensor-staleness timeout
- Zero-size targets cannot produce mouse coordinates
- Cross-origin iframe targets unsupported
- The hook does not write CSS; consumers must respect reduced-motion preferences
- Visual input helper only — not an accessibility input method

See Storybook (`Hooks/useParallax`) for the layered scene, orientation simulation, and playground examples.

### `useScroll`

Tracks scroll position, arrival, direction, and scrolling state for an element, `window`, or `document` target. Returns reactive state and imperative scroll helpers — consumers own layout and styling.

```tsx
import { useRef, useState } from 'react'
import { useScroll } from '@muradyanvano/react-hooks'

export function ScrollDashboard() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [smooth, setSmooth] = useState(false)

  const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } =
    useScroll(scrollRef, {
      offset: { left: 30, top: 30, right: 30, bottom: 30 },
      behavior: smooth ? 'smooth' : 'auto',
    })

  return (
    <div>
      <label>
        X
        <input
          type="number"
          onChange={(event) => setX(Number(event.target.value))}
        />
      </label>
      <label>
        Y
        <input
          type="number"
          onChange={(event) => setY(Number(event.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={smooth}
          onChange={(event) => setSmooth(event.target.checked)}
        />
        Smooth
      </label>
      <button type="button" onClick={() => measure()}>
        Measure
      </button>
      <div ref={scrollRef} style={{ overflow: 'auto', height: 240 }}>
        <div style={{ width: '200%', height: '200%' }}>Scroll Me</div>
      </div>
      <p>
        {x}, {y} · scrolling: {String(isScrolling)}
      </p>
      <p>
        arrived: {JSON.stringify(arrivedState)} · directions:{' '}
        {JSON.stringify(directions)}
      </p>
    </div>
  )
}
```

#### Options

| Option                 | Type                                 | Default  | Description                                                                 |
| ---------------------- | ------------------------------------ | -------- | --------------------------------------------------------------------------- |
| `enabled`              | `boolean`                            | `true`   | When `false`, detaches listeners/observers and resets directions only.      |
| `throttle`             | `number`                             | `0`      | Minimum ms between measurements; leading + trailing. `0` disables throttle. |
| `idle`                 | `number`                             | `200`    | Ms after the last processed scroll before `isScrolling` becomes `false`.    |
| `offset`               | `{ left?, right?, top?, bottom? }`   | `0` each | Arrival margins subtracted from each edge before testing limits.            |
| `observe`              | `boolean \| { mutation?: boolean }`  | `false`  | When `true` or `{ mutation: true }`, remeasure on DOM mutations.            |
| `onScroll`             | `(event: Event) => void`             | —        | Called when a scroll event is processed (respects `throttle`).              |
| `onStop`               | `(event: Event) => void`             | —        | Called once when scrolling idles after the effective idle window.           |
| `onError`              | `(error: unknown) => void`           | —        | Called when metric reads or imperative scroll operations throw.             |
| `eventListenerOptions` | `boolean \| AddEventListenerOptions` | passive  | Native options for the hook-owned `scroll` listener.                        |
| `behavior`             | `'auto' \| 'smooth' \| 'instant'`    | `'auto'` | Default scroll behavior for `scrollTo` / `setX` / `setY`.                   |

Negative or non-finite `throttle` / `idle` / offset values normalize to their defaults.

#### Return value

```ts
{
  x: number
  y: number
  isScrolling: boolean
  arrivedState: { left: boolean; right: boolean; top: boolean; bottom: boolean }
  directions: { left: boolean; right: boolean; top: boolean; bottom: boolean }
  measure: () => void
  scrollTo: (position: { x: number; y: number }, behavior?: ScrollBehavior) => void
  setX: (x: number, behavior?: ScrollBehavior) => void
  setY: (y: number, behavior?: ScrollBehavior) => void
}
```

#### Behavior notes

- Passive `scroll` listener on the resolved target: elements/SVG directly; `Window` / `Document` on themselves.
- Metrics come from `scrollLeft` / `scrollTop` on elements or from `document.scrollingElement` for window/document targets.
- `x` / `y` update on scroll (subject to `throttle`), on attach, via `measure()`, and immediately after imperative scroll when `behavior` is `'auto'`.
- `throttle > 0` runs a leading measurement plus one trailing measurement per window.
- `isScrolling` becomes `true` on the first scroll in a session and `false` after `idle + throttle` ms without a processed event; `onStop` receives the last scroll event.
- `arrivedState` uses a 1px threshold plus optional offsets; non-scrollable axes report both edges as arrived.
- Horizontal RTL containers detect `negative` or `reverse` scroll modes from computed direction and initial `scrollLeft`.
- `directions` reflect the latest position delta; `measure()` and non-scroll remeasurements reset them without invoking callbacks.
- `scrollTo` / `setX` / `setY` no-op when disabled, when no target is attached, or when both coordinates are invalid.
- Optional `MutationObserver` (when `observe: true`) coalesces remeasurements through the owning window's animation frame or microtask.
- Latest callbacks and options are kept without listener churn. Listener-option changes reset `isScrolling` without calling `onStop`.
- Mutable refs do not trigger renders. After imperative `ref.current` assignment, a later React commit is required before the hook attaches to the new target.

#### SSR and StrictMode

- SSR returns idle state (`x: 0`, `y: 0`, `isScrolling: false`, default arrived/direction flags) with no listeners, observers, timers, or measurements.
- `measure`, `scrollTo`, `setX`, and `setY` are safe no-ops during SSR and after hydration when disabled or unattached.
- Effects clean up correctly under React StrictMode.

#### Current limitations

- Scroll-metric based, not IntersectionObserver based
- `smooth` / `instant` imperative scroll does not auto-sync state — rely on scroll events or call `measure()`
- Consumers own focus management and accessible scroll announcements
- Cross-origin iframe documents are unsupported
- `MutationObserver` may be unavailable in some environments
- Elastic overscroll may produce temporary unusual values
- RTL horizontal `scrollLeft` behavior varies by browser
- External DOM changes may require `measure()` unless `observe: { mutation: true }`
- Does not dedupe or cancel in-flight smooth-scroll animations
- After imperative `ref.current` assignment, a later React commit is required before attachment

See Storybook (`Hooks/useScroll`) for the scroll dashboard, vertical/horizontal galleries, throttle/idle demos, programmatic scroll, mutation observation, window/document targets, and playground examples.

### `useScrollLock`

Locks scrolling on an element, `window`, or `document` target by applying inline `overflow: hidden`. Returns requested lock state and stable `lock` / `unlock` / `toggle` helpers — consumers own focus management and dialog a11y.

```tsx
import { useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function LockedPanel() {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, unlock } = useScrollLock(ref, true)

  return (
    <div>
      <p>isLocked: {String(isLocked)}</p>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ height: '200%' }}>Starts locked</div>
      </div>
    </div>
  )
}
```

#### Options

| Option          | Type      | Default | Description                                                                  |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------- |
| `initialLocked` | `boolean` | `false` | Second argument. When `true`, requests a lock on the first available target. |

`initialLocked` is read for the initial React state only — later prop changes do not update `isLocked`.

#### Return value

```ts
{
  isLocked: boolean
  lock: () => void
  unlock: () => void
  toggle: () => void
}
```

#### Behavior notes

- Applies inline `overflow: hidden` on the resolved style-capable element. Does not suppress scroll/`wheel`/`touchmove` events and is not a focus trap.
- `Window` and `Document` targets resolve to the document scroll root (`scrollingElement`, then `documentElement` / `body` fallbacks). Targets that share a root share one lock record.
- Element and SVG targets lock themselves when they expose a writable inline style.
- `isLocked` is requested state for this hook instance. Multiple instances may lock the same resolved element via a `WeakMap` multi-owner registry; the original inline overflow (including `!important` priority) is restored only when the final owner releases.
- `lock` / `unlock` / `toggle` keep stable identities across rerenders.
- Unmount and target replacement release this instance’s ownership. Null or unresolved targets hold no lock.
- Mutable refs do not trigger renders. After imperative `ref.current` assignment, a later React commit is required before the lock can attach to the new target.

#### SSR and StrictMode

- SSR returns the requested `isLocked` from `initialLocked` with no style writes.
- `lock`, `unlock`, and `toggle` are safe to call during SSR; styles apply only in browser effects.
- Effects clean up correctly under React StrictMode so remounts do not leave orphan owners.

#### Current limitations

- Applies `overflow: hidden` (shorthand). Browsers may temporarily expand that into `overflow-x` / `overflow-y` while locked; unlock restores the snapshotted overflow axes (including `!important` on the shorthand)
- No event suppression, scrollbar-gutter compensation, or `position: fixed` body trick
- Not a focus trap or modal primitive — pair with consumer-owned dialog a11y
- Cross-origin iframe documents are unsupported
- Does not call `scrollTo()`; browsers usually keep scroll offsets, but layout can shift when a scrollbar disappears
- After imperative `ref.current` assignment, a later React commit is required before attachment
- Programmatic `scrollTop` / `scrollTo()` can still move a locked element
- Mobile Safari / embedded webview body locking can vary; no dedicated iOS fixed-body workaround
- SVG overflow behavior varies by browser
- `isLocked` is requested state and can be true while no target exists or if a style write fails

See Storybook (`Hooks/useScrollLock`) for the scroll lock demo, modal page lock, multiple owners, `initialLocked`, overflow restore, window/document/SVG targets, and playground examples.

### `useUserMedia`

Manages camera and microphone capture through `navigator.mediaDevices.getUserMedia`. Prefer imperative `start()` from a user gesture; `enabled` defaults to `false`.

```tsx
import { useEffect, useRef } from 'react'
import { useUserMedia } from '@muradyanvano/react-hooks'

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement>(null)

  const { stream, isSupported, isActive, isLoading, error, start, stop } =
    useUserMedia({
      constraints: {
        video: true,
        audio: false,
      },
    })

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

  if (!isSupported) {
    return <p>Camera access is not supported.</p>
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Camera preview"
      />

      <button
        type="button"
        onClick={() => {
          void start()
        }}
        disabled={isLoading}
      >
        Start camera
      </button>

      <button type="button" onClick={stop} disabled={!isActive}>
        Stop
      </button>

      {error != null && <p role="alert">{error.message}</p>}
    </>
  )
}
```

#### Options

| Option        | Type                     | Default                         | Description                                                                 |
| ------------- | ------------------------ | ------------------------------- | --------------------------------------------------------------------------- |
| `enabled`     | `boolean`                | `false`                         | Declarative auto-start once when flipped true (may need a user gesture).    |
| `autoSwitch`  | `boolean`                | `true`                          | Deep constraint changes reacquire while active/pending.                     |
| `constraints` | `MediaStreamConstraints` | `{ video: true, audio: false }` | Fresh default object; passed to `getUserMedia` without mutating the caller. |

#### Behavior notes

- `start()` replaces atomically: a failed replacement keeps the existing stream.
- `restart()` stops first, then requests; failure leaves the hook idle.
- `stop()` invalidates pending requests, detaches listeners, and stops owned tracks.
- `isActive` means the published stream has at least one live track.
- Track `ended` keeps the stream when another track remains live.
- `autoSwitch` compares deep constraint signatures (key order ignored; array order matters).
- Compose with `useDevicesList` for device IDs — the hooks remain independent.
- SSR returns unsupported idle state; support syncs after client mount.

#### Current limitations

- Requires a secure context in production (browser local-dev exceptions apply)
- Automatic `enabled` capture may be blocked without a user gesture
- Requested constraints are not guaranteed as actual settings
- No recording, WebRTC, audio-level analysis, or AbortSignal cancellation
- Stale resolved streams are stopped; the permission prompt cannot be cancelled
- `autoSwitch` reacquires rather than applying constraints to existing tracks
- Device labels/IDs and privacy controls vary by browser

See Storybook (`Hooks/useUserMedia`) for live and mocked camera/microphone examples.

### `useWebSocket`

Manages a browser `WebSocket` with optional send buffering, automatic reconnect, and application-level heartbeats. Connections are created only in effects — never during render or module evaluation.

```tsx
import { useState } from 'react'
import { useWebSocket } from '@muradyanvano/react-hooks'

export function ChatConnection() {
  const [message, setMessage] = useState('Hello')

  const { data, status, send, open, close } = useWebSocket<string>(
    'wss://example.com/socket',
    {
      immediate: false,
      autoReconnect: {
        retries: 3,
        delay: (attempt) => attempt * 1000,
      },
      heartbeat: {
        message: 'ping',
        responseMessage: 'pong',
        interval: 10_000,
        pongTimeout: 2_000,
      },
    },
  )

  return (
    <section>
      <p>Status: {status}</p>
      <p>Latest message: {data ?? 'None'}</p>

      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />

      <button type="button" onClick={open}>
        Connect
      </button>

      <button type="button" onClick={() => send(message)}>
        Send
      </button>

      <button type="button" onClick={() => close(1000, 'Done')}>
        Disconnect
      </button>
    </section>
  )
}
```

#### Options

| Option           | Type                                          | Default | Description                                                                |
| ---------------- | --------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `immediate`      | `boolean`                                     | `true`  | Connect after mount when a usable URL exists.                              |
| `autoConnect`    | `boolean`                                     | `true`  | Reconnect when the effective URL or protocols change.                      |
| `autoClose`      | `boolean`                                     | `true`  | Attach `beforeunload` to close the owned socket. Unmount always cleans up. |
| `autoReconnect`  | `boolean \| UseWebSocketAutoReconnectOptions` | `false` | Retry after unexpected native close. `true` means unlimited retries.       |
| `heartbeat`      | `boolean \| UseWebSocketHeartbeatOptions`     | `false` | Application-level ping/pong while open. `true` uses `ping` defaults.       |
| `protocols`      | `string \| readonly string[]`                 | —       | Subprotocol argument(s) passed to the native constructor.                  |
| `binaryType`     | `BinaryType`                                  | —       | Applied to new sockets; live updates do not reconnect.                     |
| `onConnected`    | `(socket) => void`                            | —       | Latest callback; identity changes do not reconnect.                        |
| `onDisconnected` | `(socket, event) => void`                     | —       | Latest callback after close.                                               |
| `onError`        | `(socket, event) => void`                     | —       | Latest callback; errors do not start reconnect (close does).               |
| `onMessage`      | `(socket, event) => void`                     | —       | Latest callback for non-heartbeat messages.                                |

#### Defaults detail

- Reconnect (`true` / missing fields): `retries: -1` (infinite), `delay: 1000`
- Heartbeat (`true` / missing fields): `message: 'ping'`, `responseMessage: message`, `interval: 1000`, `pongTimeout: 1000`
- `send(data, useBuffer = true)`
- Invalid negative / `NaN` / infinite timing values normalize to safe non-negative fallbacks (`1000` for reconnect delay and heartbeat interval/pong timeout)

#### Behavior notes

- Status lifecycle: `CLOSED` → `CONNECTING` → `OPEN` → `CLOSED`
- `data` holds the exact latest non-heartbeat `event.data` (no JSON parse, no clone)
- After close, `ws` retains the closed instance until a later `open()` replaces it (SSR/idle stay `null`)
- `send` buffers FIFO while not open when `useBuffer` is true; buffer is memory-based, instance-local, and unbounded; cleared on explicit `close`, endpoint change, and unmount; preserved across automatic reconnect
- Explicit `close()` never auto-reconnects; unexpected close may reconnect per policy
- Heartbeat responses are consumed internally and do not update `data` / `onMessage`; string responses use exact equality; `ArrayBuffer` responses compare byte-for-byte; `Blob` responses compare actual byte contents asynchronously (size and MIME type are only an early mismatch gate). A Blob comparison that finishes after the pong timeout or after socket replacement/close/unmount is ignored and cannot revive the connection.
- Heartbeat timeout closes with code `4000` and reason `Heartbeat timeout`
- React unmount always releases sockets, timers, listeners, and the buffer even when `autoClose` is `false`

#### Current limitations

- Prefer `wss://` from secure pages
- Browser WebSocket constructors do not support arbitrary request headers
- Avoid placing sensitive credentials in URLs; treat subprotocol auth carefully
- Validate and parse incoming messages in consumer code (no automatic JSON parsing)
- Not Socket.IO / SSE; no message persistence or cross-tab sharing
- Pending connects cannot be aborted via `AbortSignal`
- Heartbeats are application messages, not native protocol ping frames
- Background-tab timer throttling can delay reconnects and heartbeats
- SSR remains closed and idle

See Storybook (`Hooks/useWebSocket`) for the dashboard and mocked connection examples.

### `useLocalStorage`

Persists a value in `localStorage` with SSR-safe hydration, automatic serializers, same-document registry sync, and optional cross-tab `storage` events.

```tsx
import { useLocalStorage } from '@muradyanvano/react-hooks'

interface Preferences {
  theme: 'light' | 'dark'
  compact: boolean
}

const defaultPreferences: Preferences = {
  theme: 'light',
  compact: false,
}

export function PreferencesPanel() {
  const {
    value: preferences,
    setValue: setPreferences,
    reset,
    remove,
    isReady,
    error,
  } = useLocalStorage('app-preferences', defaultPreferences, {
    mergeDefaults: true,
  })

  if (!isReady) {
    return <p>Loading preferences…</p>
  }

  return (
    <section>
      <p>Theme: {preferences.theme}</p>

      <button
        type="button"
        onClick={() =>
          setPreferences((current) => ({
            ...current,
            theme: current.theme === 'light' ? 'dark' : 'light',
          }))
        }
      >
        Toggle theme
      </button>

      <button type="button" onClick={reset}>
        Reset defaults
      </button>

      <button type="button" onClick={remove}>
        Remove saved preferences
      </button>

      {error && <p role="alert">{error.message}</p>}
    </section>
  )
}
```

#### Options

| Option                   | Type                                     | Default | Description                                                                |
| ------------------------ | ---------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `serializer`             | `{ read, write }`                        | auto    | Completely replaces automatic serialization for the inferred default type. |
| `mergeDefaults`          | `boolean \| (stored, default) => merged` | `false` | Shallow-merge plain objects when `true`, or use a custom merge function.   |
| `writeDefaults`          | `boolean`                                | `true`  | Persist the default when the key is missing during initialization.         |
| `listenToStorageChanges` | `boolean`                                | `true`  | Same-document registry sync and native cross-tab `storage` events.         |
| `window`                 | `Window \| null`                         | global  | Omitted → global `window` after mount. Explicit `null` → unsupported.      |
| `onError`                | `(error: Error) => void`                 | no-op   | Latest callback; throws are contained and do not break ownership.          |

#### Automatic serializers

| Default value | Storage representation                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| string        | Raw string                                                                   |
| boolean       | `"true"` / `"false"`                                                         |
| number        | Decimal string; `NaN` / `Infinity` / `-Infinity` as tokens; `-0` becomes `0` |
| object/array  | JSON (`NaN`/`Infinity` become `null` in JSON)                                |
| Date          | ISO string (invalid dates are serialization errors)                          |
| Map           | JSON array of entries                                                        |
| Set           | JSON array of values                                                         |
| `null`        | JSON (`"null"`) — prefer an explicit serializer when ambiguous               |

#### Behavior notes

- Storage is read and written only in effects. The first client render matches SSR (`value: defaultValue`, `isReady: false`, `isSupported: false`).
- Malformed stored data sets `error`, falls back to the default locally, and does **not** automatically overwrite or delete the bad payload.
- `remove()` deletes the key; `reset()` writes the latest default.
- Cross-tab removal/clear resets to the latest default without immediately rewriting defaults (`writeDefaults` does not undo another tab’s deletion).
- Same-document sync uses a private `WeakMap` registry (not a public custom event). Multiple bundled copies of the package do not share that registry.
- `Object.is` equal updates skip re-renders and storage writes.
- Failed persistence keeps the new React value locally and does not notify peers.
- Changing `defaultValue` alone does not overwrite a stored value.

#### Current limitations

- Storage access is synchronous and can block the main thread
- Browser quotas and private/restricted modes may deny access
- Stored data is readable by same-origin scripts — never store passwords, tokens, or secrets without a security design (this is persistence, not encryption)
- JSON cannot preserve every JavaScript type; custom serializers own validation and migration
- Object mutation without `setValue` is not tracked
- Dynamic keys do not migrate data
- Consumers own versioning, schema migration, validation, and conflict resolution

See Storybook (`Hooks/useLocalStorage`) for the fruit editor and related examples.

### `useSessionStorage`

Persists a value in `sessionStorage` with the same SSR-safe hydration, serializers, controls, and same-document sync as `useLocalStorage`.

Session storage survives reloads in the same browsing context and is cleared when that top-level session ends. It is **not** a durable cross-tab store—ordinary separate tabs generally have separate session-storage areas.

```tsx
import { useSessionStorage } from '@muradyanvano/react-hooks'

interface CheckoutDraft {
  step: number
  email: string
  deliveryMethod: 'delivery' | 'pickup'
}

const emptyDraft: CheckoutDraft = {
  step: 1,
  email: '',
  deliveryMethod: 'delivery',
}

export function CheckoutProgress() {
  const {
    value: draft,
    setValue: setDraft,
    reset,
    remove,
    isReady,
    error,
  } = useSessionStorage('checkout-draft', emptyDraft, {
    mergeDefaults: true,
  })

  if (!isReady) {
    return <p>Loading checkout…</p>
  }

  return (
    <section>
      <p>Step {draft.step}</p>

      <input
        value={draft.email}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            email: event.target.value,
          }))
        }
      />

      <button
        type="button"
        onClick={() =>
          setDraft((current) => ({
            ...current,
            step: current.step + 1,
          }))
        }
      >
        Continue
      </button>

      <button type="button" onClick={reset}>
        Reset draft
      </button>

      <button type="button" onClick={remove}>
        Discard draft
      </button>

      {error && <p role="alert">{error.message}</p>}
    </section>
  )
}
```

Options, serializers, `remove` vs `reset`, merge defaults, and error semantics match `useLocalStorage`. Native `storage` events for session storage apply only to eligible related same-origin browsing contexts (for example some iframes), not ordinary separate tabs.

#### Current limitations

- Scoped to origin and top-level browsing session; usually does not sync across separate tabs
- Reloading the same tab preserves it; closing the tab/window ends the session
- Opener behavior may create an initial copied storage area
- Synchronous storage, quotas, and privacy restrictions still apply
- Not encryption — never store secrets without a security design
- Same-document sync is limited to one package copy and the same Storage object
- SSR returns defaults until client initialization

See Storybook (`Hooks/useSessionStorage`) for the checkout draft and related examples.

### `useCookies`

Reactive browser cookie manager with safe parsing, attribute formatting, same-document synchronization, Cookie Store observation when available, and shared polling fallback.

```tsx
import { useCookies } from '@muradyanvano/react-hooks'

export function LocaleSelector() {
  const cookies = useCookies(['locale'])

  const locale = cookies.get<string>('locale') ?? 'en-US'

  return (
    <section>
      <p>Current locale: {locale}</p>

      <button
        type="button"
        onClick={() =>
          cookies.set('locale', 'en-US', {
            path: '/',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365,
          })
        }
      >
        English
      </button>

      <button
        type="button"
        onClick={() =>
          cookies.set('locale', 'hy-AM', {
            path: '/',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365,
          })
        }
      >
        Armenian
      </button>

      <button
        type="button"
        onClick={() => cookies.remove('locale', { path: '/' })}
      >
        Use default
      </button>

      {cookies.error && <p role="alert">{cookies.error.message}</p>}
    </section>
  )
}
```

#### Defaults

| Option                   | Default     | Notes                                                   |
| ------------------------ | ----------- | ------------------------------------------------------- |
| `dependencies`           | `undefined` | Rerender for any visible cookie change                  |
| `doNotParse`             | `false`     | JSON-parse decoded values when possible                 |
| `autoUpdateDependencies` | `false`     | When `true`, names passed to `get()` join the watch set |
| `document`               | omitted     | Resolved after mount                                    |
| `initialCookies`         | omitted     | SSR/request Cookie-header injection                     |
| `watch`                  | `true`      | Cookie Store events or shared polling                   |
| `pollingInterval`        | `1000`      | Shared per-document; smallest active interval wins      |

Dependency rules: `undefined`/`null` watch all; `[]` never rerender for value changes; a non-empty list filters by name; auto-collected names union with explicit ones.

#### Current limitations

- JavaScript cannot read or create `HttpOnly` cookies
- Do not store sensitive auth tokens in script-readable cookies without a security design
- Assignment success does not guarantee browser acceptance
- Deletion requires matching `path` / `domain`
- `SameSite=None` generally requires `Secure`
- Attributes cannot be reconstructed from `document.cookie`
- External observation may use Cookie Store events or polling
- SSR reads require explicit `initialCookies`; response `Set-Cookie` stays the server framework’s job

See Storybook (`Hooks/useCookies`) for the locale preferences and related examples.

### `useJwt`

Decode compact JWS-style JWT header and payload contents synchronously. **Decoding a JWT does not verify its signature or prove that its claims are trustworthy.**

```tsx
import { useJwt, type UseJwtPayload } from '@muradyanvano/react-hooks'

interface AccessTokenPayload extends UseJwtPayload {
  name?: string
  roles?: readonly string[]
}

export function TokenSummary({ token }: { token: string }) {
  const { header, payload, errors } = useJwt<AccessTokenPayload>(token)

  if (errors.length > 0) {
    return <p role="alert">The token could not be decoded.</p>
  }

  return (
    <section>
      <p>Algorithm claim: {String(header?.alg ?? 'Unknown')}</p>
      <p>Subject: {payload?.sub ?? 'Unknown'}</p>
      <p>Name: {payload?.name ?? 'Unknown'}</p>

      <strong>Decoded only — signature not verified</strong>
    </section>
  )
}
```

Use only synthetic demonstration tokens in documentation and examples. Never paste production tokens into Storybook, screenshots, logs, support tickets, or public issue reports.

#### Defaults

| Option          | Default | Notes                                              |
| --------------- | ------- | -------------------------------------------------- |
| `fallbackValue` | `null`  | Returned for failed header and/or payload sections |
| `onError`       | no-op   | Client-effect-only; not called during SSR          |

Leading/trailing whitespace around the entire token is trimmed. Whitespace inside segments is not removed and causes a decode error. Supported tokens have exactly three segments (`header.payload.signature`). The signature segment is not decoded or validated. Encrypted five-part compact tokens are unsupported.

#### Current limitations

- Decoding is not signature verification, authentication, or authorization
- Never authorize users based only on decoded client-side claims
- Validate algorithm, issuer, audience, expiration, not-before, nonce, and required claims in a trusted verification layer
- Do not trust `alg` from the token without an allowlist; `alg: "none"` is not proof of validity
- `exp`, `nbf`, and `iat` are NumericDate seconds, not JavaScript milliseconds
- This hook does not automatically reject expired or not-yet-valid tokens
- Client clocks can be wrong
- Header and payload are only encoded, not encrypted — tokens may contain sensitive information
- TypeScript generics do not validate runtime claim shapes
- `onError` runs after decode in a client effect for each newly supplied invalid token; unrelated rerenders and callback identity changes do not replay the same decoding errors; Strict Mode replay is deduplicated; synchronous `errors` are available during SSR
- Token contents are not included in generated error messages

See Storybook (`Hooks/useJwt`) for the JWT inspector and related examples.

---

### `useNProgress`

Package-native top-of-page progress indicator with shared document-level ownership. Zero external dependencies — all DOM work is handled by the hook itself.

```tsx
import { useNProgress } from '@muradyanvano/react-hooks'

// Imperative usage
function App() {
  const { isLoading, progress, start, done } = useNProgress()

  const loadData = async () => {
    start()
    try {
      await fetchSomeData()
    } finally {
      done()
    }
  }

  return (
    <main>
      {isLoading ? <p>Loading {Math.round((progress ?? 0) * 100)}%</p> : null}
      <button type="button" onClick={loadData}>
        Load
      </button>
    </main>
  )
}

// Declarative usage (pass progress value directly)
function Upload({ progress }: { progress: number | null }) {
  // null → complete, number < 1 → set progress, number >= 1 → complete
  const { isLoading } = useNProgress(progress)
  return <p>{isLoading ? 'Uploading…' : 'Done'}</p>
}
```

**Options** (all optional):

| Option         | Type                  | Default                   | Description                               |
| -------------- | --------------------- | ------------------------- | ----------------------------------------- |
| `minimum`      | `number`              | `0.08`                    | Minimum starting progress (0–1)           |
| `easing`       | `string`              | `'ease'`                  | CSS easing for the bar transition         |
| `speed`        | `number`              | `200`                     | Transition duration in ms                 |
| `trickle`      | `boolean`             | `true`                    | Auto-advance progress over time           |
| `trickleSpeed` | `number`              | `200`                     | Trickle tick interval in ms               |
| `showSpinner`  | `boolean`             | `true`                    | Show corner spinner                       |
| `color`        | `string`              | `'#4f46e5'`               | Progress bar color                        |
| `height`       | `number`              | `3`                       | Bar height in pixels                      |
| `zIndex`       | `number`              | `1031`                    | CSS z-index of the root element           |
| `removeDelay`  | `number`              | `200`                     | Delay after transition before DOM removal |
| `ariaLabel`    | `string`              | `'Page loading progress'` | ARIA label for the progress bar           |
| `document`     | `Document \| null`    | globalThis.document       | Target document (`null` = disabled)       |
| `parent`       | `HTMLElement \| null` | `document.body`           | Parent element (`null` = disabled)        |

**Return values:**

| Field                | Type                    | Description                           |
| -------------------- | ----------------------- | ------------------------------------- |
| `isLoading`          | `boolean`               | True while this owner is active       |
| `progress`           | `number \| null`        | Current progress (null when idle)     |
| `start()`            | `() => void`            | Begin loading from minimum            |
| `set(value)`         | `(n: number) => void`   | Set exact progress (≥1 triggers done) |
| `increment(amount?)` | `(n?: number) => void`  | Advance by auto or explicit amount    |
| `done(force?)`       | `(b?: boolean) => void` | Complete with transition animation    |
| `remove()`           | `() => void`            | Immediately release with no animation |

**Key behaviors:**

- Multiple hook instances sharing `(document, parent)` share one visual bar. The bar shows the minimum active progress.
- SSR-safe: idle state on the server, no DOM work, no `useLayoutEffect`.
- StrictMode-safe: effect cleanup ensures exactly one active owner.
- Reduced motion: injected stylesheet includes `prefers-reduced-motion` media query.
- Custom parent: progress is `position: absolute` inside the parent element.

See Storybook (`Hooks/useNProgress`) for 20 interactive examples.

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
