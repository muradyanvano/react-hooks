export const faviconSwitcherSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

const ICONS = {
  blue: 'data:image/svg+xml,...',
  green: 'data:image/svg+xml,...',
  amber: 'data:image/svg+xml,...',
} as const

export function FaviconSwitcher({ document: targetDocument }: { document: Document }) {
  const [icon, setIcon] = useState<string | null>(ICONS.blue)
  const { href, isSupported, error } = useFavicon(icon, {
    document: targetDocument,
    rel: 'icon',
  })

  return (
    <div>
      <p>Change favicon to</p>
      {(Object.keys(ICONS) as Array<keyof typeof ICONS>).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={icon === ICONS[key]}
          onClick={() => setIcon(ICONS[key])}
        >
          {key}
        </button>
      ))}
      <button type="button" onClick={() => setIcon(null)}>
        Reset
      </button>
      <p>href: {href ?? 'none'}</p>
      <p>supported: {String(isSupported)}</p>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  )
}`

export const basicControlledSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function BasicControlled({ document: targetDocument }: { document: Document }) {
  const [icon, setIcon] = useState('data:image/svg+xml,...')
  const { href } = useFavicon(icon, { document: targetDocument })

  return (
    <div>
      <button type="button" onClick={() => setIcon('data:image/svg+xml,...green...')}>
        Use green icon
      </button>
      <p>{href}</p>
    </div>
  )
}`

export const relativeBaseUrlSnippet = `import { useFavicon } from '@muradyanvano/react-hooks'

export function RelativeBaseUrl({ document: targetDocument }: { document: Document }) {
  const { href } = useFavicon('assets/demo-favicon.svg', {
    document: targetDocument,
    baseUrl: 'https://example.com/app/',
  })

  return <p>Resolved: {href}</p>
}`

export const svgDataUrlSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

const SVG_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#2563eb"/></svg>')

export function SvgDataUrl({ document: targetDocument }: { document: Document }) {
  const [icon, setIcon] = useState(SVG_ICON)
  const { href } = useFavicon(icon, { document: targetDocument })

  return (
    <div>
      <button type="button" onClick={() => setIcon(SVG_ICON)}>
        Apply SVG data URL
      </button>
      <p>{href}</p>
    </div>
  )
}`

export const notificationBadgeSnippet = `import { useMemo, useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

function badgeIcon(count: number) {
  const label = count > 9 ? '9+' : String(count)
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="6" fill="#1d4ed8"/>
        <circle cx="23" cy="9" r="7" fill="#ef4444"/>
        <text x="23" y="12" text-anchor="middle" font-size="9" fill="#fff">\${label}</text>
      </svg>\`,
    )
  )
}

export function NotificationBadge({ document: targetDocument }: { document: Document }) {
  const [count, setCount] = useState(3)
  const icon = useMemo(() => badgeIcon(count), [count])
  const { href } = useFavicon(icon, { document: targetDocument })

  return (
    <div>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Increase badge
      </button>
      <p>Count: {count}</p>
      <p>{href}</p>
    </div>
  )
}`

export const themeAwareSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

const LIGHT = 'data:image/svg+xml,...light...'
const DARK = 'data:image/svg+xml,...dark...'

export function ThemeAware({ document: targetDocument }: { document: Document }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const { href } = useFavicon(theme === 'light' ? LIGHT : DARK, {
    document: targetDocument,
  })

  return (
    <div>
      <button
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
      >
        Theme: {theme}
      </button>
      <p>{href}</p>
    </div>
  )
}`

export const statusIconsSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

const ICONS = {
  loading: 'data:image/svg+xml,...',
  success: 'data:image/svg+xml,...',
  error: 'data:image/svg+xml,...',
} as const

export function StatusIcons({ document: targetDocument }: { document: Document }) {
  const [status, setStatus] = useState<keyof typeof ICONS>('loading')
  const { href } = useFavicon(ICONS[status], { document: targetDocument })

  return (
    <div>
      {(Object.keys(ICONS) as Array<keyof typeof ICONS>).map((key) => (
        <button key={key} type="button" onClick={() => setStatus(key)}>
          {key}
        </button>
      ))}
      <p>Status: {status}</p>
      <p>{href}</p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function EnabledState({ document: targetDocument }: { document: Document }) {
  const [enabled, setEnabled] = useState(true)
  const { href, isSupported } = useFavicon('data:image/svg+xml,...', {
    document: targetDocument,
    enabled,
  })

  return (
    <div>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? 'Disable' : 'Enable'}
      </button>
      <p>href: {href ?? 'none'}</p>
      <p>supported: {String(isSupported)}</p>
    </div>
  )
}`

export const nullIconSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function NullIcon({ document: targetDocument }: { document: Document }) {
  const [icon, setIcon] = useState<string | null>('data:image/svg+xml,...')
  const { href } = useFavicon(icon, { document: targetDocument })

  return (
    <div>
      <button type="button" onClick={() => setIcon(null)}>
        Clear icon
      </button>
      <button type="button" onClick={() => setIcon('data:image/svg+xml,...')}>
        Restore icon
      </button>
      <p>{href ?? 'none'}</p>
    </div>
  )
}`

export const existingRestoreSnippet = `import { useEffect, useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function ExistingRestore({ document: targetDocument }: { document: Document }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const link = targetDocument.createElement('link')
    link.rel = 'icon'
    link.href = 'data:image/svg+xml,...original...'
    link.setAttribute('data-demo-original', 'true')
    targetDocument.head.appendChild(link)
    setMounted(true)
    return () => {
      link.remove()
    }
  }, [targetDocument])

  const { href } = useFavicon(mounted ? 'data:image/svg+xml,...override...' : null, {
    document: targetDocument,
  })

  return (
    <div>
      <button type="button" onClick={() => setMounted(false)}>
        Unmount override
      </button>
      <p>{href ?? 'restored / idle'}</p>
    </div>
  )
}`

export const multipleOwnersSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function MultipleOwners({ document: targetDocument }: { document: Document }) {
  const [showA, setShowA] = useState(true)
  const [showB, setShowB] = useState(true)

  return (
    <div>
      <button type="button" onClick={() => setShowA((value) => !value)}>
        Toggle owner A
      </button>
      <button type="button" onClick={() => setShowB((value) => !value)}>
        Toggle owner B
      </button>
      {showA ? <Owner label="A" icon="data:image/svg+xml,...a..." document={targetDocument} /> : null}
      {showB ? <Owner label="B" icon="data:image/svg+xml,...b..." document={targetDocument} /> : null}
    </div>
  )
}

function Owner({
  label,
  icon,
  document: targetDocument,
}: {
  label: string
  icon: string
  document: Document
}) {
  const { href } = useFavicon(icon, { document: targetDocument })
  return (
    <p>
      Owner {label}: {href}
    </p>
  )
}`

export const customRelationSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function CustomRelation({ document: targetDocument }: { document: Document }) {
  const [rel, setRel] = useState('apple-touch-icon')
  const { href } = useFavicon('data:image/svg+xml,...', {
    document: targetDocument,
    rel,
  })

  return (
    <div>
      <button type="button" onClick={() => setRel('apple-touch-icon')}>
        apple-touch-icon
      </button>
      <button type="button" onClick={() => setRel('mask-icon')}>
        mask-icon
      </button>
      <p>rel: {rel}</p>
      <p>{href}</p>
    </div>
  )
}`

export const dynamicDocumentSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function DynamicDocument({
  documentA,
  documentB,
}: {
  documentA: Document
  documentB: Document
}) {
  const [target, setTarget] = useState<'a' | 'b' | 'none'>('a')
  const selected =
    target === 'a' ? documentA : target === 'b' ? documentB : null
  const { href, isSupported } = useFavicon('data:image/svg+xml,...', {
    document: selected,
  })

  return (
    <div>
      <button type="button" onClick={() => setTarget('a')}>Document A</button>
      <button type="button" onClick={() => setTarget('b')}>Document B</button>
      <button type="button" onClick={() => setTarget('none')}>None</button>
      <p>href: {href ?? 'none'}</p>
      <p>supported: {String(isSupported)}</p>
    </div>
  )
}`

export const isolatedIframeSnippet = `import { useEffect, useRef, useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function IsolatedIframeDemo() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const { href } = useFavicon('data:image/svg+xml,...', { document: doc })

  useEffect(() => {
    const frame = iframeRef.current
    if (!frame) return
    const onLoad = () => setDoc(frame.contentDocument)
    frame.addEventListener('load', onLoad)
    if (frame.contentDocument?.readyState === 'complete') {
      setDoc(frame.contentDocument)
    }
    return () => frame.removeEventListener('load', onLoad)
  }, [])

  return (
    <div>
      <iframe ref={iframeRef} title="Favicon preview" srcDoc="<!doctype html><html><head></head><body></body></html>" />
      <p>{href ?? 'waiting for iframe document'}</p>
    </div>
  )
}`

export const persistentFaviconSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function PersistentFavicon({ document: targetDocument }: { document: Document }) {
  const [mounted, setMounted] = useState(true)

  return (
    <div>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount hook' : 'Remount hook'}
      </button>
      {mounted ? (
        <PersistentOwner document={targetDocument} />
      ) : (
        <p>Hook unmounted; favicon may remain in the document head.</p>
      )}
    </div>
  )
}

function PersistentOwner({ document: targetDocument }: { document: Document }) {
  const { href } = useFavicon('data:image/svg+xml,...', {
    document: targetDocument,
    restoreOnUnmount: false,
  })
  return <p>{href}</p>
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function Playground({ document: targetDocument }: { document: Document }) {
  const [icon, setIcon] = useState<string | null>('data:image/svg+xml,...')
  const [enabled, setEnabled] = useState(true)
  const [rel, setRel] = useState('icon')
  const { href, isSupported, error } = useFavicon(icon, {
    document: targetDocument,
    enabled,
    rel,
  })

  return (
    <div>
      <label>
        Icon URL
        <input value={icon ?? ''} onChange={(event) => setIcon(event.target.value || null)} />
      </label>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        enabled: {String(enabled)}
      </button>
      <label>
        rel
        <input value={rel} onChange={(event) => setRel(event.target.value)} />
      </label>
      <p>href: {href ?? 'none'}</p>
      <p>supported: {String(isSupported)}</p>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  )
}`

export const currentPreviewDocumentSnippet = `import { useState } from 'react'
import { useFavicon } from '@muradyanvano/react-hooks'

export function CurrentPreviewDocument() {
  const [mounted, setMounted] = useState(false)
  const [icon, setIcon] = useState<string | null>('data:image/svg+xml,...')
  const { href } = useFavicon(mounted ? icon : null)

  return (
    <div>
      <button type="button" onClick={() => setMounted(true)}>
        Mount onto preview document
      </button>
      <button type="button" onClick={() => setIcon(null)}>
        Clear
      </button>
      <button type="button" onClick={() => setMounted(false)}>
        Unmount and restore
      </button>
      <p>{href ?? 'idle'}</p>
    </div>
  )
}`
