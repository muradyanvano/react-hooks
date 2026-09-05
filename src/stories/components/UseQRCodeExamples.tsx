import { useMemo, useState } from 'react'
import {
  useQRCode,
  type UseQRCodeErrorCorrectionLevel,
  type UseQRCodeOptions,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  SAMPLE_GENERATOR_TEXT,
  SAMPLE_PLAIN_TEXT,
  SAMPLE_UNICODE_TEXT,
} from './useQRCode.fictional'
import {
  customColorsSnippet,
  enabledStateSnippet,
  errorCorrectionSnippet,
  imageFormatSnippet,
  invalidConfigSnippet,
  manualGenerationSnippet,
  marginComparisonSnippet,
  plainTextUnicodeSnippet,
  playgroundSnippet,
  qrCodeGeneratorSnippet,
  rapidInputSnippet,
  widthScaleSnippet,
} from './useQRCode.snippets'

function getByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function TrustBanner() {
  return (
    <div
      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
      data-testid="trust-banner"
    >
      <p className="font-semibold">Scanning does not make content trusted</p>
      <p className="mt-1 leading-5">
        A QR code only encodes text. Scanning does not validate URLs, contacts,
        Wi-Fi credentials, or calendar invites. Treat scanned payloads as
        untrusted input.
      </p>
    </div>
  )
}

function QrFrame({
  dataUrl,
  alt,
  size = 220,
  testId,
  emptyLabel = 'No QR image yet',
}: {
  dataUrl: string
  alt: string
  size?: number
  testId: string
  emptyLabel?: string
}) {
  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-600"
        style={{ width: size, height: size }}
        data-testid={`${testId}-empty`}
        role="status"
      >
        {emptyLabel}
      </div>
    )
  }

  return (
    <div
      className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-2"
      data-testid={`${testId}-frame`}
    >
      <img
        src={dataUrl}
        alt={alt}
        width={size}
        height={size}
        className="block rounded-lg bg-white"
        style={{ imageRendering: 'pixelated' }}
        data-testid={testId}
      />
    </div>
  )
}

function QrStatusText({
  text,
  isLoading,
  error,
  testIdPrefix,
}: {
  text: string
  isLoading: boolean
  error: Error | null
  testIdPrefix: string
}) {
  if (error) {
    return (
      <p
        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
        role="alert"
        data-testid={`${testIdPrefix}-error`}
      >
        Error: {error.message}
      </p>
    )
  }

  if (text === '') {
    return (
      <p
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        role="status"
        data-testid={`${testIdPrefix}-empty`}
      >
        Enter text to generate a QR code.
      </p>
    )
  }

  if (isLoading) {
    return (
      <p
        className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
        role="status"
        aria-live="polite"
        data-testid={`${testIdPrefix}-loading`}
      >
        Generating QR code…
      </p>
    )
  }

  return (
    <p
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      role="status"
      data-testid={`${testIdPrefix}-ready`}
    >
      QR code ready.
    </p>
  )
}

function EncodedPreview({ text, testId }: { text: string; testId: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Encoded content (exact)
      </h3>
      <pre
        className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-5 text-slate-800"
        data-testid={testId}
        tabIndex={0}
      >
        {text === '' ? '(empty)' : text}
      </pre>
    </div>
  )
}

export function QrCodeGeneratorExample() {
  const [text, setText] = useState(SAMPLE_GENERATOR_TEXT)
  const [simulateInvalid, setSimulateInvalid] = useState(false)
  const options = useMemo<UseQRCodeOptions>(
    () =>
      simulateInvalid
        ? { color: { dark: 'not-a-color' } }
        : { errorCorrectionLevel: 'M' },
    [simulateInvalid],
  )
  const { dataUrl, isLoading, error } = useQRCode(text, options)
  const charCount = text.length
  const byteCount = getByteLength(text)

  const handleCopyDataUrl = async () => {
    if (!dataUrl) return
    await navigator.clipboard.writeText(dataUrl)
  }

  return (
    <ExampleShowcase
      hookName="useQRCode"
      badge="Primary"
      title="QR code generator"
      description="Generate real QR image data URLs from editable text. Scanning does not validate or trust encoded content."
      instruction="Edit the text, review loading and empty states, simulate an invalid option, then reset the sample."
      code={qrCodeGeneratorSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Characters',
              value: String(charCount),
              testId: 'generator-char-count',
            },
            {
              label: 'UTF-8 bytes',
              value: String(byteCount),
              testId: 'generator-byte-count',
            },
            {
              label: 'State',
              value: error
                ? 'Error'
                : text === ''
                  ? 'Empty'
                  : isLoading
                    ? 'Loading'
                    : dataUrl
                      ? 'Ready'
                      : 'Idle',
              testId: 'generator-state',
            },
          ]}
        />
      }
    >
      <TrustBanner />
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">
          Text to encode
        </span>
        <textarea
          className="min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm leading-6 text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Text to encode"
          data-testid="generator-text-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          data-testid="generator-reset"
          onClick={() => {
            setText(SAMPLE_GENERATOR_TEXT)
            setSimulateInvalid(false)
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          data-testid="generator-simulate-error"
          onClick={() => setSimulateInvalid(true)}
        >
          Simulate invalid options
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          data-testid="generator-copy-data-url"
          disabled={!dataUrl}
          onClick={() => void handleCopyDataUrl()}
        >
          Copy data URL
        </button>
        <a
          href={dataUrl || undefined}
          download="qr-code.png"
          className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            dataUrl ? '' : 'pointer-events-none opacity-50'
          }`}
          data-testid="generator-download"
          aria-disabled={!dataUrl}
        >
          Download PNG
        </a>
      </div>
      <QrStatusText
        text={text}
        isLoading={isLoading}
        error={error}
        testIdPrefix="generator"
      />
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <QrFrame
          dataUrl={dataUrl}
          alt="Generated QR code preview for editable text"
          size={256}
          testId="generator-qr"
          emptyLabel="QR preview will appear here"
        />
        <EncodedPreview text={text} testId="generator-encoded-preview" />
      </div>
    </ExampleShowcase>
  )
}

export function PlainTextUnicodeExample() {
  const plain = useQRCode(SAMPLE_PLAIN_TEXT)
  const unicode = useQRCode(SAMPLE_UNICODE_TEXT)

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Plain text and Unicode"
      description="Text is encoded exactly as provided. Unicode uses UTF-8 bytes and may increase QR version."
      instruction="Compare ASCII plain text with a multi-script Unicode sample."
      code={plainTextUnicodeSnippet}
    >
      <TrustBanner />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Plain text</h3>
          <QrStatusText
            text={SAMPLE_PLAIN_TEXT}
            isLoading={plain.isLoading}
            error={plain.error}
            testIdPrefix="plain"
          />
          <QrFrame
            dataUrl={plain.dataUrl}
            alt="QR code for plain ASCII text sample"
            testId="plain-qr"
          />
          <pre
            className="font-mono text-xs text-slate-700"
            data-testid="plain-text"
          >
            {SAMPLE_PLAIN_TEXT}
          </pre>
        </section>
        <section className="space-y-3 rounded-xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Unicode</h3>
          <QrStatusText
            text={SAMPLE_UNICODE_TEXT}
            isLoading={unicode.isLoading}
            error={unicode.error}
            testIdPrefix="unicode"
          />
          <QrFrame
            dataUrl={unicode.dataUrl}
            alt="QR code for Unicode text with café, Japanese, and emoji"
            testId="unicode-qr"
          />
          <pre
            className="font-mono text-xs text-slate-700"
            data-testid="unicode-text"
          >
            {SAMPLE_UNICODE_TEXT}
          </pre>
          <p className="text-xs text-slate-600">
            Byte length: {getByteLength(SAMPLE_UNICODE_TEXT)} (characters:{' '}
            {SAMPLE_UNICODE_TEXT.length})
          </p>
        </section>
      </div>
    </ExampleShowcase>
  )
}

export function ErrorCorrectionExample() {
  const text = 'Compare error correction levels'
  const low = useQRCode(text, { errorCorrectionLevel: 'L', width: 160 })
  const medium = useQRCode(text, { errorCorrectionLevel: 'M', width: 160 })
  const high = useQRCode(text, { errorCorrectionLevel: 'H', width: 160 })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Error-correction comparison"
      description="Higher correction adds redundancy and module density. Default is M."
      instruction="Compare L, M, and H at the same output width."
      code={errorCorrectionSnippet}
    >
      <p className="text-sm text-slate-600">
        Use H for logos or damaged print. L fits more data but tolerates fewer
        damaged modules — not recommended for small printed codes.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ['L (low)', low, 'low'],
            ['M (medium)', medium, 'medium'],
            ['H (high)', high, 'high'],
          ] as const
        ).map(([label, result, key]) => (
          <section
            key={key}
            className="space-y-2 rounded-xl border border-slate-200 p-3 text-center"
          >
            <h3
              className="text-sm font-semibold text-slate-800"
              data-testid={`ec-label-${key}`}
            >
              {label}
            </h3>
            <QrFrame
              dataUrl={result.dataUrl}
              alt={`QR code with ${label} error correction`}
              size={160}
              testId={`ec-qr-${key}`}
            />
          </section>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function WidthScaleExample() {
  const byWidth = useQRCode('Width 320px output', { width: 320 })
  const byScale = useQRCode('Scale 6 modules', { scale: 6 })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Width and scale"
      description="Use width for predictable pixel output, or scale for module pixel size."
      instruction="Compare fixed width with scale-based module sizing."
      code={widthScaleSnippet}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2 rounded-xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold" data-testid="width-label">
            width: 320
          </h3>
          <QrFrame
            dataUrl={byWidth.dataUrl}
            alt="QR code rendered at 320 pixels width"
            size={320}
            testId="width-qr"
          />
        </section>
        <section className="space-y-2 rounded-xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold" data-testid="scale-label">
            scale: 6
          </h3>
          <QrFrame
            dataUrl={byScale.dataUrl}
            alt="QR code with module scale factor 6"
            size={200}
            testId="scale-qr"
          />
        </section>
      </div>
    </ExampleShowcase>
  )
}

export function MarginComparisonExample() {
  const text = 'Quiet zone comparison'
  const tight = useQRCode(text, { margin: 0, width: 180 })
  const comfortable = useQRCode(text, { margin: 4, width: 180 })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Margin / quiet-zone comparison"
      description="Margin is the quiet zone around modules. Default margin is 4 modules."
      instruction="Compare zero margin with the default quiet zone."
      code={marginComparisonSnippet}
    >
      <p className="text-sm text-slate-600">
        Too little quiet zone can cause scan failures on some readers. Margin 0
        is shown for comparison — prefer the default for production codes.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2 rounded-xl border border-slate-200 p-3">
          <h3
            className="text-sm font-semibold"
            data-testid="margin-tight-label"
          >
            margin: 0 (not recommended)
          </h3>
          <QrFrame
            dataUrl={tight.dataUrl}
            alt="QR code with zero quiet zone margin"
            size={180}
            testId="margin-tight-qr"
          />
        </section>
        <section className="space-y-2 rounded-xl border border-slate-200 p-3">
          <h3
            className="text-sm font-semibold"
            data-testid="margin-default-label"
          >
            margin: 4 (default)
          </h3>
          <QrFrame
            dataUrl={comfortable.dataUrl}
            alt="QR code with default four-module quiet zone"
            size={180}
            testId="margin-default-qr"
          />
        </section>
      </div>
    </ExampleShowcase>
  )
}

export function CustomColorsExample() {
  const { dataUrl, isLoading, error } = useQRCode('High contrast colors', {
    color: { dark: '#0f172a', light: '#f8fafc' },
    errorCorrectionLevel: 'H',
    width: 220,
  })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Custom colors with high contrast"
      description="Dark and light hex colors customize module and background colors."
      instruction="Review a high-contrast palette suitable for reliable scanning."
      code={customColorsSnippet}
    >
      <p className="text-sm text-slate-600">
        Low-contrast brand colors reduce scan reliability. Pair dark modules
        with a light background and test on real devices.
      </p>
      <QrStatusText
        text="High contrast colors"
        isLoading={isLoading}
        error={error}
        testIdPrefix="colors"
      />
      <QrFrame
        dataUrl={dataUrl}
        alt="High contrast QR code with slate dark modules on light background"
        testId="colors-qr"
      />
    </ExampleShowcase>
  )
}

export function ImageFormatExample() {
  const text = 'Format comparison'
  const png = useQRCode(text, { type: 'image/png', width: 160 })
  const jpeg = useQRCode(text, {
    type: 'image/jpeg',
    quality: 0.92,
    width: 160,
  })
  const webp = useQRCode(text, {
    type: 'image/webp',
    quality: 0.92,
    width: 160,
  })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Image format comparison"
      description="PNG is lossless. JPEG and WebP may blur modules — prefer PNG for QR output."
      instruction="Compare PNG, JPEG, and WebP data URL prefixes at the same width."
      code={imageFormatSnippet}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ['PNG (recommended)', png, 'png'],
            ['JPEG', jpeg, 'jpeg'],
            ['WebP', webp, 'webp'],
          ] as const
        ).map(([label, result, key]) => (
          <section
            key={key}
            className="space-y-2 rounded-xl border border-slate-200 p-3"
          >
            <h3 className="text-sm font-semibold" data-testid={`format-${key}`}>
              {label}
            </h3>
            <QrFrame
              dataUrl={result.dataUrl}
              alt={`QR code exported as ${label}`}
              size={160}
              testId={`format-qr-${key}`}
            />
            <p
              className="break-all font-mono text-[10px] text-slate-600"
              data-testid={`format-prefix-${key}`}
            >
              {result.dataUrl.slice(0, 30)}…
            </p>
          </section>
        ))}
      </div>
    </ExampleShowcase>
  )
}

export function ManualGenerationExample() {
  const [text, setText] = useState('Draft payload')
  const { dataUrl, isLoading, error, generate } = useQRCode(text, {
    enabled: false,
  })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Manual generation"
      description="When enabled is false, automatic generation is skipped. Call generate() explicitly."
      instruction="Edit the draft text, then click Generate to encode on demand."
      code={manualGenerationSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Automatic',
              value: 'disabled',
              testId: 'manual-auto',
            },
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'manual-loading',
            },
          ]}
        />
      }
    >
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Draft text</span>
        <textarea
          className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Draft text"
          data-testid="manual-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-testid="manual-generate"
        onClick={() => void generate()}
      >
        Generate
      </button>
      <QrStatusText
        text={dataUrl ? text : ''}
        isLoading={isLoading}
        error={error}
        testIdPrefix="manual"
      />
      <QrFrame
        dataUrl={dataUrl}
        alt="Manually generated QR code from draft text"
        testId="manual-qr"
        emptyLabel="Click Generate to create a QR code"
      />
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const { dataUrl, isLoading } = useQRCode('Enabled toggle demo', { enabled })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Enabled state"
      description="enabled: false clears automatic output. Manual generate() still works in other examples."
      instruction="Toggle automatic generation and observe output clearing."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'enabled',
              value: String(enabled),
              testId: 'enabled-value',
            },
            {
              label: 'has dataUrl',
              value: String(Boolean(dataUrl)),
              testId: 'enabled-has-url',
            },
          ]}
        />
      }
    >
      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={enabled}
          data-testid="enabled-toggle"
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Automatic generation enabled
      </label>
      {enabled ? (
        <>
          {isLoading ? (
            <p role="status" data-testid="enabled-loading">
              Generating…
            </p>
          ) : null}
          <QrFrame
            dataUrl={dataUrl}
            alt="QR code while automatic generation is enabled"
            testId="enabled-qr"
          />
        </>
      ) : (
        <p
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          role="status"
          data-testid="enabled-disabled-message"
        >
          Automatic output cleared while disabled.
        </p>
      )}
    </ExampleShowcase>
  )
}

export function InvalidConfigExample() {
  const [useBadColor, setUseBadColor] = useState(true)
  const { dataUrl, error } = useQRCode('Recover me', {
    color: useBadColor
      ? { dark: 'not-a-color' }
      : { dark: '#111827', light: '#ffffff' },
    width: 200,
  })

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Invalid configuration / error recovery"
      description="Invalid options surface synchronous validation errors without throwing."
      instruction="Fix the invalid color option and confirm the QR recovers."
      code={invalidConfigSnippet}
    >
      <button
        type="button"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-testid="invalid-fix"
        onClick={() => setUseBadColor(false)}
      >
        Fix configuration
      </button>
      {error ? (
        <p
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
          data-testid="invalid-error"
        >
          {error.message}
        </p>
      ) : (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
          data-testid="invalid-recovered"
        >
          Configuration valid — QR recovered.
        </p>
      )}
      <QrFrame
        dataUrl={dataUrl}
        alt="QR code after fixing invalid configuration"
        testId="invalid-qr"
        emptyLabel="Waiting for valid configuration"
      />
    </ExampleShowcase>
  )
}

export function RapidInputExample() {
  const [text, setText] = useState('alpha')
  const { dataUrl, isLoading } = useQRCode(text)

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Rapid input changes"
      description="In-flight generations are cancelled so the newest text owns the result."
      instruction="Type quickly or use the sample buttons — the preview should match the latest text."
      code={rapidInputSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Latest text',
              value: text,
              testId: 'rapid-latest',
            },
            {
              label: 'Loading',
              value: String(isLoading),
              testId: 'rapid-loading',
            },
          ]}
        />
      }
    >
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label="Rapid input"
        data-testid="rapid-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          data-testid="rapid-beta"
          onClick={() => setText('beta')}
        >
          Set beta
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          data-testid="rapid-gamma"
          onClick={() => setText('gamma-final')}
        >
          Set gamma-final
        </button>
      </div>
      {isLoading ? (
        <p role="status" data-testid="rapid-generating">
          Generating…
        </p>
      ) : null}
      <QrFrame
        dataUrl={dataUrl}
        alt="QR code reflecting the latest rapid input value"
        testId="rapid-qr"
      />
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  initialText = 'Playground sample',
  initialMargin = 4,
  initialCorrection = 'M' as UseQRCodeErrorCorrectionLevel,
}: {
  initialText?: string
  initialMargin?: number
  initialCorrection?: UseQRCodeErrorCorrectionLevel
}) {
  const [mounted, setMounted] = useState(false)
  const [text, setText] = useState(initialText)
  const [margin, setMargin] = useState(initialMargin)
  const [correction, setCorrection] =
    useState<UseQRCodeErrorCorrectionLevel>(initialCorrection)

  const { dataUrl, isLoading, error } = useQRCode(text, {
    margin,
    errorCorrectionLevel: correction,
    width: 200,
  })

  if (!mounted) {
    return (
      <ExampleShowcase
        hookName="useQRCode"
        title="Playground"
        description="Docs-safe playground. Mount explicitly before generating QR codes."
        instruction="Click Mount playground, then edit text and options."
        code={playgroundSnippet}
      >
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          data-testid="playground-mount"
          onClick={() => setMounted(true)}
        >
          Mount playground
        </button>
      </ExampleShowcase>
    )
  }

  return (
    <ExampleShowcase
      hookName="useQRCode"
      title="Playground"
      description="Interactive text and encoding options with live QR preview."
      instruction="Edit text, margin, and error correction. Scanning does not trust content."
      code={playgroundSnippet}
    >
      <TrustBanner />
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Text</span>
        <textarea
          className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Playground text"
          data-testid="playground-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-800">Margin</span>
          <input
            type="number"
            min={0}
            max={16}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Margin"
            data-testid="playground-margin"
            value={margin}
            onChange={(event) => setMargin(Number(event.target.value))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-800">Error correction</span>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Error correction level"
            data-testid="playground-correction"
            value={correction}
            onChange={(event) =>
              setCorrection(event.target.value as UseQRCodeErrorCorrectionLevel)
            }
          >
            <option value="L">L</option>
            <option value="M">M</option>
            <option value="Q">Q</option>
            <option value="H">H</option>
          </select>
        </label>
      </div>
      <QrStatusText
        text={text}
        isLoading={isLoading}
        error={error}
        testIdPrefix="playground"
      />
      <QrFrame
        dataUrl={dataUrl}
        alt="Playground QR code preview"
        testId="playground-qr"
      />
      <pre
        className="overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
        data-testid="playground-summary"
        tabIndex={0}
      >
        {JSON.stringify(
          {
            textLength: text.length,
            byteLength: getByteLength(text),
            margin,
            errorCorrectionLevel: correction,
            hasDataUrl: Boolean(dataUrl),
          },
          null,
          2,
        )}
      </pre>
    </ExampleShowcase>
  )
}
