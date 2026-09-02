export type UseInfiniteScrollDirection = 'top' | 'right' | 'bottom' | 'left'

export type UseInfiniteScrollTarget = HTMLElement | Window | Document

export interface ScrollMetrics {
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
}

export function normalizeDistance(distance: number | undefined): number {
  if (distance == null || !Number.isFinite(distance) || distance < 0) {
    return 0
  }

  return distance
}

export function isBrowserEnvironment(): boolean {
  return typeof document !== 'undefined'
}

export function isWindowTarget(
  target: UseInfiniteScrollTarget,
): target is Window {
  const candidate = target as unknown as {
    addEventListener?: unknown
    document?: unknown
    window?: unknown
  }
  return (
    typeof candidate.addEventListener === 'function' &&
    typeof candidate.document === 'object' &&
    candidate.document != null &&
    candidate.window === target
  )
}

export function isDocumentTarget(
  target: UseInfiniteScrollTarget,
): target is Document {
  const candidate = target as unknown as {
    nodeType?: unknown
    defaultView?: unknown
  }
  return (
    typeof candidate.nodeType === 'number' &&
    candidate.nodeType === 9 &&
    'defaultView' in candidate
  )
}

export function resolveOwningDocument(
  target: UseInfiniteScrollTarget,
): Document | null {
  if (isDocumentTarget(target)) {
    return target
  }

  if (isWindowTarget(target)) {
    return target.document
  }

  return target.ownerDocument
}

export function resolveOwningWindow(
  target: UseInfiniteScrollTarget,
): Window | null {
  if (isWindowTarget(target)) {
    return target
  }

  if (isDocumentTarget(target)) {
    return target.defaultView
  }

  return target.ownerDocument?.defaultView ?? null
}

export function resolveListenerTarget(
  target: UseInfiniteScrollTarget,
): EventTarget {
  if (isWindowTarget(target) || isDocumentTarget(target)) {
    return target
  }

  return target
}

export function resolveScrollElement(
  target: UseInfiniteScrollTarget,
): Pick<
  HTMLElement,
  | 'scrollTop'
  | 'scrollLeft'
  | 'scrollHeight'
  | 'scrollWidth'
  | 'clientHeight'
  | 'clientWidth'
> | null {
  if (!isWindowTarget(target) && !isDocumentTarget(target)) {
    return target
  }

  const doc = resolveOwningDocument(target)
  if (doc == null) {
    return null
  }

  if (doc.scrollingElement != null) {
    return doc.scrollingElement as HTMLElement
  }

  return doc.documentElement ?? doc.body
}

export function readScrollMetrics(
  target: UseInfiniteScrollTarget,
): ScrollMetrics | null {
  const element = resolveScrollElement(target)
  if (element == null) {
    return null
  }

  return {
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
    clientWidth: element.clientWidth,
  }
}

export function getDistanceToEdge(
  metrics: ScrollMetrics,
  direction: UseInfiniteScrollDirection,
): number {
  switch (direction) {
    case 'top':
      return metrics.scrollTop
    case 'left':
      return metrics.scrollLeft
    case 'right':
      return metrics.scrollWidth - metrics.scrollLeft - metrics.clientWidth
    case 'bottom':
    default:
      return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight
  }
}

/** Treat negative remainders from overscroll as having reached the edge. */
export function isWithinDistance(
  distanceToEdge: number,
  threshold: number,
): boolean {
  const remaining = distanceToEdge < 0 ? 0 : distanceToEdge
  return remaining <= threshold
}

export function geometrySignature(
  metrics: ScrollMetrics,
  direction: UseInfiniteScrollDirection,
): string {
  if (direction === 'left' || direction === 'right') {
    return `${metrics.scrollWidth}:${metrics.clientWidth}`
  }

  return `${metrics.scrollHeight}:${metrics.clientHeight}`
}

export function normalizeLoadError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }

  if (typeof value === 'string') {
    return new Error(value)
  }

  return new Error('Infinite scroll load failed')
}

export type ScheduledFrameHandle =
  { kind: 'raf'; window: Window; id: number } | { kind: 'timeout'; id: number }

export function scheduleFrame(
  targetWindow: Window | null,
  callback: () => void,
): ScheduledFrameHandle | null {
  if (
    targetWindow != null &&
    typeof targetWindow.requestAnimationFrame === 'function'
  ) {
    const id = targetWindow.requestAnimationFrame(() => {
      callback()
    })
    return { kind: 'raf', window: targetWindow, id }
  }

  const timerHost =
    targetWindow != null && typeof targetWindow.setTimeout === 'function'
      ? targetWindow
      : typeof setTimeout === 'function'
        ? globalThis
        : null

  if (timerHost == null) {
    callback()
    return null
  }

  const id = Number(
    timerHost.setTimeout(() => {
      callback()
    }, 0),
  )
  return { kind: 'timeout', id }
}

export function cancelFrame(handle: ScheduledFrameHandle | null): void {
  if (handle == null) {
    return
  }

  if (handle.kind === 'raf') {
    if (typeof handle.window.cancelAnimationFrame === 'function') {
      handle.window.cancelAnimationFrame(handle.id)
    }
    return
  }

  if (typeof globalThis.clearTimeout === 'function') {
    globalThis.clearTimeout(handle.id)
  }
}

export function resolveResizeObserverConstructor(
  targetWindow: Window | null,
): (new (callback: ResizeObserverCallback) => ResizeObserver) | null {
  const fromWindow =
    targetWindow != null
      ? (targetWindow as unknown as { ResizeObserver?: typeof ResizeObserver })
          .ResizeObserver
      : undefined

  if (typeof fromWindow === 'function') {
    return fromWindow
  }

  if (typeof ResizeObserver === 'function') {
    return ResizeObserver
  }

  return null
}

export function resolveObservedElement(
  target: UseInfiniteScrollTarget,
): Element | null {
  if (!isWindowTarget(target) && !isDocumentTarget(target)) {
    return target
  }

  const doc = resolveOwningDocument(target)
  return doc?.documentElement ?? doc?.body ?? null
}
