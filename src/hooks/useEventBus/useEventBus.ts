import { useCallback, useEffect, useRef } from 'react'

import {
  createEventBusOwner,
  emitChannel,
  removeOwner,
  resetChannel,
  subscribe,
  unsubscribe,
  type EventBusChannelKey,
} from './eventBusRegistry'

// Branded symbol key used for typed channels (assignable to `symbol`).
export type EventBusKey<T, P = undefined> = symbol & {
  readonly __eventBusType__?: (event: T, payload: P) => void
}

export type EventBusIdentifier<T = unknown, P = undefined> =
  EventBusKey<T, P> | string | number | symbol

export type EventBusListener<T = unknown, P = undefined> = (
  event: T,
  payload: P,
) => void

export type EventBusEmitArgs<T, P> = [P] extends [undefined]
  ? [event: T, payload?: P]
  : [event: T, payload: P]

export interface UseEventBusReturn<T, P = undefined> {
  on: (listener: EventBusListener<T, P>) => () => void
  once: (listener: EventBusListener<T, P>) => () => void
  emit: (...args: EventBusEmitArgs<T, P>) => void
  off: (listener: EventBusListener<T, P>) => void
  reset: () => void
}

/**
 * Shares ordered, synchronous events between mounted hook instances using the
 * same key. Channels are local to this package copy and JavaScript realm.
 *
 * Subscriptions belong to the current hook instance. `off()` removes only this
 * instance's registration, while `reset()` clears every listener on this key,
 * including listeners owned by other instances.
 *
 * Rendering on the server does not subscribe. Do not subscribe or emit during
 * React render: server module state is process-local and could otherwise be
 * shared across requests.
 */
export function useEventBus<T = unknown, P = undefined>(
  key: EventBusIdentifier<T, P>,
): UseEventBusReturn<T, P> {
  const ownerRef = useRef(createEventBusOwner())
  const mountedRef = useRef(false)
  const keyRef = useRef(key as EventBusChannelKey)
  // Latest-key ref must update during render. Updating only in useEffect leaves a
  // window where useLayoutEffect callers of stable controls still target the old
  // channel after a key change (see regression test).
  // eslint-disable-next-line react-hooks/refs -- intentional latest-key sync for stable controls
  keyRef.current = key as EventBusChannelKey

  useEffect(() => {
    mountedRef.current = true
    const owner = ownerRef.current
    const channelKey = key as EventBusChannelKey
    return () => {
      mountedRef.current = false
      removeOwner(channelKey, owner)
    }
  }, [key])

  const on = useCallback((listener: EventBusListener<T, P>) => {
    if (!mountedRef.current) return () => undefined
    return subscribe(
      keyRef.current,
      ownerRef.current,
      listener as (event: unknown, payload: unknown) => void,
      false,
    )
  }, [])

  const once = useCallback((listener: EventBusListener<T, P>) => {
    if (!mountedRef.current) return () => undefined
    return subscribe(
      keyRef.current,
      ownerRef.current,
      listener as (event: unknown, payload: unknown) => void,
      true,
    )
  }, [])

  const emit = useCallback((...args: EventBusEmitArgs<T, P>) => {
    if (!mountedRef.current) return
    const [event, payload] = args
    emitChannel(keyRef.current, event, payload)
  }, [])

  const off = useCallback((listener: EventBusListener<T, P>) => {
    if (!mountedRef.current) return
    unsubscribe(
      keyRef.current,
      ownerRef.current,
      listener as (event: unknown, payload: unknown) => void,
    )
  }, [])

  const reset = useCallback(() => {
    if (!mountedRef.current) return
    resetChannel(keyRef.current)
  }, [])

  return { on, once, emit, off, reset }
}
