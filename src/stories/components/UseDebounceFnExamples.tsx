import { useState } from 'react'

import { useDebounceFn } from '../../hooks/useDebounceFn/useDebounceFn'
import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
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

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

function Demo({
  title,
  description,
  code,
  delay = 120,
  maxWait,
  mode = 'counter',
}: {
  title: string
  description: string
  code: string
  delay?: number
  maxWait?: number
  mode?: 'counter' | 'search' | 'args' | 'autosave' | 'error'
}) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState('Nothing scheduled')
  const [count, setCount] = useState(0)
  const callback = async (next: string) => {
    if (mode === 'error' && next === 'error') throw new Error('Example failure')
    const output =
      mode === 'search' ? `Results for “${next}”: Atlas, Cedar, Nova` : next
    setResult(output || 'Saved empty value')
    setCount((current) => current + 1)
    return output
  }
  const debounce = useDebounceFn(
    callback,
    delay,
    maxWait === undefined ? undefined : { maxWait },
  )

  const schedule = (next = value) => {
    void debounce.run(next).catch((error: unknown) => {
      setResult(error instanceof Error ? error.message : 'Unknown error')
    })
  }

  return (
    <ExampleShowcase
      hookName="useDebounceFn"
      title={title}
      description={description}
      instruction="Change the value or use a command. The status updates when the final call runs."
      badge={debounce.isPending ? 'Pending' : 'Idle'}
      code={code}
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
            { label: 'Result', value: result, testId: 'debounce-result' },
          ]}
        />
      }
    >
      <div className="space-y-3">
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor={`debounce-${title}`}
        >
          {mode === 'search' ? 'Search the fictional catalog' : 'Draft value'}
        </label>
        <input
          id={`debounce-${title}`}
          value={value}
          onChange={(event) => {
            const next = event.target.value
            setValue(next)
            schedule(next)
          }}
          className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => schedule()}
          >
            Run
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => debounce.cancel()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => void debounce.flush()}
          >
            Flush now
          </button>
          {mode === 'error' ? (
            <button
              type="button"
              className={buttonClass}
              onClick={() => schedule('error')}
            >
              Schedule error
            </button>
          ) : null}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function DebouncedSearchExample() {
  return (
    <Demo
      title="Debounced search"
      description="A polished fictional catalog search. Only the final query in a burst runs."
      code={debouncedSearchSnippet}
      mode="search"
      delay={300}
    />
  )
}
export function BasicCounterExample() {
  return (
    <Demo
      title="Basic counter"
      description="Schedule a trailing update with the default debounce pattern."
      code={basicCounterSnippet}
    />
  )
}
export function LastArgumentsExample() {
  return (
    <Demo
      title="Last arguments win"
      description="Every caller resolves from one invocation using the latest arguments."
      code={lastArgumentsSnippet}
      mode="args"
    />
  )
}
export function PendingStateExample() {
  return (
    <Demo
      title="Pending state"
      description="Use isPending to communicate queued work without disabling essential UI."
      code={pendingStateSnippet}
    />
  )
}
export function CancelExample() {
  return (
    <Demo
      title="Cancel"
      description="Cancel clears the current window and resolves callers undefined by default."
      code={cancelSnippet}
    />
  )
}
export function FlushExample() {
  return (
    <Demo
      title="Flush"
      description="Flush invokes queued work immediately and shares its result."
      code={flushSnippet}
    />
  )
}
export function MaximumWaitExample() {
  return (
    <Demo
      title="Maximum wait"
      description="maxWait guarantees periodic progress while input continues."
      code={maximumWaitSnippet}
      maxWait={220}
    />
  )
}
export function AsyncCallbackExample() {
  return (
    <Demo
      title="Async callback"
      description="Promises from an asynchronous callback settle every caller in the window."
      code={asyncCallbackSnippet}
    />
  )
}
export function ValidationExample() {
  return (
    <Demo
      title="Validation"
      description="Invalid delay and maxWait values safely use their documented fallbacks."
      code={validationSnippet}
    />
  )
}
export function AutosaveDraftExample() {
  return (
    <Demo
      title="Autosave draft"
      description="Debounce a draft save to avoid writing on every keystroke."
      code={autosaveDraftSnippet}
      mode="autosave"
    />
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
      title="Dynamic delay"
      description="Changing delay cancels an existing window under its prior policy."
      instruction="Adjust the delay, then type. Pending work uses the delay that was active when it was scheduled."
      badge={debounce.isPending ? 'Pending' : 'Idle'}
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
      <div className="space-y-3">
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="debounce-dynamic-delay"
        >
          Delay
          <input
            id="debounce-dynamic-delay"
            type="number"
            min={0}
            step={50}
            value={delay}
            onChange={(event) => setDelay(Number(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
          />
        </label>
        <label
          className="block text-sm font-medium text-slate-800"
          htmlFor="debounce-dynamic-value"
        >
          Draft value
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
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => debounce.cancel()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => void debounce.flush()}
          >
            Flush now
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}
export function ErrorPropagationExample() {
  return (
    <Demo
      title="Error propagation"
      description="Synchronous and asynchronous callback errors reject every queued caller."
      code={errorPropagationSnippet}
      mode="error"
    />
  )
}
export function PlaygroundExample() {
  return (
    <Demo
      title="Playground"
      description="Experiment with trailing invocation, cancellation, flushing, and pending state."
      code={playgroundSnippet}
    />
  )
}
