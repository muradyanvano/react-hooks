export const fruitEditorSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

type Fruit = {
  name: string
  color: string
  size: 'Small' | 'Medium' | 'Large'
  count: number
}

const defaultFruit: Fruit = {
  name: 'Banana',
  color: 'Yellow',
  size: 'Medium',
  count: 0,
}

export function FruitEditor() {
  const { value, setValue, reset, remove, isReady } = useLocalStorage<Fruit>(
    'app:fruit',
    defaultFruit,
  )

  if (!isReady) {
    return <p>Loading saved fruit…</p>
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <label>
        Name
        <input
          value={value.name}
          onChange={(event) => {
            setValue({ ...value, name: event.target.value })
          }}
        />
      </label>
      <label>
        Color
        <input
          value={value.color}
          onChange={(event) => {
            setValue({ ...value, color: event.target.value })
          }}
        />
      </label>
      <label>
        Size
        <select
          value={value.size}
          onChange={(event) => {
            setValue({
              ...value,
              size: event.target.value as Fruit['size'],
            })
          }}
        >
          <option value="Small">Small</option>
          <option value="Medium">Medium</option>
          <option value="Large">Large</option>
        </select>
      </label>
      <label>
        Count
        <input
          type="number"
          value={value.count}
          onChange={(event) => {
            setValue({ ...value, count: Number(event.target.value) })
          }}
        />
      </label>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <button type="button" onClick={() => remove()}>
        Remove
      </button>
    </form>
  )
}`

export const preferencesPanelSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

type Preferences = {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  reducedMotion: boolean
}

const defaults: Preferences = {
  theme: 'system',
  density: 'comfortable',
  reducedMotion: false,
}

export function PreferencesPanel() {
  const { value, setValue, isReady } = useLocalStorage('app:preferences', defaults, {
    mergeDefaults: true,
  })

  if (!isReady) {
    return null
  }

  return (
    <fieldset>
      <legend>Preferences</legend>
      <label>
        Theme
        <select
          value={value.theme}
          onChange={(event) => {
            setValue((current) => ({
              ...current,
              theme: event.target.value as Preferences['theme'],
            }))
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>
      <label>
        Density
        <select
          value={value.density}
          onChange={(event) => {
            setValue((current) => ({
              ...current,
              density: event.target.value as Preferences['density'],
            }))
          }}
        >
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.reducedMotion}
          onChange={(event) => {
            setValue((current) => ({
              ...current,
              reducedMotion: event.target.checked,
            }))
          }}
        />
        Reduced motion
      </label>
    </fieldset>
  )
}`

export const persistentCounterSnippet = `import { useState } from 'react'
import { useLocalStorage } from '@muradyanvano/react-hooks'

function CounterPanel() {
  const { value, setValue, isReady } = useLocalStorage('app:counter', 0)

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

export function PersistentCounter() {
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

export const booleanSettingSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

export function BooleanSetting() {
  const { value, setValue, isReady } = useLocalStorage('app:enabled', false)

  if (!isReady) {
    return null
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => {
          setValue(event.target.checked)
        }}
      />
      Feature enabled ({String(value)})
    </label>
  )
}`

export const stringValueSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

export function NicknameField() {
  const { value, setValue, isReady } = useLocalStorage('app:nickname', '')

  if (!isReady) {
    return null
  }

  return (
    <label>
      Nickname
      <input
        value={value}
        placeholder="Leave blank to store an empty string"
        onChange={(event) => {
          setValue(event.target.value)
        }}
      />
    </label>
  )
}`

export const objectAndArraySnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

type TodoState = {
  title: string
  tags: string[]
}

const defaults: TodoState = { title: 'Draft', tags: ['ideas'] }

export function TodoDraft() {
  const { value, setValue, isReady } = useLocalStorage('app:todo', defaults)

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
            tags: [...current.tags, 'new'],
          }))
        }}
      >
        Add tag
      </button>
      <ul>
        {value.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
    </div>
  )
}`

export const dateMapSetSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

const defaultDate = new Date('2026-01-01T00:00:00.000Z')
const defaultMap = new Map<string, number>([['alpha', 1]])
const defaultSet = new Set(['react', 'hooks'])

export function StructuredValues() {
  const date = useLocalStorage('app:deadline', defaultDate)
  const map = useLocalStorage('app:scores', defaultMap)
  const set = useLocalStorage('app:tags', defaultSet)

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

export const customSerializerSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

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

export function VersionedPointStorage() {
  const { value, setValue, isReady } = useLocalStorage(
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

export const mergeDefaultsSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

type Settings = { theme: string; fontSize: number; beta: boolean }

const defaults: Settings = { theme: 'light', fontSize: 16, beta: false }

export function MergeDefaultsComparison() {
  const withoutMerge = useLocalStorage('app:settings-raw', defaults, {
    mergeDefaults: false,
  })
  const withMerge = useLocalStorage('app:settings-merged', defaults, {
    mergeDefaults: true,
  })

  return (
    <div>
      <p>Without merge: {JSON.stringify(withoutMerge.value)}</p>
      <p>With merge: {JSON.stringify(withMerge.value)}</p>
    </div>
  )
}`

export const twoComponentsSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

function EditorA() {
  const { value, setValue } = useLocalStorage('app:shared-note', '')
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
  const { value } = useLocalStorage('app:shared-note', '')
  return <output>{value}</output>
}

export function SharedNote() {
  return (
    <>
      <EditorA />
      <EditorB />
    </>
  )
}`

export const crossTabEventSnippet = `import { useEffect, useState } from 'react'
import { useLocalStorage } from '@muradyanvano/react-hooks'

export function CrossTabSync() {
  const { value, isReady } = useLocalStorage('app:remote-count', 0)
  const [lastEvent, setLastEvent] = useState('none')

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'app:remote-count') {
        setLastEvent(String(event.newValue))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  if (!isReady) {
    return null
  }

  return (
    <p>
      Value: {value} · last event: {lastEvent}
    </p>
  )
}`

export const dynamicKeySnippet = `import { useState } from 'react'
import { useLocalStorage } from '@muradyanvano/react-hooks'

export function ProfileSwitcher() {
  const [profile, setProfile] = useState<'a' | 'b'>('a')
  const key = profile === 'a' ? 'app:profile-a' : 'app:profile-b'
  const { value, setValue, isReady } = useLocalStorage(key, { name: 'Guest' })

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

export const writeDefaultsSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

export function WriteDefaultsComparison() {
  const writesDefault = useLocalStorage('app:with-default-write', 'hello', {
    writeDefaults: true,
  })
  const skipsDefault = useLocalStorage('app:without-default-write', 'hello', {
    writeDefaults: false,
  })

  return (
    <div>
      <p>writeDefaults true: {writesDefault.isReady ? 'ready' : 'loading'}</p>
      <p>writeDefaults false: {skipsDefault.isReady ? 'ready' : 'loading'}</p>
    </div>
  )
}`

export const malformedValueSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

export function MalformedRecovery() {
  const { value, error, remove, reset, isReady } = useLocalStorage(
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

export const storageUnavailableSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

export function OfflineFallback() {
  const { value, setValue, isSupported, isReady } = useLocalStorage(
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

export const removeVsResetSnippet = `import { useLocalStorage } from '@muradyanvano/react-hooks'

export function RemoveVsReset() {
  const { value, remove, reset, isReady } = useLocalStorage('app:score', 10)

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
import { useLocalStorage } from '@muradyanvano/react-hooks'

export function IframeStorage() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [targetWindow, setTargetWindow] = useState<Window | null>(null)
  const { value, setValue, isReady } = useLocalStorage(
    'app:iframe-note',
    'hello',
    { window: targetWindow },
  )

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated storage frame"
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
import { useLocalStorage } from '@muradyanvano/react-hooks'

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
  const state = useLocalStorage(storageKey, defaultValue, {
    mergeDefaults,
    writeDefaults,
    listenToStorageChanges,
  })

  return (
    <pre>{JSON.stringify({ value: state.value, isReady: state.isReady }, null, 2)}</pre>
  )
}

export function LocalStoragePlayground(props: PlaygroundProps) {
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
