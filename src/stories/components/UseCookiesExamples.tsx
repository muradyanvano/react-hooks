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
import { useCookies, type UseCookiesChange } from '@muradyanvano/react-hooks'

import {
  createBlockedCookieDocument,
  createCookieStoreMock,
} from './cookieDocumentMock'
import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  allCookiesSnippet,
  automaticDependenciesSnippet,
  basicCookieSnippet,
  changeListenersSnippet,
  consentPreferenceSnippet,
  cookieAttributesSnippet,
  cookieStoreEventsSnippet,
  cookieUnavailableSnippet,
  customDocumentSnippet,
  dependenciesSnippet,
  doNotParseSnippet,
  externalChangeSnippet,
  jsonParseErrorSnippet,
  jsonPreferencesSnippet,
  localePreferencesSnippet,
  playgroundSnippet,
  pollingFallbackSnippet,
  removalPathSnippet,
  ssrInitialCookiesSnippet,
  themePreferenceSnippet,
  twoComponentsSnippet,
} from './useCookies.snippets'

export const COOKIE_PREFIX = 'rh_uc_'
export const COOKIE_PATH = '/'
export const SCOPED_COOKIE_PATH = '/demo-path'

export function cookieKey(name: string): string {
  return `${COOKIE_PREFIX}${name}`
}

export const KEYS = {
  locale: cookieKey('locale'),
  currency: cookieKey('currency'),
  region: cookieKey('region'),
  basic: cookieKey('basic'),
  json: cookieKey('json'),
  rawParsed: cookieKey('raw_parsed'),
  theme: cookieKey('theme'),
  consent: cookieKey('consent'),
  depA: cookieKey('dep_a'),
  depB: cookieKey('dep_b'),
  unrelated: cookieKey('unrelated'),
  auto: cookieKey('auto'),
  twoComponents: cookieKey('sync'),
  external: cookieKey('external'),
  polling: cookieKey('polling'),
  pathScoped: cookieKey('path_scoped'),
  malformed: cookieKey('malformed'),
  playground: cookieKey('playground'),
  iframe: cookieKey('iframe'),
  listener: cookieKey('listener'),
  attributes: cookieKey('attributes'),
} as const

const LOCALE_DEPS = [KEYS.locale, KEYS.currency, KEYS.region] as const
const BASIC_DEPS = [KEYS.basic] as const
const JSON_DEPS = [KEYS.json] as const
const RAW_PARSED_DEPS = [KEYS.rawParsed] as const
const THEME_DEPS = [KEYS.theme] as const
const CONSENT_DEPS = [KEYS.consent] as const
const DEP_A_DEPS = [KEYS.depA] as const
const DEP_B_DEPS = [KEYS.depB] as const
const AUTO_DEPS = [KEYS.auto] as const
const UNRELATED_DEPS = [KEYS.unrelated] as const
const SYNC_DEPS = [KEYS.twoComponents] as const
const EXTERNAL_DEPS = [KEYS.external] as const
const POLLING_DEPS = [KEYS.polling] as const
const PATH_SCOPED_DEPS = [KEYS.pathScoped] as const
const MALFORMED_DEPS = [KEYS.malformed] as const
const PLAYGROUND_DEPS = [KEYS.playground] as const
const IFRAME_DEPS = [KEYS.iframe] as const
const LISTENER_DEPS = [KEYS.listener] as const
const ATTRIBUTES_DEPS = [KEYS.attributes] as const

export const PLAYGROUND_DEFAULT_DEPS = PLAYGROUND_DEPS

export const ALL_STORY_COOKIE_NAMES = [
  ...Object.values(KEYS),
  cookieKey('inspector_a'),
  cookieKey('inspector_b'),
] as const

export function setRawCookie(
  name: string,
  value: string,
  path: string = COOKIE_PATH,
): void {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}`
}

export function removeRawCookie(
  name: string,
  path: string = COOKIE_PATH,
): void {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
}

export function clearAllStoryCookies(): void {
  for (const name of ALL_STORY_COOKIE_NAMES) {
    removeRawCookie(name)
    removeRawCookie(name, SCOPED_COOKIE_PATH)
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
  'min-w-0 max-w-full break-all whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-xs text-emerald-300'

function CookieBadge({ name }: { name: string }): ReactElement {
  return (
    <span
      className="inline-flex max-w-full truncate rounded-full bg-indigo-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200"
      title={name}
    >
      {name}
    </span>
  )
}

function SavedInCookiesBadge(): ReactElement {
  return (
    <span
      data-testid="saved-badge"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"
    >
      Saved in cookies
    </span>
  )
}

function useDocumentCookiePreview(refreshToken: unknown): string {
  const [raw, setRaw] = useState('(empty)')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      setRaw(document.cookie.length > 0 ? document.cookie : '(empty)')
    })
    return () => {
      cancelled = true
    }
  }, [refreshToken])

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

function regionFromLocale(locale: string): string {
  if (locale === 'hy-AM') {
    return 'AM'
  }
  if (locale === 'fr-FR') {
    return 'FR'
  }
  return 'US'
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

export function LocalePreferencesExample(): ReactElement {
  const cookies = useCookies(LOCALE_DEPS)
  const locale = cookies.get<string>(KEYS.locale) ?? 'en-US'
  const currency = cookies.get<string>(KEYS.currency) ?? 'USD'
  const region = cookies.get<string>(KEYS.region) ?? regionFromLocale(locale)
  const all = cookies.getAll<Record<string, unknown>>()
  const rawPreview = useDocumentCookiePreview(
    `${locale}-${currency}-${region}-${cookies.isReady}`,
  )
  const entries = Object.entries(all).filter(([name]) =>
    name.startsWith(COOKIE_PREFIX),
  )

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Locale preferences"
      description="Persist locale, currency, and region in first-party cookies with explicit path scoping. Inspect parsed values, a live cookie table, and the raw document.cookie string."
      instruction="Switch language or currency, confirm the region summary and cookie table update, then reset or remove a cookie."
      code={localePreferencesSnippet}
      badge="Primary"
      aside={
        <div className="space-y-3">
          <StatusPanel
            items={[
              {
                label: 'isReady',
                value: String(cookies.isReady),
                testId: 'uc-ready',
              },
              {
                label: 'isSupported',
                value: String(cookies.isSupported),
                testId: 'uc-supported',
              },
              {
                label: 'error',
                value: cookies.error?.message ?? 'none',
                testId: 'uc-error',
              },
              {
                label: 'locale',
                value: locale,
                testId: 'locale-value',
              },
              {
                label: 'currency',
                value: currency,
                testId: 'currency-value',
              },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {cookies.isReady && cookies.isSupported && cookies.error == null ? (
              <SavedInCookiesBadge />
            ) : null}
            <CookieBadge name={KEYS.locale} />
          </div>
        </div>
      }
    >
      <div className={`${panelClass} grid gap-4 lg:grid-cols-2`}>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Language
          <select
            className={selectClass}
            data-testid="locale-select"
            value={locale}
            disabled={!cookies.isReady}
            onChange={(event) => {
              const nextLocale = event.target.value
              cookies.set(KEYS.locale, nextLocale, { path: COOKIE_PATH })
              cookies.set(KEYS.region, regionFromLocale(nextLocale), {
                path: COOKIE_PATH,
              })
            }}
          >
            <option value="en-US">English (US)</option>
            <option value="hy-AM">Armenian (hy-AM)</option>
            <option value="fr-FR">French (fr-FR)</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Currency
          <select
            className={selectClass}
            data-testid="currency-select"
            value={currency}
            disabled={!cookies.isReady}
            onChange={(event) => {
              cookies.set(KEYS.currency, event.target.value, {
                path: COOKIE_PATH,
              })
            }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="AMD">AMD</option>
          </select>
        </label>
      </div>
      <p
        className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
        data-testid="region-summary"
      >
        Region summary:{' '}
        <span className="font-semibold">
          {region} · {locale} · {currency}
        </span>
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table
          className="min-w-full text-left text-sm"
          data-testid="cookie-table"
        >
          <thead className="bg-slate-100 text-xs tracking-wide text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Parsed value</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="px-3 py-2 text-slate-500" colSpan={2}>
                  No story cookies yet
                </td>
              </tr>
            ) : (
              entries.map(([name, value]) => (
                <tr key={name} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-mono text-xs">{name}</td>
                  <td className="px-3 py-2">{JSON.stringify(value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Raw document.cookie
        </p>
        <pre className={codePreviewClass} data-testid="raw-cookie-preview">
          {rawPreview}
        </pre>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="locale-reset"
          onClick={() => {
            cookies.set(KEYS.locale, 'en-US', { path: COOKIE_PATH })
            cookies.set(KEYS.currency, 'USD', { path: COOKIE_PATH })
            cookies.set(KEYS.region, 'US', { path: COOKIE_PATH })
          }}
        >
          Reset defaults
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="locale-remove"
          onClick={() => {
            cookies.remove(KEYS.locale, { path: COOKIE_PATH })
          }}
        >
          Remove locale
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function BasicCookieExample(): ReactElement {
  const cookies = useCookies(BASIC_DEPS)
  const value = cookies.get<string>(KEYS.basic) ?? ''

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Basic cookie"
      description="Read, write, and delete a single string cookie with get, set, and remove."
      instruction="Type a nickname, confirm get reflects it, then remove the cookie."
      code={basicCookieSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'basic-ready',
            },
            {
              label: 'value',
              value: value.length > 0 ? value : '(empty)',
              testId: 'basic-value',
            },
          ]}
        />
      }
    >
      <label className="block space-y-1 text-sm font-medium text-slate-700">
        Nickname
        <input
          className={inputClass}
          data-testid="basic-input"
          value={value}
          disabled={!cookies.isReady}
          onChange={(event) => {
            cookies.set(KEYS.basic, event.target.value, { path: COOKIE_PATH })
          }}
        />
      </label>
      <button
        type="button"
        className={`${dangerButtonClass} mt-3`}
        data-testid="basic-remove"
        onClick={() => {
          cookies.remove(KEYS.basic, { path: COOKIE_PATH })
        }}
      >
        Remove cookie
      </button>
    </ExampleShowcase>
  )
}

export function AllCookiesExample(): ReactElement {
  const cookies = useCookies()
  const all = cookies.getAll<Record<string, unknown>>()
  const storyEntries = Object.entries(all).filter(([name]) =>
    name.startsWith(COOKIE_PREFIX),
  )

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="All cookies"
      description="getAll returns every visible cookie parsed according to doNotParse defaults."
      instruction="Seed a couple of cookies and inspect the live table from getAll()."
      code={allCookiesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'all-ready',
            },
            {
              label: 'count',
              value: String(storyEntries.length),
              testId: 'all-count',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="all-seed-a"
          onClick={() => {
            cookies.set(cookieKey('inspector_a'), 'alpha', {
              path: COOKIE_PATH,
            })
          }}
        >
          Set inspector A
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="all-seed-b"
          onClick={() => {
            cookies.set(cookieKey('inspector_b'), '42', { path: COOKIE_PATH })
          }}
        >
          Set inspector B
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm" data-testid="all-table">
          <thead className="bg-slate-100 text-xs tracking-wide text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {storyEntries.map(([name, value]) => (
              <tr key={name} className="border-t border-slate-200">
                <td className="px-3 py-2 font-mono text-xs">{name}</td>
                <td className="px-3 py-2" data-testid={`all-row-${name}`}>
                  {JSON.stringify(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ExampleShowcase>
  )
}

type JsonPrefs = { theme: string; notifications: boolean }

export function JsonPreferencesExample(): ReactElement {
  const cookies = useCookies(JSON_DEPS)
  const parsed = cookies.get<JsonPrefs>(KEYS.json) ?? {
    theme: 'light',
    notifications: true,
  }
  const raw = cookies.get<string>(KEYS.json, { doNotParse: true })

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="JSON preferences"
      description="Objects serialize with JSON.stringify on write and JSON.parse on read when parsing succeeds."
      instruction="Toggle notifications and compare parsed fields with the raw stored string."
      code={jsonPreferencesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'json-ready',
            },
            {
              label: 'notifications',
              value: String(parsed.notifications),
              testId: 'json-notifications',
            },
            {
              label: 'raw',
              value: raw ?? '(missing)',
              testId: 'json-raw',
            },
          ]}
        />
      }
    >
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          data-testid="json-checkbox"
          checked={parsed.notifications}
          disabled={!cookies.isReady}
          onChange={(event) => {
            cookies.set(
              KEYS.json,
              { ...parsed, notifications: event.target.checked },
              { path: COOKIE_PATH },
            )
          }}
        />
        Email notifications
      </label>
    </ExampleShowcase>
  )
}

function ParsedPanel(): ReactElement {
  const cookies = useCookies(RAW_PARSED_DEPS)
  const value = cookies.get(KEYS.rawParsed)
  return (
    <div className={panelClass} data-testid="parse-default-panel">
      <p className="text-sm font-semibold text-slate-900">Default parse</p>
      <p
        className="mt-2 font-mono text-sm text-slate-800"
        data-testid="parse-default-value"
      >
        {String(value)} ({typeof value})
      </p>
    </div>
  )
}

function RawPanel(): ReactElement {
  const cookies = useCookies(RAW_PARSED_DEPS, { doNotParse: true })
  const value = cookies.get<string>(KEYS.rawParsed)
  return (
    <div className={panelClass} data-testid="parse-raw-panel">
      <p className="text-sm font-semibold text-slate-900">doNotParse: true</p>
      <p
        className="mt-2 font-mono text-sm text-slate-800"
        data-testid="parse-raw-value"
      >
        {String(value)} ({typeof value})
      </p>
    </div>
  )
}

export function DoNotParseExample(): ReactElement {
  const writer = useCookies(RAW_PARSED_DEPS)

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="doNotParse"
      description='Without doNotParse, "true" and "42" become boolean and number when JSON.parse succeeds. Raw mode keeps the original strings.'
      instruction='Click "Write literals" and compare parsed types across both panels.'
      code={doNotParseSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(writer.isReady),
              testId: 'raw-ready',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="raw-write"
        onClick={() => {
          writer.set(KEYS.rawParsed, 'true', { path: COOKIE_PATH })
        }}
      >
        Write literal &quot;true&quot;
      </button>
      <button
        type="button"
        className={`${secondaryButtonClass} ml-2`}
        data-testid="raw-write-number"
        onClick={() => {
          writer.set(KEYS.rawParsed, '42', { path: COOKIE_PATH })
        }}
      >
        Write literal &quot;42&quot;
      </button>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ParsedPanel />
        <RawPanel />
      </div>
    </ExampleShowcase>
  )
}

export function CookieAttributesExample(): ReactElement {
  const cookies = useCookies(ATTRIBUTES_DEPS)
  const value = cookies.get<string>(KEYS.attributes)
  const raw = useDocumentCookiePreview(value)

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Cookie attributes"
      description="set accepts path, expires, maxAge, secure, sameSite, and partitioned. Browsers may ignore Secure on http://, reject SameSite=None without Secure, or skip Partitioned outside CHIPS contexts."
      instruction="Apply attribute presets and inspect the raw assignment fragment in document.cookie."
      code={cookieAttributesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'attr-ready',
            },
            {
              label: 'value',
              value: value ?? '(missing)',
              testId: 'attr-value',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="attr-set-session"
          onClick={() => {
            cookies.set(KEYS.attributes, 'session-token', {
              path: COOKIE_PATH,
              maxAge: 3600,
              sameSite: 'lax',
            })
          }}
        >
          Session (maxAge + lax)
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="attr-set-secure"
          onClick={() => {
            cookies.set(KEYS.attributes, 'secure-token', {
              path: COOKIE_PATH,
              secure: true,
              sameSite: 'none',
            })
          }}
        >
          Secure + SameSite=None
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="attr-set-partitioned"
          onClick={() => {
            cookies.set(KEYS.attributes, 'partitioned-token', {
              path: COOKIE_PATH,
              partitioned: true,
              secure: true,
              sameSite: 'none',
            })
          }}
        >
          Partitioned (CHIPS)
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Secure cookies require HTTPS. Partitioned is best-effort — unsupported
        browsers ignore it without failing the write.
      </p>
      <pre className={`${codePreviewClass} mt-3`} data-testid="attr-raw">
        {raw}
      </pre>
    </ExampleShowcase>
  )
}

export function ThemePreferenceExample(): ReactElement {
  const cookies = useCookies(THEME_DEPS)
  const theme = cookies.get<'light' | 'dark' | 'system'>(KEYS.theme) ?? 'system'

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Theme preference"
      description="Store an app theme preference in a cookie without forcing the Storybook manager theme."
      instruction="Pick light, dark, or system — only the demo card reflects your choice."
      code={themePreferenceSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'theme-ready',
            },
            { label: 'theme', value: theme, testId: 'theme-value' },
          ]}
        />
      }
    >
      <fieldset className={`${panelClass} space-y-2`}>
        <legend className="px-1 text-sm font-semibold text-slate-900">
          App theme (demo card only)
        </legend>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="theme-pref"
            data-testid="theme-light"
            checked={theme === 'light'}
            onChange={() => {
              cookies.set(KEYS.theme, 'light', { path: COOKIE_PATH })
            }}
          />
          Light
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="theme-pref"
            data-testid="theme-dark"
            checked={theme === 'dark'}
            onChange={() => {
              cookies.set(KEYS.theme, 'dark', { path: COOKIE_PATH })
            }}
          />
          Dark
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name="theme-pref"
            data-testid="theme-system"
            checked={theme === 'system'}
            onChange={() => {
              cookies.set(KEYS.theme, 'system', { path: COOKIE_PATH })
            }}
          />
          System
        </label>
      </fieldset>
      <div
        className={`mt-4 rounded-xl border px-4 py-6 text-center text-sm font-medium ${
          theme === 'dark'
            ? 'border-slate-700 bg-slate-900 text-slate-100'
            : theme === 'light'
              ? 'border-slate-200 bg-white text-slate-900'
              : 'border-slate-300 bg-gradient-to-br from-white to-slate-100 text-slate-800'
        }`}
        data-testid="theme-preview-card"
      >
        Demo surface ({theme})
      </div>
    </ExampleShowcase>
  )
}

type Consent = {
  analytics: boolean
  functional: boolean
  marketing: boolean
}

export function ConsentPreferenceExample(): ReactElement {
  const cookies = useCookies(CONSENT_DEPS)
  const consent = cookies.get<Consent>(KEYS.consent) ?? {
    analytics: false,
    functional: true,
    marketing: false,
  }

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Consent preference"
      description="Demonstrate functional consent categories stored in a cookie. This is not a legal consent management platform."
      instruction="Toggle categories and confirm the JSON cookie updates."
      code={consentPreferenceSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'consent-ready',
            },
            {
              label: 'functional',
              value: String(consent.functional),
              testId: 'consent-functional',
            },
          ]}
        />
      }
    >
      <p
        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        data-testid="consent-disclaimer"
      >
        Demo only — not a legal CMP. Do not use this UI for production
        compliance.
      </p>
      <fieldset className={`${panelClass} mt-3 space-y-2`}>
        <legend className="px-1 text-sm font-semibold text-slate-900">
          Categories
        </legend>
        {(
          [
            ['analytics', 'Analytics'],
            ['functional', 'Functional'],
            ['marketing', 'Marketing'],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm text-slate-800"
          >
            <input
              type="checkbox"
              data-testid={`consent-${key}`}
              checked={consent[key]}
              onChange={(event) => {
                cookies.set(
                  KEYS.consent,
                  { ...consent, [key]: event.target.checked },
                  { path: COOKIE_PATH },
                )
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </ExampleShowcase>
  )
}

const dependencyRenderCounts = {
  watched: 0,
  auto: 0,
}

function WatchedDependencyPanel(): ReactElement {
  const cookies = useCookies(DEP_A_DEPS)
  // Demo-only render instrumentation for dependency filtering play tests.
  /* eslint-disable react-hooks/immutability -- intentional Storybook counter */
  dependencyRenderCounts.watched += 1
  /* eslint-enable react-hooks/immutability */
  const value = cookies.get<string>(KEYS.depA) ?? 'none'

  return (
    <div className={panelClass} data-testid="dep-watched-panel">
      <p className="text-sm font-semibold text-slate-900">
        Watches {KEYS.depA}
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Value:{' '}
        <span className="font-mono font-semibold" data-testid="dep-a-value">
          {value}
        </span>
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Render count:{' '}
        <span data-testid="dep-render-count">
          {dependencyRenderCounts.watched}
        </span>
      </p>
    </div>
  )
}

function UnrelatedCookieControl(): ReactElement {
  const cookies = useCookies(DEP_B_DEPS)

  return (
    <button
      type="button"
      className={secondaryButtonClass}
      data-testid="dep-set-b"
      onClick={() => {
        cookies.set(KEYS.depB, 'unrelated', { path: COOKIE_PATH })
      }}
    >
      Update unrelated cookie B
    </button>
  )
}

function WatchedCookieControl(): ReactElement {
  const cookies = useCookies(DEP_A_DEPS)

  return (
    <button
      type="button"
      className={buttonClass}
      data-testid="dep-set-a"
      onClick={() => {
        cookies.set(KEYS.depA, 'watched-update', { path: COOKIE_PATH })
      }}
    >
      Update watched cookie A
    </button>
  )
}

export function DependenciesExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Dependencies"
      description="Pass a dependency list so unrelated cookie writes do not rerender focused consumers."
      instruction="Update the unrelated cookie and confirm the watched panel render count stays flat."
      code={dependenciesSnippet}
    >
      <WatchedDependencyPanel />
      <div className="mt-3 flex flex-wrap gap-2">
        <UnrelatedCookieControl />
        <WatchedCookieControl />
      </div>
    </ExampleShowcase>
  )
}

function AutoTrackedPanel(): ReactElement {
  const cookies = useCookies([], { autoUpdateDependencies: true })
  /* eslint-disable react-hooks/immutability -- intentional Storybook counter */
  dependencyRenderCounts.auto += 1
  /* eslint-enable react-hooks/immutability */
  const value = cookies.get<string>(KEYS.auto)

  return (
    <div className={panelClass} data-testid="auto-panel">
      <p className="text-sm font-semibold text-slate-900">
        autoUpdateDependencies
      </p>
      <p className="mt-2 font-mono text-sm" data-testid="auto-value">
        {value ?? '(unset)'}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Render count:{' '}
        <span data-testid="auto-render-count">
          {dependencyRenderCounts.auto}
        </span>
      </p>
    </div>
  )
}

function AutoTrackedControl(): ReactElement {
  const cookies = useCookies(AUTO_DEPS)

  return (
    <button
      type="button"
      className={buttonClass}
      data-testid="auto-set"
      onClick={() => {
        cookies.set(KEYS.auto, 'tracked', { path: COOKIE_PATH })
      }}
    >
      Set auto-tracked cookie
    </button>
  )
}

function UnrelatedAutoControl(): ReactElement {
  const cookies = useCookies(UNRELATED_DEPS)

  return (
    <button
      type="button"
      className={secondaryButtonClass}
      data-testid="auto-set-unrelated"
      onClick={() => {
        cookies.set(KEYS.unrelated, 'noise', { path: COOKIE_PATH })
      }}
    >
      Set unrelated cookie
    </button>
  )
}

export function AutomaticDependenciesExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Automatic dependencies"
      description="With autoUpdateDependencies, names passed to get() join the reactive watch list automatically."
      instruction="Set the auto-tracked cookie vs an unrelated cookie and compare render counts."
      code={automaticDependenciesSnippet}
    >
      <AutoTrackedPanel />
      <div className="mt-3 flex flex-wrap gap-2">
        <AutoTrackedControl />
        <UnrelatedAutoControl />
      </div>
    </ExampleShowcase>
  )
}

function SyncEditor({ testId }: { testId: string }): ReactElement {
  const cookies = useCookies(SYNC_DEPS)
  const value = cookies.get<string>(KEYS.twoComponents) ?? ''

  return (
    <textarea
      className={`${inputClass} min-h-24`}
      data-testid={testId}
      aria-label="Shared cookie editor"
      value={value}
      onChange={(event) => {
        cookies.set(KEYS.twoComponents, event.target.value, {
          path: COOKIE_PATH,
        })
      }}
    />
  )
}

function SyncMirror({ testId }: { testId: string }): ReactElement {
  const cookies = useCookies(SYNC_DEPS)
  const value = cookies.get<string>(KEYS.twoComponents) ?? ''

  return (
    <output
      className="block min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
      data-testid={testId}
    >
      {value}
    </output>
  )
}

export function TwoComponentsExample(): ReactElement {
  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Two components"
      description="Multiple hook instances on the same document stay synchronized through the shared cookie registry."
      instruction="Type in editor A and watch mirror B update instantly."
      code={twoComponentsSnippet}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
            Editor A
          </p>
          <SyncEditor testId="sync-editor-a" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase">
            Mirror B
          </p>
          <SyncMirror testId="sync-editor-b" />
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ExternalChangeExample(): ReactElement {
  const cookies = useCookies(EXTERNAL_DEPS, { watch: false })
  const value = cookies.get<string>(KEYS.external) ?? 'none'

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="External change"
      description="Imperative document.cookie writes bypass the hook until refresh() pulls a new snapshot."
      instruction="Simulate an external write, then refresh to sync the hook state."
      code={externalChangeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'external-ready',
            },
            { label: 'value', value, testId: 'external-value' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="external-simulate"
          onClick={() => {
            setRawCookie(KEYS.external, 'from-script', COOKIE_PATH)
          }}
        >
          External write
        </button>
        <button
          type="button"
          className={buttonClass}
          data-testid="external-refresh"
          onClick={() => {
            cookies.refresh()
          }}
        >
          refresh()
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function PollingFallbackExample(): ReactElement {
  const [controller] = useState(() => {
    const next = createCookieStoreMock()
    next.install()
    next.hideCookieStore()
    return next
  })

  useEffect(() => {
    if (!controller.isInstalled()) {
      controller.install()
      controller.hideCookieStore()
    }
    return () => {
      controller.restoreCookieStore()
      controller.uninstall()
    }
  }, [controller])

  const cookies = useCookies(POLLING_DEPS, {
    pollingInterval: 150,
    watch: true,
  })
  const value = cookies.get<string>(KEYS.polling) ?? 'waiting…'

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Polling fallback"
      description="When Cookie Store events are unavailable, a shared poller reads document.cookie at pollingInterval."
      instruction="Hide cookieStore, write externally, and wait for the poller to catch up."
      code={pollingFallbackSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'observer',
              value: 'polling fallback active',
              testId: 'polling-observer',
            },
            { label: 'value', value, testId: 'polling-value' },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="polling-external-write"
        onClick={() => {
          setRawCookie(KEYS.polling, 'polled-value', COOKIE_PATH)
        }}
      >
        External write (no refresh)
      </button>
    </ExampleShowcase>
  )
}

export function CookieStoreEventsExample(): ReactElement {
  const [controller] = useState(() => createCookieStoreMock())

  useEffect(() => {
    controller.install()
    return () => {
      controller.uninstall()
    }
  }, [controller])

  const cookies = useCookies(LISTENER_DEPS)
  const value = cookies.get<string>(KEYS.listener) ?? '(unset)'

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Cookie Store events"
      description="When window.cookieStore is available, change events trigger a snapshot refresh without polling."
      instruction="Set via the hook or dispatch a mock Cookie Store change after an external write."
      code={cookieStoreEventsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'store-ready',
            },
            { label: 'value', value, testId: 'store-value' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="store-set"
          onClick={() => {
            cookies.set(KEYS.listener, 'via-hook', { path: COOKIE_PATH })
          }}
        >
          Set via hook
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="store-external"
          onClick={() => {
            setRawCookie(KEYS.listener, 'via-external', COOKIE_PATH)
            controller.dispatchChange({ changed: [{ name: KEYS.listener }] })
          }}
        >
          External + store event
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function RemovalPathExample(): ReactElement {
  const cookies = useCookies(PATH_SCOPED_DEPS)
  const present = cookies.get<string>(KEYS.pathScoped) != null

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Removal path"
      description="Browsers require the same path (and often domain) when deleting a cookie. A mismatched path leaves the cookie visible."
      instruction="Set a cookie at path /, try removing with a mismatched path, then remove with the matching path."
      code={removalPathSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'path-ready',
            },
            {
              label: 'present',
              value: String(present),
              testId: 'path-present',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="path-set"
          onClick={() => {
            cookies.set(KEYS.pathScoped, 'scoped', { path: COOKIE_PATH })
          }}
        >
          Set with {COOKIE_PATH}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="path-remove-wrong"
          onClick={() => {
            cookies.remove(KEYS.pathScoped, { path: SCOPED_COOKIE_PATH })
          }}
        >
          Remove with {SCOPED_COOKIE_PATH}
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="path-remove-match"
          onClick={() => {
            cookies.remove(KEYS.pathScoped, { path: COOKIE_PATH })
          }}
        >
          Remove with {COOKIE_PATH}
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function JsonParseErrorRecoveryExample(): ReactElement {
  const cookies = useCookies(MALFORMED_DEPS)

  const saveInvalid = () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    cookies.set(KEYS.malformed, circular, { path: COOKIE_PATH })
  }

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="JSON parse error recovery"
      description="Values that cannot be serialized surface a readable error via error and onError. Repair writes a valid payload."
      instruction="Attempt to save a circular object, read the alert, then Repair."
      code={jsonParseErrorSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'malformed-ready',
            },
            {
              label: 'error',
              value: cookies.error?.message ?? 'none',
              testId: 'malformed-error',
            },
          ]}
        />
      }
    >
      {cookies.error != null ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          data-testid="malformed-alert"
        >
          {cookies.error.message}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="malformed-save-invalid"
          onClick={saveInvalid}
        >
          Save invalid value
        </button>
        <button
          type="button"
          className={buttonClass}
          data-testid="malformed-repair"
          onClick={() => {
            cookies.set(KEYS.malformed, { ok: true }, { path: COOKIE_PATH })
          }}
        >
          Repair
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function CookieUnavailableExample(): ReactElement {
  const blockedDocument = useMemo(() => createBlockedCookieDocument(), [])
  const cookies = useCookies(BASIC_DEPS, { document: blockedDocument })
  const [draft, setDraft] = useState('local only')

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Cookie unavailable"
      description="When document.cookie throws or is blocked, isSupported is false and errors are reported while React state can still update optimistically."
      instruction="Try to set a cookie in the restricted document context."
      code={cookieUnavailableSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'blocked-ready',
            },
            {
              label: 'isSupported',
              value: String(cookies.isSupported),
              testId: 'blocked-supported',
            },
            {
              label: 'error',
              value: cookies.error?.message ?? 'none',
              testId: 'blocked-error',
            },
          ]}
        />
      }
    >
      <div
        role="alert"
        className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        data-testid="blocked-warning"
      >
        Cookies are unavailable in this restricted document mock.
      </div>
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Draft (local only)
        <input
          className={inputClass}
          data-testid="blocked-input"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            cookies.set(KEYS.basic, event.target.value)
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

export function SsrInitialCookiesExample(): ReactElement {
  const cookies = useCookies(null, {
    initialCookies: `${KEYS.locale}=hy-AM; ${KEYS.currency}=AMD`,
  })
  const locale = cookies.get<string>(KEYS.locale)
  const currency = cookies.get<string>(KEYS.currency)

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="SSR initial cookies"
      description="Pass initialCookies during SSR or prerender so the first client render matches the server snapshot before document.cookie is read."
      instruction="Inspect hydrated values without framework-specific wiring."
      code={ssrInitialCookiesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'ssr-ready',
            },
            { label: 'locale', value: locale ?? 'none', testId: 'ssr-locale' },
            {
              label: 'currency',
              value: currency ?? 'none',
              testId: 'ssr-currency',
            },
          ]}
        />
      }
    >
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
        Hydrated snapshot:{' '}
        <span className="font-semibold" data-testid="ssr-summary">
          {locale} · {currency}
        </span>
      </p>
    </ExampleShowcase>
  )
}

export function CustomDocumentExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [targetDocument, setTargetDocument] = useState<Document | null>(null)
  const [frameReady, setFrameReady] = useState(false)
  const cookies = useCookies(IFRAME_DEPS, { document: targetDocument })
  const value = cookies.get<string>(KEYS.iframe) ?? ''

  const bindIframe = useCallback((frame: HTMLIFrameElement) => {
    setTargetDocument(frame.contentDocument)
    setFrameReady(true)
  }, [])

  useIsolatedIframeBind(iframeRef, bindIframe)

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Custom document"
      description="Pass options.document to scope cookies to a same-origin iframe without touching the Storybook page cookies."
      instruction="Wait for the iframe, edit the note, and confirm storage stays inside the frame."
      code={customDocumentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'iframe ready',
              value: String(frameReady),
              testId: 'iframe-ready',
            },
            {
              label: 'isReady',
              value: String(cookies.isReady),
              testId: 'iframe-uc-ready',
            },
            {
              label: 'value',
              value: value.length > 0 ? value : '(empty)',
              testId: 'iframe-value',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated cookie frame"
        data-testid="custom-document-iframe"
        className="h-40 w-full rounded-xl border border-slate-200 bg-white"
        srcDoc="<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#eef2ff,#fff);min-height:120px;}</style></head><body><p>Isolated frame cookies</p></body></html>"
      />
      <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
        Frame note
        <input
          className={inputClass}
          data-testid="iframe-note-input"
          disabled={!frameReady || !cookies.isReady}
          value={value}
          onChange={(event) => {
            cookies.set(KEYS.iframe, event.target.value, { path: COOKIE_PATH })
          }}
        />
      </label>
    </ExampleShowcase>
  )
}

export function ChangeListenersExample(): ReactElement {
  const { addChangeListener, set, remove, refresh, isReady } =
    useCookies(LISTENER_DEPS)
  const [events, setEvents] = useState<UseCookiesChange[]>([])

  useEffect(() => {
    return addChangeListener((change) => {
      setEvents((current) => [change, ...current].slice(0, 8))
    })
  }, [addChangeListener])

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Change listeners"
      description="addChangeListener receives set, remove, and external changes filtered by the active dependency watch list."
      instruction="Set, remove, or simulate external writes and inspect the timeline."
      code={changeListenersSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isReady',
              value: String(isReady),
              testId: 'listener-ready',
            },
            {
              label: 'events',
              value: String(events.length),
              testId: 'listener-count',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="listener-set"
          onClick={() => {
            set(KEYS.listener, 'next', { path: COOKIE_PATH })
          }}
        >
          Set
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          data-testid="listener-remove"
          onClick={() => {
            remove(KEYS.listener, { path: COOKIE_PATH })
          }}
        >
          Remove
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="listener-external"
          onClick={() => {
            setRawCookie(KEYS.listener, 'external', COOKIE_PATH)
            refresh()
          }}
        >
          External + refresh
        </button>
      </div>
      <ol
        className="mt-4 space-y-2 text-sm text-slate-700"
        data-testid="listener-timeline"
      >
        {events.length === 0 ? (
          <li className="text-slate-500">No changes yet</li>
        ) : (
          events.map((event, index) => (
            <li
              key={`${event.name}-${event.cause}-${index}`}
              data-testid={`listener-event-${index}`}
            >
              <span className="font-semibold">{event.cause}</span>: {event.name}{' '}
              → {JSON.stringify(event.value ?? null)}
            </li>
          ))
        )}
      </ol>
    </ExampleShowcase>
  )
}

function PlaygroundBody({
  dependencies,
  doNotParse,
  autoUpdateDependencies,
  watch,
  pollingInterval,
}: {
  dependencies: readonly string[] | null
  doNotParse: boolean
  autoUpdateDependencies: boolean
  watch: boolean
  pollingInterval?: number | undefined
}): ReactElement {
  const cookies = useCookies(dependencies, {
    doNotParse,
    autoUpdateDependencies,
    watch,
    ...(pollingInterval != null ? { pollingInterval } : {}),
  })

  return (
    <div className="space-y-3" data-testid="playground-body">
      <pre
        className={`${codePreviewClass} text-[11px] whitespace-pre-wrap`}
        data-testid="playground-state"
      >
        {JSON.stringify(
          {
            value: cookies.get(KEYS.playground),
            isReady: cookies.isReady,
            isSupported: cookies.isSupported,
            error: cookies.error?.message ?? null,
          },
          null,
          2,
        )}
      </pre>
      <button
        type="button"
        className={buttonClass}
        data-testid="playground-set"
        onClick={() => {
          cookies.set(KEYS.playground, 'playground-value', {
            path: COOKIE_PATH,
          })
        }}
      >
        Set playground cookie
      </button>
    </div>
  )
}

export function PlaygroundExample({
  playgroundDeps = PLAYGROUND_DEPS,
  doNotParse = false,
  autoUpdateDependencies = false,
  watch = true,
  pollingInterval,
}: {
  playgroundDeps?: readonly string[] | null
  doNotParse?: boolean
  autoUpdateDependencies?: boolean
  watch?: boolean
  pollingInterval?: number | undefined
}): ReactElement {
  const [mounted, setMounted] = useState(false)

  return (
    <ExampleShowcase
      hookName="useCookies"
      title="Playground"
      description="Mount explicitly so Docs does not write cookies on load. Tune dependency and observation options via Controls."
      instruction="Mount the playground, adjust Controls, and inspect live hook state."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'playground-mounted',
            },
            {
              label: 'dependencies',
              value:
                playgroundDeps == null
                  ? 'all'
                  : playgroundDeps.length === 0
                    ? 'none'
                    : playgroundDeps.join(', '),
              testId: 'playground-deps',
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
          key={`${playgroundDeps?.join(',') ?? 'all'}-${doNotParse}-${autoUpdateDependencies}-${watch}-${pollingInterval ?? 'default'}`}
          dependencies={playgroundDeps}
          doNotParse={doNotParse}
          autoUpdateDependencies={autoUpdateDependencies}
          watch={watch}
          pollingInterval={pollingInterval}
        />
      ) : null}
    </ExampleShowcase>
  )
}
