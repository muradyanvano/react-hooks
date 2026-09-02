import { describe, expect, it, vi } from 'vitest'

import {
  callNativeFocus,
  isTargetDirectlyFocused,
  matchesFocusVisible,
} from './focusHelpers'

describe('focusHelpers', () => {
  it('reads activeElement from the target owning document', () => {
    const target = document.createElement('input')
    document.body.appendChild(target)
    target.focus()

    expect(isTargetDirectlyFocused(target, false)).toBe(true)

    target.remove()
  })

  it('returns false when matches is unavailable', () => {
    const target = document.createElement('input')
    Object.defineProperty(target, 'matches', {
      configurable: true,
      value: undefined,
    })

    expect(matchesFocusVisible(target)).toBe(false)
  })

  it('returns false when matches throws', () => {
    const target = document.createElement('input')
    vi.spyOn(target, 'matches').mockImplementation(() => {
      throw new Error('unexpected matcher failure')
    })

    expect(matchesFocusVisible(target)).toBe(false)
  })

  it('calls native focus with preventScroll options', () => {
    const target = document.createElement('input')
    const focusSpy = vi.spyOn(target, 'focus')

    callNativeFocus(target, true)
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('propagates genuine focus errors', () => {
    const target = document.createElement('input')
    vi.spyOn(target, 'focus').mockImplementation(() => {
      throw new Error('focus blocked')
    })

    expect(() => callNativeFocus(target, false)).toThrow('focus blocked')
  })
})
