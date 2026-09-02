import { useEffect, useRef, useState, type RefObject } from 'react'

import {
  applyAdjusters,
  IDENTITY_ADJUSTER,
  IDLE_PARALLAX_STATE,
  isParallaxTarget,
  normalizeMouseAxes,
  normalizeOrientationAxes,
  parallaxStatesEqual,
  resolveOwningWindow,
  resolveScreenAngle,
  rotateSensorVector,
  type ParallaxState,
  type UseParallaxAdjuster,
  type UseParallaxSource,
  type UseParallaxTarget,
} from './parallaxHelpers'

export type {
  UseParallaxAdjuster,
  UseParallaxSource,
  UseParallaxTarget,
} from './parallaxHelpers'

export interface UseParallaxOptions {
  enabled?: boolean
  deviceOrientation?: boolean
  mouse?: boolean
  clamp?: boolean
  deviceOrientationTiltAdjust?: UseParallaxAdjuster
  deviceOrientationRollAdjust?: UseParallaxAdjuster
  mouseTiltAdjust?: UseParallaxAdjuster
  mouseRollAdjust?: UseParallaxAdjuster
}

export interface UseParallaxReturn {
  roll: number
  tilt: number
  source: UseParallaxSource
}

const DEFAULT_ENABLED = true
const DEFAULT_DEVICE_ORIENTATION = true
const DEFAULT_MOUSE = true
const DEFAULT_CLAMP = true

/**
 * Tracks normalized parallax roll/tilt for a target element from mouse
 * movement and optional device orientation.
 *
 * Mouse listeners attach to the target. Device-orientation listeners attach
 * to the target's owning window. The hook never requests sensor permission,
 * never writes CSS, and never measures at render time.
 */
export function useParallax<T extends UseParallaxTarget = HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseParallaxOptions,
): UseParallaxReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const deviceOrientation =
    options?.deviceOrientation ?? DEFAULT_DEVICE_ORIENTATION
  const mouse = options?.mouse ?? DEFAULT_MOUSE
  const clamp = options?.clamp ?? DEFAULT_CLAMP

  const [state, setState] = useState<ParallaxState>(IDLE_PARALLAX_STATE)
  const [observedElement, setObservedElement] = useState<T | null>(null)

  const mountedRef = useRef(true)
  const lifecycleGenerationRef = useRef(0)
  const stateRef = useRef(state)

  const latestRef = useRef({
    clamp,
    mouseTiltAdjust: options?.mouseTiltAdjust ?? IDENTITY_ADJUSTER,
    mouseRollAdjust: options?.mouseRollAdjust ?? IDENTITY_ADJUSTER,
    deviceOrientationTiltAdjust:
      options?.deviceOrientationTiltAdjust ?? IDENTITY_ADJUSTER,
    deviceOrientationRollAdjust:
      options?.deviceOrientationRollAdjust ?? IDENTITY_ADJUSTER,
  })

  useEffect(() => {
    latestRef.current = {
      clamp,
      mouseTiltAdjust: options?.mouseTiltAdjust ?? IDENTITY_ADJUSTER,
      mouseRollAdjust: options?.mouseRollAdjust ?? IDENTITY_ADJUSTER,
      deviceOrientationTiltAdjust:
        options?.deviceOrientationTiltAdjust ?? IDENTITY_ADJUSTER,
      deviceOrientationRollAdjust:
        options?.deviceOrientationRollAdjust ?? IDENTITY_ADJUSTER,
    }
  })

  useEffect(() => {
    stateRef.current = state
  })

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    const current = ref.current
    const next = isParallaxTarget(current) ? (current as T) : null
    setObservedElement((previous) =>
      Object.is(previous, next) ? previous : next,
    )
  })
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      lifecycleGenerationRef.current += 1
    }
  }, [])

  useEffect(() => {
    const generation = ++lifecycleGenerationRef.current
    const listenerOptions: AddEventListenerOptions = { passive: true }

    const commitState = (next: ParallaxState) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      if (parallaxStatesEqual(stateRef.current, next)) {
        return
      }

      stateRef.current = next
      setState(next)
    }

    const resetIdle = () => {
      commitState(IDLE_PARALLAX_STATE)
    }

    if (!enabled || observedElement == null) {
      resetIdle()
      return () => {
        if (generation === lifecycleGenerationRef.current) {
          lifecycleGenerationRef.current += 1
        }
      }
    }

    const target = observedElement
    const owningWindow = resolveOwningWindow(target)
    resetIdle()

    const onMouseMove = (event: Event) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current
      ) {
        return
      }

      const mouseEvent = event as MouseEvent
      if (
        typeof mouseEvent.clientX !== 'number' ||
        typeof mouseEvent.clientY !== 'number'
      ) {
        return
      }

      let rect: DOMRect
      try {
        rect = target.getBoundingClientRect()
      } catch {
        return
      }

      const normalized = normalizeMouseAxes(
        mouseEvent.clientX,
        mouseEvent.clientY,
        rect,
      )
      if (normalized == null) {
        return
      }

      const adjusted = applyAdjusters(
        normalized.roll,
        normalized.tilt,
        latestRef.current.mouseRollAdjust,
        latestRef.current.mouseTiltAdjust,
        latestRef.current.clamp,
      )
      if (adjusted == null) {
        return
      }

      commitState({
        roll: adjusted.roll,
        tilt: adjusted.tilt,
        source: 'mouse',
      })
    }

    const onDeviceOrientation = (event: Event) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current ||
        owningWindow == null
      ) {
        return
      }

      const orientation = event as DeviceOrientationEvent
      const axes = normalizeOrientationAxes(orientation.beta, orientation.gamma)
      if (axes == null) {
        return
      }

      const rotated = rotateSensorVector(
        axes.horizontal,
        axes.vertical,
        resolveScreenAngle(owningWindow),
      )

      const adjusted = applyAdjusters(
        rotated.roll,
        rotated.tilt,
        latestRef.current.deviceOrientationRollAdjust,
        latestRef.current.deviceOrientationTiltAdjust,
        latestRef.current.clamp,
      )
      if (adjusted == null) {
        return
      }

      commitState({
        roll: adjusted.roll,
        tilt: adjusted.tilt,
        source: 'deviceOrientation',
      })
    }

    if (mouse) {
      target.addEventListener('mousemove', onMouseMove, listenerOptions)
    }

    if (deviceOrientation && owningWindow != null) {
      owningWindow.addEventListener(
        'deviceorientation',
        onDeviceOrientation,
        listenerOptions,
      )
    }

    return () => {
      if (mouse) {
        target.removeEventListener('mousemove', onMouseMove, listenerOptions)
      }

      if (deviceOrientation && owningWindow != null) {
        owningWindow.removeEventListener(
          'deviceorientation',
          onDeviceOrientation,
          listenerOptions,
        )
      }

      if (generation === lifecycleGenerationRef.current) {
        lifecycleGenerationRef.current += 1
      }
    }
  }, [enabled, mouse, deviceOrientation, observedElement])

  return state
}
