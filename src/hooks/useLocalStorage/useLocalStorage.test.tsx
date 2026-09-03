import { StrictMode, type ReactElement } from 'react'
import { act, render, renderHook, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  useLocalStorage,
  type UseLocalStorageMergeDefaults,
} from './useLocalStorage'

const PREFIX = 'muradyanvano-react-hooks:unit:useLocalStorage:'

function key(suffix: string): string {
  return `${PREFIX}${suffix}`
}

function clearPrefixedKeys(): void {
  const toRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const itemKey = localStorage.key(index)
    if (itemKey?.startsWith(PREFIX)) {
      toRemove.push(itemKey)
    }
  }
  for (const itemKey of toRemove) {
    localStorage.removeItem(itemKey)
  }
}

afterEach(() => {
  clearPrefixedKeys()
  vi.restoreAllMocks()
})

describe('useLocalStorage', () => {
  it('starts with SSR-safe defaults on the server render', () => {
    function Probe(): ReactElement {
      const api = useLocalStorage(key('initial-state'), 'fallback')
      return (
        <span data-testid="probe">
          {api.value}|{String(api.isSupported)}|{String(api.isReady)}|
          {api.error == null ? 'null' : 'error'}
        </span>
      )
    }

    const html = renderToString(<Probe />)
    expect(html).toContain('fallback')
    expect(html).toMatch(/false/)
    expect(html).toContain('null')
    expect(html).not.toContain('true')
  })

  it('becomes ready and supported after mount', async () => {
    const storageKey = key('ready')
    const { result } = renderHook(() => useLocalStorage(storageKey, 'fallback'))

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
      expect(result.current.isSupported).toBe(true)
    })
    expect(result.current.value).toBe('fallback')
    expect(localStorage.getItem(storageKey)).toBe('fallback')
  })

  it('does not write defaults when writeDefaults is false', async () => {
    const storageKey = key('no-write-defaults')
    const { result } = renderHook(() =>
      useLocalStorage(storageKey, 'fallback', { writeDefaults: false }),
    )

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
    expect(result.current.value).toBe('fallback')
  })

  it('reads existing string, boolean, number, object, and array values', async () => {
    localStorage.setItem(key('str'), 'persisted')
    localStorage.setItem(key('bool'), 'false')
    localStorage.setItem(key('num'), '42')
    localStorage.setItem(key('obj'), '{"a":1}')
    localStorage.setItem(key('arr'), '[1,2]')

    const stringHook = renderHook(() => useLocalStorage(key('str'), 'x'))
    const boolHook = renderHook(() => useLocalStorage(key('bool'), true))
    const numHook = renderHook(() => useLocalStorage(key('num'), 0))
    const objHook = renderHook(() => useLocalStorage(key('obj'), { a: 0 }))
    const arrHook = renderHook(() =>
      useLocalStorage(key('arr'), [] as number[]),
    )

    await waitFor(() => {
      expect(stringHook.result.current.isReady).toBe(true)
      expect(boolHook.result.current.isReady).toBe(true)
      expect(numHook.result.current.isReady).toBe(true)
      expect(objHook.result.current.isReady).toBe(true)
      expect(arrHook.result.current.isReady).toBe(true)
    })

    expect(stringHook.result.current.value).toBe('persisted')
    expect(boolHook.result.current.value).toBe(false)
    expect(numHook.result.current.value).toBe(42)
    expect(objHook.result.current.value).toEqual({ a: 1 })
    expect(arrHook.result.current.value).toEqual([1, 2])
  })

  it('reads Date, Map, and Set values', async () => {
    const date = new Date('2024-06-01T00:00:00.000Z')
    localStorage.setItem(key('date'), date.toISOString())
    localStorage.setItem(key('map'), '[["a",1]]')
    localStorage.setItem(key('set'), '["x","y"]')

    const dateHook = renderHook(() => useLocalStorage(key('date'), new Date(0)))
    const mapHook = renderHook(() => useLocalStorage(key('map'), new Map()))
    const setHook = renderHook(() => useLocalStorage(key('set'), new Set()))

    await waitFor(() => {
      expect(dateHook.result.current.isReady).toBe(true)
      expect(mapHook.result.current.isReady).toBe(true)
      expect(setHook.result.current.isReady).toBe(true)
    })

    expect(dateHook.result.current.value.getTime()).toBe(date.getTime())
    expect(mapHook.result.current.value).toEqual(new Map([['a', 1]]))
    expect(setHook.result.current.value).toEqual(new Set(['x', 'y']))
  })

  it('supports null with an explicit custom serializer', async () => {
    const storageKey = key('null-custom')
    localStorage.setItem(storageKey, 'NULL')
    const { result } = renderHook(() =>
      useLocalStorage<string | null>(storageKey, null, {
        serializer: {
          read: (raw) => (raw === 'NULL' ? null : raw),
          write: (value) => (value == null ? 'NULL' : value),
        },
      }),
    )

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
    expect(result.current.value).toBeNull()
  })

  it('falls back on malformed values without overwriting storage', async () => {
    const storageKey = key('malformed')
    localStorage.setItem(storageKey, '{bad')
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useLocalStorage(storageKey, { ok: true }, { onError }),
    )

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
    expect(result.current.value).toEqual({ ok: true })
    expect(result.current.error).toBeInstanceOf(Error)
    expect(onError).toHaveBeenCalled()
    expect(localStorage.getItem(storageKey)).toBe('{bad')
  })

  it('reports getItem failures and still becomes ready', async () => {
    const storageKey = key('getitem-fail')
    const onError = vi.fn()
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = function (this: Storage, itemKey: string) {
      if (itemKey === storageKey) {
        throw new Error('get blocked')
      }
      return original.call(this, itemKey)
    }

    const { result } = renderHook(() =>
      useLocalStorage(storageKey, 'fallback', { onError }),
    )

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })
    expect(result.current.value).toBe('fallback')
    expect(result.current.error?.message).toBe('get blocked')
    expect(onError).toHaveBeenCalled()
    Storage.prototype.getItem = original
  })

  it('supports direct and functional setters with stable identity', async () => {
    const storageKey = key('setters')
    const { result } = renderHook(() => useLocalStorage(storageKey, 0))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    const setValue = result.current.setValue
    act(() => {
      result.current.setValue(1)
    })
    expect(result.current.value).toBe(1)
    expect(localStorage.getItem(storageKey)).toBe('1')

    act(() => {
      result.current.setValue((current) => current + 2)
    })
    expect(result.current.value).toBe(3)
    expect(result.current.setValue).toBe(setValue)
  })

  it('skips identical Object.is updates', async () => {
    const storageKey = key('identical')
    const { result } = renderHook(() => useLocalStorage(storageKey, 'same'))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    const spy = vi.spyOn(Storage.prototype, 'setItem')
    const callsBefore = spy.mock.calls.length
    act(() => {
      result.current.setValue('same')
    })
    expect(spy.mock.calls.length).toBe(callsBefore)
    spy.mockRestore()
  })

  it('keeps local state on setItem failure without notifying peers', async () => {
    const storageKey = key('setitem-fail')
    const peer = renderHook(() => useLocalStorage(storageKey, 'start'))
    const writer = renderHook(() => useLocalStorage(storageKey, 'start'))
    await waitFor(() => {
      expect(peer.result.current.isReady).toBe(true)
      expect(writer.result.current.isReady).toBe(true)
    })

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (
      this: Storage,
      itemKey: string,
      value: string,
    ) {
      if (itemKey === storageKey && value === 'next') {
        throw new Error('quota')
      }
      return original.call(this, itemKey, value)
    }

    act(() => {
      writer.result.current.setValue('next')
    })

    expect(writer.result.current.value).toBe('next')
    expect(writer.result.current.error?.message).toBe('quota')
    expect(peer.result.current.value).toBe('start')
    Storage.prototype.setItem = original
  })

  it('contains circular serialization failures', async () => {
    const storageKey = key('circular')
    const { result } = renderHook(() =>
      useLocalStorage<Record<string, unknown>>(storageKey, {}),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    const circular: Record<string, unknown> = {}
    circular.self = circular
    act(() => {
      result.current.setValue(circular)
    })
    expect(result.current.value).toBe(circular)
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('remove deletes the key and reset persists the default', async () => {
    const storageKey = key('remove-reset')
    const { result, rerender } = renderHook(
      ({ fallback }) => useLocalStorage(storageKey, fallback),
      { initialProps: { fallback: 'default-a' } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      result.current.setValue('saved')
    })
    expect(localStorage.getItem(storageKey)).toBe('saved')

    rerender({ fallback: 'default-b' })
    act(() => {
      result.current.remove()
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
    expect(result.current.value).toBe('default-b')

    act(() => {
      result.current.reset()
    })
    expect(localStorage.getItem(storageKey)).toBe('default-b')
    expect(result.current.value).toBe('default-b')
  })

  it('keeps remove and reset identities stable', async () => {
    const storageKey = key('stable-controls')
    const { result, rerender } = renderHook(() =>
      useLocalStorage(storageKey, 'x'),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const { remove, reset, setValue } = result.current
    rerender()
    expect(result.current.remove).toBe(remove)
    expect(result.current.reset).toBe(reset)
    expect(result.current.setValue).toBe(setValue)
  })

  it('merges plain-object defaults without rewriting storage', async () => {
    const storageKey = key('merge')
    localStorage.setItem(storageKey, '{"theme":"dark"}')
    const { result } = renderHook(() =>
      useLocalStorage(
        storageKey,
        { theme: 'light', compact: false },
        { mergeDefaults: true, writeDefaults: false },
      ),
    )

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toEqual({ theme: 'dark', compact: false })
    expect(localStorage.getItem(storageKey)).toBe('{"theme":"dark"}')
  })

  it('does not shallow-merge arrays', async () => {
    const storageKey = key('merge-array')
    localStorage.setItem(storageKey, '[1]')
    const { result } = renderHook(() =>
      useLocalStorage(storageKey, [0, 2], { mergeDefaults: true }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toEqual([1])
  })

  it('uses the latest custom merge callback and contains throws', async () => {
    const storageKey = key('merge-fn')
    localStorage.setItem(storageKey, '1')
    const merge = vi.fn((stored: number, fallback: number) => stored + fallback)
    const { result, rerender } = renderHook(
      ({ mergeDefaults }) =>
        useLocalStorage(storageKey, 10, {
          mergeDefaults,
          writeDefaults: false,
        }),
      {
        initialProps: {
          mergeDefaults: merge as UseLocalStorageMergeDefaults<number>,
        },
      },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toBe(11)

    const throwing: UseLocalStorageMergeDefaults<number> = () => {
      throw new Error('merge failed')
    }
    rerender({ mergeDefaults: throwing })
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: '2',
          storageArea: localStorage,
        }),
      )
    })
    await waitFor(() => {
      expect(result.current.error?.message).toBe('merge failed')
    })
    expect(result.current.value).toBe(10)
  })

  it('synchronizes two instances on the same key', async () => {
    const storageKey = key('sync-same')
    const a = renderHook(() => useLocalStorage(storageKey, 0))
    const b = renderHook(() => useLocalStorage(storageKey, 0))
    await waitFor(() => {
      expect(a.result.current.isReady).toBe(true)
      expect(b.result.current.isReady).toBe(true)
    })

    act(() => {
      a.result.current.setValue(7)
    })
    await waitFor(() => {
      expect(b.result.current.value).toBe(7)
    })
  })

  it('keeps different keys independent', async () => {
    const a = renderHook(() => useLocalStorage(key('diff-a'), 0))
    const b = renderHook(() => useLocalStorage(key('diff-b'), 0))
    await waitFor(() => {
      expect(a.result.current.isReady).toBe(true)
      expect(b.result.current.isReady).toBe(true)
    })
    act(() => {
      a.result.current.setValue(1)
    })
    expect(b.result.current.value).toBe(0)
  })

  it('does not notify unmounted subscribers', async () => {
    const storageKey = key('unmounted')
    const a = renderHook(() => useLocalStorage(storageKey, 0))
    const b = renderHook(() => useLocalStorage(storageKey, 0))
    await waitFor(() => {
      expect(a.result.current.isReady).toBe(true)
      expect(b.result.current.isReady).toBe(true)
    })
    b.unmount()
    act(() => {
      a.result.current.setValue(9)
    })
    expect(a.result.current.value).toBe(9)
  })

  it('applies matching storage events and ignores unrelated ones', async () => {
    const storageKey = key('storage-event')
    const { result } = renderHook(() => useLocalStorage(storageKey, 'base'))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: 'from-tab',
          storageArea: localStorage,
        }),
      )
    })
    await waitFor(() => {
      expect(result.current.value).toBe('from-tab')
    })

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: key('other'),
          newValue: 'ignored',
          storageArea: localStorage,
        }),
      )
    })
    expect(result.current.value).toBe('from-tab')
  })

  it('resets on clear events without rewriting defaults', async () => {
    const storageKey = key('clear-event')
    localStorage.setItem(storageKey, 'saved')
    const { result } = renderHook(() =>
      useLocalStorage(storageKey, 'fallback', { writeDefaults: true }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toBe('saved')

    localStorage.removeItem(storageKey)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: null,
          newValue: null,
          storageArea: localStorage,
        }),
      )
    })
    await waitFor(() => {
      expect(result.current.value).toBe('fallback')
    })
    expect(localStorage.getItem(storageKey)).toBeNull()
  })

  it('handles malformed external storage events', async () => {
    const storageKey = key('bad-event')
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useLocalStorage(storageKey, { ok: true }, { onError }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: storageKey,
          newValue: '{bad',
          storageArea: localStorage,
        }),
      )
    })
    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })
    expect(result.current.value).toEqual({ ok: true })
    expect(onError).toHaveBeenCalled()
  })

  it('disables synchronization when listenToStorageChanges is false', async () => {
    const storageKey = key('no-listen')
    const a = renderHook(() =>
      useLocalStorage(storageKey, 0, { listenToStorageChanges: false }),
    )
    const b = renderHook(() =>
      useLocalStorage(storageKey, 0, { listenToStorageChanges: false }),
    )
    await waitFor(() => {
      expect(a.result.current.isReady).toBe(true)
      expect(b.result.current.isReady).toBe(true)
    })
    act(() => {
      a.result.current.setValue(5)
    })
    expect(b.result.current.value).toBe(0)
    expect(localStorage.getItem(storageKey)).toBe('5')
  })

  it('switches keys without mutating the old key', async () => {
    const keyA = key('dyn-a')
    const keyB = key('dyn-b')
    localStorage.setItem(keyA, 'A')
    localStorage.setItem(keyB, 'B')
    const { result, rerender } = renderHook(
      ({ active }) => useLocalStorage(active, 'fallback'),
      { initialProps: { active: keyA } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toBe('A')

    rerender({ active: keyB })
    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
      expect(result.current.value).toBe('B')
    })
    expect(localStorage.getItem(keyA)).toBe('A')
  })

  it('ignores stale events for a previous key', async () => {
    const keyA = key('stale-a')
    const keyB = key('stale-b')
    const { result, rerender } = renderHook(
      ({ active }) => useLocalStorage(active, 'fallback'),
      { initialProps: { active: keyA } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    rerender({ active: keyB })
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: keyA,
          newValue: 'stale',
          storageArea: localStorage,
        }),
      )
    })
    expect(result.current.value).toBe('fallback')
  })

  it('supports explicit null window and later replacement', async () => {
    const storageKey = key('null-window')
    const { result, rerender } = renderHook(
      ({ target }) =>
        useLocalStorage(storageKey, 'fallback', { window: target }),
      { initialProps: { target: null as Window | null } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.isSupported).toBe(false)

    act(() => {
      result.current.setValue('local-only')
    })
    expect(result.current.value).toBe('local-only')
    expect(localStorage.getItem(storageKey)).toBeNull()

    rerender({ target: window })
    await waitFor(() => {
      expect(result.current.isSupported).toBe(true)
      expect(result.current.isReady).toBe(true)
    })
  })

  it('does not overwrite stored values when only defaultValue changes', async () => {
    const storageKey = key('default-change')
    localStorage.setItem(storageKey, 'stored')
    const { result, rerender } = renderHook(
      ({ fallback }) => useLocalStorage(storageKey, fallback),
      { initialProps: { fallback: 'one' } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.value).toBe('stored')
    rerender({ fallback: 'two' })
    expect(result.current.value).toBe('stored')
  })

  it('ignores options-object identity churn', async () => {
    const storageKey = key('options-churn')
    const onError = vi.fn()
    const { result, rerender } = renderHook(
      ({ options }) => useLocalStorage(storageKey, 'x', options),
      {
        initialProps: {
          options: { writeDefaults: true, onError },
        },
      },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const setValue = result.current.setValue
    rerender({ options: { writeDefaults: true, onError } })
    expect(result.current.setValue).toBe(setValue)
  })

  it('is StrictMode safe for listeners and writes', async () => {
    const storageKey = key('strict')
    const { result } = renderHook(() => useLocalStorage(storageKey, 'x'), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(localStorage.getItem(storageKey)).toBe('x')

    const peer = renderHook(() => useLocalStorage(storageKey, 'x'), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(peer.result.current.isReady).toBe(true))
    act(() => {
      result.current.setValue('y')
    })
    await waitFor(() => {
      expect(peer.result.current.value).toBe('y')
    })
  })

  it('renders safely under SSR without touching storage', () => {
    const storageKey = key('ssr')
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const add = vi.spyOn(window, 'addEventListener')

    function Probe(): ReactElement {
      const api = useLocalStorage(storageKey, 'ssr-default')
      return (
        <span>
          {api.value}:{String(api.isReady)}:{String(api.isSupported)}
        </span>
      )
    }

    const html = renderToString(<Probe />)
    expect(html).toContain('ssr-default')
    expect(html).toContain('false')
    expect(getItem).not.toHaveBeenCalled()
    expect(add.mock.calls.filter(([type]) => type === 'storage')).toHaveLength(
      0,
    )

    const { result } = renderHook(() =>
      useLocalStorage(storageKey, 'ssr-default', { window: null }),
    )
    expect(() => {
      result.current.setValue('x')
      result.current.remove()
      result.current.reset()
    }).not.toThrow()
  })

  it('contains onError throws without breaking ownership', async () => {
    const storageKey = key('onerror-throw')
    localStorage.setItem(storageKey, '{bad')
    const { result } = renderHook(() =>
      useLocalStorage(
        storageKey,
        { ok: true },
        {
          onError: () => {
            throw new Error('callback boom')
          },
        },
      ),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    act(() => {
      result.current.setValue({ ok: false })
    })
    expect(result.current.value).toEqual({ ok: false })
  })

  it('preserves empty string, false, zero, empty array, and empty object', async () => {
    const cases = [
      { key: key('empty-string'), value: '', fallback: 'x' },
      { key: key('false'), value: false, fallback: true },
      { key: key('zero'), value: 0, fallback: 1 },
      { key: key('empty-array'), value: [] as number[], fallback: [1] },
      { key: key('empty-object'), value: {}, fallback: { a: 1 } },
    ] as const

    for (const entry of cases) {
      const hook = renderHook(() =>
        useLocalStorage(entry.key, entry.fallback as never),
      )
      await waitFor(() => expect(hook.result.current.isReady).toBe(true))
      act(() => {
        hook.result.current.setValue(entry.value as never)
      })
      expect(hook.result.current.value).toEqual(entry.value)
      hook.unmount()
      const remount = renderHook(() =>
        useLocalStorage(entry.key, entry.fallback as never),
      )
      await waitFor(() => expect(remount.result.current.isReady).toBe(true))
      expect(remount.result.current.value).toEqual(entry.value)
      remount.unmount()
    }
  })

  it('supports remount restoration for counters', async () => {
    const storageKey = key('remount-counter')
    function Counter({ mounted }: { mounted: boolean }) {
      const api = useLocalStorage(storageKey, 0)
      if (!mounted) {
        return null
      }
      return (
        <button type="button" onClick={() => api.setValue((n) => n + 1)}>
          {api.value}
        </button>
      )
    }

    const view = render(<Counter mounted />)
    await waitFor(() => {
      expect(view.getByRole('button').textContent).toBe('0')
    })
    await act(async () => {
      view.getByRole('button').click()
    })
    expect(view.getByRole('button').textContent).toBe('1')
    view.rerender(<Counter mounted={false} />)
    view.rerender(<Counter mounted />)
    await waitFor(() => {
      expect(view.getByRole('button').textContent).toBe('1')
    })
  })
})
