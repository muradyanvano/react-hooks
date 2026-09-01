export const xyCoordinatesSnippet = `import { useEffect, useRef, useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function ElementInspector() {
  const boxRef = useRef<HTMLDivElement>(null)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const { element } = useElementByPoint({ x, y })

  useEffect(() => {
    const target = boxRef.current
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

      <div ref={boxRef}>Inspectable target</div>

      <output>
        {element == null ? 'No element' : element.tagName.toLowerCase()}
      </output>
    </section>
  )
}`

export const pointerInspectorSnippet = `import { useCallback, useState } from 'react'
import type { PointerEvent } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function LiveInspector() {
  const [point, setPoint] = useState({ x: -1, y: -1 })
  const { element } = useElementByPoint(point)

  const handlePointerMove = useCallback((event: PointerEvent) => {
    setPoint({ x: event.clientX, y: event.clientY })
  }, [])

  return (
    <article onPointerMove={handlePointerMove}>
      <p>
        Hover over <strong>bold text</strong>, a{' '}
        <a href="#docs">link</a>, or <code>inline code</code> below.
      </p>

      <dl>
        <dt>Tag</dt>
        <dd>{element?.tagName.toLowerCase() ?? '—'}</dd>
        <dt>Class</dt>
        <dd>{element?.className || '—'}</dd>
        <dt>Text</dt>
        <dd>{element?.textContent?.trim().slice(0, 40) ?? '—'}</dd>
      </dl>
    </article>
  )
}`

export const multipleElementsSnippet = `import { useCallback, useState } from 'react'
import type { PointerEvent } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function StackInspector() {
  const [point, setPoint] = useState({ x: -1, y: -1 })
  // multiple: true switches the return shape to a readonly Element[],
  // ordered topmost-first, exactly like document.elementsFromPoint.
  const { element: stack } = useElementByPoint({ ...point, multiple: true })

  const handlePointerMove = useCallback((event: PointerEvent) => {
    setPoint({ x: event.clientX, y: event.clientY })
  }, [])

  return (
    <div onPointerMove={handlePointerMove}>
      <ol>
        {stack.map((node, index) => (
          <li key={index}>
            {index + 1}. {node.tagName.toLowerCase()}
          </li>
        ))}
      </ol>
      {/*
        elementsFromPoint also reports ancestor containers all the way up
        to <html> — filter to the elements you actually care about before
        rendering, rather than assuming only your own targets are present.
      */}
    </div>
  )
}`

export const pauseResumeSnippet = `import { useCallback, useState } from 'react'
import type { PointerEvent } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function FreezableInspector() {
  const [point, setPoint] = useState({ x: -1, y: -1 })
  const { element, isPaused, pause, resume } = useElementByPoint(point)

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      // Coordinates keep updating even while paused — pause() only
      // freezes the *lookup result*, not this component's own state.
      setPoint({ x: event.clientX, y: event.clientY })
    },
    [],
  )

  return (
    <div onPointerMove={handlePointerMove}>
      <button type="button" onClick={isPaused ? resume : pause}>
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      <p>Result: {element?.tagName.toLowerCase() ?? 'none'}</p>
      {/* resume() schedules a fresh lookup with the latest x/y (sync: immediate, animationFrame: next frame). */}
    </div>
  )
}`

export const manualUpdateSnippet = `import { useRef, useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function RefreshOnDemand() {
  // A point fixed once — it never changes, so the hook never reactively
  // re-runs on its own when the DOM underneath it moves.
  const [point] = useState({ x: 220, y: 140 })
  const { element, update } = useElementByPoint(point)
  const boxRef = useRef<HTMLDivElement>(null)
  const [shifted, setShifted] = useState(false)

  return (
    <div>
      <div
        ref={boxRef}
        style={{
          transform: shifted ? 'translateX(160px)' : 'none',
        }}
      >
        Target
      </div>

      <button type="button" onClick={() => setShifted((value) => !value)}>
        Move target
      </button>

      {/*
        Moving the target via CSS does not change x/y, so the memoized
        result goes stale. Call update() to force a fresh lookup at the
        same point — useful after layout shifts, animations, or scrolling
        that a bare coordinate diff cannot detect.
      */}
      <button type="button" onClick={update}>
        Refresh now
      </button>

      <p>Result: {element?.tagName.toLowerCase() ?? 'none'}</p>
    </div>
  )
}`

export const svgDetectionSnippet = `import { useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function SvgHitTester() {
  const [point, setPoint] = useState({ x: 60, y: 60 })
  const { element } = useElementByPoint(point)

  return (
    <div>
      <svg
        viewBox="0 0 200 120"
        onPointerMove={(event) =>
          setPoint({ x: event.clientX, y: event.clientY })
        }
      >
        <circle cx="60" cy="60" r="40" />
        <rect x="120" y="20" width="60" height="80" />
      </svg>

      {/* Element is typed as the DOM Element interface, so SVG shapes
          (SVGCircleElement, SVGRectElement, ...) are returned directly —
          no separate SVG-aware API is needed. */}
      <p>Tag: {element?.tagName.toLowerCase() ?? 'none'}</p>
      <p>Is SVG: {String(element instanceof SVGElement)}</p>
    </div>
  )
}`

export const outOfViewportSnippet = `import { useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function ViewportAwarePointer() {
  const [point, setPoint] = useState({ x: 100, y: 100 })
  const { element } = useElementByPoint(point)

  return (
    <div>
      <button type="button" onClick={() => setPoint({ x: 100, y: 100 })}>
        Move on-screen
      </button>
      <button type="button" onClick={() => setPoint({ x: -500, y: -500 })}>
        Move off-screen
      </button>

      {/*
        elementFromPoint / elementsFromPoint return null / [] for points
        outside the current viewport (negative coordinates, or beyond
        window.innerWidth / window.innerHeight) — this is native browser
        behavior, not something the hook adds on top.
      */}
      <p>{element ? \`Hit: \${element.tagName.toLowerCase()}\` : 'Outside the viewport'}</p>
    </div>
  )
}`

export const customDocumentSnippet = `import { useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function IframeAwareInspector() {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)
  const [point, setPoint] = useState({ x: -1, y: -1 })

  // x/y are relative to the iframe's OWN viewport, not the parent page —
  // read them from pointer events dispatched inside frameDocument.
  const { element, isSupported } = useElementByPoint({
    ...point,
    document: frameDocument,
  })

  return (
    <div>
      <iframe
        title="Isolated document"
        srcDoc="<div id='target'>Inside the iframe</div>"
        onLoad={(event) => {
          const doc = event.currentTarget.contentDocument
          setFrameDocument(doc)
          doc?.addEventListener('pointermove', (nativeEvent) => {
            setPoint({ x: nativeEvent.clientX, y: nativeEvent.clientY })
          })
        }}
      />

      {/* Falls back honestly while the iframe document is not ready yet. */}
      <p>
        {isSupported
          ? \`Hit: \${element?.tagName.toLowerCase() ?? 'none'}\`
          : 'Waiting for the iframe document…'}
      </p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function ToggleableInspector() {
  const [enabled, setEnabled] = useState(true)
  const [point, setPoint] = useState({ x: 100, y: 100 })
  const { element } = useElementByPoint({ ...point, enabled })

  return (
    <div onPointerMove={(event) => setPoint({ x: event.clientX, y: event.clientY })}>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      {/* Disabling clears the result immediately; re-enabling refreshes it
          at the latest coordinates without any extra wiring. */}
      <p>{element?.tagName.toLowerCase() ?? 'none'}</p>
    </div>
  )
}`

export const schedulerComparisonSnippet = `import { useState } from 'react'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function SchedulerComparison() {
  const [point, setPoint] = useState({ x: 100, y: 100 })

  // 'animationFrame' (default): batches the lookup into the next
  // requestAnimationFrame, coalescing rapid coordinate changes.
  const animationFrame = useElementByPoint({ ...point, scheduler: 'animationFrame' })
  // 'sync': looks up immediately, in the same effect pass — no rAF wait.
  const sync = useElementByPoint({ ...point, scheduler: 'sync' })

  return (
    <div onPointerMove={(event) => setPoint({ x: event.clientX, y: event.clientY })}>
      <p>animationFrame: {animationFrame.element?.tagName.toLowerCase() ?? 'none'}</p>
      <p>sync: {sync.element?.tagName.toLowerCase() ?? 'none'}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import type { UseElementByPointScheduler } from '@muradyanvano/react-hooks'
import { useElementByPoint } from '@muradyanvano/react-hooks'

export function Playground({
  x = 100,
  y = 70,
  multiple = false,
  enabled = true,
  scheduler = 'animationFrame',
}: {
  x?: number
  y?: number
  multiple?: boolean
  enabled?: boolean
  scheduler?: UseElementByPointScheduler
}) {
  const { element, isSupported, isPaused } = useElementByPoint({
    x,
    y,
    multiple,
    enabled,
    scheduler,
  })

  return (
    <div>
      <p>Supported: {String(isSupported)}</p>
      <p>Paused: {String(isPaused)}</p>
      <p>
        {Array.isArray(element)
          ? \`\${element.length} element(s)\`
          : (element?.tagName.toLowerCase() ?? 'none')}
      </p>
    </div>
  )
}`
