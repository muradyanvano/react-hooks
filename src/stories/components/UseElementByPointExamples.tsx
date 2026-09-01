import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react'
import {
  useElementByPoint,
  type UseElementByPointScheduler,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  customDocumentSnippet,
  enabledStateSnippet,
  manualUpdateSnippet,
  multipleElementsSnippet,
  outOfViewportSnippet,
  pauseResumeSnippet,
  playgroundSnippet,
  pointerInspectorSnippet,
  schedulerComparisonSnippet,
  svgDetectionSnippet,
  xyCoordinatesSnippet,
} from './useElementByPoint.snippets'

const stageClass = 'relative rounded-xl border border-slate-200 bg-slate-50 p-4'
const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'

type Point = { x: number; y: number }

const OFF_SCREEN_POINT: Point = { x: -1000, y: -1000 }

function centerOf(element: Element | null): Point | null {
  if (element == null) {
    return null
  }
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function bottomRightOf(element: Element | null): Point | null {
  if (element == null) {
    return null
  }
  const rect = element.getBoundingClientRect()
  return { x: rect.right - 8, y: rect.bottom - 8 }
}

function formatCoord(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : String(value)
}

function describeElement(element: Element | null): string {
  if (element == null) {
    return 'none'
  }
  const tag = element.tagName.toLowerCase()
  const testId = element.getAttribute('data-testid')
  return testId ? `${tag} (${testId})` : tag
}

/**
 * Tracks the pointer in client (viewport) coordinates — exactly what
 * useElementByPoint expects. No conversion is needed for plain DOM pointer
 * events; clientX/clientY already live in that coordinate space.
 */
function useStagePoint(initial: Point = OFF_SCREEN_POINT) {
  const [point, setPoint] = useState<Point>(initial)

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      setPoint({ x: event.clientX, y: event.clientY })
    },
    [],
  )

  const handlePointerLeave = useCallback(() => {
    setPoint(OFF_SCREEN_POINT)
  }, [])

  return { point, setPoint, handlePointerMove, handlePointerLeave }
}

function TargetBox({
  refProp,
  testId,
  label,
  className = '',
  style,
}: {
  refProp?: RefObject<HTMLDivElement | null>
  testId: string
  label: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      ref={refProp}
      data-testid={testId}
      style={style}
      className={`flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm select-none ${className}`}
    >
      {label}
    </div>
  )
}

const OVERLAY_COLOR_CLASSES = {
  indigo: 'border-indigo-500 bg-indigo-500/10',
  emerald: 'border-emerald-500 bg-emerald-500/10',
  amber: 'border-amber-500 bg-amber-500/10',
} as const

type OverlayColor = keyof typeof OVERLAY_COLOR_CLASSES

function overlayRectInContainer(
  container: HTMLElement | null,
  rect: DOMRect | null,
): DOMRect | null {
  if (container == null || rect == null) {
    return null
  }

  const containerRect = container.getBoundingClientRect()
  return new DOMRect(
    rect.left - containerRect.left,
    rect.top - containerRect.top,
    rect.width,
    rect.height,
  )
}

/**
 * Sibling-only highlight inside a relative stage, positioned from
 * getBoundingClientRect() converted into the stage's local space. Never
 * writes to the detected element's style/class/attributes, and never
 * participates in hit testing (pointer-events: none).
 */
function HighlightOverlay({
  containerRef,
  rect,
  testId,
  color = 'indigo',
}: {
  containerRef: RefObject<HTMLElement | null>
  rect: DOMRect | null
  testId: string
  color?: OverlayColor
}) {
  const [localRect, setLocalRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const updateRect = () => {
      setLocalRect(overlayRectInContainer(containerRef.current, rect))
    }

    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [containerRef, rect])

  if (localRect == null) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className={`pointer-events-none absolute z-40 rounded-md border-2 ${OVERLAY_COLOR_CLASSES[color]}`}
      style={{
        left: localRect.left,
        top: localRect.top,
        width: localRect.width,
        height: localRect.height,
      }}
    />
  )
}

/**
 * Canvas-drawn crosshair, positioned over the stage only. pointer-events
 * are disabled so it never participates in hit testing.
 */
function Crosshair({
  stageRef,
  x,
  y,
  testId,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  x: number
  y: number
  testId: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (canvas == null || stage == null) {
      return
    }

    const stageRect = stage.getBoundingClientRect()
    const width = stageRect.width
    const height = stageRect.height
    const devicePixelRatio = window.devicePixelRatio || 1

    // The canvas backing store is scaled by devicePixelRatio for crisp
    // lines, so its drawing coordinates live in a *different* space than
    // the client (viewport) coordinates useElementByPoint consumes.
    // Convert explicitly: never feed canvas-local pixels into the hook,
    // and never feed raw client coordinates straight into canvas drawing
    // calls without subtracting the stage's own offset first.
    canvas.width = Math.max(1, Math.round(width * devicePixelRatio))
    canvas.height = Math.max(1, Math.round(height * devicePixelRatio))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (context == null) {
      return
    }

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)

    const isInsideStage =
      x >= stageRect.left &&
      x <= stageRect.right &&
      y >= stageRect.top &&
      y <= stageRect.bottom

    if (!isInsideStage) {
      return
    }

    const canvasX = x - stageRect.left
    const canvasY = y - stageRect.top

    context.strokeStyle = 'rgba(79, 70, 229, 0.85)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(canvasX, 0)
    context.lineTo(canvasX, height)
    context.moveTo(0, canvasY)
    context.lineTo(width, canvasY)
    context.stroke()

    context.fillStyle = 'rgba(79, 70, 229, 0.85)'
    context.beginPath()
    context.arc(canvasX, canvasY, 3, 0, Math.PI * 2)
    context.fill()
  }, [stageRef, x, y])

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30"
    />
  )
}

export function XYCoordinatesExample() {
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const { element, isSupported } = useElementByPoint({ x, y })
  const stageRef = useRef<HTMLDivElement>(null)
  const boxARef = useRef<HTMLDivElement>(null)
  const boxBRef = useRef<HTMLDivElement>(null)
  const boxCRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) {
      return undefined
    }

    let frame = 0

    const tryInit = () => {
      if (initializedRef.current) {
        return
      }

      const center = centerOf(boxARef.current)
      if (center != null) {
        initializedRef.current = true
        setX(Math.round(center.x))
        setY(Math.round(center.y))
        return
      }

      frame = requestAnimationFrame(tryInit)
    }

    tryInit()

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  const moveTo = (ref: RefObject<HTMLDivElement | null>) => {
    const center = centerOf(ref.current)
    if (center != null) {
      setX(Math.round(center.x))
      setY(Math.round(center.y))
    }
  }

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      setX(Math.round(event.clientX))
      setY(Math.round(event.clientY))
    },
    [],
  )

  const handlePointerLeave = useCallback(() => {
    setX(-1000)
    setY(-1000)
  }, [])

  const rect = element?.getBoundingClientRect() ?? null

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="X and Y coordinates"
      description="useElementByPoint({ x, y }) reactively resolves the Element sitting at viewport (client) coordinates — the same coordinate space as document.elementFromPoint. The overlay and crosshair below are Storybook-only visuals; the hook itself never mutates the detected element."
      instruction="Change the X or Y inputs, move the pointer across the stage, or click a Move to Box shortcut. Watch the detected element update."
      badge={isSupported ? 'Supported' : 'Unsupported'}
      code={xyCoordinatesSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'xy-x-value' },
            { label: 'Y', value: formatCoord(y), testId: 'xy-y-value' },
            {
              label: 'Element',
              value: describeElement(element),
              testId: 'xy-element-value',
            },
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'xy-supported-value',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
          X
          <input
            type="number"
            data-testid="xy-x-input"
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={x}
            onChange={(event) => {
              const next = event.currentTarget.valueAsNumber
              setX(Number.isNaN(next) ? 0 : next)
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">
          Y
          <input
            type="number"
            data-testid="xy-y-input"
            className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            value={y}
            onChange={(event) => {
              const next = event.currentTarget.valueAsNumber
              setY(Number.isNaN(next) ? 0 : next)
            }}
          />
        </label>
      </div>

      <div
        ref={stageRef}
        data-testid="xy-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`${stageClass} mt-3 min-h-[9rem]`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <TargetBox
            refProp={boxARef}
            testId="xy-box-a"
            label="Box A"
            className="h-16 w-28"
          />
          <TargetBox
            refProp={boxBRef}
            testId="xy-box-b"
            label="Box B"
            className="h-16 w-28"
          />
          <TargetBox
            refProp={boxCRef}
            testId="xy-box-c"
            label="Box C"
            className="h-16 w-28"
          />
        </div>
        <HighlightOverlay
          containerRef={stageRef}
          rect={rect}
          testId="xy-overlay"
        />
        <Crosshair stageRef={stageRef} x={x} y={y} testId="xy-crosshair" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="xy-move-a"
          className={secondaryButtonClass}
          onClick={() => moveTo(boxARef)}
        >
          Move to Box A
        </button>
        <button
          type="button"
          data-testid="xy-move-b"
          className={secondaryButtonClass}
          onClick={() => moveTo(boxBRef)}
        >
          Move to Box B
        </button>
        <button
          type="button"
          data-testid="xy-move-c"
          className={secondaryButtonClass}
          onClick={() => moveTo(boxCRef)}
        >
          Move to Box C
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function PointerInspectorExample() {
  const { point, handlePointerMove, handlePointerLeave, setPoint } =
    useStagePoint()
  const { element } = useElementByPoint(point)
  const strongRef = useRef<HTMLElement>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)
  const codeRef = useRef<HTMLElement>(null)

  const moveTo = (ref: RefObject<Element | null>) => {
    const center = centerOf(ref.current)
    if (center != null) {
      setPoint(center)
    }
  }

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Pointer inspector"
      description="Single-element mode returns exactly the Element under the pointer, ready for a live inspector panel — tag name, class, and text content, read directly from the returned node without touching it."
      instruction="Hover the bold text, the link, or the code snippet, or use the buttons below."
      code={pointerInspectorSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Tag',
              value: element?.tagName.toLowerCase() ?? '—',
              testId: 'insp-tag-value',
            },
            {
              label: 'Class',
              value: element?.className || '—',
              testId: 'insp-class-value',
            },
            {
              label: 'Text',
              value: element?.textContent?.trim().slice(0, 28) ?? '—',
              testId: 'insp-text-value',
            },
          ]}
        />
      }
    >
      <p
        data-testid="insp-content"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"
      >
        Hover over{' '}
        <strong ref={strongRef} data-testid="insp-strong">
          bold text
        </strong>
        , a{' '}
        <a
          ref={linkRef}
          data-testid="insp-link"
          href="#docs"
          onClick={(event) => event.preventDefault()}
        >
          documentation link
        </a>
        , or{' '}
        <code ref={codeRef} data-testid="insp-code">
          inline code
        </code>{' '}
        to inspect it below.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="insp-move-strong"
          className={secondaryButtonClass}
          onClick={() => moveTo(strongRef)}
        >
          Inspect bold text
        </button>
        <button
          type="button"
          data-testid="insp-move-link"
          className={secondaryButtonClass}
          onClick={() => moveTo(linkRef)}
        >
          Inspect link
        </button>
        <button
          type="button"
          data-testid="insp-move-code"
          className={secondaryButtonClass}
          onClick={() => moveTo(codeRef)}
        >
          Inspect code
        </button>
      </div>
    </ExampleShowcase>
  )
}

const STACK_BOX_SIZE = { width: 160, height: 112 }

export function MultipleElementsExample() {
  const [point, setPoint] = useState<Point>(OFF_SCREEN_POINT)
  const { element } = useElementByPoint({
    x: point.x,
    y: point.y,
    multiple: true,
  })
  const stageRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const middleRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // elementsFromPoint also reports ancestor containers up to <html> — filter
  // down to this story's own stacked boxes for a focused list. Matching by
  // a known data-testid prefix (rather than reading stageRef.current here)
  // keeps this filter pure during render.
  const insideStage = element.filter((node) =>
    (node.getAttribute('data-testid') ?? '').startsWith('multi-box-'),
  )

  const moveToOverlap = () => {
    const center = centerOf(topRef.current)
    if (center != null) {
      setPoint(center)
    }
  }

  const moveToTopOnly = () => {
    const cornerPoint = bottomRightOf(topRef.current)
    if (cornerPoint != null) {
      setPoint(cornerPoint)
    }
  }

  const overlayColors: OverlayColor[] = ['amber', 'emerald', 'indigo']

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Multiple elements"
      description="multiple: true switches the result to a readonly Element[], ordered topmost-first via document.elementsFromPoint — useful for stacked UI (tooltips, overlapping cards, layered canvases)."
      instruction="Move to the overlap zone to see all three boxes stacked, or move to a region only the top box covers."
      code={multipleElementsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hits inside stage',
              value: String(insideStage.length),
              testId: 'multi-count-value',
            },
            {
              label: 'Total hits',
              value: String(element.length),
              testId: 'multi-total-value',
            },
          ]}
        />
      }
    >
      <div
        ref={stageRef}
        data-testid="multi-stage"
        className={`${stageClass} h-56`}
      >
        <TargetBox
          refProp={bottomRef}
          testId="multi-box-bottom"
          label="Box Bottom"
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            ...STACK_BOX_SIZE,
          }}
        />
        <TargetBox
          refProp={middleRef}
          testId="multi-box-middle"
          label="Box Middle"
          style={{
            position: 'absolute',
            left: 32,
            top: 32,
            ...STACK_BOX_SIZE,
          }}
        />
        <TargetBox
          refProp={topRef}
          testId="multi-box-top"
          label="Box Top"
          style={{
            position: 'absolute',
            left: 56,
            top: 56,
            ...STACK_BOX_SIZE,
          }}
        />
        {insideStage.map((node, index) => (
          <HighlightOverlay
            key={`${describeElement(node)}-${index}`}
            containerRef={stageRef}
            rect={node.getBoundingClientRect()}
            testId={`multi-overlay-${index}`}
            color={overlayColors[index % overlayColors.length] ?? 'indigo'}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="multi-move-overlap"
          className={secondaryButtonClass}
          onClick={moveToOverlap}
        >
          Move to overlap zone
        </button>
        <button
          type="button"
          data-testid="multi-move-top-only"
          className={secondaryButtonClass}
          onClick={moveToTopOnly}
        >
          Move to Box Top only
        </button>
      </div>
      <ol
        data-testid="multi-list"
        className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700"
      >
        {insideStage.map((node, index) => (
          <li
            key={`${describeElement(node)}-${index}`}
            data-testid={`multi-list-item-${index}`}
          >
            {describeElement(node)}
          </li>
        ))}
      </ol>
    </ExampleShowcase>
  )
}

export function PauseResumeExample() {
  const { point, setPoint, handlePointerMove, handlePointerLeave } =
    useStagePoint()
  const { element, isPaused, pause, resume } = useElementByPoint(point)
  const boxARef = useRef<HTMLDivElement>(null)
  const boxBRef = useRef<HTMLDivElement>(null)

  const moveTo = (ref: RefObject<HTMLDivElement | null>) => {
    const center = centerOf(ref.current)
    if (center != null) {
      setPoint(center)
    }
  }

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Pause and resume"
      description="pause() freezes the lookup result in place even while x/y keep changing. resume() clears the paused state and schedules a fresh lookup with the latest coordinates (immediate when scheduler is sync, otherwise on the next animation frame)."
      instruction="Move to a box, pause, move to the other box, then resume to see the result jump to the new target."
      badge={isPaused ? 'Paused' : 'Running'}
      code={pauseResumeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'X',
              value: formatCoord(point.x),
              testId: 'pause-x-value',
            },
            {
              label: 'Y',
              value: formatCoord(point.y),
              testId: 'pause-y-value',
            },
            {
              label: 'Element',
              value: describeElement(element),
              testId: 'pause-element-value',
            },
            {
              label: 'State',
              value: isPaused ? 'Paused' : 'Running',
              testId: 'pause-status-value',
            },
          ]}
        />
      }
    >
      <div
        data-testid="pause-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`${stageClass} min-h-[8rem]`}
      >
        <div className="flex flex-wrap gap-4">
          <TargetBox
            refProp={boxARef}
            testId="pause-box-a"
            label="Box A"
            className="h-16 w-28"
          />
          <TargetBox
            refProp={boxBRef}
            testId="pause-box-b"
            label="Box B"
            className="h-16 w-28"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="pause-move-a"
          className={secondaryButtonClass}
          onClick={() => moveTo(boxARef)}
        >
          Move to Box A
        </button>
        <button
          type="button"
          data-testid="pause-move-b"
          className={secondaryButtonClass}
          onClick={() => moveTo(boxBRef)}
        >
          Move to Box B
        </button>
        <button
          type="button"
          data-testid="pause-toggle"
          className={primaryButtonClass}
          onClick={isPaused ? resume : pause}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function ManualUpdateExample() {
  const boxRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState<Point | null>(null)
  const [shifted, setShifted] = useState(false)

  useEffect(() => {
    setPoint((current) => current ?? centerOf(boxRef.current))
  }, [])

  const { element, update } = useElementByPoint(point ?? OFF_SCREEN_POINT)

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Manual update"
      description="The hook only re-runs its lookup reactively when x, y, or another option changes. Moving the target purely via CSS (no coordinate change) leaves the memoized result stale — call update() to force a fresh lookup at the same fixed point."
      instruction="Move the target away, notice the result stays stale, then click Refresh now to force a fresh lookup."
      code={manualUpdateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Target moved',
              value: shifted ? 'Yes' : 'No',
              testId: 'manual-shifted-value',
            },
            {
              label: 'Result',
              value: describeElement(element),
              testId: 'manual-element-value',
            },
          ]}
        />
      }
    >
      <div
        ref={stageRef}
        data-testid="manual-stage"
        className={`${stageClass} h-40`}
      >
        <div
          ref={boxRef}
          data-testid="manual-box"
          className="absolute flex h-20 w-32 items-center justify-center rounded-lg border-2 border-indigo-300 bg-indigo-50 text-xs font-semibold text-indigo-800 shadow-sm"
          style={{
            left: 16,
            top: 16,
            transform: shifted ? 'translateX(180px)' : 'none',
          }}
        >
          Target
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="manual-nudge"
          className={secondaryButtonClass}
          onClick={() => setShifted(true)}
        >
          Move target away
        </button>
        <button
          type="button"
          data-testid="manual-restore"
          className={secondaryButtonClass}
          onClick={() => setShifted(false)}
        >
          Move target back
        </button>
        <button
          type="button"
          data-testid="manual-refresh"
          className={primaryButtonClass}
          onClick={update}
        >
          Refresh now
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function SvgDetectionExample() {
  const [point, setPoint] = useState<Point>(OFF_SCREEN_POINT)
  const { element } = useElementByPoint(point)
  const circleRef = useRef<SVGCircleElement>(null)
  const rectRef = useRef<SVGRectElement>(null)

  const moveTo = (ref: RefObject<Element | null>) => {
    const center = centerOf(ref.current)
    if (center != null) {
      setPoint(center)
    }
  }

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="SVG detection"
      description="The hook is typed to the DOM Element interface, so SVG shapes such as SVGCircleElement and SVGRectElement are returned directly — no separate SVG-aware API or unwrapping is required."
      instruction="Move to the circle or the rectangle to confirm the returned node is a real SVG element."
      code={svgDetectionSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Tag',
              value: element ? element.tagName.toLowerCase() : '—',
              testId: 'svg-tag-value',
            },
            {
              label: 'Is SVGElement',
              value: String(element instanceof SVGElement),
              testId: 'svg-is-svg-value',
            },
            {
              label: 'Namespace',
              value: element?.namespaceURI ?? '—',
              testId: 'svg-namespace-value',
            },
          ]}
        />
      }
    >
      <svg
        data-testid="svg-stage"
        viewBox="0 0 240 140"
        onPointerMove={(event) =>
          setPoint({ x: event.clientX, y: event.clientY })
        }
        onPointerLeave={() => setPoint(OFF_SCREEN_POINT)}
        className="h-40 w-full rounded-xl border border-slate-200 bg-white"
      >
        <circle
          ref={circleRef}
          data-testid="svg-circle"
          cx="70"
          cy="70"
          r="50"
          className="fill-indigo-200 stroke-indigo-500"
        />
        <rect
          ref={rectRef}
          data-testid="svg-rect"
          x="150"
          y="20"
          width="70"
          height="100"
          className="fill-emerald-200 stroke-emerald-500"
        />
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="svg-move-circle"
          className={secondaryButtonClass}
          onClick={() => moveTo(circleRef)}
        >
          Move to circle
        </button>
        <button
          type="button"
          data-testid="svg-move-rect"
          className={secondaryButtonClass}
          onClick={() => moveTo(rectRef)}
        >
          Move to rect
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function OutOfViewportExample() {
  const [point, setPoint] = useState<Point>(OFF_SCREEN_POINT)
  const { element } = useElementByPoint(point)
  const boxRef = useRef<HTMLDivElement>(null)

  const moveOnScreen = () => {
    const center = centerOf(boxRef.current)
    if (center != null) {
      setPoint(center)
    }
  }

  const moveBeforeViewport = () => setPoint({ x: -400, y: -400 })
  const moveBeyondViewport = () =>
    setPoint({
      x: window.innerWidth + 400,
      y: window.innerHeight + 400,
    })

  const isOutsideViewport =
    point.x < 0 ||
    point.y < 0 ||
    point.x > window.innerWidth ||
    point.y > window.innerHeight

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Out-of-viewport"
      description="document.elementFromPoint / elementsFromPoint return null / [] for points outside the current viewport — negative coordinates, or coordinates beyond window.innerWidth / window.innerHeight. This is native browser behavior, not something the hook adds."
      instruction="Move on-screen to hit the target, then move before or beyond the viewport to see the result clear to null."
      code={outOfViewportSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(point.x), testId: 'oov-x-value' },
            { label: 'Y', value: formatCoord(point.y), testId: 'oov-y-value' },
            {
              label: 'Element',
              value: describeElement(element),
              testId: 'oov-element-value',
            },
            {
              label: 'In viewport',
              value: String(!isOutsideViewport),
              testId: 'oov-in-viewport-value',
            },
          ]}
        />
      }
    >
      <div className={`${stageClass} h-32`}>
        <TargetBox
          refProp={boxRef}
          testId="oov-box"
          label="Target"
          className="h-16 w-28"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="oov-move-onscreen"
          className={secondaryButtonClass}
          onClick={moveOnScreen}
        >
          Move on-screen
        </button>
        <button
          type="button"
          data-testid="oov-move-before"
          className={secondaryButtonClass}
          onClick={moveBeforeViewport}
        >
          Move before viewport
        </button>
        <button
          type="button"
          data-testid="oov-move-beyond"
          className={secondaryButtonClass}
          onClick={moveBeyondViewport}
        >
          Move beyond viewport
        </button>
      </div>
    </ExampleShowcase>
  )
}

const IFRAME_DOCUMENT = `<!doctype html>
<html>
  <head>
    <style>
      body { margin: 0; font-family: sans-serif; }
      #target {
        margin: 24px;
        padding: 16px;
        border-radius: 12px;
        border: 2px solid #4f46e5;
        background: #eef2ff;
        color: #312e81;
        font-size: 13px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div id="target" data-testid="iframe-target">Inside the iframe</div>
  </body>
</html>`

export function CustomDocumentExample() {
  const [frameDocument, setFrameDocument] = useState<Document | null>(null)
  const [point, setPoint] = useState<Point>(OFF_SCREEN_POINT)

  const { element, isSupported } = useElementByPoint({
    x: point.x,
    y: point.y,
    document: frameDocument,
  })

  const handleLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = event.currentTarget.contentDocument
    setFrameDocument(doc)
    doc?.addEventListener('pointermove', (nativeEvent) => {
      setPoint({ x: nativeEvent.clientX, y: nativeEvent.clientY })
    })
  }

  const moveToTarget = () => {
    const target = frameDocument?.getElementById('target') ?? null
    const center = centerOf(target)
    if (center != null) {
      setPoint(center)
    }
  }

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Custom document"
      description="Passing document lets the hook hit-test inside an isolated Document — such as a same-origin iframe — using coordinates relative to *that* document's own viewport, not the parent page's."
      instruction="Wait for the iframe to load, then move to its target to confirm hit-testing happens inside the iframe's own coordinate space."
      badge={frameDocument ? 'Ready' : 'Waiting'}
      code={customDocumentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Frame ready',
              value: frameDocument ? 'Yes' : 'No',
              testId: 'iframe-ready-value',
            },
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'iframe-supported-value',
            },
            {
              label: 'Element',
              value: describeElement(element),
              testId: 'iframe-element-value',
            },
          ]}
        />
      }
    >
      <iframe
        title="Isolated document fixture"
        data-testid="iframe-frame"
        srcDoc={IFRAME_DOCUMENT}
        onLoad={handleLoad}
        className="h-40 w-full rounded-xl border border-slate-200 bg-white"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="iframe-move-target"
          disabled={frameDocument == null}
          className={secondaryButtonClass}
          onClick={moveToTarget}
        >
          Move to iframe target
        </button>
      </div>
      {frameDocument == null ? (
        <p
          data-testid="iframe-fallback"
          role="status"
          className="mt-2 text-sm text-slate-600"
        >
          Waiting for the iframe document to load…
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const { point, setPoint, handlePointerMove, handlePointerLeave } =
    useStagePoint()
  const { element } = useElementByPoint({ x: point.x, y: point.y, enabled })
  const boxRef = useRef<HTMLDivElement>(null)
  const checkboxId = useId()

  const moveToBox = () => {
    const center = centerOf(boxRef.current)
    if (center != null) {
      setPoint(center)
    }
  }

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Enabled state"
      description="enabled: false clears the result immediately and stops scheduling lookups. Re-enabling refreshes the result at the latest coordinates automatically."
      instruction="Move to the target, then toggle Enabled off and on to see the result clear and recover."
      badge={enabled ? 'Enabled' : 'Disabled'}
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Element',
              value: describeElement(element),
              testId: 'enabled-element-value',
            },
            {
              label: 'State',
              value: enabled ? 'Enabled' : 'Disabled',
              testId: 'enabled-status-value',
            },
          ]}
        />
      }
    >
      <div
        data-testid="enabled-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`${stageClass} h-32`}
      >
        <TargetBox
          refProp={boxRef}
          testId="enabled-box"
          label="Target"
          className="h-16 w-28"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="enabled-move"
          className={secondaryButtonClass}
          onClick={moveToBox}
        >
          Move to target
        </button>
        <label
          htmlFor={checkboxId}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
        >
          <input
            id={checkboxId}
            type="checkbox"
            data-testid="enabled-toggle"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          Enabled
        </label>
      </div>
    </ExampleShowcase>
  )
}

export function SchedulerComparisonExample() {
  const { point, setPoint, handlePointerMove, handlePointerLeave } =
    useStagePoint()
  const boxRef = useRef<HTMLDivElement>(null)
  const animationFrame = useElementByPoint({
    x: point.x,
    y: point.y,
    scheduler: 'animationFrame',
  })
  const sync = useElementByPoint({
    x: point.x,
    y: point.y,
    scheduler: 'sync',
  })

  const moveToBox = () => {
    const center = centerOf(boxRef.current)
    if (center != null) {
      setPoint(center)
    }
  }

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Scheduler comparison"
      description="'animationFrame' (the default) batches the lookup into the next requestAnimationFrame — ideal for pointer-driven updates. 'sync' looks up immediately in the same effect pass, with no rAF wait. Both instances below share the same coordinates."
      instruction="Move to the target and compare both columns; both eventually agree, but sync settles without waiting a frame."
      code={schedulerComparisonSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'animationFrame',
              value: describeElement(animationFrame.element),
              testId: 'sched-af-element-value',
            },
            {
              label: 'sync',
              value: describeElement(sync.element),
              testId: 'sched-sync-element-value',
            },
          ]}
        />
      }
    >
      <div
        data-testid="sched-stage"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`${stageClass} h-32`}
      >
        <TargetBox
          refProp={boxRef}
          testId="sched-box"
          label="Target"
          className="h-16 w-28"
        />
      </div>
      <button
        type="button"
        data-testid="sched-move"
        className={`${secondaryButtonClass} mt-3`}
        onClick={moveToBox}
      >
        Move to target
      </button>
    </ExampleShowcase>
  )
}

function isElementList(
  value: Element | readonly Element[] | null,
): value is readonly Element[] {
  return Array.isArray(value)
}

const PLAYGROUND_STAGE_SIZE = { width: 400, height: 240 }

export function PlaygroundExample({
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
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageRect, setStageRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const updateRect = () => {
      setStageRect(stageRef.current?.getBoundingClientRect() ?? null)
    }
    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [])

  // The Controls above describe a position *relative to the stage*,
  // converted here into the viewport (client) coordinates the hook needs.
  const clientX = (stageRect?.left ?? 0) + x
  const clientY = (stageRect?.top ?? 0) + y

  const { element, isSupported, isPaused } = useElementByPoint({
    x: clientX,
    y: clientY,
    multiple,
    enabled,
    scheduler,
  })

  const stack = isElementList(element) ? element : null
  const single = isElementList(element) ? null : element
  const rect = single?.getBoundingClientRect() ?? null

  return (
    <ExampleShowcase
      hookName="useElementByPoint"
      title="Playground"
      description="Combine every option: x/y (relative to the stage below), multiple, enabled, and scheduler."
      instruction="Adjust the Controls panel and watch the highlighted element update."
      badge={!isSupported ? 'Unsupported' : isPaused ? 'Paused' : 'Supported'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'X', value: formatCoord(x), testId: 'pg-x-value' },
            { label: 'Y', value: formatCoord(y), testId: 'pg-y-value' },
            {
              label: 'Result',
              value: stack
                ? `${stack.length} element(s)`
                : describeElement(single),
              testId: 'pg-element-value',
            },
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'pg-supported-value',
            },
          ]}
        />
      }
    >
      <div
        ref={stageRef}
        data-testid="pg-stage"
        className={stageClass}
        style={PLAYGROUND_STAGE_SIZE}
      >
        <TargetBox
          testId="pg-box-a"
          label="Box A"
          style={{
            position: 'absolute',
            left: 40,
            top: 30,
            width: 140,
            height: 70,
          }}
        />
        <TargetBox
          testId="pg-box-b"
          label="Box B"
          style={{
            position: 'absolute',
            left: 220,
            top: 130,
            width: 140,
            height: 70,
          }}
        />
        <HighlightOverlay
          containerRef={stageRef}
          rect={rect}
          testId="pg-overlay"
        />
      </div>
    </ExampleShowcase>
  )
}
