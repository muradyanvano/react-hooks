export function isBrowserFocusEnvironment(): boolean {
  return typeof document !== 'undefined'
}

export function isTargetFocusWithin(target: Element): boolean {
  const { activeElement } = target.ownerDocument

  if (activeElement == null) {
    return false
  }

  if (activeElement === target) {
    return true
  }

  if (typeof target.contains !== 'function') {
    return false
  }

  try {
    return target.contains(activeElement)
  } catch {
    return false
  }
}

export type RelatedTargetClassification = 'inside' | 'outside' | 'unknown'

export function classifyRelatedTarget(
  container: Element,
  relatedTarget: EventTarget | null,
): RelatedTargetClassification {
  if (relatedTarget == null) {
    return 'unknown'
  }

  if (relatedTarget === container) {
    return 'inside'
  }

  const candidate = relatedTarget as Node

  if (typeof candidate.nodeType !== 'number') {
    return 'outside'
  }

  if (candidate.nodeType === 9) {
    return 'outside'
  }

  if (typeof container.contains !== 'function') {
    return 'unknown'
  }

  try {
    return container.contains(candidate) ? 'inside' : 'outside'
  } catch {
    return 'unknown'
  }
}

export function scheduleMicrotask(callback: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback)
    return
  }

  void Promise.resolve()
    .then(callback)
    .catch(() => {
      // Avoid unhandled rejections if reconciliation throws.
    })
}
