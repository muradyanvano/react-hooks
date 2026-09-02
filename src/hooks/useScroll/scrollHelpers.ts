export type UseScrollTarget = HTMLElement | SVGElement | Window | Document

export type RtlScrollMode = 'ltr' | 'negative' | 'reverse'

export interface NormalizedOffset {
  left: number
  right: number
  top: number
  bottom: number
}

export interface ScrollMetrics {
  x: number
  y: number
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
}

export interface UseScrollArrivedState {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

export interface UseScrollDirections {
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

export interface ScrollState {
  x: number
  y: number
  isScrolling: boolean
  arrivedState: UseScrollArrivedState
  directions: UseScrollDirections
}

export interface NormalizedListenerOptions {
  capture: boolean
  passive: boolean
  once?: boolean | undefined
  signal?: AbortSignal | undefined
}

export interface NormalizedObserveOptions {
  mutation: boolean
}

export const ARRIVED_THRESHOLD = 1

export const IDLE_SCROLL_STATE: ScrollState = {
  x: 0,
  y: 0,
  isScrolling: false,
  arrivedState: {
    left: true,
    right: false,
    top: true,
    bottom: false,
  },
  directions: {
    left: false,
    right: false,
    top: false,
    bottom: false,
  },
}

export const RESET_DIRECTIONS: UseScrollDirections = {
  left: false,
  right: false,
  top: false,
  bottom: false,
}

export function isBrowserEnvironment(): boolean {
  return typeof document !== 'undefined'
}

export function normalizeNonNegativeNumber(
  value: number | undefined,
  fallback = 0,
): number {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return fallback
  }

  return value
}

export function normalizeThrottle(value: number | undefined): number {
  return normalizeNonNegativeNumber(value, 0)
}

export function normalizeIdle(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return 200
  }

  return value
}

export function normalizeOffset(
  offset: Partial<NormalizedOffset> | undefined,
): NormalizedOffset {
  return {
    left: normalizeNonNegativeNumber(offset?.left, 0),
    right: normalizeNonNegativeNumber(offset?.right, 0),
    top: normalizeNonNegativeNumber(offset?.top, 0),
    bottom: normalizeNonNegativeNumber(offset?.bottom, 0),
  }
}

export function normalizePositionNumber(
  value: number | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null
  }

  return normalizeNegativeZero(value)
}

export function normalizeNegativeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

export function normalizeScrollBehavior(
  value: ScrollBehavior | undefined,
): ScrollBehavior {
  if (value === 'smooth' || value === 'auto') {
    return value
  }

  if (value === 'instant') {
    return value
  }

  return 'auto'
}

export function normalizeListenerOptions(
  value: boolean | AddEventListenerOptions | undefined,
): NormalizedListenerOptions {
  if (value === true) {
    return { capture: true, passive: true }
  }

  if (value === false) {
    return { capture: false, passive: true }
  }

  if (value == null) {
    return { capture: false, passive: true }
  }

  return {
    capture: value.capture ?? false,
    passive: value.passive ?? true,
    once: value.once,
    signal: value.signal,
  }
}

export function toAddEventListenerOptions(
  options: NormalizedListenerOptions,
): AddEventListenerOptions {
  const native: AddEventListenerOptions = {
    capture: options.capture,
    passive: options.passive,
  }

  if (options.once != null) {
    native.once = options.once
  }

  if (options.signal != null) {
    native.signal = options.signal
  }

  return native
}

export function listenerOptionsEqual(
  left: NormalizedListenerOptions,
  right: NormalizedListenerOptions,
): boolean {
  return (
    left.capture === right.capture &&
    left.passive === right.passive &&
    left.once === right.once &&
    left.signal === right.signal
  )
}

export function normalizeObserveOptions(
  value: boolean | { mutation?: boolean } | undefined,
): NormalizedObserveOptions {
  if (value === true) {
    return { mutation: true }
  }

  if (value === false || value == null) {
    return { mutation: false }
  }

  return { mutation: value.mutation === true }
}

export function isWindowTarget(target: UseScrollTarget): target is Window {
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

export function isDocumentTarget(target: UseScrollTarget): target is Document {
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

export function isScrollableElementTarget(
  target: UseScrollTarget,
): target is HTMLElement | SVGElement {
  return !isWindowTarget(target) && !isDocumentTarget(target)
}

export function resolveOwningDocument(
  target: UseScrollTarget,
): Document | null {
  if (isDocumentTarget(target)) {
    return target
  }

  if (isWindowTarget(target)) {
    return target.document
  }

  return target.ownerDocument
}

export function resolveOwningWindow(target: UseScrollTarget): Window | null {
  if (isWindowTarget(target)) {
    return target
  }

  if (isDocumentTarget(target)) {
    return target.defaultView
  }

  return target.ownerDocument?.defaultView ?? null
}

export function resolveListenerTarget(target: UseScrollTarget): EventTarget {
  if (isWindowTarget(target) || isDocumentTarget(target)) {
    return target
  }

  return target
}

export function resolveScrollElement(
  target: UseScrollTarget,
): Pick<
  HTMLElement | SVGElement,
  | 'scrollLeft'
  | 'scrollTop'
  | 'scrollWidth'
  | 'scrollHeight'
  | 'clientWidth'
  | 'clientHeight'
> | null {
  if (isScrollableElementTarget(target)) {
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

export function resolveMutationObserveTarget(
  target: UseScrollTarget,
): Element | null {
  if (isScrollableElementTarget(target)) {
    return target
  }

  const scrollElement = resolveScrollElement(target)
  return scrollElement as Element | null
}

export function readWindowScrollPosition(target: Window | Document): {
  x: number
  y: number
} {
  const owningWindow = isWindowTarget(target) ? target : target.defaultView

  if (owningWindow == null) {
    return { x: 0, y: 0 }
  }

  const x =
    owningWindow.scrollX ??
    owningWindow.pageXOffset ??
    resolveScrollElement(target)?.scrollLeft ??
    0
  const y =
    owningWindow.scrollY ??
    owningWindow.pageYOffset ??
    resolveScrollElement(target)?.scrollTop ??
    0

  return {
    x: normalizeScrollMetric(x),
    y: normalizeScrollMetric(y),
  }
}

export function normalizeScrollMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return normalizeNegativeZero(value)
}

export function readScrollMetrics(
  target: UseScrollTarget,
): ScrollMetrics | null {
  if (isWindowTarget(target) || isDocumentTarget(target)) {
    const element = resolveScrollElement(target)
    if (element == null) {
      return null
    }

    const position = readWindowScrollPosition(target)
    return {
      x: position.x,
      y: position.y,
      scrollWidth: normalizeScrollMetric(element.scrollWidth),
      scrollHeight: normalizeScrollMetric(element.scrollHeight),
      clientWidth: normalizeScrollMetric(element.clientWidth),
      clientHeight: normalizeScrollMetric(element.clientHeight),
    }
  }

  return {
    x: normalizeScrollMetric(target.scrollLeft),
    y: normalizeScrollMetric(target.scrollTop),
    scrollWidth: normalizeScrollMetric(target.scrollWidth),
    scrollHeight: normalizeScrollMetric(target.scrollHeight),
    clientWidth: normalizeScrollMetric(target.clientWidth),
    clientHeight: normalizeScrollMetric(target.clientHeight),
  }
}

export function resolveComputedDirection(
  target: UseScrollTarget,
): 'ltr' | 'rtl' {
  try {
    const element = isScrollableElementTarget(target)
      ? target
      : resolveScrollElement(target)

    const owningWindow = resolveOwningWindow(target)
    if (element == null || owningWindow == null) {
      return 'ltr'
    }

    const direction = owningWindow.getComputedStyle(
      element as Element,
    ).direction
    return direction === 'rtl' ? 'rtl' : 'ltr'
  } catch {
    return 'ltr'
  }
}

export function resolveRtlScrollMode(
  target: UseScrollTarget,
  metrics: ScrollMetrics,
): RtlScrollMode {
  if (resolveComputedDirection(target) !== 'rtl') {
    return 'ltr'
  }

  const maxScrollX = metrics.scrollWidth - metrics.clientWidth
  if (maxScrollX <= ARRIVED_THRESHOLD) {
    return 'ltr'
  }

  if (metrics.x <= 0) {
    return 'negative'
  }

  return 'reverse'
}

export function computeArrivedState(
  metrics: ScrollMetrics,
  offset: NormalizedOffset,
  rtlMode: RtlScrollMode,
): UseScrollArrivedState {
  const maxScrollX = metrics.scrollWidth - metrics.clientWidth
  const maxScrollY = metrics.scrollHeight - metrics.clientHeight
  const scrollableX = maxScrollX > ARRIVED_THRESHOLD
  const scrollableY = maxScrollY > ARRIVED_THRESHOLD

  const top =
    metrics.y <= offset.top + ARRIVED_THRESHOLD ||
    (!scrollableY && metrics.y <= ARRIVED_THRESHOLD)

  const bottom =
    !scrollableY ||
    metrics.y + metrics.clientHeight >=
      metrics.scrollHeight - offset.bottom - ARRIVED_THRESHOLD ||
    metrics.y >= maxScrollY - ARRIVED_THRESHOLD

  let left: boolean
  let right: boolean

  if (!scrollableX) {
    left = true
    right = true
  } else if (rtlMode === 'negative') {
    right = metrics.x >= -offset.right - ARRIVED_THRESHOLD
    left =
      metrics.x <= -maxScrollX + offset.left + ARRIVED_THRESHOLD ||
      metrics.x <= -maxScrollX - ARRIVED_THRESHOLD
  } else if (rtlMode === 'reverse') {
    right = metrics.x <= offset.right + ARRIVED_THRESHOLD
    left =
      metrics.x + metrics.clientWidth >=
        metrics.scrollWidth - offset.left - ARRIVED_THRESHOLD ||
      metrics.x >= maxScrollX - ARRIVED_THRESHOLD
  } else {
    left =
      metrics.x <= offset.left + ARRIVED_THRESHOLD ||
      metrics.x <= ARRIVED_THRESHOLD
    right =
      metrics.x + metrics.clientWidth >=
        metrics.scrollWidth - offset.right - ARRIVED_THRESHOLD ||
      metrics.x >= maxScrollX - ARRIVED_THRESHOLD
  }

  return { left, right, top, bottom }
}

export function computeDirections(
  previousX: number,
  previousY: number,
  nextX: number,
  nextY: number,
): UseScrollDirections {
  if (Object.is(previousX, nextX) && Object.is(previousY, nextY)) {
    return RESET_DIRECTIONS
  }

  return {
    left: nextX < previousX,
    right: nextX > previousX,
    top: nextY < previousY,
    bottom: nextY > previousY,
  }
}

export function arrivedStatesEqual(
  left: UseScrollArrivedState,
  right: UseScrollArrivedState,
): boolean {
  return (
    left.left === right.left &&
    left.right === right.right &&
    left.top === right.top &&
    left.bottom === right.bottom
  )
}

export function directionsEqual(
  left: UseScrollDirections,
  right: UseScrollDirections,
): boolean {
  return (
    left.left === right.left &&
    left.right === right.right &&
    left.top === right.top &&
    left.bottom === right.bottom
  )
}

export function scrollStatesEqual(
  left: ScrollState,
  right: ScrollState,
): boolean {
  return (
    Object.is(left.x, right.x) &&
    Object.is(left.y, right.y) &&
    left.isScrolling === right.isScrolling &&
    arrivedStatesEqual(left.arrivedState, right.arrivedState) &&
    directionsEqual(left.directions, right.directions)
  )
}

export function buildScrollState(
  metrics: ScrollMetrics,
  offset: NormalizedOffset,
  rtlMode: RtlScrollMode,
  previous: Pick<ScrollState, 'x' | 'y'>,
  options: {
    isScrolling?: boolean
    resetDirections?: boolean
  } = {},
): ScrollState {
  const directions = options.resetDirections
    ? RESET_DIRECTIONS
    : computeDirections(previous.x, previous.y, metrics.x, metrics.y)

  return {
    x: metrics.x,
    y: metrics.y,
    isScrolling: options.isScrolling ?? false,
    arrivedState: computeArrivedState(metrics, offset, rtlMode),
    directions,
  }
}

export function resolveMutationObserverConstructor(
  targetWindow: Window | null,
): (typeof globalThis)['MutationObserver'] | null {
  const candidate = targetWindow as
    | (Window & {
        MutationObserver?: typeof MutationObserver
      })
    | null

  if (candidate != null && typeof candidate.MutationObserver === 'function') {
    return candidate.MutationObserver
  }

  if (typeof MutationObserver === 'function') {
    return MutationObserver
  }

  return null
}

export type ScheduledMeasureHandle =
  | { kind: 'raf'; window: Window; id: number }
  | { kind: 'timeout'; id: number }
  | { kind: 'microtask'; cancelled: boolean }

export function scheduleCoalescedMeasure(
  targetWindow: Window | null,
  callback: () => void,
): ScheduledMeasureHandle {
  if (typeof queueMicrotask === 'function') {
    const handle: ScheduledMeasureHandle = {
      kind: 'microtask',
      cancelled: false,
    }
    queueMicrotask(() => {
      if (!handle.cancelled) {
        callback()
      }
    })
    return handle
  }

  if (
    targetWindow != null &&
    typeof targetWindow.requestAnimationFrame === 'function'
  ) {
    const id = targetWindow.requestAnimationFrame(() => {
      callback()
    })
    return { kind: 'raf', window: targetWindow, id }
  }

  const id = setTimeout(callback, 0) as unknown as number
  return { kind: 'timeout', id }
}

export function cancelCoalescedMeasure(
  handle: ScheduledMeasureHandle | null,
): void {
  if (handle == null) {
    return
  }

  if (handle.kind === 'microtask') {
    handle.cancelled = true
    return
  }

  if (handle.kind === 'raf') {
    handle.window.cancelAnimationFrame(handle.id)
    return
  }

  clearTimeout(handle.id)
}

export function performScrollTo(
  target: UseScrollTarget,
  position: { x: number; y: number },
  behavior: ScrollBehavior,
): void {
  const nextX = normalizePositionNumber(position.x)
  const nextY = normalizePositionNumber(position.y)

  if (nextX == null && nextY == null) {
    return
  }

  if (isWindowTarget(target)) {
    target.scrollTo({
      left: nextX ?? target.scrollX,
      top: nextY ?? target.scrollY,
      behavior,
    })
    return
  }

  if (isDocumentTarget(target)) {
    const owningWindow = target.defaultView
    if (owningWindow == null) {
      return
    }

    const current = readWindowScrollPosition(target)
    owningWindow.scrollTo({
      left: nextX ?? current.x,
      top: nextY ?? current.y,
      behavior,
    })
    return
  }

  const current = readScrollMetrics(target)
  if (current == null) {
    return
  }

  const left = nextX ?? current.x
  const top = nextY ?? current.y

  if (typeof target.scrollTo === 'function') {
    target.scrollTo({ left, top, behavior })
    return
  }

  target.scrollLeft = left
  target.scrollTop = top
}

export function containPlatformError(
  onError: ((error: unknown) => void) | undefined,
  operation: () => void,
): void {
  try {
    operation()
  } catch (error) {
    if (onError == null) {
      return
    }

    try {
      onError(error)
    } catch {
      // Consumer onError failures must not break cleanup paths.
    }
  }
}
