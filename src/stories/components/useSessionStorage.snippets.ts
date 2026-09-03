export const checkoutDraftSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type CheckoutDraft = {
  email: string
  delivery: 'standard' | 'express'
  step: 1 | 2 | 3
}

const defaultDraft: CheckoutDraft = {
  email: '',
  delivery: 'standard',
  step: 1,
}

export function CheckoutDraftForm() {
  const { value, setValue, reset, remove, isReady } = useSessionStorage(
    'app:checkout-draft',
    defaultDraft,
  )

  if (!isReady) {
    return <p>Loading checkout draft…</p>
  }

  return (
    <form>
      <label>
        Email
        <input
          value={value.email}
          onChange={(event) => {
            setValue({ ...value, email: event.target.value })
          }}
        />
      </label>
      <label>
        Delivery
        <select
          value={value.delivery}
          onChange={(event) => {
            setValue({
              ...value,
              delivery: event.target.value as CheckoutDraft['delivery'],
            })
          }}
        >
          <option value="standard">Standard</option>
          <option value="express">Express</option>
        </select>
      </label>
      <p>Step {value.step} of 3</p>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <button type="button" onClick={() => remove()}>
        Discard
      </button>
    </form>
  )
}`

export const registrationWizardSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type WizardState = {
  step: number
  name: string
  plan: 'free' | 'pro'
}

const defaults: WizardState = { step: 1, name: '', plan: 'free' }

export function RegistrationWizard() {
  const { value, setValue, isReady } = useSessionStorage('app:wizard', defaults)

  if (!isReady) {
    return null
  }

  return (
    <div>
      <progress value={value.step} max={3} />
      {value.step === 1 ? (
        <input
          value={value.name}
          onChange={(event) => {
            setValue({ ...value, name: event.target.value })
          }}
        />
      ) : null}
      <button
        type="button"
        disabled={value.step <= 1}
        onClick={() => setValue({ ...value, step: value.step - 1 })}
      >
        Back
      </button>
      <button
        type="button"
        disabled={value.step >= 3}
        onClick={() => setValue({ ...value, step: value.step + 1 })}
      >
        Next
      </button>
    </div>
  )
}`

export const tabWorkspaceSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type Workspace = {
  panel: 'overview' | 'details'
  filters: string[]
  viewMode: 'grid' | 'list'
}

const defaults: Workspace = {
  panel: 'overview',
  filters: [],
  viewMode: 'grid',
}

export function TabWorkspace() {
  const { value, setValue, isReady } = useSessionStorage('app:workspace', defaults)

  if (!isReady) {
    return null
  }

  return (
    <div>
      <button type="button" onClick={() => setValue({ ...value, panel: 'overview' })}>
        Overview
      </button>
      <button type="button" onClick={() => setValue({ ...value, panel: 'details' })}>
        Details
      </button>
      <button
        type="button"
        onClick={() => {
          setValue((current) => ({
            ...current,
            viewMode: current.viewMode === 'grid' ? 'list' : 'grid',
          }))
        }}
      >
        Toggle view
      </button>
    </div>
  )
}`

export const temporaryFormSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type ContactDraft = {
  name: string
  message: string
}

const defaults: ContactDraft = { name: '', message: '' }

export function ContactDraftForm() {
  const { value, setValue, isReady } = useSessionStorage('app:contact-draft', defaults)

  if (!isReady) {
    return null
  }

  return (
    <>
      <p>Session drafts survive reloads in this tab but clear when the tab closes.</p>
      <input
        value={value.name}
        onChange={(event) => {
          setValue({ ...value, name: event.target.value })
        }}
      />
      <textarea
        value={value.message}
        onChange={(event) => {
          setValue({ ...value, message: event.target.value })
        }}
      />
    </>
  )
}`

export const persistentCounterSnippet = `import { useState } from 'react'
import { useSessionStorage } from '@muradyanvano/react-hooks'

function CounterPanel() {
  const { value, setValue, isReady } = useSessionStorage('app:counter', 0)

  if (!isReady) {
    return <p>Loading…</p>
  }

  return (
    <div>
      <p>Count: {value}</p>
      <button type="button" onClick={() => setValue((count) => count + 1)}>
        Increment
      </button>
    </div>
  )
}

export function SessionCounter() {
  const [mounted, setMounted] = useState(true)

  return (
    <>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Remount' : 'Mount'}
      </button>
      {mounted ? <CounterPanel key={Date.now()} /> : null}
    </>
  )
}`

export const booleanFlagSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

export function DismissibleBanner() {
  const { value: dismissed, setValue: setDismissed, isReady } = useSessionStorage(
    'app:banner-dismissed',
    false,
  )

  if (!isReady) {
    return null
  }

  if (dismissed) {
    return <p>Banner dismissed for this tab session.</p>
  }

  return (
    <div role="status">
      <p>Limited-time offer</p>
      <button type="button" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  )
}`

export const objectAndArraySnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type TaskState = {
  title: string
  items: string[]
}

const defaults: TaskState = { title: 'My tasks', items: ['Review PR'] }

export function TaskListDraft() {
  const { value, setValue, isReady } = useSessionStorage('app:tasks', defaults)

  if (!isReady) {
    return null
  }

  return (
    <div>
      <input
        value={value.title}
        onChange={(event) => {
          setValue((current) => ({ ...current, title: event.target.value }))
        }}
      />
      <button
        type="button"
        onClick={() => {
          setValue((current) => ({
            ...current,
            items: [...current.items, \`task-\${current.items.length + 1}\`],
          }))
        }}
      >
        Add task
      </button>
      <ul>
        {value.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}`

export const dateMapSetSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

const defaultDate = new Date('2026-01-01T00:00:00.000Z')
const defaultMap = new Map<string, number>([['alpha', 1]])
const defaultSet = new Set(['react', 'hooks'])

export function SessionStructuredValues() {
  const date = useSessionStorage('app:deadline', defaultDate)
  const map = useSessionStorage('app:scores', defaultMap)
  const set = useSessionStorage('app:tags', defaultSet)

  if (!date.isReady || !map.isReady || !set.isReady) {
    return <p>Loading…</p>
  }

  return (
    <dl>
      <dt>Deadline</dt>
      <dd>{date.value.toISOString()}</dd>
      <dt>Scores map size</dt>
      <dd>{map.value.size}</dd>
      <dt>Tags set size</dt>
      <dd>{set.value.size}</dd>
    </dl>
  )
}`

export const customSerializerSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type VersionedPoint = { x: number; y: number; version: number }

const serializer = {
  read(raw: string): VersionedPoint {
    const [version, x, y] = raw.split('|')
    if (version !== 'v1') {
      throw new Error('Unsupported version')
    }
    return { version: 1, x: Number(x), y: Number(y) }
  },
  write(value: VersionedPoint): string {
    return \`v1|\${value.x}|\${value.y}\`
  },
}

export function SessionVersionedPoint() {
  const { value, setValue, isReady } = useSessionStorage(
    'app:point',
    { x: 0, y: 0, version: 1 },
    { serializer },
  )

  if (!isReady) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue((current) => ({ ...current, x: current.x + 1 }))
      }}
    >
      Move right ({value.x}, {value.y})
    </button>
  )
}`

export const mergeDefaultsSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

type Settings = { theme: string; fontSize: number; beta: boolean }

const defaults: Settings = { theme: 'light', fontSize: 16, beta: false }

export function SessionMergeDefaultsComparison() {
  const withoutMerge = useSessionStorage('app:settings-raw', defaults, {
    mergeDefaults: false,
  })
  const withMerge = useSessionStorage('app:settings-merged', defaults, {
    mergeDefaults: true,
  })

  return (
    <div>
      <p>Without merge: {JSON.stringify(withoutMerge.value)}</p>
      <p>With merge: {JSON.stringify(withMerge.value)}</p>
    </div>
  )
}`

export const twoComponentsSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

function EditorA() {
  const { value, setValue } = useSessionStorage('app:shared-note', '')
  return (
    <textarea
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
      }}
    />
  )
}

function EditorB() {
  const { value } = useSessionStorage('app:shared-note', '')
  return <output>{value}</output>
}

export function SharedSessionNote() {
  return (
    <>
      <EditorA />
      <EditorB />
    </>
  )
}`

export const storageIsolationSnippet = `import { useLocalStorage, useSessionStorage } from '@muradyanvano/react-hooks'

export function StorageAreaIsolation() {
  const local = useLocalStorage('app:shared-key', 'local default')
  const session = useSessionStorage('app:shared-key', 'session default')

  return (
    <div>
      <p>localStorage: {local.value}</p>
      <button type="button" onClick={() => local.setValue('local value')}>
        Write local
      </button>
      <p>sessionStorage: {session.value}</p>
      <button type="button" onClick={() => session.setValue('session value')}>
        Write session
      </button>
    </div>
  )
}`

export const relatedContextEventSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

export function RelatedContextSync() {
  const { value, isReady } = useSessionStorage('app:session-count', 0)

  if (!isReady) {
    return null
  }

  return (
    <>
      <p>
        Value: {value}. Session storage is scoped to this tab — separate tabs do
        not share it.
      </p>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'app:session-count',
              newValue: '42',
              storageArea: sessionStorage,
            }),
          )
        }}
      >
        Simulate related-context write
      </button>
    </>
  )
}`

export const dynamicKeySnippet = `import { useState } from 'react'
import { useSessionStorage } from '@muradyanvano/react-hooks'

export function SessionProfileSwitcher() {
  const [profile, setProfile] = useState<'a' | 'b'>('a')
  const key = profile === 'a' ? 'app:profile-a' : 'app:profile-b'
  const { value, setValue, isReady } = useSessionStorage(key, { name: 'Guest' })

  if (!isReady) {
    return null
  }

  return (
    <>
      <button type="button" onClick={() => setProfile('a')}>
        Profile A
      </button>
      <button type="button" onClick={() => setProfile('b')}>
        Profile B
      </button>
      <input
        value={value.name}
        onChange={(event) => {
          setValue({ name: event.target.value })
        }}
      />
    </>
  )
}`

export const writeDefaultsSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

export function SessionWriteDefaultsComparison() {
  const writesDefault = useSessionStorage('app:with-default-write', 'hello', {
    writeDefaults: true,
  })
  const skipsDefault = useSessionStorage('app:without-default-write', 'hello', {
    writeDefaults: false,
  })

  return (
    <div>
      <p>writeDefaults true: {writesDefault.isReady ? 'ready' : 'loading'}</p>
      <p>writeDefaults false: {skipsDefault.isReady ? 'ready' : 'loading'}</p>
    </div>
  )
}`

export const malformedValueSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

export function SessionMalformedRecovery() {
  const { value, error, remove, reset, isReady } = useSessionStorage(
    'app:settings',
    { mode: 'safe' },
  )

  if (!isReady) {
    return null
  }

  return (
    <div>
      <p>value: {JSON.stringify(value)}</p>
      <p>error: {error?.message ?? 'none'}</p>
      <button type="button" onClick={() => remove()}>
        Remove
      </button>
      <button type="button" onClick={() => reset()}>
        Repair
      </button>
    </div>
  )
}`

export const storageUnavailableSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

export function SessionOfflineFallback() {
  const { value, setValue, isSupported, isReady } = useSessionStorage(
    'app:draft',
    'fallback',
    { window: null },
  )

  return (
    <div role="alert">
      {!isSupported ? <p>Storage unavailable in this context.</p> : null}
      <textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
        }}
      />
      <p>ready: {String(isReady)}</p>
    </div>
  )
}`

export const removeVsResetSnippet = `import { useSessionStorage } from '@muradyanvano/react-hooks'

export function SessionRemoveVsReset() {
  const { value, remove, reset, isReady } = useSessionStorage('app:score', 10)

  if (!isReady) {
    return null
  }

  return (
    <div>
      <p>Score: {value}</p>
      <button type="button" onClick={() => reset()}>
        Reset (writes default)
      </button>
      <button type="button" onClick={() => remove()}>
        Remove (deletes key)
      </button>
    </div>
  )
}`

export const customWindowSnippet = `import { useRef, useState } from 'react'
import { useSessionStorage } from '@muradyanvano/react-hooks'

export function IframeSessionStorage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [targetWindow, setTargetWindow] = useState<Window | null>(null)
  const { value, setValue, isReady } = useSessionStorage(
    'app:iframe-note',
    'hello',
    { window: targetWindow },
  )

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated session storage frame"
        srcDoc="<html><body>Isolated frame</body></html>"
        onLoad={() => {
          setTargetWindow(iframeRef.current?.contentWindow ?? null)
        }}
      />
      {isReady ? (
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
      ) : (
        <p>Waiting for iframe…</p>
      )}
    </>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useSessionStorage } from '@muradyanvano/react-hooks'

type PlaygroundProps = {
  storageKey: string
  defaultValue: string | number | boolean | Record<string, unknown>
  mergeDefaults?: boolean
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
}

function PlaygroundBody({
  storageKey,
  defaultValue,
  mergeDefaults = false,
  writeDefaults = true,
  listenToStorageChanges = true,
}: PlaygroundProps) {
  const state = useSessionStorage(storageKey, defaultValue, {
    mergeDefaults,
    writeDefaults,
    listenToStorageChanges,
  })

  return (
    <pre>{JSON.stringify({ value: state.value, isReady: state.isReady }, null, 2)}</pre>
  )
}

export function SessionStoragePlayground(props: PlaygroundProps) {
  const [mounted, setMounted] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Mount playground
      </button>
      {mounted ? <PlaygroundBody {...props} /> : null}
    </>
  )
}`
