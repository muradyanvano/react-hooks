import { describe, expectTypeOf, it } from 'vitest'

import {
  useEventBus,
  type EventBusEmitArgs,
  type EventBusIdentifier,
  type EventBusKey,
  type EventBusListener,
  type UseEventBusReturn,
} from './useEventBus'

describe('useEventBus types', () => {
  it('infers an optional undefined payload', () => {
    const bus = useEventBus<string>('notice')
    expectTypeOf(bus).toEqualTypeOf<UseEventBusReturn<string>>()
    expectTypeOf(bus.emit).toEqualTypeOf<
      (...args: EventBusEmitArgs<string, undefined>) => void
    >()
    bus.emit('opened')
    bus.emit('opened', undefined)
  })

  it('requires configured payloads and types listeners', () => {
    const bus = useEventBus<'created' | 'deleted', { id: number }>('records')
    bus.on((event, payload) => {
      expectTypeOf(event).toEqualTypeOf<'created' | 'deleted'>()
      expectTypeOf(payload).toEqualTypeOf<{ id: number }>()
    })
    bus.emit('created', { id: 1 })

    // @ts-expect-error — payload is required
    bus.emit('created')
    // @ts-expect-error — payload id must be a number
    bus.emit('deleted', { id: '1' })
  })

  it('supports typed symbol keys and listener aliases', () => {
    const identifier: EventBusIdentifier<number, string> = Symbol(
      'typed',
    ) as EventBusKey<number, string>
    const listener: EventBusListener<number, string> = (event, payload) => {
      void event
      void payload
    }
    const bus = useEventBus(identifier)
    bus.on(listener)
    bus.emit(1, 'payload')
  })

  it('rejects invalid identifiers and listeners', () => {
    // @ts-expect-error — objects are not event bus identifiers
    void useEventBus({})

    const bus = useEventBus<number, string>('typed')
    // @ts-expect-error — event type is incompatible
    void bus.on((event: string, payload: string) => {
      void event
      void payload
    })
  })
})
