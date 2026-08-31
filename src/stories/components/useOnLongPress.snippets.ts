export const overviewSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

export function HoldToFavorite() {
  const [favorited, setFavorited] = useState(false)
  const [count, setCount] = useState(0)
  const [lastRelease, setLastRelease] = useState('None yet')
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setFavorited(true)
      setCount((value) => value + 1)
    },
    {
      delay: 500,
      onRelease: (details) => {
        setLastRelease(
          details.isLongPress
            ? \`Long press · \${Math.round(details.duration)}ms\`
            : \`Short press · \${Math.round(details.duration)}ms\`,
        )
      },
    },
  )

  return (
    <div>
      <button
        ref={targetRef}
        type="button"
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        {favorited ? 'Favorited' : 'Hold to favorite'}
      </button>

      <button type="button" onClick={() => setFavorited(true)}>
        Favorite with click
      </button>

      <p>Activations: {count}</p>
      <p>{lastRelease}</p>
    </div>
  )
}`

export const delayComparisonSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

function HoldTarget({
  label,
  delay,
}: {
  label: string
  delay: number | ((event: PointerEvent) => number)
}) {
  const [count, setCount] = useState(0)
  const [pointerType, setPointerType] = useState('—')
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    (event) => {
      setCount((value) => value + 1)
      setPointerType(event.pointerType || 'unknown')
    },
    { delay },
  )

  return (
    <div>
      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        {label}
      </button>
      <p>Count: {count}</p>
      <p>Pointer: {pointerType}</p>
    </div>
  )
}

export function DelayComparison() {
  return (
    <div>
      <HoldTarget label="300 ms" delay={300} />
      <HoldTarget label="500 ms" delay={500} />
      <HoldTarget
        label="Dynamic"
        delay={(event) => (event.pointerType === 'touch' ? 800 : 500)}
      />
    </div>
  )
}`

export const movementSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

export function MovementDemo() {
  const [status, setStatus] = useState('Idle')
  const [distance, setDistance] = useState(0)
  const [count, setCount] = useState(0)
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setStatus('Activated')
      setCount((value) => value + 1)
    },
    {
      delay: 500,
      distanceThreshold: 10,
      onRelease: (details) => {
        setDistance(details.distance)
        if (!details.isLongPress) {
          setStatus(
            details.distance > 10 ? 'Cancelled by movement' : 'Released early',
          )
        }
      },
    },
  )

  return (
    <div>
      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        Hold still (10px tolerance)
      </button>
      <p>Status: {status}</p>
      <p>Max distance: {distance.toFixed(1)}px</p>
      <p>Activations: {count}</p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Activate with click
      </button>
    </div>
  )
}`

export const releaseMetricsSnippet = `import { useRef, useState } from 'react'
import {
  useOnLongPress,
  type UseOnLongPressReleaseDetails,
} from '@muradyanvano/react-hooks'

export function ReleaseInspector() {
  const [count, setCount] = useState(0)
  const [release, setRelease] =
    useState<UseOnLongPressReleaseDetails | null>(null)
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setCount((value) => value + 1)
    },
    {
      delay: 400,
      onRelease: (details) => {
        setRelease(details)
      },
    },
  )

  return (
    <div>
      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        Hold or tap
      </button>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Activate with click
      </button>
      <p>Activations: {count}</p>
      {release ? (
        <ul>
          <li>Duration: {Math.round(release.duration)}ms</li>
          <li>Distance: {release.distance.toFixed(1)}px</li>
          <li>Pointer: {release.event.pointerType}</li>
          <li>Button: {release.event.button}</li>
          <li>{release.isLongPress ? 'Long press' : 'Short press'}</li>
        </ul>
      ) : null}
    </div>
  )
}`

export const selfSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

function SelfDemo({ self }: { self: boolean }) {
  const [status, setStatus] = useState('Idle')
  const targetRef = useRef<HTMLDivElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setStatus('Accepted')
    },
    {
      delay: 300,
      self,
      onRelease: (details) => {
        if (!details.isLongPress) {
          setStatus('Released early')
        }
      },
    },
  )

  return (
    <div
      ref={targetRef}
      role="button"
      tabIndex={0}
      style={{ touchAction: 'none' }}
    >
      Outer target (self: {String(self)})
      <span>Inner descendant</span>
      <p>{status}</p>
    </div>
  )
}

export function SelfComparison() {
  return (
    <div>
      <SelfDemo self={false} />
      <SelfDemo self={true} />
    </div>
  )
}`

export const enabledSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

export function EnabledDemo() {
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState(0)
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setCount((value) => value + 1)
    },
    { enabled, delay: 400 },
  )

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Long-press detection enabled
      </label>

      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        Hold to activate
      </button>

      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Activate with click
      </button>

      <p>Activations: {count}</p>
    </div>
  )
}`

export const pointerTypesSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

export function PointerTypeDemo() {
  const [count, setCount] = useState(0)
  const [pointerType, setPointerType] = useState('—')
  const [resolvedDelay, setResolvedDelay] = useState('—')
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    (event) => {
      setCount((value) => value + 1)
      setPointerType(event.pointerType || 'unknown')
      setResolvedDelay(event.pointerType === 'touch' ? '800 ms' : '500 ms')
    },
    {
      delay: (event) => (event.pointerType === 'touch' ? 800 : 500),
    },
  )

  return (
    <div>
      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        Hold (delay depends on pointer type)
      </button>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Activate with click
      </button>
      <p>Activations: {count}</p>
      <p>Pointer type: {pointerType}</p>
      <p>Resolved delay: {resolvedDelay}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useOnLongPress } from '@muradyanvano/react-hooks'

export function Playground() {
  const [count, setCount] = useState(0)
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(0)
  const [pointerType, setPointerType] = useState('—')
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    (event) => {
      setCount((value) => value + 1)
      setPointerType(event.pointerType || 'unknown')
    },
    {
      enabled: true,
      delay: 500,
      distanceThreshold: 10,
      button: 0,
      self: false,
      preventDefault: false,
      stopPropagation: false,
      capture: false,
      onRelease: (details) => {
        setDuration(details.duration)
        setDistance(details.distance)
      },
    },
  )

  return (
    <div>
      <button ref={targetRef} type="button" style={{ touchAction: 'none' }}>
        Hold to activate
      </button>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Activate with click
      </button>
      <p>Count: {count}</p>
      <p>Duration: {Math.round(duration)}ms</p>
      <p>Distance: {distance.toFixed(1)}px</p>
      <p>Pointer: {pointerType}</p>
    </div>
  )
}`
