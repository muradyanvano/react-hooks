import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useUrlSearchParams } from './useUrlSearchParams'

describe('useUrlSearchParams', () => {
  const originalHref = window.location.href

  afterEach(() => {
    window.history.replaceState(window.history.state, '', originalHref)
  })

  function seed(url: string) {
    window.history.replaceState({ seeded: true }, '', url)
  }

  it('starts with initialValue before ready, then reads history search', async () => {
    seed('/products?query=keyboard&page=2#reviews')
    let firstIsReady: boolean | null = null
    let firstFallback: string | readonly string[] | undefined
    const { result } = renderHook(() => {
      const value = useUrlSearchParams('history', {
        initialValue: { fallback: 'yes', query: 'ignored' },
      })
      if (firstIsReady == null) {
        firstIsReady = value.isReady
        firstFallback = value.params.fallback
      }
      return value
    })

    expect(firstIsReady).toBe(false)
    expect(firstFallback).toBe('yes')

    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.params.query).toBe('keyboard')
    expect(result.current.params.page).toBe('2')
    expect(result.current.params.fallback).toBe('yes')
    expect(window.location.hash).toBe('#reviews')
  })

  it('set/append/remove/clear/reset preserve hash and history.state', async () => {
    seed('/p?a=1#keep')
    const state = { cart: 1 }
    window.history.replaceState(state, '', '/p?a=1#keep')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => {
      result.current.set('a', '2')
      result.current.append('tag', 'react')
      result.current.append('tag', 'ts')
    })
    expect(result.current.getAll('tag')).toEqual(['react', 'ts'])
    expect(window.location.hash).toBe('#keep')
    expect(window.history.state).toEqual(state)

    act(() => {
      result.current.remove('tag', 'react')
    })
    expect(result.current.getAll('tag')).toEqual(['ts'])

    act(() => {
      result.current.clear()
    })
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('#keep')

    act(() => {
      result.current.reset()
    })
  })

  it('supports rapid sequential mutations before rerender', async () => {
    seed('/p')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('a', '1')
      result.current.set('b', '2')
    })
    expect(result.current.params).toMatchObject({ a: '1', b: '2' })
    expect(window.location.search).toBe('?a=1&b=2')
  })

  it('hash mode preserves route and normal search', async () => {
    seed('/app?keep=1#/products/list?query=keyboard')
    const { result } = renderHook(() => useUrlSearchParams('hash'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.params.query).toBe('keyboard')
    act(() => {
      result.current.set('page', 2)
    })
    expect(window.location.search).toBe('?keep=1')
    expect(window.location.hash).toBe('#/products/list?query=keyboard&page=2')
  })

  it('hash-params mode owns the whole hash', async () => {
    seed('/products?view=grid#query=keyboard&page=2')
    const { result } = renderHook(() => useUrlSearchParams('hash-params'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.params.query).toBe('keyboard')
    act(() => {
      result.current.clear()
    })
    expect(window.location.search).toBe('?view=grid')
    expect(window.location.hash).toBe('')
  })

  it('write:false updates local state without changing the URL', async () => {
    seed('/p?a=1')
    const { result } = renderHook(() =>
      useUrlSearchParams('history', { write: false }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('a', '9')
    })
    expect(result.current.params.a).toBe('9')
    expect(window.location.search).toBe('?a=1')
  })

  it('disabled edits stay local and re-enable rereads the URL', async () => {
    seed('/p?a=1')
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useUrlSearchParams('history', { enabled }),
      { initialProps: { enabled: false } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('a', 'local')
    })
    expect(result.current.params.a).toBe('local')
    expect(window.location.search).toBe('?a=1')
    rerender({ enabled: true })
    await waitFor(() => expect(result.current.params.a).toBe('1'))
  })

  it('setParams fully replaces the collection', async () => {
    seed('/p?a=1&b=2')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.setParams({ c: '3' })
    })
    expect(result.current.params).toEqual({ c: '3' })
    expect(window.location.search).toBe('?c=3')
  })

  it('synchronizes two instances in the same window/mode', async () => {
    seed('/p')
    const a = renderHook(() => useUrlSearchParams('history'))
    const b = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(a.result.current.isReady).toBe(true))
    await waitFor(() => expect(b.result.current.isReady).toBe(true))
    act(() => {
      a.result.current.set('q', 'hello')
    })
    await waitFor(() => expect(b.result.current.params.q).toBe('hello'))
    a.unmount()
    b.unmount()
  })

  it('keeps control identities stable', async () => {
    seed('/p')
    const { result, rerender } = renderHook(
      ({ writeMode }: { writeMode: 'push' | 'replace' }) =>
        useUrlSearchParams('history', { writeMode }),
      { initialProps: { writeMode: 'replace' as 'push' | 'replace' } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const set = result.current.set
    rerender({ writeMode: 'push' })
    expect(result.current.set).toBe(set)
  })

  it('survives Strict Mode without writing on mount', async () => {
    seed('/p?a=1')
    const replaceSpy = vi.spyOn(window.history, 'replaceState')
    const callsBefore = replaceSpy.mock.calls.length
    const { unmount } = renderHook(() => useUrlSearchParams('history'), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(true).toBe(true))
    expect(replaceSpy.mock.calls.length).toBe(callsBefore)
    unmount()
    replaceSpy.mockRestore()
  })

  it('contains stringify errors via onError', async () => {
    seed('/p')
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useUrlSearchParams('history', {
        onError,
        stringify: () => {
          throw new Error('bad stringify')
        },
      }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('a', '1')
    })
    expect(onError).toHaveBeenCalled()
    expect(result.current.error?.message).toBe('bad stringify')
  })

  it('explicit window null stays local-only', async () => {
    seed('/p?a=1')
    const { result } = renderHook(() =>
      useUrlSearchParams('history', { window: null, initialValue: { x: '1' } }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.params.x).toBe('1')
    act(() => {
      result.current.set('x', '2')
    })
    expect(result.current.params.x).toBe('2')
    expect(window.location.search).toBe('?a=1')
  })

  it('returns defensive searchParams snapshots', async () => {
    seed('/p?a=1')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const first = result.current.searchParams
    first.set('a', 'mutated')
    expect(result.current.get('a')).toBe('1')
  })

  it('parses unicode, plus-spaces, equals, and prototype-sensitive names', async () => {
    seed(
      '/p?message=hello+world&encoded=a%26b%3Dc&empty=&flag&%F0%9F%8D%8E=fruit&__proto__=x&constructor=y',
    )
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.get('message')).toBe('hello world')
    expect(result.current.get('encoded')).toBe('a&b=c')
    expect(result.current.get('empty')).toBe('')
    expect(result.current.has('flag')).toBe(true)
    expect(result.current.get('🍎')).toBe('fruit')
    expect(result.current.get('__proto__')).toBe('x')
    expect(result.current.get('constructor')).toBe('y')
  })

  it('push mode creates history entries and popstate restores', async () => {
    seed('/p')
    const { result } = renderHook(() =>
      useUrlSearchParams('history', { writeMode: 'push' }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('step', 'a')
    })
    act(() => {
      result.current.set('step', 'b')
    })
    expect(result.current.get('step')).toBe('b')
    act(() => {
      window.history.back()
    })
    await waitFor(() => expect(result.current.get('step')).toBe('a'))
  })

  it('refresh reconciles external history writes', async () => {
    seed('/p?a=1')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    window.history.replaceState(window.history.state, '', '/p?a=external')
    expect(result.current.get('a')).toBe('1')
    act(() => {
      result.current.refresh()
    })
    expect(result.current.get('a')).toBe('external')
  })

  it('hash mode reacts to hashchange', async () => {
    seed('/app#/route?x=1')
    const { result } = renderHook(() => useUrlSearchParams('hash'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      window.location.hash = '/route?x=2'
    })
    await waitFor(() => expect(result.current.get('x')).toBe('2'))
  })

  it('remove without value clears all occurrences; with value clears matches', async () => {
    seed('/p?tag=a&tag=b&tag=a')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.remove('tag', 'a')
    })
    expect(result.current.getAll('tag')).toEqual(['b'])
    act(() => {
      result.current.remove('tag')
    })
    expect(result.current.has('tag')).toBe(false)
  })

  it('normalizes numbers and booleans; preserves string tokens under falsy removal', async () => {
    seed('/p')
    const { result } = renderHook(() =>
      useUrlSearchParams('history', { removeFalsyValues: true }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.setParams({
        n: -0,
        ok: true,
        zero: '0',
        gone: 0,
      })
    })
    // Numeric -0 / 0 are falsy inputs and are removed; string "0" remains.
    expect(result.current.params).toEqual({ ok: 'true', zero: '0' })
  })

  it('serializes -0 as "0" when falsy removal is off', async () => {
    seed('/p')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('n', -0)
    })
    expect(result.current.get('n')).toBe('0')
  })

  it('changes mode without migrating parameters', async () => {
    seed('/p?a=1#/r?b=2')
    const { result, rerender } = renderHook(
      ({ mode }: { mode: 'history' | 'hash' }) => useUrlSearchParams(mode),
      { initialProps: { mode: 'history' as 'history' | 'hash' } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.get('a')).toBe('1')
    rerender({ mode: 'hash' })
    await waitFor(() => expect(result.current.get('b')).toBe('2'))
    expect(window.location.search).toBe('?a=1')
  })

  it('ignores no-op equal set without writing', async () => {
    seed('/p?a=1')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const replaceSpy = vi.spyOn(window.history, 'replaceState')
    const before = replaceSpy.mock.calls.length
    const snapshot = result.current.params
    act(() => {
      result.current.set('a', '1')
      result.current.remove('missing')
    })
    expect(replaceSpy.mock.calls.length).toBe(before)
    expect(result.current.params).toBe(snapshot)
    replaceSpy.mockRestore()
  })

  it('does not resurrect removed initialValue keys on refresh or peer sync', async () => {
    seed('/p?a=1&b=2')
    const { result } = renderHook(() =>
      useUrlSearchParams('history', {
        initialValue: { a: 'fallback', c: 'keep' },
      }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.params.c).toBe('keep')
    act(() => {
      result.current.remove('a')
    })
    expect(result.current.has('a')).toBe(false)
    expect(window.location.search).toBe('?c=keep&b=2')
    act(() => {
      result.current.refresh()
    })
    expect(result.current.has('a')).toBe(false)
    expect(result.current.params).toMatchObject({ c: 'keep', b: '2' })
  })

  it('rebases concurrent writers onto the live URL', async () => {
    seed('/p')
    const a = renderHook(() => useUrlSearchParams('history'))
    const b = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(a.result.current.isReady).toBe(true))
    await waitFor(() => expect(b.result.current.isReady).toBe(true))
    act(() => {
      a.result.current.set('foo', '1')
      b.result.current.set('bar', '2')
    })
    expect(window.location.search).toBe('?foo=1&bar=2')
    await waitFor(() => {
      expect(a.result.current.params).toMatchObject({ foo: '1', bar: '2' })
      expect(b.result.current.params).toMatchObject({ foo: '1', bar: '2' })
    })
    a.unmount()
    b.unmount()
  })

  it('keeps previous state when history write fails', async () => {
    seed('/p?a=1')
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useUrlSearchParams('history', { onError }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    const replaceSpy = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => {
        throw new Error('quota')
      })
    act(() => {
      result.current.set('a', '2')
    })
    expect(result.current.get('a')).toBe('1')
    expect(result.current.error?.message).toBe('quota')
    expect(onError).toHaveBeenCalled()
    replaceSpy.mockRestore()
    act(() => {
      result.current.set('a', '3')
    })
    expect(result.current.get('a')).toBe('3')
    expect(result.current.error).toBeNull()
  })

  it('preserves history.state identity through writes', async () => {
    const state = { nested: { ok: true }, list: [1, 2] }
    window.history.replaceState(state, '', '/p')
    const { result } = renderHook(() => useUrlSearchParams('history'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('q', 'x')
    })
    expect(window.history.state).toBe(state)
  })

  it('treats #foo=bar as a hash route in hash mode, not parameters', async () => {
    seed('/app#foo=bar')
    const { result } = renderHook(() => useUrlSearchParams('hash'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.params).toEqual({})
    act(() => {
      result.current.set('x', '1')
    })
    expect(window.location.hash).toBe('#foo=bar?x=1')
  })

  it('hash-params strips an optional leading ? in the hash body', async () => {
    seed('/p#?foo=bar')
    const { result } = renderHook(() => useUrlSearchParams('hash-params'))
    await waitFor(() => expect(result.current.isReady).toBe(true))
    expect(result.current.get('foo')).toBe('bar')
  })

  it('rejects custom stringify that would escape owned URL components', async () => {
    seed('/p#keep')
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useUrlSearchParams('history', {
        onError,
        stringify: () => 'a=1#stolen',
      }),
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('a', '1')
    })
    expect(onError).toHaveBeenCalled()
    expect(window.location.hash).toBe('#keep')
    expect(result.current.get('a')).toBeNull()
  })

  it('write:false local edits persist as the base after enabling write', async () => {
    seed('/p?a=1')
    const { result, rerender } = renderHook(
      ({ write }: { write: boolean }) =>
        useUrlSearchParams('history', { write }),
      { initialProps: { write: false } },
    )
    await waitFor(() => expect(result.current.isReady).toBe(true))
    act(() => {
      result.current.set('a', 'local')
    })
    expect(window.location.search).toBe('?a=1')
    rerender({ write: true })
    act(() => {
      result.current.set('b', '2')
    })
    expect(window.location.search).toBe('?a=local&b=2')
  })

  it('isolates different modes from peer notifications', async () => {
    seed('/p?a=1#/r?b=2')
    const historyHook = renderHook(() => useUrlSearchParams('history'))
    const hashHook = renderHook(() => useUrlSearchParams('hash'))
    await waitFor(() => expect(historyHook.result.current.isReady).toBe(true))
    await waitFor(() => expect(hashHook.result.current.isReady).toBe(true))
    act(() => {
      historyHook.result.current.set('a', '9')
    })
    expect(hashHook.result.current.get('b')).toBe('2')
    historyHook.unmount()
    hashHook.unmount()
  })
})
