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

  const normalized: NormalizedQRCodeEncoderOptions = {
    errorCorrectionLevel:
      source.errorCorrectionLevel ?? DEFAULT_ERROR_CORRECTION_LEVEL,
    margin: source.margin ?? DEFAULT_MARGIN,
  }

  if (source.version !== undefined) {
    if (
      !isInteger(source.version) ||
      source.version < 1 ||
      source.version > 40
    ) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'version must be an integer between 1 and 40',
        ),
      }
    }
    normalized.version = source.version
  }

  if (source.errorCorrectionLevel !== undefined) {
    if (!isSupportedErrorCorrectionLevel(source.errorCorrectionLevel)) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'errorCorrectionLevel must be one of L, M, Q, H, low, medium, quartile, or high',
        ),
      }
    }
    normalized.errorCorrectionLevel = source.errorCorrectionLevel
  }

  if (source.maskPattern !== undefined) {
    if (
      !isInteger(source.maskPattern) ||
      source.maskPattern < 0 ||
      source.maskPattern > 7
    ) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'maskPattern must be an integer between 0 and 7',
        ),
      }
    }
    normalized.maskPattern = source.maskPattern as UseQRCodeMaskPattern
  }

  if (source.margin !== undefined) {
    if (!isFiniteNumber(source.margin) || source.margin < 0) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'margin must be a finite non-negative number',
        ),
      }
    }
    normalized.margin = source.margin
  }

  if (source.scale !== undefined) {
    if (!isFiniteNumber(source.scale) || source.scale <= 0) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'scale must be a finite positive number',
        ),
      }
    }
    normalized.scale = source.scale
  }

  if (source.width !== undefined) {
    if (!isFiniteNumber(source.width) || source.width <= 0) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'width must be a finite positive number',
        ),
      }
    }
    normalized.width = source.width
  }

  if (source.quality !== undefined) {
    if (
      !isFiniteNumber(source.quality) ||
      source.quality < 0 ||
      source.quality > 1
    ) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'quality must be a finite number between 0 and 1',
        ),
      }
    }
    normalized.quality = source.quality
  }

  if (source.type !== undefined) {
    if (!isSupportedImageType(source.type)) {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'type must be image/png, image/jpeg, or image/webp',
        ),
      }
    }
    normalized.type = source.type
  }

  if (source.color !== undefined) {
    if (source.color === null || typeof source.color !== 'object') {
      return {
        ok: false,
        error: createQRCodeOptionsError(
          'color must be an object with optional dark and light hex strings',
        ),
      }
    }

    const color: { dark?: string; light?: string } = {}

    if (source.color.dark !== undefined) {
      if (!isAcceptedQrHexColor(source.color.dark)) {
        return {
          ok: false,
          error: createQRCodeOptionsError(
            'color.dark must be a hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)',
          ),
        }
      }
      color.dark = source.color.dark
    }

    if (source.color.light !== undefined) {
      if (!isAcceptedQrHexColor(source.color.light)) {
        return {
          ok: false,
          error: createQRCodeOptionsError(
            'color.light must be a hex color string (#RGB, #RGBA, #RRGGBB, or #RRGGBBAA)',
          ),
        }
      }
      color.light = source.color.light
    }

    if (color.dark !== undefined || color.light !== undefined) {
      normalized.color = color
    }
  }

  return { ok: true, options: normalized }
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
    // Invalid options still need a stable identity for effect comparison.
    return `invalid:${validation.error.message}`
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
  const { toDataURL } = await import('qrcode')
  const dataUrl = await toDataURL(text, toEncoderOptions(options))
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
