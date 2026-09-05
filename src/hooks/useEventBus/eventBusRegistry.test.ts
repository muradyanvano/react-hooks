import { describe, expect, it } from 'vitest'

import {
  createEventBusOwner,
  emitChannel,
  getEventBusListenerCount,
  hasEventBusChannel,
  removeOwner,
  resetChannel,
  subscribe,
  unsubscribe,
} from './eventBusRegistry'

describe('eventBusRegistry', () => {
  it('prunes an empty channel after unsubscribe', () => {
    const key = Symbol('prune')
    const owner = createEventBusOwner()
    const listener = () => undefined
    subscribe(key, owner, listener, false)

    expect(hasEventBusChannel(key)).toBe(true)
    unsubscribe(key, owner, listener)
    expect(hasEventBusChannel(key)).toBe(false)
  })

  it('prunes an empty channel after owner removal and reset', () => {
    const key = Symbol('owner-prune')
    const owner = createEventBusOwner()
    subscribe(key, owner, () => undefined, false)
    removeOwner(key, owner)
    expect(getEventBusListenerCount(key)).toBe(0)
    expect(hasEventBusChannel(key)).toBe(false)

    subscribe(key, owner, () => undefined, false)
    resetChannel(key)
    expect(hasEventBusChannel(key)).toBe(false)
  })

  it('preserves listener registration order and passes optional payloads', () => {
    const key = Symbol('order')
    const owner = createEventBusOwner()
    const calls: string[] = []
    subscribe(
      key,
      owner,
      (event, payload) => calls.push(`${event}:${payload}`),
      false,
    )
    subscribe(
      key,
      createEventBusOwner(),
      (event, payload) => calls.push(`${event}:${payload}`),
      false,
    )
    emitChannel(key, 'event', undefined)
    expect(calls).toEqual(['event:undefined', 'event:undefined'])
  })

  it('makes a stop function idempotent', () => {
    const key = Symbol('stop')
    const stop = subscribe(key, createEventBusOwner(), () => undefined, false)
    stop()
    stop()
    expect(hasEventBusChannel(key)).toBe(false)
  })

  it('does not invoke subscriptions added during an active emit', () => {
    const key = Symbol('mutation')
    const owner = createEventBusOwner()
    const calls: string[] = []
    subscribe(
      key,
      owner,
      () => {
        calls.push('first')
        subscribe(key, owner, () => calls.push('late'), false)
      },
      false,
    )
    emitChannel(key, undefined, undefined)
    expect(calls).toEqual(['first'])
    emitChannel(key, undefined, undefined)
    expect(calls).toEqual(['first', 'first', 'late'])
  })

  it('removes a once listener before nested emits and after a throw', () => {
    const key = Symbol('once')
    const owner = createEventBusOwner()
    const listener = () => {
      emitChannel(key, 'nested', undefined)
      throw new Error('failure')
    }
    subscribe(key, owner, listener, true)
    expect(() => emitChannel(key, 'outer', undefined)).toThrow('failure')
    expect(getEventBusListenerCount(key)).toBe(0)
  })

  it('keeps string and number keys isolated in the registry', () => {
    const owner = createEventBusOwner()
    subscribe('1', owner, () => undefined, false)
    subscribe(1, owner, () => undefined, false)
    expect(getEventBusListenerCount('1')).toBe(1)
    expect(getEventBusListenerCount(1)).toBe(1)
    resetChannel('1')
    resetChannel(1)
  })

  it('allows the same function for separate owners', () => {
    const key = Symbol('separate-owners')
    const listener = () => undefined
    subscribe(key, createEventBusOwner(), listener, false)
    subscribe(key, createEventBusOwner(), listener, false)
    expect(getEventBusListenerCount(key)).toBe(2)
    resetChannel(key)
  })

  it('does nothing when removing an owner from an absent channel', () => {
    expect(() =>
      removeOwner(Symbol('absent'), createEventBusOwner()),
    ).not.toThrow()
  })

  it('does nothing when emitting an absent channel', () => {
    expect(() =>
      emitChannel(Symbol('absent'), 'event', undefined),
    ).not.toThrow()
  })
})
