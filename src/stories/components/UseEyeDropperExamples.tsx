import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useEyeDropper } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  installEyeDropperMock,
  type EyeDropperMockHandle,
  type EyeDropperMockMode,
} from './eyeDropperMock'
import {
  cancelControlSnippet,
  contrastPreviewSnippet,
  dashboardSnippet,
  enabledStateSnippet,
  externalAbortSnippet,
  gradientDesignerSnippet,
  initialColorSnippet,
  liveNativeSnippet,
  operationFailureSnippet,
  overlappingRequestsSnippet,
  paletteBuilderSnippet,
  permissionRequiredSnippet,
  playgroundSnippet,
  themeTokensSnippet,
  unsupportedSnippet,
  userCancellationSnippet,
} from './useEyeDropper.snippets'

const primaryButtonClass =
  'rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function luminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (rgb == null) return null
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b)
}

function contrastRatio(a: string, b: string): number | null {
  const L1 = luminance(a)
  const L2 = luminance(b)
  if (L1 == null || L2 == null) return null
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

function WithEyeDropperMock({
  children,
  mode = 'success',
  successColor = '#3b82f6',
  onReady,
}: {
  children: (handle: EyeDropperMockHandle) => ReactNode
  mode?: EyeDropperMockMode
  successColor?: string
  onReady?: ((handle: EyeDropperMockHandle) => void) | undefined
}) {
  const [handle] = useState(() =>
    installEyeDropperMock(window, { mode, successColor }),
  )

  // Install during render so children see the mock before effects run.
  // Re-install after Strict Mode cleanup (useState initializer does not re-run).
  if (!handle.isInstalled()) {
    handle.install()
  }

  useEffect(() => {
    handle.install()
    onReady?.(handle)
    return () => {
      handle.uninstall()
    }
  }, [handle, onReady])

  return <>{children(handle)}</>
}

function ColorSwatch({
  color,
  size = 'lg',
  testId,
}: {
  color: string
  size?: 'sm' | 'lg'
  testId?: string
}) {
  const dim = size === 'lg' ? 'h-28 w-28 sm:h-36 sm:w-36' : 'h-10 w-10'
  return (
    <div
      className={`${dim} rounded-xl border border-slate-200 shadow-inner motion-safe:transition-[background-color] motion-safe:duration-200`}
      style={{ backgroundColor: color || '#e2e8f0' }}
      role="img"
      aria-label={color ? `Color swatch ${color}` : 'Empty color swatch'}
      data-testid={testId}
    />
  )
}

function SupportBadge({
  isSupported,
  testId,
}: {
  isSupported: boolean
  testId: string
}) {
  return (
    <span
      className={
        isSupported
          ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800'
          : 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900'
      }
      data-testid={testId}
    >
      {isSupported ? 'Supported' : 'Unsupported'}
    </span>
  )
}

export function DashboardExample() {
  return <DashboardInner />
}

function DashboardInner() {
  const { isSupported, sRGBHex, isPicking, error, open, reset } = useEyeDropper(
    {
      initialValue: '#3b82f6',
    },
  )
  const [history, setHistory] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const rgb = useMemo(() => hexToRgb(sRGBHex), [sRGBHex])

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Eye Dropper dashboard"
      description="A polished sampling console built on the hook’s imperative open() API. History and RGB channels are example-owned — the hook only tracks the current six-digit sRGB value."
      instruction="Click Open Eye Dropper to sample a color from anywhere on screen (real browser picker when supported). Copy the hex, then Reset."
      badge="Primary"
      code={dashboardSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'dash-supported',
            },
            {
              label: 'sRGBHex',
              value: sRGBHex || '(empty)',
              testId: 'dash-hex',
            },
            {
              label: 'Picking',
              value: String(isPicking),
              testId: 'dash-picking',
            },
            {
              label: 'Error',
              value: error?.name ?? 'none',
              testId: 'dash-error',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <SupportBadge isSupported={isSupported} testId="dash-support-badge" />
        <p className="text-sm text-slate-600">
          Uses the real EyeDropper API when available. Support is limited and
          requires a secure context. Press Escape to cancel.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ColorSwatch color={sRGBHex} testId="dash-swatch" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
            <span data-testid="dash-hex-display">{sRGBHex || '—'}</span>
          </p>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-xs text-slate-500">R</dt>
              <dd data-testid="dash-r">{rgb?.r ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-xs text-slate-500">G</dt>
              <dd data-testid="dash-g">{rgb?.g ?? '—'}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-xs text-slate-500">B</dt>
              <dd data-testid="dash-b">{rgb?.b ?? '—'}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              data-testid="dash-open"
              disabled={!isSupported || isPicking}
              onClick={async () => {
                setCopied(false)
                const color = await open()
                if (color == null) {
                  setNotice('Selection cancelled.')
                  return
                }
                setNotice('')
                setHistory((prev) =>
                  [color, ...prev.filter((c) => c !== color)].slice(0, 6),
                )
              }}
            >
              Open Eye Dropper
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              data-testid="dash-copy"
              disabled={!sRGBHex}
              onClick={async () => {
                if (!sRGBHex) return
                await navigator.clipboard?.writeText(sRGBHex)
                setCopied(true)
              }}
            >
              Copy color
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              data-testid="dash-reset"
              onClick={() => {
                reset()
                setNotice('')
                setCopied(false)
              }}
            >
              Reset
            </button>
          </div>
          <div aria-live="polite" className="min-h-5 text-sm text-slate-700">
            {isPicking ? (
              <p data-testid="dash-picking-msg">Picking color…</p>
            ) : null}
            {notice ? <p data-testid="dash-notice">{notice}</p> : null}
            {copied ? <p data-testid="dash-copied">Copied {sRGBHex}</p> : null}
            {error ? (
              <p role="alert" data-testid="dash-error-msg">
                {error.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800">Recent colors</h3>
        <ul
          className="mt-2 flex flex-wrap gap-2"
          data-testid="dash-history"
          aria-label="Recent colors"
        >
          {history.length === 0 ? (
            <li className="text-sm text-slate-500">No samples yet</li>
          ) : (
            history.map((color) => (
              <li key={color}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  aria-label={`History color ${color}`}
                  onClick={() => void navigator.clipboard?.writeText(color)}
                >
                  <span
                    className="inline-block size-4 rounded border border-slate-200"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="font-mono">{color}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </ExampleShowcase>
  )
}

export function LiveNativeExample() {
  const { isSupported, sRGBHex, isPicking, error, open, reset } = useEyeDropper(
    {
      initialValue: '#0f172a',
    },
  )

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Live native picker"
      description="Uses the real browser EyeDropper API. Automated tests never click Open — only interact manually in a supported secure-context browser."
      instruction="If supported, click Open Eye Dropper to sample anywhere on screen. Press Escape to cancel. Unsupported browsers stay idle."
      badge="Live API"
      code={liveNativeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'live-supported',
            },
            {
              label: 'sRGBHex',
              value: sRGBHex || '(empty)',
              testId: 'live-hex',
            },
            {
              label: 'Picking',
              value: String(isPicking),
              testId: 'live-picking',
            },
          ]}
        />
      }
    >
      {!isSupported ? (
        <p
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950"
          data-testid="live-unsupported-help"
        >
          EyeDropper is not available here. Use a Chromium-based browser in a
          secure context. This story does not claim unsupported browsers can
          sample colors.
        </p>
      ) : (
        <p className="text-sm text-slate-600" data-testid="live-supported-help">
          Secure-context browsers with EyeDropper support can sample the full
          screen. Escape cancels selection.
        </p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ColorSwatch color={sRGBHex} testId="live-swatch" />
        <div className="space-y-3">
          <p
            className="font-mono text-xl font-semibold"
            data-testid="live-hex-display"
          >
            {sRGBHex || 'No color selected'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              data-testid="live-open"
              disabled={!isSupported || isPicking}
              onClick={() => {
                void open()
              }}
            >
              Open Eye Dropper
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              data-testid="live-reset"
              onClick={() => reset()}
            >
              Reset
            </button>
          </div>
          <div aria-live="polite" className="text-sm">
            {isPicking ? <p data-testid="live-picking-msg">Picking…</p> : null}
            {error ? (
              <p role="alert" data-testid="live-error">
                {error.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </ExampleShowcase>
  )
}

function NativeExample({
  title,
  description,
  instruction,
  code,
  initialValue,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  initialValue?: string
  children?: (api: ReturnType<typeof useEyeDropper>) => ReactNode
}) {
  return (
    <NativeExampleInner
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      {...(initialValue !== undefined ? { initialValue } : {})}
      {...(children !== undefined ? { children } : {})}
    />
  )
}

function NativeExampleInner({
  title,
  description,
  instruction,
  code,
  initialValue,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  initialValue?: string
  children?: (api: ReturnType<typeof useEyeDropper>) => ReactNode
}) {
  const api = useEyeDropper(
    initialValue === undefined ? undefined : { initialValue },
  )
  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      aside={
        <StatusPanel
          items={[
            { label: 'Supported', value: String(api.isSupported) },
            {
              label: 'sRGBHex',
              value: api.sRGBHex || '(empty)',
              testId: 'ex-hex',
            },
            {
              label: 'Picking',
              value: String(api.isPicking),
              testId: 'ex-picking',
            },
          ]}
        />
      }
    >
      {children ? (
        children(api)
      ) : (
        <DefaultPickerControls api={api} openTestId="ex-open" />
      )}
    </ExampleShowcase>
  )
}

function DefaultPickerControls({
  api,
  openTestId,
}: {
  api: ReturnType<typeof useEyeDropper>
  openTestId: string
}) {
  return (
    <div className="space-y-3">
      <ColorSwatch color={api.sRGBHex} testId="ex-swatch" />
      <p className="font-mono text-lg" data-testid="ex-hex-display">
        {api.sRGBHex || 'No color'}
      </p>
      <button
        type="button"
        className={primaryButtonClass}
        data-testid={openTestId}
        disabled={!api.isSupported || api.isPicking}
        onClick={() => {
          void api.open()
        }}
      >
        Open Eye Dropper
      </button>
      {api.isPicking ? <p data-testid="ex-picking-msg">Picking…</p> : null}
      {api.error ? (
        <p role="alert" data-testid="ex-error">
          {api.error.message}
        </p>
      ) : null}
    </div>
  )
}

export function InitialColorExample() {
  return (
    <NativeExample
      title="Initial color"
      description="initialValue seeds sRGBHex once. reset() restores the latest committed initial value."
      instruction="Open to sample, then Reset to restore #22c55e."
      code={initialColorSnippet}
      initialValue="#22c55e"
    >
      {(api) => (
        <div className="space-y-3">
          <ColorSwatch color={api.sRGBHex} testId="init-swatch" />
          <p className="font-mono" data-testid="init-hex">
            {api.sRGBHex}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              data-testid="init-open"
              disabled={!api.isSupported || api.isPicking}
              onClick={() => void api.open()}
            >
              Open Eye Dropper
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              data-testid="init-reset"
              onClick={() => api.reset()}
            >
              Reset to initial
            </button>
          </div>
        </div>
      )}
    </NativeExample>
  )
}

export function PaletteBuilderExample() {
  return <PaletteBuilderInner />
}

function PaletteBuilderInner() {
  const { open, isSupported, isPicking } = useEyeDropper()
  const [palette, setPalette] = useState<string[]>([])

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Color palette builder"
      description="Accumulate sampled colors in consumer-owned state. The hook does not persist a palette."
      instruction="Sample several times with the real picker — each selection is added to the palette."
      code={paletteBuilderSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="palette-open"
          disabled={!isSupported || isPicking}
          onClick={async () => {
            const color = await open()
            if (color) setPalette((prev) => [...prev, color].slice(-8))
          }}
        >
          Sample into palette
        </button>
      </div>
      <ul
        className="mt-4 flex flex-wrap gap-2"
        data-testid="palette-list"
        aria-label="Palette"
      >
        {palette.map((color) => (
          <li key={`${color}-${palette.indexOf(color)}`}>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-sm">
              <span
                className="size-4 rounded"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="font-mono">{color}</span>
            </span>
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}

export function ThemeTokensExample() {
  return <ThemeTokensInner />
}

function ThemeTokensInner() {
  const brand = useEyeDropper({ initialValue: '#2563eb' })
  const accent = useEyeDropper({ initialValue: '#f59e0b' })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="CSS theme tokens"
      description="Two independent hook instances drive CSS custom properties for brand and accent."
      instruction="Sample brand or accent with the real picker. Instances stay isolated."
      code={themeTokensSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="theme-brand"
          disabled={!brand.isSupported || brand.isPicking}
          onClick={() => void brand.open()}
        >
          Sample brand
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="theme-accent"
          disabled={!accent.isSupported || accent.isPicking}
          onClick={() => void accent.open()}
        >
          Sample accent
        </button>
      </div>
      <p
        className="mt-4 text-lg font-semibold text-slate-900"
        data-testid="theme-brand-text"
      >
        Brand{' '}
        <span className="inline-flex items-center gap-2 font-mono text-slate-800">
          <span
            className="inline-block size-4 rounded border border-slate-300"
            style={{ backgroundColor: brand.sRGBHex }}
            aria-hidden="true"
          />
          {brand.sRGBHex}
        </span>
      </p>
      <p
        className="text-lg font-semibold text-slate-900"
        data-testid="theme-accent-text"
      >
        Accent{' '}
        <span className="inline-flex items-center gap-2 font-mono text-slate-800">
          <span
            className="inline-block size-4 rounded border border-slate-300"
            style={{ backgroundColor: accent.sRGBHex }}
            aria-hidden="true"
          />
          {accent.sRGBHex}
        </span>
      </p>
    </ExampleShowcase>
  )
}

export function GradientDesignerExample() {
  return <GradientInner />
}

function GradientInner() {
  const start = useEyeDropper({ initialValue: '#0ea5e9' })
  const end = useEyeDropper({ initialValue: '#a855f7' })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Gradient designer"
      description="Compose a CSS gradient from two independently sampled endpoints."
      instruction="Adjust start and end colors with Open Eye Dropper on each control."
      code={gradientDesignerSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="grad-start"
          disabled={!start.isSupported || start.isPicking}
          onClick={() => void start.open()}
        >
          Start color
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="grad-end"
          disabled={!end.isSupported || end.isPicking}
          onClick={() => void end.open()}
        >
          End color
        </button>
      </div>
      <div
        className="mt-4 h-28 rounded-xl border border-slate-200"
        style={{
          background: `linear-gradient(90deg, ${start.sRGBHex}, ${end.sRGBHex})`,
        }}
        role="img"
        aria-label={`Gradient from ${start.sRGBHex} to ${end.sRGBHex}`}
        data-testid="grad-preview"
      />
      <p className="mt-2 font-mono text-sm" data-testid="grad-labels">
        {start.sRGBHex} → {end.sRGBHex}
      </p>
    </ExampleShowcase>
  )
}

export function ContrastPreviewExample() {
  return <ContrastInner />
}

function ContrastInner() {
  const fg = useEyeDropper({ initialValue: '#0f172a' })
  const bg = useEyeDropper({ initialValue: '#f8fafc' })
  const ratio = contrastRatio(fg.sRGBHex, bg.sRGBHex)

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Contrast preview"
      description="Story-only WCAG contrast math labels the ratio. Contrast is not part of the public hook."
      instruction="Sample text and background colors, then read the computed ratio."
      code={contrastPreviewSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="contrast-fg"
          disabled={!fg.isSupported || fg.isPicking}
          onClick={() => void fg.open()}
        >
          Sample text color
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="contrast-bg"
          disabled={!bg.isSupported || bg.isPicking}
          onClick={() => void bg.open()}
        >
          Sample background
        </button>
      </div>
      <p
        className="mt-4 rounded-xl px-4 py-6 text-lg font-medium"
        style={{ color: fg.sRGBHex, backgroundColor: bg.sRGBHex }}
        data-testid="contrast-preview"
      >
        Preview text on sampled background
      </p>
      <p className="mt-2 text-sm text-slate-700" data-testid="contrast-ratio">
        Contrast ratio: {ratio == null ? 'n/a' : `${ratio.toFixed(2)}:1`}
        {ratio != null && ratio >= 4.5 ? ' (AA for normal text)' : ''}
      </p>
    </ExampleShowcase>
  )
}

export function UserCancellationExample() {
  return (
    <WithEyeDropperMock mode="abort">
      {() => <UserCancellationInner />}
    </WithEyeDropperMock>
  )
}

function UserCancellationInner() {
  const { open, error } = useEyeDropper()
  const [cancelled, setCancelled] = useState(false)

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="User cancellation"
      description="Escape-style AbortError is normal by default: open() resolves null, error stays null."
      instruction="Open Eye Dropper — this story uses a Storybook mock that cancels like Escape."
      badge="Mocked"
      code={userCancellationSnippet}
    >
      <button
        type="button"
        className={primaryButtonClass}
        data-testid="cancel-user-open"
        onClick={async () => {
          const color = await open()
          setCancelled(color == null && error == null)
        }}
      >
        Open Eye Dropper
      </button>
      {cancelled ? (
        <p className="mt-3 text-sm" data-testid="cancel-user-msg">
          Cancelled with Escape (normal).
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function PermissionRequiredExample() {
  return (
    <WithEyeDropperMock mode="not-allowed">
      {() => <PermissionInner />}
    </WithEyeDropperMock>
  )
}

function PermissionInner() {
  const { open, error, sRGBHex } = useEyeDropper()

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Permission required"
      description="NotAllowedError surfaces as a recoverable error. There is no permission preflight guarantee."
      instruction="Open Eye Dropper to see a mocked permission denial."
      badge="Mocked"
      code={permissionRequiredSnippet}
    >
      <button
        type="button"
        className={primaryButtonClass}
        data-testid="perm-open"
        onClick={() => void open()}
      >
        Open Eye Dropper
      </button>
      <p className="mt-2 font-mono" data-testid="perm-hex">
        {sRGBHex || 'No color'}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-2 text-sm text-rose-800"
          data-testid="perm-error"
        >
          {error.name}: {error.message}
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function OperationFailureExample() {
  return (
    <WithEyeDropperMock mode="operation">
      {(mock) => <OperationInner mock={mock} />}
    </WithEyeDropperMock>
  )
}

function OperationInner({ mock }: { mock: EyeDropperMockHandle }) {
  const { open, error, reset, sRGBHex } = useEyeDropper({
    initialValue: '#64748b',
  })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Operation failure and recovery"
      description="OperationError is reported; reset clears error and restores the initial color. Later success clears error too."
      instruction="Open to fail, Reset to clear, then switch the mock to success and open again."
      code={operationFailureSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="op-open"
          onClick={() => void open()}
        >
          Open Eye Dropper
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="op-reset"
          onClick={() => reset()}
        >
          Clear error
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="op-recover"
          onClick={() => {
            mock.setMode('success')
            mock.setSuccessColor('#10b981')
          }}
        >
          Arm success
        </button>
      </div>
      <p className="mt-2 font-mono" data-testid="op-hex">
        {sRGBHex || 'No color'}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-2 text-sm text-rose-800"
          data-testid="op-error"
        >
          {error.message}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500" data-testid="op-ok">
          No error
        </p>
      )}
    </ExampleShowcase>
  )
}

export function ExternalAbortExample() {
  return (
    <WithEyeDropperMock mode="deferred">
      {() => <ExternalAbortInner />}
    </WithEyeDropperMock>
  )
}

function ExternalAbortInner() {
  const controllerRef = useRef<AbortController | null>(null)
  const { open, isPicking, sRGBHex } = useEyeDropper()
  const [note, setNote] = useState('')

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="External AbortSignal"
      description="Pass an AbortSignal to open(). External abort forwards to the internal controller without mutating the consumer controller."
      instruction="Open with signal, then Abort externally while picking."
      code={externalAbortSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="ext-open"
          onClick={() => {
            controllerRef.current?.abort()
            controllerRef.current = new AbortController()
            setNote('Opened with signal')
            void open({ signal: controllerRef.current.signal }).then(
              (color) => {
                setNote(color == null ? 'Aborted or cancelled' : `Got ${color}`)
              },
            )
          }}
        >
          Open with AbortSignal
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="ext-abort"
          disabled={!isPicking}
          onClick={() => controllerRef.current?.abort()}
        >
          Abort externally
        </button>
      </div>
      <p className="mt-2" data-testid="ext-picking">
        {isPicking ? 'Picking…' : 'Idle'}
      </p>
      <p className="font-mono text-sm" data-testid="ext-hex">
        {sRGBHex || 'No color'}
      </p>
      <p className="text-sm" data-testid="ext-note">
        {note}
      </p>
    </ExampleShowcase>
  )
}

export function CancelControlExample() {
  return (
    <WithEyeDropperMock mode="deferred">
      {(mock) => <CancelControlInner mock={mock} />}
    </WithEyeDropperMock>
  )
}

function CancelControlInner({ mock }: { mock: EyeDropperMockHandle }) {
  const { open, cancel, isPicking, sRGBHex } = useEyeDropper({
    initialValue: '#334155',
  })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Cancel control"
      description="cancel() aborts the active internal controller without resetting sRGBHex."
      instruction="Open, Cancel while deferred, confirm the color stays."
      code={cancelControlSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="ctl-open"
          onClick={() => void open()}
        >
          Open Eye Dropper
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="ctl-cancel"
          disabled={!isPicking}
          onClick={() => cancel()}
        >
          Cancel
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="ctl-resolve"
          onClick={() => mock.resolveNext('#e11d48')}
        >
          Resolve deferred
        </button>
      </div>
      <p className="mt-2" data-testid="ctl-status">
        {isPicking ? 'Picking…' : sRGBHex || 'Idle'}
      </p>
    </ExampleShowcase>
  )
}

export function OverlappingRequestsExample() {
  return (
    <WithEyeDropperMock mode="deferred">
      {(mock) => <OverlapInner mock={mock} />}
    </WithEyeDropperMock>
  )
}

function OverlapInner({ mock }: { mock: EyeDropperMockHandle }) {
  const { open, sRGBHex, isPicking } = useEyeDropper()

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Overlapping requests"
      description="A newer open() owns state. Stale successes do not overwrite the latest color."
      instruction="Open twice, then resolve deferred attempts in order."
      code={overlappingRequestsSnippet}
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="overlap-open"
          onClick={() => {
            void open()
            void open()
          }}
        >
          Open twice quickly
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="overlap-resolve"
          onClick={() => mock.resolveNext('#7c3aed')}
        >
          Resolve next deferred
        </button>
      </div>
      <p className="mt-2" data-testid="overlap-status">
        {isPicking ? 'Latest attempt active' : sRGBHex || 'Idle'}
      </p>
      <p className="font-mono" data-testid="overlap-hex">
        {sRGBHex || '—'}
      </p>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  return <EnabledInner />
}

function EnabledInner() {
  const [enabled, setEnabled] = useState(true)
  const { open, sRGBHex, isPicking } = useEyeDropper({
    enabled,
    initialValue: '#0f766e',
  })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Enabled state"
      description="Disabling cancels active work and blocks open() without resetting the selected color."
      instruction="Toggle enabled, try opening when disabled, then re-enable."
      code={enabledStateSnippet}
    >
      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={enabled}
          data-testid="enabled-toggle"
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <button
        type="button"
        className={`${primaryButtonClass} mt-3`}
        data-testid="enabled-open"
        disabled={!enabled || isPicking}
        onClick={() => void open()}
      >
        Open Eye Dropper
      </button>
      <p className="mt-2 font-mono" data-testid="enabled-hex">
        {isPicking ? 'Picking…' : sRGBHex || 'Idle'}
      </p>
    </ExampleShowcase>
  )
}

export function UnsupportedBrowserExample() {
  const { isSupported, open, sRGBHex } = useEyeDropper({ window: null })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Unsupported browser"
      description="Explicit window: null blocks global fallback. isSupported stays false; open() returns null."
      instruction="Confirm the unsupported message and disabled control."
      code={unsupportedSnippet}
    >
      <SupportBadge isSupported={isSupported} testId="unsup-badge" />
      <p className="mt-2 text-sm" data-testid="unsup-supported">
        Supported: {String(isSupported)}
      </p>
      <button
        type="button"
        className={primaryButtonClass}
        data-testid="unsup-open"
        disabled={!isSupported}
        onClick={() => void open()}
      >
        Open Eye Dropper
      </button>
      <p className="mt-2" data-testid="unsup-hex">
        {sRGBHex || 'Unavailable'}
      </p>
      {!isSupported ? (
        <p className="mt-2 text-sm text-amber-900" data-testid="unsup-help">
          EyeDropper is unavailable in this context.
        </p>
      ) : null}
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  treatAbortAsError = false,
  mode = 'success' as EyeDropperMockMode,
}: {
  treatAbortAsError?: boolean
  mode?: EyeDropperMockMode
}) {
  return (
    <WithEyeDropperMock mode={mode} successColor="#64748b">
      {(mock) => (
        <PlaygroundInner treatAbortAsError={treatAbortAsError} mock={mock} />
      )}
    </WithEyeDropperMock>
  )
}

function PlaygroundInner({
  treatAbortAsError: treatAbortProp,
  mock,
}: {
  treatAbortAsError: boolean
  mock: EyeDropperMockHandle
}) {
  const [treatAbortAsError, setTreatAbortAsError] = useState(treatAbortProp)
  const { isSupported, sRGBHex, isPicking, error, open, cancel, reset } =
    useEyeDropper({
      initialValue: '#64748b',
      treatAbortAsError,
    })

  return (
    <ExampleShowcase
      hookName="useEyeDropper"
      title="Playground"
      description="Tweak treatAbortAsError and mock outcomes while exercising open, cancel, and reset."
      instruction="Toggle options, open the picker, cancel or let it resolve."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Supported', value: String(isSupported) },
            {
              label: 'sRGBHex',
              value: sRGBHex || '(empty)',
              testId: 'play-hex',
            },
            {
              label: 'Picking',
              value: String(isPicking),
              testId: 'play-picking',
            },
            {
              label: 'Error',
              value: error?.name ?? 'none',
              testId: 'play-error',
            },
          ]}
        />
      }
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={treatAbortAsError}
          data-testid="play-treat-abort"
          onChange={(event) => setTreatAbortAsError(event.target.checked)}
        />
        treatAbortAsError
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-mode-success"
          onClick={() => mock.setMode('success')}
        >
          Mode: success
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-mode-abort"
          onClick={() => mock.setMode('abort')}
        >
          Mode: abort
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-mode-denied"
          onClick={() => mock.setMode('not-allowed')}
        >
          Mode: denied
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          data-testid="play-open"
          disabled={!isSupported}
          onClick={() => void open()}
        >
          Open Eye Dropper
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-cancel"
          disabled={!isPicking}
          onClick={() => cancel()}
        >
          Cancel
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-reset"
          onClick={() => reset()}
        >
          Reset
        </button>
      </div>
      <ColorSwatch color={sRGBHex} testId="play-swatch" />
      {error ? (
        <p
          role="alert"
          className="text-sm text-rose-800"
          data-testid="play-error-msg"
        >
          {error.message}
        </p>
      ) : null}
    </ExampleShowcase>
  )
}
