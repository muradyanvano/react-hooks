import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createQRCodeOptionsSignature,
  DEFAULT_ENABLED,
  encodeQrDataUrl,
  invokeOnErrorSafely,
  normalizeError,
  validateAndNormalizeOptions,
  type UseQRCodeOptions,
  type UseQRCodeReturn,
} from './qrCodeHelpers'

export type {
  UseQRCodeColorOptions,
  UseQRCodeErrorCorrectionLevel,
  UseQRCodeImageType,
  UseQRCodeMaskPattern,
  UseQRCodeOptions,
  UseQRCodeReturn,
} from './qrCodeHelpers'

interface QRCodeViewState {
  dataUrl: string
  isLoading: boolean
  error: Error | null
}

const IDLE_STATE: QRCodeViewState = {
  dataUrl: '',
  isLoading: false,
  error: null,
}

/**
 * Generates QR code image data URLs from text using the `qrcode` encoder.
 *
 * Automatic generation runs after mount when `text` is non-empty and
 * `enabled` is true. Empty text and `enabled: false` clear automatic output.
 * Manual `generate()` remains available while disabled.
 *
 * Scanning a QR code does not validate or trust its content.
 */
export function useQRCode(
  text: string,
  options?: UseQRCodeOptions,
): UseQRCodeReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const optionsSignature = createQRCodeOptionsSignature(options)

  const [state, setState] = useState<QRCodeViewState>(IDLE_STATE)

  const generationIdRef = useRef(0)
  const mountedRef = useRef(true)
  const latestTextRef = useRef(text)
  const latestOptionsRef = useRef(options)
  const latestOnErrorRef = useRef(options?.onError)

  useEffect(() => {
    latestTextRef.current = text
    latestOptionsRef.current = options
    latestOnErrorRef.current = options?.onError
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationIdRef.current += 1
    }
  }, [])

  const runGeneration = useCallback(
    async (
      nextText: string,
      nextOptions: UseQRCodeOptions | undefined,
      generationId: number,
    ): Promise<string | null> => {
      if (nextText === '') {
        if (generationId === generationIdRef.current && mountedRef.current) {
          setState(IDLE_STATE)
        }
        return null
      }

      const validation = validateAndNormalizeOptions(nextOptions)
      if (!validation.ok) {
        if (generationId === generationIdRef.current && mountedRef.current) {
          setState({
            dataUrl: '',
            isLoading: false,
            error: validation.error,
          })
          invokeOnErrorSafely(latestOnErrorRef.current, validation.error)
        }
        return null
      }

      if (generationId === generationIdRef.current && mountedRef.current) {
        setState({
          dataUrl: '',
          isLoading: true,
          error: null,
        })
      }

      try {
        const dataUrl = await encodeQrDataUrl(nextText, validation.options)

        if (generationId !== generationIdRef.current || !mountedRef.current) {
          return dataUrl
        }

        setState((previous) => {
          if (
            previous.dataUrl === dataUrl &&
            previous.isLoading === false &&
            previous.error === null
          ) {
            return previous
          }
          return {
            dataUrl,
            isLoading: false,
            error: null,
          }
        })
        return dataUrl
      } catch (cause) {
        const error = normalizeError(cause)

        if (generationId !== generationIdRef.current || !mountedRef.current) {
          return null
        }

        setState({
          dataUrl: '',
          isLoading: false,
          error,
        })
        invokeOnErrorSafely(latestOnErrorRef.current, error)
        return null
      }
    },
    [],
  )

  const generate = useCallback(async (): Promise<string | null> => {
    const generationId = ++generationIdRef.current
    return runGeneration(
      latestTextRef.current,
      latestOptionsRef.current,
      generationId,
    )
  }, [runGeneration])

  useEffect(() => {
    if (!enabled || text === '') {
      generationIdRef.current += 1
      // Keep idle output in sync when automatic generation is not allowed.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale QR for empty/disabled text
      setState((previous) =>
        previous.dataUrl === '' &&
        previous.isLoading === false &&
        previous.error === null
          ? previous
          : IDLE_STATE,
      )
      return
    }

    const generationId = ++generationIdRef.current
    void runGeneration(text, latestOptionsRef.current, generationId)

    return () => {
      // Invalidate in-flight work from this effect instance (Strict Mode / deps).
      if (generationId === generationIdRef.current) {
        generationIdRef.current += 1
      }
    }
  }, [enabled, text, optionsSignature, runGeneration])

  return {
    dataUrl: state.dataUrl,
    isLoading: state.isLoading,
    error: state.error,
    generate,
  }
}
