import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createCancelError,
  normalizeDelay,
  normalizeMaxWait,
} from './debounceFnHelpers'

export type UseDebounceFnFunction = (...args: never[]) => unknown

export interface UseDebounceFnOptions {
  maxWait?: number
  rejectOnCancel?: boolean
}

export interface UseDebounceFnReturn<T extends (...args: never[]) => unknown> {
  run: (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined>
  cancel: () => void
  flush: () => Promise<Awaited<ReturnType<T>> | undefined>
  isPending: boolean
}

type TimerId = ReturnType<typeof setTimeout>
type Settler<T> = {
  resolve: (value: T | undefined) => void
  reject: (reason?: unknown) => void
}

type ConfigEpoch = symbol

interface PendingWindow<T extends UseDebounceFnFunction> {
  /** Configuration epoch that created this window. */
  epoch: ConfigEpoch
  /** Cancellation policy snapped when the window opened. */
  rejectOnCancel: boolean
  args: Parameters<T>
  settlers: Settler<Awaited<ReturnType<T>>>[]
  delayTimer: TimerId | null
  maxWaitTimer: TimerId | null
}

interface DebounceConfig {
  delay: number
  maxWait: number | undefined
  rejectOnCancel: boolean
}

function ignoreRejection(promise: Promise<unknown>): void {
  void promise.catch(() => undefined)
}

/**
 * Defers a function until calls stop for `delay` milliseconds.
 *
 * Calls made during one debounce window share the final invocation result.
 */
export function useDebounceFn<T extends UseDebounceFnFunction>(
  fn: T,
  delay: number = 200,
  options?: UseDebounceFnOptions,
): UseDebounceFnReturn<T> {
  const normalizedDelay = normalizeDelay(delay)
  const normalizedMaxWait = normalizeMaxWait(options?.maxWait)
  const rejectOnCancel = options?.rejectOnCancel ?? false
  const nextConfig: DebounceConfig = {
    delay: normalizedDelay,
    maxWait: normalizedMaxWait,
    rejectOnCancel,
  }

  const fnRef = useRef(fn)
  const configRef = useRef(nextConfig)
  const configEpochRef = useRef<ConfigEpoch>(Symbol('debounce-config'))
  const pendingRef = useRef<PendingWindow<T> | null>(null)
  const invocationRef = useRef<Promise<
    Awaited<ReturnType<T>> | undefined
  > | null>(null)
  const mountedRef = useRef(false)
  const [isPending, setIsPending] = useState(false)

  // Recreate the epoch whenever semantic options change. The dependency list is
  // intentional even though the factory ignores those values.
  const configEpoch = useMemo(
    () => Symbol('debounce-config'),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- epoch identity must change with options
    [normalizedDelay, normalizedMaxWait, rejectOnCancel],
  )

  /* eslint-disable react-hooks/refs -- latest-handler / epoch publication for stable controls */
  fnRef.current = fn
  configRef.current = nextConfig
  configEpochRef.current = configEpoch
  /* eslint-enable react-hooks/refs */

  const setPending = useCallback((next: boolean) => {
    if (mountedRef.current) {
      setIsPending(next)
    }
  }, [])

  const clearTimers = useCallback((pending: PendingWindow<T>) => {
    if (pending.delayTimer != null) {
      clearTimeout(pending.delayTimer)
      pending.delayTimer = null
    }
    if (pending.maxWaitTimer != null) {
      clearTimeout(pending.maxWaitTimer)
      pending.maxWaitTimer = null
    }
  }, [])

  const cancelPending = useCallback(
    (shouldReject: boolean, epoch?: ConfigEpoch) => {
      const pending = pendingRef.current
      if (pending == null) {
        return
      }
      if (epoch !== undefined && pending.epoch !== epoch) {
        return
      }

      pendingRef.current = null
      clearTimers(pending)
      setPending(false)
      invocationRef.current = null

      for (const settler of pending.settlers) {
        if (shouldReject) {
          settler.reject(createCancelError())
        } else {
          settler.resolve(undefined)
        }
      }
    },
    [clearTimers, setPending],
  )

  const invoke = useCallback((): Promise<
    Awaited<ReturnType<T>> | undefined
  > => {
    const pending = pendingRef.current
    if (pending == null) {
      return invocationRef.current ?? Promise.resolve(undefined)
    }

    pendingRef.current = null
    clearTimers(pending)
    setPending(false)

    let result: ReturnType<T>
    try {
      // Deliberately do not preserve dynamic `this`.
      result = fnRef.current(...pending.args) as ReturnType<T>
    } catch (error) {
      const rejected = Promise.reject(error) as Promise<Awaited<ReturnType<T>>>
      ignoreRejection(rejected)
      invocationRef.current = rejected
      void rejected.then(undefined, () => {
        if (invocationRef.current === rejected) {
          invocationRef.current = null
        }
      })
      for (const settler of pending.settlers) {
        settler.reject(error)
      }
      return rejected
    }

    const invocation = Promise.resolve(result) as Promise<
      Awaited<ReturnType<T>>
    >
    ignoreRejection(invocation)
    invocationRef.current = invocation
    void invocation.then(
      (value) => {
        for (const settler of pending.settlers) {
          settler.resolve(value)
        }
        if (invocationRef.current === invocation) {
          invocationRef.current = null
        }
      },
      (error: unknown) => {
        for (const settler of pending.settlers) {
          settler.reject(error)
        }
        if (invocationRef.current === invocation) {
          invocationRef.current = null
        }
      },
    )

    return invocation
  }, [clearTimers, setPending])

  const run = useCallback(
    (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
      const config = configRef.current
      const epoch = configEpochRef.current
      let pending = pendingRef.current
      if (pending == null || pending.epoch !== epoch) {
        if (pending != null && pending.epoch !== epoch) {
          // A newer epoch is opening work before the old effect cleanup ran
          // (for example a consumer useLayoutEffect). Cancel the superseded
          // window with the policy it was created under.
          cancelPending(pending.rejectOnCancel, pending.epoch)
        }
        pending = {
          epoch,
          rejectOnCancel: config.rejectOnCancel,
          args,
          settlers: [],
          delayTimer: null,
          maxWaitTimer: null,
        }
        pendingRef.current = pending
        setPending(true)

        if (config.maxWait !== undefined) {
          pending.maxWaitTimer = setTimeout(() => {
            void invoke()
          }, config.maxWait)
        }
      } else if (pending.delayTimer != null) {
        clearTimeout(pending.delayTimer)
        pending.delayTimer = null
      }

      pending.args = args
      const promise = new Promise<Awaited<ReturnType<T>> | undefined>(
        (resolve, reject) => {
          pending?.settlers.push({ resolve, reject })
        },
      )
      ignoreRejection(promise)

      pending.delayTimer = setTimeout(() => {
        void invoke()
      }, config.delay)

      return promise
    },
    [cancelPending, invoke, setPending],
  )

  const cancel = useCallback(() => {
    cancelPending(configRef.current.rejectOnCancel)
  }, [cancelPending])

  const flush = useCallback(() => {
    if (pendingRef.current == null) {
      return invocationRef.current ?? Promise.resolve(undefined)
    }

    return invoke()
  }, [invoke])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Unmount always cancels every owned pending window without rejection.
      cancelPending(false)
    }
  }, [cancelPending])

  // Cancel only windows created under this effect's configuration epoch. Work
  // scheduled after a later render's epoch bump (including useLayoutEffect)
  // is left alone.
  useEffect(() => {
    const epoch = configEpoch
    const shouldReject = rejectOnCancel
    return () => {
      cancelPending(shouldReject, epoch)
    }
  }, [cancelPending, configEpoch, rejectOnCancel])

  return { run, cancel, flush, isPending }
}
