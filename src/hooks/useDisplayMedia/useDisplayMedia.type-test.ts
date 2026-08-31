import { expectTypeOf } from 'vitest'

import {
  useDisplayMedia,
  type UseDisplayMediaOptions,
  type UseDisplayMediaReturn,
} from '../../index'
import {
  useDisplayMedia as useDisplayMediaLocal,
  type UseDisplayMediaReturn as LocalReturn,
} from './useDisplayMedia'

export function __typeTests(): void {
  expectTypeOf(useDisplayMedia).toBeFunction()
  expectTypeOf(useDisplayMediaLocal).toEqualTypeOf(useDisplayMedia)
  expectTypeOf<LocalReturn>().toEqualTypeOf<UseDisplayMediaReturn>()

  expectTypeOf<UseDisplayMediaOptions>().toMatchTypeOf<{
    enabled?: boolean
    video?: boolean | MediaTrackConstraints
    audio?: boolean | MediaTrackConstraints
  }>()

  const empty = useDisplayMedia()
  expectTypeOf(empty).toEqualTypeOf<UseDisplayMediaReturn>()
  expectTypeOf(empty.isSupported).toEqualTypeOf<boolean>()
  expectTypeOf(empty.stream).toEqualTypeOf<MediaStream | null>()
  expectTypeOf(empty.isSharing).toEqualTypeOf<boolean>()
  expectTypeOf(empty.isLoading).toEqualTypeOf<boolean>()
  expectTypeOf(empty.error).toEqualTypeOf<Error | null>()
  expectTypeOf(empty.start).returns.toEqualTypeOf<Promise<MediaStream | null>>()
  expectTypeOf(empty.stop).returns.toEqualTypeOf<void>()

  const configured = useDisplayMedia({
    enabled: true,
    video: { displaySurface: 'monitor' },
    audio: true,
  })
  expectTypeOf(configured).toEqualTypeOf<UseDisplayMediaReturn>()

  const booleanConstraints = useDisplayMedia({
    enabled: false,
    video: false,
    audio: false,
  })
  expectTypeOf(booleanConstraints).toEqualTypeOf<UseDisplayMediaReturn>()

  void configured
  void booleanConstraints

  // @ts-expect-error invalid enabled value
  useDisplayMedia({ enabled: 'yes' })

  // @ts-expect-error invalid video value
  useDisplayMedia({ video: 'yes' })

  // @ts-expect-error invalid audio value
  useDisplayMedia({ audio: 'yes' })

  // @ts-expect-error arbitrary options are rejected
  useDisplayMedia({ once: true })
}
