/**
 * Storybook-only Fullscreen mock. Not shipped in dist or the npm tarball.
 */

export type FullscreenMockFamily = 'standard' | 'webkit'

export type FullscreenMockMode =
  | 'success'
  | 'reject-request'
  | 'reject-exit'
  | 'throw-request'
  | 'throw-exit'
  | 'deferred-request'
  | 'deferred-exit'
  | 'void'
  | 'unsupported'

type DeferredControl = {
  resolve: () => void
  reject: (reason?: unknown) => void
}

type PatchedEntry = {
  target: object
  key: string
  descriptor: PropertyDescriptor | undefined
}

export interface FullscreenMockHandle {
  family: FullscreenMockFamily
  mode: FullscreenMockMode
  requestCount: number
  exitCount: number
  lastNavigationUI: string | undefined
  pendingRequests: DeferredControl[]
  pendingExits: DeferredControl[]
  fullscreenElement: Element | null
  isInstalled: () => boolean
  install: () => void
  setMode: (mode: FullscreenMockMode) => void
  setFullscreenElement: (element: Element | null, dispatch?: boolean) => void
  resolveNextRequest: () => void
  rejectNextRequest: (reason?: unknown) => void
  resolveNextExit: () => void
  rejectNextExit: (reason?: unknown) => void
  dispatchChange: () => void
  dispatchError: () => void
  uninstall: () => void
}

export function installFullscreenMock(
  targetDocument: Document = document,
  initial: {
    family?: FullscreenMockFamily
    mode?: FullscreenMockMode
  } = {},
): FullscreenMockHandle {
  const patches: PatchedEntry[] = []
  let installed = false

  const handle: FullscreenMockHandle = {
    family: initial.family ?? 'standard',
    mode: initial.mode ?? 'success',
    requestCount: 0,
    exitCount: 0,
    lastNavigationUI: undefined,
    pendingRequests: [],
    pendingExits: [],
    fullscreenElement: null,
    isInstalled: () => installed,
    install() {
      if (installed) return
      applyMock()
      installed = true
    },
    setMode(mode) {
      const wasUnsupported = handle.mode === 'unsupported'
      handle.mode = mode
      if (installed && wasUnsupported !== (mode === 'unsupported')) {
        handle.uninstall()
        handle.install()
      }
    },
    setFullscreenElement(element, dispatch = true) {
      handle.fullscreenElement = element
      if (dispatch && installed) {
        handle.dispatchChange()
      }
    },
    resolveNextRequest() {
      const next = handle.pendingRequests.shift()
      next?.resolve()
    },
    rejectNextRequest(reason) {
      const next = handle.pendingRequests.shift()
      next?.reject(reason ?? new DOMException('Denied', 'NotAllowedError'))
    },
    resolveNextExit() {
      const next = handle.pendingExits.shift()
      next?.resolve()
    },
    rejectNextExit(reason) {
      const next = handle.pendingExits.shift()
      next?.reject(reason ?? new DOMException('Failed', 'InvalidStateError'))
    },
    dispatchChange() {
      const type =
        handle.family === 'standard'
          ? 'fullscreenchange'
          : 'webkitfullscreenchange'
      targetDocument.dispatchEvent(new Event(type))
    },
    dispatchError() {
      const type =
        handle.family === 'standard'
          ? 'fullscreenerror'
          : 'webkitfullscreenerror'
      targetDocument.dispatchEvent(new Event(type))
    },
    uninstall() {
      for (const item of handle.pendingRequests.splice(0)) {
        try {
          item.reject(new DOMException('Mock uninstalled', 'AbortError'))
        } catch {
          // Ignore.
        }
      }
      for (const item of handle.pendingExits.splice(0)) {
        try {
          item.reject(new DOMException('Mock uninstalled', 'AbortError'))
        } catch {
          // Ignore.
        }
      }
      handle.fullscreenElement = null
      handle.requestCount = 0
      handle.exitCount = 0
      handle.lastNavigationUI = undefined
      if (!installed) return
      for (const entry of patches.splice(0).reverse()) {
        if (entry.descriptor == null) {
          Reflect.deleteProperty(entry.target, entry.key)
        } else {
          Object.defineProperty(entry.target, entry.key, entry.descriptor)
        }
      }
      installed = false
    },
  }

  function patch(target: object, key: string, descriptor: PropertyDescriptor) {
    patches.push({
      target,
      key,
      descriptor: Object.getOwnPropertyDescriptor(target, key),
    })
    Object.defineProperty(target, key, { configurable: true, ...descriptor })
  }

  function runRequest(
    element: Element,
    requestOptions?: { navigationUI?: string },
  ) {
    handle.requestCount += 1
    handle.lastNavigationUI = requestOptions?.navigationUI

    if (handle.mode === 'throw-request') {
      throw new Error('request threw')
    }

    const settleSuccess = () => {
      handle.fullscreenElement = element
      handle.dispatchChange()
    }

    switch (handle.mode) {
      case 'reject-request':
        return Promise.reject(new DOMException('Denied', 'NotAllowedError'))
      case 'deferred-request':
        return new Promise<void>((resolve, reject) => {
          handle.pendingRequests.push({
            resolve: () => {
              settleSuccess()
              resolve()
            },
            reject,
          })
        })
      case 'void':
        settleSuccess()
        return undefined
      case 'success':
      default:
        settleSuccess()
        return Promise.resolve()
    }
  }

  function runExit() {
    handle.exitCount += 1
    if (handle.mode === 'throw-exit') {
      throw new Error('exit threw')
    }

    const settleSuccess = () => {
      handle.fullscreenElement = null
      handle.dispatchChange()
    }

    switch (handle.mode) {
      case 'reject-exit':
        return Promise.reject(new DOMException('Failed', 'InvalidStateError'))
      case 'deferred-exit':
        return new Promise<void>((resolve, reject) => {
          handle.pendingExits.push({
            resolve: () => {
              settleSuccess()
              resolve()
            },
            reject,
          })
        })
      case 'void':
        settleSuccess()
        return undefined
      case 'success':
      case 'deferred-request':
      case 'reject-request':
      case 'throw-request':
      default:
        settleSuccess()
        return Promise.resolve()
    }
  }

  function applyMock() {
    if (handle.mode === 'unsupported') {
      // Remove capability methods when present.
      const proto = targetDocument.defaultView?.Element?.prototype
      if (proto != null) {
        patch(proto, 'requestFullscreen', {
          configurable: true,
          value: undefined,
        })
        patch(proto, 'webkitRequestFullscreen', {
          configurable: true,
          value: undefined,
        })
      }
      patch(targetDocument, 'exitFullscreen', {
        configurable: true,
        value: undefined,
      })
      patch(targetDocument, 'webkitExitFullscreen', {
        configurable: true,
        value: undefined,
      })
      return
    }

    const elementProto =
      targetDocument.defaultView?.Element?.prototype ?? Element.prototype

    if (handle.family === 'standard') {
      patch(elementProto, 'requestFullscreen', {
        writable: true,
        value: function requestFullscreen(
          this: Element,
          requestOptions?: { navigationUI?: string },
        ) {
          return runRequest(this, requestOptions)
        },
      })
      patch(targetDocument, 'exitFullscreen', {
        writable: true,
        value: function exitFullscreen() {
          return runExit()
        },
      })
      patch(targetDocument, 'fullscreenElement', {
        get() {
          return handle.fullscreenElement
        },
      })
      patch(targetDocument, 'fullscreenEnabled', {
        get() {
          return true
        },
      })
    } else {
      patch(elementProto, 'webkitRequestFullscreen', {
        writable: true,
        value: function webkitRequestFullscreen(this: Element) {
          return runRequest(this)
        },
      })
      patch(targetDocument, 'webkitExitFullscreen', {
        writable: true,
        value: function webkitExitFullscreen() {
          return runExit()
        },
      })
      patch(targetDocument, 'webkitFullscreenElement', {
        get() {
          return handle.fullscreenElement
        },
      })
      patch(targetDocument, 'webkitFullscreenEnabled', {
        get() {
          return true
        },
      })
    }
  }

  handle.install()
  return handle
}
