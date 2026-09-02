export type UseParallaxSource = 'mouse' | 'deviceOrientation'

export type UseParallaxAdjuster = (value: number) => number

export type UseParallaxTarget = HTMLElement | SVGElement

export interface ParallaxState {
  roll: number
  tilt: number
  source: UseParallaxSource
}

export const IDLE_PARALLAX_STATE: ParallaxState = {
  roll: 0,
  tilt: 0,
  source: 'mouse',
}

export const IDENTITY_ADJUSTER: UseParallaxAdjuster = (value) => value

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

export function clampNumber(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

export function isParallaxTarget(value: unknown): value is UseParallaxTarget {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as {
    nodeType?: unknown
    getBoundingClientRect?: unknown
    ownerDocument?: unknown
    addEventListener?: unknown
    removeEventListener?: unknown
  }

  return (
    typeof candidate.nodeType === 'number' &&
    candidate.nodeType === 1 &&
    typeof candidate.getBoundingClientRect === 'function' &&
    typeof candidate.addEventListener === 'function' &&
    typeof candidate.removeEventListener === 'function'
  )
}

export function resolveOwningWindow(target: UseParallaxTarget): Window | null {
  const view = target.ownerDocument?.defaultView
  if (
    typeof view === 'object' &&
    view !== null &&
    typeof view.addEventListener === 'function' &&
    typeof view.removeEventListener === 'function'
  ) {
    return view
  }

  return null
}

export function normalizeScreenAngle(rawAngle: unknown): number {
  if (!isFiniteNumber(rawAngle)) {
    return 0
  }

  const normalized = ((Math.round(rawAngle) % 360) + 360) % 360
  if (
    normalized === 0 ||
    normalized === 90 ||
    normalized === 180 ||
    normalized === 270
  ) {
    return normalized
  }

  // Snap near-quarter turns (legacy noisy values) to nearest supported angle.
  const candidates = [0, 90, 180, 270]
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const distance = Math.min(
      Math.abs(normalized - candidate),
      360 - Math.abs(normalized - candidate),
    )
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}

export function resolveScreenAngle(owningWindow: Window): number {
  const modern = (
    owningWindow as Window & {
      screen?: { orientation?: { angle?: unknown } }
    }
  ).screen?.orientation?.angle

  if (isFiniteNumber(modern)) {
    return normalizeScreenAngle(modern)
  }

  const legacy = (owningWindow as Window & { orientation?: unknown })
    .orientation
  if (isFiniteNumber(legacy)) {
    return normalizeScreenAngle(legacy)
  }

  return 0
}

/**
 * Rotate sensor axes so roll/tilt match the visual screen after clockwise
 * screen rotation. Input axes are already normalized to approximately
 * `-0.5…0.5` before rotation.
 */
export function rotateSensorVector(
  horizontal: number,
  vertical: number,
  screenAngle: number,
): { roll: number; tilt: number } {
  switch (normalizeScreenAngle(screenAngle)) {
    case 90:
      return {
        roll: normalizeZero(-vertical),
        tilt: normalizeZero(horizontal),
      }
    case 180:
      return {
        roll: normalizeZero(-horizontal),
        tilt: normalizeZero(-vertical),
      }
    case 270:
      return {
        roll: normalizeZero(vertical),
        tilt: normalizeZero(-horizontal),
      }
    default:
      return {
        roll: normalizeZero(horizontal),
        tilt: normalizeZero(vertical),
      }
  }
}

export function normalizeMouseAxes(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { roll: number; tilt: number } | null {
  if (
    !isFiniteNumber(clientX) ||
    !isFiniteNumber(clientY) ||
    !isFiniteNumber(rect.width) ||
    !isFiniteNumber(rect.height) ||
    rect.width === 0 ||
    rect.height === 0
  ) {
    return null
  }

  return {
    roll: normalizeZero((clientX - rect.left) / rect.width - 0.5),
    tilt: normalizeZero((clientY - rect.top) / rect.height - 0.5),
  }
}

export function normalizeOrientationAxes(
  beta: unknown,
  gamma: unknown,
): { horizontal: number; vertical: number } | null {
  if (!isFiniteNumber(beta) || !isFiniteNumber(gamma)) {
    return null
  }

  return {
    horizontal: normalizeZero(clampNumber(gamma, -90, 90) / 180),
    vertical: normalizeZero(clampNumber(beta, -90, 90) / 180),
  }
}

export function applyAdjusters(
  roll: number,
  tilt: number,
  rollAdjust: UseParallaxAdjuster,
  tiltAdjust: UseParallaxAdjuster,
  clamp: boolean,
): { roll: number; tilt: number } | null {
  let adjustedRoll: number
  let adjustedTilt: number

  try {
    adjustedRoll = rollAdjust(roll)
    adjustedTilt = tiltAdjust(tilt)
  } catch {
    return null
  }

  if (!isFiniteNumber(adjustedRoll) || !isFiniteNumber(adjustedTilt)) {
    return null
  }

  if (clamp) {
    adjustedRoll = clampNumber(adjustedRoll, -0.5, 0.5)
    adjustedTilt = clampNumber(adjustedTilt, -0.5, 0.5)
  }

  return {
    roll: normalizeZero(adjustedRoll),
    tilt: normalizeZero(adjustedTilt),
  }
}

export function parallaxStatesEqual(
  left: ParallaxState,
  right: ParallaxState,
): boolean {
  return (
    Object.is(left.roll, right.roll) &&
    Object.is(left.tilt, right.tilt) &&
    Object.is(left.source, right.source)
  )
}
