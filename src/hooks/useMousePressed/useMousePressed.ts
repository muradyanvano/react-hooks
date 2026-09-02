import { useEffect, useRef, useState, type RefObject } from 'react'

import type { UseMouseSourceType } from '../useMouse/useMouse'

import {
  classifyPressSource,
  hasRemainingTouches,
  isDragEventLike,
  isEventTargetLike,
  isMouseEventLike,
  isTargetRefObject,
  isTouchEventLike,
  isUseMousePressedTarget,
  pressedStatesEqual,
  resolveDefaultWindow,
  resolveOwningWindow,
  type ActivePressSource,
  type PressedState,
  type UseMousePressedEvent,
  type UseMousePressedHandler,
  type UseMousePressedTarget,
} from './mousePressedHelpers'

export type {
  UseMousePressedEvent,
  UseMousePressedHandler,
  UseMousePressedTarget,
} from './mousePressedHelpers'

export interface UseMousePressedOptions {
  enabled?: boolean
  touch?: boolean
  drag?: boolean
  capture?: boolean
  initialValue?: boolean
  target?:
    UseMousePressedTarget | RefObject<UseMousePressedTarget | null> | null
  onPressed?: UseMousePressedHandler
  onReleased?: UseMousePressedHandler
}

export interface UseMousePressedReturn {
  pressed: boolean
  sourceType: UseMouseSourceType
}

const DEFAULT_ENABLED = true
const DEFAULT_TOUCH = true
const DEFAULT_DRAG = true
const DEFAULT_CAPTURE = false
const DEFAULT_INITIAL_VALUE = false

type ReleaseListener = {
  type: string
  handler: EventListener
}

type ReleaseAttachment = {
  window: Window
  generation: number
  capture: boolean
  listeners: ReleaseListener[]
}

/**
 * Tracks whether a mouse, touch, or drag press lifecycle is active on a target.
 *
 * Press-start listeners attach to the target. Release listeners attach to the
 * owning window only while a lifecycle is active. Omitted `target` resolves to
 * `window` inside an effect. Explicit `target: null` registers nothing.
 */
export function useMousePressed(
  options?: UseMousePressedOptions,
): UseMousePressedReturn {
  const enabled = options?.enabled ?? DEFAULT_ENABLED
  const touch = options?.touch ?? DEFAULT_TOUCH
  const drag = options?.drag ?? DEFAULT_DRAG
  const capture = options?.capture ?? DEFAULT_CAPTURE
  const targetOption = options?.target

  const [state, setState] = useState<PressedState>(() => ({
    pressed: options?.initialValue ?? DEFAULT_INITIAL_VALUE,
    sourceType: null,
  }))

  const mountedRef = useRef(true)
  const lifecycleGenerationRef = useRef(0)
  const stateRef = useRef(state)
  const activeSourceRef = useRef<ActivePressSource | null>(null)
  const dragReleaseAttachedRef = useRef(false)
  const releaseAttachmentRef = useRef<ReleaseAttachment | null>(null)
  const attachedTargetRef = useRef<UseMousePressedTarget | null>(null)
  const attachedRegistrationRef = useRef({
    touch,
    drag,
    capture,
  })

  const latestRef = useRef({
    touch,
    drag,
    onPressed: options?.onPressed,
    onReleased: options?.onReleased,
  })

  useEffect(() => {
    latestRef.current = {
      touch,
      drag,
      onPressed: options?.onPressed,
      onReleased: options?.onReleased,
    }
  })

  useEffect(() => {
    stateRef.current = state
  })

  const targetRef =
    targetOption != null &&
    typeof targetOption === 'object' &&
    isTargetRefObject(targetOption)
      ? targetOption
      : null

  const [refTarget, setRefTarget] = useState<UseMousePressedTarget | null>(null)

  /* eslint-disable react-hooks/exhaustive-deps -- re-run after every commit; Object.is guards loops */
  useEffect(() => {
    if (targetRef == null) {
      return
    }

    const current = targetRef.current
    const next = isUseMousePressedTarget(current) ? current : null
    setRefTarget((previous) => (Object.is(previous, next) ? previous : next))
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
    const listenerOptions: AddEventListenerOptions = {
      capture,
      passive: true,
    }

    const detachReleaseListeners = () => {
      const attachment = releaseAttachmentRef.current
      if (attachment == null) {
        return
      }

      for (const listener of attachment.listeners) {
        attachment.window.removeEventListener(listener.type, listener.handler, {
          capture: attachment.capture,
        })
      }

      releaseAttachmentRef.current = null
      dragReleaseAttachedRef.current = false
    }

    const commitState = (next: PressedState) => {
      if (!mountedRef.current) {
        return
      }

      if (pressedStatesEqual(stateRef.current, next)) {
        return
      }

      stateRef.current = next
      setState(next)
    }

    const adminReset = () => {
      detachReleaseListeners()
      activeSourceRef.current = null
      commitState({ pressed: false, sourceType: null })
    }

    const attachReleaseListeners = (
      owningWindow: Window,
      generation: number,
      source: ActivePressSource,
      includeDragRelease: boolean,
    ) => {
      if (releaseAttachmentRef.current?.window === owningWindow) {
        if (includeDragRelease && !dragReleaseAttachedRef.current) {
          const onDragEnd = (event: Event) => {
            handleRelease(event as UseMousePressedEvent, generation)
          }
          owningWindow.addEventListener('dragend', onDragEnd, listenerOptions)
          owningWindow.addEventListener('drop', onDragEnd, listenerOptions)
          releaseAttachmentRef.current.listeners.push(
            { type: 'dragend', handler: onDragEnd },
            { type: 'drop', handler: onDragEnd },
          )
          dragReleaseAttachedRef.current = true
        }
        return
      }

      detachReleaseListeners()

      const listeners: ReleaseListener[] = []

      const onMouseRelease = (event: Event) => {
        handleRelease(event as UseMousePressedEvent, generation)
      }

      const onTouchRelease = (event: Event) => {
        handleRelease(event as UseMousePressedEvent, generation)
      }

      if (source === 'mouse') {
        owningWindow.addEventListener(
          'mouseup',
          onMouseRelease,
          listenerOptions,
        )
        owningWindow.addEventListener(
          'mouseleave',
          onMouseRelease,
          listenerOptions,
        )
        listeners.push(
          { type: 'mouseup', handler: onMouseRelease },
          { type: 'mouseleave', handler: onMouseRelease },
        )

        if (includeDragRelease) {
          owningWindow.addEventListener(
            'dragend',
            onMouseRelease,
            listenerOptions,
          )
          owningWindow.addEventListener('drop', onMouseRelease, listenerOptions)
          listeners.push(
            { type: 'dragend', handler: onMouseRelease },
            { type: 'drop', handler: onMouseRelease },
          )
          dragReleaseAttachedRef.current = true
        }
      } else {
        owningWindow.addEventListener(
          'touchend',
          onTouchRelease,
          listenerOptions,
        )
        owningWindow.addEventListener(
          'touchcancel',
          onTouchRelease,
          listenerOptions,
        )
        listeners.push(
          { type: 'touchend', handler: onTouchRelease },
          { type: 'touchcancel', handler: onTouchRelease },
        )
      }

      releaseAttachmentRef.current = {
        window: owningWindow,
        generation,
        capture,
        listeners,
      }
    }

    const handleRelease = (event: UseMousePressedEvent, generation: number) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current ||
        !stateRef.current.pressed
      ) {
        return
      }

      if (isTouchEventLike(event) && hasRemainingTouches(event)) {
        return
      }

      detachReleaseListeners()
      activeSourceRef.current = null

      commitState({ pressed: false, sourceType: null })

      try {
        latestRef.current.onReleased?.(event)
      } catch {
        // State and cleanup already applied; do not swallow by rethrowing into React.
      }
    }

    const handlePress = (
      event: UseMousePressedEvent,
      generation: number,
      owningWindow: Window | null,
    ) => {
      if (
        !mountedRef.current ||
        generation !== lifecycleGenerationRef.current ||
        stateRef.current.pressed
      ) {
        if (
          stateRef.current.pressed &&
          isDragEventLike(event) &&
          event.type === 'dragstart' &&
          owningWindow != null &&
          latestRef.current.drag
        ) {
          attachReleaseListeners(
            owningWindow,
            generation,
            activeSourceRef.current ?? 'mouse',
            true,
          )
        }
        return
      }

      const source = classifyPressSource(event)
      activeSourceRef.current = source

      commitState({ pressed: true, sourceType: source })

      if (owningWindow != null) {
        attachReleaseListeners(
          owningWindow,
          generation,
          source,
          source === 'mouse' && isDragEventLike(event),
        )
      }

      try {
        latestRef.current.onPressed?.(event)
      } catch {
        // State already committed; release listeners remain attached until release.
      }
    }

    if (!enabled) {
      lifecycleGenerationRef.current += 1
      adminReset()
      attachedTargetRef.current = null
      return
    }

    let resolved: UseMousePressedTarget | null = null

    if (targetOption === undefined) {
      resolved = resolveDefaultWindow()
    } else if (targetOption === null) {
      resolved = null
    } else if (isUseMousePressedTarget(targetOption)) {
      resolved = targetOption
    } else if (targetRef != null) {
      resolved = refTarget
    }

    const generation = lifecycleGenerationRef.current

    if (!isEventTargetLike(resolved) || !isUseMousePressedTarget(resolved)) {
      adminReset()
      attachedTargetRef.current = null
      return
    }

    const target = resolved
    const previousTarget = attachedTargetRef.current
    const previousRegistration = attachedRegistrationRef.current
    const targetChanged =
      previousTarget != null && !Object.is(previousTarget, target)
    const registrationChanged =
      previousTarget != null &&
      (previousRegistration.touch !== touch ||
        previousRegistration.drag !== drag ||
        previousRegistration.capture !== capture)

    if (targetChanged || registrationChanged) {
      adminReset()
    }

    attachedTargetRef.current = target
    attachedRegistrationRef.current = { touch, drag, capture }
    const owningWindow = resolveOwningWindow(target)

    const onMouseDown = (event: Event) => {
      if (!isMouseEventLike(event)) {
        return
      }

      handlePress(event, generation, owningWindow)
    }

    const onTouchStart = (event: Event) => {
      if (!latestRef.current.touch || !isTouchEventLike(event)) {
        return
      }

      handlePress(event, generation, owningWindow)
    }

    const onDragStart = (event: Event) => {
      if (!latestRef.current.drag || !isDragEventLike(event)) {
        return
      }

      handlePress(event, generation, owningWindow)
    }

    target.addEventListener('mousedown', onMouseDown, listenerOptions)

    if (touch) {
      target.addEventListener('touchstart', onTouchStart, listenerOptions)
    }

    if (drag) {
      target.addEventListener('dragstart', onDragStart, listenerOptions)
    }

    return () => {
      lifecycleGenerationRef.current += 1
      target.removeEventListener('mousedown', onMouseDown, listenerOptions)

      if (touch) {
        target.removeEventListener('touchstart', onTouchStart, listenerOptions)
      }

      if (drag) {
        target.removeEventListener('dragstart', onDragStart, listenerOptions)
      }

      detachReleaseListeners()
      activeSourceRef.current = null
    }
  }, [enabled, touch, drag, capture, targetOption, targetRef, refTarget])

  return state
}
