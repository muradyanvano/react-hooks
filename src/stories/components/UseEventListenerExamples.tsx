import { useId, useRef, useState } from 'react'
import { useEventListener } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  abortSignalSnippet,
  customEventSnippet,
  dynamicTargetSnippet,
  elementTargetSnippet,
  multipleEventsSnippet,
  onceAndEnabledSnippet,
  overviewSnippet,
  playgroundSnippet,
} from './useEventListener.snippets'

type TargetId = 'alpha' | 'beta'
type ItemDetail = { id: string; label: string }

const ITEMS: ItemDetail[] = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
]

function categorizeWidth(width: number) {
  if (width < 640) {
    return 'compact'
  }
  if (width < 1024) {
    return 'comfortable'
  }
  return 'wide'
}

function primaryButtonClassName(disabled = false) {
  return `inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
    disabled
      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
      : 'bg-indigo-600 text-white hover:bg-indigo-500'
  }`
}

function secondaryButtonClassName() {
  return 'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
}

export function OverviewExample() {
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
    <ExampleShowcase
      hookName="useEventListener"
      title="Viewport resize monitor"
      description="Omit the target to listen on window. Initial width and height are seeded from window on first render; the resize counter only increments on resize events."
      instruction="Resize the browser window (or fire a window resize in tests). Watch width, height, category, and the resize counter update. Reset clears the count only."
      badge={category}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Width',
              value: String(width),
              testId: 'viewport-width',
            },
            {
              label: 'Height',
              value: String(height),
              testId: 'viewport-height',
            },
            {
              label: 'Category',
              value: category,
              testId: 'viewport-category',
            },
            {
              label: 'Resizes',
              value: String(resizeCount),
              testId: 'resize-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Size
            </p>
            <p
              className="mt-1 text-lg font-semibold text-slate-900"
              data-testid="viewport-size"
            >
              {width}×{height}
            </p>
          </div>
          <div className="rounded-lg bg-indigo-50/60 px-3 py-3">
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Category
            </p>
            <p className="mt-1 text-lg font-semibold text-indigo-900">
              {category}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Resizes
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {resizeCount}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          Listening on window via omitted target. compact &lt; 640, comfortable
          &lt; 1024, otherwise wide.
        </p>
        <button
          type="button"
          className={secondaryButtonClassName()}
          data-testid="reset-resize"
          onClick={() => {
            setResizeCount(0)
          }}
        >
          Reset count
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function ElementTargetExample() {
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
    <ExampleShowcase
      hookName="useEventListener"
      title="Element target"
      description="Pass a ref to attach listeners to a real DOM node. pointermove reports coordinates; click increments a separate counter."
      instruction="Move the pointer over the button and click it. Coordinates and counts update only for events on that element."
      badge={`${clickCount} clicks`}
      code={elementTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pointer X',
              value: String(x),
              testId: 'pointer-x',
            },
            {
              label: 'Pointer Y',
              value: String(y),
              testId: 'pointer-y',
            },
            {
              label: 'Moves',
              value: String(moveCount),
              testId: 'move-count',
            },
            {
              label: 'Clicks',
              value: String(clickCount),
              testId: 'click-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          ref={buttonRef}
          type="button"
          className={`${primaryButtonClassName()} min-h-24 w-full`}
          data-testid="pointer-target"
          aria-label="Pointer tracking target"
        >
          Move pointer or click
        </button>
        <p className="text-sm text-slate-600" aria-live="polite">
          Last pointer: {x}, {y} · moves {moveCount} · clicks {clickCount}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function MultipleEventsExample() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const [inside, setInside] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEventListener(zoneRef, ['mouseenter', 'mouseleave'], (event) => {
    const nextInside = event.type === 'mouseenter'
    setInside(nextInside)
    setHistory((entries) => [event.type, ...entries].slice(0, 5))
  })

  return (
    <ExampleShowcase
      hookName="useEventListener"
      title="Multiple events"
      description="Pass an array of event names to register one shared handler for each. Here mouseenter and mouseleave drive inside/outside state and a short history."
      instruction="Move the pointer into and out of the hover zone. Status flips between Inside and Outside; recent event types appear in the list."
      badge={inside ? 'Inside' : 'Outside'}
      code={multipleEventsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Presence',
              value: inside ? 'Inside' : 'Outside',
              testId: 'hover-presence',
            },
            {
              label: 'Last event',
              value: history[0] ?? 'None yet',
              testId: 'hover-last',
            },
            {
              label: 'History',
              value: String(history.length),
              testId: 'hover-history-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          ref={zoneRef}
          tabIndex={0}
          aria-label="Hover zone"
          data-testid="hover-zone"
          className={`rounded-xl border px-4 py-10 text-center text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
            inside
              ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {inside ? 'Pointer is inside' : 'Hover or focus this zone'}
        </div>
        <ul
          className="space-y-1 text-sm text-slate-600"
          aria-live="polite"
          data-testid="hover-history"
        >
          {history.length === 0 ? (
            <li>No events yet</li>
          ) : (
            history.map((entry, index) => (
              <li
                key={`${entry}-${index}`}
                data-testid={`hover-entry-${index}`}
              >
                {entry}
              </li>
            ))
          )}
        </ul>
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const alphaRef = useRef<HTMLDivElement>(null)
  const betaRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<TargetId>('alpha')
  const [lastTarget, setLastTarget] = useState('None yet')
  const [eventCount, setEventCount] = useState(0)
  const selectId = useId()

  const activeRef = activeId === 'alpha' ? alphaRef : betaRef

  useEventListener(activeRef, 'click', () => {
    setLastTarget(activeId)
    setEventCount((count) => count + 1)
  })

  return (
    <ExampleShowcase
      hookName="useEventListener"
      title="Dynamic target"
      description="Choose which ref is active through React state. After the next commit, the hook syncs to the new element; the previous target stops reporting."
      instruction="Select Alpha or Beta, then click that panel. Only the active target increments the counter. Switch and confirm the other panel is silent."
      badge={`Active: ${activeId}`}
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: activeId,
              testId: 'active-target',
            },
            {
              label: 'Last reported',
              value: lastTarget,
              testId: 'last-target',
            },
            {
              label: 'Events',
              value: String(eventCount),
              testId: 'dynamic-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor={selectId}
          className="block space-y-1.5 text-sm font-medium text-slate-800"
        >
          Active target
          <select
            id={selectId}
            value={activeId}
            data-testid="target-select"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onChange={(event) => {
              setActiveId(event.target.value as TargetId)
            }}
          >
            <option value="alpha">Alpha</option>
            <option value="beta">Beta</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            ref={alphaRef}
            role="button"
            tabIndex={0}
            aria-label="Alpha panel"
            data-testid="target-alpha"
            className={`cursor-pointer rounded-xl border px-4 py-8 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              activeId === 'alpha'
                ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                alphaRef.current?.click()
              }
            }}
          >
            Alpha panel
          </div>
          <div
            ref={betaRef}
            role="button"
            tabIndex={0}
            aria-label="Beta panel"
            data-testid="target-beta"
            className={`cursor-pointer rounded-xl border px-4 py-8 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
              activeId === 'beta'
                ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                betaRef.current?.click()
              }
            }}
          >
            Beta panel
          </div>
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          Active target id: {activeId}. Last reported: {lastTarget}.
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function CustomEventExample() {
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
    <ExampleShowcase
      hookName="useEventListener"
      title="Custom event"
      description="Listen for a typed CustomEvent on a container ref. Handlers receive event.detail with your payload shape."
      instruction="Click Select Alpha or Select Beta. The live status shows the selected id and label from the CustomEvent detail."
      badge={selected?.label ?? 'None'}
      code={customEventSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Selected id',
              value: selected?.id ?? 'None yet',
              testId: 'selected-id',
            },
            {
              label: 'Selected label',
              value: selected?.label ?? 'None yet',
              testId: 'selected-label',
            },
          ]}
        />
      }
    >
      <div
        ref={targetRef}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="custom-event-root"
      >
        <div className="flex flex-wrap gap-2">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={primaryButtonClassName()}
              data-testid={`select-${item.id}`}
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
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          {selected
            ? `Selected ${selected.id} · ${selected.label}`
            : 'Nothing selected yet'}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function OnceAndEnabledExample() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Armed — waiting for first click')
  const enabledId = useId()

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
    <ExampleShowcase
      hookName="useEventListener"
      title="Once and enabled"
      description="With once: true the first matching event is handled and later ones are ignored while that registration stays armed. Changing the handler does not re-arm — toggle enabled off then on to reset."
      instruction="Click Fire once (count becomes 1). Click again (still 1). Uncheck Listening enabled, re-check it, then click again to re-arm."
      badge={enabled ? 'Enabled' : 'Paused'}
      code={onceAndEnabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mode',
              value: enabled ? 'Enabled' : 'Paused',
              testId: 'once-mode',
            },
            {
              label: 'Handled',
              value: String(count),
              testId: 'once-count',
            },
            {
              label: 'Status',
              value: status,
              testId: 'once-status',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor={enabledId}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-800"
        >
          <input
            id={enabledId}
            type="checkbox"
            checked={enabled}
            data-testid="once-enabled-checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
        <button
          ref={buttonRef}
          type="button"
          className={primaryButtonClassName()}
          data-testid="once-fire"
        >
          Fire once
        </button>
        <p className="text-sm text-slate-600" aria-live="polite">
          {status}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function AbortSignalExample() {
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
    <ExampleShowcase
      hookName="useEventListener"
      title="Abort signal"
      description="Pass an AbortSignal via options.signal. Aborting removes the listener; replace the controller in state to register again with a fresh signal."
      instruction="Click the target to count. Press Abort signal — further clicks are ignored. Press New controller to restore listening."
      badge={phase === 'Listening' ? 'Active' : 'Aborted'}
      code={abortSignalSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Phase',
              value: phase,
              testId: 'abort-phase',
            },
            {
              label: 'Clicks',
              value: String(count),
              testId: 'abort-count',
            },
            {
              label: 'Aborted',
              value: String(controller.signal.aborted),
              testId: 'abort-flag',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          ref={buttonRef}
          type="button"
          className={primaryButtonClassName()}
          data-testid="abort-target"
        >
          Click target
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="abort-signal"
            onClick={() => {
              controller.abort()
              setPhase('Aborted — clicks ignored')
            }}
          >
            Abort signal
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="new-controller"
            onClick={() => {
              setController(new AbortController())
              setPhase('Listening')
            }}
          >
            New controller
          </button>
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          {phase}. Count stays at {count} while aborted.
        </p>
      </div>
    </ExampleShowcase>
  )
}

export type PlaygroundOptions = {
  enabled?: boolean
  capture?: boolean
  passive?: boolean
  once?: boolean
}

export function PlaygroundExample({
  enabled = true,
  capture = false,
  passive = false,
  once = false,
}: PlaygroundOptions) {
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

  const optionSummary = [
    enabled ? 'enabled' : 'paused',
    capture ? 'capture' : null,
    passive ? 'passive' : null,
    once ? 'once' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ExampleShowcase
      hookName="useEventListener"
      title="Playground"
      description="Tune enabled, capture, passive, and once from Controls. The target is a stable button listening for click."
      instruction="Adjust options in Controls, click the button, inspect the count, then reset. With once enabled, only the first click after registration counts until options re-register."
      badge={enabled ? 'Active' : 'Paused'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Options',
              value: optionSummary,
              testId: 'playground-options',
            },
            {
              label: 'Clicks',
              value: String(count),
              testId: 'playground-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Options
            </dt>
            <dd className="font-semibold text-slate-900">{optionSummary}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Clicks
            </dt>
            <dd className="font-semibold text-slate-900">{count}</dd>
          </div>
        </dl>
        <button
          ref={buttonRef}
          type="button"
          className={primaryButtonClassName()}
          data-testid="playground-target"
        >
          Click me
        </button>
        <p className="text-sm text-slate-600" aria-live="polite">
          {enabled
            ? `Listening with ${optionSummary}.`
            : 'Paused — clicks are ignored.'}
        </p>
        <button
          type="button"
          className={secondaryButtonClassName()}
          data-testid="playground-reset"
          onClick={() => {
            setCount(0)
          }}
        >
          Reset
        </button>
      </div>
    </ExampleShowcase>
  )
}
