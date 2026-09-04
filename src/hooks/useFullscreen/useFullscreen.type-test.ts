import { createRef } from 'react'
import { describe, expectTypeOf, it } from 'vitest'

import {
  useFullscreen,
  type UseFullscreenNavigationUI,
  type UseFullscreenOptions,
  type UseFullscreenReturn,
  type UseFullscreenTarget,
} from './useFullscreen'
import {
  useFullscreen as rootUseFullscreen,
  type UseFullscreenOptions as RootOptions,
  type UseFullscreenReturn as RootReturn,
} from '../../index'

describe('useFullscreen types', () => {
  it('types omitted and HTML refs', () => {
    const omitted = useFullscreen()
    expectTypeOf(omitted).toEqualTypeOf<UseFullscreenReturn>()
    expectTypeOf(omitted.enter).returns.toEqualTypeOf<Promise<boolean>>()
    expectTypeOf(omitted.exit).returns.toEqualTypeOf<Promise<boolean>>()
    expectTypeOf(omitted.toggle).returns.toEqualTypeOf<Promise<boolean>>()

    const htmlRef = createRef<HTMLDivElement>()
    useFullscreen(htmlRef)

    const svgRef = createRef<SVGSVGElement>()
    useFullscreen(svgRef)

    const videoRef = createRef<HTMLVideoElement>()
    useFullscreen(videoRef)

    const elementRef = createRef<Element>()
    useFullscreen(elementRef)
  })

  it('accepts complete options', () => {
    const options = {
      enabled: true,
      autoExit: false,
      document: null,
      navigationUI: 'hide',
      onError: () => undefined,
    } satisfies UseFullscreenOptions
    useFullscreen(undefined, options)

    expectTypeOf<UseFullscreenNavigationUI>().toEqualTypeOf<
      'auto' | 'show' | 'hide'
    >()
    expectTypeOf<UseFullscreenTarget>().toEqualTypeOf<Element>()
  })

  it('re-exports from the package root', () => {
    expectTypeOf(rootUseFullscreen).toEqualTypeOf(useFullscreen)
    expectTypeOf<RootOptions>().toEqualTypeOf<UseFullscreenOptions>()
    expectTypeOf<RootReturn>().toEqualTypeOf<UseFullscreenReturn>()
  })

  it('rejects invalid option shapes', () => {
    // @ts-expect-error invalid navigationUI
    useFullscreen(undefined, { navigationUI: 'fullscreen' })

    // @ts-expect-error invalid document
    useFullscreen(undefined, { document: window })

    // @ts-expect-error invalid callback
    useFullscreen(undefined, { onError: 'nope' })

    // @ts-expect-error unknown option
    useFullscreen(undefined, { unknown: true })
  })
})
