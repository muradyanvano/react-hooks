import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useBase64 } from './useBase64'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useBase64', () => {
  it('automatically encodes text and exposes the pending promise', async () => {
    const { result } = renderHook(() => useBase64('hello'))
    expect(result.current).toMatchObject({
      base64: '',
      isLoading: true,
      error: null,
    })
    expect(result.current.promise).toBeInstanceOf(Promise)
    await waitFor(() =>
      expect(result.current.base64).toBe(
        'data:text/plain;charset=utf-8;base64,aGVsbG8=',
      ),
    )
    expect(result.current.promise).toBeNull()
  })

  it('supports payload-only output and stable manual execution while disabled', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useBase64(value, { enabled: false, dataUrl: false }),
      { initialProps: { value: 'one' } },
    )
    const execute = result.current.execute
    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.base64).toBe('b25l')
    rerender({ value: 'two' })
    expect(result.current.execute).toBe(execute)
    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.base64).toBe('dHdv')
  })

  it('clears nullish targets without errors', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useBase64(value as string),
      { initialProps: { value: 'value' as string | null } },
    )
    await waitFor(() => expect(result.current.base64).not.toBe(''))
    rerender({ value: null })
    await waitFor(() =>
      expect(result.current).toMatchObject({
        base64: '',
        isLoading: false,
        error: null,
        promise: null,
      }),
    )
  })

  it('uses serializers for unsupported objects and reports serializer failures', async () => {
    const onError = vi.fn()
    const value = { name: 'fictional' }
    const { result, rerender } = renderHook(
      ({ valid }) =>
        useBase64(
          value,
          valid
            ? { serializer: (value) => value.name, dataUrl: false, onError }
            : { serializer: () => 42 as never, onError },
        ),
      { initialProps: { valid: true } },
    )
    await waitFor(() => expect(result.current.base64).toBe('ZmljdGlvbmFs'))
    rerender({ valid: false })
    await waitFor(() => expect(result.current.error?.message).toMatch(/return/))
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('makes the newest asynchronous request own state', async () => {
    const first = deferred<ArrayBuffer>()
    const second = deferred<ArrayBuffer>()
    const firstBlob = new Blob()
    // Replace Blob's reader to make timing deterministic in jsdom.
    Object.defineProperty(firstBlob, 'arrayBuffer', {
      value: () => first.promise,
    })
    const secondBlob = new Blob()
    Object.defineProperty(secondBlob, 'arrayBuffer', {
      value: () => second.promise,
    })
    const { result, rerender } = renderHook(
      ({ blob }) => useBase64(blob, { dataUrl: false }),
      { initialProps: { blob: firstBlob } },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(true))
    rerender({ blob: secondBlob })
    await act(async () => second.resolve(new Uint8Array([66]).buffer))
    await waitFor(() => expect(result.current.base64).toBe('Qg=='))
    await act(async () => first.resolve(new Uint8Array([65]).buffer))
    expect(result.current.base64).toBe('Qg==')
  })

  it('silences stale failures and only notifies the owner', async () => {
    const stale = deferred<ArrayBuffer>()
    const blob = new Blob([])
    Object.defineProperty(blob, 'arrayBuffer', { value: () => stale.promise })
    const onError = vi.fn()
    const { result, rerender } = renderHook(
      ({ value }) => useBase64(value as Blob, { onError }),
      { initialProps: { value: blob as Blob | string } },
    )
    rerender({ value: 'newest' })
    await waitFor(() => expect(result.current.base64).toContain('bmV3ZXN0'))
    await act(async () => stale.reject(new Error('stale')))
    expect(onError).not.toHaveBeenCalled()
  })

  it('contains image canvas failures and rejects zero-sized images', async () => {
    const image = document.createElement('img')
    Object.defineProperties(image, {
      naturalWidth: { value: 0 },
      naturalHeight: { value: 0 },
    })
    const { result } = renderHook(() => useBase64(image))
    await waitFor(() =>
      expect(result.current.error?.message).toMatch(/non-zero/),
    )
  })

  it('does not notify from Strict Mode-discarded work', async () => {
    const pending = deferred<ArrayBuffer>()
    const blob = new Blob([])
    Object.defineProperty(blob, 'arrayBuffer', { value: () => pending.promise })
    const onError = vi.fn()
    const { unmount } = renderHook(() => useBase64(blob, { onError }), {
      wrapper: StrictMode,
    })
    unmount()
    await act(async () => pending.reject(new Error('late')))
    expect(onError).not.toHaveBeenCalled()
  })

  it.each([
    ['ASCII', 'hello', 'aGVsbG8='],
    ['Unicode and emoji', '世界 🙂', '5LiW55WMIPCfmYI='],
    ['whitespace and newlines', ' a\nb ', 'IGEKYiA='],
    ['empty string', '', ''],
  ])('encodes %s automatically', async (_, value, payload) => {
    const { result } = renderHook(() => useBase64(value, { dataUrl: false }))
    await waitFor(() => expect(result.current.base64).toBe(payload))
  })

  it('encodes bytes and does not mutate caller-owned data', async () => {
    const bytes = new Uint8Array([0, 65, 66, 255])
    const copy = [...bytes]
    // Stabilize the view identity — a fresh `.subarray()` each render would
    // retrigger the effect forever because `target` is compared by reference.
    const view = bytes.subarray(1, 3)
    const { result } = renderHook(() => useBase64(view, { dataUrl: false }))
    await waitFor(() => expect(result.current.base64).toBe('QUI='))
    expect([...bytes]).toEqual(copy)
  })

  it('uses the latest onError callback for a current asynchronous failure', async () => {
    const oldError = vi.fn()
    const latestError = vi.fn()
    const value = { value: 1 }
    const { result, rerender } = renderHook(
      ({ onError }) =>
        useBase64(value, {
          enabled: false,
          onError,
          serializer: () => {
            throw new Error('current failure')
          },
        }),
      { initialProps: { onError: oldError } },
    )
    rerender({ onError: latestError })
    const request = result.current.execute()
    await expect(request).resolves.toBeNull()
    await waitFor(() => expect(latestError).toHaveBeenCalledOnce())
    expect(oldError).not.toHaveBeenCalled()
  })

  it('contains throwing onError callbacks', async () => {
    const onError = vi.fn(() => {
      throw new Error('consumer callback failure')
    })
    const value = { value: 1 }
    const { result } = renderHook(() =>
      useBase64(value, {
        serializer: () => {
          throw new Error('encode failed')
        },
        onError,
      }),
    )
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(onError).toHaveBeenCalledOnce()
  })

  it.each([
    [{ type: 'invalid' }, /MIME type/],
    [{ type: ' ' }, /MIME type/],
    [{ quality: -1 }, /between 0 and 1/],
    [{ quality: Number.POSITIVE_INFINITY }, /between 0 and 1/],
  ])('rejects invalid options before encoding', async (options, message) => {
    const { result } = renderHook(() => useBase64('value', options))
    await waitFor(() => expect(result.current.error?.message).toMatch(message))
    expect(result.current.isLoading).toBe(false)
  })

  it('clears an existing result when disabled and re-encodes when enabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useBase64('fresh', { enabled, dataUrl: false }),
      { initialProps: { enabled: true } },
    )
    await waitFor(() => expect(result.current.base64).toBe('ZnJlc2g='))
    rerender({ enabled: false })
    expect(result.current).toMatchObject({
      base64: '',
      isLoading: false,
      error: null,
    })
    rerender({ enabled: true })
    await waitFor(() => expect(result.current.base64).toBe('ZnJlc2g='))
  })

  it('resolves a stale manual success for its caller without overwriting newer state', async () => {
    const first = deferred<ArrayBuffer>()
    const blob = new Blob()
    Object.defineProperty(blob, 'arrayBuffer', { value: () => first.promise })
    const { result, rerender } = renderHook(
      ({ value }: { value: Blob | string }) =>
        useBase64(value, { dataUrl: false }),
      { initialProps: { value: blob as Blob | string } },
    )
    const stale = result.current.execute()
    rerender({ value: 'new' })
    await waitFor(() => expect(result.current.base64).toBe('bmV3'))
    await act(async () => first.resolve(new Uint8Array([65]).buffer))
    await expect(stale).resolves.toBe('QQ==')
    expect(result.current.base64).toBe('bmV3')
  })

  it('does not update after unmount from a pending operation', async () => {
    const pending = deferred<ArrayBuffer>()
    const blob = new Blob()
    Object.defineProperty(blob, 'arrayBuffer', { value: () => pending.promise })
    const { result, unmount } = renderHook(() => useBase64(blob))
    const promise = result.current.promise
    unmount()
    await act(async () => pending.resolve(new Uint8Array([65]).buffer))
    await expect(promise).resolves.toBe(
      'data:application/octet-stream;base64,QQ==',
    )
  })
})
