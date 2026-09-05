import { useEffect, useMemo, useRef, useState } from 'react'

import { useBase64 } from '@muradyanvano/react-hooks'
import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  Callout,
  CodeValue,
  ControlBar,
  DataValue,
  Field,
  MetricGrid,
  MetricTile,
} from './ui'
import {
  base64StudioSnippet,
  binaryBytesSnippet,
  canvasArtworkSnippet,
  customSerializerSnippet,
  dataUrlSnippet,
  enabledStateSnippet,
  errorHandlingSnippet,
  fileBlobSnippet,
  imagePreviewSnippet,
  manualExecutionSnippet,
  plainTextSnippet,
  playgroundSnippet,
  rapidChangesSnippet,
  unicodeSnippet,
} from './useBase64.snippets'

const primaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const secondaryButtonClass =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600'
const panelClass = 'rounded-xl border border-slate-200 bg-slate-50 p-3'

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function payloadFromResult(base64: string, dataUrl: boolean): string {
  if (!base64) return ''
  if (!dataUrl) return base64
  const comma = base64.indexOf(',')
  return comma >= 0 ? base64.slice(comma + 1) : base64
}

function CopyButton({
  value,
  label = 'Copy output',
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className={secondaryButtonClass}
      disabled={!value}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  )
}

function EncodingAside({
  isLoading,
  error,
  inputBytes,
  outputBytes,
  mime,
}: {
  isLoading: boolean
  error: Error | null
  inputBytes: number
  outputBytes: number
  mime: string
}) {
  return (
    <StatusPanel
      items={[
        {
          label: 'Loading',
          value: String(isLoading),
          testId: 'base64-loading',
        },
        { label: 'MIME', value: mime },
        {
          label: 'Input bytes',
          value: String(inputBytes),
          testId: 'base64-input-bytes',
        },
        {
          label: 'Output bytes',
          value: String(outputBytes),
          testId: 'base64-output-bytes',
        },
        ...(error
          ? [
              {
                label: 'Error',
                value: error.message,
                mode: 'block' as const,
                testId: 'base64-error',
              },
            ]
          : []),
      ]}
    />
  )
}

function TextExample({
  title,
  value,
  code,
  dataUrl = true,
}: {
  title: string
  value: string
  code: string
  dataUrl?: boolean
}) {
  const result = useBase64(value, { dataUrl })
  const payload = payloadFromResult(result.base64, dataUrl)

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="inspector"
      title={title}
      description="Encode fictional local data as UTF-8 Base64."
      instruction="Review the generated value and state."
      code={code}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={byteLength(value)}
          outputBytes={byteLength(payload)}
          mime={dataUrl ? 'text/plain;charset=utf-8' : 'payload only'}
        />
      }
    >
      {result.error ? (
        <Callout tone="warning" title="Encoding error">
          {result.error.message}
        </Callout>
      ) : null}
      <CodeValue
        value={result.base64 || 'Waiting for encoded value…'}
        testId="base64-output"
      />
    </ExampleShowcase>
  )
}

export function Base64StudioExample() {
  const [text, setText] = useState('Fictional release note: ready for review.')
  const [dataUrl, setDataUrl] = useState(true)
  const result = useBase64(text, { dataUrl })
  const payload = payloadFromResult(result.base64, dataUrl)
  const inputBytes = byteLength(text)
  const outputBytes = byteLength(payload)

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="inspector"
      badge="Primary"
      title="Base64 studio"
      description="Encode text into a data URL or raw payload with byte counts and copy support."
      instruction="Edit fictional text, toggle data URL mode, and inspect input versus output panes."
      code={base64StudioSnippet}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={inputBytes}
          outputBytes={outputBytes}
          mime={
            dataUrl ? 'text/plain;charset=utf-8' : 'application/octet-stream'
          }
        />
      }
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className={panelClass}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              Input workspace
            </p>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
              {inputBytes} bytes UTF-8
            </span>
          </div>
          <Field label="Source text" htmlFor="base64-studio-input">
            <textarea
              id="base64-studio-input"
              className={inputClass}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={dataUrl}
              onChange={(event) => setDataUrl(event.target.checked)}
            />
            Prefix as data URL
          </label>
        </div>

        <div className={panelClass}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              Encoded output
            </p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              {dataUrl ? 'data:text/plain;base64,' : 'raw payload'}
            </span>
          </div>

          <p
            role="status"
            aria-live="polite"
            data-testid="base64-status"
            className="mb-2 text-sm text-slate-600"
          >
            {result.isLoading
              ? 'Encoding…'
              : result.error
                ? result.error.message
                : 'Ready'}
          </p>

          {result.error ? (
            <Callout tone="warning" title="Encoding error">
              {result.error.message}
            </Callout>
          ) : (
            <>
              <CodeValue
                value={result.base64 || 'Waiting for encoded value…'}
                testId="base64-output"
              />
              <div className="mt-3 space-y-2">
                <MetricGrid columns={2}>
                  <MetricTile label="Payload bytes" value={outputBytes} />
                  <MetricTile
                    label="Representation"
                    value={dataUrl ? 'Data URL' : 'Payload'}
                  />
                </MetricGrid>
                {!dataUrl && payload ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Payload only
                    </p>
                    <DataValue
                      value={payload}
                      className="mt-1 font-mono text-xs"
                    />
                  </div>
                ) : null}
                <ControlBar label="Output actions">
                  <CopyButton value={result.base64} />
                </ControlBar>
              </div>
            </>
          )}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export const PlainTextExample = () => (
  <TextExample
    title="Plain text"
    value="Fictional project brief."
    code={plainTextSnippet}
  />
)
export const UnicodeExample = () => (
  <TextExample
    title="Unicode and emoji"
    value="Fictional café note: Վանո 🙂"
    code={unicodeSnippet}
    dataUrl={false}
  />
)
export const DataUrlExample = () => (
  <TextExample
    title="Data URL versus payload"
    value="Compare both representations."
    dataUrl={false}
    code={dataUrlSnippet}
  />
)

export function BinaryBytesExample() {
  const bytes = useMemo(() => new Uint8Array([0, 1, 2, 253, 254, 255]), [])
  const result = useBase64(bytes, { dataUrl: false })

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="dashboard"
      title="Binary bytes"
      description="Encode only the visible ArrayBufferView byte window."
      instruction="Inspect the fictional byte payload."
      code={binaryBytesSnippet}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={bytes.byteLength}
          outputBytes={byteLength(result.base64)}
          mime="application/octet-stream"
        />
      }
    >
      <MetricGrid columns={3}>
        <MetricTile label="Bytes" value={bytes.byteLength} />
        <MetricTile label="First byte" value={String(bytes[0])} />
        <MetricTile label="Last byte" value={String(bytes[bytes.length - 1])} />
      </MetricGrid>
      {result.error ? (
        <Callout tone="warning">{result.error.message}</Callout>
      ) : (
        <CodeValue
          value={result.base64 || 'Waiting for encoded value…'}
          testId="base64-output"
        />
      )}
    </ExampleShowcase>
  )
}

export function FileBlobExample() {
  const blob = useMemo(
    () => new Blob(['Fictional file content'], { type: 'text/plain' }),
    [],
  )
  const result = useBase64(blob)

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="dashboard"
      title="File and Blob"
      description="Blob MIME labels the data URL when present."
      instruction="Inspect a fictional in-memory Blob encoding."
      code={fileBlobSnippet}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={blob.size}
          outputBytes={byteLength(payloadFromResult(result.base64, true))}
          mime="text/plain"
        />
      }
    >
      <MetricGrid columns={2}>
        <MetricTile label="Blob size" value={`${blob.size} bytes`} />
        <MetricTile label="Blob type" value={blob.type || 'unknown'} />
      </MetricGrid>
      {result.error ? (
        <Callout tone="warning">{result.error.message}</Callout>
      ) : (
        <CodeValue
          value={result.base64 || 'Waiting for encoded value…'}
          testId="base64-output"
        />
      )}
    </ExampleShowcase>
  )
}

export function ImagePreviewExample() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const result = useBase64(image)

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="inspector"
      title="Image preview"
      description="A generated local image is drawn into an owning-document canvas."
      instruction="The image stays local to this example."
      code={imagePreviewSnippet}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={0}
          outputBytes={byteLength(payloadFromResult(result.base64, true))}
          mime="image/svg+xml"
        />
      }
    >
      <div className="flex flex-wrap items-start gap-4">
        <img
          ref={setImage}
          alt="Generated fictional blue square"
          width={64}
          height={64}
          className="rounded border border-slate-200"
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3C/svg%3E"
        />
        <div className="min-w-0 flex-1">
          {result.error ? (
            <Callout tone="warning">{result.error.message}</Callout>
          ) : (
            <CodeValue
              value={result.base64 || 'Encoding local image…'}
              testId="base64-output"
            />
          )}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function CanvasArtworkExample() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const current = canvasRef.current
    const context = current?.getContext('2d')
    if (context) {
      context.fillStyle = '#4f46e5'
      context.fillRect(0, 0, 96, 64)
      context.fillStyle = '#ffffff'
      context.fillRect(16, 16, 64, 32)
    }
    setCanvas(current)
  }, [])
  const result = useBase64(canvas)

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="inspector"
      title="Canvas artwork"
      description="Canvas output defaults to PNG."
      instruction="Inspect a locally generated canvas data URL."
      code={canvasArtworkSnippet}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={96 * 64}
          outputBytes={byteLength(payloadFromResult(result.base64, true))}
          mime="image/png"
        />
      }
    >
      <div className="flex flex-wrap items-start gap-4">
        <canvas
          ref={canvasRef}
          width={96}
          height={64}
          aria-label="Fictional canvas artwork"
          className="rounded border border-slate-200"
        />
        <div className="min-w-0 flex-1">
          <CodeValue
            value={result.error?.message ?? result.base64 ?? 'Encoding canvas…'}
            testId="base64-output"
          />
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function CustomSerializerExample() {
  const value = useMemo(() => ({ label: 'fictional', count: 2 }), [])
  const serialized = JSON.stringify(value)
  const result = useBase64(value, { serializer: JSON.stringify })

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="dashboard"
      title="Custom serializer"
      description="Unsupported objects require a serializer that returns a string."
      instruction="Inspect the serialized fictional object encoding."
      code={customSerializerSnippet}
      aside={
        <EncodingAside
          isLoading={result.isLoading}
          error={result.error}
          inputBytes={byteLength(serialized)}
          outputBytes={byteLength(payloadFromResult(result.base64, true))}
          mime="application/json"
        />
      }
    >
      {result.error ? (
        <Callout tone="warning">{result.error.message}</Callout>
      ) : (
        <>
          <p className="mb-2 font-mono text-xs text-slate-600">{serialized}</p>
          <CodeValue
            value={result.base64 || 'Waiting for encoded value…'}
            testId="base64-output"
          />
        </>
      )}
    </ExampleShowcase>
  )
}

export function ManualExecutionExample() {
  const result = useBase64('Fictional draft', { enabled: false })

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="form"
      title="Manual execution"
      description="Manual execution remains available while automatic encoding is disabled."
      instruction="Encode the draft on demand."
      code={manualExecutionSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Loading', value: String(result.isLoading) },
            { label: 'Enabled', value: 'false' },
          ]}
        />
      }
    >
      <ControlBar label="Manual encoding">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() => void result.execute()}
        >
          Encode now
        </button>
        <CopyButton value={result.base64} label="Copy" />
      </ControlBar>
      <CodeValue
        value={result.base64 || 'Not encoded yet'}
        testId="base64-output"
      />
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const result = useBase64('Fictional enabled value', { enabled })

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="form"
      badge={enabled ? 'Automatic' : 'Disabled'}
      title="Enabled state"
      description="Disabled automatic work clears its result."
      instruction="Toggle automatic encoding."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Enabled', value: String(enabled) },
            { label: 'Loading', value: String(result.isLoading) },
          ]}
        />
      }
    >
      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Automatic encoding
      </label>
      <CodeValue value={result.base64 || 'Idle'} testId="base64-output" />
    </ExampleShowcase>
  )
}

export function RapidChangesExample() {
  const [value, setValue] = useState('alpha')
  const result = useBase64(value)

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="single"
      title="Rapid changes"
      description="Only the newest asynchronous result owns state."
      instruction="Change the value quickly."
      code={rapidChangesSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Loading', value: String(result.isLoading) },
            { label: 'Input bytes', value: String(byteLength(value)) },
          ]}
        />
      }
    >
      <Field label="Rapid value" htmlFor="base64-rapid">
        <input
          id="base64-rapid"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={inputClass}
        />
      </Field>
      <CodeValue value={result.base64} testId="base64-output" />
    </ExampleShowcase>
  )
}

export function ErrorHandlingExample() {
  const result = useBase64('fictional', { quality: 2 })

  return (
    <ExampleShowcase
      hookName="useBase64"
      layout="single"
      badge="Validation"
      title="Error handling"
      description="Invalid options are surfaced as errors."
      instruction="Review the validation result."
      code={errorHandlingSnippet}
    >
      <Callout tone="warning" title="Validation error">
        <span data-testid="base64-error">
          {result.error?.message ?? 'Waiting for validation…'}
        </span>
      </Callout>
    </ExampleShowcase>
  )
}

export function PlaygroundExample() {
  const [mounted, setMounted] = useState(false)
  return mounted ? (
    <Base64StudioExample />
  ) : (
    <ExampleShowcase
      hookName="useBase64"
      title="Playground"
      description="Mount an interactive Base64 studio."
      instruction="Start when ready."
      code={playgroundSnippet}
    >
      <button
        type="button"
        className={primaryButtonClass}
        data-testid="base64-playground-mount"
        onClick={() => setMounted(true)}
      >
        Mount playground
      </button>
    </ExampleShowcase>
  )
}
