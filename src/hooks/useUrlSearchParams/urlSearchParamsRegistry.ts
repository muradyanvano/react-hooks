import type { UseUrlSearchParamsMode } from './urlSearchParamsHelpers'

export type UrlSearchParamsListener = (notification: {
  writerId: symbol
  mode: UseUrlSearchParamsMode
}) => void

type ModeListeners = Map<UseUrlSearchParamsMode, Set<UrlSearchParamsListener>>

const registries = new WeakMap<object, ModeListeners>()

function getModeListeners(win: object): ModeListeners {
  let map = registries.get(win)
  if (map == null) {
    map = new Map()
    registries.set(win, map)
  }
  return map
}

export function subscribeUrlSearchParams(
  win: object,
  mode: UseUrlSearchParamsMode,
  listener: UrlSearchParamsListener,
): () => void {
  const byMode = getModeListeners(win)
  let listeners = byMode.get(mode)
  if (listeners == null) {
    listeners = new Set()
    byMode.set(mode, listeners)
  }
  listeners.add(listener)

  return () => {
    const current = byMode.get(mode)
    if (current == null) {
      return
    }
    current.delete(listener)
    if (current.size === 0) {
      byMode.delete(mode)
    }
    if (byMode.size === 0) {
      registries.delete(win)
    }
  }
}

export function notifyUrlSearchParams(
  win: object,
  mode: UseUrlSearchParamsMode,
  writerId: symbol,
  except?: UrlSearchParamsListener,
): void {
  const listeners = registries.get(win)?.get(mode)
  if (listeners == null) {
    return
  }
  const notification = { writerId, mode }
  for (const listener of [...listeners]) {
    if (listener === except) {
      continue
    }
    try {
      listener(notification)
    } catch {
      // Contain peer exceptions.
    }
  }
}
