import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useQRCode, type UseQRCodeOptions } from './useQRCode'

const { toDataURLMock } = vi.hoisted(() => ({
  toDataURLMock: vi.fn(),
}))

vi.mock('qrcode', () => ({
  toDataURL: toDataURLMock,
}))

function fakeDataUrl(text: string): string {
  return `data:image/png;base64,${Buffer.from(text, 'utf8').toString('base64')}`
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useQRCode', () => {
  beforeEach(() => {
    toDataURLMock.mockReset()
    toDataURLMock.mockImplementation(async (text: string) =>
      fakeDataUrl(String(text)),
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('starts from idle state before generation settles', async () => {
    let firstRender: ReturnType<typeof useQRCode> | null = null
    const { result } = renderHook(() => {
      const value = useQRCode('hello')
      if (firstRender == null) {
        firstRender = {
          dataUrl: value.dataUrl,
          isLoading: value.isLoading,
          error: value.error,
          generate: value.generate,
        }
      }
      return value
    })

    expect(firstRender).toMatchObject({
      dataUrl: '',
      isLoading: false,
      error: null,
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.dataUrl).toBe(fakeDataUrl('hello'))
      expect(result.current.error).toBeNull()
    })
    expect(toDataURLMock).toHaveBeenCalled()
  })

  it('returns the exact data URL from generate()', async () => {
    const { result } = renderHook(() => useQRCode('manual', { enabled: false }))

    let generated: string | null = null
    await act(async () => {
      generated = await result.current.generate()
    })

    expect(generated).toBe(fakeDataUrl('manual'))
    expect(result.current.dataUrl).toBe(generated)
  })

  it('supports manual generation while disabled', async () => {
    const { result, rerender } = renderHook(
      ({ text, enabled }) => useQRCode(text, { enabled }),
      { initialProps: { text: 'one', enabled: false } },
    )

    expect(toDataURLMock).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.generate()
    })
    expect(result.current.dataUrl).toBe(fakeDataUrl('one'))

    rerender({ text: 'two', enabled: false })
    expect(result.current.dataUrl).toBe('')

    await act(async () => {
      await result.current.generate()
    })
    expect(result.current.dataUrl).toBe(fakeDataUrl('two'))
  })

  it('preserves unicode, emoji, multiline, whitespace, and URL query text', async () => {
    const samples = [
      '  keep spaces  ',
      'a\nb',
      'Unicode Վանո 🙂',
      'https://demo.example/path?q=1&x=y#hash',
    ]

    for (const text of samples) {
      toDataURLMock.mockClear()
      const { result, unmount } = renderHook(() => useQRCode(text))
      await waitFor(() =>
        expect(result.current.dataUrl).toBe(fakeDataUrl(text)),
      )
      expect(toDataURLMock).toHaveBeenCalledWith(
        text,
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          margin: 4,
        }),
      )
      unmount()
    }
  })

  it('maps encoding options through to the encoder without mutating consumer objects', async () => {
    const color = { dark: '#112233', light: '#aabbcc' }
    const options = {
      version: 4,
      errorCorrectionLevel: 'quartile' as const,
      maskPattern: 2 as const,
      margin: 6,
      scale: 5,
      width: 200,
      type: 'image/webp' as const,
      quality: 0.7,
      color,
    }
    const snapshot = structuredClone(options)

    const { result } = renderHook(() => useQRCode('opts', options))
    await waitFor(() => expect(result.current.dataUrl).not.toBe(''))

    expect(toDataURLMock).toHaveBeenCalledWith(
      'opts',
      expect.objectContaining({
        version: 4,
        errorCorrectionLevel: 'quartile',
        maskPattern: 2,
        margin: 6,
        scale: 5,
        width: 200,
        type: 'image/webp',
        color: { dark: '#112233', light: '#aabbcc' },
        rendererOpts: { quality: 0.7 },
      }),
    )
    expect(options).toEqual(snapshot)
  })

  it('clears output for empty text and disabled automatic generation', async () => {
    const { result, rerender } = renderHook(
      ({ text, enabled }) => useQRCode(text, { enabled }),
      { initialProps: { text: 'value', enabled: true } },
    )

    await waitFor(() => expect(result.current.dataUrl).not.toBe(''))

    rerender({ text: '', enabled: true })
    await waitFor(() => {
      expect(result.current).toMatchObject({
        dataUrl: '',
        isLoading: false,
        error: null,
      })
    })

    const callsBeforeDisabled = toDataURLMock.mock.calls.length
    rerender({ text: 'again', enabled: false })
    await waitFor(() => {
      expect(result.current.dataUrl).toBe('')
    })
    expect(toDataURLMock.mock.calls.length).toBe(callsBeforeDisabled)

    rerender({ text: 'again', enabled: true })
    await waitFor(() =>
      expect(result.current.dataUrl).toBe(fakeDataUrl('again')),
    )
  })

  it('lets the newest request win across slow/fast races', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    toDataURLMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const { result, rerender } = renderHook(({ text }) => useQRCode(text), {
      initialProps: { text: 'A' },
    })

    await waitFor(() => expect(result.current.isLoading).toBe(true))

    rerender({ text: 'B' })
    await waitFor(() => expect(toDataURLMock).toHaveBeenCalledTimes(2))

    await act(async () => {
      second.resolve(fakeDataUrl('B'))
    })
    await waitFor(() => {
      expect(result.current.dataUrl).toBe(fakeDataUrl('B'))
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      first.resolve(fakeDataUrl('A'))
    })
    expect(result.current.dataUrl).toBe(fakeDataUrl('B'))
  })

  it('ignores stale rejections and does not leave unhandled rejections', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const onError = vi.fn()
    toDataURLMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const { result, rerender } = renderHook(
      ({ text }) => useQRCode(text, { onError }),
      { initialProps: { text: 'A' } },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    rerender({ text: 'B' })

    await act(async () => {
      second.resolve(fakeDataUrl('B'))
    })
    await waitFor(() => expect(result.current.dataUrl).toBe(fakeDataUrl('B')))

    await act(async () => {
      first.reject(new Error('stale'))
    })
    expect(onError).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('supports automatic then manual overlapping requests', async () => {
    const auto = deferred<string>()
    const manual = deferred<string>()
    toDataURLMock
      .mockImplementationOnce(() => auto.promise)
      .mockImplementationOnce(() => manual.promise)

    const { result } = renderHook(() => useQRCode('auto'))
    await waitFor(() => expect(result.current.isLoading).toBe(true))

    let manualResult: string | null = null
    await act(async () => {
      const pending = result.current.generate()
      manual.resolve(fakeDataUrl('manual'))
      manualResult = await pending
    })

    expect(manualResult).toBe(fakeDataUrl('manual'))
    await waitFor(() =>
      expect(result.current.dataUrl).toBe(fakeDataUrl('manual')),
    )

    await act(async () => {
      auto.resolve(fakeDataUrl('auto'))
    })
    expect(result.current.dataUrl).toBe(fakeDataUrl('manual'))
  })

  it('clears pending output when disabled or emptied mid-flight', async () => {
    const pending = deferred<string>()
    toDataURLMock.mockImplementation(() => pending.promise)

    const { result, rerender } = renderHook(
      ({ text, enabled }) => useQRCode(text, { enabled }),
      { initialProps: { text: 'pending', enabled: true } },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(true))

    rerender({ text: 'pending', enabled: false })
    await waitFor(() => {
      expect(result.current).toMatchObject({
        dataUrl: '',
        isLoading: false,
        error: null,
      })
    })

    await act(async () => {
      pending.resolve(fakeDataUrl('pending'))
    })
    expect(result.current.dataUrl).toBe('')
  })

  it('does not update after unmount while a request is pending', async () => {
    const pending = deferred<string>()
    toDataURLMock.mockImplementation(() => pending.promise)
    const { result, unmount } = renderHook(() => useQRCode('gone'))

    await waitFor(() => expect(result.current.isLoading).toBe(true))
    unmount()

    await act(async () => {
      pending.resolve(fakeDataUrl('gone'))
    })
  })

  it('normalizes validation failures and clears previous output', async () => {
    const onError = vi.fn()
    toDataURLMock.mockResolvedValueOnce(fakeDataUrl('ok'))

    const { result, rerender } = renderHook(
      ({ fail }) =>
        useQRCode(fail ? 'bad' : 'ok', {
          onError,
          ...(fail ? { version: 99 as never } : {}),
        }),
      { initialProps: { fail: false } },
    )

    await waitFor(() => expect(result.current.dataUrl).not.toBe(''))

    rerender({ fail: true })
    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.dataUrl).toBe('')
      expect(result.current.isLoading).toBe(false)
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]?.[0]?.message).toMatch(/version/i)
  })

  it('normalizes Error, string, and unknown encoder rejections', async () => {
    const cases: unknown[] = [
      new Error('encoder-error'),
      'encoder-string',
      { weird: true },
    ]

    for (const cause of cases) {
      const onError = vi.fn()
      toDataURLMock.mockRejectedValueOnce(cause)
      const { result, unmount } = renderHook(() =>
        useQRCode(`fail-${String(cause)}`, { onError }),
      )
      await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
      expect(result.current.dataUrl).toBe('')
      expect(onError).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('contains throwing onError callbacks', async () => {
    toDataURLMock.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() =>
      useQRCode('x', {
        onError: () => {
          throw new Error('consumer boom')
        },
      }),
    )

    await waitFor(() => expect(result.current.error?.message).toBe('boom'))
    expect(result.current.isLoading).toBe(false)
  })

  it('does not regenerate when only onError identity changes', async () => {
    const { rerender } = renderHook(
      ({ onError }) => useQRCode('stable', { onError }),
      { initialProps: { onError: () => undefined } },
    )

    await waitFor(() => expect(toDataURLMock).toHaveBeenCalledTimes(1))
    rerender({
      onError: () => {
        throw new Error('new identity')
      },
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(toDataURLMock).toHaveBeenCalledTimes(1)
  })

  it('does not regenerate for equivalent color object identity changes', async () => {
    const { rerender } = renderHook(
      ({ color }) => useQRCode('color', { color }),
      {
        initialProps: {
          color: { dark: '#000000', light: '#ffffff' },
        },
      },
    )

    await waitFor(() => expect(toDataURLMock).toHaveBeenCalledTimes(1))
    rerender({ color: { dark: '#000000', light: '#ffffff' } })
    await act(async () => {
      await Promise.resolve()
    })
    expect(toDataURLMock).toHaveBeenCalledTimes(1)

    rerender({ color: { dark: '#111111', light: '#ffffff' } })
    await waitFor(() => expect(toDataURLMock).toHaveBeenCalledTimes(2))
  })

  it('keeps generate identity stable', async () => {
    const { result, rerender } = renderHook(({ text }) => useQRCode(text), {
      initialProps: { text: 'a' },
    })
    const first = result.current.generate
    await waitFor(() => expect(result.current.dataUrl).not.toBe(''))
    rerender({ text: 'b' })
    await waitFor(() => expect(result.current.dataUrl).toBe(fakeDataUrl('b')))
    expect(result.current.generate).toBe(first)
  })

  it('avoids avoidable updates for identical successful results', async () => {
    toDataURLMock.mockResolvedValue(fakeDataUrl('same'))
    const { result } = renderHook(() => useQRCode('same', { enabled: false }))

    let first: string | null = null
    await act(async () => {
      first = await result.current.generate()
    })
    const snapshotUrl = result.current.dataUrl

    await act(async () => {
      const second = await result.current.generate()
      expect(second).toBe(first)
    })

    expect(result.current.dataUrl).toBe(snapshotUrl)
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('does not double-notify onError for Strict Mode discarded work', async () => {
    const onError = vi.fn()
    const pending = deferred<string>()
    toDataURLMock.mockImplementation(() => pending.promise)

    const { unmount } = renderHook(() => useQRCode('strict', { onError }), {
      wrapper: StrictMode,
    })

    await waitFor(() =>
      expect(toDataURLMock.mock.calls.length).toBeGreaterThan(0),
    )
    unmount()

    await act(async () => {
      pending.reject(new Error('late'))
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('rejects invalid MIME, ECC, and color at the runtime boundary', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useQRCode('x', {
        onError,
        type: 'image/gif' as never,
      }),
    )

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
    expect(toDataURLMock).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid numeric options without calling the encoder', async () => {
    const cases: UseQRCodeOptions[] = [
      { version: 0 },
      { maskPattern: 9 as never },
      { margin: -1 },
      { scale: 0 },
      { width: Number.NaN },
      { quality: 2 },
      { color: { dark: 'navy' } },
    ]

    for (const options of cases) {
      const onError = vi.fn()
      toDataURLMock.mockClear()
      const { result, unmount } = renderHook(() =>
        useQRCode('payload', { ...options, onError }),
      )
      await waitFor(() => expect(result.current.error).toBeInstanceOf(Error))
      expect(result.current.dataUrl).toBe('')
      expect(result.current.isLoading).toBe(false)
      expect(toDataURLMock).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it('starts idle for empty initial text', async () => {
    const { result } = renderHook(() => useQRCode(''))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current).toMatchObject({
      dataUrl: '',
      isLoading: false,
      error: null,
    })
    expect(toDataURLMock).not.toHaveBeenCalled()
  })
})
