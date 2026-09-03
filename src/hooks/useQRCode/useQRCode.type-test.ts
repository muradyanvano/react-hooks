import { describe, expectTypeOf, it } from 'vitest'

import {
  useQRCode,
  type UseQRCodeColorOptions,
  type UseQRCodeErrorCorrectionLevel,
  type UseQRCodeImageType,
  type UseQRCodeMaskPattern,
  type UseQRCodeOptions,
  type UseQRCodeReturn,
} from './useQRCode'
import {
  useQRCode as rootUseQRCode,
  type UseQRCodeColorOptions as RootUseQRCodeColorOptions,
  type UseQRCodeErrorCorrectionLevel as RootUseQRCodeErrorCorrectionLevel,
  type UseQRCodeImageType as RootUseQRCodeImageType,
  type UseQRCodeMaskPattern as RootUseQRCodeMaskPattern,
  type UseQRCodeOptions as RootUseQRCodeOptions,
  type UseQRCodeReturn as RootUseQRCodeReturn,
} from '../../index'

describe('useQRCode types', () => {
  it('types the default call and return shape', () => {
    const result = useQRCode('text')
    expectTypeOf(result).toEqualTypeOf<UseQRCodeReturn>()
    expectTypeOf(result.dataUrl).toEqualTypeOf<string>()
    expectTypeOf(result.isLoading).toEqualTypeOf<boolean>()
    expectTypeOf(result.error).toEqualTypeOf<Error | null>()
    expectTypeOf(result.generate).toEqualTypeOf<() => Promise<string | null>>()
    expectTypeOf(result.generate()).resolves.toEqualTypeOf<string | null>()
  })

  it('accepts a full options object and aliases', () => {
    const color: UseQRCodeColorOptions = {
      dark: '#000000ff',
      light: '#ffffffff',
    }
    const options: UseQRCodeOptions = {
      enabled: true,
      version: 8,
      errorCorrectionLevel: 'high',
      maskPattern: 7,
      margin: 2,
      scale: 4,
      width: 256,
      color,
      type: 'image/jpeg',
      quality: 0.92,
      onError: () => undefined,
    }
    useQRCode('payload', options)

    const levels: UseQRCodeErrorCorrectionLevel[] = [
      'L',
      'M',
      'Q',
      'H',
      'low',
      'medium',
      'quartile',
      'high',
    ]
    expectTypeOf(levels[0]).toEqualTypeOf<
      UseQRCodeErrorCorrectionLevel | undefined
    >()

    const masks: UseQRCodeMaskPattern[] = [0, 1, 2, 3, 4, 5, 6, 7]
    expectTypeOf(masks[0]).toEqualTypeOf<UseQRCodeMaskPattern | undefined>()

    const types: UseQRCodeImageType[] = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ]
    expectTypeOf(types[0]).toEqualTypeOf<UseQRCodeImageType | undefined>()
  })

  it('exposes matching root-imported types', () => {
    expectTypeOf(rootUseQRCode).toEqualTypeOf(useQRCode)
    expectTypeOf<RootUseQRCodeOptions>().toEqualTypeOf<UseQRCodeOptions>()
    expectTypeOf<RootUseQRCodeReturn>().toEqualTypeOf<UseQRCodeReturn>()
    expectTypeOf<RootUseQRCodeColorOptions>().toEqualTypeOf<UseQRCodeColorOptions>()
    expectTypeOf<RootUseQRCodeErrorCorrectionLevel>().toEqualTypeOf<UseQRCodeErrorCorrectionLevel>()
    expectTypeOf<RootUseQRCodeImageType>().toEqualTypeOf<UseQRCodeImageType>()
    expectTypeOf<RootUseQRCodeMaskPattern>().toEqualTypeOf<UseQRCodeMaskPattern>()
  })

  it('rejects invalid call shapes', () => {
    // @ts-expect-error text must be a string
    useQRCode(123)
    // @ts-expect-error version must be a number
    useQRCode('x', { version: '1' })
    // @ts-expect-error margin must be a number
    useQRCode('x', { margin: '4' })
    // @ts-expect-error scale must be a number
    useQRCode('x', { scale: '2' })
    // @ts-expect-error width must be a number
    useQRCode('x', { width: '100' })
    // @ts-expect-error quality must be a number
    useQRCode('x', { quality: '1' })
    // @ts-expect-error unsupported MIME type
    useQRCode('x', { type: 'image/gif' })
    // @ts-expect-error unsupported error-correction level
    useQRCode('x', { errorCorrectionLevel: 'X' })
    // @ts-expect-error unsupported mask pattern
    useQRCode('x', { maskPattern: 8 })
    // @ts-expect-error onError must accept Error
    useQRCode('x', { onError: (value: string) => value })
    // @ts-expect-error unknown option rejected
    useQRCode('x', { logoUrl: 'nope' })
  })

  it('has no default export', () => {
    // @ts-expect-error there is no default export
    void useQRCode.default
  })
})
