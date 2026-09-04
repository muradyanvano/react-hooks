import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  useUrlSearchParams,
  type UseUrlSearchParamsMode,
  type UseUrlSearchParamsWriteMode,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  createUrlWindowFixture,
  type UrlWindowFixture,
} from './urlWindowFixture'
import * as snippets from './useUrlSearchParams.snippets'

function Shell({
  title,
  description,
  instruction,
  code,
  badge,
  aside,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  badge?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <ExampleShowcase
      hookName="useUrlSearchParams"
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      badge={badge}
      aside={aside}
    >
      {children}
    </ExampleShowcase>
  )
}

function useDemoWindow(initialPath: string) {
  const [fixture] = useState(() => createUrlWindowFixture(initialPath))

  useEffect(() => {
    // Recreate the seeded URL if Strict Mode cleanup removed the iframe node.
    if (!fixture.iframe.isConnected) {
      document.body.appendChild(fixture.iframe)
      fixture.seed(initialPath)
    }
    return () => {
      fixture.cleanup()
    }
  }, [fixture, initialPath])

  return fixture
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return value == null ? '' : String(value)
}

function UrlDisplay({
  href,
  testId = 'usp-url',
}: {
  href: string
  testId?: string
}) {
  return (
    <p
      data-testid={testId}
      className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-300"
    >
      https://example.test{href}
    </p>
  )
}

export function UrlParameterEditorExample() {
  const fixture = useDemoWindow('/products?foo=bar&library=awesome&biz=biz')
  return <UrlParameterEditorInner fixture={fixture} />
}

function UrlParameterEditorInner({ fixture }: { fixture: UrlWindowFixture }) {
  const [writeMode, setWriteMode] =
    useState<UseUrlSearchParamsWriteMode>('push')
  const [navStatus, setNavStatus] = useState('idle')
  const [tick, setTick] = useState(0)
  const { params, searchParams, isReady, set, append, remove, reset, clear } =
    useUrlSearchParams('history', {
      window: fixture.window,
      writeMode,
      initialValue: { foo: 'bar', library: 'awesome', biz: 'biz' },
    })

  const rows = useMemo(() => {
    const keys = Object.keys(params)
    return keys.flatMap((key) => {
      const value = params[key]
      if (Array.isArray(value)) {
        return value.map((entry, index) => ({
          key,
          value: entry,
          id: `${key}-${index}-${entry}`,
          repeated: true,
        }))
      }
      return [
        {
          key,
          value: value ?? '',
          id: `${key}-0`,
          repeated: false,
        },
      ]
    })
  }, [params])

  const href = `${fixture.window.location.pathname}${fixture.window.location.search}${fixture.window.location.hash}`

  return (
    <Shell
      title="URL parameter editor"
      description="Live playground for history-mode search parameters inside an isolated same-origin iframe. Storybook’s own URL is never mutated."
      instruction="Edit foo, add a parameter, append a repeated tag, remove a row, use Back/Forward, then Reset."
      badge={isReady ? 'Ready' : 'Hydrating'}
      code={snippets.editorSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Ready', value: String(isReady), testId: 'usp-ready' },
            {
              label: 'Serialized',
              value: searchParams.toString() || '(empty)',
              testId: 'usp-serialized',
            },
            {
              label: 'Navigation',
              value: navStatus,
              testId: 'usp-nav-status',
            },
            {
              label: 'Write mode',
              value: writeMode,
              testId: 'usp-write-mode',
            },
          ]}
        />
      }
    >
      <div className="space-y-4" data-testid="usp-editor">
        <UrlDisplay href={href} />
        <p className="text-sm text-slate-600">
          This demo writes only the iframe History URL. Manager and preview
          routes stay untouched.
        </p>

        <fieldset className="flex flex-wrap gap-3">
          <legend className="sr-only">Write mode</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="write-mode"
              checked={writeMode === 'replace'}
              onChange={() => setWriteMode('replace')}
            />
            Replace
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="write-mode"
              checked={writeMode === 'push'}
              onChange={() => setWriteMode('push')}
              data-testid="usp-write-push"
            />
            Push
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            data-testid="usp-back"
            onClick={() => {
              setNavStatus('back')
              fixture.window.history.back()
              queueMicrotask(() => setTick((n) => n + 1))
            }}
          >
            Back
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            data-testid="usp-forward"
            onClick={() => {
              setNavStatus('forward')
              fixture.window.history.forward()
              queueMicrotask(() => setTick((n) => n + 1))
            }}
          >
            Forward
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            data-testid="usp-reset"
            onClick={() => reset()}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            data-testid="usp-clear"
            onClick={() => clear()}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            data-testid="usp-add-param"
            onClick={() => set('newKey', 'newValue')}
          >
            Add parameter
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            data-testid="usp-add-tag"
            onClick={() => append('tag', 'react')}
          >
            Add repeated tag
          </button>
        </div>

        <table
          className="w-full min-w-0 border-collapse text-sm"
          data-testid="usp-rows"
        >
          <caption className="sr-only">URL search parameters</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="py-2 pr-2">
                Key
              </th>
              <th scope="col" className="py-2 pr-2">
                Value
              </th>
              <th scope="col" className="py-2">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="py-2 pr-2 align-top">
                  <label className="block">
                    <span className="sr-only">Key for {row.key}</span>
                    <input
                      className="w-full min-w-0 rounded border border-slate-300 px-2 py-1"
                      data-testid={`usp-key-${row.key}`}
                      value={row.key}
                      readOnly
                    />
                  </label>
                </td>
                <td className="py-2 pr-2 align-top">
                  <label className="block">
                    <span className="sr-only">Value for {row.key}</span>
                    <input
                      className="w-full min-w-0 rounded border border-slate-300 px-2 py-1"
                      data-testid={`usp-value-${row.key}${row.repeated ? `-${row.value}` : ''}`}
                      value={row.value}
                      onChange={(event) => {
                        const next = event.target.value
                        if (row.repeated) {
                          const all = [
                            ...(params[row.key] as readonly string[]),
                          ]
                          const index = all.indexOf(row.value)
                          if (index >= 0) {
                            all[index] = next
                            set(row.key, all)
                          }
                        } else {
                          set(row.key, next)
                        }
                        setTick((n) => n + 1)
                      }}
                    />
                  </label>
                </td>
                <td className="py-2 align-top">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    data-testid={`usp-remove-${row.key}`}
                    aria-label={`Remove ${row.key}`}
                    onClick={() => {
                      if (row.repeated) {
                        remove(row.key, row.value)
                      } else {
                        remove(row.key)
                      }
                      setTick((n) => n + 1)
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <pre
          data-testid="usp-snapshot"
          className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-800"
        >
          {JSON.stringify(params, null, 2)}
          {/* tick forces URL display refresh after history nav */}
          <span className="sr-only">{tick}</span>
        </pre>
      </div>
    </Shell>
  )
}

function SimpleDemo({
  title,
  description,
  instruction,
  code,
  initialPath,
  mode = 'history',
  options,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  initialPath: string
  mode?: UseUrlSearchParamsMode
  options?: Omit<
    NonNullable<Parameters<typeof useUrlSearchParams>[1]>,
    'window'
  >
  children: (
    api: ReturnType<typeof useUrlSearchParams>,
    fixture: UrlWindowFixture,
  ) => ReactNode
}) {
  const fixture = useDemoWindow(initialPath)
  return (
    <SimpleDemoInner
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      mode={mode}
      options={options}
      fixture={fixture}
    >
      {children}
    </SimpleDemoInner>
  )
}

function SimpleDemoInner({
  title,
  description,
  instruction,
  code,
  mode,
  options,
  fixture,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  mode: UseUrlSearchParamsMode
  options?:
    | Omit<NonNullable<Parameters<typeof useUrlSearchParams>[1]>, 'window'>
    | undefined
  fixture: UrlWindowFixture
  children: (
    api: ReturnType<typeof useUrlSearchParams>,
    fixture: UrlWindowFixture,
  ) => ReactNode
}) {
  const api = useUrlSearchParams(mode, {
    ...options,
    window: fixture.window,
  })
  const href = `${fixture.window.location.pathname}${fixture.window.location.search}${fixture.window.location.hash}`

  return (
    <Shell
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      badge={api.isReady ? 'Ready' : 'Hydrating'}
      aside={
        <StatusPanel
          items={[
            { label: 'Ready', value: String(api.isReady), testId: 'usp-ready' },
            {
              label: 'Serialized',
              value: api.searchParams.toString() || '(empty)',
              testId: 'usp-serialized',
            },
            {
              label: 'Snapshot',
              value: JSON.stringify(api.params),
              testId: 'usp-snapshot',
            },
          ]}
        />
      }
    >
      <UrlDisplay href={href} />
      <div className="space-y-3">{children(api, fixture)}</div>
    </Shell>
  )
}

export function BasicHistoryExample() {
  return (
    <SimpleDemo
      title="Basic history mode"
      description="Read and write window.location.search while preserving pathname and hash."
      instruction="Set q, then clear all history-mode parameters."
      code={snippets.basicHistorySnippet}
      initialPath="/catalog#anchor"
    >
      {(api) => (
        <>
          <button
            type="button"
            data-testid="usp-set-q"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('q', 'hooks')}
          >
            Search
          </button>
          <button
            type="button"
            data-testid="usp-clear"
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => api.clear()}
          >
            Clear
          </button>
        </>
      )}
    </SimpleDemo>
  )
}

export function ProductFiltersExample() {
  return (
    <SimpleDemo
      title="Product filters"
      description="Drive a fictional category filter from history search parameters."
      instruction="Choose Keyboards, then clear the category."
      code={snippets.filtersSnippet}
      initialPath="/shop"
    >
      {(api) => (
        <label className="block text-sm">
          Category
          <select
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
            data-testid="usp-category"
            value={api.get('category') ?? ''}
            onChange={(event) => {
              const value = event.target.value
              if (value) api.set('category', value)
              else api.remove('category')
            }}
          >
            <option value="">Any</option>
            <option value="keyboards">Keyboards</option>
            <option value="mice">Mice</option>
          </select>
        </label>
      )}
    </SimpleDemo>
  )
}

export function SearchPaginationExample() {
  return (
    <SimpleDemo
      title="Search and pagination"
      description="Combine a query string with a page counter in history mode."
      instruction="Advance the page and confirm both query and page remain."
      code={snippets.searchPaginationSnippet}
      initialPath="/search?q=mechanical&page=1"
    >
      {(api) => {
        const page = Number(api.get('page') ?? '1')
        return (
          <button
            type="button"
            data-testid="usp-next-page"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('page', page + 1)}
          >
            Next page ({page})
          </button>
        )
      }}
    </SimpleDemo>
  )
}

export function RepeatedTagsExample() {
  return (
    <SimpleDemo
      title="Repeated tags"
      description="Repeated keys become frozen readonly string arrays in params."
      instruction="Add react, add typescript, then remove react."
      code={snippets.repeatedTagsSnippet}
      initialPath="/tags"
    >
      {(api) => (
        <>
          <button
            type="button"
            data-testid="usp-add-react"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.append('tag', 'react')}
          >
            Add react
          </button>
          <button
            type="button"
            data-testid="usp-add-ts"
            className="ml-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.append('tag', 'typescript')}
          >
            Add typescript
          </button>
          <button
            type="button"
            data-testid="usp-remove-react"
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => api.remove('tag', 'react')}
          >
            Remove react
          </button>
          <p data-testid="usp-tags">{api.getAll('tag').join(', ')}</p>
        </>
      )}
    </SimpleDemo>
  )
}

export function EmptyBareExample() {
  return (
    <SimpleDemo
      title="Empty and bare values"
      description="Empty strings and bare keys follow native URLSearchParams semantics."
      instruction="Set an empty flag value and inspect presence."
      code={snippets.emptyBareSnippet}
      initialPath="/flags"
    >
      {(api) => (
        <>
          <button
            type="button"
            data-testid="usp-empty-flag"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('flag', '')}
          >
            Empty value
          </button>
          <p data-testid="usp-flag-empty">
            {String(api.has('flag') && api.get('flag') === '')}
          </p>
        </>
      )}
    </SimpleDemo>
  )
}

export function PushVersusReplaceExample() {
  return (
    <SimpleDemo
      title="Push versus replace"
      description="writeMode chooses history.pushState or history.replaceState while preserving history.state."
      instruction="Toggle replace then push writes and watch the serialized query."
      code={snippets.pushReplaceSnippet}
      initialPath="/nav?mode=start"
      options={{ writeMode: 'replace' }}
    >
      {(api) => (
        <>
          <button
            type="button"
            data-testid="usp-replace"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('mode', 'replace')}
          >
            Replace write
          </button>
          <p className="text-sm text-slate-600">
            Switch writeMode via the playground story for push comparisons.
          </p>
        </>
      )}
    </SimpleDemo>
  )
}

export function BackForwardExample() {
  return (
    <SimpleDemo
      title="Demo previous parameter state"
      description="push writes create History entries. Because isolated iframe History.back() is unreliable in the Storybook runner, this demo uses an application-owned trail and setParams — not native browser Back/Forward. See the popstate unit tests for real navigation."
      instruction="Write step A, write step B, then press Demo previous."
      code={snippets.backForwardSnippet}
      initialPath="/steps"
      options={{ writeMode: 'push' }}
    >
      {(api) => <BackForwardControls api={api} />}
    </SimpleDemo>
  )
}

function BackForwardControls({
  api,
}: {
  api: ReturnType<typeof useUrlSearchParams>
}) {
  const trailRef = useRef<string[]>([])

  return (
    <>
      <button
        type="button"
        data-testid="usp-step-a"
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => {
          trailRef.current.push(api.searchParams.toString())
          api.set('step', 'a')
        }}
      >
        Step A
      </button>
      <button
        type="button"
        data-testid="usp-step-b"
        className="ml-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => {
          trailRef.current.push(api.searchParams.toString())
          api.set('step', 'b')
        }}
      >
        Step B
      </button>
      <button
        type="button"
        data-testid="usp-back"
        className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        onClick={() => {
          const previous = trailRef.current.pop()
          if (previous == null) {
            return
          }
          const next: Record<string, string> = {}
          new URLSearchParams(previous).forEach((value, key) => {
            next[key] = value
          })
          api.setParams(next)
        }}
      >
        Demo previous
      </button>
      <p data-testid="usp-step">{formatValue(api.params.step)}</p>
    </>
  )
}

export function ReadOnlyExample() {
  return (
    <SimpleDemo
      title="Read-only URL with write: false"
      description="Local React state updates without touching History."
      instruction="Set draft locally and confirm the iframe URL stays unchanged."
      code={snippets.readOnlySnippet}
      initialPath="/readonly?a=1"
      options={{ write: false }}
    >
      {(api, fixture) => (
        <>
          <button
            type="button"
            data-testid="usp-draft"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('draft', 'local')}
          >
            Local only
          </button>
          <p data-testid="usp-draft-value">{formatValue(api.params.draft)}</p>
          <p data-testid="usp-iframe-search">
            {fixture.window.location.search}
          </p>
        </>
      )}
    </SimpleDemo>
  )
}

export function DisabledEditingExample() {
  const fixture = useDemoWindow('/disabled?a=1')
  const [enabled, setEnabled] = useState(false)
  return (
    <DisabledInner
      fixture={fixture}
      enabled={enabled}
      setEnabled={setEnabled}
    />
  )
}

function DisabledInner({
  fixture,
  enabled,
  setEnabled,
}: {
  fixture: UrlWindowFixture
  enabled: boolean
  setEnabled: (value: boolean) => void
}) {
  const api = useUrlSearchParams('history', {
    window: fixture.window,
    enabled,
  })
  return (
    <Shell
      title="Disabled local editing"
      description="While enabled is false, controls edit local state only. Re-enabling rereads the URL."
      instruction="Edit while disabled, then enable observation."
      code={snippets.disabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'usp-enabled',
            },
            {
              label: 'Snapshot',
              value: JSON.stringify(api.params),
              testId: 'usp-snapshot',
            },
          ]}
        />
      }
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid="usp-enabled-toggle"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <button
        type="button"
        data-testid="usp-set-q"
        className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => api.set('q', 'local')}
      >
        Set q
      </button>
    </Shell>
  )
}

export function InitialResetExample() {
  return (
    <SimpleDemo
      title="Initial values and reset"
      description="initialValue fills keys absent from the URL. reset() restores the committed baseline."
      instruction="Change view to list, then Reset."
      code={snippets.initialResetSnippet}
      initialPath="/views"
      options={{ initialValue: { view: 'grid' } }}
    >
      {(api) => (
        <>
          <button
            type="button"
            data-testid="usp-list"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('view', 'list')}
          >
            List
          </button>
          <button
            type="button"
            data-testid="usp-reset"
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => api.reset()}
          >
            Reset
          </button>
          <p data-testid="usp-view">{formatValue(api.params.view)}</p>
        </>
      )}
    </SimpleDemo>
  )
}

export function RemoveNullishExample() {
  return (
    <SimpleDemo
      title="Remove nullish values"
      description="null and undefined remove keys when removeNullishValues is true."
      instruction="Clear q with null and confirm it disappears."
      code={snippets.nullishSnippet}
      initialPath="/nullish?q=keep"
      options={{ removeNullishValues: true }}
    >
      {(api) => (
        <button
          type="button"
          data-testid="usp-clear-q"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => api.set('q', null)}
        >
          Clear q ({formatValue(api.params.q) || 'gone'})
        </button>
      )}
    </SimpleDemo>
  )
}

export function RemoveFalsyExample() {
  return (
    <SimpleDemo
      title="Remove falsy values"
      description="removeFalsyValues drops '', 0, false, null, undefined (and NaN). String tokens like '0' remain."
      instruction="Set count to 0 and confirm the key is absent."
      code={snippets.falsySnippet}
      initialPath="/falsy?count=3"
      options={{ removeFalsyValues: true }}
    >
      {(api) => (
        <button
          type="button"
          data-testid="usp-set-zero"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => api.set('count', 0)}
        >
          Set 0 (present: {String(api.has('count'))})
        </button>
      )}
    </SimpleDemo>
  )
}

export function HashRouteExample() {
  return (
    <SimpleDemo
      title="Hash route mode"
      description="Hash mode owns only the query after the first literal ? inside the hash route."
      instruction="Set tab and confirm the hash route prefix remains."
      code={snippets.hashRouteSnippet}
      initialPath="/app?keep=1#/products/list?tab=overview"
      mode="hash"
    >
      {(api, fixture) => (
        <>
          <button
            type="button"
            data-testid="usp-set-tab"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('tab', 'details')}
          >
            Tab details
          </button>
          <p data-testid="usp-hash">{fixture.window.location.hash}</p>
          <p data-testid="usp-search">{fixture.window.location.search}</p>
        </>
      )}
    </SimpleDemo>
  )
}

export function HashParamsExample() {
  return (
    <SimpleDemo
      title="Hash parameters mode"
      description="hash-params treats the entire hash body as the parameter string."
      instruction="Set focus and confirm normal search is preserved."
      code={snippets.hashParamsSnippet}
      initialPath="/products?view=grid#focus=summary"
      mode="hash-params"
    >
      {(api, fixture) => (
        <>
          <button
            type="button"
            data-testid="usp-set-focus"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('focus', 'reviews')}
          >
            Focus reviews
          </button>
          <p data-testid="usp-hash">{fixture.window.location.hash}</p>
          <p data-testid="usp-search">{fixture.window.location.search}</p>
        </>
      )}
    </SimpleDemo>
  )
}

export function CustomStringifyExample() {
  return (
    <SimpleDemo
      title="Custom stringifier"
      description="stringify controls textual History output. Canonical state still comes from URLSearchParams entries."
      instruction="Write Q=Hello and inspect the serialized form."
      code={snippets.customStringifySnippet}
      initialPath="/custom"
      options={{
        stringify: (params) => params.toString().toLowerCase(),
      }}
    >
      {(api) => (
        <button
          type="button"
          data-testid="usp-custom-write"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => api.set('Q', 'Hello')}
        >
          Write
        </button>
      )}
    </SimpleDemo>
  )
}

export function MultiSyncExample() {
  const fixture = useDemoWindow('/sync')
  return <MultiSyncInner fixture={fixture} />
}

function MultiSyncInner({ fixture }: { fixture: UrlWindowFixture }) {
  const a = useUrlSearchParams('history', { window: fixture.window })
  const b = useUrlSearchParams('history', { window: fixture.window })
  return (
    <Shell
      title="Multiple synchronized components"
      description="Same-window, same-mode instances share writes through a private registry without synthetic popstate."
      instruction="Write from A and confirm B updates."
      code={snippets.multiSyncSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'A',
              value: JSON.stringify(a.params),
              testId: 'usp-a',
            },
            {
              label: 'B',
              value: JSON.stringify(b.params),
              testId: 'usp-b',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        data-testid="usp-write-a"
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => a.set('shared', 'from-a')}
      >
        A writes
      </button>
      <p data-testid="usp-b-value">{formatValue(b.params.shared)}</p>
    </Shell>
  )
}

export function DynamicModeExample() {
  const fixture = useDemoWindow('/dyn?x=1#/r?y=2')
  const [mode, setMode] = useState<UseUrlSearchParamsMode>('history')
  return <DynamicModeInner fixture={fixture} mode={mode} setMode={setMode} />
}

function DynamicModeInner({
  fixture,
  mode,
  setMode,
}: {
  fixture: UrlWindowFixture
  mode: UseUrlSearchParamsMode
  setMode: (mode: UseUrlSearchParamsMode) => void
}) {
  const api = useUrlSearchParams(mode, { window: fixture.window })
  return (
    <Shell
      title="Dynamic mode"
      description="Changing mode rereads the new URL component without migrating or deleting the previous component."
      instruction="Switch to hash mode, then set x."
      code={snippets.dynamicModeSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Mode', value: mode, testId: 'usp-mode' },
            {
              label: 'Snapshot',
              value: JSON.stringify(api.params),
              testId: 'usp-snapshot',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        data-testid="usp-mode-hash"
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => setMode('hash')}
      >
        Hash mode
      </button>
      <button
        type="button"
        data-testid="usp-set-x"
        className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        onClick={() => api.set('x', '1')}
      >
        Set x
      </button>
    </Shell>
  )
}

export function CustomIframeWindowExample() {
  return (
    <SimpleDemo
      title="Custom iframe window"
      description="Pass options.window to bind an isolated same-origin History stack."
      instruction="Write isolated=yes and confirm only the iframe URL changes."
      code={snippets.iframeWindowSnippet}
      initialPath="/isolated"
    >
      {(api) => (
        <button
          type="button"
          data-testid="usp-isolated"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => api.set('isolated', 'yes')}
        >
          Isolated ({formatValue(api.params.isolated)})
        </button>
      )}
    </SimpleDemo>
  )
}

export function PlaygroundExample() {
  return (
    <SimpleDemo
      title="Playground"
      description="Docs-safe controls for set, clear, and refresh against an isolated iframe."
      instruction="Set demo, clear, then refresh."
      code={snippets.playgroundSnippet}
      initialPath="/playground"
    >
      {(api) => (
        <>
          <button
            type="button"
            data-testid="usp-set-demo"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => api.set('demo', '1')}
          >
            Set
          </button>
          <button
            type="button"
            data-testid="usp-clear"
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => api.clear()}
          >
            Clear
          </button>
          <button
            type="button"
            data-testid="usp-refresh"
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onClick={() => api.refresh()}
          >
            Refresh
          </button>
        </>
      )}
    </SimpleDemo>
  )
}
