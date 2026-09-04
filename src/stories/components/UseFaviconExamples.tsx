import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  ICON_AMBER,
  ICON_BLUE,
  ICON_DARK,
  ICON_ERROR,
  ICON_GREEN,
  ICON_LIGHT,
  ICON_LOADING,
  ICON_SUCCESS,
  SAMPLE_BASE_URL,
  SAMPLE_RELATIVE_ICON,
  badgeIcon,
} from './useFavicon.fictional'
import {
  basicControlledSnippet,
  currentPreviewDocumentSnippet,
  customRelationSnippet,
  dynamicDocumentSnippet,
  enabledStateSnippet,
  existingRestoreSnippet,
  faviconSwitcherSnippet,
  isolatedIframeSnippet,
  multipleOwnersSnippet,
  notificationBadgeSnippet,
  nullIconSnippet,
  persistentFaviconSnippet,
  playgroundSnippet,
  relativeBaseUrlSnippet,
  statusIconsSnippet,
  svgDataUrlSnippet,
  themeAwareSnippet,
} from './useFavicon.snippets'

const EMPTY_DOC = `<!doctype html><html><head><title>Favicon preview</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;"><div style="padding:12px;font-size:12px;">Isolated preview document</div></body></html>`

function useIsolatedIframeBind(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  onReady: (doc: Document) => void,
) {
  useEffect(() => {
    const frame = iframeRef.current
    if (!frame) return

    const bind = () => {
      if (frame.contentDocument == null) return
      onReady(frame.contentDocument)
    }

    frame.addEventListener('load', bind)
    if (frame.contentDocument?.readyState === 'complete') {
      bind()
    }
    return () => frame.removeEventListener('load', bind)
  }, [iframeRef, onReady])
}

function readIconHref(doc: Document | null, rel = 'icon'): string | null {
  if (!doc?.head) return null
  const links = Array.from(doc.head.querySelectorAll('link'))
  const matches = links.filter((link) => {
    const tokens = (link.getAttribute('rel') ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.toLowerCase())
    const wanted = rel
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.toLowerCase())
    return (
      wanted.length > 0 &&
      wanted.every((token) => tokens.includes(token)) &&
      tokens.length === wanted.length
    )
  })
  const last = matches.at(-1)
  return last?.getAttribute('href') ?? null
}

function BrowserChrome({
  title,
  iconHref,
  children,
  testIdPrefix,
}: {
  title: string
  iconHref: string | null
  children: ReactNode
  testIdPrefix: string
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-300 bg-slate-200 shadow-sm"
      data-testid={`${testIdPrefix}-chrome`}
    >
      <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-rose-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1">
          {iconHref ? (
            <img
              src={iconHref}
              alt=""
              width={14}
              height={14}
              className="size-3.5 shrink-0"
              aria-hidden="true"
              data-testid={`${testIdPrefix}-tab-icon`}
            />
          ) : (
            <span
              className="inline-block size-3.5 shrink-0 rounded-sm bg-slate-300"
              aria-hidden="true"
              data-testid={`${testIdPrefix}-tab-icon-empty`}
            />
          )}
          <span
            className="truncate text-xs text-slate-700"
            data-testid={`${testIdPrefix}-tab-title`}
          >
            {title}
          </span>
        </div>
      </div>
      <div className="bg-white p-3">{children}</div>
    </div>
  )
}

function IsolatedShell({
  testIdPrefix,
  title,
  children,
  onDocument,
}: {
  testIdPrefix: string
  title: string
  children: (doc: Document | null, liveHref: string | null) => ReactNode
  onDocument?: (doc: Document | null) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const [tick, setTick] = useState(0)

  const bind = useCallback(
    (next: Document) => {
      setDoc(next)
      onDocument?.(next)
      setTick((value) => value + 1)
    },
    [onDocument],
  )

  useIsolatedIframeBind(iframeRef, bind)

  useEffect(() => {
    if (!doc) return
    const id = window.setInterval(() => setTick((value) => value + 1), 200)
    return () => window.clearInterval(id)
  }, [doc])

  const liveHref = useMemo(() => {
    void tick
    return readIconHref(doc)
  }, [doc, tick])

  return (
    <div className="space-y-3">
      <BrowserChrome
        title={title}
        iconHref={liveHref}
        testIdPrefix={testIdPrefix}
      >
        <iframe
          ref={iframeRef}
          title={`${title} isolated document`}
          data-testid={`${testIdPrefix}-iframe`}
          className="h-16 w-full rounded-lg border border-slate-200 bg-slate-50"
          srcDoc={EMPTY_DOC}
        />
      </BrowserChrome>
      {children(doc, liveHref)}
    </div>
  )
}

function FaviconCacheNote() {
  return (
    <p
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="note"
      data-testid="favicon-cache-note"
    >
      Browsers may cache or delay favicon refresh. This demo updates the
      document&apos;s <code>&lt;link rel=&quot;icon&quot;&gt;</code>{' '}
      immediately; the OS/browser tab icon can lag.
    </p>
  )
}

export function FaviconSwitcherExample() {
  const [icon, setIcon] = useState<string | null>(ICON_BLUE)
  const [doc, setDoc] = useState<Document | null>(null)
  const { href, isSupported, error } = useFavicon(icon, {
    document: doc,
    rel: 'icon',
  })

  const options = [
    { key: 'blue', label: 'Blue', value: ICON_BLUE },
    { key: 'green', label: 'Green', value: ICON_GREEN },
    { key: 'amber', label: 'Amber', value: ICON_AMBER },
  ] as const

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Favicon switcher"
      description="Change the favicon in an isolated browser-style preview. The tab icon mirrors the real document-head link driven by controlled React state."
      instruction="Pick Blue, Green, or Amber, then Reset to release ownership and restore the baseline."
      badge="Primary"
      code={faviconSwitcherSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'href', value: href ?? 'none', testId: 'switcher-href' },
            { label: 'rel', value: 'icon', testId: 'switcher-rel' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'switcher-supported',
            },
            {
              label: 'error',
              value: error?.message ?? 'none',
              testId: 'switcher-error',
            },
            {
              label: 'selected',
              value:
                options.find((item) => item.value === icon)?.label ?? 'none',
              testId: 'switcher-selected',
            },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="switcher"
        title="example.app"
        onDocument={setDoc}
      >
        {(_doc, liveHref) => (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-slate-900">
              Change favicon to
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-pressed:border-indigo-500 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-900"
                  aria-pressed={icon === item.value}
                  data-testid={`switcher-icon-${item.key}`}
                  onClick={() => setIcon(item.value)}
                >
                  <img
                    src={item.value}
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden="true"
                    className="size-4"
                  />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                data-testid="switcher-reset"
                onClick={() => setIcon(null)}
              >
                Reset
              </button>
            </div>
            <p
              className="text-sm text-slate-600"
              data-testid="switcher-live-href"
            >
              Document link href: {liveHref ?? 'none'}
            </p>
            <FaviconCacheNote />
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function BasicControlledExample() {
  const [icon, setIcon] = useState(ICON_BLUE)
  const [doc, setDoc] = useState<Document | null>(null)
  const { href, isSupported } = useFavicon(icon, { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Basic controlled favicon"
      description="Icon is controlled by React state. Rerender with a new string to update the managed link."
      instruction="Switch between Blue and Green icons."
      code={basicControlledSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'href', value: href ?? 'none', testId: 'basic-href' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'basic-supported',
            },
          ]}
        />
      }
    >
      <IsolatedShell testIdPrefix="basic" title="basic.app" onDocument={setDoc}>
        {() => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="basic-blue"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              aria-pressed={icon === ICON_BLUE}
              onClick={() => setIcon(ICON_BLUE)}
            >
              Blue
            </button>
            <button
              type="button"
              data-testid="basic-green"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              aria-pressed={icon === ICON_GREEN}
              onClick={() => setIcon(ICON_GREEN)}
            >
              Green
            </button>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function RelativeBaseUrlExample() {
  const [doc, setDoc] = useState<Document | null>(null)
  const { href, isSupported, error } = useFavicon(SAMPLE_RELATIVE_ICON, {
    document: doc,
    baseUrl: SAMPLE_BASE_URL,
  })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Relative URL with base URL"
      description="Relative icons resolve with new URL(icon, baseUrl ?? document.baseURI)."
      instruction="Inspect the resolved absolute href in the status panel."
      code={relativeBaseUrlSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'href', value: href ?? 'none', testId: 'relative-href' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'relative-supported',
            },
            {
              label: 'error',
              value: error?.message ?? 'none',
              testId: 'relative-error',
            },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="relative"
        title="relative.app"
        onDocument={setDoc}
      >
        {() => (
          <p className="text-sm text-slate-600">
            Icon: <code>{SAMPLE_RELATIVE_ICON}</code> · base:{' '}
            <code>{SAMPLE_BASE_URL}</code>
          </p>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function SvgDataUrlExample() {
  const [icon, setIcon] = useState(ICON_BLUE)
  const [doc, setDoc] = useState<Document | null>(null)
  const { href } = useFavicon(icon, { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="SVG data URL"
      description="Data URLs are supported without network requests."
      instruction="Apply the SVG data URL favicon."
      code={svgDataUrlSnippet}
      aside={
        <StatusPanel
          items={[{ label: 'href', value: href ?? 'none', testId: 'svg-href' }]}
        />
      }
    >
      <IsolatedShell testIdPrefix="svg" title="svg.app" onDocument={setDoc}>
        {() => (
          <button
            type="button"
            data-testid="svg-apply"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setIcon(ICON_GREEN)}
          >
            Apply green SVG
          </button>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function NotificationBadgeExample() {
  const [count, setCount] = useState(3)
  const [doc, setDoc] = useState<Document | null>(null)
  const icon = useMemo(() => badgeIcon(count), [count])
  const { href } = useFavicon(icon, { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Notification badge favicon"
      description="Badge artwork is generated as a deterministic SVG data URL in the example. The hook does not draw badges."
      instruction="Increase the badge count and watch the document link update."
      code={notificationBadgeSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'count', value: String(count), testId: 'badge-count' },
            { label: 'href', value: href ?? 'none', testId: 'badge-href' },
          ]}
        />
      }
    >
      <IsolatedShell testIdPrefix="badge" title="badge.app" onDocument={setDoc}>
        {() => (
          <button
            type="button"
            data-testid="badge-increase"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setCount((value) => value + 1)}
          >
            Increase badge
          </button>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function ThemeAwareExample() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [doc, setDoc] = useState<Document | null>(null)
  const icon = theme === 'light' ? ICON_LIGHT : ICON_DARK
  const { href } = useFavicon(icon, { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Theme-aware light/dark favicon"
      description="Story-local theme toggle drives the controlled icon. The hook does not read OS preferences."
      instruction="Toggle theme and confirm the document link href changes."
      code={themeAwareSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'theme', value: theme, testId: 'theme-value' },
            { label: 'href', value: href ?? 'none', testId: 'theme-href' },
          ]}
        />
      }
    >
      <IsolatedShell testIdPrefix="theme" title="theme.app" onDocument={setDoc}>
        {() => (
          <button
            type="button"
            data-testid="theme-toggle"
            aria-pressed={theme === 'dark'}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() =>
              setTheme((value) => (value === 'light' ? 'dark' : 'light'))
            }
          >
            Theme: {theme}
          </button>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function StatusIconsExample() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  )
  const [doc, setDoc] = useState<Document | null>(null)
  const icons = {
    loading: ICON_LOADING,
    success: ICON_SUCCESS,
    error: ICON_ERROR,
  } as const
  const { href } = useFavicon(icons[status], { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Loading / success / error icons"
      description="Controlled status buttons swap deterministic SVG favicons. No timers are required."
      instruction="Choose loading, success, or error."
      code={statusIconsSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'status', value: status, testId: 'status-value' },
            { label: 'href', value: href ?? 'none', testId: 'status-href' },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="status"
        title="status.app"
        onDocument={setDoc}
      >
        {() => (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(icons) as Array<keyof typeof icons>).map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`status-${key}`}
                aria-pressed={status === key}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => setStatus(key)}
              >
                {key}
              </button>
            ))}
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const [doc, setDoc] = useState<Document | null>(null)
  const { href, isSupported } = useFavicon(ICON_BLUE, {
    document: doc,
    enabled,
  })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Enabled state"
      description="When disabled, this instance releases ownership and clears returned href."
      instruction="Toggle enabled and watch href restore/release."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'enabled',
              value: String(enabled),
              testId: 'enabled-value',
            },
            { label: 'href', value: href ?? 'none', testId: 'enabled-href' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'enabled-supported',
            },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="enabled"
        title="enabled.app"
        onDocument={setDoc}
      >
        {() => (
          <button
            type="button"
            data-testid="enabled-toggle"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setEnabled((value) => !value)}
          >
            {enabled ? 'Disable' : 'Enable'}
          </button>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function NullIconExample() {
  const [icon, setIcon] = useState<string | null>(ICON_BLUE)
  const [doc, setDoc] = useState<Document | null>(null)
  const { href } = useFavicon(icon, { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Null icon and restoration"
      description="null or undefined means this instance has no favicon request."
      instruction="Clear the icon, then restore it."
      code={nullIconSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'href', value: href ?? 'none', testId: 'null-href' },
          ]}
        />
      }
    >
      <IsolatedShell testIdPrefix="null" title="null.app" onDocument={setDoc}>
        {() => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="null-clear"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setIcon(null)}
            >
              Clear icon
            </button>
            <button
              type="button"
              data-testid="null-restore"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setIcon(ICON_BLUE)}
            >
              Restore icon
            </button>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function ExistingRestoreExample() {
  const [doc, setDoc] = useState<Document | null>(null)
  const [override, setOverride] = useState(true)

  const bindDocument = useCallback((next: Document | null) => {
    if (next?.head && !next.head.querySelector('link[data-demo-original]')) {
      const link = next.createElement('link')
      link.rel = 'icon'
      link.href = ICON_AMBER
      link.setAttribute('data-demo-original', 'true')
      link.setAttribute('type', 'image/svg+xml')
      next.head.appendChild(link)
    }
    setDoc(next)
  }, [])

  const { href } = useFavicon(override && doc ? ICON_GREEN : null, {
    document: doc,
  })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Existing favicon restoration"
      description="When an original matching link exists, the hook updates it and restores the exact original attributes on final release."
      instruction="Unmount the override to restore the seeded amber favicon."
      code={existingRestoreSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'override',
              value: String(override),
              testId: 'existing-override',
            },
            {
              label: 'href',
              value: href ?? 'none',
              testId: 'existing-href',
            },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="existing"
        title="existing.app"
        onDocument={bindDocument}
      >
        {(_d, liveHref) => (
          <div className="space-y-2">
            <button
              type="button"
              data-testid="existing-unmount"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setOverride(false)}
            >
              Unmount override
            </button>
            <p className="text-sm text-slate-600" data-testid="existing-live">
              Live href: {liveHref ?? 'none'}
            </p>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

function OwnerLabel({
  label,
  icon,
  document: targetDocument,
}: {
  label: string
  icon: string
  document: Document | null
}) {
  const { href } = useFavicon(icon, { document: targetDocument })
  return (
    <p className="text-sm text-slate-700" data-testid={`owner-${label}-href`}>
      Owner {label}: {href ?? 'none'}
    </p>
  )
}

export function MultipleOwnersExample() {
  const [showA, setShowA] = useState(true)
  const [showB, setShowB] = useState(true)
  const [doc, setDoc] = useState<Document | null>(null)

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Multiple hook owners"
      description="Most recently updated owner wins. Releasing the current owner reveals the previous active owner."
      instruction="Toggle owners A and B and observe the document link."
      code={multipleOwnersSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'A mounted', value: String(showA), testId: 'owners-a' },
            { label: 'B mounted', value: String(showB), testId: 'owners-b' },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="owners"
        title="owners.app"
        onDocument={setDoc}
      >
        {(_d, liveHref) => (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="owners-toggle-a"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => setShowA((value) => !value)}
              >
                Toggle owner A
              </button>
              <button
                type="button"
                data-testid="owners-toggle-b"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => setShowB((value) => !value)}
              >
                Toggle owner B
              </button>
            </div>
            {showA ? (
              <OwnerLabel label="A" icon={ICON_BLUE} document={doc} />
            ) : null}
            {showB ? (
              <OwnerLabel label="B" icon={ICON_GREEN} document={doc} />
            ) : null}
            <p className="text-sm text-slate-600" data-testid="owners-live">
              Live href: {liveHref ?? 'none'}
            </p>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function CustomRelationExample() {
  const [rel, setRel] = useState('apple-touch-icon')
  const [doc, setDoc] = useState<Document | null>(null)
  const { href } = useFavicon(ICON_BLUE, { document: doc, rel })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Custom relation"
      description="Different rel values are independent registry channels. apple-touch-icon is not treated as icon."
      instruction="Switch between apple-touch-icon and mask-icon."
      code={customRelationSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'rel', value: rel, testId: 'rel-value' },
            { label: 'href', value: href ?? 'none', testId: 'rel-href' },
          ]}
        />
      }
    >
      <IsolatedShell testIdPrefix="rel" title="rel.app" onDocument={setDoc}>
        {() => (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="rel-apple"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              aria-pressed={rel === 'apple-touch-icon'}
              onClick={() => setRel('apple-touch-icon')}
            >
              apple-touch-icon
            </button>
            <button
              type="button"
              data-testid="rel-mask"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              aria-pressed={rel === 'mask-icon'}
              onClick={() => setRel('mask-icon')}
            >
              mask-icon
            </button>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function DynamicDocumentExample() {
  const iframeARef = useRef<HTMLIFrameElement>(null)
  const iframeBRef = useRef<HTMLIFrameElement>(null)
  const [docA, setDocA] = useState<Document | null>(null)
  const [docB, setDocB] = useState<Document | null>(null)
  const [target, setTarget] = useState<'a' | 'b' | 'none'>('a')

  useIsolatedIframeBind(iframeARef, setDocA)
  useIsolatedIframeBind(iframeBRef, setDocB)

  const selected = target === 'a' ? docA : target === 'b' ? docB : null
  const { href, isSupported } = useFavicon(ICON_BLUE, { document: selected })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Dynamic document"
      description="Switching documents releases the previous document before acquiring the next. Explicit null never falls back."
      instruction="Move ownership between Document A, Document B, and none."
      code={dynamicDocumentSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'target', value: target, testId: 'dynamic-target' },
            { label: 'href', value: href ?? 'none', testId: 'dynamic-href' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'dynamic-supported',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <iframe
          ref={iframeARef}
          title="Document A"
          data-testid="dynamic-iframe-a"
          className="h-16 w-full rounded-lg border border-slate-200"
          srcDoc={EMPTY_DOC}
        />
        <iframe
          ref={iframeBRef}
          title="Document B"
          data-testid="dynamic-iframe-b"
          className="h-16 w-full rounded-lg border border-slate-200"
          srcDoc={EMPTY_DOC}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="dynamic-a"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setTarget('a')}
        >
          Document A
        </button>
        <button
          type="button"
          data-testid="dynamic-b"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setTarget('b')}
        >
          Document B
        </button>
        <button
          type="button"
          data-testid="dynamic-none"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setTarget('none')}
        >
          None
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function IsolatedIframeExample() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  useIsolatedIframeBind(iframeRef, setDoc)
  const { href, isSupported } = useFavicon(ICON_GREEN, { document: doc })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Isolated iframe document"
      description="Same-origin iframe contentDocument is a supported custom Document target."
      instruction="Wait for the iframe to load and inspect the resolved href."
      code={isolatedIframeSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'href', value: href ?? 'none', testId: 'iframe-href' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'iframe-supported',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Isolated favicon iframe"
        data-testid="isolated-iframe"
        className="h-20 w-full rounded-lg border border-slate-200"
        srcDoc={EMPTY_DOC}
      />
    </ExampleShowcase>
  )
}

function PersistentOwner({ document: targetDocument }: { document: Document }) {
  const { href } = useFavicon(ICON_AMBER, {
    document: targetDocument,
    restoreOnUnmount: false,
  })
  return (
    <p className="text-sm text-slate-700" data-testid="persist-owner-href">
      {href}
    </p>
  )
}

export function PersistentFaviconExample() {
  const [mounted, setMounted] = useState(true)
  const [doc, setDoc] = useState<Document | null>(null)

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Persistent favicon"
      description="restoreOnUnmount: false leaves the applied favicon in the document when this React owner unmounts."
      instruction="Unmount the hook, then confirm the document link remains until something else restores it."
      code={persistentFaviconSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'mounted',
              value: String(mounted),
              testId: 'persist-mounted',
            },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="persist"
        title="persist.app"
        onDocument={setDoc}
      >
        {(_d, liveHref) => (
          <div className="space-y-2">
            <button
              type="button"
              data-testid="persist-toggle"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setMounted((value) => !value)}
            >
              {mounted ? 'Unmount hook' : 'Remount hook'}
            </button>
            {mounted && doc ? <PersistentOwner document={doc} /> : null}
            <p className="text-sm text-slate-600" data-testid="persist-live">
              Live href: {liveHref ?? 'none'}
            </p>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function PlaygroundExample() {
  const [mounted, setMounted] = useState(false)
  const [icon, setIcon] = useState<string | null>(ICON_BLUE)
  const [enabled, setEnabled] = useState(true)
  const [rel, setRel] = useState('icon')
  const [doc, setDoc] = useState<Document | null>(null)
  const { href, isSupported, error } = useFavicon(mounted ? icon : null, {
    document: doc,
    enabled,
    rel,
  })

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Playground"
      description="Docs-safe playground. Mount explicitly so Docs pages do not rewrite a shared document on load."
      instruction="Mount the playground, then edit icon, enabled, and rel."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'mounted',
              value: String(mounted),
              testId: 'playground-mounted',
            },
            {
              label: 'href',
              value: href ?? 'none',
              testId: 'playground-href',
            },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'playground-supported',
            },
            {
              label: 'error',
              value: error?.message ?? 'none',
              testId: 'playground-error',
            },
          ]}
        />
      }
    >
      <IsolatedShell
        testIdPrefix="playground"
        title="playground.app"
        onDocument={setDoc}
      >
        {() => (
          <div className="space-y-3">
            <button
              type="button"
              data-testid="playground-mount"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setMounted(true)}
            >
              Mount playground
            </button>
            <label className="block text-sm text-slate-700">
              Icon
              <input
                data-testid="playground-icon"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={icon ?? ''}
                onChange={(event) => setIcon(event.target.value || null)}
              />
            </label>
            <button
              type="button"
              data-testid="playground-enabled"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => setEnabled((value) => !value)}
            >
              enabled: {String(enabled)}
            </button>
            <label className="block text-sm text-slate-700">
              rel
              <input
                data-testid="playground-rel"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                value={rel}
                onChange={(event) => setRel(event.target.value)}
              />
            </label>
          </div>
        )}
      </IsolatedShell>
    </ExampleShowcase>
  )
}

export function CurrentPreviewDocumentExample() {
  const [mounted, setMounted] = useState(false)
  const [icon, setIcon] = useState<string | null>(ICON_BLUE)
  const { href, isSupported } = useFavicon(mounted ? icon : null)

  return (
    <ExampleShowcase
      hookName="useFavicon"
      title="Current preview document"
      description="Mount-gated demo against the Storybook preview document. Play tests must restore the original favicon before finishing."
      instruction="Mount, optionally clear, then unmount to restore."
      code={currentPreviewDocumentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'mounted',
              value: String(mounted),
              testId: 'preview-mounted',
            },
            { label: 'href', value: href ?? 'none', testId: 'preview-href' },
            {
              label: 'supported',
              value: String(isSupported),
              testId: 'preview-supported',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="preview-mount"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setMounted(true)}
        >
          Mount onto preview document
        </button>
        <button
          type="button"
          data-testid="preview-clear"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setIcon(null)}
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="preview-unmount"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            setIcon(null)
            setMounted(false)
          }}
        >
          Unmount and restore
        </button>
      </div>
      <FaviconCacheNote />
    </ExampleShowcase>
  )
}
