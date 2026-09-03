// Structural event shape used by Storybook Cookie Store mocks. The public
// package does not export Cookie Store types; this local alias mirrors the
// private structural interface.
type CookieStoreChangeEventLike = {
  changed?: ReadonlyArray<{ name?: string | null } | null> | null
  deleted?: ReadonlyArray<{ name?: string | null } | null> | null
}

export function createBlockedCookieDocument(): Document {
  const doc = {
    defaultView: typeof window !== 'undefined' ? window : null,
  } as Document

  Object.defineProperty(doc, 'cookie', {
    configurable: true,
    enumerable: true,
    get() {
      throw new Error('Cookie access denied')
    },
    set() {
      throw new Error('Cookie access denied')
    },
  })

  return doc
}

export type CookieStoreMockController = {
  install: () => void
  uninstall: () => void
  isInstalled: () => boolean
  hideCookieStore: () => void
  restoreCookieStore: () => void
  dispatchChange: (event?: CookieStoreChangeEventLike) => void
}

function defineCookieStore(value: unknown): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    Object.defineProperty(window, 'cookieStore', {
      configurable: true,
      writable: true,
      value,
    })
    return true
  } catch {
    return false
  }
}

export function createCookieStoreMock(): CookieStoreMockController {
  const listeners = new Set<(event: CookieStoreChangeEventLike) => void>()
  let previousCookieStore: unknown
  let hadCookieStore = false
  let installed = false
  let hidden = false

  const mockStore = {
    addEventListener(
      type: 'change',
      listener: (event: CookieStoreChangeEventLike) => void,
    ) {
      if (type !== 'change') {
        return
      }
      listeners.add(listener)
    },
    removeEventListener(
      type: 'change',
      listener: (event: CookieStoreChangeEventLike) => void,
    ) {
      if (type !== 'change') {
        return
      }
      listeners.delete(listener)
    },
  }

  const install = () => {
    if (typeof window === 'undefined') {
      return
    }
    if (!installed) {
      hadCookieStore = Object.prototype.hasOwnProperty.call(
        window,
        'cookieStore',
      )
      previousCookieStore = (window as Window & { cookieStore?: unknown })
        .cookieStore
      installed = true
    }
    defineCookieStore(mockStore)
    hidden = false
  }

  const uninstall = () => {
    listeners.clear()
    if (typeof window === 'undefined' || !installed) {
      return
    }
    if (hadCookieStore) {
      defineCookieStore(previousCookieStore)
    } else {
      defineCookieStore(undefined)
    }
    installed = false
    hidden = false
  }

  const hideCookieStore = () => {
    if (typeof window === 'undefined') {
      return
    }
    if (!installed) {
      install()
    }
    defineCookieStore(undefined)
    hidden = true
  }

  const restoreCookieStore = () => {
    if (typeof window === 'undefined' || !hidden) {
      return
    }
    defineCookieStore(mockStore)
    hidden = false
  }

  const dispatchChange = (event: CookieStoreChangeEventLike = {}) => {
    for (const listener of [...listeners]) {
      try {
        listener(event)
      } catch {
        // Contain listener errors in Storybook-only mock.
      }
    }
  }

  return {
    install,
    uninstall,
    isInstalled: () => installed,
    hideCookieStore,
    restoreCookieStore,
    dispatchChange,
  }
}
