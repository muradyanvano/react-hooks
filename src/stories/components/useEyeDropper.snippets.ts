export const dashboardSnippet = `import { useState } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

export function EyeDropperDashboard() {
  const { isSupported, sRGBHex, isPicking, error, open, reset } = useEyeDropper({
    initialValue: '#3b82f6',
  })
  const [history, setHistory] = useState<string[]>([])
  const [notice, setNotice] = useState('')

  return (
    <div>
      <p>Supported: {String(isSupported)}</p>
      <button
        type="button"
        disabled={!isSupported || isPicking}
        onClick={async () => {
          const color = await open()
          if (color == null) {
            setNotice('Selection cancelled.')
            return
          }
          setNotice('')
          setHistory((prev) => [color, ...prev.filter((c) => c !== color)].slice(0, 6))
        }}
      >
        Open Eye Dropper
      </button>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <p>{sRGBHex || 'No color'}</p>
      <div aria-label={\`Swatch \${sRGBHex || 'empty'}\`} style={{ background: sRGBHex || '#fff' }} />
      {isPicking ? <p>Picking…</p> : null}
      {notice ? <p>{notice}</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      <ul>
        {history.map((color) => (
          <li key={color}>{color}</li>
        ))}
      </ul>
    </div>
  )
}`

export const liveNativeSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function LiveNativePicker() {
  const { isSupported, sRGBHex, isPicking, error, open, reset } = useEyeDropper({
    initialValue: '#0f172a',
  })

  return (
    <div>
      <p>
        Uses the real browser EyeDropper API in a secure context. Support is limited.
        Press Escape to cancel.
      </p>
      <p>Supported: {String(isSupported)}</p>
      <button
        type="button"
        disabled={!isSupported || isPicking}
        onClick={() => {
          void open()
        }}
      >
        Open Eye Dropper
      </button>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <p>{sRGBHex || 'No color selected'}</p>
      <div
        aria-label={\`Selected color \${sRGBHex || 'none'}\`}
        style={{ width: 96, height: 96, background: sRGBHex || '#e2e8f0' }}
      />
      {isPicking ? <p>Picking…</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  )
}`

export const basicUsageSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function BasicUsage() {
  const { sRGBHex, isSupported, open } = useEyeDropper()

  return (
    <div>
      <button
        type="button"
        disabled={!isSupported}
        onClick={async () => {
          const color = await open()
          if (color == null) return
        }}
      >
        Open Eye Dropper
      </button>
      <p>{sRGBHex || 'Pick a color'}</p>
    </div>
  )
}`

export const initialColorSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function InitialColor() {
  const { sRGBHex, open, reset } = useEyeDropper({
    initialValue: '#22c55e',
  })

  return (
    <div>
      <p>Seeded: {sRGBHex}</p>
      <button type="button" onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <button type="button" onClick={() => reset()}>
        Reset to initial
      </button>
    </div>
  )
}`

export const paletteBuilderSnippet = `import { useState } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

export function PaletteBuilder() {
  const { open, isSupported } = useEyeDropper()
  const [palette, setPalette] = useState<string[]>([])

  return (
    <div>
      <button
        type="button"
        disabled={!isSupported}
        onClick={async () => {
          const color = await open()
          if (color) setPalette((prev) => [...prev, color].slice(-8))
        }}
      >
        Sample into palette
      </button>
      <ul>
        {palette.map((color) => (
          <li key={color}>{color}</li>
        ))}
      </ul>
    </div>
  )
}`

export const themeTokensSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function ThemeTokens() {
  const brand = useEyeDropper({ initialValue: '#2563eb' })
  const accent = useEyeDropper({ initialValue: '#f59e0b' })

  return (
    <div>
      <button type="button" onClick={() => void brand.open()}>
        Sample brand
      </button>
      <button type="button" onClick={() => void accent.open()}>
        Sample accent
      </button>
      <p style={{ ['--brand' as string]: brand.sRGBHex, color: 'var(--brand)' }}>
        Brand {brand.sRGBHex}
      </p>
      <p style={{ ['--accent' as string]: accent.sRGBHex, color: 'var(--accent)' }}>
        Accent {accent.sRGBHex}
      </p>
    </div>
  )
}`

export const gradientDesignerSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function GradientDesigner() {
  const start = useEyeDropper({ initialValue: '#0ea5e9' })
  const end = useEyeDropper({ initialValue: '#a855f7' })

  return (
    <div>
      <button type="button" onClick={() => void start.open()}>
        Start color
      </button>
      <button type="button" onClick={() => void end.open()}>
        End color
      </button>
      <div
        aria-label={\`Gradient from \${start.sRGBHex} to \${end.sRGBHex}\`}
        style={{
          height: 120,
          background: \`linear-gradient(90deg, \${start.sRGBHex}, \${end.sRGBHex})\`,
        }}
      />
    </div>
  )
}`

export const contrastPreviewSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

function luminance(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}

function contrastRatio(a: string, b: string) {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return null
  const L1 = luminance(a)
  const L2 = luminance(b)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function ContrastPreview() {
  const fg = useEyeDropper({ initialValue: '#0f172a' })
  const bg = useEyeDropper({ initialValue: '#f8fafc' })
  const ratio = contrastRatio(fg.sRGBHex, bg.sRGBHex)

  return (
    <div>
      <button type="button" onClick={() => void fg.open()}>
        Sample text color
      </button>
      <button type="button" onClick={() => void bg.open()}>
        Sample background
      </button>
      <p style={{ color: fg.sRGBHex, background: bg.sRGBHex, padding: 16 }}>
        Preview text
      </p>
      <p>Contrast ratio: {ratio == null ? 'n/a' : ratio.toFixed(2)}:1</p>
    </div>
  )
}`

export const userCancellationSnippet = `import { useState } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

export function UserCancellation() {
  const { open, error } = useEyeDropper()
  const [cancelled, setCancelled] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const color = await open()
          setCancelled(color == null && error == null)
        }}
      >
        Open Eye Dropper
      </button>
      {cancelled ? <p>Cancelled with Escape (normal).</p> : null}
    </div>
  )
}`

export const permissionRequiredSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function PermissionRequired() {
  const { open, error, sRGBHex } = useEyeDropper({
    onError: (err) => {
      console.info('picker error', err.name)
    },
  })

  return (
    <div>
      <button type="button" onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <p>{sRGBHex || 'No color'}</p>
      {error ? <p role="alert">{error.name}: {error.message}</p> : null}
    </div>
  )
}`

export const operationFailureSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function OperationFailure() {
  const { open, error, reset, sRGBHex } = useEyeDropper()

  return (
    <div>
      <button type="button" onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <button type="button" onClick={() => reset()}>
        Clear error
      </button>
      <p>{sRGBHex || 'No color'}</p>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  )
}`

export const externalAbortSnippet = `import { useRef } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

export function ExternalAbort() {
  const controllerRef = useRef<AbortController | null>(null)
  const { open, isPicking, sRGBHex } = useEyeDropper()

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          controllerRef.current?.abort()
          controllerRef.current = new AbortController()
          void open({ signal: controllerRef.current.signal })
        }}
      >
        Open with AbortSignal
      </button>
      <button
        type="button"
        disabled={!isPicking}
        onClick={() => controllerRef.current?.abort()}
      >
        Abort externally
      </button>
      <p>{sRGBHex || 'No color'}</p>
    </div>
  )
}`

export const cancelControlSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function CancelControl() {
  const { open, cancel, isPicking, sRGBHex } = useEyeDropper()

  return (
    <div>
      <button type="button" onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <button type="button" disabled={!isPicking} onClick={() => cancel()}>
        Cancel
      </button>
      <p>{isPicking ? 'Picking…' : sRGBHex || 'Idle'}</p>
    </div>
  )
}`

export const overlappingRequestsSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function OverlappingRequests() {
  const { open, sRGBHex, isPicking } = useEyeDropper()

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void open()
          void open()
        }}
      >
        Open twice quickly
      </button>
      <p>{isPicking ? 'Latest attempt active' : sRGBHex || 'Idle'}</p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

export function EnabledState() {
  const [enabled, setEnabled] = useState(true)
  const { open, sRGBHex, isPicking } = useEyeDropper({ enabled })

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <button type="button" disabled={!enabled} onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <p>{isPicking ? 'Picking…' : sRGBHex || 'Idle'}</p>
    </div>
  )
}`

export const unsupportedSnippet = `import { useEyeDropper } from '@muradyanvano/react-hooks'

export function UnsupportedBrowser() {
  const { isSupported, open, sRGBHex } = useEyeDropper({
    window: null,
  })

  return (
    <div>
      <p>Supported: {String(isSupported)}</p>
      <button type="button" disabled={!isSupported} onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <p>{sRGBHex || 'Unavailable'}</p>
      {!isSupported ? (
        <p>EyeDropper is unavailable in this context.</p>
      ) : null}
    </div>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

export function Playground() {
  const [treatAbortAsError, setTreatAbortAsError] = useState(false)
  const { isSupported, sRGBHex, isPicking, error, open, cancel, reset } =
    useEyeDropper({
      initialValue: '#64748b',
      treatAbortAsError,
    })

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={treatAbortAsError}
          onChange={(event) => setTreatAbortAsError(event.target.checked)}
        />
        treatAbortAsError
      </label>
      <button type="button" disabled={!isSupported} onClick={() => void open()}>
        Open Eye Dropper
      </button>
      <button type="button" disabled={!isPicking} onClick={() => cancel()}>
        Cancel
      </button>
      <button type="button" onClick={() => reset()}>
        Reset
      </button>
      <p>{sRGBHex}</p>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  )
}`
