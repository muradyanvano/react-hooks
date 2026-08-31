import { useEffect, useId, useRef, useState } from 'react'
import {
  useOnLongPress,
  type UseOnLongPressOptions,
  type UseOnLongPressReleaseDetails,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  delayComparisonSnippet,
  enabledSnippet,
  movementSnippet,
  overviewSnippet,
  playgroundSnippet,
  pointerTypesSnippet,
  releaseMetricsSnippet,
  selfSnippet,
} from './useOnLongPress.snippets'

export type DemoOptions = Pick<
  UseOnLongPressOptions,
  | 'enabled'
  | 'delay'
  | 'distanceThreshold'
  | 'button'
  | 'self'
  | 'preventDefault'
  | 'stopPropagation'
  | 'capture'
>

function formatMs(value: number): string {
  return `${Math.round(value)} ms`
}

function formatPx(value: number): string {
  return `${value.toFixed(1)} px`
}

export function OverviewExample({
  delay = 500,
  onLongPress,
}: {
  delay?: number | undefined
  onLongPress?: ((event: PointerEvent) => void) | undefined
}) {
  const [favorited, setFavorited] = useState(false)
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const [count, setCount] = useState(0)
  const [lastRelease, setLastRelease] = useState('None yet')
  const targetRef = useRef<HTMLButtonElement>(null)
  const progressId = useId()

  useOnLongPress(
    targetRef,
    (event) => {
      setFavorited(true)
      setHolding(false)
      setProgress(100)
      setCount((value) => value + 1)
      onLongPress?.(event)
    },
    {
      delay,
      onRelease: (details) => {
        setHolding(false)
        setProgress(details.isLongPress ? 100 : 0)
        setLastRelease(
          details.isLongPress
            ? `Long press · ${formatMs(details.duration)} · ${formatPx(details.distance)}`
            : `Short press · ${formatMs(details.duration)} · ${formatPx(details.distance)}`,
        )
      },
    },
  )

  useEffect(() => {
    if (!holding) {
      return
    }

    const started = performance.now()
    let frame = 0

    const tick = () => {
      const elapsed = performance.now() - started
      setProgress(Math.min(100, (elapsed / delay) * 100))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [holding, delay])

  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Hold to confirm"
      description="Press and hold to favorite a sample item. Long press is an enhancement — a normal click alternative is always available. Progress UI is example-managed, not returned by the hook."
      instruction="Hold the primary button until the progress fills, or use Favorite with click. Release early to cancel."
      badge={favorited ? 'Favorited' : holding ? 'Holding' : 'Idle'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'State',
              value: favorited ? 'Favorited' : holding ? 'Holding' : 'Idle',
              testId: 'overview-state',
            },
            {
              label: 'Activations',
              value: String(count),
              testId: 'overview-count',
            },
            {
              label: 'Last release',
              value: lastRelease,
              testId: 'overview-release',
            },
          ]}
        />
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Accessibility: long press must not be the only way to perform an
          essential action. Keyboard and motor-impaired users need an equivalent
          control.
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              ref={targetRef}
              type="button"
              data-testid="overview-hold"
              className="inline-flex min-h-11 min-w-[10rem] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              style={{ touchAction: 'none', userSelect: 'none' }}
              onPointerDown={() => {
                setHolding(true)
                setProgress(0)
              }}
              onPointerUp={() => {
                setHolding(false)
              }}
              onPointerCancel={() => {
                setHolding(false)
                setProgress(0)
              }}
            >
              {favorited ? 'Favorited' : 'Hold to favorite'}
            </button>
            <button
              type="button"
              data-testid="overview-click-alt"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => {
                setFavorited(true)
                setCount((value) => value + 1)
                setLastRelease('Activated via click alternative')
              }}
            >
              Favorite with click
            </button>
            <button
              type="button"
              data-testid="overview-reset"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => {
                setFavorited(false)
                setCount(0)
                setProgress(0)
                setHolding(false)
                setLastRelease('None yet')
              }}
            >
              Reset
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <span id={progressId}>Hold progress</span>
              <span data-testid="overview-progress-label">
                {Math.round(progress)}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-labelledby={progressId}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              data-testid="overview-progress"
              className="h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-indigo-500 transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </ExampleShowcase>
  )
}

function DelayCard({
  label,
  delay,
  testIdPrefix,
}: {
  label: string
  delay: number | ((event: PointerEvent) => number)
  testIdPrefix: string
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

  const delayLabel =
    typeof delay === 'function' ? 'touch 800 / else 500' : `${delay} ms`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-500">Delay: {delayLabel}</p>
      <button
        ref={targetRef}
        type="button"
        data-testid={`${testIdPrefix}-hold`}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        Hold
      </button>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Count</dt>
          <dd
            className="font-semibold text-slate-900"
            data-testid={`${testIdPrefix}-count`}
          >
            {count}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Pointer</dt>
          <dd
            className="font-semibold text-slate-900"
            data-testid={`${testIdPrefix}-pointer`}
          >
            {pointerType}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function DelayComparisonExample() {
  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Delay comparison"
      description="Compare fixed delays and a dynamic delay based on pointer type. Long press remains an enhancement — each target still needs an accessible alternative in production UI."
      instruction="Hold each target. Touch pointers use a longer delay on the dynamic card."
      code={delayComparisonSnippet}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <DelayCard label="Fast" delay={300} testIdPrefix="delay-300" />
        <DelayCard label="Default" delay={500} testIdPrefix="delay-500" />
        <DelayCard
          label="Dynamic"
          delay={(event) => (event.pointerType === 'touch' ? 800 : 500)}
          testIdPrefix="delay-dynamic"
        />
      </div>
    </ExampleShowcase>
  )
}

export function MovementCancellationExample({
  delay = 500,
  distanceThreshold = 10,
}: {
  delay?: number | undefined
  distanceThreshold?: number | undefined
}) {
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
      delay,
      distanceThreshold,
      onRelease: (details) => {
        setDistance(details.distance)
        if (!details.isLongPress) {
          setStatus(
            details.distance > distanceThreshold
              ? 'Cancelled by movement'
              : 'Released early',
          )
        }
      },
    },
  )

  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Movement cancellation"
      description="Movement beyond the distance threshold cancels a pending long press. Release details still report the maximum distance observed."
      instruction={`Hold still within about ${distanceThreshold}px, or drag farther to cancel.`}
      badge={status}
      code={movementSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'movement-status' },
            {
              label: 'Max distance',
              value: formatPx(distance),
              testId: 'movement-distance',
            },
            {
              label: 'Activations',
              value: String(count),
              testId: 'movement-count',
            },
            {
              label: 'Threshold',
              value: formatPx(distanceThreshold),
            },
          ]}
        />
      }
    >
      <div className="space-y-4">
        <div className="relative mx-auto flex h-48 w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40">
          <div
            className="absolute rounded-full border-2 border-indigo-300/70"
            style={{
              width: distanceThreshold * 4,
              height: distanceThreshold * 4,
            }}
            aria-hidden="true"
          />
          <button
            ref={targetRef}
            type="button"
            data-testid="movement-hold"
            className="relative z-10 inline-flex min-h-11 min-w-[11rem] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            style={{ touchAction: 'none', userSelect: 'none' }}
          >
            Hold still
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="movement-click-alt"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              setCount((value) => value + 1)
              setStatus('Activated via click')
            }}
          >
            Activate with click
          </button>
          <button
            type="button"
            data-testid="movement-reset"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              setStatus('Idle')
              setDistance(0)
              setCount(0)
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ReleaseMetricsExample({
  delay = 400,
}: {
  delay?: number | undefined
}) {
  const [count, setCount] = useState(0)
  const [release, setRelease] = useState<UseOnLongPressReleaseDetails | null>(
    null,
  )
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setCount((value) => value + 1)
    },
    {
      delay,
      onRelease: (details) => {
        setRelease(details)
      },
    },
  )

  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Release metrics"
      description="Use onRelease to inspect duration, maximum distance, pointer metadata, and whether the long-press handler already fired."
      instruction="Hold past the delay for a long press, or release early for a short press."
      code={releaseMetricsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Activations',
              value: String(count),
              testId: 'release-count',
            },
            {
              label: 'Duration',
              value: release ? formatMs(release.duration) : '—',
              testId: 'release-duration',
            },
            {
              label: 'Distance',
              value: release ? formatPx(release.distance) : '—',
              testId: 'release-distance',
            },
            {
              label: 'Pointer',
              value: release?.event.pointerType || '—',
              testId: 'release-pointer',
            },
            {
              label: 'Button',
              value: release ? String(release.event.button) : '—',
              testId: 'release-button',
            },
            {
              label: 'Result',
              value: release
                ? release.isLongPress
                  ? 'Long press'
                  : 'Short press'
                : '—',
              testId: 'release-result',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          ref={targetRef}
          type="button"
          data-testid="release-hold"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          style={{ touchAction: 'none', userSelect: 'none' }}
        >
          Hold or tap
        </button>
        <button
          type="button"
          data-testid="release-click-alt"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            setCount((value) => value + 1)
          }}
        >
          Activate with click
        </button>
      </div>
    </ExampleShowcase>
  )
}

function SelfCard({
  self,
  testIdPrefix,
}: {
  self: boolean
  testIdPrefix: string
}) {
  const [status, setStatus] = useState('Idle')
  const targetRef = useRef<HTMLDivElement>(null)

  useOnLongPress(
    targetRef,
    () => {
      setStatus('Accepted')
    },
    {
      delay: 200,
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
      data-testid={`${testIdPrefix}-target`}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      style={{ touchAction: 'none', userSelect: 'none' }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          setStatus('Accepted via keyboard')
        }
      }}
    >
      <p className="text-sm font-semibold text-slate-900">
        Outer target · self: {String(self)}
      </p>
      <span
        data-testid={`${testIdPrefix}-descendant`}
        className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
      >
        Inner descendant
      </span>
      <p
        className="mt-3 text-sm font-semibold text-slate-900"
        data-testid={`${testIdPrefix}-status`}
      >
        {status}
      </p>
    </div>
  )
}

export function SelfAndDescendantsExample() {
  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Self and descendants"
      description="When self is false (default), presses on descendants can start a gesture. When self is true, only the exact target element is accepted."
      instruction="Hold on the outer target or the inner descendant for each card."
      code={selfSnippet}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelfCard self={false} testIdPrefix="self-false" />
        <SelfCard self={true} testIdPrefix="self-true" />
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample({
  delay = 400,
}: {
  delay?: number | undefined
}) {
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Idle')
  const targetRef = useRef<HTMLButtonElement>(null)
  const toggleId = useId()

  useOnLongPress(
    targetRef,
    () => {
      setCount((value) => value + 1)
      setStatus('Activated')
    },
    {
      enabled,
      delay,
      onRelease: (details) => {
        if (!details.isLongPress) {
          setStatus('Released early')
        }
      },
    },
  )

  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Enabled state"
      description="When disabled, no target listener remains and an in-flight gesture is cancelled without calling onRelease."
      instruction="Toggle detection, then hold the target. Disable mid-hold to cancel a pending press."
      badge={enabled ? 'Enabled' : 'Paused'}
      code={enabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Detection',
              value: enabled ? 'Enabled' : 'Paused',
              testId: 'enabled-mode',
            },
            { label: 'Status', value: status, testId: 'enabled-status' },
            {
              label: 'Activations',
              value: String(count),
              testId: 'enabled-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            id={toggleId}
            type="checkbox"
            checked={enabled}
            data-testid="enabled-toggle"
            className="size-4 rounded border-slate-300 text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onChange={(event) => {
              setEnabled(event.target.checked)
              setStatus(event.target.checked ? 'Idle' : 'Paused')
            }}
          />
          <label htmlFor={toggleId} className="text-sm text-slate-700">
            Long-press detection enabled
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            ref={targetRef}
            type="button"
            data-testid="enabled-hold"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            style={{ touchAction: 'none', userSelect: 'none' }}
            disabled={!enabled}
          >
            Hold to activate
          </button>
          <button
            type="button"
            data-testid="enabled-click-alt"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              setCount((value) => value + 1)
              setStatus('Activated via click')
            }}
          >
            Activate with click
          </button>
          <button
            type="button"
            data-testid="enabled-reset"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              setCount(0)
              setStatus('Idle')
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function PointerTypesExample({
  delayMs = 150,
}: {
  delayMs?: number | undefined
}) {
  const [count, setCount] = useState(0)
  const [pointerType, setPointerType] = useState('—')
  const [resolvedDelay, setResolvedDelay] = useState('—')
  const targetRef = useRef<HTMLButtonElement>(null)

  useOnLongPress(
    targetRef,
    (event) => {
      setCount((value) => value + 1)
      setPointerType(event.pointerType || 'unknown')
      setResolvedDelay(
        event.pointerType === 'touch' ? `${delayMs * 2} ms` : `${delayMs} ms`,
      )
    },
    {
      delay: (event) => (event.pointerType === 'touch' ? delayMs * 2 : delayMs),
    },
  )

  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Pointer types and dynamic delay"
      description="Pointer Events cover mouse, touch, and pen. Delay functions receive the original pointerdown event so you can adapt timing by pointer type."
      instruction="Hold with different pointer types when available. Browser tests may dispatch representative PointerEvents."
      code={pointerTypesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Activations',
              value: String(count),
              testId: 'pointer-count',
            },
            {
              label: 'Pointer type',
              value: pointerType,
              testId: 'pointer-type',
            },
            {
              label: 'Resolved delay',
              value: resolvedDelay,
              testId: 'pointer-delay',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          ref={targetRef}
          type="button"
          data-testid="pointer-hold"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          style={{ touchAction: 'none', userSelect: 'none' }}
        >
          Hold (dynamic delay)
        </button>
        <button
          type="button"
          data-testid="pointer-click-alt"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            setCount((value) => value + 1)
          }}
        >
          Activate with click
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  delay = 500,
  distanceThreshold = 10,
  button = 0,
  self = false,
  preventDefault = false,
  stopPropagation = false,
  capture = false,
  onLongPress,
}: DemoOptions & {
  onLongPress?: ((event: PointerEvent) => void) | undefined
}) {
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Idle')
  const [duration, setDuration] = useState(0)
  const [distance, setDistance] = useState(0)
  const [pointerType, setPointerType] = useState('—')
  const targetRef = useRef<HTMLButtonElement>(null)

  const threshold =
    distanceThreshold === false ? false : Number(distanceThreshold)

  useOnLongPress(
    targetRef,
    (event) => {
      setCount((value) => value + 1)
      setStatus('Activated')
      setPointerType(event.pointerType || 'unknown')
      onLongPress?.(event)
    },
    {
      enabled,
      delay: Number(delay),
      distanceThreshold: threshold,
      button: Number(button),
      self,
      preventDefault,
      stopPropagation,
      capture,
      onRelease: (details) => {
        setDuration(details.duration)
        setDistance(details.distance)
        if (!details.isLongPress) {
          setStatus('Released early')
        }
      },
    },
  )

  return (
    <ExampleShowcase
      hookName="useOnLongPress"
      title="Playground"
      description="Tune options with Storybook Controls. Callback options are not exposed as Controls."
      instruction="Adjust Controls, then hold the target. Use the click alternative for an accessible path."
      badge={enabled ? status : 'Paused'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: enabled ? 'Yes' : 'No',
              testId: 'playground-enabled',
            },
            {
              label: 'Delay',
              value: formatMs(Number(delay)),
              testId: 'playground-delay',
            },
            {
              label: 'Threshold',
              value:
                threshold === false ? 'Disabled' : formatPx(Number(threshold)),
              testId: 'playground-threshold',
            },
            { label: 'Status', value: status, testId: 'playground-status' },
            {
              label: 'Count',
              value: String(count),
              testId: 'playground-count',
            },
            {
              label: 'Duration',
              value: formatMs(duration),
              testId: 'playground-duration',
            },
            {
              label: 'Distance',
              value: formatPx(distance),
              testId: 'playground-distance',
            },
            {
              label: 'Pointer',
              value: pointerType,
              testId: 'playground-pointer',
            },
          ]}
        />
      }
    >
      <div className="space-y-3">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Options: enabled={String(enabled)}, delay={String(delay)},
          distanceThreshold=
          {threshold === false ? 'false' : String(threshold)}, button=
          {String(button)}, self={String(self)}, preventDefault=
          {String(preventDefault)}, stopPropagation={String(stopPropagation)},
          capture={String(capture)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            ref={targetRef}
            type="button"
            data-testid="playground-hold"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            style={{ touchAction: 'none', userSelect: 'none' }}
          >
            Hold to activate
          </button>
          <button
            type="button"
            data-testid="playground-click-alt"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              setCount((value) => value + 1)
              setStatus('Activated via click')
            }}
          >
            Activate with click
          </button>
          <button
            type="button"
            data-testid="playground-reset"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              setCount(0)
              setStatus('Idle')
              setDuration(0)
              setDistance(0)
              setPointerType('—')
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}
