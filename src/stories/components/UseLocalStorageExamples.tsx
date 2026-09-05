import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import { useLocalStorage } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  booleanSettingSnippet,
  crossTabEventSnippet,
  customSerializerSnippet,
  customWindowSnippet,
  dateMapSetSnippet,
  dynamicKeySnippet,
  fruitEditorSnippet,
  malformedValueSnippet,
  mergeDefaultsSnippet,
  objectAndArraySnippet,
  persistentCounterSnippet,
  playgroundSnippet,
  preferencesPanelSnippet,
  removeVsResetSnippet,
  storageUnavailableSnippet,
  stringValueSnippet,
  twoComponentsSnippet,
  writeDefaultsSnippet,
} from './useLocalStorage.snippets'

export const STORAGE_KEY_PREFIX = 'muradyanvano-react-hooks:useLocalStorage:'

export function storageKey(name: string): string {
  return `${STORAGE_KEY_PREFIX}${name}`
}

export const KEYS = {
  fruitEditor: storageKey('fruit-editor'),
  preferences: storageKey('preferences'),
  counter: storageKey('counter'),
  booleanSetting: storageKey('boolean-setting'),
  stringValue: storageKey('string-value'),
  objectArray: storageKey('object-array'),
  dateMapSet: storageKey('date-map-set'),
  customSerializer: storageKey('custom-serializer'),
  mergeDisabled: storageKey('merge-disabled'),
  mergeEnabled: storageKey('merge-enabled'),
  twoComponents: storageKey('two-components'),
  crossTab: storageKey('cross-tab'),
  profileA: storageKey('profile-a'),
  profileB: storageKey('profile-b'),
  writeDefaultsOn: storageKey('write-defaults-on'),
  writeDefaultsOff: storageKey('write-defaults-off'),
  malformed: storageKey('malformed'),
  removeReset: storageKey('remove-reset'),
  customWindow: storageKey('custom-window'),
  playground: storageKey('playground'),
  storageUnavailable: storageKey('storage-unavailable'),
} as const

export const ALL_STORY_KEYS = [
  ...Object.values(KEYS),
  `${KEYS.dateMapSet}:date`,
  `${KEYS.dateMapSet}:map`,
  `${KEYS.dateMapSet}:set`,
  storageKey('unrelated'),
] as const

export function clearAllStoryKeys(): void {
  for (const key of ALL_STORY_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Storage may be unavailable in restricted contexts.
    }
  }
}

const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
const dangerButtonClass =
  'rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 outline-none hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2'
const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const panelClass = 'rounded-xl border border-slate-200 bg-slate-50 p-4'
const codePreviewClass =
  'overflow-x-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-emerald-300'

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

function SavedBadge({ visible }: { visible: boolean }): ReactElement | null {
  if (!visible) {
    return null
  }

  return (
    <span
      data-testid="saved-badge"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
    >
      Saved locally
    </span>
  )
}

function KeyBadge({
  storageKeyName,
}: {
  storageKeyName: string
}): ReactElement {
  return (
    <span
      data-testid="key-badge"
      className="inline-flex max-w-full truncate rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200"
      title={storageKeyName}
    >
      {storageKeyName}
    </span>
  )
}

function FruitIcon({ name }: { name: string }): ReactElement {
  const tone = name.toLowerCase().includes('banana')
    ? 'bg-amber-200 ring-amber-300'
    : name.toLowerCase().includes('apple')
      ? 'bg-rose-200 ring-rose-300'
      : name.toLowerCase().includes('grape')
        ? 'bg-violet-200 ring-violet-300'
        : 'bg-orange-200 ring-orange-300'

  return (
    <span
      aria-hidden="true"
      data-testid="fruit-icon"
      className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${tone}`}
    >
      <span className="h-8 w-8 rounded-full bg-white/70 shadow-inner" />
    </span>
  )
}

function useStoredRaw(key: string, refreshToken: unknown): string {
  const [raw, setRaw] = useState('(empty)')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      try {
        const value = localStorage.getItem(key)
        setRaw(value ?? '(missing)')
      } catch {
        setRaw('(unavailable)')
      }
    })
    return () => {
      cancelled = true
    }
  }, [key, refreshToken])

  return raw
}

function useIsolatedIframeBind(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  onReady: (frame: HTMLIFrameElement) => void,
): void {
  useEffect(() => {
    const frame = iframeRef.current
    if (frame == null) {
      return
    }

    const bind = () => {
      if (frame.contentDocument == null) {
        return
      }
      onReady(frame)
    }

    frame.addEventListener('load', bind)
    if (frame.contentDocument?.readyState === 'complete') {
      bind()
    }

    return () => {
      frame.removeEventListener('load', bind)
    }
  }, [iframeRef, onReady])
}

export function FruitEditorExample(): ReactElement {
  const { value, setValue, reset, remove, isReady, isSupported, error } =
    useLocalStorage<Fruit>(KEYS.fruitEditor, defaultFruit)
  const raw = useStoredRaw(KEYS.fruitEditor, value)

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Persistent fruit editor"
      description="A structured object persists across reloads with automatic JSON serialization. Edit fields, inspect the stored payload, then reset or remove the key."
      instruction="Change name, color, size, or count and confirm the serialized preview and Saved locally badge update."
      code={fruitEditorSnippet}
      badge="Primary"
      aside={
        <div className="space-y-3">
          <StatusPanel
            items={[
              { label: 'isReady', value: String(isReady), testId: 'ls-ready' },
              {
                label: 'isSupported',
                value: String(isSupported),
                testId: 'ls-supported',
              },
              {
                label: 'error',
                value: error?.message ?? 'none',
                testId: 'ls-error',
              },
              {
                label: 'count',
                value: String(value.count),
                testId: 'fruit-count',
              },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <SavedBadge visible={isReady && isSupported && error == null} />
            <KeyBadge storageKeyName={KEYS.fruitEditor} />
          </div>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <FruitIcon name={value.name} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Name
            <input
              className={inputClass}
              data-testid="fruit-name"
              value={value.name}
              onChange={(event) => {
                setValue({ ...value, name: event.target.value })
              }}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Color
            <input
              className={inputClass}
              data-testid="fruit-color"
              value={value.color}
              onChange={(event) => {
                setValue({ ...value, color: event.target.value })
              }}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Size
            <select
              className={selectClass}
              data-testid="fruit-size"
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
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Count
            <input
              className={inputClass}
              data-testid="fruit-count-input"
              type="number"
              min={0}
              value={value.count}
              onChange={(event) => {
                setValue({ ...value, count: Number(event.target.value) })
              }}
            />
          </label>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Serialized preview
        </p>
        <pre className={codePreviewClass} data-testid="fruit-serialized">
          {raw}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="fruit-reset"
          onClick={() => {
            reset()
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="fruit-remove"
          onClick={() => {
            remove()
          }}
        >
          Remove
        </button>
      </div>
    </ExampleShowcase>
  )
}

type Preferences = {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  reducedMotion: boolean
}

const defaultPreferences: Preferences = {
  theme: 'system',
  density: 'comfortable',
  reducedMotion: false,
}

export function PreferencesPanelExample(): ReactElement {
  const { value, setValue, isReady, isSupported } = useLocalStorage(
    KEYS.preferences,
    defaultPreferences,
    { mergeDefaults: true },
  )

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Preferences panel"
      description="mergeDefaults fills newly added fields without wiping stored preferences. Functional setValue updates keep merges predictable."
      instruction="Toggle reduced motion and switch theme/density. Stored objects missing new fields inherit defaults."
      code={preferencesPanelSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'pref-ready' },
            {
              label: 'theme',
              value: value.theme,
              testId: 'pref-theme',
            },
            {
              label: 'density',
              value: value.density,
              testId: 'pref-density',
            },
            {
              label: 'reducedMotion',
              value: String(value.reducedMotion),
              testId: 'pref-motion',
            },
            {
              label: 'isSupported',
              value: String(isSupported),
              testId: 'pref-supported',
            },
          ]}
        />
      }
    >
      <fieldset className={`${panelClass} space-y-3`}>
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Preferences
        </legend>
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          Theme
          <select
            className={selectClass}
            data-testid="pref-theme-select"
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
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          Density
          <select
            className={selectClass}
            data-testid="pref-density-select"
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
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            data-testid="pref-motion-checkbox"
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
    </ExampleShowcase>
  )
}

function CounterPanel({ remountKey }: { remountKey: number }): ReactElement {
  const { value, setValue, isReady } = useLocalStorage(KEYS.counter, 0)

  return (
    <div className={panelClass} data-testid="counter-panel" key={remountKey}>
      <p className="text-sm text-slate-700" aria-live="polite">
        Count:{' '}
        <span
          className="font-mono text-lg font-semibold text-indigo-700"
          data-testid="counter-value"
        >
          {isReady ? value : '…'}
        </span>
      </p>
      <button
        type="button"
        className={`${buttonClass} mt-3`}
        data-testid="counter-increment"
        disabled={!isReady}
        onClick={() => {
          setValue((count) => count + 1)
        }}
      >
        Increment
      </button>
      <p className="mt-2 text-xs text-slate-500" aria-hidden="true">
        isReady: {String(isReady)}
      </p>
      <span className="sr-only" data-testid="counter-ready">
        {String(isReady)}
      </span>
    </div>
  )
}

export function PersistentCounterExample(): ReactElement {
  const [mounted, setMounted] = useState(true)
  const [remountKey, setRemountKey] = useState(0)

  const remount = () => {
    setMounted(false)
    queueMicrotask(() => {
      setRemountKey((value) => value + 1)
      setMounted(true)
    })
  }

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Persistent counter"
      description="Numbers use a dedicated string serializer. Remount the panel to prove hydration reads the stored count instead of resetting to zero."
      instruction="Increment a few times, remount, and confirm the count restores from localStorage."
      code={persistentCounterSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'counter-mounted',
            },
            {
              label: 'Remount key',
              value: String(remountKey),
              testId: 'counter-remount-key',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={secondaryButtonClass}
        data-testid="counter-remount"
        onClick={remount}
      >
        Remount panel
      </button>
      {mounted ? <CounterPanel remountKey={remountKey} /> : null}
    </ExampleShowcase>
  )
}

export function BooleanSettingExample(): ReactElement {
  const { value, setValue, isReady } = useLocalStorage(
    KEYS.booleanSetting,
    false,
  )
  const raw = useStoredRaw(KEYS.booleanSetting, value)

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Boolean setting"
      description="false is a valid persisted value — the boolean serializer stores the literal strings true and false."
      instruction="Toggle the checkbox off and reload mentally via remount: false must remain false, not fall back to a truthy default."
      code={booleanSettingSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'bool-ready' },
            { label: 'value', value: String(value), testId: 'bool-value' },
            { label: 'stored', value: raw, testId: 'bool-raw' },
          ]}
        />
      }
    >
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          data-testid="bool-checkbox"
          checked={value}
          onChange={(event) => {
            setValue(event.target.checked)
          }}
        />
        Feature enabled
      </label>
    </ExampleShowcase>
  )
}

export function StringValueExample(): ReactElement {
  const { value, setValue, isReady } = useLocalStorage(KEYS.stringValue, '')
  const raw = useStoredRaw(KEYS.stringValue, value)

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="String value"
      description="Empty strings round-trip through the string serializer. Clearing the field persists an empty value rather than deleting the key."
      instruction="Clear the nickname field and confirm the stored raw value is an empty string."
      code={stringValueSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'string-ready',
            },
            {
              label: 'length',
              value: String(value.length),
              testId: 'string-length',
            },
            {
              label: 'stored',
              value: raw === '' ? '(empty)' : raw,
              testId: 'string-raw',
            },
          ]}
        />
      }
    >
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        Nickname
        <input
          className={inputClass}
          data-testid="string-input"
          value={value}
          placeholder="Leave blank to store an empty string"
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

type TodoState = {
  title: string
  tags: string[]
}

const defaultTodo: TodoState = { title: 'Draft', tags: ['ideas'] }

export function ObjectAndArrayExample(): ReactElement {
  const { value, setValue, isReady } = useLocalStorage(
    KEYS.objectArray,
    defaultTodo,
  )

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Object and array"
      description="Use functional setValue to update nested objects and arrays immutably. JSON serialization handles structured defaults."
      instruction="Rename the draft and add tags. Each update writes a fresh immutable snapshot."
      code={objectAndArraySnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'todo-ready' },
            { label: 'title', value: value.title, testId: 'todo-title' },
            {
              label: 'tags',
              value: value.tags.join(', '),
              testId: 'todo-tags',
            },
          ]}
        />
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          Title
          <input
            className={inputClass}
            data-testid="todo-title-input"
            value={value.title}
            onChange={(event) => {
              setValue((current) => ({ ...current, title: event.target.value }))
            }}
          />
        </label>
        <button
          type="button"
          className={buttonClass}
          data-testid="todo-add-tag"
          onClick={() => {
            setValue((current) => ({
              ...current,
              tags: [...current.tags, `tag-${current.tags.length + 1}`],
            }))
          }}
        >
          Add tag
        </button>
        <ul
          className="list-inside list-disc text-sm text-slate-700"
          data-testid="todo-tag-list"
        >
          {value.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </ExampleShowcase>
  )
}

export function DateMapSetExample(): ReactElement {
  const defaultDate = useMemo(() => new Date('2026-01-01T00:00:00.000Z'), [])
  const defaultMap = useMemo(() => new Map<string, number>([['alpha', 1]]), [])
  const defaultSet = useMemo(() => new Set(['react', 'hooks']), [])

  const dateState = useLocalStorage(KEYS.dateMapSet + ':date', defaultDate)
  const mapState = useLocalStorage(KEYS.dateMapSet + ':map', defaultMap)
  const setState = useLocalStorage(KEYS.dateMapSet + ':set', defaultSet)

  const dateRaw = useStoredRaw(KEYS.dateMapSet + ':date', dateState.value)
  const mapRaw = useStoredRaw(KEYS.dateMapSet + ':map', mapState.value)
  const setRaw = useStoredRaw(KEYS.dateMapSet + ':set', setState.value)

  const ready = dateState.isReady && mapState.isReady && setState.isReady

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Date, Map, and Set"
      description="Defaults pick serializers automatically: Date stores ISO strings, Map and Set store JSON entry arrays."
      instruction="Inspect live values and the raw localStorage representation for each structured type."
      code={dateMapSetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(ready),
              testId: 'structured-ready',
            },
            {
              label: 'Date',
              value: dateState.value.toISOString(),
              testId: 'structured-date',
            },
            {
              label: 'Map size',
              value: String(mapState.value.size),
              testId: 'structured-map-size',
            },
            {
              label: 'Set size',
              value: String(setState.value.size),
              testId: 'structured-set-size',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 lg:grid-cols-3">
        <div className={panelClass}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Date</p>
          <p
            className="mt-2 text-sm text-slate-800"
            data-testid="structured-date-label"
          >
            {dateState.value.toISOString()}
          </p>
          <pre
            className={`${codePreviewClass} mt-2`}
            data-allow-h-scroll
            data-testid="structured-date-raw"
            tabIndex={0}
            aria-label="Serialized Date value"
          >
            {dateRaw}
          </pre>
        </div>
        <div className={panelClass}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Map</p>
          <p className="mt-2 text-sm text-slate-800">
            {[...mapState.value.entries()]
              .map(([key, score]) => `${key}:${score}`)
              .join(', ')}
          </p>
          <pre
            className={`${codePreviewClass} mt-2`}
            data-allow-h-scroll
            data-testid="structured-map-raw"
            tabIndex={0}
            aria-label="Serialized Map value"
          >
            {mapRaw}
          </pre>
        </div>
        <div className={panelClass}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Set</p>
          <p className="mt-2 text-sm text-slate-800">
            {[...setState.value.values()].join(', ')}
          </p>
          <pre
            className={`${codePreviewClass} mt-2`}
            data-allow-h-scroll
            data-testid="structured-set-raw"
            tabIndex={0}
            aria-label="Serialized Set value"
          >
            {setRaw}
          </pre>
        </div>
      </div>
    </ExampleShowcase>
  )
}

type VersionedPoint = { x: number; y: number; version: number }

const versionedSerializer = {
  read(raw: string): VersionedPoint {
    const [version, x, y] = raw.split('|')
    if (version !== 'v1') {
      throw new Error('Unsupported version')
    }
    return { version: 1, x: Number(x), y: Number(y) }
  },
  write(value: VersionedPoint): string {
    return `v1|${value.x}|${value.y}`
  },
}

export function CustomSerializerExample(): ReactElement {
  const { value, setValue, isReady } = useLocalStorage(
    KEYS.customSerializer,
    { x: 0, y: 0, version: 1 },
    { serializer: versionedSerializer },
  )
  const raw = useStoredRaw(KEYS.customSerializer, value)

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Custom serializer"
      description="Pass a public serializer object with read and write when JSON is not the right on-disk format."
      instruction="Move the point and inspect the delimited v1 payload written to storage."
      code={customSerializerSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'custom-ready',
            },
            { label: 'x', value: String(value.x), testId: 'custom-x' },
            { label: 'y', value: String(value.y), testId: 'custom-y' },
            { label: 'stored', value: raw, testId: 'custom-raw' },
          ]}
        />
      }
    >
      <div className={`${panelClass} flex flex-wrap items-center gap-4`}>
        <p
          className="font-mono text-sm text-slate-800"
          data-testid="custom-label"
        >
          ({value.x}, {value.y})
        </p>
        <button
          type="button"
          className={buttonClass}
          data-testid="custom-move"
          onClick={() => {
            setValue((current) => ({ ...current, x: current.x + 1 }))
          }}
        >
          Move right
        </button>
      </div>
    </ExampleShowcase>
  )
}

type MergeSettings = {
  theme: string
  fontSize: number
  beta: boolean
}

const mergeDefaultsValue: MergeSettings = {
  theme: 'light',
  fontSize: 16,
  beta: false,
}

function MergePanel({
  label,
  storageKeyName,
  mergeDefaults,
  testPrefix,
}: {
  label: string
  storageKeyName: string
  mergeDefaults: boolean
  testPrefix: string
}): ReactElement {
  const { value, isReady } = useLocalStorage(
    storageKeyName,
    mergeDefaultsValue,
    {
      mergeDefaults,
    },
  )

  return (
    <div className={panelClass} data-testid={`${testPrefix}-panel`}>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-2 text-xs text-slate-500" aria-hidden="true">
        isReady: {String(isReady)}
      </p>
      <span className="sr-only" data-testid={`${testPrefix}-ready`}>
        {String(isReady)}
      </span>
      <pre
        className={`${codePreviewClass} mt-2 text-[11px]`}
        data-testid={`${testPrefix}-value`}
      >
        {JSON.stringify(value)}
      </pre>
    </div>
  )
}

export function MergeDefaultsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Merge defaults"
      description="When stored JSON is missing newly added default fields, mergeDefaults shallow-merges defaults underneath stored values."
      instruction="Compare panels after seeding legacy storage that only contains theme."
      code={mergeDefaultsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Seeded shape',
              value: '{"theme":"dark"}',
              testId: 'merge-seed-label',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <MergePanel
          label="mergeDefaults: false"
          storageKeyName={KEYS.mergeDisabled}
          mergeDefaults={false}
          testPrefix="merge-off"
        />
        <MergePanel
          label="mergeDefaults: true"
          storageKeyName={KEYS.mergeEnabled}
          mergeDefaults={true}
          testPrefix="merge-on"
        />
      </div>
    </ExampleShowcase>
  )
}

function SharedEditor({
  testId,
  readOnly = false,
}: {
  testId: string
  readOnly?: boolean
}): ReactElement {
  const { value, setValue, isReady } = useLocalStorage(KEYS.twoComponents, '')

  if (readOnly) {
    return (
      <output
        className="block min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
        data-testid={testId}
        aria-label="Shared note mirror"
      >
        {isReady ? value : 'Loading…'}
      </output>
    )
  }

  return (
    <textarea
      className={`${inputClass} min-h-24`}
      data-testid={testId}
      aria-label="Shared note editor"
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
      }}
    />
  )
}

export function TwoComponentsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Two components"
      description="Same-document updates fan out through the internal registry so multiple hook instances stay in sync instantly."
      instruction="Type in editor A and watch editor B mirror the value without a reload."
      code={twoComponentsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Key',
              value: KEYS.twoComponents,
              testId: 'sync-key',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
            Editor A
          </p>
          <SharedEditor testId="sync-editor-a" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
            Editor B
          </p>
          <SharedEditor testId="sync-editor-b" readOnly />
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function CrossTabEventExample(): ReactElement {
  const { value, isReady } = useLocalStorage(KEYS.crossTab, 0)
  const [ignored, setIgnored] = useState('none')

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Cross-tab event"
      description="Native storage events update the hook when another context writes the same key. Unrelated keys are ignored."
      instruction="Simulate a remote write with the button, then dispatch an unrelated event and confirm the value stays put."
      code={crossTabEventSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'cross-ready' },
            { label: 'value', value: String(value), testId: 'cross-value' },
            {
              label: 'ignored event',
              value: ignored,
              testId: 'cross-ignored',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="cross-simulate"
          onClick={() => {
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: KEYS.crossTab,
                newValue: '42',
                storageArea: localStorage,
              }),
            )
          }}
        >
          Simulate cross-tab write (42)
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="cross-unrelated"
          onClick={() => {
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: storageKey('unrelated'),
                newValue: '999',
                storageArea: localStorage,
              }),
            )
            setIgnored('999')
          }}
        >
          Dispatch unrelated event
        </button>
      </div>
    </ExampleShowcase>
  )
}

type Profile = { name: string }

export function DynamicKeyExample(): ReactElement {
  const [profile, setProfile] = useState<'a' | 'b'>('a')
  const key = profile === 'a' ? KEYS.profileA : KEYS.profileB
  const { value, setValue, isReady } = useLocalStorage<Profile>(key, {
    name: 'Guest',
  })

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Dynamic key"
      description="Changing the key rehydrates from a different storage entry while preserving independent profile drafts."
      instruction="Switch profiles, edit each name, and switch back to confirm both values persisted separately."
      code={dynamicKeySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active profile',
              value: profile,
              testId: 'dynamic-profile',
            },
            { label: 'key', value: key, testId: 'dynamic-key' },
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'dynamic-ready',
            },
            { label: 'name', value: value.name, testId: 'dynamic-name' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={profile === 'a' ? buttonClass : secondaryButtonClass}
          data-testid="dynamic-profile-a"
          onClick={() => {
            setProfile('a')
          }}
        >
          Profile A
        </button>
        <button
          type="button"
          className={profile === 'b' ? buttonClass : secondaryButtonClass}
          data-testid="dynamic-profile-b"
          onClick={() => {
            setProfile('b')
          }}
        >
          Profile B
        </button>
      </div>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Display name
        <input
          className={inputClass}
          data-testid="dynamic-name-input"
          value={value.name}
          onChange={(event) => {
            setValue({ name: event.target.value })
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

function WriteDefaultsPanel({
  label,
  storageKeyName,
  writeDefaults,
  testPrefix,
}: {
  label: string
  storageKeyName: string
  writeDefaults: boolean
  testPrefix: string
}): ReactElement {
  const { isReady } = useLocalStorage(storageKeyName, 'hello', {
    writeDefaults,
  })
  const raw = useStoredRaw(storageKeyName, isReady)

  return (
    <div className={panelClass} data-testid={`${testPrefix}-panel`}>
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-2 text-xs text-slate-500" aria-hidden="true">
        isReady: {String(isReady)}
      </p>
      <span className="sr-only" data-testid={`${testPrefix}-ready`}>
        {String(isReady)}
      </span>
      <p
        className="mt-2 font-mono text-sm text-slate-800"
        data-testid={`${testPrefix}-raw`}
      >
        raw: {raw}
      </p>
    </div>
  )
}

export function WriteDefaultsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Write defaults"
      description="writeDefaults controls whether missing keys are seeded on first hydration. Disable it to keep storage empty until the user edits."
      instruction="Compare panels when no key exists: enabled writes hello immediately, disabled leaves the key missing."
      code={writeDefaultsSnippet}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <WriteDefaultsPanel
          label="writeDefaults: true"
          storageKeyName={KEYS.writeDefaultsOn}
          writeDefaults={true}
          testPrefix="write-on"
        />
        <WriteDefaultsPanel
          label="writeDefaults: false"
          storageKeyName={KEYS.writeDefaultsOff}
          writeDefaults={false}
          testPrefix="write-off"
        />
      </div>
    </ExampleShowcase>
  )
}

export function MalformedValueExample(): ReactElement {
  const { value, error, remove, reset, isReady } = useLocalStorage(
    KEYS.malformed,
    { mode: 'safe' },
  )

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Malformed value"
      description="Invalid stored payloads fall back to defaults and surface a readable error. Remove clears the bad entry; reset rewrites a valid default."
      instruction="Seed corrupt JSON, observe the error, then Remove or Repair."
      code={malformedValueSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'malformed-ready',
            },
            {
              label: 'value',
              value: JSON.stringify(value),
              testId: 'malformed-value',
            },
            {
              label: 'error',
              value: error?.message ?? 'none',
              testId: 'malformed-error',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="malformed-remove"
          onClick={() => {
            remove()
          }}
        >
          Remove
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="malformed-repair"
          onClick={() => {
            reset()
          }}
        >
          Repair
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function StorageUnavailableExample(): ReactElement {
  const { value, setValue, isSupported, isReady } = useLocalStorage(
    KEYS.storageUnavailable,
    'fallback',
    { window: null },
  )

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Storage unavailable"
      description="When storage throws or is unavailable, isSupported is false, errors are reported, and React state still updates locally."
      instruction="Edit the draft even though persistence is blocked. The warning is exposed to assistive tech."
      code={storageUnavailableSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'denied-ready',
            },
            {
              label: 'isSupported',
              value: String(isSupported),
              testId: 'denied-supported',
            },
            {
              label: 'value',
              value,
              testId: 'denied-value',
            },
          ]}
        />
      }
    >
      <div
        role="alert"
        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        data-testid="denied-warning"
      >
        Storage is unavailable in this restricted context. Changes stay in
        memory only.
      </div>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Draft
        <textarea
          className={`${inputClass} min-h-24`}
          data-testid="denied-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

export function RemoveVsResetExample(): ReactElement {
  const { value, remove, reset, isReady } = useLocalStorage(
    KEYS.removeReset,
    10,
  )
  const raw = useStoredRaw(KEYS.removeReset, value)

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Remove versus reset"
      description="reset writes the default value back to storage. remove deletes the key so the next hydration behaves like a missing entry."
      instruction="Try reset and remove in turn while watching the raw storage value."
      code={removeVsResetSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'isReady', value: String(isReady), testId: 'rr-ready' },
            { label: 'value', value: String(value), testId: 'rr-value' },
            { label: 'raw', value: raw, testId: 'rr-raw' },
          ]}
        />
      }
    >
      <p
        className="font-mono text-2xl font-semibold text-indigo-700"
        data-testid="rr-display"
      >
        {value}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="rr-reset"
          onClick={() => {
            reset()
          }}
        >
          Reset (writes default)
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="rr-remove"
          onClick={() => {
            remove()
          }}
        >
          Remove (deletes key)
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function CustomWindowExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [targetWindow, setTargetWindow] = useState<Window | null>(null)
  const [ready, setReady] = useState(false)
  const { value, setValue, isReady, isSupported } = useLocalStorage(
    KEYS.customWindow,
    'hello',
    { window: targetWindow },
  )

  const bindIframe = useCallback((frame: HTMLIFrameElement) => {
    setTargetWindow(frame.contentWindow ?? null)
    setReady(true)
  }, [])

  useIsolatedIframeBind(iframeRef, bindIframe)

  const iframeRaw =
    targetWindow == null
      ? '(iframe not ready)'
      : (targetWindow.localStorage.getItem(KEYS.customWindow) ?? '(missing)')

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Custom window"
      description="Pass options.window to isolate storage inside a same-origin iframe without touching the Storybook page localStorage."
      instruction="Wait for the iframe, edit the note, and inspect storage scoped to the frame."
      code={customWindowSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'iframe ready',
              value: String(ready),
              testId: 'iframe-ready',
            },
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'iframe-ls-ready',
            },
            {
              label: 'isSupported',
              value: String(isSupported),
              testId: 'iframe-supported',
            },
            { label: 'iframe raw', value: iframeRaw, testId: 'iframe-raw' },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated localStorage frame"
        data-testid="custom-window-iframe"
        className="h-40 w-full rounded-xl border border-slate-200 bg-white"
        srcDoc="<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#eef2ff,#fff);min-height:120px;}</style></head><body><p>Isolated frame storage</p></body></html>"
      />
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Frame note
        <input
          className={inputClass}
          data-testid="iframe-note-input"
          disabled={!ready || !isReady}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

type PlaygroundDefault = string | number | boolean | Record<string, unknown>

function PlaygroundBody({
  storageKeyName,
  defaultValue,
  mergeDefaults,
  writeDefaults,
  listenToStorageChanges,
}: {
  storageKeyName: string
  defaultValue: PlaygroundDefault
  mergeDefaults: boolean
  writeDefaults: boolean
  listenToStorageChanges: boolean
}): ReactElement {
  const state = useLocalStorage(storageKeyName, defaultValue, {
    mergeDefaults,
    writeDefaults,
    listenToStorageChanges,
  })

  return (
    <div className="space-y-3" data-testid="playground-body">
      <pre
        className={`${codePreviewClass} text-[11px] whitespace-pre-wrap`}
        data-testid="playground-state"
      >
        {JSON.stringify(
          {
            value: state.value,
            isReady: state.isReady,
            isSupported: state.isSupported,
            error: state.error?.message ?? null,
          },
          null,
          2,
        )}
      </pre>
      <button
        type="button"
        className={buttonClass}
        data-testid="playground-bump"
        disabled={typeof state.value !== 'number'}
        onClick={() => {
          if (typeof state.value === 'number') {
            state.setValue(state.value + 1)
          }
        }}
      >
        Bump number
      </button>
    </div>
  )
}

export function PlaygroundExample({
  playgroundKey = 'playground',
  defaultType = 'number',
  mergeDefaults = false,
  writeDefaults = true,
  listenToStorageChanges = true,
}: {
  playgroundKey?: string
  defaultType?: 'string' | 'number' | 'boolean' | 'object'
  mergeDefaults?: boolean
  writeDefaults?: boolean
  listenToStorageChanges?: boolean
}): ReactElement {
  const [mounted, setMounted] = useState(false)
  const storageKeyName = storageKey(playgroundKey)

  const defaultValue = useMemo<PlaygroundDefault>(() => {
    switch (defaultType) {
      case 'string':
        return 'hello'
      case 'boolean':
        return true
      case 'object':
        return { alpha: 1 }
      default:
        return 0
    }
  }, [defaultType])

  return (
    <ExampleShowcase
      hookName="useLocalStorage"
      title="Playground"
      description="Mount explicitly so Docs does not write storage on load. Tune key, default type, mergeDefaults, writeDefaults, and sync via Controls."
      instruction="Mount the playground, tweak Controls, and inspect the live hook state JSON."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'playground-mounted',
            },
            { label: 'key', value: storageKeyName, testId: 'playground-key' },
            {
              label: 'defaultType',
              value: defaultType,
              testId: 'playground-default-type',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="playground-mount"
        onClick={() => {
          setMounted(true)
        }}
      >
        Mount playground
      </button>
      {mounted ? (
        <PlaygroundBody
          key={`${storageKeyName}-${defaultType}-${mergeDefaults}-${writeDefaults}-${listenToStorageChanges}`}
          storageKeyName={storageKeyName}
          defaultValue={defaultValue}
          mergeDefaults={mergeDefaults}
          writeDefaults={writeDefaults}
          listenToStorageChanges={listenToStorageChanges}
        />
      ) : null}
    </ExampleShowcase>
  )
}

export function WithSeed({
  seed,
  children,
}: {
  seed: () => void
  children: ReactNode
}): ReactElement {
  const [ready, setReady] = useState(false)
  const seededRef = useRef(false)

  useEffect(() => {
    if (seededRef.current) {
      return
    }
    seed()
    seededRef.current = true
    setReady(true)
  }, [seed])

  if (!ready) {
    return <p data-testid="seed-loading">Seeding…</p>
  }

  return <>{children}</>
}
