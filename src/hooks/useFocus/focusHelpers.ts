export type FocusableTarget = HTMLElement | SVGElement

export function isBrowserFocusEnvironment(): boolean {
  return typeof document !== 'undefined'
}

export function isTargetDirectlyFocused(
  target: FocusableTarget,
  focusVisible: boolean,
): boolean {
  const { activeElement } = target.ownerDocument

  if (activeElement !== target) {
    return false
  }

  if (!focusVisible) {
    return true
  }

  return matchesFocusVisible(target)
}

export function matchesFocusVisible(target: FocusableTarget): boolean {
  if (typeof target.matches !== 'function') {
    return false
  }

  try {
    return target.matches(':focus-visible')
  } catch {
    return false
  }
}

export function callNativeFocus(
  target: FocusableTarget,
  preventScroll: boolean,
): void {
  target.focus({ preventScroll })
}
