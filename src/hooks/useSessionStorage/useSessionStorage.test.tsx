import {
  StrictMode,
  useEffect,
  useLayoutEffect,
  type ReactElement,
} from 'react'
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useLocalStorage } from '../useLocalStorage/useLocalStorage'
import { useSessionStorage } from './useSessionStorage'

const PREFIX = 'muradyanvano-react-hooks:unit:useSessionStorage:'

function key(suffix: string): string {
  return `${PREFIX}${suffix}`
}

function clearPrefixedKeys(): void {
  for (const store of [sessionStorage, localStorage]) {
    const toRemove: string[] = []
    for (let index = 0; index < store.length; index += 1) {
      const itemKey = store.key(index)
      if (itemKey?.startsWith(PREFIX)) {
        toRemove.push(itemKey)
      }
    }
    for (const itemKey of toRemove) {
      store.removeItem(itemKey)
    }
  }
}

afterEach(() => {
  cleanup()
  clearPrefixedKeys()
  vi.restoreAllMocks()
})

describe('useSessionStorage', () => {
  it('uses sessionStorage and never localStorage for the same key', async () => {
    const storageKey = key('kind')
    const { result } = renderHook(() =>
      useSessionStorage(storageKey, 'fallback'),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      result.current.setValue('session-value')
    })
    expect(sessionStorage.getItem(storageKey)).toBe('session-value')
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('keeps the same textual key independent from useLocalStorage', async () => {
    const storageKey = key('isolation')
    const session = renderHook(() => useSessionStorage(storageKey, 's-default'))
    const local = renderHook(() => useLocalStorage(storageKey, 'l-default'))
    await waitFor(() => {
      expect(session.result.current.isReady).toBe(true)
      expect(local.result.current.isReady).toBe(true)
    })

    act(() => {
      session.result.current.setValue('from-session')
      local.result.current.setValue('from-local')
    })

    expect(session.result.current.value).toBe('from-session')
    expect(local.result.current.value).toBe('from-local')
    expect(sessionStorage.getItem(storageKey)).toBe('from-session')
    expect(localStorage.getItem(storageKey)).toBe('from-local')
  })

  it('restores session values after remount', async () => {
    const storageKey = key('remount')
    const first = renderHook(() => useSessionStorage(storageKey, 0))
    await waitFor(() => expect(first.result.current.isReady).toBe(true))
    act(() => {
      first.result.current.setValue(9)
    })
    first.unmount()

    const second = renderHook(() => useSessionStorage(storageKey, 0))
    await waitFor(() => expect(second.result.current.isReady).toBe(true))
    expect(second.result.current.value).toBe(9)
  })

  it('writes defaults for missing keys when enabled', async () => {
    const storageKey = key('write-defaults')
    const { result } = renderHook(() =>
      useSessionStorage(storageKey, 'fallback', { writeDefaults: true }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(sessionStorage.getItem(storageKey)).toBe('fallback')
  })

  it('skips writing defaults when disabled', async () => {
    const storageKey = key('no-write-defaults')
    const { result } = renderHook(() =>
      useSessionStorage(storageKey, 'fallback', { writeDefaults: false }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(sessionStorage.getItem(storageKey)).toBeNull()
  })

  it('reads automatic serializer kinds from sessionStorage', async () => {
    sessionStorage.setItem(key('bool'), 'false')
    sessionStorage.setItem(key('num'), '3')
    sessionStorage.setItem(key('obj'), '{"a":1}')
    sessionStorage.setItem(key('date'), '2024-01-01T00:00:00.000Z')
    sessionStorage.setItem(key('map'), '[["k",1]]')
    sessionStorage.setItem(key('set'), '["a"]')

    const boolHook = renderHook(() => useSessionStorage(key('bool'), true))
    const numHook = renderHook(() => useSessionStorage(key('num'), 0))
    const objHook = renderHook(() => useSessionStorage(key('obj'), { a: 0 }))
    const dateHook = renderHook(() =>
      useSessionStorage(key('date'), new Date(0)),
    )
    const mapHook = renderHook(() => useSessionStorage(key('map'), new Map()))
    const setHook = renderHook(() => useSessionStorage(key('set'), new Set()))

    await waitFor(() => {
      expect(boolHook.result.current.isReady).toBe(true)
      expect(numHook.result.current.isReady).toBe(true)
      expect(objHook.result.current.isReady).toBe(true)
      expect(dateHook.result.current.isReady).toBe(true)
      expect(mapHook.result.current.isReady).toBe(true)
      expect(setHook.result.current.isReady).toBe(true)
    })

    expect(boolHook.result.current.value).toBe(false)
    expect(numHook.result.current.value).toBe(3)
    expect(objHook.result.current.value).toEqual({ a: 1 })
    expect(dateHook.result.current.value.toISOString()).toBe(
      '2024-01-01T00:00:00.000Z',
    )
    expect(mapHook.result.current.value).toEqual(new Map([['k', 1]]))
    expect(setHook.result.current.value).toEqual(new Set(['a']))
  })

  it('falls back on malformed session values without destroying them', async () => {
    const storageKey = key('malformed')
    sessionStorage.setItem(storageKey, '{bad')
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useSessionStorage(storageKey, { ok: true }, { onError }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toEqual({ ok: true })
    expect(result.current.error).toBeInstanceOf(Error)
    expect(sessionStorage.getItem(storageKey)).toBe('{bad')
    expect(onError).toHaveBeenCalled()
  })

  it('synchronizes same-document session peers and ignores local storage events', async () => {
    const storageKey = key('sync')
    const a = renderHook(() => useSessionStorage(storageKey, 0))
    const b = renderHook(() => useSessionStorage(storageKey, 0))
    await waitFor(() => {
      expect(a.result.current.isReady).toBe(true)
      expect(b.result.current.isReady).toBe(true)
    })

    act(() => {
      a.result.current.setValue(4)
    })
    await waitFor(() => expect(b.result.current.value).toBe(4))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: '99',
          storageArea: localStorage,
        }),
      )
    })
    expect(b.result.current.value).toBe(4)

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: '8',
          storageArea: sessionStorage,
        }),
      )
    })
    await waitFor(() => expect(b.result.current.value).toBe(8))
  })

  it('supports remove versus reset', async () => {
    const storageKey = key('remove-reset')
    const { result } = renderHook(() =>
      useSessionStorage(storageKey, 'default'),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.setValue('saved')
    })
    act(() => {
      result.current.remove()
    })
    expect(sessionStorage.getItem(storageKey)).toBeNull()
    expect(result.current.value).toBe('default')
    act(() => {
      result.current.reset()
    })
    expect(sessionStorage.getItem(storageKey)).toBe('default')
  })

  it('handles explicit null window and later replacement', async () => {
    const storageKey = key('null-window')
    const { result, rerender } = renderHook(
      ({ target }) =>
        useSessionStorage(storageKey, 'fallback', { window: target }),
      { initialProps: { target: null as Window | null } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.isSupported).toBe(false)
    act(() => {
      result.current.setValue('local-only')
    })
    expect(sessionStorage.getItem(storageKey)).toBeNull()

    rerender({ target: window })
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true)
      expect(result.current.isReady).toBe(true)
    })
  })

  it('is StrictMode safe', async () => {
    const storageKey = key('strict')
    const { result } = renderHook(() => useSessionStorage(storageKey, 'x'), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(sessionStorage.getItem(storageKey)).toBe('x')
  })

  it('renders safely under SSR without touching sessionStorage', () => {
    const storageKey = key('ssr')
    const getItem = vi.spyOn(Storage.prototype, 'getItem')

    function Probe(): ReactElement {
      const api = useSessionStorage(storageKey, 'ssr-default')
      return (
        <span>
          {api.value}|{String(api.isReady)}|{String(api.isSupported)}
        </span>
      )
    }

    const html = renderToString(<Probe />)
    expect(html).toContain('ssr-default')
    expect(html).toContain('false')
    expect(getItem).not.toHaveBeenCalled()
  })
})

describe('pre-ready storage mutation races', () => {
  it('keeps setValue issued before session initialization', async () => {
    const storageKey = key('pre-ready-set-session')
    sessionStorage.setItem(storageKey, 'stale')

    function Probe(): ReactElement {
      const api = useSessionStorage(storageKey, 'default')
      useLayoutEffect(() => {
        api.setValue('fresh')
        // Mount-only race against the later storage initialization effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once
      }, [])
      return <span data-testid="v">{api.value}</span>
    }

    const view = render(<Probe />)
    await waitFor(() => {
      expect(view.getByTestId('v').textContent).toBe('fresh')
    })
    expect(sessionStorage.getItem(storageKey)).toBe('fresh')
  })

  it('keeps remove issued before local initialization', async () => {
    const storageKey = key('pre-ready-remove-local')
    localStorage.setItem(storageKey, 'stale')

    function Probe(): ReactElement {
      const api = useLocalStorage(storageKey, 'default')
      useLayoutEffect(() => {
        api.remove()
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once
      }, [])
      return <span data-testid="v">{api.value}</span>
    }

    const view = render(<Probe />)
    await waitFor(() => {
      expect(view.getByTestId('v').textContent).toBe('default')
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('keeps functional updates and reset before readiness', async () => {
    const storageKey = key('pre-ready-functional')
    sessionStorage.setItem(storageKey, '0')

    function Probe(): ReactElement {
      const api = useSessionStorage(storageKey, 0)
      useLayoutEffect(() => {
        api.setValue((current) => current + 5)
        api.setValue((current) => current + 1)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once
      }, [])
      return <span data-testid="v">{String(api.value)}</span>
    }

    const view = render(<Probe />)
    await waitFor(() => {
      expect(view.getByTestId('v').textContent).toBe('6')
    })
    expect(sessionStorage.getItem(storageKey)).toBe('6')
  })

  it('does not let late init overwrite a pre-ready reset', async () => {
    const storageKey = key('pre-ready-reset')
    localStorage.setItem(storageKey, 'stale')

    function Probe(): ReactElement {
      const api = useLocalStorage(storageKey, 'default')
      useLayoutEffect(() => {
        api.reset()
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once
      }, [])
      return <span data-testid="v">{api.value}</span>
    }

    const view = render(<Probe />)
    await waitFor(() => {
      expect(view.getByTestId('v').textContent).toBe('default')
    })
    expect(localStorage.getItem(storageKey)).toBe('default')
  })

  it('preserves pre-ready mutations across Strict Mode', async () => {
    const storageKey = key('pre-ready-strict')
    sessionStorage.setItem(storageKey, 'old')

    function Probe(): ReactElement {
      const api = useSessionStorage(storageKey, 'default')
      useLayoutEffect(() => {
        api.setValue('owned')
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once
      }, [])
      return <span data-testid="v">{api.value}</span>
    }

    const view = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    )
    await waitFor(() => {
      expect(view.getByTestId('v').textContent).toBe('owned')
    })
    expect(sessionStorage.getItem(storageKey)).toBe('owned')
  })

  it('preserves pre-ready set across dynamic key replacement', async () => {
    const keyA = key('pre-ready-key-a')
    const keyB = key('pre-ready-key-b')
    sessionStorage.setItem(keyA, 'A')
    sessionStorage.setItem(keyB, 'B')

    function Probe({ active }: { active: string }): ReactElement {
      const api = useSessionStorage(active, 'fallback')
      useEffect(() => {
        if (active === keyB) {
          api.setValue('B-new')
        }
      }, [active, api])
      return <span data-testid="v">{api.value}</span>
    }

    const view = render(<Probe active={keyA} />)
    await waitFor(() => expect(view.getByTestId('v').textContent).toBe('A'))
    view.rerender(<Probe active={keyB} />)
    await waitFor(() => expect(view.getByTestId('v').textContent).toBe('B-new'))
    expect(sessionStorage.getItem(keyA)).toBe('A')
    expect(sessionStorage.getItem(keyB)).toBe('B-new')
  })
})
