export const debouncedSearchSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

async function searchCatalog(query: string) {
  return \`Results for “\${query}”: Atlas, Cedar, Nova\`
}

export function DebouncedSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('Nothing scheduled')
  const { run, isPending } = useDebounceFn(searchCatalog, 300)
  return (
    <>
      <label>
        Search the fictional catalog
        <input
          value={query}
          onChange={(event) => {
            const next = event.target.value
            setQuery(next)
            void run(next).then(setResult)
          }}
        />
      </label>
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
      <output>{result}</output>
    </>
  )
}`

export const basicCounterSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function BasicCounter() {
  const [count, setCount] = useState(0)
  const { run, isPending } = useDebounceFn(() => {
    setCount((value) => value + 1)
  }, 200)
  return (
    <>
      <button type="button" onClick={() => void run()}>Click rapidly</button>
      <p>Invocations: {count}</p>
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
    </>
  )
}`

export const lastArgumentsSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function LastArgumentsWin() {
  const [scheduled, setScheduled] = useState('')
  const [executed, setExecuted] = useState('')
  const { run } = useDebounceFn(async (value: string) => {
    setExecuted(value)
    return value
  }, 180)
  return (
    <>
      <input
        onChange={(event) => {
          const next = event.target.value
          setScheduled(next)
          void run(next)
        }}
      />
      <p>Scheduled: {scheduled}</p>
      <p>Executed: {executed}</p>
    </>
  )
}`

export const pendingStateSnippet = `import { useDebounceFn } from '@muradyanvano/react-hooks'

export function PendingState() {
  const { run, isPending } = useDebounceFn(async (value: string) => value, 250)
  return (
    <>
      <button type="button" onClick={() => void run('draft')}>Schedule</button>
      <p data-testid="debounce-pending">{isPending ? 'Yes' : 'No'}</p>
    </>
  )
}`

export const cancelSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function CancelExample() {
  const [status, setStatus] = useState('idle')
  const { run, cancel, isPending } = useDebounceFn(async (value: string) => value, 300)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void run('draft').then((value) => {
            setStatus(value === undefined ? 'cancelled as undefined' : value)
          })
        }}
      >
        Schedule
      </button>
      <button type="button" onClick={() => cancel()}>Cancel</button>
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
      <output>{status}</output>
    </>
  )
}`

export const flushSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function FlushExample() {
  const [result, setResult] = useState('idle')
  const { run, flush, isPending } = useDebounceFn(async (value: string) => value, 400)
  return (
    <>
      <button type="button" onClick={() => void run('queued')}>Schedule</button>
      <button
        type="button"
        onClick={() => {
          void flush().then((value) => setResult(value ?? 'nothing pending'))
        }}
      >
        Flush now
      </button>
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
      <output>{result}</output>
    </>
  )
}`

export const maximumWaitSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function MaximumWait() {
  const [result, setResult] = useState('')
  const { run, isPending } = useDebounceFn(
    async (value: string) => value,
    500,
    { maxWait: 220 },
  )
  return (
    <>
      <input
        onChange={(event) => {
          void run(event.target.value).then((value) => setResult(value ?? ''))
        }}
      />
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
      <output>{result}</output>
    </>
  )
}`

export const asyncCallbackSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function AsyncCallback() {
  const [result, setResult] = useState('idle')
  const { run } = useDebounceFn(async (value: string) => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return \`saved:\${value}\`
  }, 150)
  return (
    <button
      type="button"
      onClick={() => {
        void run('draft').then((value) => setResult(value ?? 'empty'))
      }}
    >
      {result}
    </button>
  )
}`

export const validationSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function Validation() {
  const [input, setInput] = useState('')
  const [valid, setValid] = useState(false)
  const { run, isPending } = useDebounceFn((value: string) => {
    setValid(value.trim().length >= 3)
  }, Number.NaN)
  return (
    <>
      <input
        value={input}
        onChange={(event) => {
          const next = event.target.value
          setInput(next)
          void run(next)
        }}
      />
      <p>Immediate input: {input}</p>
      <p>Debounced valid: {valid ? 'yes' : 'no'}</p>
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
    </>
  )
}`

export const autosaveDraftSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function AutosaveDraft() {
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState('Not saved')
  const { run, isPending } = useDebounceFn(async (value: string) => {
    setSaved(\`Saved locally: \${value || '(empty)'}\`)
  }, 300)
  return (
    <>
      <textarea
        value={draft}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          void run(next)
        }}
      />
      <p>{isPending ? 'Saving…' : saved}</p>
    </>
  )
}`

export const dynamicDelaySnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function DynamicDelay() {
  const [delay, setDelay] = useState(200)
  const [result, setResult] = useState('idle')
  const { run, isPending } = useDebounceFn(async (value: string) => value, delay)
  return (
    <>
      <label>
        Delay
        <input
          type="number"
          value={delay}
          onChange={(event) => setDelay(Number(event.target.value))}
        />
      </label>
      <input
        onChange={(event) => {
          // Changing delay cancels an existing pending window under its prior policy.
          void run(event.target.value).then((value) => setResult(value ?? 'cancelled'))
        }}
      />
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
      <output>{result}</output>
    </>
  )
}`

export const errorPropagationSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function ErrorPropagation() {
  const [status, setStatus] = useState('idle')
  const { run } = useDebounceFn(async (value: string) => {
    if (value === 'error') throw new Error('Example failure')
    return value
  }, 120)
  return (
    <button
      type="button"
      onClick={() => {
        void run('error').then(
          (value) => setStatus(value ?? 'empty'),
          (error: unknown) => {
            setStatus(error instanceof Error ? error.message : 'Unknown error')
          },
        )
      }}
    >
      {status}
    </button>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useDebounceFn } from '@muradyanvano/react-hooks'

export function DebouncePlayground() {
  const [delay, setDelay] = useState(200)
  const [maxWait, setMaxWait] = useState(1000)
  const [rejectOnCancel, setRejectOnCancel] = useState(false)
  const [result, setResult] = useState('idle')
  const { run, cancel, flush, isPending } = useDebounceFn(
    async (value: string) => value,
    delay,
    { maxWait, rejectOnCancel },
  )
  return (
    <>
      <label>Delay <input type="number" value={delay} onChange={(event) => setDelay(Number(event.target.value))} /></label>
      <label>maxWait <input type="number" value={maxWait} onChange={(event) => setMaxWait(Number(event.target.value))} /></label>
      <label>
        <input type="checkbox" checked={rejectOnCancel} onChange={(event) => setRejectOnCancel(event.target.checked)} />
        rejectOnCancel
      </label>
      <button type="button" onClick={() => void run('draft').then((value) => setResult(value ?? 'cancelled'))}>Run</button>
      <button type="button" onClick={() => cancel()}>Cancel</button>
      <button type="button" onClick={() => void flush().then((value) => setResult(value ?? 'empty'))}>Flush</button>
      <p>Pending: {isPending ? 'Yes' : 'No'}</p>
      <output>{result}</output>
    </>
  )
}`
