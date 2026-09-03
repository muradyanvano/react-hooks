import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { StrictMode, useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

import { useCookies } from './useCookies'

const PREFIX = 'rh_uc_test_'

function key(suffix: string): string {
  return `${PREFIX}${suffix}`
}

function clearTestCookies(): void {
  const names = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0] ?? '')
    .filter((name) => name.startsWith(PREFIX))
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/`
  }
}

afterEach(() => {
  cleanup()
  clearTestCookies()
  vi.useRealTimers()
})

beforeEach(() => {
  clearTestCookies()
})

describe('useCookies', () => {
  it('sets, gets, and removes cookies with path', async () => {
    const { result } = renderHook(() => useCookies([key('basic')]))

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.set(key('basic'), 'hello', { path: '/' })).toBe(true)
    expect(result.current.get(key('basic'))).toBe('hello')
    expect(result.current.remove(key('basic'), { path: '/' })).toBe(true)
    expect(result.current.get(key('basic'))).toBeUndefined()
  })

  it('serializes JSON and respects doNotParse overrides', async () => {
    const name = key('json')
    const { result } = renderHook(() =>
      useCookies([name], { doNotParse: false }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.set(name, { theme: 'dark' }, { path: '/' })).toBe(
      true,
    )
    expect(result.current.get<{ theme: string }>(name)).toEqual({
      theme: 'dark',
    })
    expect(result.current.get(name, { doNotParse: true })).toBe(
      '{"theme":"dark"}',
    )

    expect(result.current.set(name, 'true', { path: '/' })).toBe(true)
    expect(result.current.get(name)).toBe(true)
    expect(result.current.get(name, { doNotParse: true })).toBe('true')
  })

  it('rejects invalid names and non-serializable values', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useCookies(undefined, { onError }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      expect(result.current.set('bad name', 'x')).toBe(false)
    })
    expect(result.current.error).toBeInstanceOf(Error)
    expect(onError).toHaveBeenCalled()

    act(() => {
      expect(result.current.set(key('circ'), undefined)).toBe(false)
    })
    const circular: { self?: unknown } = {}
    circular.self = circular
    act(() => {
      expect(result.current.set(key('circ'), circular)).toBe(false)
    })
  })

  it('formats attribute-bearing assignments', async () => {
    const name = key('attrs')
    const { result } = renderHook(() => useCookies([name]))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    const spy = vi.spyOn(document, 'cookie', 'set')
    result.current.set(name, 'v', {
      path: '/',
      maxAge: 10,
      sameSite: 'lax',
      secure: false,
    })
    expect(spy).toHaveBeenCalled()
    const assignment = String(spy.mock.calls.at(-1)?.[0] ?? '')
    expect(assignment).toContain('Path=/')
    expect(assignment).toContain('Max-Age=10')
    expect(assignment).toContain('SameSite=Lax')
    spy.mockRestore()
  })

  it('returns fresh getAll snapshots', async () => {
    const name = key('all')
    const { result } = renderHook(() => useCookies())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    result.current.set(name, 1, { path: '/' })
    const first = result.current.getAll()
    const second = result.current.getAll()
    expect(first).not.toBe(second)
    expect(first[name]).toBe(1)
  })

  it('filters rerenders by dependencies and empty arrays', async () => {
    const watched = key('dep-watch')
    const other = key('dep-other')
    let renders = 0

    function Probe() {
      const cookies = useCookies([watched])
      renders += 1
      return (
        <span data-testid="value">{String(cookies.get(watched) ?? '')}</span>
      )
    }

    render(<Probe />)
    await waitFor(() => expect(renders).toBeGreaterThan(0))
    const afterMount = renders

    const writer = renderHook(() => useCookies())
    await waitFor(() => expect(writer.result.current.isReady).toBe(true))

    act(() => {
      writer.result.current.set(other, 'x', { path: '/' })
    })
    expect(renders).toBe(afterMount)

    act(() => {
      writer.result.current.set(watched, 'y', { path: '/' })
    })
    await waitFor(() => expect(renders).toBeGreaterThan(afterMount))

    let emptyRenders = 0
    function EmptyDeps() {
      useCookies([])
      emptyRenders += 1
      return null
    }
    render(<EmptyDeps />)
    const emptyAfterMount = emptyRenders
    act(() => {
      writer.result.current.set(watched, 'z', { path: '/' })
    })
    expect(emptyRenders).toBe(emptyAfterMount)
  })

  it('collects automatic dependencies without render during get', async () => {
    const name = key('auto')
    const { result } = renderHook(() =>
      useCookies([], { autoUpdateDependencies: true }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      void result.current.get(name)
    })

    const writer = renderHook(() => useCookies())
    await waitFor(() => expect(writer.result.current.isReady).toBe(true))

    let seen = false
    const unsub = result.current.addChangeListener((change) => {
      if (change.name === name) {
        seen = true
      }
    })

    act(() => {
      writer.result.current.set(name, 'auto', { path: '/' })
    })
    await waitFor(() => expect(seen).toBe(true))
    unsub()
  })

  it('synchronizes same-document instances and reports change causes', async () => {
    const name = key('sync')
    const a = renderHook(() => useCookies([name]))
    const b = renderHook(() => useCookies([name]))
    await waitFor(() => {
      expect(a.result.current.isReady).toBe(true)
      expect(b.result.current.isReady).toBe(true)
    })

    const events: string[] = []
    a.result.current.addChangeListener((change) => {
      events.push(`${change.cause}:${String(change.value)}`)
    })

    act(() => {
      expect(b.result.current.set(name, 'peer', { path: '/' })).toBe(true)
    })
    await waitFor(() => expect(a.result.current.get(name)).toBe('peer'))
    expect(events.some((entry) => entry.startsWith('set:'))).toBe(true)

    act(() => {
      b.result.current.remove(name, { path: '/' })
    })
    await waitFor(() => expect(a.result.current.get(name)).toBeUndefined())
  })

  it('refresh detects external cookie writes', async () => {
    const name = key('external')
    const { result } = renderHook(() => useCookies([name], { watch: false }))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent('"ext"')}; Path=/`
    act(() => {
      result.current.refresh()
    })
    expect(result.current.get(name)).toBe('ext')
  })

  it('polls when Cookie Store is unavailable', async () => {
    vi.useFakeTimers()
    const name = key('poll')
    const previous = Object.getOwnPropertyDescriptor(window, 'cookieStore')
    Object.defineProperty(window, 'cookieStore', {
      configurable: true,
      value: undefined,
    })

    const { result, unmount } = renderHook(() =>
      useCookies([name], { watch: true, pollingInterval: 200 }),
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.isReady).toBe(true)

    document.cookie = `${encodeURIComponent(name)}=poll-value; Path=/`
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.get(name)).toBe('poll-value')

    unmount()
    Object.defineProperty(window, 'cookieStore', {
      configurable: true,
      value: undefined,
    })
    if (previous) {
      Object.defineProperty(window, 'cookieStore', previous)
    }
  })

  it('keeps stable method identities', async () => {
    const { result, rerender } = renderHook(() => useCookies([key('stable')]))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const first = result.current
    rerender()
    expect(result.current.get).toBe(first.get)
    expect(result.current.set).toBe(first.set)
    expect(result.current.remove).toBe(first.remove)
    expect(result.current.refresh).toBe(first.refresh)
    expect(result.current.addChangeListener).toBe(first.addChangeListener)
  })

  it('is StrictMode safe', async () => {
    const name = key('strict')
    const { result } = renderHook(() => useCookies([name]), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.set(name, 'ok', { path: '/' })).toBe(true)
    expect(result.current.get(name)).toBe('ok')
  })

  it('preserves pre-ready set against late initialization', async () => {
    const name = key('preready')
    document.cookie = `${encodeURIComponent(name)}=stale; Path=/`

    function Harness() {
      const cookies = useCookies([name])
      useLayoutEffect(() => {
        cookies.set(name, 'fresh', { path: '/' })
      }, [cookies])
      return <span data-testid="v">{String(cookies.get(name) ?? '')}</span>
    }

    const view = render(<Harness />)
    await waitFor(() => {
      expect(view.getByTestId('v').textContent).toBe('fresh')
    })
  })

  it('supports SSR initialCookies without document access', () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    const captured: { current: ReturnType<typeof useCookies> | null } = {
      current: null,
    }

    function Server() {
      const cookies = useCookies([key('ssr')], {
        initialCookies: `${key('ssr')}=en-US; other=1`,
        document: null,
      })
      captured.current = cookies
      return <span>{String(cookies.get(key('ssr')))}</span>
    }

    const html = renderToString(<Server />)
    expect(html).toContain('en-US')
    expect(captured.current?.isReady).toBe(true)
    expect(captured.current?.isSupported).toBe(false)
    expect(captured.current?.getAll()).toEqual({
      [key('ssr')]: 'en-US',
      other: 1,
    })
    expect(captured.current?.set(key('ssr'), 'x')).toBe(true)
    expect(captured.current?.remove(key('ssr'))).toBe(true)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('SSR without initialCookies stays not ready', () => {
    const captured: { current: ReturnType<typeof useCookies> | null } = {
      current: null,
    }
    function Server() {
      const cookies = useCookies(undefined, { document: null })
      captured.current = cookies
      return <span>{cookies.isReady ? 'ready' : 'pending'}</span>
    }
    const html = renderToString(<Server />)
    expect(html).toContain('pending')
    expect(captured.current?.isSupported).toBe(false)
    expect(captured.current?.getAll()).toEqual({})
  })

  it('handles explicit null document and replacement', async () => {
    const name = key('doc')
    const { result, rerender } = renderHook(
      ({ doc }: { doc: Document | null }) =>
        useCookies([name], { document: doc }),
      { initialProps: { doc: null as Document | null } },
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.isSupported).toBe(false)
    expect(result.current.set(name, 'local', { path: '/' })).toBe(true)
    expect(result.current.get(name)).toBe('local')

    rerender({ doc: document })
    await waitFor(() => expect(result.current.isSupported).toBe(true))
  })

  it('contains throwing change listeners', async () => {
    const name = key('listener')
    const { result } = renderHook(() => useCookies([name]))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    const good = vi.fn()
    result.current.addChangeListener(() => {
      throw new Error('boom')
    })
    result.current.addChangeListener(good)

    act(() => {
      result.current.set(name, 'ok', { path: '/' })
    })
    expect(good).toHaveBeenCalled()
  })

  it('does not notify after unmount', async () => {
    const name = key('unmount')
    const { result, unmount } = renderHook(() => useCookies([name]))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const listener = vi.fn()
    result.current.addChangeListener(listener)
    unmount()

    document.cookie = `${encodeURIComponent(name)}=after; Path=/`
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('useCookies cookieStore events', () => {
  it('refreshes from structural Cookie Store change events', async () => {
    const name = key('store')
    const listeners = new Set<(event: unknown) => void>()
    const store = {
      addEventListener: (_type: string, listener: (event: unknown) => void) => {
        listeners.add(listener)
      },
      removeEventListener: (
        _type: string,
        listener: (event: unknown) => void,
      ) => {
        listeners.delete(listener)
      },
    }
    Object.defineProperty(window, 'cookieStore', {
      configurable: true,
      value: store,
    })

    const { result, unmount } = renderHook(() =>
      useCookies([name], { watch: true }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    document.cookie = `${encodeURIComponent(name)}=from-store; Path=/`
    act(() => {
      for (const listener of listeners) {
        listener({
          changed: [{ name }],
          deleted: [],
        })
      }
    })
    await waitFor(() => expect(result.current.get(name)).toBe('from-store'))

    unmount()
    expect(listeners.size).toBe(0)
  })
})
