import { createRef, type RefObject } from 'react'
import { expectTypeOf } from 'vitest'

import {
  useEventListener,
  type UseEventListenerHandler,
  type UseEventListenerOptions,
  type UseEventListenerTarget,
} from '../../index'
import {
  useEventListener as useEventListenerLocal,
  type UseEventListenerOptions as LocalOptions,
} from './useEventListener'

export function __typeTests(): void {
  expectTypeOf(useEventListener).toBeFunction()
  expectTypeOf(useEventListenerLocal).toEqualTypeOf(useEventListener)
  expectTypeOf<LocalOptions>().toEqualTypeOf<UseEventListenerOptions>()

  expectTypeOf<UseEventListenerHandler<MouseEvent>>().toEqualTypeOf<
    (event: MouseEvent) => void
  >()
  expectTypeOf<UseEventListenerTarget<HTMLButtonElement>>().toMatchTypeOf<
    HTMLButtonElement | RefObject<HTMLButtonElement | null> | null
  >()

  // ---------------------------------------------------------------------------
  // Default window inference
  // ---------------------------------------------------------------------------

  useEventListener('resize', (event) => {
    expectTypeOf(event).toEqualTypeOf<UIEvent>()
  })
  useEventListener('keydown', (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
  })
  useEventListener('storage', (event) => {
    expectTypeOf(event).toEqualTypeOf<StorageEvent>()
  })
  useEventListener(['resize', 'orientationchange'] as const, (event) => {
    expectTypeOf(event).toEqualTypeOf<UIEvent | Event>()
  })

  expectTypeOf(
    useEventListener('resize', () => {
      // no-op
    }),
  ).toEqualTypeOf<void>()

  // @ts-expect-error wrong native window handler type
  useEventListener('click', (event: KeyboardEvent) => {
    void event
  })

  // ---------------------------------------------------------------------------
  // Document inference
  // ---------------------------------------------------------------------------

  useEventListener(document, 'visibilitychange', (event) => {
    expectTypeOf(event).toEqualTypeOf<Event>()
  })
  useEventListener(document, 'selectionchange', (event) => {
    expectTypeOf(event).toEqualTypeOf<Event>()
  })
  useEventListener(document, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf<DocumentEventMap['click']>()
  })
  useEventListener(document, 'keydown', (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
  })

  // @ts-expect-error wrong document handler type
  useEventListener(document, 'click', (event: KeyboardEvent) => {
    void event
  })

  // ---------------------------------------------------------------------------
  // HTMLElement / SVG / MediaQueryList
  // ---------------------------------------------------------------------------

  const buttonRef: RefObject<HTMLButtonElement | null> =
    createRef<HTMLButtonElement>()
  const svgRef: RefObject<SVGSVGElement | null> = createRef<SVGSVGElement>()
  const input = document.createElement('input')
  const button = document.createElement('button')

  useEventListener(buttonRef, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf<HTMLElementEventMap['click']>()
  })
  useEventListener(input, 'input', (event) => {
    expectTypeOf(event).toEqualTypeOf<HTMLElementEventMap['input']>()
  })
  useEventListener(button, 'keydown', (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
  })
  useEventListener(buttonRef, 'pointerenter', (event) => {
    expectTypeOf(event).toEqualTypeOf<PointerEvent>()
  })

  // @ts-expect-error button click is not a KeyboardEvent
  useEventListener(buttonRef, 'click', (event: KeyboardEvent) => {
    void event
  })

  useEventListener(svgRef, 'click', (event) => {
    expectTypeOf(event).toEqualTypeOf<SVGElementEventMap['click']>()
  })
  useEventListener(svgRef, 'pointermove', (event) => {
    expectTypeOf(event).toEqualTypeOf<PointerEvent>()
  })

  const mql = window.matchMedia('(min-width: 600px)')
  useEventListener(mql, 'change', (event) => {
    expectTypeOf(event).toEqualTypeOf<MediaQueryListEvent>()
  })

  // @ts-expect-error invalid MediaQueryList listener type
  useEventListener(mql, 'change', (event: KeyboardEvent) => {
    void event
  })

  // ---------------------------------------------------------------------------
  // Multiple events / options / targets
  // ---------------------------------------------------------------------------

  const names = ['mouseenter', 'mouseleave'] as const
  useEventListener(buttonRef, names, (event) => {
    expectTypeOf(event).toEqualTypeOf<MouseEvent>()
  })
  useEventListener(buttonRef, [], () => {
    // no-op
  })

  // @ts-expect-error non-string array entries
  useEventListener(buttonRef, [1, 2], () => {
    // no-op
  })

  const signal = new AbortController().signal
  useEventListener('resize', () => {}, {
    enabled: true,
    capture: true,
    passive: true,
    once: true,
    signal,
  })

  // @ts-expect-error invalid option value
  useEventListener('resize', () => {}, { capture: 'yes' })

  // @ts-expect-error arbitrary option properties
  useEventListener('resize', () => {}, { foo: true })

  useEventListener(window, 'resize', () => {})
  useEventListener(null, 'click', () => {})
  useEventListener(new EventTarget(), 'custom', () => {})

  // @ts-expect-error invalid target value
  useEventListener(42, 'click', () => {})

  // ---------------------------------------------------------------------------
  // Custom events
  // ---------------------------------------------------------------------------

  interface ItemSelectedDetail {
    id: string
  }

  const target = new EventTarget()
  useEventListener(
    target,
    'item:selected',
    (event: CustomEvent<ItemSelectedDetail>) => {
      expectTypeOf(event.detail.id).toEqualTypeOf<string>()
    },
  )

  useEventListener<CustomEvent<ItemSelectedDetail>>(
    'item:selected',
    (event) => {
      expectTypeOf(event.detail.id).toEqualTypeOf<string>()
    },
  )

  // @ts-expect-error known window click cannot be typed as KeyboardEvent
  useEventListener(window, 'click', (event: KeyboardEvent) => {
    void event
  })

  // @ts-expect-error known button click cannot be typed as KeyboardEvent
  useEventListener(buttonRef, 'click', (event: KeyboardEvent) => {
    void event
  })

  void useEventListener
}
