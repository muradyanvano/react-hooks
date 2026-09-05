import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createOptionsSignature,
  encodeBase64,
  invokeOnErrorSafely,
  normalizeError,
  validateOptions,
  type UseBase64Options,
  type UseBase64Return,
  type UseBase64Target,
} from './base64Helpers'

export type {
  UseBase64Options,
  UseBase64Return,
  UseBase64Target,
} from './base64Helpers'

interface Base64State {
  base64: string
  isLoading: boolean
  error: Error | null
  promise: Promise<string | null> | null
}

const IDLE_STATE: Base64State = {
  base64: '',
  isLoading: false,
  error: null,
  promise: null,
}

export function useBase64(
  target: string,
  options?: UseBase64Options<string>,
): UseBase64Return
export function useBase64(
  target: ArrayBuffer,
  options?: UseBase64Options<ArrayBuffer>,
): UseBase64Return
export function useBase64(
  target: ArrayBufferView,
  options?: UseBase64Options<ArrayBufferView>,
): UseBase64Return
export function useBase64(
  target: Blob,
  options?: UseBase64Options<Blob>,
): UseBase64Return
export function useBase64(
  target: HTMLCanvasElement,
  options?: UseBase64Options<HTMLCanvasElement>,
): UseBase64Return
export function useBase64(
  target: HTMLImageElement,
  options?: UseBase64Options<HTMLImageElement>,
): UseBase64Return
export function useBase64(
  target: null | undefined,
  options?: UseBase64Options<null | undefined>,
): UseBase64Return
export function useBase64(
  target: UseBase64Target,
  options?: UseBase64Options,
): UseBase64Return
export function useBase64<T>(
  target: T,
  options: UseBase64Options<T> & { serializer: (value: T) => string },
): UseBase64Return
/**
 * Encodes strings, bytes, blobs, canvases, images, or serialized values to
 * Base64. Automatic work is disabled by `enabled: false`; `execute()` remains
 * available for user-triggered encoding in that state.
 */
export function useBase64<T>(
  target: T,
  options?: UseBase64Options<T>,
): UseBase64Return {
  const enabled = options?.enabled ?? true
  const optionsSignature = createOptionsSignature(options)
  const [state, setState] = useState<Base64State>(IDLE_STATE)
  const generationRef = useRef(0)
  const mountedRef = useRef(true)
  const targetRef = useRef(target)
  const optionsRef = useRef(options)
  const onErrorRef = useRef(options?.onError)

  useEffect(() => {
    targetRef.current = target
    optionsRef.current = options
    onErrorRef.current = options?.onError
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      generationRef.current += 1
    }
  }, [])

  const run = useCallback(
    (
      nextTarget: T,
      nextOptions: UseBase64Options<T> | undefined,
      generation: number,
    ): Promise<string | null> => {
      if (nextTarget == null) {
        if (generation === generationRef.current && mountedRef.current) {
          setState(IDLE_STATE)
        }
        return Promise.resolve(null)
      }

      const validation = validateOptions(nextOptions)
      if (!validation.ok) {
        if (generation === generationRef.current && mountedRef.current) {
          setState({ ...IDLE_STATE, error: validation.error })
          invokeOnErrorSafely(onErrorRef.current, validation.error)
        }
        return Promise.resolve(null)
      }

      const promise = (async (): Promise<string | null> => {
        try {
          const base64 = await encodeBase64(nextTarget, validation.options)
          if (generation !== generationRef.current || !mountedRef.current) {
            return base64
          }
          setState({
            base64,
            isLoading: false,
            error: null,
            promise: null,
          })
          return base64
        } catch (cause) {
          const error = normalizeError(cause)
          if (generation !== generationRef.current || !mountedRef.current) {
            return null
          }
          setState({ ...IDLE_STATE, error })
          invokeOnErrorSafely(onErrorRef.current, error)
          return null
        }
      })()

      if (generation === generationRef.current && mountedRef.current) {
        setState({ base64: '', isLoading: true, error: null, promise })
      }
      return promise
    },
    [],
  )

  const execute = useCallback(() => {
    const generation = ++generationRef.current
    return run(targetRef.current, optionsRef.current, generation)
  }, [run])

  useEffect(() => {
    if (!enabled || target == null) {
      generationRef.current += 1
      // eslint-disable-next-line react-hooks/set-state-in-effect -- declarative idle state invalidates pending work
      setState((previous) =>
        previous.base64 === '' &&
        !previous.isLoading &&
        previous.error === null &&
        previous.promise === null
          ? previous
          : IDLE_STATE,
      )
      return
    }

    const generation = ++generationRef.current
    void run(target, options, generation)
    return () => {
      if (generation === generationRef.current) generationRef.current += 1
    }
    // options are represented by optionsSignature; latest options are read via refs in execute/run.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional signature-based option equality
  }, [enabled, optionsSignature, run, target])

  return { ...state, execute }
}
