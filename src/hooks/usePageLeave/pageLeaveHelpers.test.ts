import { describe, expect, it } from 'vitest'

import {
  isEventTargetLike,
  isQualifyingPageLeave,
  resolveEffectiveWindow,
} from './pageLeaveHelpers'

describe('pageLeaveHelpers', () => {
  it('resolves omitted, explicit, and null windows', () => {
    expect(resolveEffectiveWindow(null)).toBeNull()
    expect(resolveEffectiveWindow(window)).toBe(window)
    expect(resolveEffectiveWindow(undefined)).toBe(window)
  })

  it('detects EventTarget-like objects by capability', () => {
    expect(isEventTargetLike(window)).toBe(true)
    expect(isEventTargetLike(document)).toBe(true)
    expect(isEventTargetLike(null)).toBe(false)
    expect(isEventTargetLike({})).toBe(false)
    expect(
      isEventTargetLike({
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    ).toBe(true)
  })

  it('treats mouseout as leave only when relatedTarget is nullish', () => {
    const leave = new MouseEvent('mouseout', {
      bubbles: true,
      relatedTarget: null,
    })
    expect(isQualifyingPageLeave(leave)).toBe(true)

    const internal = new MouseEvent('mouseout', {
      bubbles: true,
      relatedTarget: document.body,
    })
    expect(isQualifyingPageLeave(internal)).toBe(false)

    const bare = new Event('mouseout')
    expect(isQualifyingPageLeave(bare)).toBe(true)
  })
})
