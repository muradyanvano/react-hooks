export type UseBase64Target =
  | string
  | ArrayBuffer
  | ArrayBufferView
  | Blob
  | HTMLCanvasElement
  | HTMLImageElement
  | null
  | undefined

export interface UseBase64Options<T = unknown> {
  enabled?: boolean
  dataUrl?: boolean
  type?: string
  quality?: number
  serializer?: (value: T) => string
  onError?: (error: Error) => void
}

export interface UseBase64Return {
  base64: string
  isLoading: boolean
  error: Error | null
  promise: Promise<string | null> | null
  execute: () => Promise<string | null>
}

export interface NormalizedBase64Options<T> {
  dataUrl: boolean
  type?: string
  quality?: number
  serializer?: (value: T) => string
}

export type Base64OptionValidation<T> =
  | { ok: true; options: NormalizedBase64Options<T> }
  | { ok: false; error: Error }

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function normalizeError(cause: unknown): Error {
  if (cause instanceof Error) return cause
  if (typeof cause === 'string') return new Error(cause)
  try {
    return new Error(String(cause))
  } catch {
    return new Error('Unknown Base64 encoding error')
  }
}

export function invokeOnErrorSafely(
  onError: ((error: Error) => void) | undefined,
  error: Error,
): void {
  try {
    onError?.(error)
  } catch {
    // Consumer callbacks cannot interrupt the hook lifecycle.
  }
}

function readOwn<T extends object, K extends keyof T>(
  object: T,
  key: K,
): T[K] | undefined {
  return Object.hasOwn(object, key) ? object[key] : undefined
}

function isMimeType(value: string): boolean {
  return /^[^\s/;]+\/[^\s;]+(?:\s*;\s*[^\s=;]+=[^\s;]+)*$/.test(value)
}

export function validateOptions<T>(
  options?: UseBase64Options<T>,
): Base64OptionValidation<T> {
  const source = options ?? {}
  const type = readOwn(source, 'type')
  if (type !== undefined && (type.trim() === '' || !isMimeType(type))) {
    return { ok: false, error: new Error('type must be a non-empty MIME type') }
  }

  const quality = readOwn(source, 'quality')
  if (
    quality !== undefined &&
    (typeof quality !== 'number' ||
      !Number.isFinite(quality) ||
      quality < 0 ||
      quality > 1)
  ) {
    return {
      ok: false,
      error: new Error('quality must be a finite number between 0 and 1'),
    }
  }

  const serializer = readOwn(source, 'serializer')
  if (serializer !== undefined && typeof serializer !== 'function') {
    return { ok: false, error: new Error('serializer must be a function') }
  }

  return {
    ok: true,
    options: {
      dataUrl: readOwn(source, 'dataUrl') ?? true,
      ...(type === undefined ? {} : { type }),
      ...(quality === undefined ? {} : { quality }),
      ...(serializer === undefined ? {} : { serializer }),
    },
  }
}

export function createOptionsSignature<T>(
  options?: UseBase64Options<T>,
): string {
  const source = options ?? {}
  const validation = validateOptions(options)
  return JSON.stringify({
    dataUrl: readOwn(source, 'dataUrl') ?? true,
    type: readOwn(source, 'type') ?? null,
    quality: readOwn(source, 'quality') ?? null,
    // Serializer identity is intentionally excluded: inline serializers are
    // common and must not create an effect → state update render loop.
    serializer: typeof readOwn(source, 'serializer') === 'function',
    valid: validation.ok,
  })
}

export function bytesToBase64(bytes: Uint8Array): string {
  let result = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    result += BASE64_ALPHABET[first >> 2]
    result += BASE64_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)]
    result +=
      second === undefined
        ? '='
        : BASE64_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)]
    result += third === undefined ? '=' : BASE64_ALPHABET[third & 63]
  }
  return result
}

/** UTF-8 encoding without relying on browser-only btoa or Buffer. */
export function stringToUtf8Bytes(value: string): Uint8Array {
  const bytes: number[] = []
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index)
    if (
      codePoint >= 0xd800 &&
      codePoint <= 0xdbff &&
      index + 1 < value.length
    ) {
      const next = value.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + next - 0xdc00
        index += 1
      }
    }
    if (codePoint <= 0x7f) bytes.push(codePoint)
    else if (codePoint <= 0x7ff)
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
    else if (codePoint <= 0xffff)
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      )
    else
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      )
  }
  return Uint8Array.from(bytes)
}

function format(payload: string, mime: string, dataUrl: boolean): string {
  return dataUrl ? `data:${mime};base64,${payload}` : payload
}

function isCanvas(value: unknown): value is HTMLCanvasElement {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as HTMLCanvasElement).toDataURL === 'function' &&
    typeof (value as HTMLCanvasElement).getContext === 'function'
  )
}

function isImage(value: unknown): value is HTMLImageElement {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as HTMLImageElement).naturalWidth === 'number' &&
    typeof (value as HTMLImageElement).naturalHeight === 'number' &&
    typeof (value as HTMLImageElement).ownerDocument === 'object'
  )
}

function splitBase64DataUrl(value: string): { mime: string; payload: string } {
  const match = /^data:([^;,]+(?:;[^,;=]+=[^,;]+)*)?;base64,([\s\S]*)$/i.exec(
    value,
  )
  if (!match) throw new Error('Canvas did not produce a Base64 data URL')
  return { mime: match[1] || 'image/png', payload: match[2] ?? '' }
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  options: NormalizedBase64Options<unknown>,
): string {
  const dataUrl =
    options.quality === undefined
      ? canvas.toDataURL(options.type)
      : canvas.toDataURL(options.type, options.quality)
  const parsed = splitBase64DataUrl(dataUrl)
  return format(parsed.payload, options.type ?? parsed.mime, options.dataUrl)
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    try {
      return await blob.arrayBuffer()
    } catch (cause) {
      const FileReaderConstructor = globalThis.FileReader
      if (typeof FileReaderConstructor !== 'function') throw cause
    }
  }
  const FileReaderConstructor = globalThis.FileReader
  if (typeof FileReaderConstructor !== 'function') {
    throw new Error('Blob reading is unsupported in this environment')
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReaderConstructor()
    reader.onerror = () => reject(normalizeError(reader.error))
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('FileReader did not return an ArrayBuffer'))
    }
    reader.readAsArrayBuffer(blob)
  })
}

async function encodeImage(
  image: HTMLImageElement,
  options: NormalizedBase64Options<unknown>,
): Promise<string> {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (width <= 0 || height <= 0) {
    throw new Error('Image must have a non-zero width and height')
  }
  const canvas = image.ownerDocument.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create a 2D canvas context')
  try {
    context.drawImage(image, 0, 0, width, height)
    return encodeCanvas(canvas, options)
  } catch (cause) {
    throw normalizeError(cause)
  }
}

export async function encodeBase64<T>(
  target: T,
  options: NormalizedBase64Options<T>,
): Promise<string> {
  if (typeof target === 'string') {
    return format(
      bytesToBase64(stringToUtf8Bytes(target)),
      options.type ?? 'text/plain;charset=utf-8',
      options.dataUrl,
    )
  }
  if (target instanceof ArrayBuffer) {
    return format(
      bytesToBase64(new Uint8Array(target)),
      options.type ?? 'application/octet-stream',
      options.dataUrl,
    )
  }
  if (ArrayBuffer.isView(target)) {
    return format(
      bytesToBase64(
        new Uint8Array(target.buffer, target.byteOffset, target.byteLength),
      ),
      options.type ?? 'application/octet-stream',
      options.dataUrl,
    )
  }
  if (isCanvas(target)) {
    return encodeCanvas(target, options as NormalizedBase64Options<unknown>)
  }
  if (isImage(target)) {
    return encodeImage(target, options as NormalizedBase64Options<unknown>)
  }
  if (typeof Blob !== 'undefined' && target instanceof Blob) {
    const bytes = new Uint8Array(await blobToArrayBuffer(target))
    return format(
      bytesToBase64(bytes),
      options.type ?? (target.type || 'application/octet-stream'),
      options.dataUrl,
    )
  }
  if (options.serializer) {
    const serialized = options.serializer(target)
    if (typeof serialized !== 'string') {
      throw new Error('serializer must return a string')
    }
    return format(
      bytesToBase64(stringToUtf8Bytes(serialized)),
      options.type ?? 'text/plain;charset=utf-8',
      options.dataUrl,
    )
  }
  throw new Error('Unsupported value: provide a serializer for this object')
}
