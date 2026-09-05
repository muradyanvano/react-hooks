export const qrCodeGeneratorSnippet = `import { useState } from 'react'
import { useQRCode } from '@muradyanvano/react-hooks'

const INITIAL = 'Hello from @muradyanvano/react-hooks'

export function QrCodeGenerator() {
  const [text, setText] = useState(INITIAL)
  const { dataUrl, isLoading, error } = useQRCode(text)

  return (
    <section>
      <h2>QR code generator</h2>
      <p>Scanning a QR code does not validate or trust its content.</p>
      <label>
        Text to encode
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label="Text to encode"
        />
      </label>
      {isLoading ? <p role="status">Generating QR code…</p> : null}
      {text === '' ? <p role="status">Enter text to generate a QR code.</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      {dataUrl ? (
        <img src={dataUrl} alt="Generated QR code preview" width={256} height={256} />
      ) : null}
      <p>Characters: {text.length}</p>
      <pre>{text}</pre>
      <button type="button" onClick={() => setText(INITIAL)}>Reset</button>
      <a href={dataUrl || undefined} download="qr-code.png">Download PNG</a>
    </section>
  )
}
`

export const plainTextUnicodeSnippet = `import { useQRCode } from '@muradyanvano/react-hooks'

const TEXT = 'Unicode demo: café, 日本語, 🙂'

export function PlainTextUnicodeQr() {
  const { dataUrl, isLoading, error } = useQRCode(TEXT)

  return (
    <section>
      <p>UTF-8 text is encoded as-is. Longer Unicode strings may need higher QR versions.</p>
      {isLoading ? <p role="status">Generating…</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      {dataUrl ? (
        <img src={dataUrl} alt="QR code for Unicode text sample" width={200} height={200} />
      ) : null}
      <pre>{TEXT}</pre>
    </section>
  )
}
`

export const errorCorrectionSnippet = `import { useQRCode } from '@muradyanvano/react-hooks'

const TEXT = 'Compare error correction levels'

export function ErrorCorrectionCompare() {
  const low = useQRCode(TEXT, { errorCorrectionLevel: 'L' })
  const high = useQRCode(TEXT, { errorCorrectionLevel: 'H' })

  return (
    <section>
      <p>Higher correction adds redundancy and module density. Prefer M or H for print.</p>
      <img src={low.dataUrl} alt="QR code with low error correction" width={160} height={160} />
      <img src={high.dataUrl} alt="QR code with high error correction" width={160} height={160} />
    </section>
  )
}
`

export const widthScaleSnippet = `import { useQRCode } from '@muradyanvano/react-hooks'

export function WidthScaleQr() {
  const byWidth = useQRCode('Width 320px', { width: 320 })
  const byScale = useQRCode('Scale 6', { scale: 6 })

  return (
    <section>
      <p>Use width for predictable output size, or scale for module pixel size.</p>
      <img src={byWidth.dataUrl} alt="QR code sized to 320 pixels wide" width={320} height={320} />
      <img src={byScale.dataUrl} alt="QR code with scale factor 6" width={200} height={200} />
    </section>
  )
}
`

export const marginComparisonSnippet = `import { useQRCode } from '@muradyanvano/react-hooks'

const TEXT = 'Quiet zone comparison'

export function MarginComparison() {
  const tight = useQRCode(TEXT, { margin: 0 })
  const defaultMargin = useQRCode(TEXT, { margin: 4 })

  return (
    <section>
      <p>Margin is the quiet zone. Too little margin reduces scan reliability on some readers.</p>
      <img src={tight.dataUrl} alt="QR code with zero margin" width={180} height={180} />
      <img src={defaultMargin.dataUrl} alt="QR code with default margin" width={180} height={180} />
    </section>
  )
}
`

export const customColorsSnippet = `import { useQRCode } from '@muradyanvano/react-hooks'

export function CustomColorsQr() {
  const { dataUrl, error } = useQRCode('High contrast colors', {
    color: { dark: '#0f172a', light: '#f8fafc' },
    errorCorrectionLevel: 'H',
  })

  return (
    <section>
      <p>Keep strong contrast between modules and background for reliable scanning.</p>
      {error ? <p role="alert">{error.message}</p> : null}
      {dataUrl ? (
        <img src={dataUrl} alt="High contrast custom color QR code" width={220} height={220} />
      ) : null}
    </section>
  )
}
`

export const imageFormatSnippet = `import { useQRCode } from '@muradyanvano/react-hooks'

const TEXT = 'Format comparison'

export function ImageFormatCompare() {
  const png = useQRCode(TEXT, { type: 'image/png' })
  const webp = useQRCode(TEXT, { type: 'image/webp' })

  return (
    <section>
      <p>PNG is lossless. JPEG/WebP may blur modules — prefer PNG for QR output.</p>
      <img src={png.dataUrl} alt="PNG QR code" width={160} height={160} />
      <img src={webp.dataUrl} alt="WebP QR code" width={160} height={160} />
    </section>
  )
}
`

export const manualGenerationSnippet = `import { useState } from 'react'
import { useQRCode } from '@muradyanvano/react-hooks'

export function ManualGeneration() {
  const [text, setText] = useState('Draft payload')
  const { dataUrl, generate } = useQRCode(text, { enabled: false })

  return (
    <section>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Draft text" />
      <button type="button" onClick={() => void generate()}>Generate</button>
      {dataUrl ? (
        <img src={dataUrl} alt="Manually generated QR code" width={200} height={200} />
      ) : (
        <p role="status">Automatic generation disabled. Click Generate.</p>
      )}
    </section>
  )
}
`

export const enabledStateSnippet = `import { useState } from 'react'
import { useQRCode } from '@muradyanvano/react-hooks'

export function EnabledToggle() {
  const [enabled, setEnabled] = useState(true)
  const { dataUrl, isLoading } = useQRCode('Enabled toggle demo', { enabled })

  return (
    <section>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Automatic generation enabled
      </label>
      {isLoading ? <p role="status">Generating…</p> : null}
      {enabled && dataUrl ? (
        <img src={dataUrl} alt="QR code when automatic generation is enabled" width={200} height={200} />
      ) : (
        <p role="status">Automatic output cleared while disabled.</p>
      )}
    </section>
  )
}
`

export const invalidConfigSnippet = `import { useState } from 'react'
import { useQRCode } from '@muradyanvano/react-hooks'

export function InvalidConfigRecovery() {
  const [useBadColor, setUseBadColor] = useState(true)
  const { dataUrl, error } = useQRCode('Recover me', {
    color: useBadColor ? { dark: 'not-a-color' } : { dark: '#111827', light: '#ffffff' },
  })

  return (
    <section>
      <button type="button" onClick={() => setUseBadColor(false)}>Fix configuration</button>
      {error ? <p role="alert">{error.message}</p> : null}
      {dataUrl ? (
        <img src={dataUrl} alt="Recovered QR code after fixing options" width={200} height={200} />
      ) : null}
    </section>
  )
}
`

export const rapidInputSnippet = `import { useState } from 'react'
import { useQRCode } from '@muradyanvano/react-hooks'

export function RapidInputOwnership() {
  const [text, setText] = useState('alpha')
  const { dataUrl, isLoading } = useQRCode(text)

  return (
    <section>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Rapid input"
      />
      <p role="status">Latest text: {text}</p>
      {isLoading ? <p role="status">Generating…</p> : null}
      {dataUrl ? (
        <img src={dataUrl} alt="QR code for the latest input value" width={180} height={180} />
      ) : null}
    </section>
  )
}
`

export const playgroundSnippet = `import { useState } from 'react'
import { useQRCode } from '@muradyanvano/react-hooks'

export function QrPlayground() {
  const [mounted, setMounted] = useState(false)
  const [text, setText] = useState('Playground sample')
  const [margin, setMargin] = useState(4)
  const { dataUrl, isLoading, error } = useQRCode(text, { margin })

  if (!mounted) {
    return <button type="button" onClick={() => setMounted(true)}>Mount playground</button>
  }

  return (
    <section>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Playground text" />
      <input
        type="number"
        value={margin}
        onChange={(e) => setMargin(Number(e.target.value))}
        aria-label="Margin"
      />
      {isLoading ? <p role="status">Generating…</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      {dataUrl ? <img src={dataUrl} alt="Playground QR preview" width={200} height={200} /> : null}
    </section>
  )
}
`
