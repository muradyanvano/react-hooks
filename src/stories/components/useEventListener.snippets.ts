export const overviewSnippet = `import { useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

function categorizeWidth(width: number) {
  if (width < 640) {
    return 'compact'
  }
  if (width < 1024) {
    return 'comfortable'
  }
  return 'wide'
}

export function ViewportResizeMonitor() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  )
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 0,
  )
  const [resizeCount, setResizeCount] = useState(0)

  useEventListener('resize', () => {
    setWidth(window.innerWidth)
    setHeight(window.innerHeight)
    setResizeCount((count) => count + 1)
  })

  const category = categorizeWidth(width)

  return (
    <div>
      <p>
        {width}×{height} · {category}
      </p>
      <p>Resize events: {resizeCount}</p>
      <button
        type="button"
        onClick={() => {
          setResizeCount(0)
        }}
      >
        Reset count
      </button>
    </div>
  )
}`

export const elementTargetSnippet = `import { useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

export function ButtonPointerTracker() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [moveCount, setMoveCount] = useState(0)
  const [clickCount, setClickCount] = useState(0)

  useEventListener(buttonRef, 'pointermove', (event) => {
    setX(Math.round(event.clientX))
    setY(Math.round(event.clientY))
    setMoveCount((count) => count + 1)
  })

  useEventListener(buttonRef, 'click', () => {
    setClickCount((count) => count + 1)
  })

  return (
    <div>
      <button ref={buttonRef} type="button">
        Move pointer or click
      </button>
      <p>
        Pointer: {x}, {y}
      </p>
      <p>Moves: {moveCount}</p>
      <p>Clicks: {clickCount}</p>
    </div>
  )
}`

export const multipleEventsSnippet = `import { useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

export function HoverZone() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const [inside, setInside] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEventListener(zoneRef, ['mouseenter', 'mouseleave'], (event) => {
    const nextInside = event.type === 'mouseenter'
    setInside(nextInside)
    setHistory((entries) => [event.type, ...entries].slice(0, 5))
  })

  return (
    <div>
      <div ref={zoneRef} tabIndex={0} aria-label="Hover zone">
        Hover or focus this zone
      </div>
      <p>{inside ? 'Inside' : 'Outside'}</p>
      <ul>
        {history.map((entry, index) => (
          <li key={\`\${entry}-\${index}\`}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

type TargetId = 'alpha' | 'beta'

export function SwitchableTargets() {
  const alphaRef = useRef<HTMLDivElement>(null)
  const betaRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<TargetId>('alpha')
  const [lastTarget, setLastTarget] = useState('None yet')
  const [eventCount, setEventCount] = useState(0)

  const activeRef = activeId === 'alpha' ? alphaRef : betaRef

  // Switching via React state re-commits so the hook syncs to the new ref.
  useEventListener(activeRef, 'click', () => {
    setLastTarget(activeId)
    setEventCount((count) => count + 1)
  })

  return (
    <div>
      <label>
        Active target
        <select
          value={activeId}
          onChange={(event) => {
            setActiveId(event.target.value as TargetId)
          }}
        >
          <option value="alpha">Alpha</option>
          <option value="beta">Beta</option>
        </select>
      </label>
      <div ref={alphaRef} role="button" tabIndex={0}>
        Alpha panel
      </div>
      <div ref={betaRef} role="button" tabIndex={0}>
        Beta panel
      </div>
      <p>Active: {activeId}</p>
      <p>Last reported: {lastTarget}</p>
      <p>Events: {eventCount}</p>
    </div>
  )
}`

export const customEventSnippet = `import { useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

type ItemDetail = { id: string; label: string }

const ITEMS: ItemDetail[] = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
]

export function CustomItemSelected() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<ItemDetail | null>(null)

  useEventListener(
    targetRef,
    'item:selected',
    (event: CustomEvent<{ id: string; label: string }>) => {
      setSelected(event.detail)
    },
  )

  return (
    <div ref={targetRef}>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            targetRef.current?.dispatchEvent(
              new CustomEvent('item:selected', {
                detail: item,
                bubbles: true,
              }),
            )
          }}
        >
          Select {item.label}
        </button>
      ))}
      <p>
        Selected:{' '}
        {selected ? \`\${selected.id} · \${selected.label}\` : 'None yet'}
      </p>
    </div>
  )
}`

export const onceAndEnabledSnippet = `import { useId, useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

export function OnceClickListener() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Armed — waiting for first click')
  const enabledId = useId()

  // once: true fires for the first matching event only.
  // Changing the handler does not re-arm. Toggle enabled off/on to reset.
  useEventListener(
    buttonRef,
    'click',
    () => {
      setCount((value) => value + 1)
      setStatus('Consumed — further clicks ignored until re-armed')
    },
    { once: true, enabled },
  )

  return (
    <div>
      <label htmlFor={enabledId}>
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            const next = event.target.checked
            setEnabled(next)
            if (next) {
              setStatus('Armed — waiting for first click')
            } else {
              setStatus('Paused — listener not registered')
            }
          }}
        />
        Listening enabled
      </label>
      <button ref={buttonRef} type="button">
        Fire once
      </button>
      <p>{status}</p>
      <p>Handled: {count}</p>
    </div>
  )
}`

export const abortSignalSnippet = `import { useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

export function AbortableClicks() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [controller, setController] = useState(() => new AbortController())
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState('Listening')

  useEventListener(
    buttonRef,
    'click',
    () => {
      setCount((value) => value + 1)
    },
    { signal: controller.signal },
  )

  return (
    <div>
      <button ref={buttonRef} type="button">
        Click target
      </button>
      <button
        type="button"
        onClick={() => {
          controller.abort()
          setPhase('Aborted — clicks ignored')
        }}
      >
        Abort signal
      </button>
      <button
        type="button"
        onClick={() => {
          setController(new AbortController())
          setPhase('Listening')
        }}
      >
        New controller
      </button>
      <p>{phase}</p>
      <p>Clicks: {count}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

type Options = {
  enabled?: boolean
  capture?: boolean
  passive?: boolean
  once?: boolean
}

export function Playground({
  enabled = true,
  capture = false,
  passive = false,
  once = false,
}: Options) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [count, setCount] = useState(0)

  useEventListener(
    buttonRef,
    'click',
    () => {
      setCount((value) => value + 1)
    },
    { enabled, capture, passive, once },
  )

  return (
    <div>
      <p>
        {[
          enabled ? 'enabled' : 'paused',
          capture ? 'capture' : null,
          passive ? 'passive' : null,
          once ? 'once' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <button ref={buttonRef} type="button">
        Click me
      </button>
      <p>Clicks: {count}</p>
      <button
        type="button"
        onClick={() => {
          setCount(0)
        }}
      >
        Reset
      </button>
    </div>
  )
}`
