export const localePreferencesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const LOCALE = 'rh_uc_locale'
const CURRENCY = 'rh_uc_currency'
const REGION = 'rh_uc_region'
const PATH = '/'

export function LocalePreferences() {
  const cookies = useCookies([LOCALE, CURRENCY, REGION])

  if (!cookies.isReady) {
    return <p>Loading cookie preferences…</p>
  }

  const locale = cookies.get<string>(LOCALE) ?? 'en-US'
  const currency = cookies.get<string>(CURRENCY) ?? 'USD'
  const region = cookies.get<string>(REGION) ?? 'US'

  return (
    <section>
      <label>
        Language
        <select
          value={locale}
          onChange={(event) => {
            cookies.set(LOCALE, event.target.value, { path: PATH })
          }}
        >
          <option value="en-US">English (US)</option>
          <option value="hy-AM">Armenian</option>
          <option value="fr-FR">French</option>
        </select>
      </label>
      <label>
        Currency
        <select
          value={currency}
          onChange={(event) => {
            cookies.set(CURRENCY, event.target.value, { path: PATH })
          }}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="AMD">AMD</option>
        </select>
      </label>
      <p>
        Region summary: {region} · {locale} · {currency}
      </p>
      <button type="button" onClick={() => cookies.remove(LOCALE, { path: PATH })}>
        Remove locale cookie
      </button>
    </section>
  )
}`

export const basicCookieSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_basic'
const PATH = '/'

export function BasicCookie() {
  const cookies = useCookies([NAME])
  const nickname = cookies.get<string>(NAME) ?? ''

  return (
    <>
      <input
        value={nickname}
        onChange={(event) => {
          cookies.set(NAME, event.target.value, { path: PATH })
        }}
      />
      <button type="button" onClick={() => cookies.remove(NAME, { path: PATH })}>
        Remove
      </button>
    </>
  )
}`

export const allCookiesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

export function CookieInspector() {
  const cookies = useCookies()

  if (!cookies.isReady) {
    return null
  }

  const all = cookies.getAll<Record<string, unknown>>()

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(all).map(([name, value]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{JSON.stringify(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}`

export const jsonPreferencesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

type Prefs = { theme: string; notifications: boolean }
const NAME = 'rh_uc_json'
const PATH = '/'

export function JsonPreferences() {
  const cookies = useCookies([NAME])
  const prefs =
    cookies.get<Prefs>(NAME) ?? { theme: 'light', notifications: true }

  return (
    <label>
      <input
        type="checkbox"
        checked={prefs.notifications}
        onChange={(event) => {
          cookies.set(
            NAME,
            { ...prefs, notifications: event.target.checked },
            { path: PATH },
          )
        }}
      />
      Email notifications
    </label>
  )
}`

export const doNotParseSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_raw_parsed'
const PATH = '/'

export function ParseComparison() {
  const parsed = useCookies([NAME])
  const raw = useCookies([NAME], { doNotParse: true })

  parsed.set(NAME, 'true', { path: PATH })

  return (
    <dl>
      <dt>Default parse</dt>
      <dd>{String(parsed.get(NAME))}</dd>
      <dt>doNotParse</dt>
      <dd>{String(raw.get(NAME))}</dd>
    </dl>
  )
}`

export const cookieAttributesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_attributes'

export function AttributeDemo() {
  const cookies = useCookies([NAME])

  return (
    <button
      type="button"
      onClick={() => {
        cookies.set(NAME, 'session-token', {
          path: '/',
          maxAge: 3600,
          sameSite: 'lax',
          secure: true,
        })
      }}
    >
      Set cookie with attributes
    </button>
  )
}`

export const themePreferenceSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_theme'
const PATH = '/'

export function ThemePreference() {
  const cookies = useCookies([NAME])
  const theme = cookies.get<'light' | 'dark' | 'system'>(NAME) ?? 'system'

  return (
    <select
      value={theme}
      onChange={(event) => {
        cookies.set(NAME, event.target.value, { path: PATH })
      }}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  )
}`

export const consentPreferenceSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

type Consent = { analytics: boolean; functional: boolean; marketing: boolean }
const NAME = 'rh_uc_consent'
const PATH = '/'

export function ConsentPreferences() {
  const cookies = useCookies([NAME])
  const consent =
    cookies.get<Consent>(NAME) ?? {
      analytics: false,
      functional: true,
      marketing: false,
    }

  return (
    <fieldset>
      <legend>Functional categories (demo only — not a legal CMP)</legend>
      <label>
        <input
          type="checkbox"
          checked={consent.functional}
          onChange={(event) => {
            cookies.set(
              NAME,
              { ...consent, functional: event.target.checked },
              { path: PATH },
            )
          }}
        />
        Functional
      </label>
    </fieldset>
  )
}`

export const dependenciesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const WATCHED = 'rh_uc_dep_a'
const OTHER = 'rh_uc_dep_b'
const PATH = '/'

function WatchedValue() {
  const cookies = useCookies([WATCHED])
  return <output>{cookies.get<string>(WATCHED) ?? 'none'}</output>
}

export function DependencyFilter() {
  const cookies = useCookies()

  return (
    <>
      <WatchedValue />
      <button
        type="button"
        onClick={() => cookies.set(OTHER, 'changed', { path: PATH })}
      >
        Update unrelated cookie
      </button>
    </>
  )
}`

export const automaticDependenciesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const AUTO = 'rh_uc_auto'
const PATH = '/'

export function AutoDependencies() {
  const cookies = useCookies([], { autoUpdateDependencies: true })
  const value = cookies.get<string>(AUTO)

  return (
    <button type="button" onClick={() => cookies.set(AUTO, 'ready', { path: PATH })}>
      {value ?? 'Set auto-tracked cookie'}
    </button>
  )
}`

export const twoComponentsSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_sync'
const PATH = '/'

function Editor() {
  const cookies = useCookies([NAME])
  const value = cookies.get<string>(NAME) ?? ''
  return (
    <input
      value={value}
      onChange={(event) => {
        cookies.set(NAME, event.target.value, { path: PATH })
      }}
    />
  )
}

function Mirror() {
  const cookies = useCookies([NAME])
  return <output>{cookies.get<string>(NAME) ?? ''}</output>
}

export function SharedCookie() {
  return (
    <>
      <Editor />
      <Mirror />
    </>
  )
}`

export const externalChangeSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_external'
const PATH = '/'

export function ExternalRefresh() {
  const cookies = useCookies([NAME])
  const value = cookies.get<string>(NAME) ?? 'none'

  return (
    <>
      <p>{value}</p>
      <button type="button" onClick={() => cookies.refresh()}>
        Refresh from document.cookie
      </button>
    </>
  )
}`

export const pollingFallbackSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_polling'
const PATH = '/'

export function PollingObserver() {
  const cookies = useCookies([NAME], {
    pollingInterval: 200,
    watch: true,
  })

  return <p>{cookies.get<string>(NAME) ?? 'waiting…'}</p>
}`

export const cookieStoreEventsSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_listener'
const PATH = '/'

export function CookieStoreSync() {
  const cookies = useCookies([NAME])

  return (
    <button type="button" onClick={() => cookies.set(NAME, 'via-store', { path: PATH })}>
      Set cookie
    </button>
  )
}`

export const removalPathSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_path_scoped'
const PATH = '/'
const WRONG_PATH = '/demo-path'

export function PathScopedRemoval() {
  const cookies = useCookies([NAME])

  return (
    <>
      <button
        type="button"
        onClick={() => cookies.set(NAME, 'scoped', { path: PATH })}
      >
        Set cookie at {PATH}
      </button>
      <button type="button" onClick={() => cookies.remove(NAME, { path: WRONG_PATH })}>
        Remove with wrong path
      </button>
      <button type="button" onClick={() => cookies.remove(NAME, { path: PATH })}>
        Remove with matching path
      </button>
    </>
  )
}`

export const jsonParseErrorSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_malformed'
const PATH = '/'

export function SerializationRecovery() {
  const cookies = useCookies([NAME])

  const saveInvalid = () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    cookies.set(NAME, circular, { path: PATH })
  }

  return (
    <>
      <p>{cookies.error?.message ?? 'none'}</p>
      <button type="button" onClick={saveInvalid}>
        Save invalid value
      </button>
      <button
        type="button"
        onClick={() => cookies.set(NAME, { ok: true }, { path: PATH })}
      >
        Repair
      </button>
    </>
  )
}`

export const cookieUnavailableSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

export function RestrictedCookies() {
  const cookies = useCookies(null, { document: null })

  return (
    <div role="alert">
      {!cookies.isSupported ? <p>Cookies unavailable in this context.</p> : null}
      <button type="button" onClick={() => cookies.set('rh_uc_blocked', 'local')}>
        Try to set
      </button>
    </div>
  )
}`

export const ssrInitialCookiesSnippet = `import { useCookies } from '@muradyanvano/react-hooks'

export function SsrHydratedCookies() {
  const cookies = useCookies(null, {
    initialCookies: 'rh_uc_locale=en-US; rh_uc_currency=USD',
  })

  if (!cookies.isReady) {
    return null
  }

  return (
    <p>
      {cookies.get('rh_uc_locale')} · {cookies.get('rh_uc_currency')}
    </p>
  )
}`

export const customDocumentSnippet = `import { useRef, useState } from 'react'
import { useCookies } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_iframe'
const PATH = '/'

export function IframeCookies() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [targetDocument, setTargetDocument] = useState<Document | null>(null)
  const cookies = useCookies([NAME], { document: targetDocument })
  const value = cookies.get<string>(NAME) ?? ''

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Cookie frame"
        srcDoc="<html><body>Isolated cookies</body></html>"
        onLoad={() => {
          setTargetDocument(iframeRef.current?.contentDocument ?? null)
        }}
      />
      <input
        value={value}
        onChange={(event) => {
          cookies.set(NAME, event.target.value, { path: PATH })
        }}
      />
    </>
  )
}`

export const changeListenersSnippet = `import { useEffect, useState } from 'react'
import { useCookies, type UseCookiesChange } from '@muradyanvano/react-hooks'

const NAME = 'rh_uc_listener'
const PATH = '/'

export function ChangeTimeline() {
  const cookies = useCookies([NAME])
  const [events, setEvents] = useState<UseCookiesChange[]>([])

  useEffect(() => {
    return cookies.addChangeListener((change) => {
      setEvents((current) => [change, ...current].slice(0, 8))
    })
  }, [cookies])

  return (
    <>
      <button type="button" onClick={() => cookies.set(NAME, 'next', { path: PATH })}>
        Set
      </button>
      <button type="button" onClick={() => cookies.remove(NAME, { path: PATH })}>
        Remove
      </button>
      <ul>
        {events.map((event, index) => (
          <li key={index}>
            {event.cause}: {event.name}
          </li>
        ))}
      </ul>
    </>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useCookies } from '@muradyanvano/react-hooks'

type PlaygroundProps = {
  dependencies?: readonly string[] | null
  doNotParse?: boolean
  autoUpdateDependencies?: boolean
  watch?: boolean
  pollingInterval?: number
}

function PlaygroundBody({
  dependencies = ['rh_uc_playground'],
  doNotParse = false,
  autoUpdateDependencies = false,
  watch = true,
  pollingInterval,
}: PlaygroundProps) {
  const cookies = useCookies(dependencies, {
    doNotParse,
    autoUpdateDependencies,
    watch,
    pollingInterval,
  })

  return (
    <pre>
      {JSON.stringify(
        {
          value: cookies.get('rh_uc_playground'),
          isReady: cookies.isReady,
          isSupported: cookies.isSupported,
          error: cookies.error?.message ?? null,
        },
        null,
        2,
      )}
    </pre>
  )
}

export function CookiesPlayground(props: PlaygroundProps) {
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
