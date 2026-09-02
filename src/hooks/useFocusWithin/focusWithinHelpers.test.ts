import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  classifyRelatedTarget,
  isTargetFocusWithin,
  scheduleMicrotask,
} from './focusWithinHelpers'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('focusWithinHelpers', () => {
  it('detects direct and descendant focus via ownerDocument.activeElement', () => {
    const container = document.createElement('div')
    const input = document.createElement('input')
    container.appendChild(input)
    document.body.appendChild(container)

    input.focus()
    expect(isTargetFocusWithin(container)).toBe(true)

    container.tabIndex = 0
    container.focus()
    expect(isTargetFocusWithin(container)).toBe(true)

    container.remove()
  })

  it('returns false when activeElement is null or contains is unavailable', () => {
    const container = document.createElement('div')
    const input = document.createElement('input')
    container.appendChild(input)
    document.body.appendChild(container)
    input.focus()

    const nullActive = {
      ownerDocument: { activeElement: null },
      contains: container.contains.bind(container),
    } as unknown as Element
    expect(isTargetFocusWithin(nullActive)).toBe(false)

    const missingContains = {
      ownerDocument: { activeElement: input },
    } as unknown as Element
    expect(isTargetFocusWithin(missingContains)).toBe(false)

    const throwingContains = {
      ownerDocument: { activeElement: input },
      contains: () => {
        throw new Error('cross-realm')
      },
    } as unknown as Element
    expect(isTargetFocusWithin(throwingContains)).toBe(false)

    container.remove()
  })

  it('classifies related targets without throwing for non-node targets', () => {
    const container = document.createElement('div')
    const child = document.createElement('input')
    const text = document.createTextNode('label')
    container.appendChild(child)
    container.appendChild(text)

    expect(classifyRelatedTarget(container, child)).toBe('inside')
    expect(classifyRelatedTarget(container, container)).toBe('inside')
    expect(classifyRelatedTarget(container, text)).toBe('inside')
    expect(classifyRelatedTarget(container, document)).toBe('outside')
    expect(classifyRelatedTarget(container, null)).toBe('unknown')
    expect(classifyRelatedTarget(container, window)).toBe('outside')
    expect(
      classifyRelatedTarget(container, {
        nodeType: 'x',
      } as unknown as EventTarget),
    ).toBe('outside')

    const missingContains = {} as Element
    expect(classifyRelatedTarget(missingContains, child)).toBe('unknown')

    const throwingContains = {
      contains: () => {
        throw new Error('cross-realm')
      },
    } as unknown as Element
    expect(classifyRelatedTarget(throwingContains, child)).toBe('unknown')
  })

  it('schedules microtasks through queueMicrotask when available', async () => {
    const callback = vi.fn()
    scheduleMicrotask(callback)
    expect(callback).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('falls back to Promise.resolve when queueMicrotask is unavailable', async () => {
    vi.stubGlobal('queueMicrotask', undefined)
    const callback = vi.fn()
    let rejected = false

    scheduleMicrotask(callback)
    scheduleMicrotask(() => {
      throw new Error('reconciliation failure')
    })

    const onUnhandled = () => {
      rejected = true
    }
    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('unhandledrejection', onUnhandled)
    }

    await Promise.resolve()
    await Promise.resolve()

    if (typeof globalThis.removeEventListener === 'function') {
      globalThis.removeEventListener('unhandledrejection', onUnhandled)
    }

    expect(callback).toHaveBeenCalledTimes(1)
    expect(rejected).toBe(false)
  })
})
