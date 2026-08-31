const DEFAULT_LONG_PRESS_DELAY = 500
const DEFAULT_DISTANCE_THRESHOLD = 10

type DelayInput = number | ((event: PointerEvent) => number) | undefined

export function normalizeDelay(delay: DelayInput, event: PointerEvent): number {
  let raw: number

  if (delay === undefined) {
    raw = DEFAULT_LONG_PRESS_DELAY
  } else if (typeof delay === 'function') {
    raw = delay(event)
  } else {
    raw = delay
  }

  if (!Number.isFinite(raw)) {
    return DEFAULT_LONG_PRESS_DELAY
  }

  if (raw < 0) {
    return 0
  }

  return raw
}

export function normalizeDistanceThreshold(
  threshold: number | false | undefined,
): number | false {
  if (threshold === false) {
    return false
  }

  if (threshold === undefined) {
    return DEFAULT_DISTANCE_THRESHOLD
  }

  if (!Number.isFinite(threshold)) {
    return DEFAULT_DISTANCE_THRESHOLD
  }

  if (threshold < 0) {
    return 0
  }

  return threshold
}

export function updateMaxDistance(
  maxDistance: number,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): number {
  const distance = Math.hypot(currentX - startX, currentY - startY)
  return distance > maxDistance ? distance : maxDistance
}
