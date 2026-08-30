export const overviewSnippet = `import { useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const
const SIZE = 3

export function ArrowGridNavigator() {
  const [row, setRow] = useState(1)
  const [col, setCol] = useState(1)
  const [lastKey, setLastKey] = useState('None yet')
  const [eventCount, setEventCount] = useState(0)

  useOnKeyStroke([...ARROWS], (event) => {
    event.preventDefault()
    setLastKey(event.key)
    setEventCount((count) => count + 1)

    setRow((current) => {
      if (event.key === 'ArrowUp') {
        return Math.max(0, current - 1)
      }
      if (event.key === 'ArrowDown') {
        return Math.min(SIZE - 1, current + 1)
      }
      return current
    })
    setCol((current) => {
      if (event.key === 'ArrowLeft') {
        return Math.max(0, current - 1)
      }
      if (event.key === 'ArrowRight') {
        return Math.min(SIZE - 1, current + 1)
      }
      return current
    })
  })

  return (
    <div>
      <div role="grid" aria-label="Selection grid">
        {Array.from({ length: SIZE }, (_, r) => (
          <div key={r} role="row">
            {Array.from({ length: SIZE }, (_, c) => (
              <div
                key={c}
                role="gridcell"
                aria-selected={r === row && c === col}
              >
                {r},{c}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p>Last key: {lastKey}</p>
      <p>Events: {eventCount}</p>
      <button
        type="button"
        onClick={() => {
          setRow(1)
          setCol(1)
          setLastKey('None yet')
          setEventCount(0)
        }}
      >
        Reset
      </button>
    </div>
  )
}`

export const commandSnippet = `import { useId, useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function CommandPaletteShortcut() {
  const [open, setOpen] = useState(false)
  const [shortcutCount, setShortcutCount] = useState(0)
  const inputId = useId()

  useOnKeyStroke(
    (event) =>
      (event.key === 'k' || event.key === 'K') &&
      (event.ctrlKey || event.metaKey),
    (event) => {
      if (isEditableTarget(event.target)) {
        return
      }
      event.preventDefault()
      setOpen(true)
      setShortcutCount((count) => count + 1)
    },
  )

  useOnKeyStroke('Escape', () => {
    setOpen(false)
  })

  return (
    <div>
      <p>Press Ctrl/Cmd+K to open. Escape closes.</p>
      <p>Open: {open ? 'Yes' : 'No'} · Shortcuts: {shortcutCount}</p>
      <label htmlFor={inputId}>
        Type here (shortcut ignored while focused)
        <input id={inputId} type="text" />
      </label>
      {open ? (
        <div role="dialog" aria-label="Command panel">
          <p>Command panel</p>
          <input type="text" placeholder="Search commands…" />
        </div>
      ) : null}
    </div>
  )
}`

export const multipleKeysSnippet = `import { useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

const MEDIA_KEYS = [' ', 'Enter'] as const

export function MediaToggleKeys() {
  const [last, setLast] = useState('None yet')
  const [count, setCount] = useState(0)

  useOnKeyStroke([...MEDIA_KEYS], (event) => {
    event.preventDefault()
    setLast(\`Matched: \${event.key === ' ' ? 'Space' : event.key}\`)
    setCount((value) => value + 1)
  })

  useOnKeyStroke(true, (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      return
    }
    setLast(\`Ignored: \${event.key}\`)
  })

  return (
    <div>
      <p>Space or Enter toggles playback.</p>
      <p>{last}</p>
      <p>Matched count: {count}</p>
    </div>
  )
}`

export const repeatedSnippet = `import { useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

function dispatchArrowRight(repeat: boolean) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      bubbles: true,
      cancelable: true,
      repeat,
    }),
  )
}

export function RepeatComparison() {
  const [offCount, setOffCount] = useState(0)
  const [onCount, setOnCount] = useState(0)

  useOnKeyStroke('ArrowRight', () => {
    setOffCount((count) => count + 1)
  })

  useOnKeyStroke(
    'ArrowRight',
    () => {
      setOnCount((count) => count + 1)
    },
    { dedupe: true },
  )

  return (
    <div>
      <p>dedupe false: {offCount}</p>
      <p>dedupe true: {onCount}</p>
      <button type="button" onClick={() => dispatchArrowRight(false)}>
        Fire normal ArrowRight
      </button>
      <button type="button" onClick={() => dispatchArrowRight(true)}>
        Fire repeat ArrowRight
      </button>
    </div>
  )
}`

export const customTargetSnippet = `import { useRef, useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

export function RegionScopedEnter() {
  const regionRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  useOnKeyStroke(
    'Enter',
    () => {
      setCount((value) => value + 1)
    },
    { target: regionRef },
  )

  return (
    <div>
      <div
        ref={regionRef}
        tabIndex={0}
        aria-label="Key region"
      >
        Focus this region, then press Enter.
      </div>
      <button type="button">Outside control</button>
      <p>Region Enter count: {count}</p>
    </div>
  )
}`

export const keyupSnippet = `import { useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

export function KeyupOnlyListener() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('None yet')

  useOnKeyStroke(
    true,
    (event) => {
      setCount((value) => value + 1)
      setLast(event.key)
    },
    { eventType: 'keyup' },
  )

  return (
    <div>
      <p>Only keyup events are counted. Keydown is ignored.</p>
      <p>Last keyup: {last}</p>
      <p>Count: {count}</p>
    </div>
  )
}`

export const enabledSnippet = `import { useId, useState } from 'react'
import { useOnKeyStroke } from '@muradyanvano/react-hooks'

export function PausableKeyListener() {
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState(0)
  const enabledId = useId()

  useOnKeyStroke(
    true,
    () => {
      setCount((value) => value + 1)
    },
    { enabled },
  )

  return (
    <div>
      <label htmlFor={enabledId}>
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Listening enabled
      </label>
      <p>Key events: {count}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import {
  useOnKeyStroke,
  type KeyStrokeEventType,
} from '@muradyanvano/react-hooks'

type Options = {
  enabled?: boolean
  eventType?: KeyStrokeEventType
  dedupe?: boolean
  capture?: boolean
  passive?: boolean
}

export function Playground({
  enabled = true,
  eventType = 'keydown',
  dedupe = false,
  capture = false,
  passive = false,
}: Options) {
  const [count, setCount] = useState(0)
  const [lastKey, setLastKey] = useState('None yet')
  const [modifiers, setModifiers] = useState('—')
  const [repeat, setRepeat] = useState('false')

  useOnKeyStroke(
    true,
    (event) => {
      setCount((value) => value + 1)
      setLastKey(event.key)
      setModifiers(
        [
          event.ctrlKey ? 'Ctrl' : null,
          event.metaKey ? 'Meta' : null,
          event.altKey ? 'Alt' : null,
          event.shiftKey ? 'Shift' : null,
        ]
          .filter(Boolean)
          .join('+') || 'None',
      )
      setRepeat(String(event.repeat))
    },
    { enabled, eventType, dedupe, capture, passive },
  )

  return (
    <div>
      <p>Last key: {lastKey}</p>
      <p>Modifiers: {modifiers}</p>
      <p>Repeat: {repeat}</p>
      <p>Count: {count}</p>
      <button
        type="button"
        onClick={() => {
          setCount(0)
          setLastKey('None yet')
          setModifiers('—')
          setRepeat('false')
        }}
      >
        Reset
      </button>
    </div>
  )
}`
