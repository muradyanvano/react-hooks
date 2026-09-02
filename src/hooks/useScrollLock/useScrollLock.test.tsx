import { act, cleanup, render, renderHook } from '@testing-library/react'
import {
  createRef,
  StrictMode,
  useEffect,
  useRef,
  type ReactElement,
} from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveLockElement } from './scrollLockHelpers'
import { getScrollLockOwnerCount } from './scrollLockRegistry'
import { useScrollLock } from './useScrollLock'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Harness({
  initialLocked = false,
  target,
  onApi,
}: {
  initialLocked?: boolean
  target?: HTMLDivElement | null
  onApi?: (api: ReturnType<typeof useScrollLock>) => void
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null)
  const api = useScrollLock(ref, initialLocked)

  useEffect(() => {
    if (target !== undefined) {
      ref.current = target
    }
  })

  useEffect(() => {
    onApi?.(api)
  })

  return (
    <div
      ref={(node) => {
        ref.current = target ?? node
      }}
      data-testid="lock-target"
      data-locked={String(api.isLocked)}
      style={{ overflow: 'auto', height: 80, width: 80 }}
    >
      <div style={{ height: 200, width: 200 }}>content</div>
      <button type="button" data-testid="lock" onClick={api.lock}>
        Lock
      </button>
      <button type="button" data-testid="unlock" onClick={api.unlock}>
        Unlock
      </button>
      <button type="button" data-testid="toggle" onClick={api.toggle}>
        Toggle
      </button>
    </div>
  )
}

describe('useScrollLock', () => {
  describe('initial state', () => {
    it('defaults to unlocked', () => {
      const ref = createRef<HTMLDivElement>()
      const { result } = renderHook(() => useScrollLock(ref))
      expect(result.current.isLocked).toBe(false)
    })

    it('accepts initialLocked true', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const ref = { current: element }
      const { result } = renderHook(() => useScrollLock(ref, true))
      expect(result.current.isLocked).toBe(true)
      expect(element.style.overflow).toBe('hidden')
      element.remove()
    })

    it('ignores later initialLocked prop changes', () => {
      const ref = createRef<HTMLDivElement>()
      const { result, rerender } = renderHook(
        ({ initial }) => useScrollLock(ref, initial),
        { initialProps: { initial: false } },
      )
      expect(result.current.isLocked).toBe(false)
      rerender({ initial: true })
      expect(result.current.isLocked).toBe(false)
    })

    it('keeps stable method identities', () => {
      const ref = createRef<HTMLDivElement>()
      const { result, rerender } = renderHook(() => useScrollLock(ref))
      const { lock, unlock, toggle } = result.current
      rerender()
      expect(result.current.lock).toBe(lock)
      expect(result.current.unlock).toBe(unlock)
      expect(result.current.toggle).toBe(toggle)
    })
  })

  describe('element locking', () => {
    it('locks, restores absent overflow, and is idempotent', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const ref = { current: element }
      const { result } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
        result.current.lock()
      })
      expect(result.current.isLocked).toBe(true)
      expect(element.style.overflow).toBe('hidden')

      act(() => {
        result.current.unlock()
        result.current.unlock()
      })
      expect(result.current.isLocked).toBe(false)
      expect(element.style.getPropertyValue('overflow')).toBe('')

      element.remove()
    })

    it('restores auto, scroll, clip, and important priority', () => {
      for (const value of ['auto', 'scroll', 'clip'] as const) {
        const element = document.createElement('div')
        element.style.overflow = value
        document.body.append(element)
        const ref = { current: element }
        const { result, unmount } = renderHook(() => useScrollLock(ref))

        act(() => {
          result.current.lock()
        })
        act(() => {
          result.current.unlock()
        })
        expect(element.style.overflow).toBe(value)
        unmount()
        element.remove()
      }

      const important = document.createElement('div')
      important.style.setProperty('overflow', 'auto', 'important')
      document.body.append(important)
      const ref = { current: important }
      const { result, unmount } = renderHook(() => useScrollLock(ref))
      act(() => {
        result.current.lock()
      })
      act(() => {
        result.current.unlock()
      })
      expect(important.style.getPropertyValue('overflow')).toBe('auto')
      expect(important.style.getPropertyPriority('overflow')).toBe('important')
      unmount()
      important.remove()
    })

    it('preserves overflowX/Y after unlock and keeps unrelated styles and scroll position', () => {
      const element = document.createElement('div')
      element.style.overflow = 'auto'
      element.style.overflowX = 'scroll'
      element.style.overflowY = 'auto'
      element.style.color = 'rgb(1, 2, 3)'
      Object.defineProperties(element, {
        scrollTop: { configurable: true, writable: true, value: 40 },
        scrollLeft: { configurable: true, writable: true, value: 12 },
      })
      document.body.append(element)
      const ref = { current: element }
      const { result } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
      })
      expect(element.style.color).toBe('rgb(1, 2, 3)')
      expect(element.scrollTop).toBe(40)
      expect(element.scrollLeft).toBe(12)

      act(() => {
        result.current.unlock()
      })
      expect(element.scrollTop).toBe(40)
      expect(element.style.overflow).toBe('auto')
      expect(element.style.overflowX).toBe('scroll')
      expect(element.style.overflowY).toBe('auto')
      element.remove()
    })

    it('toggles requested state', () => {
      const element = document.createElement('div')
      document.body.append(element)
      const ref = { current: element }
      const { result } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.toggle()
      })
      expect(result.current.isLocked).toBe(true)
      act(() => {
        result.current.toggle()
      })
      expect(result.current.isLocked).toBe(false)
      element.remove()
    })
  })

  describe('late targets', () => {
    it('locks after a late attachment when requested beforehand', () => {
      const ref = createRef<HTMLDivElement>()
      const { result, rerender } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
      })
      expect(result.current.isLocked).toBe(true)

      const element = document.createElement('div')
      element.style.overflow = 'auto'
      document.body.append(element)
      act(() => {
        ;(ref as { current: HTMLDivElement | null }).current = element
        rerender()
      })

      expect(element.style.overflow).toBe('hidden')
      element.remove()
    })

    it('stays unlocked after unlock-before-attach then attach', () => {
      const ref = createRef<HTMLDivElement>()
      const { result, rerender } = renderHook(() => useScrollLock(ref, true))

      act(() => {
        result.current.unlock()
      })

      const element = document.createElement('div')
      document.body.append(element)
      act(() => {
        ;(ref as { current: HTMLDivElement | null }).current = element
        rerender()
      })
      expect(element.style.overflow).toBe('')
      expect(result.current.isLocked).toBe(false)
      element.remove()
    })
  })

  describe('dynamic targets', () => {
    it('moves the lock from A to B and restores A', () => {
      const a = document.createElement('div')
      const b = document.createElement('div')
      a.style.overflow = 'auto'
      b.style.overflow = 'scroll'
      document.body.append(a, b)
      const ref = { current: a as HTMLDivElement | null }
      const { result, rerender } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
      })
      expect(a.style.overflow).toBe('hidden')

      act(() => {
        ref.current = b
        rerender()
      })
      expect(a.style.overflow).toBe('auto')
      expect(b.style.overflow).toBe('hidden')
      expect(result.current.isLocked).toBe(true)

      a.remove()
      b.remove()
    })

    it('keeps requested lock when target becomes null', () => {
      const element = document.createElement('div')
      element.style.overflow = 'auto'
      document.body.append(element)
      const ref = { current: element as HTMLDivElement | null }
      const { result, rerender } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
      })
      act(() => {
        ref.current = null
        rerender()
      })
      expect(result.current.isLocked).toBe(true)
      expect(element.style.overflow).toBe('auto')
      element.remove()
    })

    it('avoids churn when window and document resolve to the same root', () => {
      const ref = {
        current: window as unknown as HTMLElement | Window | Document | null,
      }
      const { result, rerender } = renderHook(() => useScrollLock(ref as never))
      const root = resolveLockElement(window)
      expect(root).not.toBeNull()
      if (root == null) {
        return
      }

      const original = root.style.getPropertyValue('overflow')
      const originalPriority = root.style.getPropertyPriority('overflow')

      act(() => {
        result.current.lock()
      })
      expect(root.style.overflow).toBe('hidden')
      expect(getScrollLockOwnerCount(root)).toBe(1)

      act(() => {
        ref.current = document
        rerender()
      })
      expect(root.style.overflow).toBe('hidden')
      expect(getScrollLockOwnerCount(root)).toBe(1)

      act(() => {
        result.current.unlock()
      })
      if (original === '') {
        expect(root.style.getPropertyValue('overflow')).toBe('')
      } else {
        expect(root.style.getPropertyValue('overflow')).toBe(original)
        expect(root.style.getPropertyPriority('overflow')).toBe(
          originalPriority,
        )
      }
    })
  })

  describe('multiple instances', () => {
    it('requires both owners to unlock before restoring', () => {
      const element = document.createElement('div')
      element.style.overflow = 'auto'
      document.body.append(element)
      const refA = { current: element }
      const refB = { current: element }
      const first = renderHook(() => useScrollLock(refA))
      const second = renderHook(() => useScrollLock(refB))

      act(() => {
        first.result.current.lock()
        second.result.current.lock()
      })
      expect(element.style.overflow).toBe('hidden')

      act(() => {
        first.result.current.unlock()
      })
      expect(element.style.overflow).toBe('hidden')

      act(() => {
        second.result.current.unlock()
      })
      expect(element.style.overflow).toBe('auto')
      element.remove()
    })

    it('restores when one owner unmounts and the other unlocks', () => {
      const element = document.createElement('div')
      element.style.overflow = 'scroll'
      document.body.append(element)
      const refA = { current: element }
      const refB = { current: element }
      const first = renderHook(() => useScrollLock(refA))
      const second = renderHook(() => useScrollLock(refB))

      act(() => {
        first.result.current.lock()
        second.result.current.lock()
      })
      first.unmount()
      expect(element.style.overflow).toBe('hidden')

      act(() => {
        second.result.current.unlock()
      })
      expect(element.style.overflow).toBe('scroll')
      element.remove()
    })
  })

  describe('Strict Mode', () => {
    it('keeps one effective owner after effect replay', () => {
      const element = document.createElement('div')
      element.style.overflow = 'auto'
      document.body.append(element)
      const ref = { current: element }
      const { result, unmount } = renderHook(() => useScrollLock(ref, true), {
        wrapper: StrictMode,
      })

      expect(result.current.isLocked).toBe(true)
      expect(element.style.overflow).toBe('hidden')
      expect(getScrollLockOwnerCount(element)).toBe(1)

      unmount()
      expect(element.style.overflow).toBe('auto')
      expect(getScrollLockOwnerCount(element)).toBe(0)
      element.remove()
    })
  })

  describe('external styles', () => {
    it('restores the original snapshot after external overflow mutation', () => {
      const element = document.createElement('div')
      element.style.overflow = 'auto'
      element.style.color = 'rgb(4, 5, 6)'
      document.body.append(element)
      const ref = { current: element }
      const { result } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
      })
      element.style.overflow = 'visible'
      element.style.color = 'rgb(7, 8, 9)'

      act(() => {
        result.current.unlock()
      })
      expect(element.style.overflow).toBe('auto')
      expect(element.style.color).toBe('rgb(7, 8, 9)')
      element.remove()
    })
  })

  describe('error containment', () => {
    it('keeps requested state when style application fails', () => {
      const element = document.createElement('div')
      document.body.append(element)
      vi.spyOn(element.style, 'setProperty').mockImplementation(() => {
        throw new Error('blocked')
      })
      const ref = { current: element }
      const { result } = renderHook(() => useScrollLock(ref))

      act(() => {
        result.current.lock()
      })
      expect(result.current.isLocked).toBe(true)
      expect(getScrollLockOwnerCount(element)).toBe(0)
      element.remove()
    })
  })

  describe('SSR', () => {
    it('renders without touching styles', () => {
      function ServerComponent() {
        const ref = useRef<HTMLDivElement>(null)
        const unlocked = useScrollLock(ref)
        const locked = useScrollLock(ref, true)
        void unlocked.lock
        void locked.unlock
        return (
          <div>
            {String(unlocked.isLocked)}:{String(locked.isLocked)}
          </div>
        )
      }

      const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty')
      const html = renderToString(<ServerComponent />)
      expect(html).toContain('false')
      expect(html).toContain('true')
      expect(setProperty).not.toHaveBeenCalled()
    })
  })

  describe('rendered controls', () => {
    it('supports lock and unlock buttons', () => {
      render(<Harness />)
      const target = document.querySelector(
        '[data-testid="lock-target"]',
      ) as HTMLDivElement

      act(() => {
        target.querySelector<HTMLButtonElement>('[data-testid="lock"]')?.click()
      })
      expect(target.getAttribute('data-locked')).toBe('true')
      expect(target.style.overflow).toBe('hidden')

      act(() => {
        target
          .querySelector<HTMLButtonElement>('[data-testid="unlock"]')
          ?.click()
      })
      expect(target.getAttribute('data-locked')).toBe('false')
    })
  })
})
