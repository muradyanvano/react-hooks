import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  useMouse,
  type UseMouseCoordinateType,
  type UseMouseEventExtractor,
  type UseMouseEventFilter,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  basicUsageSnippet,
  coordinateSystemsSnippet,
  customExtractorSnippet,
  customTargetSnippet,
  dragTrackingSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  filteredUpdatesSnippet,
  initialValueSnippet,
  mouseOnlySnippet,
  pageScrollingSnippet,
  playgroundSnippet,
  touchTrackingSnippet,
} from './useMouse.snippets'

const surfaceClass =
  'relative overflow-hidden rounded-xl border border-slate-300 bg-[linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[length:24px_24px] bg-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const cardClass = 'rounded-xl border border-slate-200 bg-white p-3 shadow-sm'

function formatCoord(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : String(value)
}

function SourceBadge({ sourceType }: { sourceType: 'mouse' | 'touch' | null }) {
  const label =
    sourceType === 'mouse' ? 'mouse' : sourceType === 'touch' ? 'touch' : 'idle'
  const tone =
    sourceType === 'mouse'
      ? 'bg-emerald-50 text-emerald-800'
      : sourceType === 'touch'
        ? 'bg-sky-50 text-sky-800'
        : 'bg-slate-100 text-slate-600'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
      data-testid="source-badge"
    >
      source: {label}
    </span>
  )
}

function CoordinateReadout({
  x,
  y,
  sourceType,
  xTestId = 'mouse-x',
  yTestId = 'mouse-y',
  sourceTestId = 'mouse-source',
}: {
  x: number
  y: number
  sourceType: 'mouse' | 'touch' | null
  xTestId?: string
  yTestId?: string
  sourceTestId?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="font-mono text-sm tabular-nums text-slate-800">
        <span data-testid={xTestId}>x: {formatCoord(x)}</span>
        {' · '}
        <span data-testid={yTestId}>y: {formatCoord(y)}</span>
      </p>
      <span data-testid={sourceTestId}>
        <SourceBadge sourceType={sourceType} />
      </span>
    </div>
  )
}

function TrackingSurface({
  surfaceRef,
  label,
  testId,
  children,
  className = '',
  style,
  tabIndex,
  onMouseMove,
  onMouseLeave,
}: {
  surfaceRef: RefObject<HTMLDivElement | null>
  label: string
  testId: string
  children?: ReactNode
  className?: string
  style?: CSSProperties
  tabIndex?: number
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}) {
  return (
    <div
      ref={surfaceRef}
      role="img"
      aria-label={label}
      data-testid={testId}
      tabIndex={tabIndex}
      className={`${surfaceClass} min-h-56 w-full ${className}`}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}

function Marker({
  x,
  y,
  visible,
  testId = 'cursor-marker',
}: {
  x: number
  y: number
  visible: boolean
  testId?: string
}) {
  if (!visible) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className="pointer-events-none absolute top-0 left-0 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-700 bg-indigo-400/80 shadow"
      style={{ left: x, top: y }}
    />
  )
}

export function BasicUsageExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({ target: surfaceRef })
  const [local, setLocal] = useState({ x: 0, y: 0, active: false })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Basic usage"
      description="A sensor-style tracker for default page coordinates. Move the pointer across the surface to update live x/y values and source type. The crosshair is demonstration UI only — the hook itself never draws overlays."
      instruction="Move the mouse inside the tracking surface. Confirm x, y, and source update. Touch devices can also update the values when touch tracking is enabled (default)."
      code={basicUsageSnippet}
      badge="Primary"
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'status-x' },
            { label: 'Y', value: formatCoord(y), testId: 'status-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'status-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Mouse tracking surface"
        testId="basic-surface"
        tabIndex={0}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setLocal({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            active: true,
          })
        }}
        onMouseLeave={() => {
          setLocal((current) => ({ ...current, active: false }))
        }}
      >
        <Marker x={local.x} y={local.y} visible={local.active} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
          <p className="rounded-md bg-white/90 px-2 py-1 text-xs text-slate-600">
            {sourceType == null ? 'Waiting for input' : 'Tracking'}
          </p>
        </div>
      </TrackingSurface>
      <p className="sr-only" aria-live="polite">
        {sourceType == null ? 'Pointer idle' : `Tracking via ${sourceType}`}
      </p>
    </ExampleShowcase>
  )
}

export function CustomExtractorExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const extractor = useMemo<UseMouseEventExtractor>(
    () => (event) => {
      const view =
        'view' in event && event.view != null
          ? event.view
          : typeof window !== 'undefined'
            ? window
            : null
      const MouseEventCtor =
        view != null && 'MouseEvent' in view
          ? (view as Window & typeof globalThis).MouseEvent
          : typeof MouseEvent !== 'undefined'
            ? MouseEvent
            : null
      if (MouseEventCtor == null || !(event instanceof MouseEventCtor)) {
        return null
      }

      const target = surfaceRef.current
      if (target == null) {
        return null
      }

      const rect = target.getBoundingClientRect()
      return [event.clientX - rect.left, event.clientY - rect.top]
    },
    [],
  )

  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    type: extractor,
    touch: false,
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Custom extractor"
      description="A custom extractor fully owns the coordinate system. This example returns element-relative offsetX/offsetY for mouse events and ignores touch by returning null."
      instruction="Move inside the design canvas. Values should follow the element-local offset, not page coordinates."
      code={customExtractorSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Offset X', value: formatCoord(x), testId: 'offset-x' },
            { label: 'Offset Y', value: formatCoord(y), testId: 'offset-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'offset-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Element-relative design canvas"
        testId="extractor-surface"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout
            x={x}
            y={y}
            sourceType={sourceType}
            xTestId="extractor-x"
            yTestId="extractor-y"
            sourceTestId="extractor-source"
          />
        </div>
        <Marker
          x={x}
          y={y}
          visible={sourceType != null}
          testId="extractor-marker"
        />
      </TrackingSurface>
    </ExampleShowcase>
  )
}

export function CoordinateSystemsExample() {
  const page = useMouse({ type: 'page' })
  const client = useMouse({ type: 'client' })
  const screen = useMouse({ type: 'screen' })
  const movement = useMouse({ type: 'movement' })

  const cards = [
    {
      title: 'page',
      body: 'Document coordinates including scroll. Scroll can recalculate these without another pointer move.',
      value: page,
      testId: 'coord-page',
    },
    {
      title: 'client',
      body: 'Viewport coordinates. Scrolling the window does not change these values.',
      value: client,
      testId: 'coord-client',
    },
    {
      title: 'screen',
      body: 'Screen coordinates from the latest event.',
      value: screen,
      testId: 'coord-screen',
    },
    {
      title: 'movement',
      body: 'Latest movementX/movementY deltas — not an accumulated position.',
      value: movement,
      testId: 'coord-movement',
    },
  ] as const

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Coordinate systems"
      description="Compare the four built-in coordinate modes side by side. Movement reports the latest delta for each mouse event, not a running total."
      instruction="Move the mouse anywhere in the Storybook canvas and watch each card update."
      code={coordinateSystemsSnippet}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card.title}
            className={cardClass}
            data-testid={card.testId}
          >
            <h3 className="text-sm font-semibold text-slate-900">
              {card.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{card.body}</p>
            <p className="mt-3 font-mono text-sm tabular-nums text-slate-800">
              {formatCoord(card.value.x)}, {formatCoord(card.value.y)}
            </p>
          </article>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function TouchTrackingExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    touch: true,
    resetOnTouchEnd: true,
    initialValue: { x: 0, y: 0 },
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Touch tracking"
      description="Touch is enabled by default. With resetOnTouchEnd, coordinates return to the latest initial value after the final active touch ends."
      instruction="Use touch or synthetic touch events on the surface. After the final touch ends, values reset to 0,0 with an idle source."
      code={touchTrackingSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'touch-x' },
            { label: 'Y', value: formatCoord(y), testId: 'touch-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'touch-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Touch tracking surface"
        testId="touch-surface"
        style={{ touchAction: 'none' }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </TrackingSurface>
    </ExampleShowcase>
  )
}

export function MouseOnlyExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    touch: false,
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Mouse only"
      description="With touch: false, no touch listeners are registered. Touch events leave the previous mouse state untouched."
      instruction="Move the mouse to update values, then dispatch a touch event — coordinates should stay on the mouse reading."
      code={mouseOnlySnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'mouse-only-x' },
            { label: 'Y', value: formatCoord(y), testId: 'mouse-only-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'mouse-only-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Mouse-only tracking surface"
        testId="mouse-only-surface"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </TrackingSurface>
    </ExampleShowcase>
  )
}

export function DragTrackingExample() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: zoneRef,
    type: 'client',
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Drag tracking"
      description="dragover keeps coordinates updating during native drag-and-drop. The hook never calls preventDefault or stopPropagation — this example only prevents the browser drop navigation."
      instruction="Drag the card across the drop zone. Client coordinates should keep updating while dragging."
      code={dragTrackingSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'drag-x' },
            { label: 'Y', value: formatCoord(y), testId: 'drag-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'drag-source',
            },
          ]}
        />
      }
    >
      <div
        ref={zoneRef}
        data-testid="drag-zone"
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
        }}
        className="min-h-56 rounded-xl border border-dashed border-slate-400 bg-slate-50 p-4"
        aria-label="Drop zone for drag tracking"
      >
        <div
          draggable
          data-testid="drag-card"
          className="inline-flex cursor-grab rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow active:cursor-grabbing"
        >
          Draggable card
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Keyboard alternative: focus the zone and use mouse movement outside
          drag if needed — drag itself is pointer-oriented.
        </p>
        <div className="mt-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function PageScrollingExample() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const { x, y, sourceType } = useMouse({
    target: doc,
    type: 'page',
    scroll: true,
  })

  useEffect(() => {
    const frame = iframeRef.current
    if (frame == null) {
      return
    }

    const onLoad = () => {
      setDoc(frame.contentDocument)
    }

    frame.addEventListener('load', onLoad)
    if (frame.contentDocument?.readyState === 'complete') {
      onLoad()
    }

    return () => {
      frame.removeEventListener('load', onLoad)
    }
  }, [])

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Page scrolling"
      description="Page-mode scroll recalculation uses the last recorded client coordinates plus the owning window’s scroll offsets. This demo isolates scrolling inside a same-origin iframe so Storybook Docs does not jump."
      instruction="Move inside the iframe, then scroll it. Page coordinates should change without another pointer move."
      code={pageScrollingSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Page X', value: formatCoord(x), testId: 'scroll-x' },
            { label: 'Page Y', value: formatCoord(y), testId: 'scroll-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'scroll-source',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated scroll document for useMouse"
        data-testid="scroll-iframe"
        className="h-56 w-full rounded-xl border border-slate-300"
        srcDoc={`<!doctype html><html><body style="margin:0;font-family:system-ui,sans-serif;height:2000px;background:linear-gradient(#f8fafc,#e2e8f0);"><p style="padding:16px;">Move here, then scroll this frame.</p></body></html>`}
      />
      <CoordinateReadout x={x} y={y} sourceType={sourceType} />
    </ExampleShowcase>
  )
}

export function CustomTargetExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({ target: surfaceRef })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Custom target"
      description="Listeners attach only to the provided element. Events outside the target do not update state."
      instruction="Move inside the bordered surface to update values, then move outside — readings should freeze."
      code={customTargetSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'custom-x' },
            { label: 'Y', value: formatCoord(y), testId: 'custom-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'custom-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Bounded mouse target"
        testId="custom-target-surface"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </TrackingSurface>
      <p className="text-sm text-slate-600">
        Outside area — movement here should not change the live status.
      </p>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const { x, y, sourceType } = useMouse({
    target: useA ? aRef : bRef,
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Dynamic target"
      description="Switching targets removes listeners from the old surface and attaches them to the new one while preserving the last coordinate state."
      instruction="Move on Surface A, switch targets, then move on Surface B. The old surface should stop updating."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: useA ? 'A' : 'B',
              testId: 'dynamic-active',
            },
            { label: 'X', value: formatCoord(x), testId: 'dynamic-x' },
            { label: 'Y', value: formatCoord(y), testId: 'dynamic-y' },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="switch-target"
        onClick={() => {
          setUseA((value) => !value)
        }}
      >
        Switch to surface {useA ? 'B' : 'A'}
      </button>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TrackingSurface
          surfaceRef={aRef}
          label="Surface A"
          testId="surface-a"
          className={useA ? 'ring-2 ring-indigo-400' : ''}
        >
          <p className="pointer-events-none p-3 text-sm font-semibold">
            Surface A
          </p>
        </TrackingSurface>
        <TrackingSurface
          surfaceRef={bRef}
          label="Surface B"
          testId="surface-b"
          className={!useA ? 'ring-2 ring-indigo-400' : ''}
        >
          <p className="pointer-events-none p-3 text-sm font-semibold">
            Surface B
          </p>
        </TrackingSurface>
      </div>
      <CoordinateReadout x={x} y={y} sourceType={sourceType} />
    </ExampleShowcase>
  )
}

export function FilteredUpdatesExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const eventFilter = useMemo<UseMouseEventFilter>(
    () => (invoke) => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        invoke()
      })
    },
    [],
  )

  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    eventFilter,
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Filtered updates"
      description="eventFilter lets consumers throttle or schedule updates. The hook ignores stale delayed invocations after disable, target replacement, or unmount, but does not cancel consumer-owned timers or frames."
      instruction="Move quickly across the surface. Updates are applied on animation frames."
      code={filteredUpdatesSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'filter-x' },
            { label: 'Y', value: formatCoord(y), testId: 'filter-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'filter-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Animation-frame filtered surface"
        testId="filter-surface"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </TrackingSurface>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    enabled,
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Enabled state"
      description="Disabling removes listeners and preserves the last coordinates. Re-enabling resumes tracking without synthesizing an update."
      instruction="Move to record a position, disable tracking, move again (values freeze), then re-enable."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'enabled-flag',
            },
            { label: 'X', value: formatCoord(x), testId: 'enabled-x' },
            { label: 'Y', value: formatCoord(y), testId: 'enabled-y' },
          ]}
        />
      }
    >
      <button
        type="button"
        className={enabled ? secondaryButtonClass : buttonClass}
        data-testid="toggle-enabled"
        onClick={() => {
          setEnabled((value) => !value)
        }}
      >
        {enabled ? 'Disable tracking' : 'Enable tracking'}
      </button>
      <div className="mt-3">
        <TrackingSurface
          surfaceRef={surfaceRef}
          label="Enable/disable tracking surface"
          testId="enabled-surface"
          tabIndex={0}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
            <CoordinateReadout x={x} y={y} sourceType={sourceType} />
          </div>
        </TrackingSurface>
      </div>
    </ExampleShowcase>
  )
}

export function InitialValueExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    touch: true,
    resetOnTouchEnd: true,
    initialValue: { x: 24, y: 48 },
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Initial value"
      description="Custom initial coordinates render on the server and the first client paint. They are reused for eligible touch-end resets, but changing initialValue after mount does not rewrite the live position."
      instruction="Confirm the starting position is 24, 48. After a final touch-end reset, values return there."
      code={initialValueSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'initial-x' },
            { label: 'Y', value: formatCoord(y), testId: 'initial-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'initial-source',
            },
          ]}
        />
      }
    >
      <TrackingSurface
        surfaceRef={surfaceRef}
        label="Initial value tracking surface"
        testId="initial-surface"
        style={{ touchAction: 'none' }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </TrackingSurface>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  type = 'page',
  touch = true,
  scroll = true,
  resetOnTouchEnd = false,
  initialX = 0,
  initialY = 0,
}: {
  enabled?: boolean
  type?: UseMouseCoordinateType
  touch?: boolean
  scroll?: boolean
  resetOnTouchEnd?: boolean
  initialX?: number
  initialY?: number
}) {
  const [mounted, setMounted] = useState(false)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const remountKey = `${initialX}:${initialY}:${mounted}`

  const { x, y, sourceType } = useMouse({
    target: surfaceRef,
    enabled: mounted && enabled,
    type,
    touch,
    scroll,
    resetOnTouchEnd,
    initialValue: { x: initialX, y: initialY },
  })

  return (
    <ExampleShowcase
      hookName="useMouse"
      title="Playground"
      description="Experiment with registration-relevant options. Tracking stays contained to the example surface — there is no page-level cursor overlay. Mount the playground explicitly so Docs does not start tracking on load. Remount when you need a fresh initialValue demonstration."
      instruction="Mount the playground, adjust Controls, then move inside the surface."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'play-x' },
            { label: 'Y', value: formatCoord(y), testId: 'play-y' },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'play-source',
            },
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'play-mounted',
            },
          ]}
        />
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="play-mount"
          checked={mounted}
          onChange={(event) => {
            setMounted(event.target.checked)
          }}
        />
        Mount playground tracking
      </label>
      <TrackingSurface
        key={remountKey}
        surfaceRef={surfaceRef}
        label="Playground tracking surface"
        testId="playground-surface"
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <CoordinateReadout x={x} y={y} sourceType={sourceType} />
        </div>
      </TrackingSurface>
    </ExampleShowcase>
  )
}
