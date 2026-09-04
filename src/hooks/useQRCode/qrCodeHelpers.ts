export type UseQRCodeErrorCorrectionLevel =
  'L' | 'M' | 'Q' | 'H' | 'low' | 'medium' | 'quartile' | 'high'

export type UseQRCodeMaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type UseQRCodeImageType = 'image/png' | 'image/jpeg' | 'image/webp'

export interface UseQRCodeColorOptions {
  dark?: string
  light?: string
}

export interface UseQRCodeOptions {
  enabled?: boolean
  version?: number
  errorCorrectionLevel?: UseQRCodeErrorCorrectionLevel
  maskPattern?: UseQRCodeMaskPattern
  margin?: number
  scale?: number
  width?: number
  color?: UseQRCodeColorOptions
  type?: UseQRCodeImageType
  quality?: number
  onError?: (error: Error) => void
}

export interface UseQRCodeReturn {
  dataUrl: string
  isLoading: boolean
  error: Error | null
  generate: () => Promise<string | null>
}

export const DEFAULT_ENABLED = true
export const DEFAULT_ERROR_CORRECTION_LEVEL: UseQRCodeErrorCorrectionLevel = 'M'
export const DEFAULT_MARGIN = 4

export const ERROR_CORRECTION_LEVELS = Object.freeze([
  'L',
  'M',
  'Q',
  'H',
  'low',
  'medium',
  'quartile',
  'high',
] as const satisfies readonly UseQRCodeErrorCorrectionLevel[])

export const IMAGE_TYPES = Object.freeze([
  'image/png',
  'image/jpeg',
  'image/webp',
] as const satisfies readonly UseQRCodeImageType[])

export interface NormalizedQRCodeEncoderOptions {
  version?: number
  errorCorrectionLevel: UseQRCodeErrorCorrectionLevel
  maskPattern?: UseQRCodeMaskPattern
  margin: number
  scale?: number
  width?: number
  color?: {
    dark?: string
    light?: string
  }
  type?: UseQRCodeImageType
  quality?: number
}

export type QRCodeOptionValidationResult =
  | { ok: true; options: NormalizedQRCodeEncoderOptions }
  | { ok: false; error: Error }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value)
}

function readOwnProperty<T extends object, K extends keyof T>(
  source: T,
  key: K,
): T[K] | undefined {
  return Object.hasOwn(source, key) ? source[key] : undefined
}

/** Structural encoder module shapes observed under CJS/ESM interop. */
interface QrToDataURLFn {
  (text: string, options: object): Promise<string>
}

interface QrcodeModuleLike {
  toDataURL?: unknown
  default?: unknown
}

/**
 * Resolves `toDataURL` whether the dynamic import exposes it as a named export
 * or under `default` (CommonJS interop).
 */
export function resolveQrToDataURL(moduleValue: unknown): QrToDataURLFn {
  if (
    moduleValue == null ||
    (typeof moduleValue !== 'object' && typeof moduleValue !== 'function')
  ) {
    throw new Error('QR encoder module is unavailable')
  }

  const mod = moduleValue as QrcodeModuleLike
  if (typeof mod.toDataURL === 'function') {
    const toDataURL = mod.toDataURL as QrToDataURLFn
    // Call through without `bind()` so test mocks keep implementation tracking.
    return (text, options) => toDataURL(text, options)
  }

  const defaultExport = mod.default
  if (
    defaultExport != null &&
    (typeof defaultExport === 'object' || typeof defaultExport === 'function')
  ) {
    const nested = defaultExport as QrcodeModuleLike
    if (typeof nested.toDataURL === 'function') {
      const toDataURL = nested.toDataURL as QrToDataURLFn
      return (text, options) => toDataURL(text, options)
    }
  }

  throw new Error('QR encoder toDataURL is unavailable')
}

/**
 * Matches the hex formats accepted by `qrcode`'s renderer (`#RGB`, `#RGBA`,
 * `#RRGGBB`, `#RRGGBBAA`, with or without a leading `#`).
 */
export function isAcceptedQrHexColor(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const hexCode = value.replace('#', '')
  if (
    hexCode.length < 3 ||
    hexCode.length === 5 ||
    hexCode.length > 8 ||
    !/^[0-9a-fA-F]+$/.test(hexCode)
  ) {
    return false
  }

  return true
}

export function isSupportedErrorCorrectionLevel(
  value: unknown,
): value is UseQRCodeErrorCorrectionLevel {
  return (
    typeof value === 'string' &&
    (ERROR_CORRECTION_LEVELS as readonly string[]).includes(value)
  )
}

export function isSupportedImageType(
  value: unknown,
): value is UseQRCodeImageType {
  return (
    typeof value === 'string' &&
    (IMAGE_TYPES as readonly string[]).includes(value)
  )
}

export function isImageDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpeg|webp);base64,/i.test(value)
}

export function normalizeError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause
  }

  if (typeof cause === 'string') {
    return new Error(cause)
  }

  try {
    return new Error(String(cause))
  } catch {
    return new Error('Unknown QR code generation error')
  }
}

export function createQRCodeOptionsError(message: string): Error {
  return new Error(message)
}

/**
 * Validates package-owned options and builds encoder options without mutating
 * the consumer's objects.
 */
export function validateAndNormalizeOptions(
  options?: UseQRCodeOptions,
): QRCodeOptionValidationResult {
  const source = options ?? {}

  const errorCorrectionLevel =
    readOwnProperty(source, 'errorCorrectionLevel') ??
    DEFAULT_ERROR_CORRECTION_LEVEL
  const margin = readOwnProperty(source, 'margin') ?? DEFAULT_MARGIN

  const normalized: NormalizedQRCodeEncoderOptions = {
    errorCorrectionLevel,
    margin,
  }

  const version = readOwnProperty(source, 'version')
  if (version !== undefined) {
    if (!isInteger(version) || version < 1 || version > 40) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'version must be an integer between 1 and 40',
        ),
      }
    }
    normalized.version = version
  }

  const explicitErrorCorrectionLevel = readOwnProperty(
    source,
    'errorCorrectionLevel',
  )
  if (explicitErrorCorrectionLevel !== undefined) {
    if (!isSupportedErrorCorrectionLevel(explicitErrorCorrectionLevel)) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'errorCorrectionLevel must be one of L, M, Q, H, low, medium, quartile, or high',
        ),
      }
    }
    normalized.errorCorrectionLevel = explicitErrorCorrectionLevel
  }

  const maskPattern = readOwnProperty(source, 'maskPattern')
  if (maskPattern !== undefined) {
    if (!isInteger(maskPattern) || maskPattern < 0 || maskPattern > 7) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'maskPattern must be an integer between 0 and 7',
        ),
      }
    }
    normalized.maskPattern = maskPattern as UseQRCodeMaskPattern
  }

  const explicitMargin = readOwnProperty(source, 'margin')
  if (explicitMargin !== undefined) {
    if (!isFiniteNumber(explicitMargin) || explicitMargin < 0) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'margin must be a finite non-negative number',
        ),
      }
    }
    normalized.margin = explicitMargin
  }

  const scale = readOwnProperty(source, 'scale')
  if (scale !== undefined) {
    if (!isFiniteNumber(scale) || scale <= 0) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'scale must be a finite positive number',
        ),
      }
    }
    normalized.scale = scale
  }

  const width = readOwnProperty(source, 'width')
  if (width !== undefined) {
    if (!isFiniteNumber(width) || width <= 0) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'width must be a finite positive number',
        ),
      }
    }
    normalized.width = width
  }

  const quality = readOwnProperty(source, 'quality')
  if (quality !== undefined) {
    if (!isFiniteNumber(quality) || quality < 0 || quality > 1) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'quality must be a finite number between 0 and 1',
        ),
      }
    }
    normalized.quality = quality
  }

  const type = readOwnProperty(source, 'type')
  if (type !== undefined) {
    if (!isSupportedImageType(type)) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'type must be image/png, image/jpeg, or image/webp',
        ),
      }
    }
    normalized.type = type
  }

  const colorInput = readOwnProperty(source, 'color')
  if (colorInput !== undefined) {
    if (colorInput === null || typeof colorInput !== 'object') {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'color must be an object with optional dark and light hex strings',
        ),
      }
    }

    const color: { dark?: string; light?: string } = {}

    const dark = readOwnProperty(colorInput, 'dark')
    if (dark !== undefined) {
      if (!isAcceptedQrHexColor(dark)) {
        return {
          ok: false,
          error: createQRCodeOptionsError(
            'color.dark must be a hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)',
          ),
        }
      }
      color.dark = dark
    }

    const light = readOwnProperty(colorInput, 'light')
    if (light !== undefined) {
      if (!isAcceptedQrHexColor(light)) {
        return {
          ok: false,
          error: createQRCodeOptionsError(
            'color.light must be a hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)',
          ),
        }
      }
      color.light = light
    }

    if (color.dark !== undefined || color.light !== undefined) {
      normalized.color = color
    }
  }

  return { ok: true, options: normalized }
}

function createInvalidOptionsSignature(
  options: UseQRCodeOptions | undefined,
  message: string,
): string {
  const source = options ?? {}
  const colorInput = readOwnProperty(source, 'color')
  const color =
    colorInput != null && typeof colorInput === 'object'
      ? {
          dark: readOwnProperty(colorInput, 'dark') ?? null,
          light: readOwnProperty(colorInput, 'light') ?? null,
        }
      : { dark: null, light: null }

  // Include raw encoding fields so distinct invalid configs that share an
  // error message (for example version 99 vs 100) still re-run and re-notify.
  return `invalid:${JSON.stringify({
    message,
    version: readOwnProperty(source, 'version') ?? null,
    errorCorrectionLevel:
      readOwnProperty(source, 'errorCorrectionLevel') ?? null,
    maskPattern: readOwnProperty(source, 'maskPattern') ?? null,
    margin: readOwnProperty(source, 'margin') ?? null,
    scale: readOwnProperty(source, 'scale') ?? null,
    width: readOwnProperty(source, 'width') ?? null,
    colorDark: color.dark,
    colorLight: color.light,
    type: readOwnProperty(source, 'type') ?? null,
    quality: readOwnProperty(source, 'quality') ?? null,
  })}`
}

/**
 * Semantic signature of encoding configuration (excludes `enabled` / `onError`).
 * Used to avoid regenerating when only callback identity or object identity changes.
 */
export function createQRCodeOptionsSignature(
  options?: UseQRCodeOptions,
): string {
  const validation = validateAndNormalizeOptions(options)
  if (!validation.ok) {
    return createInvalidOptionsSignature(options, validation.error.message)
  }

  const normalized = validation.options
  return JSON.stringify({
    version: normalized.version ?? null,
    errorCorrectionLevel: normalized.errorCorrectionLevel,
    maskPattern: normalized.maskPattern ?? null,
    margin: normalized.margin,
    scale: normalized.scale ?? null,
    width: normalized.width ?? null,
    colorDark: normalized.color?.dark ?? null,
    colorLight: normalized.color?.light ?? null,
    type: normalized.type ?? null,
    quality: normalized.quality ?? null,
  })
}

export function toEncoderOptions(options: NormalizedQRCodeEncoderOptions): {
  version?: number
  errorCorrectionLevel: UseQRCodeErrorCorrectionLevel
  maskPattern?: UseQRCodeMaskPattern
  margin: number
  scale?: number
  width?: number
  color?: { dark?: string; light?: string }
  type?: UseQRCodeImageType
  rendererOpts?: { quality: number }
} {
  const encoderOptions: {
    version?: number
    errorCorrectionLevel: UseQRCodeErrorCorrectionLevel
    maskPattern?: UseQRCodeMaskPattern
    margin: number
    scale?: number
    width?: number
    color?: { dark?: string; light?: string }
    type?: UseQRCodeImageType
    rendererOpts?: { quality: number }
  } = {
    errorCorrectionLevel: options.errorCorrectionLevel,
    margin: options.margin,
  }

  if (options.version !== undefined) {
    encoderOptions.version = options.version
  }
  if (options.maskPattern !== undefined) {
    encoderOptions.maskPattern = options.maskPattern
  }
  if (options.scale !== undefined) {
    encoderOptions.scale = options.scale
  }
  if (options.width !== undefined) {
    encoderOptions.width = options.width
  }
  if (options.type !== undefined) {
    encoderOptions.type = options.type
  }
  if (options.color !== undefined) {
    encoderOptions.color = { ...options.color }
  }
  if (options.quality !== undefined) {
    encoderOptions.rendererOpts = { quality: options.quality }
  }

  return encoderOptions
}

/**
 * Encodes `text` exactly (no trim/normalize) into an image data URL.
 * The encoder is loaded on demand so unrelated hook consumers can tree-shake it.
 */
export async function encodeQrDataUrl(
  text: string,
  options: NormalizedQRCodeEncoderOptions,
): Promise<string> {
  let moduleValue: unknown
  try {
    moduleValue = await import('qrcode')
  } catch (cause) {
    throw normalizeError(cause)
  }

  const toDataURL = resolveQrToDataURL(moduleValue)
  let dataUrl: unknown
  try {
    dataUrl = await toDataURL(text, toEncoderOptions(options))
  } catch (cause) {
    throw normalizeError(cause)
  }

  if (typeof dataUrl !== 'string' || dataUrl.length === 0) {
    throw new Error('QR encoder returned an empty data URL')
  }
  return dataUrl
}

export function invokeOnErrorSafely(
  onError: ((error: Error) => void) | undefined,
  error: Error,
): void {
  if (onError == null) {
    return
  }

  try {
    onError(error)
  } catch {
    // Consumer callback failures must not break the hook lifecycle.
  }
}
