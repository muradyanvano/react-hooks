export const editorSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function UrlParameterEditor({ window: targetWindow }: { window: Window }) {
  const { params, set, append, remove, reset, searchParams } = useUrlSearchParams(
    'history',
    { window: targetWindow, writeMode: 'push' },
  )

  return (
    <div>
      <p>{searchParams.toString()}</p>
      <button type="button" onClick={() => set('foo', 'edited')}>
        Edit foo
      </button>
      <button type="button" onClick={() => append('tag', 'react')}>
        Add tag
      </button>
      <button type="button" onClick={() => remove('biz')}>
        Remove biz
      </button>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <pre>{JSON.stringify(params, null, 2)}</pre>
    </div>
  )
}`

export const basicHistorySnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function BasicHistory({ window: target }: { window: Window }) {
  const { params, set, clear } = useUrlSearchParams('history', { window: target })
  return (
    <>
      <button type="button" onClick={() => set('q', 'hooks')}>Search</button>
      <button type="button" onClick={() => clear()}>Clear</button>
      <pre>{JSON.stringify(params)}</pre>
    </>
  )
}`

export const filtersSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function ProductFilters({ window: target }: { window: Window }) {
  const { get, set, remove } = useUrlSearchParams('history', { window: target })
  return (
    <label>
      Category
      <select
        value={get('category') ?? ''}
        onChange={(event) => {
          const value = event.target.value
          if (value) set('category', value)
          else remove('category')
        }}
      >
        <option value="">Any</option>
        <option value="keyboards">Keyboards</option>
        <option value="mice">Mice</option>
      </select>
    </label>
  )
}`

export const searchPaginationSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function SearchPagination({ window: target }: { window: Window }) {
  const { get, set } = useUrlSearchParams('history', { window: target })
  const page = Number(get('page') ?? '1')
  return (
    <button type="button" onClick={() => set('page', page + 1)}>
      Next page ({page})
    </button>
  )
}`

export const repeatedTagsSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function RepeatedTags({ window: target }: { window: Window }) {
  const { getAll, append, remove } = useUrlSearchParams('history', { window: target })
  return (
    <>
      <button type="button" onClick={() => append('tag', 'react')}>Add react</button>
      <button type="button" onClick={() => remove('tag', 'react')}>Remove react</button>
      <p>{getAll('tag').join(', ')}</p>
    </>
  )
}`

export const emptyBareSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function EmptyAndBare({ window: target }: { window: Window }) {
  const { set, has, get } = useUrlSearchParams('history', { window: target })
  return (
    <>
      <button type="button" onClick={() => set('flag', '')}>Empty value</button>
      <p>flag empty: {String(has('flag') && get('flag') === '')}</p>
    </>
  )
}`

export const pushReplaceSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function PushReplace({ window: target }: { window: Window }) {
  const replaceApi = useUrlSearchParams('history', { window: target, writeMode: 'replace' })
  const pushApi = useUrlSearchParams('history', { window: target, writeMode: 'push' })
  return (
    <>
      <button type="button" onClick={() => replaceApi.set('mode', 'replace')}>Replace</button>
      <button type="button" onClick={() => pushApi.set('mode', 'push')}>Push</button>
    </>
  )
}`

export const backForwardSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function DemoPreviousState({ window: target }: { window: Window }) {
  const { params, set, setParams, searchParams } = useUrlSearchParams('history', {
    window: target,
    writeMode: 'push',
  })
  const trail: string[] = []
  return (
    <>
      <button
        type="button"
        onClick={() => {
          trail.push(searchParams.toString())
          set('step', 'a')
        }}
      >
        Step A
      </button>
      <button
        type="button"
        onClick={() => {
          const previous = trail.pop()
          if (previous == null) return
          const next: Record<string, string> = {}
          new URLSearchParams(previous).forEach((value, key) => {
            next[key] = value
          })
          setParams(next)
        }}
      >
        Demo previous
      </button>
      <pre>{JSON.stringify(params)}</pre>
    </>
  )
}`

export const readOnlySnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function ReadOnlyUrl({ window: target }: { window: Window }) {
  const { params, set } = useUrlSearchParams('history', { window: target, write: false })
  return (
    <button type="button" onClick={() => set('draft', 'local')}>
      Local only ({String(params.draft ?? '')})
    </button>
  )
}`

export const disabledSnippet = `import { useState } from 'react'
import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function DisabledEditing({ window: target }: { window: Window }) {
  const [enabled, setEnabled] = useState(false)
  const { params, set } = useUrlSearchParams('history', { window: target, enabled })
  return (
    <>
      <label>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>
      <button type="button" onClick={() => set('q', 'local')}>Set q</button>
      <pre>{JSON.stringify(params)}</pre>
    </>
  )
}`

export const initialResetSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function InitialReset({ window: target }: { window: Window }) {
  const { params, set, reset } = useUrlSearchParams('history', {
    window: target,
    initialValue: { view: 'grid' },
  })
  return (
    <>
      <button type="button" onClick={() => set('view', 'list')}>List</button>
      <button type="button" onClick={() => reset()}>Reset</button>
      <p>{String(params.view)}</p>
    </>
  )
}`

export const nullishSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function RemoveNullish({ window: target }: { window: Window }) {
  const { params, set } = useUrlSearchParams('history', {
    window: target,
    removeNullishValues: true,
  })
  return (
    <button type="button" onClick={() => set('q', null)}>
      Clear q ({String(params.q ?? 'gone')})
    </button>
  )
}`

export const falsySnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function RemoveFalsy({ window: target }: { window: Window }) {
  const { has, set } = useUrlSearchParams('history', {
    window: target,
    removeFalsyValues: true,
  })
  return (
    <button type="button" onClick={() => set('count', 0)}>
      Set 0 (present: {String(has('count'))})
    </button>
  )
}`

export const hashRouteSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function HashRoute({ window: target }: { window: Window }) {
  const { params, set } = useUrlSearchParams('hash', { window: target })
  return (
    <button type="button" onClick={() => set('tab', 'details')}>
      Tab ({String(params.tab ?? '')})
    </button>
  )
}`

export const hashParamsSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function HashParams({ window: target }: { window: Window }) {
  const { params, set } = useUrlSearchParams('hash-params', { window: target })
  return (
    <button type="button" onClick={() => set('focus', 'reviews')}>
      Focus ({String(params.focus ?? '')})
    </button>
  )
}`

export const customStringifySnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function CustomStringify({ window: target }: { window: Window }) {
  const { set, searchParams } = useUrlSearchParams('history', {
    window: target,
    stringify: (params) => params.toString().toLowerCase(),
  })
  return (
    <button type="button" onClick={() => set('Q', 'Hello')}>
      Write ({searchParams.toString()})
    </button>
  )
}`

export const multiSyncSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function MultiSync({ window: target }: { window: Window }) {
  const a = useUrlSearchParams('history', { window: target })
  const b = useUrlSearchParams('history', { window: target })
  return (
    <>
      <button type="button" onClick={() => a.set('shared', 'from-a')}>A writes</button>
      <p>B sees: {String(b.params.shared ?? '')}</p>
    </>
  )
}`

export const dynamicModeSnippet = `import { useState } from 'react'
import { useUrlSearchParams, type UseUrlSearchParamsMode } from '@muradyanvano/react-hooks'

export function DynamicMode({ window: target }: { window: Window }) {
  const [mode, setMode] = useState<UseUrlSearchParamsMode>('history')
  const { params, set } = useUrlSearchParams(mode, { window: target })
  return (
    <>
      <button type="button" onClick={() => setMode('hash')}>Hash mode</button>
      <button type="button" onClick={() => set('x', '1')}>Set x</button>
      <pre>{JSON.stringify(params)}</pre>
    </>
  )
}`

export const iframeWindowSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function IframeWindow({ window: target }: { window: Window }) {
  const { params, set } = useUrlSearchParams('history', { window: target })
  return (
    <button type="button" onClick={() => set('isolated', 'yes')}>
      Isolated ({String(params.isolated ?? '')})
    </button>
  )
}`

export const playgroundSnippet = `import { useUrlSearchParams } from '@muradyanvano/react-hooks'

export function Playground({ window: target }: { window: Window }) {
  const api = useUrlSearchParams('history', { window: target })
  return (
    <>
      <button type="button" onClick={() => api.set('demo', '1')}>Set</button>
      <button type="button" onClick={() => api.clear()}>Clear</button>
      <button type="button" onClick={() => api.refresh()}>Refresh</button>
      <pre>{JSON.stringify(api.params)}</pre>
    </>
  )
}`
