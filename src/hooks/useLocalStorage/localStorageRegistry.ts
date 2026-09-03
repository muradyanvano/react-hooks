import type {
  SameDocumentListener,
  SameDocumentNotification,
} from './localStorageHelpers'

type KeySubscribers = Map<string, Set<SameDocumentListener>>

const registries = new WeakMap<object, KeySubscribers>()

function getKeySubscribers(storage: object): KeySubscribers {
  let map = registries.get(storage)
  if (map == null) {
    map = new Map()
    registries.set(storage, map)
  }
  return map
}

export function subscribeSameDocument(
  storage: object,
  key: string,
  listener: SameDocumentListener,
): () => void {
  const byKey = getKeySubscribers(storage)
  let listeners = byKey.get(key)
  if (listeners == null) {
    listeners = new Set()
    byKey.set(key, listeners)
  }
  listeners.add(listener)

  return () => {
    const current = byKey.get(key)
    if (current == null) {
      return
    }
    current.delete(listener)
    if (current.size === 0) {
      byKey.delete(key)
    }
  }
}

export function notifySameDocument(
  storage: object,
  key: string,
  notification: SameDocumentNotification,
  except?: SameDocumentListener,
): void {
  const listeners = registries.get(storage)?.get(key)
  if (listeners == null) {
    return
  }
  for (const listener of [...listeners]) {
    if (listener === except) {
      continue
    }
    try {
      listener(notification)
    } catch {
      // Contain subscriber exceptions so one listener cannot break fan-out.
    }
  }
}
