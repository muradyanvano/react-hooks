import { useEffect, useState } from 'react'

import { useNProgress } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  asyncSaveSnippet,
  concurrentRequestsSnippet,
  customContainerSnippet,
  declarativeSnippet,
  determinateSnippet,
  dynamicTargetSnippet,
  forcedDoneSnippet,
  immediateRemoveSnippet,
  incrementSnippet,
  multipleContainersSnippet,
  multipleOwnersSnippet,
  playgroundSnippet,
  reducedMotionSnippet,
  routeTransitionSnippet,
  spinnerSnippet,
  ssrBehaviorSnippet,
  startAndDoneSnippet,
  strictCleanupSnippet,
  trickleSnippet,
  visualCustomizationSnippet,
} from './useNProgress.snippets'

// ─── Shared progress bar container style ─────────────────────────────────────

function ProgressContainer({
  children,
  setParent,
  label,
}: {
  children: React.ReactNode
  setParent?: (el: HTMLDivElement | null) => void
  label?: string
}) {
  return (
    <div
      ref={setParent}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      data-testid="progress-container"
    >
      {label ? (
        <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
          {label}
        </p>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── Route Transition ─────────────────────────────────────────────────────────

const ROUTES = [
  { id: 'home', label: 'Home', icon: '🏠', duration: 600 },
  { id: 'dashboard', label: 'Dashboard', icon: '📊', duration: 1200 },
  { id: 'settings', label: 'Settings', icon: '⚙️', duration: 400 },
  { id: 'profile', label: 'Profile', icon: '👤', duration: 800 },
]

function SkeletonLine({ w }: { w: string }) {
  return <div className={`h-3 rounded bg-slate-200 animate-pulse ${w}`} />
}

export function RouteTransitionExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const [current, setCurrent] = useState(ROUTES[0]!)
  const [content, setContent] = useState<string | null>(ROUTES[0]!.label)
  const [loading, setLoading] = useState(false)

  const { start, done } = useNProgress(undefined, {
    parent,
    trickle: true,
    trickleSpeed: 300,
    speed: 200,
    removeDelay: 200,
    color: '#4f46e5',
    height: 3,
  })

  const navigate = async (route: (typeof ROUTES)[number]) => {
    if (route.id === current.id || loading) return
    setLoading(true)
    setContent(null)
    start()
    await new Promise<void>((r) => setTimeout(r, route.duration))
    setCurrent(route)
    setContent(route.label)
    setLoading(false)
    done()
  }

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Route transition"
      description="Simulated single-page navigation with a shared top progress indicator and content skeleton."
      instruction="Click a navigation item to simulate loading a new route. Fast and slow routes demonstrate different durations."
      code={routeTransitionSnippet}
    >
      <ProgressContainer setParent={setParent} label="Application shell">
        {/* Navigation */}
        <nav className="flex flex-wrap gap-2 mb-4" aria-label="Main navigation">
          {ROUTES.map((route) => (
            <button
              key={route.id}
              type="button"
              data-testid={`nav-${route.id}`}
              onClick={() => {
                void navigate(route)
              }}
              disabled={loading}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                current.id === route.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-50'
              }`}
            >
              <span aria-hidden="true">{route.icon}</span>
              {route.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="min-h-[120px]" aria-live="polite" aria-busy={loading}>
          {loading ? (
            <div
              className="space-y-3"
              role="status"
              aria-label="Loading content"
            >
              <SkeletonLine w="w-3/4" />
              <SkeletonLine w="w-full" />
              <SkeletonLine w="w-5/6" />
              <SkeletonLine w="w-2/3" />
            </div>
          ) : (
            <div>
              <h3
                className="text-lg font-semibold text-slate-900 mb-2"
                data-testid="route-heading"
              >
                {content}
              </h3>
              <p className="text-sm text-slate-600">
                Route{' '}
                <code className="bg-slate-100 px-1 rounded">{current.id}</code>{' '}
                loaded successfully.
              </p>
            </div>
          )}
        </div>
      </ProgressContainer>

      <StatusPanel
        items={[
          {
            label: 'Current route',
            value: current.label,
            testId: 'status-route',
          },
          {
            label: 'Loading',
            value: String(loading),
            testId: 'status-loading',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Start and Done ───────────────────────────────────────────────────────────

export function StartAndDoneExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, done } = useNProgress(undefined, {
    parent,
    trickle: true,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Start and done"
      description="Basic imperative control using start() and done()."
      instruction="Press Start to begin, then Complete to finish with the transition animation."
      code={startAndDoneSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            disabled={isLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            Start
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            Complete
          </button>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Determinate Progress ─────────────────────────────────────────────────────

export function DeterminateExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, set } = useNProgress(undefined, {
    parent,
    trickle: false,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Determinate progress"
      description="Set an exact progress value using the slider."
      instruction="Drag the slider to control progress precisely. Values below 0.08 snap to the minimum. Setting to 100% triggers completion."
      code={determinateSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="progress-slider"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Progress:{' '}
              <span data-testid="slider-value" className="font-mono">
                {Math.round((progress ?? 0) * 100)}%
              </span>
            </label>
            <input
              id="progress-slider"
              data-testid="progress-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round((progress ?? 0) * 100)}
              onChange={(e) => set(Number(e.target.value) / 100)}
              className="w-full accent-indigo-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-reset"
              onClick={() => set(0)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              data-testid="btn-complete"
              onClick={() => set(1)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Complete (100%)
            </button>
          </div>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Declarative Progress ─────────────────────────────────────────────────────

export function DeclarativeExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const [value, setValue] = useState<number | null | undefined>(undefined)
  const { isLoading, progress } = useNProgress(value, {
    parent,
    trickle: false,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Declarative progress"
      description="Control progress by passing a value as the first argument. undefined = imperative mode, null = complete, number = set progress."
      instruction="Use the controls to set the currentProgress parameter directly."
      code={declarativeSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="btn-undefined"
            onClick={() => setValue(undefined)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${value === undefined ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            undefined (imperative)
          </button>
          <button
            type="button"
            data-testid="btn-null"
            onClick={() => setValue(null)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${value === null ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            null (complete)
          </button>
          {[0.3, 0.6, 0.9].map((v) => (
            <button
              key={v}
              type="button"
              data-testid={`btn-${Math.round(v * 100)}`}
              onClick={() => setValue(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${value === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
            >
              {Math.round(v * 100)}%
            </button>
          ))}
          <button
            type="button"
            data-testid="btn-complete"
            onClick={() => setValue(1)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white border-green-600"
          >
            1 (complete)
          </button>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'currentProgress',
            value: value === undefined ? 'undefined' : String(value),
            testId: 'status-current',
          },
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Trickle ──────────────────────────────────────────────────────────────────

export function TrickleExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, done } = useNProgress(undefined, {
    parent,
    trickle: true,
    trickleSpeed: 400,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Trickle progress"
      description="Automatic incremental progress that gives visual feedback while waiting for an operation. This is estimated progress, not measured work."
      instruction="Start and watch the bar advance automatically. Complete it when ready."
      code={trickleSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex gap-3">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            disabled={isLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Start trickle
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Complete
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Trickle advances the bar at decreasing intervals. It does not measure
          real work completion.
        </p>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Increment ────────────────────────────────────────────────────────────────

export function IncrementExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, increment, done } = useNProgress(
    undefined,
    {
      parent,
      trickle: false,
    },
  )

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Manual increment"
      description="Advance progress in steps. increment() uses an automatic amount based on current progress. increment(amount) uses an explicit value."
      instruction="Start, then increment manually or with an explicit amount."
      code={incrementSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Start
          </button>
          <button
            type="button"
            data-testid="btn-auto"
            onClick={() => increment()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            increment() auto
          </button>
          <button
            type="button"
            data-testid="btn-10"
            onClick={() => increment(0.1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            +10%
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            Complete
          </button>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Forced completion ────────────────────────────────────────────────────────

export function ForcedDoneExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, done } = useNProgress(undefined, {
    parent,
    trickle: false,
    speed: 200,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Forced completion"
      description="done(force: true) briefly shows a complete bar even when idle, then removes it. Useful for instant feedback."
      instruction="Try done() while idle (no-op), then done(force) while idle."
      code={forcedDoneSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Start
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            done() — no-op if idle
          </button>
          <button
            type="button"
            data-testid="btn-force"
            onClick={() => done(true)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700"
          >
            done(force) — shows even if idle
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          force does not affect other active owners sharing the same bar.
        </p>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Immediate Remove ─────────────────────────────────────────────────────────

export function ImmediateRemoveExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, start, done, remove } = useNProgress(undefined, {
    parent,
    trickle: false,
    speed: 300,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Immediate remove"
      description="remove() immediately releases the owner with no completion animation. done() plays the full transition."
      instruction="Start, then compare done() (animated) vs remove() (instant)."
      code={immediateRemoveSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Start
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            done() — animated
          </button>
          <button
            type="button"
            data-testid="btn-remove"
            onClick={remove}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
          >
            remove() — instant
          </button>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Multiple Owners ──────────────────────────────────────────────────────────

export function MultipleOwnersExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)

  const {
    isLoading: slowLoading,
    progress: slowProgress,
    start: startSlow,
    done: doneSlow,
  } = useNProgress(undefined, { parent, trickle: false })

  const {
    isLoading: fastLoading,
    progress: fastProgress,
    start: startFast,
    done: doneFast,
  } = useNProgress(undefined, { parent, trickle: false })

  const runSlow = () => {
    startSlow()
    setTimeout(() => {
      void doneSlow()
    }, 2000)
  }

  const runFast = () => {
    startFast()
    setTimeout(() => {
      void doneFast()
    }, 600)
  }

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Multiple owners"
      description="Two independent hook instances share one visual bar in the same container. The bar displays the minimum (slowest) active progress."
      instruction="Start both operations. The bar reflects the slower owner until it completes."
      code={multipleOwnersSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              Slow request (2 s)
            </p>
            <button
              type="button"
              data-testid="btn-slow"
              onClick={runSlow}
              disabled={slowLoading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {slowLoading
                ? `${Math.round((slowProgress ?? 0) * 100)}%`
                : 'Start slow'}
            </button>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              Fast request (0.6 s)
            </p>
            <button
              type="button"
              data-testid="btn-fast"
              onClick={runFast}
              disabled={fastLoading}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {fastLoading
                ? `${Math.round((fastProgress ?? 0) * 100)}%`
                : 'Start fast'}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Shared bar = min({Math.round((slowProgress ?? 0) * 100)}%,{' '}
          {Math.round((fastProgress ?? 0) * 100)}%)
        </p>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

// ─── Custom Container ─────────────────────────────────────────────────────────

export function CustomContainerExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, done } = useNProgress(undefined, {
    parent,
    color: '#10b981',
    height: 2,
    trickle: true,
  })

  const save = async () => {
    start()
    await new Promise<void>((r) => setTimeout(r, 1200))
    done()
  }

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Custom container"
      description="Render the progress bar inside a specific element rather than at the top of the page."
      instruction="Click Save to see the progress bar at the top of the card."
      code={customContainerSnippet}
    >
      <div
        ref={setParent}
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        data-testid="custom-card"
      >
        <div className="p-5 space-y-3">
          <h3 className="font-semibold text-slate-900">Project settings</h3>
          <p className="text-sm text-slate-600">
            {isLoading
              ? `Saving… ${Math.round((progress ?? 0) * 100)}%`
              : 'Changes are up to date.'}
          </p>
          <button
            type="button"
            data-testid="btn-save"
            onClick={() => {
              void save()
            }}
            disabled={isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

// ─── Multiple Containers ──────────────────────────────────────────────────────

function IndependentPanel({
  label,
  color,
  testId,
}: {
  label: string
  color: string
  testId: string
}) {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, start, done } = useNProgress(undefined, {
    parent,
    color,
    height: 2,
    trickle: false,
  })

  const run = () => {
    start()
    setTimeout(() => done(), 1500)
  }

  return (
    <div
      ref={setParent}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      data-testid={testId}
    >
      <div className="p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <button
          type="button"
          data-testid={`${testId}-btn`}
          onClick={run}
          disabled={isLoading}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {isLoading ? 'Loading…' : 'Load'}
        </button>
      </div>
    </div>
  )
}

export function MultipleContainersExample() {
  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Multiple containers"
      description="Each panel has its own independent progress channel. Different parents = different channels."
      instruction="Load each panel independently. They don't affect each other."
      code={multipleContainersSnippet}
    >
      <div className="grid grid-cols-2 gap-4">
        <IndependentPanel label="Panel A" color="#4f46e5" testId="panel-a" />
        <IndependentPanel label="Panel B" color="#10b981" testId="panel-b" />
      </div>
    </ExampleShowcase>
  )
}

// ─── Spinner Toggle ───────────────────────────────────────────────────────────

export function SpinnerExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const [showSpinner, setShowSpinner] = useState(true)
  const { isLoading, start, done } = useNProgress(undefined, {
    parent,
    showSpinner,
    trickle: true,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Spinner visibility"
      description="Toggle the corner spinner independently from the progress bar."
      instruction="Toggle the checkbox and start to see the effect."
      code={spinnerSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              data-testid="spinner-toggle"
              checked={showSpinner}
              onChange={(e) => setShowSpinner(e.target.checked)}
              className="rounded"
            />
            Show spinner
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-start"
              onClick={start}
              disabled={isLoading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Start
            </button>
            <button
              type="button"
              data-testid="btn-done"
              onClick={() => done()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

// ─── Visual Customization ─────────────────────────────────────────────────────

export function VisualCustomizationExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const [color, setColor] = useState('#4f46e5')
  const [height, setHeight] = useState(3)
  const [speed, setSpeed] = useState(200)
  const { isLoading, start, done } = useNProgress(undefined, {
    parent,
    color,
    height,
    speed,
    trickle: true,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Visual customization"
      description="Color, height, speed, and easing are all configurable."
      instruction="Change the options and start to see the difference."
      code={visualCustomizationSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label
              className="block text-xs font-medium text-slate-600 mb-1"
              htmlFor="color-input"
            >
              Color
            </label>
            <input
              id="color-input"
              data-testid="color-input"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-full rounded cursor-pointer"
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium text-slate-600 mb-1"
              htmlFor="height-input"
            >
              Height: {height}px
            </label>
            <input
              id="height-input"
              data-testid="height-input"
              type="range"
              min="1"
              max="8"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium text-slate-600 mb-1"
              htmlFor="speed-input"
            >
              Speed: {speed}ms
            </label>
            <input
              id="speed-input"
              data-testid="speed-input"
              type="range"
              min="100"
              max="800"
              step="50"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            disabled={isLoading}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            Done
          </button>
        </div>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

// ─── Reduced Motion ───────────────────────────────────────────────────────────

export function ReducedMotionExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { start, done } = useNProgress(undefined, {
    parent,
    trickle: true,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Reduced motion"
      description="The injected stylesheet includes a prefers-reduced-motion media query that disables the transition and spinner animation automatically."
      instruction="On a system with reduced motion enabled, the bar appears without animation."
      code={reducedMotionSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
            The progress bar respects{' '}
            <code className="bg-amber-100 rounded px-1">
              prefers-reduced-motion
            </code>{' '}
            automatically via the injected stylesheet.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-start"
              onClick={start}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Start
            </button>
            <button
              type="button"
              data-testid="btn-done"
              onClick={() => done()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

// ─── Dynamic Target ───────────────────────────────────────────────────────────

export function DynamicTargetExample() {
  const [panel1, setPanel1] = useState<HTMLElement | null>(null)
  const [panel2, setPanel2] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState<1 | 2>(1)

  const parent = active === 1 ? panel1 : panel2
  const { isLoading, start, done } = useNProgress(undefined, {
    parent,
    trickle: true,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Dynamic target"
      description="Switch the progress indicator between containers. When the parent changes, the old channel is released and a new one is acquired."
      instruction="Select a panel, start progress, then switch panels."
      code={dynamicTargetSnippet}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="btn-panel1"
            onClick={() => setActive(1)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${active === 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            Panel 1
          </button>
          <button
            type="button"
            data-testid="btn-panel2"
            onClick={() => setActive(2)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${active === 2 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            Panel 2
          </button>
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            disabled={isLoading}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Start
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            Done
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div
            ref={setPanel1}
            className={`relative overflow-hidden rounded-xl border p-4 ${active === 1 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
            data-testid="panel-1"
          >
            <p className="text-sm font-medium text-slate-700">Panel 1</p>
            {active === 1 ? (
              <p className="text-xs text-indigo-600 mt-1">Active target</p>
            ) : null}
          </div>
          <div
            ref={setPanel2}
            className={`relative overflow-hidden rounded-xl border p-4 ${active === 2 ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}
            data-testid="panel-2"
          >
            <p className="text-sm font-medium text-slate-700">Panel 2</p>
            {active === 2 ? (
              <p className="text-xs text-indigo-600 mt-1">Active target</p>
            ) : null}
          </div>
        </div>
      </div>
    </ExampleShowcase>
  )
}

// ─── Async Save ───────────────────────────────────────────────────────────────

async function fakeApiSave(shouldFail: boolean): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 1200))
  if (shouldFail) throw new Error('Network error')
}

export function AsyncSaveExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, increment, done } = useNProgress(
    undefined,
    {
      parent,
      trickle: false,
    },
  )
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const save = async (fail: boolean) => {
    setStatus('idle')
    start()
    increment(0.2)
    try {
      await fakeApiSave(fail)
      increment(0.6)
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      done()
    }
  }

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Async save"
      description="Realistic save workflow: start progress, increment at checkpoints, complete on success or error."
      instruction="Click Save to simulate an API call. Try the error variant to confirm cleanup."
      code={asyncSaveSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="space-y-3">
          <p className="text-sm text-slate-700" data-testid="status-text">
            {isLoading
              ? `Saving… ${Math.round((progress ?? 0) * 100)}%`
              : status === 'success'
                ? '✅ Saved successfully'
                : status === 'error'
                  ? '❌ Save failed'
                  : 'Ready to save'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-save"
              onClick={() => {
                void save(false)
              }}
              disabled={isLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              data-testid="btn-save-fail"
              onClick={() => {
                void save(true)
              }}
              disabled={isLoading}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Save (fail)
            </button>
          </div>
        </div>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

// ─── Concurrent Requests ──────────────────────────────────────────────────────

function ConcurrentRequest({
  label,
  duration,
  color,
  testId,
  parent,
}: {
  label: string
  duration: number
  color: string
  testId: string
  parent: HTMLElement | null
}) {
  const { isLoading, progress, start, done } = useNProgress(undefined, {
    parent,
    trickle: false,
    color,
  })

  const run = () => {
    start()
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      setTimeout(
        () => {
          if (i < steps) {
            void 0 // trickle handles it via start
          } else {
            done()
          }
        },
        (duration / steps) * i,
      )
    }
  }

  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-3"
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{duration}ms</span>
      </div>
      <button
        type="button"
        data-testid={`${testId}-btn`}
        onClick={run}
        disabled={isLoading}
        className="rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: color }}
      >
        {isLoading ? `${Math.round((progress ?? 0) * 100)}%` : 'Start'}
      </button>
    </div>
  )
}

export function ConcurrentRequestsExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Concurrent requests"
      description="Multiple requests sharing one bar. The shared bar reflects the slowest active progress."
      instruction="Start several requests in different orders to see aggregation in action."
      code={concurrentRequestsSnippet}
    >
      <ProgressContainer setParent={setParent} label="Shared bar">
        <div className="grid grid-cols-3 gap-2 mt-2">
          <ConcurrentRequest
            label="Task A"
            duration={600}
            color="#4f46e5"
            testId="task-a"
            parent={parent}
          />
          <ConcurrentRequest
            label="Task B"
            duration={1200}
            color="#10b981"
            testId="task-b"
            parent={parent}
          />
          <ConcurrentRequest
            label="Task C"
            duration={2000}
            color="#f59e0b"
            testId="task-c"
            parent={parent}
          />
        </div>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

// ─── Strict Cleanup ───────────────────────────────────────────────────────────

export function StrictCleanupExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(true)
  const [rootCount, setRootCount] = useState(0)

  useEffect(() => {
    const count =
      parent?.querySelectorAll('[data-react-hooks-nprogress-root]').length ?? 0
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRootCount(count)
  }, [mounted, parent])

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Strict cleanup"
      description="Unmounting releases the owner, cancels all timers, and removes the DOM element when no other owners remain."
      instruction="Unmount the component and verify no progress DOM remains."
      code={strictCleanupSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-mount"
              onClick={() => setMounted(true)}
              disabled={mounted}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Mount
            </button>
            <button
              type="button"
              data-testid="btn-unmount"
              onClick={() => setMounted(false)}
              disabled={!mounted}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
            >
              Unmount
            </button>
          </div>
          {mounted ? (
            <MountableProgressComponent parent={parent} />
          ) : (
            <p className="text-sm text-slate-500" data-testid="unmounted-text">
              Component unmounted. Progress DOM nodes: {rootCount}
            </p>
          )}
        </div>
      </ProgressContainer>
    </ExampleShowcase>
  )
}

function MountableProgressComponent({
  parent,
}: {
  parent: HTMLElement | null
}) {
  const { isLoading, start, done } = useNProgress(undefined, {
    parent,
    trickle: false,
  })
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-700" data-testid="mounted-status">
        Mounted — {isLoading ? 'Loading' : 'Idle'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="btn-inner-start"
          onClick={start}
          className="rounded px-3 py-1 text-xs font-medium bg-indigo-600 text-white"
        >
          Start
        </button>
        <button
          type="button"
          data-testid="btn-inner-done"
          onClick={() => done()}
          className="rounded px-3 py-1 text-xs font-medium border border-slate-200 text-slate-700"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ─── SSR Behavior ─────────────────────────────────────────────────────────────

export function SsrBehaviorExample() {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, done } = useNProgress(undefined, {
    parent,
  })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="SSR behavior"
      description="During server-side rendering, useNProgress returns idle state with no DOM, styles, or timers. Effects activate the hook after the client mounts."
      instruction="This example represents what a server-rendered component would return."
      code={ssrBehaviorSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
            <strong>SSR idle state:</strong> isLoading = false, progress = null.
            After mount, imperative calls work normally.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="btn-start"
              onClick={start}
              disabled={isLoading}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Start (client only)
            </button>
            <button
              type="button"
              data-testid="btn-done"
              onClick={() => done()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            >
              Done
            </button>
          </div>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}

// ─── Playground ───────────────────────────────────────────────────────────────

export function PlaygroundExample({
  trickle = true,
  showSpinner = true,
  color = '#4f46e5',
  height = 3,
  speed = 200,
  minimum = 0.08,
  removeDelay = 200,
}: {
  trickle?: boolean
  showSpinner?: boolean
  color?: string
  height?: number
  speed?: number
  minimum?: number
  removeDelay?: number
}) {
  const [parent, setParent] = useState<HTMLElement | null>(null)
  const { isLoading, progress, start, set, increment, done, remove } =
    useNProgress(undefined, {
      parent,
      trickle,
      showSpinner,
      color,
      height,
      speed,
      minimum,
      removeDelay,
    })

  return (
    <ExampleShowcase
      hookName="useNProgress"
      title="Playground"
      description="Explore all options with Storybook Controls. Mount-gated so Docs rendering does not auto-start."
      instruction="Use the Controls panel to adjust options, then trigger actions."
      code={playgroundSnippet}
    >
      <ProgressContainer setParent={setParent}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="btn-start"
            onClick={start}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            start()
          </button>
          <button
            type="button"
            data-testid="btn-set50"
            onClick={() => set(0.5)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            set(0.5)
          </button>
          <button
            type="button"
            data-testid="btn-increment"
            onClick={() => increment()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            increment()
          </button>
          <button
            type="button"
            data-testid="btn-done"
            onClick={() => done()}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            done()
          </button>
          <button
            type="button"
            data-testid="btn-remove"
            onClick={remove}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
          >
            remove()
          </button>
        </div>
      </ProgressContainer>
      <StatusPanel
        items={[
          {
            label: 'isLoading',
            value: String(isLoading),
            testId: 'status-loading',
          },
          {
            label: 'progress',
            value: progress != null ? `${Math.round(progress * 100)}%` : 'null',
            testId: 'status-progress',
          },
        ]}
      />
    </ExampleShowcase>
  )
}
