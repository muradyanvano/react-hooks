import { act, render, renderHook } from '@testing-library/react'
import { StrictMode, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { useJwt } from './useJwt'

function encodeBase64UrlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

function encodeJsonSegment(value: unknown): string {
  return encodeBase64UrlFromBytes(
    new TextEncoder().encode(JSON.stringify(value)),
  )
}

function makeToken(
  header: unknown,
  payload: unknown,
  signature = 'signature',
): string {
  return `${encodeJsonSegment(header)}.${encodeJsonSegment(payload)}.${signature}`
}

const STANDARD_HEADER = { alg: 'HS256', typ: 'JWT' }
const STANDARD_PAYLOAD = {
  sub: '1234567890',
  name: 'John Doe',
  iat: 1516239022,
}

describe('useJwt', () => {
  describe('valid decoding', () => {
    it('decodes a standard HS256-style token', () => {
      const token = makeToken(
        STANDARD_HEADER,
        STANDARD_PAYLOAD,
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      )
      const { result } = renderHook(() => useJwt(token))
      expect(result.current.header).toEqual(STANDARD_HEADER)
      expect(result.current.payload).toEqual(STANDARD_PAYLOAD)
      expect(result.current.errors).toEqual([])
    })

    it('accepts an empty signature segment', () => {
      const token = makeToken({ alg: 'none' }, { sub: 'anon' }, '')
      const { result } = renderHook(() => useJwt(token))
      expect(result.current.header).toEqual({ alg: 'none' })
      expect(result.current.payload).toEqual({ sub: 'anon' })
      expect(result.current.errors).toEqual([])
    })

    it('accepts missing and explicit Base64 padding', () => {
      const unpadded = makeToken({ alg: 'none' }, { a: 1 })
      const { result: a } = renderHook(() => useJwt(unpadded))
      expect(a.current.errors).toEqual([])

      const short = btoa('{"a":1}').replace(/\+/g, '-').replace(/\//g, '_')
      const padCount = (4 - (short.replace(/=+$/u, '').length % 4)) % 4
      const withPad = `${short.replace(/=+$/u, '')}${'='.repeat(padCount)}`
      const token = `${withPad}.${encodeJsonSegment({ b: 2 })}.`
      const { result: b } = renderHook(() => useJwt(token))
      expect(b.current.errors).toEqual([])
      expect(b.current.header).toEqual({ a: 1 })
    })

    it('preserves custom claims, nested objects, arrays, null, booleans, numbers', () => {
      const header = { alg: 'HS256', kid: 'key-1', custom: true }
      const payload = {
        sub: 'u1',
        roles: ['admin', 'editor'],
        meta: { nested: true, count: 2 },
        flag: false,
        empty: null,
        score: 0,
      }
      const { result } = renderHook(() => useJwt(makeToken(header, payload)))
      expect(result.current.header).toEqual(header)
      expect(result.current.payload).toEqual(payload)
    })

    it('decodes Unicode, Armenian, and emoji claims', () => {
      const payload = {
        name: 'Վանո Մուրադյան',
        note: 'café 日本語 🙂',
      }
      const { result } = renderHook(() =>
        useJwt(makeToken({ alg: 'none' }, payload)),
      )
      expect(result.current.payload).toEqual(payload)
    })

    it('decodes a very small valid token', () => {
      const { result } = renderHook(() =>
        useJwt(makeToken({ alg: 'none' }, { a: 1 }, '')),
      )
      expect(result.current.errors).toEqual([])
      expect(result.current.payload).toEqual({ a: 1 })
    })
  })

  describe('token structure', () => {
    it.each([
      [null, 'missing'],
      [undefined, 'missing'],
      ['', 'empty'],
      ['   ', 'empty'],
      ['only-one', 'three segments'],
      ['one.two', 'three segments'],
      ['a.b.c.d', 'three segments'],
      ['a.b.c.d.e', 'three segments'],
      ['.payload.sig', 'header'],
      ['header..sig', 'payload'],
    ])('returns token error for %p', (token, messagePart) => {
      const { result } = renderHook(() => useJwt(token as string | null))
      expect(result.current.header).toBeNull()
      expect(result.current.payload).toBeNull()
      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0]?.part).toBe('token')
      expect(result.current.errors[0]?.error.message.toLowerCase()).toContain(
        messagePart,
      )
    })

    it('trims leading and trailing whitespace around the token', () => {
      const token = makeToken(STANDARD_HEADER, STANDARD_PAYLOAD)
      const { result } = renderHook(() => useJwt(`\n ${token}\t `))
      expect(result.current.errors).toEqual([])
      expect(result.current.payload).toEqual(STANDARD_PAYLOAD)
    })

    it('rejects internal whitespace inside segments', () => {
      const header = encodeJsonSegment(STANDARD_HEADER)
      const payload = encodeJsonSegment(STANDARD_PAYLOAD)
      const { result } = renderHook(() =>
        useJwt(`${header.slice(0, 4)} ${header.slice(4)}.${payload}.sig`),
      )
      expect(result.current.errors.some((e) => e.part === 'header')).toBe(true)
    })
  })

  describe('independent header and payload failures', () => {
    it('keeps a valid payload when the header fails', () => {
      const badHeader = btoa('{')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/u, '')
      const token = `${badHeader}.${encodeJsonSegment({ sub: 'ok' })}.`
      const { result } = renderHook(() => useJwt(token))
      expect(result.current.header).toBeNull()
      expect(result.current.payload).toEqual({ sub: 'ok' })
      expect(result.current.errors.map((e) => e.part)).toEqual(['header'])
    })

    it('keeps a valid header when the payload fails', () => {
      const badPayload = btoa('null')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/u, '')
      const token = `${encodeJsonSegment({ alg: 'none' })}.${badPayload}.`
      const { result } = renderHook(() => useJwt(token))
      expect(result.current.header).toEqual({ alg: 'none' })
      expect(result.current.payload).toBeNull()
      expect(result.current.errors.map((e) => e.part)).toEqual(['payload'])
    })

    it('orders both section errors header-then-payload', () => {
      const bad = btoa('[')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/u, '')
      const { result } = renderHook(() => useJwt(`${bad}.${bad}.`))
      expect(result.current.errors.map((e) => e.part)).toEqual([
        'header',
        'payload',
      ])
    })
  })

  describe('fallback semantics', () => {
    it('defaults to null and preserves custom fallback identity', () => {
      const { result: def } = renderHook(() => useJwt('bad'))
      expect(def.current.header).toBeNull()

      const { result: undef } = renderHook(() =>
        useJwt('bad', { fallbackValue: undefined }),
      )
      expect(undef.current.header).toBeUndefined()

      const { result: primitive } = renderHook(() =>
        useJwt('bad', { fallbackValue: 'n/a' }),
      )
      expect(primitive.current.payload).toBe('n/a')

      const fallback = { guest: true }
      const { result: objectFallback } = renderHook(() =>
        useJwt('bad', { fallbackValue: fallback }),
      )
      expect(objectFallback.current.header).toBe(fallback)
      expect(objectFallback.current.payload).toBe(fallback)
    })

    it('recomputes when fallback changes and ignores fallback for valid tokens', () => {
      const token = makeToken({ alg: 'none' }, { sub: '1' })
      const { result, rerender } = renderHook(
        ({ fallback }) => useJwt('bad', { fallbackValue: fallback }),
        { initialProps: { fallback: 'a' as string } },
      )
      expect(result.current.header).toBe('a')
      rerender({ fallback: 'b' })
      expect(result.current.header).toBe('b')

      const { result: valid } = renderHook(() =>
        useJwt(token, { fallbackValue: 'ignored' }),
      )
      expect(valid.current.header).toEqual({ alg: 'none' })
      expect(valid.current.payload).toEqual({ sub: '1' })
    })
  })

  describe('onError lifecycle', () => {
    const badHeaderSegment = () =>
      btoa('{').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')

    const badPayloadObjectSegment = () =>
      btoa('null').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')

    const badPayloadArraySegment = () =>
      btoa('[1]').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')

    it('notifies again for a different invalid token with the same token-level error', () => {
      const onError = vi.fn()
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: 'invalid-token-a' } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0]?.[1]).toBe('token')
      const firstMessage = onError.mock.calls[0]?.[0].message as string

      rerender({ token: 'invalid-token-b' })
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls[1]?.[1]).toBe('token')
      expect(onError.mock.calls[1]?.[0].message).toBe(firstMessage)
    })

    it('notifies again for a different invalid token with the same header error', () => {
      const onError = vi.fn()
      const goodPayload = encodeJsonSegment({ sub: 'ok' })
      const badHeaderA = badHeaderSegment()
      const badHeaderB = encodeBase64UrlFromBytes(
        new TextEncoder().encode('{x'),
      )
      const tokenA = `${badHeaderA}.${goodPayload}.`
      const tokenB = `${badHeaderB}.${goodPayload}.`
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: tokenA } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0]?.[1]).toBe('header')

      rerender({ token: tokenB })
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls[1]?.[1]).toBe('header')
    })

    it('notifies again for a different invalid token with the same payload error', () => {
      const onError = vi.fn()
      const goodHeader = encodeJsonSegment({ alg: 'none' })
      const tokenA = `${goodHeader}.${badPayloadObjectSegment()}.`
      const tokenB = `${goodHeader}.${badPayloadArraySegment()}.`
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: tokenA } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0]?.[1]).toBe('payload')

      rerender({ token: tokenB })
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls[1]?.[1]).toBe('payload')
    })

    it('notifies both parts again for a different token with the same header and payload errors', () => {
      const onError = vi.fn()
      const tokenA = '@@@.@@@.'
      const tokenB = '###.###.'
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: tokenA } },
      )
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls.map((call) => call[1])).toEqual([
        'header',
        'payload',
      ])
      const firstSignature = onError.mock.calls
        .slice(0, 2)
        .map((call) => `${call[1]}:${(call[0] as Error).message}`)
        .join('|')

      rerender({ token: tokenB })
      expect(onError).toHaveBeenCalledTimes(4)
      expect(onError.mock.calls.slice(2).map((call) => call[1])).toEqual([
        'header',
        'payload',
      ])
      const secondSignature = onError.mock.calls
        .slice(2, 4)
        .map((call) => `${call[1]}:${(call[0] as Error).message}`)
        .join('|')
      expect(secondSignature).toBe(firstSignature)
    })

    it('calls onError once per part in deterministic order', () => {
      const onError = vi.fn()
      const bad = badHeaderSegment()
      renderHook(() => useJwt(`${bad}.${bad}.`, { onError }))
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls[0]?.[1]).toBe('header')
      expect(onError.mock.calls[1]?.[1]).toBe('payload')
    })

    it('calls onError once for token-structure failure', () => {
      const onError = vi.fn()
      renderHook(() => useJwt('nope', { onError }))
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError.mock.calls[0]?.[1]).toBe('token')
    })

    it('uses the latest callback without retriggering on identity change', () => {
      const first = vi.fn()
      const second = vi.fn()
      const { rerender } = renderHook(
        ({ onError }) => useJwt('bad', { onError }),
        { initialProps: { onError: first } },
      )
      expect(first).toHaveBeenCalledTimes(1)
      rerender({ onError: second })
      expect(first).toHaveBeenCalledTimes(1)
      expect(second).toHaveBeenCalledTimes(0)

      rerender({ onError: second })
      expect(second).toHaveBeenCalledTimes(0)
    })

    it('does not retrigger on unrelated rerenders', () => {
      const onError = vi.fn()
      function Probe({ tick }: { tick: number }) {
        useJwt('bad', { onError })
        return <span>{tick}</span>
      }
      const { rerender } = render(<Probe tick={1} />)
      expect(onError).toHaveBeenCalledTimes(1)
      rerender(<Probe tick={2} />)
      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('does not retrigger when only fallbackValue changes', () => {
      const onError = vi.fn()
      const { rerender } = renderHook(
        ({ fallback }) => useJwt('bad', { onError, fallbackValue: fallback }),
        { initialProps: { fallback: null as null | { guest: true } } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ fallback: { guest: true } })
      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('does not duplicate callbacks under Strict Mode', () => {
      const onError = vi.fn()
      renderHook(() => useJwt('bad', { onError }), {
        wrapper: StrictMode,
      })
      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('notifies a different invalid token under Strict Mode without duplicating', () => {
      const onError = vi.fn()
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        {
          initialProps: { token: 'strict-a' },
          wrapper: StrictMode,
        },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ token: 'strict-b' })
      expect(onError).toHaveBeenCalledTimes(2)
    })

    it('does not notify when only outer whitespace changes on the same effective token', () => {
      const onError = vi.fn()
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: 'bad' } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ token: '  bad  ' })
      expect(onError).toHaveBeenCalledTimes(1)
    })

    it('retriggers after invalid → valid → invalid', () => {
      const onError = vi.fn()
      const valid = makeToken({ alg: 'none' }, { sub: '1' })
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: 'bad' } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ token: valid })
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ token: 'bad' })
      expect(onError).toHaveBeenCalledTimes(2)
    })

    it('retriggers after invalid → valid → different invalid with the same error signature', () => {
      const onError = vi.fn()
      const valid = makeToken({ alg: 'none' }, { sub: '1' })
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: 'bad-one' } },
      )
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ token: valid })
      expect(onError).toHaveBeenCalledTimes(1)
      rerender({ token: 'bad-two' })
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls[1]?.[1]).toBe('token')
    })

    it('keeps notification state local to each hook instance', () => {
      const first = vi.fn()
      const second = vi.fn()
      function Dual() {
        useJwt('shared-invalid', { onError: first })
        useJwt('shared-invalid', { onError: second })
        return null
      }
      const { unmount } = render(<Dual />)
      expect(first).toHaveBeenCalledTimes(1)
      expect(second).toHaveBeenCalledTimes(1)

      unmount()
      const third = vi.fn()
      renderHook(() => useJwt('shared-invalid', { onError: third }))
      expect(third).toHaveBeenCalledTimes(1)
      expect(first).toHaveBeenCalledTimes(1)
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('notifies again after a genuine unmount and remount', () => {
      const onError = vi.fn()
      function Probe() {
        useJwt('remount-invalid', { onError })
        return null
      }
      const { unmount } = render(<Probe />)
      expect(onError).toHaveBeenCalledTimes(1)
      unmount()
      render(<Probe />)
      expect(onError).toHaveBeenCalledTimes(2)
    })

    it('contains throwing onError callbacks without blocking later parts', () => {
      const onError = vi.fn((error: Error, part: string) => {
        void error
        if (part === 'header') {
          throw new Error('listener failed')
        }
      })
      const bad = badHeaderSegment()
      const { rerender } = renderHook(
        ({ token }) => useJwt(token, { onError }),
        { initialProps: { token: `${bad}.${bad}.` } },
      )
      expect(onError).toHaveBeenCalledTimes(2)
      expect(onError.mock.calls.map((call) => call[1])).toEqual([
        'header',
        'payload',
      ])

      rerender({ token: `${bad}.${bad}.` })
      expect(onError).toHaveBeenCalledTimes(2)
    })

    it('does not call onError during SSR', () => {
      const onError = vi.fn()
      function SsrProbe() {
        const { errors } = useJwt('bad', { onError })
        return <div>{errors.length}</div>
      }
      const html = renderToString(<SsrProbe />)
      expect(html).toContain('1')
      expect(onError).not.toHaveBeenCalled()
    })
  })

  describe('memoization', () => {
    it('preserves result identity for identical token and fallback', () => {
      const token = makeToken({ alg: 'none' }, { sub: '1' })
      const { result, rerender } = renderHook(
        ({ tick }) => {
          void tick
          return useJwt(token)
        },
        { initialProps: { tick: 0 } },
      )
      const first = result.current
      rerender({ tick: 1 })
      expect(result.current).toBe(first)
      expect(result.current.header).toBe(first.header)
      expect(result.current.payload).toBe(first.payload)
      expect(result.current.errors).toBe(first.errors)
    })

    it('returns a new identity when the token changes', () => {
      const a = makeToken({ alg: 'none' }, { sub: 'a' })
      const b = makeToken({ alg: 'none' }, { sub: 'b' })
      const { result, rerender } = renderHook(({ token }) => useJwt(token), {
        initialProps: { token: a },
      })
      const first = result.current
      rerender({ token: b })
      expect(result.current).not.toBe(first)
      expect(result.current.payload).toEqual({ sub: 'b' })
    })

    it('does not use browser resources', () => {
      const add = vi.spyOn(window, 'addEventListener')
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
      renderHook(() => useJwt(makeToken({ alg: 'none' }, { sub: '1' })))
      expect(add).not.toHaveBeenCalled()
      expect(setTimeoutSpy).not.toHaveBeenCalled()
      add.mockRestore()
      setTimeoutSpy.mockRestore()
    })
  })

  describe('error safety', () => {
    it('never includes the full token in error messages', () => {
      const token = 'super-secret-header.super-secret-payload.super-secret-sig'
      const { result } = renderHook(() => useJwt(token))
      for (const entry of result.current.errors) {
        expect(entry.error.message).not.toContain(token)
        expect(entry.error.message).not.toContain('super-secret')
      }
    })

    it('freezes the errors snapshot', () => {
      const { result } = renderHook(() => useJwt('bad'))
      expect(Object.isFrozen(result.current.errors)).toBe(true)
      expect(Object.isFrozen(result.current.errors[0])).toBe(true)
    })
  })

  describe('controlled token updates', () => {
    it('recomputes immediately when state-driven token changes', () => {
      function Probe() {
        const [token, setToken] = useState('bad')
        const decoded = useJwt(token)
        return (
          <div>
            <button
              type="button"
              onClick={() =>
                setToken(makeToken({ alg: 'none' }, { sub: 'live' }))
              }
            >
              set
            </button>
            <span data-testid="sub">
              {decoded.payload &&
              typeof decoded.payload === 'object' &&
              'sub' in decoded.payload
                ? String((decoded.payload as { sub?: unknown }).sub)
                : 'fallback'}
            </span>
          </div>
        )
      }
      const view = render(<Probe />)
      expect(view.getByTestId('sub').textContent).toBe('fallback')
      act(() => {
        view.getByRole('button', { name: 'set' }).click()
      })
      expect(view.getByTestId('sub').textContent).toBe('live')
    })
  })
})
