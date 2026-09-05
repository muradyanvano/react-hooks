import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react'

import { useScrollLock } from '@muradyanvano/react-hooks'
import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  documentTargetSnippet,
  dynamicTargetSnippet,
  existingOverflowSnippet,
  externalStylesSnippet,
  importantPrioritySnippet,
  initialLockedSnippet,
  lateTargetSnippet,
  modalPageLockSnippet,
  multipleOwnersSnippet,
  playgroundSnippet,
  scrollLockSnippet,
  scrollPositionSnippet,
  svgTargetSnippet,
  unmountCleanupSnippet,
  windowTargetSnippet,
} from './useScrollLock.snippets'

const surfaceClass =
  'relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 outline-none transition-[background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none'
const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const scrollerClass =
  'relative w-full overflow-auto rounded-xl border border-slate-300 bg-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

function readOverflow(element: HTMLElement | SVGElement | null): string {
  if (element == null) {
    return '(empty)'
  }
  const value = element.style.getPropertyValue('overflow')
  return value === '' ? '(empty)' : value
}

function readOverflowPriority(
  element: HTMLElement | SVGElement | null,
): string {
  if (element == null) {
    return '(none)'
  }
  const value = element.style.getPropertyPriority('overflow')
  return value === '' ? '(none)' : value
}

function useOverflowProbe(
  ref: RefObject<HTMLElement | SVGElement | null>,
  deps: readonly unknown[],
): { overflow: string; priority: string; refresh: () => void } {
  const [overflow, setOverflow] = useState('(empty)')
  const [priority, setPriority] = useState('(none)')

  const refresh = useCallback(() => {
    setOverflow(readOverflow(ref.current))
    setPriority(readOverflowPriority(ref.current))
  }, [ref])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- probe when story deps change
  }, [refresh, ...deps])

  return { overflow, priority, refresh }
}

function LockBadge({ locked }: { locked: boolean }): ReactElement | null {
  if (!locked) {
    return null
  }

  return (
    <span
      data-testid="lock-badge"
      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
    >
      Locked
    </span>
  )
}

function CornerLabels(): ReactElement {
  return (
    <>
      <span className="absolute left-4 top-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
        TopLeft
      </span>
      <span className="absolute right-4 top-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
        TopRight
      </span>
      <span className="absolute bottom-4 left-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
        BottomLeft
      </span>
      <span className="absolute bottom-4 right-4 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-slate-600">
        BottomRight
      </span>
      <p
        data-testid="scroll-center-label"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold text-indigo-700"
      >
        Scroll Me
      </p>
    </>
  )
}

export function ScrollLockExample(): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isLocked, toggle } = useScrollLock(scrollRef)
  const { overflow, refresh } = useOverflowProbe(scrollRef, [isLocked])
  const [scrollSnapshot, setScrollSnapshot] = useState({ left: 0, top: 0 })

  const captureScroll = () => {
    const element = scrollRef.current
    if (element == null) {
      return
    }
    setScrollSnapshot({ left: element.scrollLeft, top: element.scrollTop })
  }

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Scroll lock"
      description="Locks a contained scroller with inline overflow: hidden while preserving scroll position. Controls stay outside the scroll region so they remain usable while locked."
      instruction="Scroll the panel away from the origin, toggle Lock/Unlock, and confirm overflow and scroll offsets stay stable."
      code={scrollLockSnippet}
      badge="Primary"
      aside={
        <div className="space-y-3">
          <StatusPanel
            items={[
              {
                label: 'isLocked',
                value: String(isLocked),
                testId: 'lock-status',
              },
              {
                label: 'overflow',
                value: overflow,
                testId: 'lock-overflow',
              },
              {
                label: 'scrollLeft',
                value: String(scrollSnapshot.left),
                testId: 'lock-scroll-left',
              },
              {
                label: 'scrollTop',
                value: String(scrollSnapshot.top),
                testId: 'lock-scroll-top',
              },
            ]}
          />
          <LockBadge locked={isLocked} />
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={isLocked ? secondaryButtonClass : buttonClass}
          data-testid="lock-toggle"
          onClick={() => {
            toggle()
            queueMicrotask(() => {
              captureScroll()
              refresh()
            })
          }}
        >
          {isLocked ? 'Unlock' : 'Lock'}
        </button>
        <p
          className="text-sm text-slate-600"
          data-testid="lock-status-text"
          aria-live="polite"
        >
          isLocked: {String(isLocked)}
        </p>
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        data-testid="scroll-lock-panel"
        aria-label="Two-dimensional scroll lock panel"
        className={`${scrollerClass} mt-3 h-64 max-h-64`}
        style={{ scrollbarGutter: 'stable' }}
        onScroll={captureScroll}
      >
        <div
          className="relative bg-gradient-to-br from-indigo-50 via-white to-violet-100"
          style={{
            width: '220%',
            height: '220%',
            minWidth: 640,
            minHeight: 560,
          }}
        >
          <CornerLabels />
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ModalPageLockExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const documentRef = useRef<Document | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [rootOverflow, setRootOverflow] = useState('(empty)')
  const titleId = useId()
  const { isLocked, lock, unlock } = useScrollLock(documentRef)

  const probeRoot = useCallback(() => {
    const root = iframeRef.current?.contentDocument?.scrollingElement as
      HTMLElement | null | undefined
    setRootOverflow(readOverflow(root ?? null))
  }, [])

  const bindIframe = useCallback(
    (frame: HTMLIFrameElement) => {
      documentRef.current = frame.contentDocument ?? null
      setReady(true)
      probeRoot()
    },
    [probeRoot],
  )

  useIsolatedIframeBind(iframeRef, bindIframe)

  useEffect(() => {
    if (open) {
      lock()
      queueMicrotask(() => {
        closeRef.current?.focus()
        probeRoot()
      })
      return
    }
    unlock()
    queueMicrotask(() => {
      probeRoot()
    })
  }, [open, lock, unlock, probeRoot])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }
      setOpen(false)
      queueMicrotask(() => {
        triggerRef.current?.focus()
      })
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const closeDialog = () => {
    setOpen(false)
    queueMicrotask(() => {
      triggerRef.current?.focus()
    })
  }

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Modal page lock"
      description="Page-level locks should target an isolated document. This demo locks a same-origin iframe document while the accessible dialog lives in the story UI — Storybook Docs never receives overflow: hidden."
      instruction="Open the dialog, confirm focus moves to Close, then Escape or Close to unlock and restore focus to the trigger."
      code={modalPageLockSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Ready', value: String(ready), testId: 'modal-ready' },
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'modal-lock-status',
            },
            {
              label: 'iframe overflow',
              value: rootOverflow,
              testId: 'modal-overflow',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          ref={triggerRef}
          type="button"
          className={buttonClass}
          data-testid="modal-open"
          disabled={!ready}
          onClick={() => {
            setOpen(true)
          }}
        >
          Open dialog
        </button>
        <p className="text-sm text-slate-600" aria-live="polite">
          isLocked: {String(isLocked)}
        </p>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-testid="modal-dialog"
          className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2
            id={titleId}
            className="text-base font-semibold text-slate-900"
            data-testid="modal-title"
          >
            Confirm action
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Escape or Close restores iframe scrolling and returns focus to the
            trigger. The Storybook page is not locked.
          </p>
          <button
            ref={closeRef}
            type="button"
            className={`${secondaryButtonClass} mt-3`}
            data-testid="modal-close"
            onClick={closeDialog}
          >
            Close
          </button>
        </div>
      ) : null}

      <iframe
        ref={iframeRef}
        title="Isolated modal page"
        data-testid="modal-iframe"
        className={`${surfaceClass} mt-3 h-64 w-full bg-white`}
        srcDoc={`<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#eef2ff,#fff);min-height:220vh;}</style></head><body><h1 style="margin:0 0 12px;font-size:18px;">Isolated page</h1><p>Scroll this iframe. Opening the dialog locks this document only.</p></body></html>`}
      />
    </ExampleShowcase>
  )
}

function OwnerControls({
  label,
  targetRef,
  testPrefix,
  onChange,
}: {
  label: string
  targetRef: RefObject<HTMLDivElement | null>
  testPrefix: string
  onChange: () => void
}): ReactElement {
  const { isLocked, lock, unlock } = useScrollLock(targetRef)

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-3"
      data-testid={`${testPrefix}-panel`}
    >
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p
        className="mt-1 text-sm text-slate-600"
        data-testid={`${testPrefix}-status`}
        aria-live="polite"
      >
        isLocked: {String(isLocked)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid={`${testPrefix}-lock`}
          onClick={() => {
            lock()
            queueMicrotask(onChange)
          }}
        >
          Lock {label}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid={`${testPrefix}-unlock`}
          onClick={() => {
            unlock()
            queueMicrotask(onChange)
          }}
        >
          Unlock {label}
        </button>
      </div>
    </div>
  )
}

export function MultipleOwnersExample(): ReactElement {
  const targetRef = useRef<HTMLDivElement>(null)
  const { overflow, refresh } = useOverflowProbe(targetRef, [])

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Multiple owners"
      description="Two hook instances can lock the same element. Overflow restores only after the final owner releases."
      instruction="Lock A and B, unlock A (still locked), then unlock B to restore overflow: auto."
      code={multipleOwnersSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'overflow',
              value: overflow,
              testId: 'owners-overflow',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <OwnerControls
          label="A"
          targetRef={targetRef}
          testPrefix="owner-a"
          onChange={refresh}
        />
        <OwnerControls
          label="B"
          targetRef={targetRef}
          testPrefix="owner-b"
          onChange={refresh}
        />
      </div>
      <div
        ref={targetRef}
        tabIndex={0}
        role="region"
        data-testid="owners-scroller"
        aria-label="Shared multi-owner scroll target"
        className={`${scrollerClass} mt-3 h-40`}
        style={{ overflow: 'auto' }}
      >
        <div className="bg-indigo-50 p-4" style={{ height: '220%' }}>
          Shared target — both owners reference this element.
        </div>
      </div>
    </ExampleShowcase>
  )
}

function InitialLockedPanel(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, unlock } = useScrollLock(ref, true)

  return (
    <div className="space-y-3" data-testid="initial-locked-panel">
      <p
        className="text-sm text-slate-700"
        data-testid="initial-lock-status"
        aria-live="polite"
      >
        isLocked: {String(isLocked)}
      </p>
      <button
        type="button"
        className={secondaryButtonClass}
        data-testid="initial-unlock"
        onClick={() => {
          unlock()
        }}
      >
        Unlock
      </button>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="initial-scroller"
        aria-label="Initially locked scroller"
        className={`${scrollerClass} h-40`}
        style={{ overflow: 'auto' }}
      >
        <div className="bg-violet-50 p-4" style={{ height: '220%' }}>
          Mounted with initialLocked: true
        </div>
      </div>
    </div>
  )
}

export function InitialLockedExample(): ReactElement {
  const [mounted, setMounted] = useState(false)

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Initial locked"
      description="Pass initialLocked true when the hook mounts. Later prop changes are ignored — remount to apply a new initial value."
      instruction="Mount the panel to start locked, then unlock to restore scrolling."
      code={initialLockedSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'initial-mounted',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="initial-mount"
        onClick={() => {
          setMounted(true)
        }}
      >
        Mount with initialLocked
      </button>
      {mounted ? <InitialLockedPanel /> : null}
    </ExampleShowcase>
  )
}

export function ExistingOverflowExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)
  const { overflow, refresh } = useOverflowProbe(ref, [isLocked])

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Existing overflow"
      description="When the target already has inline overflow: auto, unlock restores that exact value instead of clearing the property."
      instruction="Lock, confirm hidden, unlock, and verify overflow returns to auto."
      code={existingOverflowSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'existing-status',
            },
            {
              label: 'overflow',
              value: overflow,
              testId: 'existing-overflow',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="existing-lock"
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="existing-unlock"
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock
        </button>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="existing-scroller"
        aria-label="Existing overflow scroller"
        className={`${scrollerClass} mt-3 h-40`}
        style={{ overflow: 'auto' }}
      >
        <div className="bg-emerald-50 p-4" style={{ height: '220%' }}>
          Starts with overflow: auto
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ImportantPriorityExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const preparedRef = useRef(false)
  const { isLocked, lock, unlock } = useScrollLock(ref)
  const { overflow, priority, refresh } = useOverflowProbe(ref, [isLocked])

  const setScrollerRef = (node: HTMLDivElement | null) => {
    ref.current = node
    if (node != null && !preparedRef.current) {
      node.style.setProperty('overflow', 'auto', 'important')
      preparedRef.current = true
      queueMicrotask(refresh)
    }
  }

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Important priority"
      description="Overflow snapshots include CSS priority. Unlock restores overflow: auto !important when that was the original inline declaration."
      instruction="Lock and unlock, then inspect overflow value and priority."
      code={importantPrioritySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'important-status',
            },
            {
              label: 'overflow',
              value: overflow,
              testId: 'important-overflow',
            },
            {
              label: 'priority',
              value: priority,
              testId: 'important-priority',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="important-lock"
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="important-unlock"
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock
        </button>
      </div>
      <div
        ref={setScrollerRef}
        tabIndex={0}
        role="region"
        data-testid="important-scroller"
        aria-label="Important overflow scroller"
        className={`${scrollerClass} mt-3 h-40`}
      >
        <div className="bg-amber-50 p-4" style={{ height: '220%' }}>
          overflow: auto !important
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample(): ReactElement {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [useFirst, setUseFirst] = useState(true)
  const { isLocked, lock, unlock } = useScrollLock(
    useFirst ? firstRef : secondRef,
  )
  const firstProbe = useOverflowProbe(firstRef, [isLocked, useFirst])
  const secondProbe = useOverflowProbe(secondRef, [isLocked, useFirst])

  const refreshBoth = () => {
    firstProbe.refresh()
    secondProbe.refresh()
  }

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Dynamic target"
      description="Switching refs while locked moves the lock to the new element and restores the previous one on the next commit."
      instruction="Lock the first panel, switch targets, then unlock."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: useFirst ? 'first' : 'second',
              testId: 'dynamic-active',
            },
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'dynamic-status',
            },
            {
              label: 'First overflow',
              value: firstProbe.overflow,
              testId: 'dynamic-first-overflow',
            },
            {
              label: 'Second overflow',
              value: secondProbe.overflow,
              testId: 'dynamic-second-overflow',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="dynamic-lock"
          onClick={() => {
            lock()
            queueMicrotask(refreshBoth)
          }}
        >
          Lock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="dynamic-unlock"
          onClick={() => {
            unlock()
            queueMicrotask(refreshBoth)
          }}
        >
          Unlock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="dynamic-switch"
          onClick={() => {
            setUseFirst((value) => !value)
            queueMicrotask(refreshBoth)
          }}
        >
          Switch to {useFirst ? 'second' : 'first'}
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div
          ref={firstRef}
          tabIndex={0}
          role="region"
          data-testid="dynamic-first"
          aria-label="First dynamic lock target"
          className={`${scrollerClass} h-32 ${useFirst ? 'ring-2 ring-indigo-400' : ''}`}
          style={{ overflow: 'auto' }}
        >
          <div className="bg-indigo-50 p-3" style={{ height: '220%' }}>
            First target
          </div>
        </div>
        <div
          ref={secondRef}
          tabIndex={0}
          role="region"
          data-testid="dynamic-second"
          aria-label="Second dynamic lock target"
          className={`${scrollerClass} h-32 ${!useFirst ? 'ring-2 ring-indigo-400' : ''}`}
          style={{ overflow: 'scroll' }}
        >
          <div className="bg-violet-50 p-3" style={{ height: '220%' }}>
            Second target
          </div>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function LateTargetExample(): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null)
  const [showTarget, setShowTarget] = useState(false)
  const { isLocked, lock, unlock } = useScrollLock(ref)
  const { overflow, refresh } = useOverflowProbe(ref, [isLocked, showTarget])

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Late target"
      description="Requested lock state can be set before a target exists. After the element mounts, the next commit attaches overflow: hidden."
      instruction="Lock before mount, mount the target, confirm it locks, then unlock."
      code={lateTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Target',
              value: showTarget ? 'mounted' : 'absent',
              testId: 'late-target-state',
            },
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'late-status',
            },
            {
              label: 'overflow',
              value: overflow,
              testId: 'late-overflow',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="late-lock"
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock before mount
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="late-mount"
          onClick={() => {
            setShowTarget(true)
            queueMicrotask(refresh)
          }}
        >
          Mount target
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="late-unlock"
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock
        </button>
      </div>
      {showTarget ? (
        <div
          ref={ref}
          tabIndex={0}
          role="region"
          data-testid="late-scroller"
          aria-label="Late-mounted scroll target"
          className={`${scrollerClass} mt-3 h-36`}
          style={{ overflow: 'auto' }}
        >
          <div className="bg-sky-50 p-4" style={{ height: '220%' }}>
            Late target
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500" data-testid="late-absent">
          Target not mounted yet.
        </p>
      )}
    </ExampleShowcase>
  )
}

function useIframeRootOverflow(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  deps: readonly unknown[],
): { overflow: string; refresh: () => void } {
  const [overflow, setOverflow] = useState('(empty)')

  const refresh = useCallback(() => {
    const root = iframeRef.current?.contentDocument?.scrollingElement as
      HTMLElement | null | undefined
    setOverflow(readOverflow(root ?? null))
  }, [iframeRef])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- probe when story deps change
  }, [refresh, ...deps])

  return { overflow, refresh }
}

/**
 * Binds an isolated same-origin iframe once it finishes loading. Handles the
 * case where `load` fired before React attached an `onLoad` prop.
 */
function useIsolatedIframeBind(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  onReady: (frame: HTMLIFrameElement) => void,
): void {
  useEffect(() => {
    const frame = iframeRef.current
    if (frame == null) {
      return
    }

    const bind = () => {
      if (frame.contentDocument == null) {
        return
      }
      onReady(frame)
    }

    frame.addEventListener('load', bind)
    if (frame.contentDocument?.readyState === 'complete') {
      bind()
    }

    return () => {
      frame.removeEventListener('load', bind)
    }
  }, [iframeRef, onReady])
}

export function WindowTargetExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Window | null>(null)
  const [ready, setReady] = useState(false)
  const { isLocked, lock, unlock } = useScrollLock(targetRef)
  const { overflow, refresh } = useIframeRootOverflow(iframeRef, [
    isLocked,
    ready,
  ])

  const bindIframe = useCallback(
    (frame: HTMLIFrameElement) => {
      targetRef.current = frame.contentWindow ?? null
      setReady(true)
      refresh()
    },
    [refresh],
  )

  useIsolatedIframeBind(iframeRef, bindIframe)

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Window target"
      description="Window targets resolve to the document scrolling root. An isolated iframe keeps Docs from locking the Storybook page."
      instruction="Wait for ready, lock the iframe window, then unlock."
      code={windowTargetSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Ready', value: String(ready), testId: 'window-ready' },
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'window-status',
            },
            {
              label: 'root overflow',
              value: overflow,
              testId: 'window-overflow',
            },
          ]}
        />
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="window-lock"
          disabled={!ready}
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock window
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="window-unlock"
          disabled={!ready}
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock window
        </button>
      </div>
      <iframe
        ref={iframeRef}
        title="Isolated window lock"
        data-testid="window-iframe"
        className={`${surfaceClass} h-64 w-full`}
        srcDoc={`<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#eef2ff,#fff);min-height:220vh;}</style></head><body><h1 style="margin:0 0 12px;font-size:18px;">Isolated window</h1><p>Lock applies to this frame's scrolling root.</p></body></html>`}
      />
    </ExampleShowcase>
  )
}

export function DocumentTargetExample(): ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Document | null>(null)
  const [ready, setReady] = useState(false)
  const { isLocked, lock, unlock } = useScrollLock(targetRef)
  const { overflow, refresh } = useIframeRootOverflow(iframeRef, [
    isLocked,
    ready,
  ])

  const bindIframe = useCallback(
    (frame: HTMLIFrameElement) => {
      targetRef.current = frame.contentDocument ?? null
      setReady(true)
      refresh()
    },
    [refresh],
  )

  useIsolatedIframeBind(iframeRef, bindIframe)

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Document target"
      description="Document targets lock the scrolling element of that document — useful for custom iframe documents without touching the host page."
      instruction="Wait for ready, lock the iframe document, then unlock."
      code={documentTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Ready',
              value: String(ready),
              testId: 'document-ready',
            },
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'document-status',
            },
            {
              label: 'root overflow',
              value: overflow,
              testId: 'document-overflow',
            },
          ]}
        />
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="document-lock"
          disabled={!ready}
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock document
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="document-unlock"
          disabled={!ready}
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock document
        </button>
      </div>
      <iframe
        ref={iframeRef}
        title="Isolated document lock"
        data-testid="document-iframe"
        className={`${surfaceClass} h-64 w-full`}
        srcDoc={`<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;background:linear-gradient(#ecfdf5,#fff);min-height:220vh;}</style></head><body><h1 style="margin:0 0 12px;font-size:18px;">Custom document</h1><p>Document target demo.</p></body></html>`}
      />
    </ExampleShowcase>
  )
}

export function SvgTargetExample(): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(svgRef)
  const { overflow, refresh } = useOverflowProbe(svgRef, [isLocked])

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="SVG target"
      description="SVGSVGElement refs are supported. The hook writes inline overflow on the SVG element itself."
      instruction="Lock and unlock the SVG viewport and watch the overflow status."
      code={svgTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'svg-status',
            },
            {
              label: 'overflow',
              value: overflow,
              testId: 'svg-overflow',
            },
          ]}
        />
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="svg-lock"
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock SVG
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="svg-unlock"
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock SVG
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 320 160"
        width="100%"
        height="160"
        role="img"
        aria-label="SVG scroll lock target"
        data-testid="svg-target"
        className={`${surfaceClass} bg-white`}
        style={{ overflow: 'auto' }}
      >
        <rect x="0" y="0" width="640" height="320" fill="#eef2ff" />
        <circle cx="80" cy="80" r="28" fill="#6366f1" />
        <text x="16" y="28" fill="#312e81" fontSize="14" fontFamily="system-ui">
          SVG scroll lock target
        </text>
      </svg>
    </ExampleShowcase>
  )
}

export function ScrollPositionExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  const capturePosition = () => {
    const element = ref.current
    if (element == null) {
      return
    }
    setPosition({ left: element.scrollLeft, top: element.scrollTop })
  }

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Scroll position"
      description="Locking only changes overflow. Existing scrollLeft / scrollTop values are preserved through lock and unlock cycles."
      instruction="Scroll away from the origin, lock, unlock, and confirm offsets stay put."
      code={scrollPositionSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'position-status',
            },
            {
              label: 'scrollLeft',
              value: String(position.left),
              testId: 'position-left',
            },
            {
              label: 'scrollTop',
              value: String(position.top),
              testId: 'position-top',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="position-lock"
          onClick={() => {
            lock()
            capturePosition()
          }}
        >
          Lock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="position-unlock"
          onClick={() => {
            unlock()
            capturePosition()
          }}
        >
          Unlock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="position-capture"
          onClick={capturePosition}
        >
          Capture position
        </button>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="position-scroller"
        aria-label="Scroll position preservation panel"
        className={`${scrollerClass} mt-3 h-44`}
        style={{ overflow: 'auto' }}
        onScroll={capturePosition}
      >
        <div
          className="relative bg-gradient-to-br from-slate-50 to-indigo-100 p-4"
          style={{ width: '180%', height: '220%', minHeight: 420 }}
        >
          Scroll, then lock — position stays put
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ExternalStylesExample(): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)
  const [styles, setStyles] = useState({
    overflow: '(empty)',
    overflowX: '(empty)',
    overflowY: '(empty)',
    color: '(empty)',
  })

  const refresh = () => {
    const element = ref.current
    setStyles({
      overflow: readOverflow(element),
      overflowX: element?.style.overflowX || '(empty)',
      overflowY: element?.style.overflowY || '(empty)',
      color: element?.style.color || '(empty)',
    })
  }

  useEffect(() => {
    refresh()
  }, [isLocked])

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="External styles"
      description="The registry snapshots overflow, overflow-x, and overflow-y. Applying overflow: hidden may expand into longhands while locked; unlock restores the original axis values. Unrelated styles such as color stay untouched."
      instruction="Lock and unlock, then confirm color and axis overflow values match the originals after unlock."
      code={externalStylesSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'isLocked',
              value: String(isLocked),
              testId: 'external-status',
            },
            {
              label: 'overflow',
              value: styles.overflow,
              testId: 'external-overflow',
            },
            {
              label: 'overflowX',
              value: styles.overflowX,
              testId: 'external-overflow-x',
            },
            {
              label: 'overflowY',
              value: styles.overflowY,
              testId: 'external-overflow-y',
            },
            { label: 'color', value: styles.color, testId: 'external-color' },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="external-lock"
          onClick={() => {
            lock()
            queueMicrotask(refresh)
          }}
        >
          Lock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="external-unlock"
          onClick={() => {
            unlock()
            queueMicrotask(refresh)
          }}
        >
          Unlock
        </button>
      </div>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="external-scroller"
        aria-label="External styles scroll target"
        className={`${scrollerClass} mt-3 h-40`}
        style={{
          overflow: 'auto',
          overflowX: 'scroll',
          overflowY: 'auto',
          color: 'rgb(1, 2, 3)',
        }}
      >
        <div className="p-4" style={{ height: '220%' }}>
          Unrelated styles stay intact
        </div>
      </div>
    </ExampleShowcase>
  )
}

function LockedOwner({
  targetRef,
}: {
  targetRef: RefObject<HTMLDivElement | null>
}): ReactElement {
  const { isLocked } = useScrollLock(targetRef, true)

  return (
    <p
      className="text-sm text-slate-700"
      data-testid="unmount-owner-status"
      aria-live="polite"
    >
      Hook mounted · isLocked: {String(isLocked)}
    </p>
  )
}

export function UnmountCleanupExample(): ReactElement {
  const targetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(true)
  const { overflow, refresh } = useOverflowProbe(targetRef, [mounted])

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Unmount cleanup"
      description="Unmounting a locked owner releases its registry entry. When it was the last owner, the original overflow is restored."
      instruction="Confirm the target starts locked, unmount the hook owner, and verify overflow returns to auto."
      code={unmountCleanupSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Owner',
              value: mounted ? 'mounted' : 'unmounted',
              testId: 'unmount-owner-state',
            },
            {
              label: 'overflow',
              value: overflow,
              testId: 'unmount-overflow',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={mounted ? secondaryButtonClass : buttonClass}
        data-testid="unmount-toggle"
        onClick={() => {
          setMounted((value) => !value)
          queueMicrotask(refresh)
        }}
      >
        {mounted ? 'Unmount hook' : 'Remount hook'}
      </button>
      {mounted ? <LockedOwner targetRef={targetRef} /> : null}
      <div
        ref={targetRef}
        tabIndex={0}
        role="region"
        data-testid="unmount-scroller"
        aria-label="Unmount cleanup scroll target"
        className={`${scrollerClass} mt-3 h-36`}
        style={{ overflow: 'auto' }}
      >
        <div className="bg-rose-50 p-4" style={{ height: '220%' }}>
          Unmount restores overflow
        </div>
      </div>
    </ExampleShowcase>
  )
}

function PlaygroundBody({
  initialLocked,
}: {
  initialLocked: boolean
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock, toggle } = useScrollLock(ref, initialLocked)

  return (
    <div className="space-y-3" data-testid="play-body">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          data-testid="play-lock"
          onClick={() => {
            lock()
          }}
        >
          Lock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-unlock"
          onClick={() => {
            unlock()
          }}
        >
          Unlock
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="play-toggle"
          onClick={() => {
            toggle()
          }}
        >
          Toggle
        </button>
      </div>
      <p
        className="text-sm text-slate-700"
        data-testid="play-status"
        aria-live="polite"
      >
        isLocked: {String(isLocked)}
      </p>
      <div
        ref={ref}
        tabIndex={0}
        role="region"
        data-testid="play-scroller"
        aria-label="Scroll lock playground"
        className={`${scrollerClass} h-44`}
        style={{ overflow: 'auto' }}
      >
        <div className="bg-slate-50 p-4" style={{ height: '220%' }}>
          Playground scroller
        </div>
      </div>
    </div>
  )
}

export function PlaygroundExample({
  initialLocked = false,
}: {
  initialLocked?: boolean
}): ReactElement {
  const [mounted, setMounted] = useState(false)

  return (
    <ExampleShowcase
      hookName="useScrollLock"
      title="Playground"
      description="Experiment with initialLocked via Controls. Mount explicitly so Docs stays idle until you opt in."
      instruction="Mount the playground, try Lock / Unlock / Toggle, and remount after changing initialLocked."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'play-mounted',
            },
            {
              label: 'initialLocked',
              value: String(initialLocked),
              testId: 'play-initial',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="play-mount"
        onClick={() => {
          setMounted(true)
        }}
      >
        Mount playground
      </button>
      {mounted ? (
        <PlaygroundBody
          key={String(initialLocked)}
          initialLocked={initialLocked}
        />
      ) : null}
    </ExampleShowcase>
  )
}
