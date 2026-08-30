import { createRef, type RefObject } from 'react'
import { expectTypeOf } from 'vitest'

import {
  useOnKeyStroke,
  type KeyStrokeEventType,
  type KeyStrokeFilter,
  type KeyStrokePredicate,
  type KeyStrokeTarget,
  type UseOnKeyStrokeHandler,
  type UseOnKeyStrokeOptions,
} from '../../index'
import {
  useOnKeyStroke as useOnKeyStrokeLocal,
  type KeyStrokeFilter as LocalFilter,
} from './useOnKeyStroke'

export function __typeTests(): void {
  const handler: UseOnKeyStrokeHandler = (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
  }

  const predicate: KeyStrokePredicate = (event) => {
    expectTypeOf(event).toEqualTypeOf<KeyboardEvent>()
    return event.key === 'k'
  }

  const keys = ['ArrowUp', 'ArrowDown'] as const
  const divRef: RefObject<HTMLDivElement | null> = createRef<HTMLDivElement>()
  const svgRef: RefObject<SVGSVGElement | null> = createRef<SVGSVGElement>()
  const targetRef: RefObject<EventTarget | null> = { current: null }

  expectTypeOf(useOnKeyStroke).toBeFunction()
  expectTypeOf(useOnKeyStrokeLocal).toEqualTypeOf(useOnKeyStroke)
  expectTypeOf<LocalFilter>().toEqualTypeOf<KeyStrokeFilter>()

  expectTypeOf<KeyStrokeEventType>().toEqualTypeOf<'keydown' | 'keyup'>()
  expectTypeOf<KeyStrokeTarget>().toMatchTypeOf<
    EventTarget | RefObject<EventTarget | null> | null
  >()
  expectTypeOf<UseOnKeyStrokeOptions>().toMatchTypeOf<{
    enabled?: boolean
    eventType?: KeyStrokeEventType
    target?: KeyStrokeTarget
    dedupe?: boolean
    capture?: boolean
    passive?: boolean
  }>()

  expectTypeOf(useOnKeyStroke('Escape', handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnKeyStroke(keys, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnKeyStroke(true, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnKeyStroke(predicate, handler)).toEqualTypeOf<void>()
  expectTypeOf(useOnKeyStroke('a', handler, {})).toEqualTypeOf<void>()

  useOnKeyStroke('a', handler, {
    enabled: true,
    eventType: 'keydown',
    target: window,
    dedupe: false,
    capture: false,
    passive: false,
  })
  useOnKeyStroke('a', handler, { eventType: 'keyup', target: document })
  useOnKeyStroke('a', handler, {
    target: document.createElement('div'),
  })
  useOnKeyStroke('a', handler, {
    target: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
  })
  useOnKeyStroke('a', handler, { target: divRef })
  useOnKeyStroke('a', handler, { target: svgRef })
  useOnKeyStroke('a', handler, { target: targetRef })
  useOnKeyStroke('a', handler, { target: null })

  // @ts-expect-error false is rejected as a filter
  useOnKeyStroke(false, handler)

  // @ts-expect-error invalid event type
  useOnKeyStroke('a', handler, { eventType: 'keypress' })

  // @ts-expect-error non-string array values
  useOnKeyStroke([1, 2], handler)

  // @ts-expect-error invalid handler
  useOnKeyStroke('a', (event: MouseEvent) => {
    void event
  })

  // @ts-expect-error invalid predicate
  useOnKeyStroke((event: MouseEvent) => event.button === 0, handler)

  // @ts-expect-error arbitrary options are rejected
  useOnKeyStroke('a', handler, { once: true })

  // @ts-expect-error invalid target values
  useOnKeyStroke('a', handler, { target: 123 })

  // @ts-expect-error missing handler
  useOnKeyStroke('a')
}
