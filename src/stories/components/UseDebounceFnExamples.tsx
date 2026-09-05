import { useEffect, useRef, useState } from 'react'

import { useDebounceFn } from '@muradyanvano/react-hooks'
import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import { Callout, ControlBar, Field, MetricGrid, MetricTile } from './ui'
import {
  asyncCallbackSnippet,
  autosaveDraftSnippet,
  basicCounterSnippet,
  cancelSnippet,
  debouncedSearchSnippet,
  dynamicDelaySnippet,
  errorPropagationSnippet,
  flushSnippet,
  lastArgumentsSnippet,
  maximumWaitSnippet,
  pendingStateSnippet,
  playgroundSnippet,
  validationSnippet,
} from './useDebounceFn.snippets'

const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600'
const textareaClass =
  'min-h-[8rem] w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600'

const CATALOG_PRODUCTS = [
  {
    sku: 'ATL-01',
    name: 'Atlas field kit',
    blurb: 'Compact gear for weekend trips.',
  },
  {
    sku: 'CED-02',
    name: 'Cedar travel pack',
    blurb: 'Modular storage with padded straps.',
  },
  {
    sku: 'NOV-03',
    name: 'Nova starter bundle',
    blurb: 'Everything needed for a first launch.',
  },
] as const

const STRESS_SUFFIX = 'catalog-metadata-'.padEnd(300, 'x')

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

type CatalogProduct = (typeof CATALOG_PRODUCTS)[number]

export function DebouncedSearchExample() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('Nothing scheduled')
  const [count, setCount] = useState(0)
  const [visibleProducts, setVisibleProducts] = useState<CatalogProduct[]>([])

  const debounce = useDebounceFn(async (next: string) => {
    const output = next.trim()
      ? `Results for “${next}”: Atlas, Cedar, Nova · ${STRESS_SUFFIX}`
      : 'Nothing scheduled'
    setResult(output)
    setCount((current) => current + 1)
    setVisibleProducts(next.trim() ? [...CATALOG_PRODUCTS] : [])
    return output
  }, 300)

  const schedule = (next: string) => {
    void debounce.run(next).then((output) => {
      if (output !== undefined) setResult(output)
    })
  }

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="dashboard"
      badge={debounce.isPending ? 'Searching…' : 'Catalog ready'}
      title="Debounced search"
      description="A polished fictional catalog search. Only the final query in a burst runs."
      instruction="Type a product name, then watch pending state and results settle after the trailing window."
      code={debouncedSearchSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Invocations',
              value: String(count),
              testId: 'debounce-count',
            },
            {
              label: 'Result',
              value: result,
              testId: 'debounce-result',
              mode: 'block',
            },
          ]}
        />
      }
    >
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Field label="Search the fictional catalog" htmlFor="debounce-search">
          <input
            id="debounce-search"
            value={query}
            onChange={(event) => {
              const next = event.target.value
              setQuery(next)
              schedule(next)
            }}
            placeholder="Try atlas, cedar, or nova…"
            className={inputClass}
          />
        </Field>

        {debounce.isPending ? (
          <Callout tone="info" title="Catalog lookup pending">
            Waiting for you to pause typing before the fictional API runs.
          </Callout>
        ) : null}

        <div aria-label="Search results" className="space-y-2">
          {visibleProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No catalog matches yet.</p>
          ) : (
            visibleProducts.map((product) => (
              <article
                key={product.sku}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {product.name}
                  </h3>
                  <span className="font-mono text-[11px] text-slate-500">
                    {product.sku}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{product.blurb}</p>
              </article>
            ))
          )}
        </div>

        <ControlBar label="Search controls">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => debounce.cancel()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void debounce.flush()}
          >
            Flush now
          </button>
        </ControlBar>
      </div>
    </ExampleShowcase>
  )
}

export function AutosaveDraftExample() {
  const [draft, setDraft] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [savedPreview, setSavedPreview] = useState('Not saved yet')

  const debounce = useDebounceFn(async (value: string) => {
    const stamp = new Date()
    setSavedAt(stamp)
    setSavedPreview(value.trim() ? value : '(empty draft)')
    return value
  }, 300)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={debounce.isPending ? 'Saving…' : savedAt ? 'Saved' : 'Draft'}
      title="Autosave draft"
      description="Debounce a draft save to avoid writing on every keystroke."
      instruction="Type in the document editor. The badge switches to Pending until the trailing save completes."
      code={autosaveDraftSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Last saved',
              value: savedAt ? formatTime(savedAt) : 'Never',
            },
            {
              label: 'Snapshot',
              value: savedPreview,
              testId: 'debounce-result',
              mode: 'block',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            Release notes draft
          </p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              debounce.isPending
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                : savedAt
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {debounce.isPending
              ? 'Pending save'
              : savedAt
                ? 'Saved locally'
                : 'Unsaved'}
          </span>
        </div>
        <Field label="Document body" htmlFor="debounce-autosave">
          <textarea
            id="debounce-autosave"
            value={draft}
            onChange={(event) => {
              const next = event.target.value
              setDraft(next)
              void debounce.run(next)
            }}
            placeholder="Write a fictional release note…"
            className={textareaClass}
          />
        </Field>
        <p className="text-xs text-slate-500">
          {savedAt
            ? `Last saved at ${formatTime(savedAt)}`
            : 'Changes are debounced before updating the saved snapshot.'}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function ValidationExample() {
  const [input, setInput] = useState('')
  const [valid, setValid] = useState(false)
  const debounce = useDebounceFn((value: string) => {
    setValid(value.trim().length >= 3)
  }, Number.NaN)

  const message =
    input.length === 0
      ? 'Enter at least three characters.'
      : valid
        ? 'Looks good — debounced validation passed.'
        : debounce.isPending
          ? 'Checking…'
          : 'Too short — need at least three characters.'

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={valid ? 'Valid' : debounce.isPending ? 'Checking' : 'Invalid'}
      title="Validation"
      description="Invalid delay and maxWait values safely use their documented fallbacks."
      instruction="Type in the username field. Validation runs after the debounced window using fallback timing."
      code={validationSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Debounced valid',
              value: valid ? 'yes' : 'no',
              testId: 'debounce-result',
            },
            { label: 'Immediate input', value: input || '(empty)' },
          ]}
        />
      }
    >
      <div className="max-w-md space-y-3">
        <Field
          label="Project codename"
          htmlFor="debounce-validation"
          hint="Minimum three characters."
        >
          <input
            id="debounce-validation"
            value={input}
            onChange={(event) => {
              const next = event.target.value
              setInput(next)
              void debounce.run(next)
            }}
            aria-invalid={input.length > 0 && !valid && !debounce.isPending}
            aria-describedby="debounce-validation-message"
            className={inputClass}
          />
        </Field>
        <p
          id="debounce-validation-message"
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${
            valid
              ? 'bg-emerald-50 text-emerald-800'
              : debounce.isPending
                ? 'bg-indigo-50 text-indigo-800'
                : 'bg-amber-50 text-amber-900'
          }`}
        >
          {message}
        </p>
      </div>
    </ExampleShowcase>
  )
}

type TimelineEntry = { id: number; at: number; value: string }

export function MaximumWaitExample() {
  const [value, setValue] = useState('')
  const [result, setResult] = useState('')
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const startedRef = useRef(0)
  const idRef = useRef(0)

  const debounce = useDebounceFn(
    async (next: string) => {
      const entry = {
        id: ++idRef.current,
        at: Date.now() - startedRef.current,
        value: next,
      }
      setTimeline((current) => [...current.slice(-7), entry])
      setResult(next)
      return next
    },
    500,
    { maxWait: 220 },
  )

  useEffect(() => {
    startedRef.current = Date.now()
  }, [])

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="dashboard"
      badge={debounce.isPending ? 'maxWait active' : 'Idle'}
      title="Maximum wait"
      description="maxWait guarantees periodic progress while input continues."
      instruction="Hold down a key or paste quickly. Invocations appear on the timeline even before you stop typing."
      code={maximumWaitSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Latest value',
              value: result || '(none)',
              testId: 'debounce-result',
            },
            {
              label: 'Invocations',
              value: String(timeline.length),
              testId: 'debounce-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-4">
        <Field label="Continuous typing stream" htmlFor="debounce-max-wait">
          <input
            id="debounce-max-wait"
            value={value}
            onChange={(event) => {
              const next = event.target.value
              setValue(next)
              void debounce.run(next).then((output) => {
                if (output !== undefined) setResult(output)
              })
            }}
            className={inputClass}
          />
        </Field>

        <div className="rounded-xl border border-slate-200 bg-slate-950 p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Invocation timeline
          </p>
          <ol
            className="mt-3 space-y-2"
            aria-label="Debounced invocation timeline"
          >
            {timeline.length === 0 ? (
              <li className="text-sm text-slate-500">
                No invocations yet — start typing.
              </li>
            ) : (
              timeline.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 font-mono text-xs text-emerald-300"
                >
                  <span className="w-16 shrink-0 text-right text-slate-400">
                    +{entry.at}ms
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">
                    {entry.value || '(empty)'}
                  </span>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function BasicCounterExample() {
  const [count, setCount] = useState(0)
  const debounce = useDebounceFn(async () => {
    setCount((current) => current + 1)
  }, 200)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="dashboard"
      badge={debounce.isPending ? 'Queued' : 'Ready'}
      title="Basic counter"
      description="Schedule a trailing update with the default debounce pattern."
      instruction="Click rapidly. Only one invocation runs after the burst settles."
      code={basicCounterSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Invocations',
              value: String(count),
              testId: 'debounce-count',
            },
          ]}
        />
      }
    >
      <MetricGrid columns={2}>
        <MetricTile label="Invocations" value={count} />
        <MetricTile label="Pending" value={debounce.isPending ? 'Yes' : 'No'} />
      </MetricGrid>
      <ControlBar label="Counter controls">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => void debounce.run()}
        >
          Click rapidly
        </button>
      </ControlBar>
    </ExampleShowcase>
  )
}

export function LastArgumentsExample() {
  const [scheduled, setScheduled] = useState('')
  const [executed, setExecuted] = useState('(waiting)')
  const debounce = useDebounceFn(async (value: string) => {
    setExecuted(value)
    return value
  }, 180)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="dashboard"
      title="Last arguments win"
      description="Every caller resolves from one invocation using the latest arguments."
      instruction="Type quickly. Scheduled values update immediately; executed value settles last."
      code={lastArgumentsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Executed',
              value: executed,
              testId: 'debounce-result',
              mode: 'block',
            },
          ]}
        />
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Scheduled (immediate)" htmlFor="debounce-last-scheduled">
          <input
            id="debounce-last-scheduled"
            value={scheduled}
            onChange={(event) => {
              const next = event.target.value
              setScheduled(next)
              void debounce.run(next)
            }}
            className={inputClass}
          />
        </Field>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            Executed (debounced)
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {executed}
          </p>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function PendingStateExample() {
  const [result, setResult] = useState('idle')
  const debounce = useDebounceFn(async (value: string) => {
    setResult(value)
    return value
  }, 250)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={debounce.isPending ? 'Pending' : 'Idle'}
      title="Pending state"
      description="Use isPending to communicate queued work without disabling essential UI."
      instruction="Schedule work and watch the pending badge — the action stays available."
      code={pendingStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            { label: 'Result', value: result, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            debounce.isPending
              ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
              : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
          }`}
        >
          {debounce.isPending ? 'Work queued' : 'Nothing pending'}
        </span>
        <ControlBar label="Pending demo">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => void debounce.run('draft')}
          >
            Schedule
          </button>
        </ControlBar>
      </div>
    </ExampleShowcase>
  )
}

export function CancelExample() {
  const [status, setStatus] = useState('idle')
  const debounce = useDebounceFn(async (value: string) => value, 300)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={
        debounce.isPending
          ? 'Pending'
          : status === 'cancelled as undefined'
            ? 'Cancelled'
            : 'Idle'
      }
      title="Cancel"
      description="Cancel clears the current window and resolves callers undefined by default."
      instruction="Schedule work, then cancel before the window closes."
      code={cancelSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            { label: 'Status', value: status, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <ControlBar label="Cancel demo">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => {
            void debounce.run('draft').then((value) => {
              setStatus(value === undefined ? 'cancelled as undefined' : value)
            })
          }}
        >
          Schedule
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => debounce.cancel()}
        >
          Cancel
        </button>
      </ControlBar>
    </ExampleShowcase>
  )
}

export function FlushExample() {
  const [result, setResult] = useState('idle')
  const debounce = useDebounceFn(async (value: string) => value, 400)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={debounce.isPending ? 'Queued' : 'Idle'}
      title="Flush"
      description="Flush invokes queued work immediately and shares its result."
      instruction="Schedule, then flush before the delay elapses."
      code={flushSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            { label: 'Result', value: result, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <ControlBar label="Flush demo">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => void debounce.run('queued')}
        >
          Schedule
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => {
            void debounce.flush().then((value) => {
              setResult(value ?? 'nothing pending')
            })
          }}
        >
          Flush now
        </button>
      </ControlBar>
    </ExampleShowcase>
  )
}

export function AsyncCallbackExample() {
  const [result, setResult] = useState('idle')
  const [running, setRunning] = useState(false)
  const debounce = useDebounceFn(async (value: string) => {
    setRunning(true)
    await new Promise((resolve) => setTimeout(resolve, 120))
    setRunning(false)
    return `saved:${value}`
  }, 150)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={
        running ? 'Async running' : debounce.isPending ? 'Pending' : 'Idle'
      }
      title="Async callback"
      description="Promises from an asynchronous callback settle every caller in the window."
      instruction="Schedule a save. The async callback resolves all callers together."
      code={asyncCallbackSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            { label: 'Result', value: result, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <MetricGrid columns={2}>
        <MetricTile label="Async phase" value={running ? 'Running' : 'Idle'} />
        <MetricTile label="Result" value={result} />
      </MetricGrid>
      <ControlBar label="Async demo">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => {
            void debounce.run('draft').then((value) => {
              setResult(value ?? 'empty')
            })
          }}
        >
          Save draft
        </button>
      </ControlBar>
    </ExampleShowcase>
  )
}

export function DynamicDelayExample() {
  const [delay, setDelay] = useState(200)
  const [value, setValue] = useState('')
  const [result, setResult] = useState('idle')
  const debounce = useDebounceFn(async (next: string) => next, delay)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={debounce.isPending ? 'Pending' : 'Idle'}
      title="Dynamic delay"
      description="Changing delay cancels an existing window under its prior policy."
      instruction="Adjust the delay, then type. Pending work uses the delay that was active when it was scheduled."
      code={dynamicDelaySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            { label: 'Delay', value: `${delay} ms`, testId: 'debounce-delay' },
            { label: 'Result', value: result, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Delay" htmlFor="debounce-dynamic-delay">
          <input
            id="debounce-dynamic-delay"
            type="number"
            min={0}
            step={50}
            value={delay}
            onChange={(event) => setDelay(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Draft value" htmlFor="debounce-dynamic-value">
          <input
            id="debounce-dynamic-value"
            value={value}
            onChange={(event) => {
              const next = event.target.value
              setValue(next)
              void debounce.run(next).then((output) => {
                setResult(output ?? 'cancelled')
              })
            }}
            className={inputClass}
          />
        </Field>
      </div>
      <ControlBar label="Dynamic delay controls">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => debounce.cancel()}
        >
          Cancel
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => void debounce.flush()}
        >
          Flush now
        </button>
      </ControlBar>
    </ExampleShowcase>
  )
}

export function ErrorPropagationExample() {
  const [status, setStatus] = useState('idle')
  const debounce = useDebounceFn(async (value: string) => {
    if (value === 'error') throw new Error('Example failure')
    return value
  }, 120)

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="form"
      badge={
        status === 'Example failure'
          ? 'Error'
          : debounce.isPending
            ? 'Pending'
            : 'Idle'
      }
      title="Error propagation"
      description="Synchronous and asynchronous callback errors reject every queued caller."
      instruction="Schedule an error payload. All callers in the window receive the rejection."
      code={errorPropagationSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            { label: 'Status', value: status, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <div className="space-y-3">
        <ControlBar label="Error demo">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              void debounce.run('error').then(
                (value) => setStatus(value ?? 'empty'),
                (error: unknown) => {
                  setStatus(
                    error instanceof Error ? error.message : 'Unknown error',
                  )
                },
              )
            }}
          >
            Schedule error
          </button>
        </ControlBar>
        {status === 'Example failure' ? (
          <Callout tone="warning" title="Callback rejected">
            Every caller in the debounce window received the same error.
          </Callout>
        ) : null}
      </div>
    </ExampleShowcase>
  )
}

export function PlaygroundExample() {
  const [delay, setDelay] = useState(200)
  const [maxWait, setMaxWait] = useState(1000)
  const [rejectOnCancel, setRejectOnCancel] = useState(false)
  const [value, setValue] = useState('')
  const [result, setResult] = useState('idle')

  const debounce = useDebounceFn(async (next: string) => next, delay, {
    maxWait,
    rejectOnCancel,
  })

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      layout="dashboard"
      badge={debounce.isPending ? 'Pending' : 'Playground'}
      title="Playground"
      description="Experiment with trailing invocation, cancellation, flushing, and pending state."
      instruction="Tune delay and maxWait, type a value, then cancel or flush to explore behavior."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pending',
              value: debounce.isPending ? 'Yes' : 'No',
              testId: 'debounce-pending',
            },
            {
              label: 'Result',
              value: result,
              testId: 'debounce-result',
              mode: 'block',
            },
          ]}
        />
      }
    >
      <MetricGrid columns={3}>
        <MetricTile label="Delay" value={`${delay} ms`} />
        <MetricTile label="maxWait" value={`${maxWait} ms`} />
        <MetricTile
          label="rejectOnCancel"
          value={rejectOnCancel ? 'on' : 'off'}
        />
      </MetricGrid>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Delay (ms)" htmlFor="debounce-playground-delay">
          <input
            id="debounce-playground-delay"
            type="number"
            value={delay}
            onChange={(event) => setDelay(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="maxWait (ms)" htmlFor="debounce-playground-max-wait">
          <input
            id="debounce-playground-max-wait"
            type="number"
            value={maxWait}
            onChange={(event) => setMaxWait(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="rejectOnCancel" htmlFor="debounce-playground-reject">
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-3">
            <input
              id="debounce-playground-reject"
              type="checkbox"
              checked={rejectOnCancel}
              onChange={(event) => setRejectOnCancel(event.target.checked)}
            />
            <span className="text-sm text-slate-800">Reject on cancel</span>
          </label>
        </Field>
      </div>

      <div className="mt-4 space-y-3">
        <Field label="Draft value" htmlFor="debounce-playground-value">
          <input
            id="debounce-playground-value"
            value={value}
            onChange={(event) => {
              const next = event.target.value
              setValue(next)
              void debounce.run(next).then((output) => {
                setResult(output ?? 'cancelled')
              })
            }}
            className={inputClass}
          />
        </Field>
        <ControlBar label="Playground controls">
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => debounce.cancel()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => {
              void debounce.flush().then((output) => {
                setResult(output ?? 'empty')
              })
            }}
          >
            Flush
          </button>
        </ControlBar>
      </div>
    </ExampleShowcase>
  )
}
