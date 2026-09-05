import { useEffect, useMemo, useRef, useState } from 'react'

import { useBase64 } from '../../hooks/useBase64/useBase64'
import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
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
  return (
    <ExampleShowcase
      hookName="useBase64"
      title={title}
      description="Encode fictional local data as UTF-8 Base64."
      instruction="Review the generated value and state."
      code={code}
      aside={
        <StatusPanel
          items={[{ label: 'Loading', value: String(result.isLoading) }]}
        />
      }
    >
      {result.error ? <p role="alert">{result.error.message}</p> : null}
      <output className="block break-all rounded border p-3 font-mono text-xs">
        {result.base64 || 'Waiting for encoded value…'}
      </output>
    </ExampleShowcase>
  )
}

export function Base64StudioExample() {
  const [text, setText] = useState('Fictional release note: ready for review.')
  const result = useBase64(text)
  return (
    <ExampleShowcase
      hookName="useBase64"
      badge="Primary"
      title="Base64 studio"
      description="Encode text into a data URL."
      instruction="Edit fictional text and inspect the result."
      code={base64StudioSnippet}
    >
      <label className="block">
        Text
        <textarea
          className="mt-1 block w-full rounded border p-2"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <p role="status" aria-live="polite">
        {result.isLoading
          ? 'Encoding…'
          : result.error
            ? result.error.message
            : 'Ready'}
      </p>
      <output className="block break-all rounded border p-3 font-mono text-xs">
        {result.base64}
      </output>
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
      title="Binary bytes"
      description="Encode only the visible ArrayBufferView byte window."
      instruction="Inspect the fictional byte payload."
      code={binaryBytesSnippet}
      aside={
        <StatusPanel
          items={[{ label: 'Loading', value: String(result.isLoading) }]}
        />
      }
    >
      {result.error ? <p role="alert">{result.error.message}</p> : null}
      <output className="block break-all rounded border p-3 font-mono text-xs">
        {result.base64 || 'Waiting for encoded value…'}
      </output>
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
      title="File and Blob"
      description="Blob MIME labels the data URL when present."
      instruction="Inspect a fictional in-memory Blob encoding."
      code={fileBlobSnippet}
      aside={
        <StatusPanel
          items={[{ label: 'Loading', value: String(result.isLoading) }]}
        />
      }
    >
      {result.error ? <p role="alert">{result.error.message}</p> : null}
      <output className="block break-all rounded border p-3 font-mono text-xs">
        {result.base64 || 'Waiting for encoded value…'}
      </output>
    </ExampleShowcase>
  )
}

export function ImagePreviewExample() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const result = useBase64(image)
  return (
    <ExampleShowcase
      hookName="useBase64"
      title="Image preview"
      description="A generated local image is drawn into an owning-document canvas."
      instruction="The image stays local to this example."
      code={imagePreviewSnippet}
    >
      <img
        ref={setImage}
        alt="Generated fictional blue square"
        width={64}
        height={64}
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3C/svg%3E"
      />
      <output className="block break-all font-mono text-xs">
        {result.error?.message ?? result.base64}
      </output>
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
      title="Canvas artwork"
      description="Canvas output defaults to PNG."
      instruction="Inspect a locally generated canvas data URL."
      code={canvasArtworkSnippet}
    >
      <canvas
        ref={canvasRef}
        width={96}
        height={64}
        aria-label="Fictional canvas artwork"
      />
      <output className="block break-all font-mono text-xs">
        {result.error?.message ?? result.base64}
      </output>
    </ExampleShowcase>
  )
}

export function CustomSerializerExample() {
  const value = useMemo(() => ({ label: 'fictional', count: 2 }), [])
  const result = useBase64(value, { serializer: JSON.stringify })
  return (
    <ExampleShowcase
      hookName="useBase64"
      title="Custom serializer"
      description="Unsupported objects require a serializer that returns a string."
      instruction="Inspect the serialized fictional object encoding."
      code={customSerializerSnippet}
      aside={
        <StatusPanel
          items={[{ label: 'Loading', value: String(result.isLoading) }]}
        />
      }
    >
      {result.error ? <p role="alert">{result.error.message}</p> : null}
      <output className="block break-all rounded border p-3 font-mono text-xs">
        {result.base64 || 'Waiting for encoded value…'}
      </output>
    </ExampleShowcase>
  )
}

export function ManualExecutionExample() {
  const result = useBase64('Fictional draft', { enabled: false })
  return (
    <ExampleShowcase
      hookName="useBase64"
      title="Manual execution"
      description="Manual execution remains available while automatic encoding is disabled."
      instruction="Encode the draft on demand."
      code={manualExecutionSnippet}
    >
      <button type="button" onClick={() => void result.execute()}>
        Encode now
      </button>
      <output className="block break-all font-mono text-xs">
        {result.base64 || 'Not encoded yet'}
      </output>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const result = useBase64('Fictional enabled value', { enabled })
  return (
    <ExampleShowcase
      hookName="useBase64"
      title="Enabled state"
      description="Disabled automatic work clears its result."
      instruction="Toggle automatic encoding."
      code={enabledStateSnippet}
    >
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />{' '}
        Enabled
      </label>
      <output className="block break-all font-mono text-xs">
        {result.base64 || 'Idle'}
      </output>
    </ExampleShowcase>
  )
}

export function RapidChangesExample() {
  const [value, setValue] = useState('alpha')
  const result = useBase64(value)
  return (
    <ExampleShowcase
      hookName="useBase64"
      title="Rapid changes"
      description="Only the newest asynchronous result owns state."
      instruction="Change the value quickly."
      code={rapidChangesSnippet}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Rapid value"
      />
      <output className="block break-all font-mono text-xs">
        {result.base64}
      </output>
    </ExampleShowcase>
  )
}

export function ErrorHandlingExample() {
  const result = useBase64('fictional', { quality: 2 })
  return (
    <ExampleShowcase
      hookName="useBase64"
      title="Error handling"
      description="Invalid options are surfaced as errors."
      instruction="Review the validation result."
      code={errorHandlingSnippet}
    >
      <p role="alert">{result.error?.message ?? 'Waiting for validation…'}</p>
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
      <button type="button" onClick={() => setMounted(true)}>
        Mount playground
      </button>
    </ExampleShowcase>
  )
}
