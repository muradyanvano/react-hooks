/**
 * Storybook-only EyeDropper mock. Not shipped in dist or the npm tarball.
 */

export type EyeDropperMockMode =
  | 'success'
  | 'uppercase'
  | 'abort'
  | 'not-allowed'
  | 'invalid-state'
  | 'operation'
  | 'malformed'
  | 'unsupported'
  | 'deferred'

type DeferredControl = {
  resolve: (value: { sRGBHex: string }) => void
  reject: (reason?: unknown) => void
}

export interface EyeDropperMockHandle {
  mode: EyeDropperMockMode
  successColor: string
  ctorCount: number
  openCount: number
  pending: DeferredControl[]
  isInstalled: () => boolean
  install: () => void
  setMode: (mode: EyeDropperMockMode) => void
  setSuccessColor: (color: string) => void
  resolveNext: (color?: string) => void
  rejectNext: (reason?: unknown) => void
  uninstall: () => void
}

export function installEyeDropperMock(
  targetWindow: Window = window,
  initial: {
    mode?: EyeDropperMockMode
    successColor?: string
  } = {},
): EyeDropperMockHandle {
  const original = Object.getOwnPropertyDescriptor(targetWindow, 'EyeDropper')
  let installed = false

  const handle: EyeDropperMockHandle = {
    mode: initial.mode ?? 'success',
    successColor: initial.successColor ?? '#3b82f6',
    ctorCount: 0,
    openCount: 0,
    pending: [],
    isInstalled: () => installed,
    install() {
      if (installed) return
      applyMock()
      installed = true
    },
    setMode(mode) {
      const wasUnsupported = handle.mode === 'unsupported'
      handle.mode = mode
      // Only reinstall when support surface changes (unsupported ↔ supported).
      if (installed && wasUnsupported !== (mode === 'unsupported')) {
        handle.uninstall()
        handle.install()
      }
    },
    setSuccessColor(color) {
      handle.successColor = color
    },
    resolveNext(color) {
      const next = handle.pending.shift()
      next?.resolve({ sRGBHex: color ?? handle.successColor })
    },
    rejectNext(reason) {
      const next = handle.pending.shift()
      next?.reject(reason ?? new DOMException('Aborted', 'AbortError'))
    },
    uninstall() {
      for (const item of handle.pending.splice(0)) {
        try {
          item.reject(new DOMException('Mock uninstalled', 'AbortError'))
        } catch {
          // Ignore.
        }
      }
      handle.ctorCount = 0
      handle.openCount = 0
      if (!installed) return
      if (original == null) {
        Reflect.deleteProperty(targetWindow, 'EyeDropper')
      } else {
        Object.defineProperty(targetWindow, 'EyeDropper', original)
      }
      installed = false
    },
  }

  function applyMock() {
    if (handle.mode === 'unsupported') {
      Reflect.deleteProperty(targetWindow, 'EyeDropper')
      return
    }

    class MockEyeDropper {
      open(options?: { signal?: AbortSignal }) {
        handle.openCount += 1
        const signal = options?.signal

        const run = (
          executor: (
            resolve: (value: { sRGBHex: string }) => void,
            reject: (reason?: unknown) => void,
          ) => void,
        ) =>
          new Promise<{ sRGBHex: string }>((resolve, reject) => {
            const onAbort = () => {
              reject(new DOMException('Aborted', 'AbortError'))
            }
            if (signal?.aborted) {
              onAbort()
              return
            }
            signal?.addEventListener('abort', onAbort, { once: true })
            executor(
              (value) => {
                signal?.removeEventListener('abort', onAbort)
                resolve(value)
              },
              (reason) => {
                signal?.removeEventListener('abort', onAbort)
                reject(reason)
              },
            )
          })

        switch (handle.mode) {
          case 'abort':
            return run((_resolve, reject) => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          case 'not-allowed':
            return run((_resolve, reject) => {
              reject(new DOMException('Denied', 'NotAllowedError'))
            })
          case 'invalid-state':
            return run((_resolve, reject) => {
              reject(new DOMException('Busy', 'InvalidStateError'))
            })
          case 'operation':
            return run((_resolve, reject) => {
              reject(new DOMException('Failed', 'OperationError'))
            })
          case 'malformed':
            return run((resolve) => {
              resolve({ sRGBHex: '#fff' } as { sRGBHex: string })
            })
          case 'uppercase':
            return run((resolve) => {
              resolve({ sRGBHex: handle.successColor.toUpperCase() })
            })
          case 'deferred':
            return run((resolve, reject) => {
              const entry = { resolve, reject }
              handle.pending.push(entry)
              let abortCleanup: (() => void) | null = null
              const detachPending = () => {
                const idx = handle.pending.indexOf(entry)
                if (idx >= 0) {
                  handle.pending.splice(idx, 1)
                }
                abortCleanup?.()
                abortCleanup = null
              }
              const wrap =
                <T extends unknown[]>(fn: (...args: T) => void) =>
                (...args: T) => {
                  detachPending()
                  fn(...args)
                }
              entry.resolve = wrap(resolve)
              entry.reject = wrap(reject)
              if (signal != null && !signal.aborted) {
                const onAbortCleanup = () => {
                  detachPending()
                }
                signal.addEventListener('abort', onAbortCleanup)
                abortCleanup = () => {
                  signal.removeEventListener('abort', onAbortCleanup)
                }
              } else if (signal?.aborted) {
                detachPending()
              }
            })
          case 'success':
          default:
            return run((resolve) => {
              resolve({ sRGBHex: handle.successColor })
            })
        }
      }
    }

    const Ctor = function EyeDropperMockCtor(this: MockEyeDropper) {
      handle.ctorCount += 1
      return new MockEyeDropper()
    }

    Object.defineProperty(targetWindow, 'EyeDropper', {
      configurable: true,
      writable: true,
      value: Ctor,
    })
  }

  handle.install()
  return handle
}
