export type EventBusOwner = symbol
export type EventBusChannelKey = string | number | symbol
export type EventBusListenerRecord = {
  owner: EventBusOwner
  listener: (event: unknown, payload: unknown) => void
  once: boolean
}

interface EventBusChannel {
  listeners: EventBusListenerRecord[]
}

const registry = new Map<EventBusChannelKey, EventBusChannel>()

function getOrCreateChannel(key: EventBusChannelKey): EventBusChannel {
  let channel = registry.get(key)
  if (channel == null) {
    channel = { listeners: [] }
    registry.set(key, channel)
  }
  return channel
}

function prune(key: EventBusChannelKey, channel: EventBusChannel): void {
  if (channel.listeners.length === 0 && registry.get(key) === channel) {
    registry.delete(key)
  }
}

export function createEventBusOwner(): EventBusOwner {
  return Symbol('event-bus-owner')
}

export function subscribe(
  key: EventBusChannelKey,
  owner: EventBusOwner,
  listener: EventBusListenerRecord['listener'],
  once: boolean,
): () => void {
  const channel = getOrCreateChannel(key)
  const existing = channel.listeners.find(
    (record) => record.owner === owner && record.listener === listener,
  )
  if (existing != null) {
    return () => {
      unsubscribe(key, owner, listener)
    }
  }

  channel.listeners.push({ owner, listener, once })
  return () => {
    unsubscribe(key, owner, listener)
  }
}

export function unsubscribe(
  key: EventBusChannelKey,
  owner: EventBusOwner,
  listener: EventBusListenerRecord['listener'],
): void {
  const channel = registry.get(key)
  if (channel == null) return

  const index = channel.listeners.findIndex(
    (record) => record.owner === owner && record.listener === listener,
  )
  if (index !== -1) channel.listeners.splice(index, 1)
  prune(key, channel)
}

export function removeOwner(
  key: EventBusChannelKey,
  owner: EventBusOwner,
): void {
  const channel = registry.get(key)
  if (channel == null) return
  channel.listeners = channel.listeners.filter(
    (record) => record.owner !== owner,
  )
  prune(key, channel)
}

export function resetChannel(key: EventBusChannelKey): void {
  registry.delete(key)
}

export function emitChannel(
  key: EventBusChannelKey,
  event: unknown,
  payload: unknown,
): void {
  const channel = registry.get(key)
  if (channel == null) return

  const snapshot = [...channel.listeners]
  const errors: unknown[] = []
  for (const record of snapshot) {
    if (record.once) unsubscribe(key, record.owner, record.listener)
    try {
      record.listener(event, payload)
    } catch (error) {
      errors.push(error)
    }
  }

  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) {
    if (typeof AggregateError === 'function') {
      throw new AggregateError(errors, 'Multiple event bus listeners failed')
    }
    throw errors[0]
  }
}

/** Test-only registry introspection. Not exported from the package entry. */
export function hasEventBusChannel(key: EventBusChannelKey): boolean {
  return registry.has(key)
}

/** Test-only registry introspection. Not exported from the package entry. */
export function getEventBusListenerCount(key: EventBusChannelKey): number {
  return registry.get(key)?.listeners.length ?? 0
}
