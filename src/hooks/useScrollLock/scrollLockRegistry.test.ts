import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  acquireScrollLock,
  createScrollLockOwnerToken,
  getScrollLockOwnerCount,
  hasScrollLockOwners,
  ownerHoldsScrollLock,
  releaseScrollLock,
} from './scrollLockRegistry'

describe('scrollLockRegistry', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('acquires and releases a single owner with style restore', () => {
    const element = document.createElement('div')
    element.style.overflow = 'auto'
    element.style.overflowX = 'scroll'
    const owner = createScrollLockOwnerToken()

    expect(acquireScrollLock(element, owner)).toBe(true)
    expect(element.style.overflow).toBe('hidden')
    expect(getScrollLockOwnerCount(element)).toBe(1)
    expect(ownerHoldsScrollLock(element, owner)).toBe(true)

    releaseScrollLock(element, owner)
    expect(element.style.overflow).toBe('auto')
    expect(element.style.overflowX).toBe('scroll')
    expect(hasScrollLockOwners(element)).toBe(false)
  })

  it('keeps the lock until the final owner releases', () => {
    const element = document.createElement('div')
    element.style.setProperty('overflow', 'auto', 'important')
    const a = createScrollLockOwnerToken()
    const b = createScrollLockOwnerToken()

    expect(acquireScrollLock(element, a)).toBe(true)
    expect(acquireScrollLock(element, b)).toBe(true)
    expect(getScrollLockOwnerCount(element)).toBe(2)
    expect(element.style.overflow).toBe('hidden')

    releaseScrollLock(element, a)
    expect(element.style.overflow).toBe('hidden')
    expect(getScrollLockOwnerCount(element)).toBe(1)

    releaseScrollLock(element, b)
    expect(element.style.getPropertyValue('overflow')).toBe('auto')
    expect(element.style.getPropertyPriority('overflow')).toBe('important')
  })

  it('treats duplicate acquire from the same owner as idempotent', () => {
    const element = document.createElement('div')
    const owner = createScrollLockOwnerToken()

    expect(acquireScrollLock(element, owner)).toBe(true)
    expect(acquireScrollLock(element, owner)).toBe(true)
    expect(getScrollLockOwnerCount(element)).toBe(1)

    releaseScrollLock(element, owner)
    expect(hasScrollLockOwners(element)).toBe(false)
  })

  it('ignores unknown owner release', () => {
    const element = document.createElement('div')
    element.style.overflow = 'clip'
    const owner = createScrollLockOwnerToken()
    const stranger = createScrollLockOwnerToken()

    acquireScrollLock(element, owner)
    releaseScrollLock(element, stranger)
    expect(element.style.overflow).toBe('hidden')
    expect(getScrollLockOwnerCount(element)).toBe(1)

    releaseScrollLock(element, owner)
    expect(element.style.overflow).toBe('clip')
  })

  it('captures the original snapshot only on first acquire', () => {
    const element = document.createElement('div')
    element.style.overflow = 'scroll'
    const a = createScrollLockOwnerToken()
    const b = createScrollLockOwnerToken()

    acquireScrollLock(element, a)
    element.style.overflow = 'visible'
    acquireScrollLock(element, b)
    releaseScrollLock(element, a)
    releaseScrollLock(element, b)
    expect(element.style.overflow).toBe('scroll')
  })

  it('does not record ownership when applying overflow fails', () => {
    const element = document.createElement('div')
    vi.spyOn(element.style, 'setProperty').mockImplementation(() => {
      throw new Error('write failed')
    })
    const owner = createScrollLockOwnerToken()

    expect(acquireScrollLock(element, owner)).toBe(false)
    expect(hasScrollLockOwners(element)).toBe(false)
  })

  it('removes registry bookkeeping even when restore throws', () => {
    const element = document.createElement('div')
    const owner = createScrollLockOwnerToken()
    acquireScrollLock(element, owner)

    vi.spyOn(element.style, 'removeProperty').mockImplementation(() => {
      throw new Error('remove failed')
    })
    vi.spyOn(element.style, 'setProperty').mockImplementation(() => {
      throw new Error('set failed')
    })

    releaseScrollLock(element, owner)
    expect(hasScrollLockOwners(element)).toBe(false)
  })

  it('keeps independent elements independent', () => {
    const left = document.createElement('div')
    const right = document.createElement('div')
    left.style.overflow = 'auto'
    right.style.overflow = 'scroll'
    const a = createScrollLockOwnerToken()
    const b = createScrollLockOwnerToken()

    acquireScrollLock(left, a)
    acquireScrollLock(right, b)
    releaseScrollLock(left, a)
    expect(left.style.overflow).toBe('auto')
    expect(right.style.overflow).toBe('hidden')
    releaseScrollLock(right, b)
    expect(right.style.overflow).toBe('scroll')
  })
})
