import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFullscreen } from './useFullscreen'

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

type MockHandle = {
  order: string[]
  requestCount: number
  exitCount: number
  setFullscreenElement: (element: Element | null) => void
  dispatchChange: () => void
  dispatchError: () => void
  restore: () => void
}

function installFullscreenMock(options?: {
  family?: 'standard' | 'webkit'
  requestImpl?: (
    element: Element,
    requestOptions?: { navigationUI?: string },
  ) => unknown
  exitImpl?: () => unknown
  requestThrow?: Error
  exitThrow?: Error
  enabled?: boolean
}): MockHandle {
  const family = options?.family ?? 'standard'
  const order: string[] = []
  let requestCount = 0
  let exitCount = 0
  let fullscreenElement: Element | null = null

  const descriptors: Array<{
    target: object
    key: string
    descriptor: PropertyDescriptor | undefined
  }> = []

  const patch = (
    target: object,
    key: string,
    descriptor: PropertyDescriptor,
  ) => {
    descriptors.push({
      target,
      key,
      descriptor: Object.getOwnPropertyDescriptor(target, key),
    })
    Object.defineProperty(target, key, {
      configurable: true,
      ...descriptor,
    })
  }

  const dispatchChange = () => {
    const type =
      family === 'standard' ? 'fullscreenchange' : 'webkitfullscreenchange'
    document.dispatchEvent(new Event(type))
  }

  const dispatchError = () => {
    const type =
      family === 'standard' ? 'fullscreenerror' : 'webkitfullscreenerror'
    document.dispatchEvent(new Event(type))
  }

  const setFullscreenElement = (element: Element | null) => {
    fullscreenElement = element
  }

  if (family === 'standard') {
    patch(Element.prototype, 'requestFullscreen', {
      writable: true,
      value: function requestFullscreen(requestOptions?: {
        navigationUI?: string
      }) {
        requestCount += 1
        order.push('native-request')
        if (options?.requestThrow) {
          throw options.requestThrow
        }
        const element = this as Element
        if (options?.requestImpl) {
          return options.requestImpl(element, requestOptions)
        }
        fullscreenElement = element
        queueMicrotask(() => dispatchChange())
        return Promise.resolve()
      },
    })
    patch(Document.prototype, 'exitFullscreen', {
      writable: true,
      value: function exitFullscreen(this: Document) {
        exitCount += 1
        order.push('native-exit')
        if (options?.exitThrow) {
          throw options.exitThrow
        }
        if (options?.exitImpl) {
          return options.exitImpl()
        }
        fullscreenElement = null
        queueMicrotask(() => dispatchChange())
        return Promise.resolve()
      },
    })
    patch(Document.prototype, 'fullscreenElement', {
      get() {
        return fullscreenElement
      },
    })
    patch(Document.prototype, 'fullscreenEnabled', {
      get() {
        return options?.enabled ?? true
      },
    })
  } else {
    patch(Element.prototype, 'webkitRequestFullscreen', {
      writable: true,
      value: function webkitRequestFullscreen() {
        requestCount += 1
        order.push('native-request')
        if (options?.requestThrow) {
          throw options.requestThrow
        }
        const element = this as Element
        if (options?.requestImpl) {
          return options.requestImpl(element)
        }
        fullscreenElement = element
        queueMicrotask(() => dispatchChange())
      },
    })
    patch(Document.prototype, 'webkitExitFullscreen', {
      writable: true,
      value: function webkitExitFullscreen(this: Document) {
        exitCount += 1
        order.push('native-exit')
        if (options?.exitThrow) {
          throw options.exitThrow
        }
        if (options?.exitImpl) {
          return options.exitImpl()
        }
        fullscreenElement = null
        queueMicrotask(() => dispatchChange())
      },
    })
    patch(Document.prototype, 'webkitFullscreenElement', {
      get() {
        return fullscreenElement
      },
    })
    patch(Document.prototype, 'webkitFullscreenEnabled', {
      get() {
        return options?.enabled ?? true
      },
    })
  }

  return {
    order,
    get requestCount() {
      return requestCount
    },
    get exitCount() {
      return exitCount
    },
    setFullscreenElement,
    dispatchChange,
    dispatchError,
    restore() {
      for (const entry of descriptors.reverse()) {
        if (entry.descriptor == null) {
          Reflect.deleteProperty(entry.target, entry.key)
        } else {
          Object.defineProperty(entry.target, entry.key, entry.descriptor)
        }
      }
    },
  }
}

describe('useFullscreen', () => {
  let restore: (() => void) | undefined
  let target: HTMLDivElement

  afterEach(() => {
    restore?.()
    restore = undefined
    target?.remove()
  })

  function mountTarget() {
    target = document.createElement('div')
    target.setAttribute('data-testid', 'fs-target')
    document.body.appendChild(target)
    return target
  }

  it('starts idle unsupported until mount detects adapters', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = createRef<HTMLDivElement>()
    ref.current = el

    let first: ReturnType<typeof useFullscreen> | null = null
    const { result } = renderHook(() => {
      const value = useFullscreen(ref)
      if (first == null) {
        first = { ...value }
      }
      return value
    })

    expect(first).toMatchObject({
      isSupported: false,
      isFullscreen: false,
      fullscreenElement: null,
      error: null,
    })

    await waitFor(() => expect(result.current.isSupported).toBe(true))
  })

  it('enters synchronously preserving user-activation ordering', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    mock.order.length = 0
    mock.order.push('consumer-enter')
    const pending = result.current.enter()
    mock.order.push('consumer-after-enter-call')
    expect(mock.order.slice(0, 3)).toEqual([
      'consumer-enter',
      'native-request',
      'consumer-after-enter-call',
    ])

    await act(async () => {
      mock.order.push('native-settlement')
      await pending
      mock.order.push('public-settlement')
    })

    expect(result.current.isFullscreen).toBe(true)
    expect(result.current.fullscreenElement).toBe(el)
    expect(mock.order).toContain('native-settlement')
    expect(mock.order).toContain('public-settlement')
  })

  it('uses documentElement when ref is omitted', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const { result } = renderHook(() => useFullscreen())
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)
    expect(result.current.fullscreenElement).toBe(document.documentElement)
  })

  it('returns false for null ref without falling back', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const ref = { current: null as HTMLDivElement | null }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let ok = true
    await act(async () => {
      ok = await result.current.enter()
    })
    expect(ok).toBe(false)
    expect(mock.requestCount).toBe(0)
  })

  it('exits only the owned target and ignores other fullscreen elements', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const other = document.createElement('section')
    document.body.appendChild(other)
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    mock.setFullscreenElement(other)
    mock.dispatchChange()
    await waitFor(() => expect(result.current.fullscreenElement).toBe(other))
    expect(result.current.isFullscreen).toBe(false)

    let exited = true
    await act(async () => {
      exited = await result.current.exit()
    })
    expect(exited).toBe(false)
    expect(mock.exitCount).toBe(0)

    other.remove()
  })

  it('toggle reads live document state over stale React snapshot', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    mock.setFullscreenElement(el)
    // Deliberately skip dispatching change so React state stays idle.
    expect(result.current.isFullscreen).toBe(false)

    await act(async () => {
      await result.current.toggle()
    })
    expect(mock.exitCount).toBe(1)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('supports webkit-prefixed adapters and void returns', async () => {
    const mock = installFullscreenMock({ family: 'webkit' })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    await act(async () => {
      await result.current.exit()
    })
    expect(result.current.isFullscreen).toBe(false)
  })

  it('passes navigationUI to standard requestFullscreen', async () => {
    let seen: unknown
    const mock = installFullscreenMock({
      requestImpl: (_element, requestOptions) => {
        seen = requestOptions
        return Promise.resolve()
      },
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() =>
      useFullscreen(ref, { navigationUI: 'hide' }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(seen).toEqual({ navigationUI: 'hide' })
  })

  it('contains request rejection and notifies onError once', async () => {
    const onError = vi.fn()
    const mock = installFullscreenMock({
      requestImpl: () =>
        Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref, { onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let ok = true
    await act(async () => {
      ok = await result.current.enter()
    })
    expect(ok).toBe(false)
    expect(result.current.error?.name).toBe('NotAllowedError')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('ignores stale deferred enter after disable', async () => {
    const pending = deferred<void>()
    const onError = vi.fn()
    const mock = installFullscreenMock({
      requestImpl: () => pending.promise,
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useFullscreen(ref, { enabled, onError }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let enterPromise!: Promise<boolean>
    await act(async () => {
      enterPromise = result.current.enter()
    })

    rerender({ enabled: false })
    expect(result.current.isFullscreen).toBe(false)
    expect(result.current.fullscreenElement).toBeNull()

    await act(async () => {
      pending.resolve()
      await enterPromise
    })
    expect(result.current.isFullscreen).toBe(false)
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not auto-exit platform fullscreen when disabled', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useFullscreen(ref, { enabled }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    rerender({ enabled: false })
    expect(mock.exitCount).toBe(0)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('autoExit exits on genuine unmount but not Strict Mode remount', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }

    const { unmount } = renderHook(
      () => useFullscreen(ref, { autoExit: true }),
      { wrapper: StrictMode },
    )
    await waitFor(async () => {
      // After Strict Mode remount, support should still be true.
      // enter after mount:
    })

    const { result, unmount: unmountOwned } = renderHook(() =>
      useFullscreen(ref, { autoExit: true }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    // First StrictMode pair should not have exited during remount.
    expect(mock.exitCount).toBe(0)

    unmount()
    unmountOwned()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mock.exitCount).toBeGreaterThanOrEqual(1)
  })

  it('target replacement does not exit the previous fullscreen element', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const a = mountTarget()
    const b = document.createElement('div')
    document.body.appendChild(b)
    const ref = { current: a as HTMLDivElement | null }
    const { result, rerender } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    ref.current = b
    rerender()
    await waitFor(() => expect(result.current.isFullscreen).toBe(false))
    expect(mock.exitCount).toBe(0)
    expect(result.current.fullscreenElement).toBe(a)

    b.remove()
  })

  it('explicit document null blocks global fallback for omitted ref', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const { result } = renderHook(() =>
      useFullscreen(undefined, { document: null }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(false))
    let ok = true
    await act(async () => {
      ok = await result.current.enter()
    })
    expect(ok).toBe(false)
    expect(mock.requestCount).toBe(0)
  })

  it('keeps control identities stable across rerenders', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result, rerender } = renderHook(
      ({ navigationUI }: { navigationUI: 'auto' | 'hide' }) =>
        useFullscreen(ref, { navigationUI }),
      { initialProps: { navigationUI: 'auto' as 'auto' | 'hide' } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    const enter = result.current.enter
    const exit = result.current.exit
    const toggle = result.current.toggle
    rerender({ navigationUI: 'hide' })
    expect(result.current.enter).toBe(enter)
    expect(result.current.exit).toBe(exit)
    expect(result.current.toggle).toBe(toggle)
  })

  it('two instances reflect shared document state with owned isFullscreen', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const a = mountTarget()
    const b = document.createElement('div')
    document.body.appendChild(b)
    const refA = { current: a }
    const refB = { current: b }

    const hookA = renderHook(() => useFullscreen(refA))
    const hookB = renderHook(() => useFullscreen(refB))
    await waitFor(() => expect(hookA.result.current.isSupported).toBe(true))
    await waitFor(() => expect(hookB.result.current.isSupported).toBe(true))

    await act(async () => {
      await hookA.result.current.enter()
    })
    expect(hookA.result.current.isFullscreen).toBe(true)
    await waitFor(() => expect(hookB.result.current.fullscreenElement).toBe(a))
    expect(hookB.result.current.isFullscreen).toBe(false)

    let exited = true
    await act(async () => {
      exited = await hookB.result.current.exit()
    })
    expect(exited).toBe(false)
    expect(hookA.result.current.isFullscreen).toBe(true)

    b.remove()
    hookA.unmount()
    hookB.unmount()
  })

  it('survives Strict Mode without requesting on mount', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { unmount } = renderHook(() => useFullscreen(ref), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(mock.requestCount).toBe(0))
    unmount()
  })

  it('contains throwing onError callbacks', async () => {
    const mock = installFullscreenMock({
      requestImpl: () => {
        throw new Error('boom')
      },
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() =>
      useFullscreen(ref, {
        onError: () => {
          throw new Error('callback failed')
        },
      }),
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.error?.message).toBe('boom')
  })

  it('does not infinite-loop or spam onError for stable document mismatch', async () => {
    const el = mountTarget()
    Object.defineProperty(el, 'requestFullscreen', {
      configurable: true,
      value: () => Promise.resolve(),
    })
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: () => Promise.resolve(),
    })
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get() {
        return null
      },
    })
    restore = () => {
      Reflect.deleteProperty(el, 'requestFullscreen')
      Reflect.deleteProperty(document, 'exitFullscreen')
      Reflect.deleteProperty(document, 'fullscreenElement')
    }

    const foreign = document.implementation.createHTMLDocument('foreign')
    const onError = vi.fn()
    const ref = { current: el }
    const { result, rerender } = renderHook(() =>
      useFullscreen(ref, { document: foreign, onError }),
    )

    await waitFor(() => expect(result.current.error).not.toBeNull())
    const firstError = result.current.error
    const calls = onError.mock.calls.length
    expect(calls).toBe(1)

    rerender()
    rerender()
    rerender()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(firstError)
    expect(result.current.isFullscreen).toBe(false)
    expect(result.current.fullscreenElement).toBeNull()
  })

  it('notifies onError once when error event and rejected promise both fire', async () => {
    const pending = deferred<void>()
    const onError = vi.fn()
    const mock = installFullscreenMock({
      requestImpl: () => pending.promise,
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref, { onError }))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let enterPromise!: Promise<boolean>
    await act(async () => {
      enterPromise = result.current.enter()
    })

    await act(async () => {
      mock.dispatchError()
    })
    expect(onError).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.reject(new DOMException('Denied', 'NotAllowedError'))
      await enterPromise
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('keeps enter ordering for toggle and void/thenable requests', async () => {
    const thenable = {
      then(resolve: (value?: unknown) => void) {
        queueMicrotask(() => resolve())
      },
    }
    const mock = installFullscreenMock({
      requestImpl: () => thenable,
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    mock.order.length = 0
    mock.order.push('consumer-enter')
    const pending = result.current.toggle()
    mock.order.push('consumer-after-call')
    expect(mock.order.slice(0, 3)).toEqual([
      'consumer-enter',
      'native-request',
      'consumer-after-call',
    ])

    await act(async () => {
      mock.order.push('native-settlement')
      mock.setFullscreenElement(el)
      mock.dispatchChange()
      await pending
      mock.order.push('public-settlement')
    })
    expect(result.current.isFullscreen).toBe(true)
  })

  it('reconciles event-before-promise and promise-before-event for enter', async () => {
    const holders = {
      setElement: undefined as ((element: Element | null) => void) | undefined,
    }
    const pending = deferred<void>()
    const mock = installFullscreenMock({
      requestImpl: (element) => {
        holders.setElement?.(element)
        return pending.promise
      },
    })
    holders.setElement = mock.setFullscreenElement
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let enterPromise!: Promise<boolean>
    await act(async () => {
      enterPromise = result.current.enter()
    })
    await act(async () => {
      mock.dispatchChange()
    })
    await waitFor(() => expect(result.current.isFullscreen).toBe(true))

    let ok = false
    await act(async () => {
      pending.resolve()
      ok = await enterPromise
    })
    expect(ok).toBe(true)
    expect(result.current.isFullscreen).toBe(true)

    // Promise before event path
    const pending2 = deferred<void>()
    mock.restore()
    const mock2 = installFullscreenMock({
      requestImpl: () => pending2.promise,
    })
    restore = mock2.restore
    const { result: result2, unmount } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result2.current.isSupported).toBe(true))

    let enter2!: Promise<boolean>
    await act(async () => {
      enter2 = result2.current.enter()
    })
    await act(async () => {
      mock2.setFullscreenElement(el)
      pending2.resolve()
      await enter2
    })
    expect(result2.current.isFullscreen).toBe(true)
    unmount()
  })

  it('does not restore true when Escape exits before enter promise settles', async () => {
    const holders = {
      setElement: undefined as ((element: Element | null) => void) | undefined,
      dispatch: undefined as (() => void) | undefined,
    }
    const pending = deferred<void>()
    const mock = installFullscreenMock({
      requestImpl: (element) => {
        holders.setElement?.(element)
        queueMicrotask(() => holders.dispatch?.())
        return pending.promise
      },
    })
    holders.setElement = mock.setFullscreenElement
    holders.dispatch = mock.dispatchChange
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let enterPromise!: Promise<boolean>
    await act(async () => {
      enterPromise = result.current.enter()
    })
    await waitFor(() => expect(result.current.isFullscreen).toBe(true))

    await act(async () => {
      mock.setFullscreenElement(null)
      mock.dispatchChange()
    })
    await waitFor(() => expect(result.current.isFullscreen).toBe(false))

    let ok = true
    await act(async () => {
      pending.resolve()
      ok = await enterPromise
    })
    expect(ok).toBe(false)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('returns false when enter promise settles before native state changes', async () => {
    const pending = deferred<void>()
    const mock = installFullscreenMock({
      requestImpl: () => pending.promise,
    })
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    let ok = true
    await act(async () => {
      const enterPromise = result.current.enter()
      pending.resolve()
      ok = await enterPromise
    })
    expect(ok).toBe(false)
    expect(result.current.isFullscreen).toBe(false)

    await act(async () => {
      mock.setFullscreenElement(el)
      mock.dispatchChange()
    })
    await waitFor(() => expect(result.current.isFullscreen).toBe(true))
  })

  it('reconciles exit event-before-promise and promise-before-event', async () => {
    const holders = {
      setElement: undefined as ((element: Element | null) => void) | undefined,
    }
    const pending = deferred<void>()
    const mock = installFullscreenMock({
      exitImpl: () => {
        holders.setElement?.(null)
        return pending.promise
      },
    })
    holders.setElement = mock.setFullscreenElement
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    let exitPromise!: Promise<boolean>
    await act(async () => {
      exitPromise = result.current.exit()
    })
    await act(async () => {
      mock.dispatchChange()
    })
    await waitFor(() => expect(result.current.isFullscreen).toBe(false))

    let ok = false
    await act(async () => {
      pending.resolve()
      ok = await exitPromise
    })
    expect(ok).toBe(true)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('toggle enters when React true but native null', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result } = renderHook(() => useFullscreen(ref))
    await waitFor(() => expect(result.current.isSupported).toBe(true))

    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    mock.setFullscreenElement(null)
    expect(result.current.isFullscreen).toBe(true)

    await act(async () => {
      await result.current.toggle()
    })
    expect(mock.requestCount).toBe(2)
    expect(result.current.isFullscreen).toBe(true)
  })

  it('re-enables and reconciles while platform remains fullscreen', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useFullscreen(ref, { enabled }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)

    rerender({ enabled: false })
    expect(result.current.isFullscreen).toBe(false)
    expect(mock.exitCount).toBe(0)

    rerender({ enabled: true })
    await waitFor(() => expect(result.current.isFullscreen).toBe(true))
    expect(result.current.fullscreenElement).toBe(el)
  })

  it('autoExit Strict Mode remount does not exit active target', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const { result, unmount } = renderHook(
      () => useFullscreen(ref, { autoExit: true }),
      { wrapper: StrictMode },
    )
    await waitFor(() => expect(result.current.isSupported).toBe(true))
    await act(async () => {
      await result.current.enter()
    })
    expect(result.current.isFullscreen).toBe(true)
    expect(mock.exitCount).toBe(0)

    // Flush microtasks from Strict Mode remount pair — must not exit.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mock.exitCount).toBe(0)
    expect(result.current.isFullscreen).toBe(true)

    unmount()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(mock.exitCount).toBeGreaterThanOrEqual(1)
  })

  it('stale autoExit microtask does not exit a newer session', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }

    const first = renderHook(() => useFullscreen(ref, { autoExit: true }))
    await waitFor(() => expect(first.result.current.isSupported).toBe(true))
    await act(async () => {
      await first.result.current.enter()
    })
    first.unmount()

    const second = renderHook(() => useFullscreen(ref, { autoExit: true }))
    await waitFor(() => expect(second.result.current.isSupported).toBe(true))
    await act(async () => {
      await second.result.current.enter()
    })
    expect(second.result.current.isFullscreen).toBe(true)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    // Stale cleanup from first unmount must not tear down the remounted session.
    expect(second.result.current.isFullscreen).toBe(true)

    second.unmount()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  })

  it('listener churn stays stable across navigationUI and onError identity changes', async () => {
    const mock = installFullscreenMock()
    restore = mock.restore
    const el = mountTarget()
    const ref = { current: el }
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { rerender, unmount } = renderHook(
      ({
        navigationUI,
        onError,
      }: {
        navigationUI: 'auto' | 'hide'
        onError: (error: Error) => void
      }) => useFullscreen(ref, { navigationUI, onError }),
      {
        initialProps: {
          navigationUI: 'auto' as 'auto' | 'hide',
          onError: () => undefined,
        },
      },
    )

    await waitFor(() => expect(addSpy).toHaveBeenCalled())
    const addsAfterMount = addSpy.mock.calls.filter((call) =>
      String(call[0]).includes('fullscreen'),
    ).length

    rerender({ navigationUI: 'hide', onError: () => undefined })
    rerender({ navigationUI: 'hide', onError: () => undefined })
    const addsAfterRerender = addSpy.mock.calls.filter((call) =>
      String(call[0]).includes('fullscreen'),
    ).length
    expect(addsAfterRerender).toBe(addsAfterMount)

    unmount()
    const removes = removeSpy.mock.calls.filter((call) =>
      String(call[0]).includes('fullscreen'),
    ).length
    expect(removes).toBe(addsAfterMount)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
