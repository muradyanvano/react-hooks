export type TimerId = ReturnType<typeof setTimeout>

const DEFAULT_HOVER_DELAY = 0

export function normalizeHoverDelay(delay: number | undefined): number {
  const raw = delay ?? DEFAULT_HOVER_DELAY

  if (!Number.isFinite(raw) || raw < 0) {
    return 0
  }

  return raw
}

export function getTimerHost(element: Element | null): Window | null {
  if (element == null) {
    return null
  }

  return element.ownerDocument.defaultView ?? null
}

export function getTimerFunctions(defaultView: Window | null): {
  setTimer: (handler: () => void, timeout: number) => TimerId
  clearTimer: (id: TimerId) => void
} {
  if (defaultView != null) {
    return {
      setTimer: (handler, timeout) =>
        defaultView.setTimeout(handler, timeout) as unknown as TimerId,
      clearTimer: (id) => {
        defaultView.clearTimeout(id as unknown as number)
      },
    }
  }

  return {
    setTimer: (handler, timeout) => setTimeout(handler, timeout),
    clearTimer: (id) => {
      clearTimeout(id)
    },
  }
}

const ELEMENT_NODE = 1
const DOCUMENT_FRAGMENT_NODE = 11

export function isRemovalOfTarget(removed: Node, target: Element): boolean {
  if (removed === target) {
    return true
  }

  if (
    removed.nodeType === ELEMENT_NODE ||
    removed.nodeType === DOCUMENT_FRAGMENT_NODE
  ) {
    return (removed as Element | DocumentFragment).contains(target)
  }

  return false
}

export function recordsIncludeTargetRemoval(
  records: ReadonlyArray<MutationRecord>,
  target: Element,
): boolean {
  for (const record of records) {
    for (const removed of record.removedNodes) {
      if (isRemovalOfTarget(removed, target)) {
        return true
      }
    }
  }

  return false
}
