import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react'
import {
  useScroll,
  type UseScrollArrivedState,
  type UseScrollDirections,
} from '../../hooks/useScroll/useScroll'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  documentTargetSnippet,
  directionsSnippet,
  dynamicContentSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  errorHandlingSnippet,
  horizontalGallerySnippet,
  mutationObservationSnippet,
  offsetsSnippet,
  playgroundSnippet,
  programmaticPositionSnippet,
  rtlHorizontalSnippet,
  scrollDashboardSnippet,
  scrollingStateSnippet,
  smoothScrollingSnippet,
  throttleComparisonSnippet,
  verticalArticleSnippet,
  windowTargetSnippet,
} from './useScroll.snippets'

const surfaceClass =
  'relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 outline-none transition-[background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none'
const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const inputClass =
  'w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const scrollerClass =
  'relative w-full overflow-auto rounded-xl border border-slate-300 bg-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const labelClass = 'flex items-center gap-2 text-sm text-slate-700'

export function formatScroll(value: number): string {
  return Number.isFinite(value) ? String(Math.round(value)) : '0'
}

function formatArrived(arrived: UseScrollArrivedState): string {
  return `L:${arrived.left} R:${arrived.right} T:${arrived.top} B:${arrived.bottom}`
}

function formatDirections(directions: UseScrollDirections): string {
  const active = (['left', 'right', 'top', 'bottom'] as const).filter(
    (key) => directions[key],
  )
  return active.length > 0 ? active.join(', ') : 'none'
}

function ScrollStatus({
  x,
  y,
  isScrolling,
  arrivedState,
  directions,
  xTestId = 'status-x',
  yTestId = 'status-y',
  scrollingTestId = 'status-scrolling',
  arrivedTestId = 'status-arrived',
  directionsTestId = 'status-directions',
}: {
  x: number
  y: number
  isScrolling: boolean
  arrivedState: UseScrollArrivedState
  directions: UseScrollDirections
  xTestId?: string
  yTestId?: string
  scrollingTestId?: string
  arrivedTestId?: string
  directionsTestId?: string
}) {
  return (
    <StatusPanel
      items={[
        { label: 'X', value: formatScroll(x), testId: xTestId },
        { label: 'Y', value: formatScroll(y), testId: yTestId },
        {
          label: 'Scrolling',
          value: String(isScrolling),
          testId: scrollingTestId,
        },
        {
          label: 'Arrived',
          value: formatArrived(arrivedState),
          testId: arrivedTestId,
        },
        {
          label: 'Directions',
          value: formatDirections(directions),
          testId: directionsTestId,
        },
      ]}
    />
  )
}

function Minimap({
  x,
  y,
  scrollWidth,
  scrollHeight,
  clientWidth,
  clientHeight,
  testId = 'scroll-minimap',
}: {
  x: number
  y: number
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
  testId?: string
}) {
  const widthPercent = scrollWidth > 0 ? (clientWidth / scrollWidth) * 100 : 100
  const heightPercent =
    scrollHeight > 0 ? (clientHeight / scrollHeight) * 100 : 100
  const maxScrollX = Math.max(scrollWidth - clientWidth, 0)
  const maxScrollY = Math.max(scrollHeight - clientHeight, 0)
  const leftPercent =
    maxScrollX > 0 ? (x / maxScrollX) * (100 - widthPercent) : 0
  const topPercent =
    maxScrollY > 0 ? (y / maxScrollY) * (100 - heightPercent) : 0

  const viewportStyle: CSSProperties = {
    left: `${leftPercent}%`,
    top: `${topPercent}%`,
    width: `${widthPercent}%`,
    height: `${heightPercent}%`,
  }

  return (
    <div
      data-testid={testId}
      className="relative h-16 w-24 overflow-hidden rounded-lg border border-slate-300 bg-slate-100"
      aria-hidden="true"
    >
      <div
        data-testid={`${testId}-viewport`}
        className="absolute rounded-sm border border-indigo-500 bg-indigo-400/40"
        style={viewportStyle}
      />
    </div>
  )
}

export function ScrollDashboardExample(): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [smooth, setSmooth] = useState(false)
  const [tallContent, setTallContent] = useState(true)
  const [inputX, setInputX] = useState('0')
  const [inputY, setInputY] = useState('0')
  const [offsetEdge, setOffsetEdge] = useState(30)
  const [metrics, setMetrics] = useState({
    scrollWidth: 1,
    scrollHeight: 1,
    clientWidth: 1,
    clientHeight: 1,
  })

  const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } =
    useScroll(scrollRef, {
      offset: {
        left: offsetEdge,
        top: offsetEdge,
        right: offsetEdge,
        bottom: offsetEdge,
      },
      behavior: smooth ? 'smooth' : 'auto',
      idle: 300,
    })

  useEffect(() => {
    const element = scrollRef.current
    if (element == null) {
      return
    }

    setMetrics({
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
    })
    measure()
  }, [measure, tallContent, offsetEdge])

  const applyPosition = () => {
    setX(Number(inputX), smooth ? 'smooth' : 'auto')
    setY(Number(inputY), smooth ? 'smooth' : 'auto')
  }

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Scroll dashboard"
      description="Contained 2D scrolling with live position, arrival, direction, and scrolling state. Offsets shrink the arrived region; measure() re-reads metrics after layout changes."
      instruction="Scroll the panel, tune X/Y, toggle smooth scrolling, change content height, and watch the minimap."
      code={scrollDashboardSnippet}
      badge="Primary"
      aside={
        <div className="space-y-3">
          <ScrollStatus
            x={x}
            y={y}
            isScrolling={isScrolling}
            arrivedState={arrivedState}
            directions={directions}
            xTestId="dashboard-x"
            yTestId="dashboard-y"
            scrollingTestId="dashboard-scrolling"
            arrivedTestId="dashboard-arrived"
            directionsTestId="dashboard-directions"
          />
          <Minimap
            x={x}
            y={y}
            scrollWidth={metrics.scrollWidth}
            scrollHeight={metrics.scrollHeight}
            clientWidth={metrics.clientWidth}
            clientHeight={metrics.clientHeight}
            testId="dashboard-minimap"
          />
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          X
          <input
            type="number"
            className={inputClass}
            data-testid="dashboard-input-x"
            value={inputX}
            onChange={(event) => {
              setInputX(event.target.value)
            }}
          />
        </label>
        <label className={labelClass}>
          Y
          <input
            type="number"
            className={inputClass}
            data-testid="dashboard-input-y"
            value={inputY}
            onChange={(event) => {
              setInputY(event.target.value)
            }}
          />
        </label>
        <button
          type="button"
          className={buttonClass}
          data-testid="dashboard-apply"
          onClick={applyPosition}
        >
          Apply X/Y
        </button>
        <label className={labelClass}>
          <input
            type="checkbox"
            data-testid="dashboard-smooth"
            checked={smooth}
            onChange={(event) => {
              setSmooth(event.target.checked)
            }}
          />
          Smooth
        </label>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="dashboard-measure"
          onClick={() => {
            measure()
          }}
        >
          Measure
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="dashboard-toggle-height"
          onClick={() => {
            setTallContent((value) => !value)
          }}
        >
          {tallContent ? 'Shorter content' : 'Taller content'}
        </button>
        <label className={labelClass}>
          Offset
          <input
            type="number"
            min={0}
            max={80}
            className={inputClass}
            data-testid="dashboard-offset"
            value={offsetEdge}
            onChange={(event) => {
              setOffsetEdge(Number(event.target.value))
            }}
          />
        </label>
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        data-testid="scroll-dashboard"
        aria-label="Two-dimensional scroll dashboard"
        className={`${scrollerClass} mt-3 h-64 max-h-64`}
      >
        <div
          className="relative bg-gradient-to-br from-indigo-50 via-white to-violet-100"
          style={{
            width: '220%',
            height: tallContent ? '220%' : '140%',
            minWidth: 640,
            minHeight: tallContent ? 560 : 360,
          }}
        >
          <span className="absolute left-4 top-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
            TopLeft
          </span>
          <span className="absolute right-4 top-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
            TopRight
          </span>
          <span className="absolute bottom-4 left-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
            BottomLeft
          </span>
          <span className="absolute bottom-4 right-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
            BottomRight
          </span>
          <p
            data-testid="dashboard-center-label"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold text-indigo-700"
          >
            Scroll Me
          </p>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-indigo-300/80"
            style={{ inset: offsetEdge }}
          />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        x {formatScroll(x)}, y {formatScroll(y)}, scrolling{' '}
        {String(isScrolling)}
      </p>
    </ExampleShowcase>
  )
}

export function VerticalArticleExample(): ReactElement {
  const articleRef = useRef<HTMLElement>(null)
  const { y, arrivedState, directions, isScrolling } = useScroll(articleRef)

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Vertical article"
      description="Track vertical reading progress inside a contained article scroller."
      instruction="Scroll the article and watch y plus top/bottom arrival."
      code={verticalArticleSnippet}
      aside={
        <ScrollStatus
          x={0}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="article-x"
          yTestId="article-y"
          scrollingTestId="article-scrolling"
          arrivedTestId="article-arrived"
          directionsTestId="article-directions"
        />
      }
    >
      <article
        ref={articleRef}
        tabIndex={0}
        data-testid="vertical-article"
        aria-label="Long-form article"
        className={`${scrollerClass} max-h-80 space-y-4 p-4`}
      >
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Field notes
          </p>
          <h3 className="text-xl font-semibold text-slate-900">
            Designing scroll-aware layouts
          </h3>
        </header>
        {Array.from({ length: 14 }, (_, index) => (
          <p key={index} className="text-sm leading-7 text-slate-700">
            Paragraph {index + 1}. Contained scroll regions keep Docs stable
            while still exposing live position and arrival for long-form
            content.
          </p>
        ))}
      </article>
    </ExampleShowcase>
  )
}

export function HorizontalGalleryExample(): ReactElement {
  const galleryRef = useRef<HTMLDivElement>(null)
  const { x, arrivedState, directions, isScrolling } = useScroll(galleryRef)

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Horizontal gallery"
      description="Horizontal overflow exposes left/right arrival and x movement."
      instruction="Scroll the gallery sideways and compare left/right arrival flags."
      code={horizontalGallerySnippet}
      aside={
        <ScrollStatus
          x={x}
          y={0}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="gallery-x"
          yTestId="gallery-y"
          scrollingTestId="gallery-scrolling"
          arrivedTestId="gallery-arrived"
          directionsTestId="gallery-directions"
        />
      }
    >
      <div
        ref={galleryRef}
        tabIndex={0}
        role="region"
        data-testid="horizontal-gallery"
        aria-label="Horizontal gallery"
        className={`${scrollerClass} max-w-full`}
      >
        <div className="flex w-max min-w-[200%] gap-3 p-3">
          {Array.from({ length: 8 }, (_, index) => (
            <figure
              key={index}
              data-testid={`gallery-slide-${index + 1}`}
              className="flex min-h-44 min-w-56 shrink-0 flex-col justify-end rounded-xl bg-gradient-to-br from-indigo-100 to-violet-200 p-4"
            >
              <figcaption className="text-sm font-semibold text-slate-800">
                Slide {index + 1}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function OffsetsExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { arrivedState, x, y, isScrolling, directions } = useScroll(ref, {
    offset: { left: 30, top: 30, right: 30, bottom: 30 },
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Offsets"
      description="Arrival uses 30px margins on every edge so corners are not required to reach absolute zero."
      instruction="Scroll toward each edge and notice arrival before the literal boundary."
      code={offsetsSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="offsets-x"
          yTestId="offsets-y"
          scrollingTestId="offsets-scrolling"
          arrivedTestId="offsets-arrived"
          directionsTestId="offsets-directions"
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="offsets-scroller"
        aria-label="Offset threshold scroller"
        className={`${scrollerClass} h-52`}
      >
        <div
          className="relative bg-white p-8"
          style={{ width: '180%', height: '180%' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-8 rounded-xl border-2 border-dashed border-amber-400/80"
          />
          <p className="max-w-sm text-sm text-slate-700">
            The dashed inset marks the 30px offset region. Arrived flags flip
            when the viewport enters this margin.
          </p>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ProgrammaticPositionExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { x, y, scrollTo, setX, setY, isScrolling, arrivedState, directions } =
    useScroll(ref)

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Programmatic position"
      description="scrollTo, setX, and setY imperatively move the target. With behavior auto the hook re-measures immediately."
      instruction="Use the jump and reset buttons, then scroll manually."
      code={programmaticPositionSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="programmatic-x"
          yTestId="programmatic-y"
          scrollingTestId="programmatic-scrolling"
          arrivedTestId="programmatic-arrived"
          directionsTestId="programmatic-directions"
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="programmatic-jump"
          onClick={() => {
            scrollTo({ x: 40, y: 40 })
          }}
        >
          Jump to 40, 40
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="programmatic-reset-x"
          onClick={() => {
            setX(0)
          }}
        >
          Reset X
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="programmatic-reset-y"
          onClick={() => {
            setY(0)
          }}
        >
          Reset Y
        </button>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="programmatic-scroller"
        aria-label="Programmatic scroll target"
        className={`${scrollerClass} mt-3 h-48`}
      >
        <div
          className="bg-gradient-to-br from-slate-50 to-indigo-100"
          style={{
            width: '200%',
            height: '200%',
            minWidth: 480,
            minHeight: 480,
          }}
        />
      </div>
    </ExampleShowcase>
  )
}

export function SmoothScrollingExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollTo, x, y, isScrolling, arrivedState, directions } = useScroll(
    ref,
    { behavior: 'smooth' },
  )

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Smooth scrolling"
      description="behavior: 'smooth' forwards native smooth scrolling. Automated tests stick to auto behavior — this story is for manual inspection."
      instruction="Click Smooth jump and watch the animated scroll. Values update from scroll events."
      code={smoothScrollingSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="smooth-x"
          yTestId="smooth-y"
          scrollingTestId="smooth-scrolling"
          arrivedTestId="smooth-arrived"
          directionsTestId="smooth-directions"
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="smooth-jump"
        onClick={() => {
          scrollTo({ x: 200, y: 120 }, 'smooth')
        }}
      >
        Smooth jump
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="smooth-scroller"
        aria-label="Smooth scrolling demo"
        className={`${scrollerClass} mt-3 h-48`}
      >
        <div
          className="flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100 text-sm font-medium text-indigo-800"
          style={{ width: '200%', height: '200%' }}
        >
          Smooth scrolling demo
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ScrollingStateExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [stopCount, setStopCount] = useState(0)
  const { isScrolling, y, x, arrivedState, directions } = useScroll(ref, {
    idle: 150,
    onStop: () => {
      setStopCount((count) => count + 1)
    },
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Scrolling state"
      description="isScrolling turns true on the first scroll event in a session and false after idle milliseconds with no further scroll events. onStop fires once per session."
      instruction="Scroll, wait for idle, and watch the stop counter increment."
      code={scrollingStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'state-scrolling',
            },
            {
              label: 'onStop',
              value: String(stopCount),
              testId: 'state-stop-count',
            },
            { label: 'X', value: formatScroll(x), testId: 'state-x' },
            { label: 'Y', value: formatScroll(y), testId: 'state-y' },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'state-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'state-directions',
            },
          ]}
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="state-scroller"
        aria-label="Scrolling state demo"
        className={`${scrollerClass} h-44`}
      >
        <div className="space-y-3 p-3" style={{ height: '240%' }}>
          {Array.from({ length: 10 }, (_, index) => (
            <p key={index} className="text-sm text-slate-700">
              Row {index + 1}
            </p>
          ))}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ThrottleComparisonExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [throttle, setThrottle] = useState(0)
  const [updates, setUpdates] = useState(0)
  const { x, y, isScrolling, arrivedState, directions } = useScroll(ref, {
    throttle,
    onScroll: () => {
      setUpdates((count) => count + 1)
    },
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Throttle comparison"
      description="Optional throttle coalesces onScroll callbacks while scroll events still drive isScrolling immediately."
      instruction="Toggle throttle, drag-scroll quickly, and compare onScroll update counts."
      code={throttleComparisonSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Throttle',
              value: `${throttle}ms`,
              testId: 'throttle-value',
            },
            {
              label: 'onScroll',
              value: String(updates),
              testId: 'throttle-updates',
            },
            { label: 'X', value: formatScroll(x), testId: 'throttle-x' },
            { label: 'Y', value: formatScroll(y), testId: 'throttle-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'throttle-scrolling',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'throttle-directions',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'throttle-arrived',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={throttle === 0 ? buttonClass : secondaryButtonClass}
        data-testid="throttle-toggle"
        onClick={() => {
          setThrottle((value) => (value === 0 ? 100 : 0))
          setUpdates(0)
        }}
      >
        throttle: {throttle}ms
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="throttle-scroller"
        aria-label="Throttle comparison scroller"
        className={`${scrollerClass} mt-3 h-40`}
      >
        <div className="bg-slate-50 p-4" style={{ height: '260%' }}>
          <p className="text-sm text-slate-700">
            Rapid scroll events with throttle 0 update onScroll every event.
            With 100ms throttle, callbacks coalesce.
          </p>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function DirectionsExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { directions, x, y, isScrolling, arrivedState } = useScroll(ref)

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Directions"
      description="Directions reflect the latest delta between measurements — left/right for x, top/bottom for y."
      instruction="Scroll in each axis and read the direction flags."
      code={directionsSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="directions-x"
          yTestId="directions-y"
          scrollingTestId="directions-scrolling"
          arrivedTestId="directions-arrived"
          directionsTestId="directions-flags"
        />
      }
    >
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="directions-scroller"
        aria-label="Direction tracking scroller"
        className={`${scrollerClass} h-52`}
      >
        <div
          className="grid place-content-center bg-white"
          style={{ width: '180%', height: '180%' }}
        >
          <p className="text-sm text-slate-600">Move in any direction</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {(['left', 'right', 'top', 'bottom'] as const).map((key) => (
          <span
            key={key}
            data-testid={`direction-${key}`}
            className={`rounded-lg px-2 py-1 text-center font-medium ${directions[key] ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-700'}`}
          >
            {key}: {String(directions[key])}
          </span>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function DynamicContentExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [blocks, setBlocks] = useState(6)
  const { y, arrivedState, measure, x, isScrolling, directions } =
    useScroll(ref)

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Dynamic content"
      description="When content height changes, call measure() after React commits if you are not using mutation observation."
      instruction="Add blocks near the bottom, then measure to refresh arrival."
      code={dynamicContentSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="dynamic-x"
          yTestId="dynamic-y"
          scrollingTestId="dynamic-scrolling"
          arrivedTestId="dynamic-arrived"
          directionsTestId="dynamic-directions"
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="dynamic-add"
        onClick={() => {
          setBlocks((count) => count + 3)
          queueMicrotask(() => {
            measure()
          })
        }}
      >
        Add content
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="dynamic-scroller"
        aria-label="Dynamic content scroller"
        className={`${scrollerClass} mt-3 h-48`}
      >
        <div className="space-y-2 p-3">
          {Array.from({ length: blocks }, (_, index) => (
            <p
              key={index}
              data-testid={`dynamic-block-${index + 1}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-800"
            >
              Block {index + 1}
            </p>
          ))}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function MutationObservationExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState(4)
  const { arrivedState, y, x, isScrolling, directions } = useScroll(ref, {
    observe: { mutation: true },
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Mutation observation"
      description="observe.mutation attaches a MutationObserver so layout changes re-measure arrival without manual measure()."
      instruction="Append rows and watch bottom arrival update automatically."
      code={mutationObservationSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="mutation-x"
          yTestId="mutation-y"
          scrollingTestId="mutation-scrolling"
          arrivedTestId="mutation-arrived"
          directionsTestId="mutation-directions"
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="mutation-add"
        onClick={() => {
          setItems((count) => count + 2)
        }}
      >
        Append rows
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="mutation-scroller"
        aria-label="Mutation observation scroller"
        className={`${scrollerClass} mt-3 h-44`}
      >
        <div className="space-y-2 p-3">
          {Array.from({ length: items }, (_, index) => (
            <p key={index} className="text-sm text-slate-700">
              Row {index + 1}
            </p>
          ))}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function WindowTargetExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Window | null>(null)
  const [ready, setReady] = useState(false)
  const { y, x, arrivedState, isScrolling, directions } = useScroll(targetRef, {
    enabled: ready,
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Window target"
      description="Window targets listen on the owning window. An isolated iframe keeps Docs from scrolling the Storybook page."
      instruction="Scroll inside the iframe document and read page offsets."
      code={windowTargetSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Ready', value: String(ready), testId: 'window-ready' },
            { label: 'X', value: formatScroll(x), testId: 'window-x' },
            { label: 'Y', value: formatScroll(y), testId: 'window-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'window-scrolling',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'window-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'window-directions',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated window scroll"
        data-testid="window-iframe"
        className={`${surfaceClass} h-64 w-full`}
        srcDoc={`<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#eef2ff,#fff);min-height:220vh;}</style></head><body><h1 style="margin:0 0 12px;font-size:18px;">Isolated window</h1><p>Scroll this iframe document.</p></body></html>`}
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentWindow ?? null
          setReady(true)
        }}
      />
    </ExampleShowcase>
  )
}

export function DocumentTargetExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Document | null>(null)
  const [ready, setReady] = useState(false)
  const { y, x, arrivedState, isScrolling, directions } = useScroll(targetRef, {
    enabled: ready,
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Document target"
      description="Document targets resolve scroll metrics from the document scrolling element — useful for custom iframe documents."
      instruction="Scroll the iframe document and compare y with bottom arrival."
      code={documentTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Ready',
              value: String(ready),
              testId: 'document-ready',
            },
            { label: 'X', value: formatScroll(x), testId: 'document-x' },
            { label: 'Y', value: formatScroll(y), testId: 'document-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'document-scrolling',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'document-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'document-directions',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated document scroll"
        data-testid="document-iframe"
        className={`${surfaceClass} h-64 w-full`}
        srcDoc={`<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#ecfdf5,#fff);min-height:220vh;}</style></head><body><h1 style="margin:0 0 12px;font-size:18px;">Custom document</h1><p>Document target demo.</p></body></html>`}
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentDocument ?? null
          setReady(true)
        }}
      />
    </ExampleShowcase>
  )
}

export function DynamicTargetExample(): ReactElement {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [trackFirst, setTrackFirst] = useState(true)
  const { x, y, isScrolling, arrivedState, directions } = useScroll(
    trackFirst ? firstRef : secondRef,
  )

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Dynamic target"
      description="Switching refs re-attaches listeners on the next commit. Only the active scroller updates x/y."
      instruction="Scroll the first list, switch targets, then scroll the second."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: trackFirst ? 'first' : 'second',
              testId: 'dynamic-active',
            },
            { label: 'X', value: formatScroll(x), testId: 'dynamic-x' },
            { label: 'Y', value: formatScroll(y), testId: 'dynamic-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'dynamic-scrolling',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'dynamic-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'dynamic-directions',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="dynamic-switch"
        onClick={() => {
          setTrackFirst((value) => !value)
        }}
      >
        Switch to {trackFirst ? 'second' : 'first'}
      </button>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div
          ref={firstRef}
          tabIndex={0}
          role="region"
          data-testid="dynamic-first"
          aria-label="First scroll target"
          className={`${scrollerClass} h-32 ${trackFirst ? 'ring-2 ring-indigo-400' : ''}`}
        >
          <div className="h-full bg-indigo-50 p-3" style={{ width: '160%' }}>
            First target
          </div>
        </div>
        <div
          ref={secondRef}
          tabIndex={0}
          role="region"
          data-testid="dynamic-second"
          aria-label="Second scroll target"
          className={`${scrollerClass} h-32 ${!trackFirst ? 'ring-2 ring-indigo-400' : ''}`}
        >
          <div className="h-full bg-violet-50 p-3" style={{ width: '160%' }}>
            Second target
          </div>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const { x, y, directions, isScrolling, arrivedState } = useScroll(ref, {
    enabled,
  })

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Enabled state"
      description="Disabling removes listeners and resets directions without changing the DOM scroll position."
      instruction="Scroll, disable tracking, scroll again, then re-enable."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'enabled-flag',
            },
            { label: 'X', value: formatScroll(x), testId: 'enabled-x' },
            { label: 'Y', value: formatScroll(y), testId: 'enabled-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'enabled-scrolling',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'enabled-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'enabled-directions',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={enabled ? secondaryButtonClass : buttonClass}
        data-testid="enabled-toggle"
        onClick={() => {
          setEnabled((value) => !value)
        }}
      >
        {enabled ? 'Disable tracking' : 'Enable tracking'}
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="enabled-scroller"
        aria-label="Enabled state scroller"
        className={`${scrollerClass} mt-3 h-44`}
      >
        <div className="bg-white p-3" style={{ height: '220%' }}>
          <p className="text-sm text-slate-700">Enabled toggle demo</p>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function RtlHorizontalExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { x, arrivedState, directions, isScrolling, y } = useScroll(ref)

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="RTL horizontal"
      description="RTL scroll containers adjust arrived left/right using the resolved rtl scroll mode."
      instruction="Scroll the RTL gallery and compare x with left/right arrival."
      code={rtlHorizontalSnippet}
      aside={
        <ScrollStatus
          x={x}
          y={y}
          isScrolling={isScrolling}
          arrivedState={arrivedState}
          directions={directions}
          xTestId="rtl-x"
          yTestId="rtl-y"
          scrollingTestId="rtl-scrolling"
          arrivedTestId="rtl-arrived"
          directionsTestId="rtl-directions"
        />
      }
    >
      <div
        ref={ref}
        dir="rtl"
        tabIndex={0}
        role="region"
        data-testid="rtl-gallery"
        aria-label="RTL horizontal gallery"
        className={`${scrollerClass} flex max-w-full gap-3 p-3`}
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            data-testid={`rtl-card-${index + 1}`}
            className="min-h-36 min-w-48 shrink-0 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800"
          >
            Card {index + 1}
          </div>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function ErrorHandlingExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const { setX, x, y, isScrolling, arrivedState, directions } = useScroll(ref, {
    onError: (error) => {
      setErrors((current) => [
        ...current,
        error instanceof Error ? error.message : String(error),
      ])
    },
  })

  const forceScrollError = () => {
    const element = ref.current
    if (element == null) {
      return
    }

    const native = element.scrollTo.bind(element)
    element.scrollTo = () => {
      throw new Error('Scroll blocked')
    }
    setX(48)
    element.scrollTo = native
  }

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Error handling"
      description="Platform scroll failures route to onError without breaking listeners. Consumer onError failures are contained."
      instruction="Force a scroll error and read the captured message list."
      code={errorHandlingSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Errors',
              value: String(errors.length),
              testId: 'error-count',
            },
            { label: 'X', value: formatScroll(x), testId: 'error-x' },
            { label: 'Y', value: formatScroll(y), testId: 'error-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'error-scrolling',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'error-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'error-directions',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="error-force"
        onClick={forceScrollError}
      >
        Force scroll error
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="error-scroller"
        aria-label="Error handling scroller"
        className={`${scrollerClass} mt-3 h-36`}
      >
        <div className="bg-slate-50 p-4" style={{ width: '160%' }} />
      </div>
      <ul
        className="mt-3 space-y-1 text-sm text-rose-700"
        data-testid="error-list"
      >
        {errors.map((message, index) => (
          <li key={`${message}-${index}`} data-testid={`error-item-${index}`}>
            {message}
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  throttle = 0,
  idle = 200,
  offset = 0,
  behavior = 'auto' as ScrollBehavior,
  observeMutation = false,
}: {
  enabled?: boolean
  throttle?: number
  idle?: number
  offset?: number
  behavior?: ScrollBehavior
  observeMutation?: boolean
}): ReactElement {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const edge = offset

  const { x, y, isScrolling, arrivedState, directions, measure } = useScroll(
    ref,
    {
      enabled: mounted && enabled,
      throttle,
      idle,
      behavior,
      observe: observeMutation ? { mutation: true } : false,
      offset: { left: edge, top: edge, right: edge, bottom: edge },
    },
  )

  return (
    <ExampleShowcase
      hookName="useScroll"
      title="Playground"
      description="Experiment with registration-relevant options. Mount explicitly so Docs stays idle until you opt in."
      instruction="Mount the playground, adjust Controls, scroll, and call Measure after layout edits."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'play-mounted',
            },
            { label: 'X', value: formatScroll(x), testId: 'play-x' },
            { label: 'Y', value: formatScroll(y), testId: 'play-y' },
            {
              label: 'Scrolling',
              value: String(isScrolling),
              testId: 'play-scrolling',
            },
            {
              label: 'Arrived',
              value: formatArrived(arrivedState),
              testId: 'play-arrived',
            },
            {
              label: 'Directions',
              value: formatDirections(directions),
              testId: 'play-directions',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="play-mount"
          onClick={() => {
            setMounted(true)
          }}
        >
          Mount playground
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-measure"
          onClick={() => {
            measure()
          }}
        >
          Measure
        </button>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="play-scroller"
        aria-label="Scroll playground"
        className={`${scrollerClass} mt-3 h-52`}
      >
        <div
          className="bg-gradient-to-br from-slate-50 to-indigo-100"
          style={{ width: '180%', height: '180%' }}
        />
      </div>
    </ExampleShowcase>
  )
}
