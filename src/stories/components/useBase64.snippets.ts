export const base64StudioSnippet = `import { useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function Base64Studio() {
  const [text, setText] = useState('Fictional project note')
  const [dataUrl, setDataUrl] = useState(true)
  const { base64, isLoading, error } = useBase64(text, { dataUrl })
  return (
    <>
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <label>
        <input type="checkbox" checked={dataUrl} onChange={(event) => setDataUrl(event.target.checked)} />
        Data URL
      </label>
      {isLoading ? <p role="status">Encoding…</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      <output>{base64}</output>
    </>
  )
}`

export const plainTextSnippet = `import { useBase64 } from '@muradyanvano/react-hooks'

export function PlainText() {
  const { base64, isLoading } = useBase64('Fictional project brief.')
  return <output>{isLoading ? 'Encoding…' : base64}</output>
}`

export const unicodeSnippet = `import { useBase64 } from '@muradyanvano/react-hooks'

export function UnicodeAndEmoji() {
  const { base64 } = useBase64('Fictional café note: Վանո 🙂', { dataUrl: false })
  return <output>{base64}</output>
}`

export const dataUrlSnippet = `import { useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function DataUrlVersusPayload() {
  const [dataUrl, setDataUrl] = useState(false)
  const { base64 } = useBase64('Compare both representations.', { dataUrl })
  return (
    <>
      <button type="button" onClick={() => setDataUrl((value) => !value)}>
        {dataUrl ? 'Show payload' : 'Show data URL'}
      </button>
      <output>{base64}</output>
    </>
  )
}`

export const binaryBytesSnippet = `import { useMemo } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

const SOURCE = Uint8Array.from([0, 1, 2, 253, 254, 255])

export function BinaryBytes() {
  // Keep the view identity stable across renders.
  const bytes = useMemo(() => SOURCE.subarray(0, SOURCE.length), [])
  const { base64 } = useBase64(bytes, { dataUrl: false })
  return <output>{base64}</output>
}`

export const fileBlobSnippet = `import { useMemo } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function FileAndBlob() {
  const blob = useMemo(
    () => new Blob(['Fictional file content'], { type: 'text/plain' }),
    [],
  )
  const { base64, isLoading, error } = useBase64(blob)
  return (
    <>
      {isLoading ? <p role="status">Encoding…</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      <output>{base64}</output>
    </>
  )
}`

export const imagePreviewSnippet = `import { useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function ImagePreview() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const { base64, error } = useBase64(image)
  return (
    <>
      <img
        ref={setImage}
        alt="Generated fictional blue square"
        width={64}
        height={64}
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3C/svg%3E"
      />
      <output>{error?.message ?? base64}</output>
    </>
  )
}`

export const canvasArtworkSnippet = `import { useEffect, useRef, useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function CanvasArtwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const current = canvasRef.current
    const context = current?.getContext('2d')
    if (context && current) {
      context.fillStyle = '#4f46e5'
      context.fillRect(0, 0, current.width, current.height)
      setCanvas(current)
    }
  }, [])
  const { base64 } = useBase64(canvas, { type: 'image/png' })
  return (
    <>
      <canvas ref={canvasRef} width={96} height={64} aria-label="Fictional canvas artwork" />
      <output>{base64}</output>
    </>
  )
}`

export const customSerializerSnippet = `import { useMemo } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function CustomSerializer() {
  const value = useMemo(() => ({ label: 'fictional', count: 2 }), [])
  const { base64 } = useBase64(value, {
    serializer: (item) => JSON.stringify(item),
    dataUrl: false,
  })
  return <output>{base64}</output>
}`

export const manualExecutionSnippet = `import { useBase64 } from '@muradyanvano/react-hooks'

export function ManualExecution() {
  const { base64, execute, isLoading } = useBase64('Fictional draft', {
    enabled: false,
  })
  return (
    <>
      <button type="button" onClick={() => void execute()}>Encode now</button>
      <output>{isLoading ? 'Encoding…' : base64 || 'Not encoded yet'}</output>
    </>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function EnabledState() {
  const [enabled, setEnabled] = useState(true)
  const { base64, execute } = useBase64('Fictional enabled value', { enabled })
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Automatic encoding
      </label>
      <button type="button" onClick={() => void execute()}>
        Encode manually
      </button>
      <output>{base64 || 'Idle'}</output>
    </>
  )
}`

export const rapidChangesSnippet = `import { useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function RapidChanges() {
  const [text, setText] = useState('a')
  const { base64, isLoading } = useBase64(text, { dataUrl: false })
  return (
    <>
      <button type="button" onClick={() => setText((value) => value + 'a')}>
        Append fictional character
      </button>
      <p role="status">{isLoading ? 'Newest request owns state' : 'Ready'}</p>
      <output>{base64}</output>
    </>
  )
}`

export const errorHandlingSnippet = `import { useBase64 } from '@muradyanvano/react-hooks'

export function ErrorHandling() {
  const { base64, error, execute } = useBase64(
    { unsupported: true },
    {
      enabled: false,
      serializer: () => {
        throw new Error('Fictional serializer failure')
      },
      onError: (failure) => {
        console.info(failure.message)
      },
    },
  )
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void execute()
        }}
      >
        Encode unsupported value
      </button>
      {error ? <p role="alert">{error.message}</p> : null}
      <output>{base64 || 'No payload'}</output>
    </>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useBase64 } from '@muradyanvano/react-hooks'

export function Base64Playground() {
  const [text, setText] = useState('Fictional playground note')
  const [dataUrl, setDataUrl] = useState(true)
  const [enabled, setEnabled] = useState(true)
  const { base64, isLoading, error, execute } = useBase64(text, {
    dataUrl,
    enabled,
    type: 'text/plain;charset=utf-8',
  })
  return (
    <>
      <textarea value={text} onChange={(event) => setText(event.target.value)} />
      <label>
        <input type="checkbox" checked={dataUrl} onChange={(event) => setDataUrl(event.target.checked)} />
        Data URL
      </label>
      <label>
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Enabled
      </label>
      <button type="button" onClick={() => void execute()}>Execute</button>
      {isLoading ? <p role="status">Encoding…</p> : null}
      {error ? <p role="alert">{error.message}</p> : null}
      <output>{base64}</output>
    </>
  )
}`
