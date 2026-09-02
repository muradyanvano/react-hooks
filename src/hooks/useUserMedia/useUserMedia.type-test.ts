import { expectTypeOf, test } from 'vitest'

import {
  useUserMedia,
  type UseUserMediaOptions,
  type UseUserMediaReturn,
} from './useUserMedia'
import {
  useUserMedia as useUserMediaRoot,
  type UseUserMediaOptions as UseUserMediaOptionsRoot,
  type UseUserMediaReturn as UseUserMediaReturnRoot,
} from '../../index'

test('useUserMedia option and return inference', () => {
  const empty = useUserMedia()
  expectTypeOf(empty).toEqualTypeOf<UseUserMediaReturn>()
  expectTypeOf(empty.stream).toEqualTypeOf<MediaStream | null>()
  expectTypeOf(empty.error).toEqualTypeOf<Error | null>()
  expectTypeOf(empty.start).returns.toEqualTypeOf<Promise<MediaStream | null>>()
  expectTypeOf(empty.restart).returns.toEqualTypeOf<
    Promise<MediaStream | null>
  >()
  expectTypeOf(empty.stop).returns.toBeVoid()

  const withOptions = useUserMedia({
    enabled: true,
    autoSwitch: false,
    constraints: {
      video: {
        deviceId: { exact: 'cam-1' },
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { max: 30 },
      },
      audio: {
        deviceId: { exact: 'mic-1' },
        echoCancellation: true,
        noiseSuppression: true,
        advanced: [{ autoGainControl: true }],
      },
    },
  })
  expectTypeOf(withOptions.isActive).toBeBoolean()

  const booleanConstraints = useUserMedia({
    constraints: { video: true, audio: false },
  })
  void booleanConstraints

  expectTypeOf<UseUserMediaOptions>().toMatchTypeOf<{
    enabled?: boolean
    autoSwitch?: boolean
    constraints?: MediaStreamConstraints
  }>()
})

test('root imports and negative cases', () => {
  expectTypeOf(useUserMediaRoot).toEqualTypeOf(useUserMedia)
  expectTypeOf<UseUserMediaOptionsRoot>().toEqualTypeOf<UseUserMediaOptions>()
  expectTypeOf<UseUserMediaReturnRoot>().toEqualTypeOf<UseUserMediaReturn>()

  // @ts-expect-error enabled must be boolean
  useUserMedia({ enabled: 'yes' })

  // @ts-expect-error autoSwitch must be boolean
  useUserMedia({ autoSwitch: 1 })

  // @ts-expect-error video cannot be a number
  useUserMedia({ constraints: { video: 1 } })

  // @ts-expect-error unknown option rejected
  useUserMedia({ foo: true })
})
