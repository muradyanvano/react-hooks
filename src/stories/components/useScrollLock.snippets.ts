export const scrollLockSnippet = `import { useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function ScrollLockDemo() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isLocked, toggle } = useScrollLock(scrollRef)

  return (
    <div>
      <p>isLocked: {String(isLocked)}</p>
      <button type="button" onClick={() => toggle()}>
        {isLocked ? 'Unlock' : 'Lock'}
      </button>
      <div ref={scrollRef} style={{ overflow: 'auto', height: 240 }}>
        <div style={{ width: '200%', height: '200%' }}>Scroll Me</div>
      </div>
    </div>
  )
}`

export const modalPageLockSnippet = `import { useEffect, useId, useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function ModalPageLock() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const documentRef = useRef<Document | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const { isLocked, lock, unlock } = useScrollLock(documentRef)

  useEffect(() => {
    if (open) {
      lock()
      queueMicrotask(() => {
        closeRef.current?.focus()
      })
      return
    }
    unlock()
  }, [open, lock, unlock])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={!ready}
        onClick={() => {
          setOpen(true)
        }}
      >
        Open dialog
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <h2 id={titleId}>Confirm</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={() => {
              setOpen(false)
              queueMicrotask(() => {
                triggerRef.current?.focus()
              })
            }}
          >
            Close
          </button>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        title="Isolated modal page"
        srcDoc="<html><body style='margin:0;min-height:220vh;padding:16px;font-family:system-ui'>Isolated page</body></html>"
        onLoad={() => {
          documentRef.current = iframeRef.current?.contentDocument ?? null
          setReady(true)
        }}
      />
      <p>Locked: {String(isLocked)}</p>
    </>
  )
}`

export const multipleOwnersSnippet = `import { useRef, type RefObject } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

function OwnerControls({
  label,
  targetRef,
}: {
  label: string
  targetRef: RefObject<HTMLDivElement | null>
}) {
  const { isLocked, lock, unlock } = useScrollLock(targetRef)
  return (
    <div>
      <p>
        {label}: {String(isLocked)}
      </p>
      <button type="button" onClick={() => lock()}>
        Lock {label}
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock {label}
      </button>
    </div>
  )
}

export function MultipleOwners() {
  const targetRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <OwnerControls label="A" targetRef={targetRef} />
      <OwnerControls label="B" targetRef={targetRef} />
      <div ref={targetRef} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ height: '200%' }}>Shared target</div>
      </div>
    </>
  )
}`

export const initialLockedSnippet = `import { useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

function LockedPanel() {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, unlock } = useScrollLock(ref, true)

  return (
    <div>
      <p>isLocked: {String(isLocked)}</p>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ height: '200%' }}>Starts locked</div>
      </div>
    </div>
  )
}

export function InitialLocked() {
  const [mounted, setMounted] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Mount with initialLocked
      </button>
      {mounted ? <LockedPanel /> : null}
    </>
  )
}`

export const existingOverflowSnippet = `import { useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function ExistingOverflow() {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ height: '200%' }}>overflow: auto restored on unlock</div>
      </div>
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}`

export const importantPrioritySnippet = `import { useEffect, useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function ImportantPriority() {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)

  useEffect(() => {
    ref.current?.style.setProperty('overflow', 'auto', 'important')
  }, [])

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <div ref={ref} style={{ height: 160 }}>
        <div style={{ height: '200%' }}>!important overflow restored</div>
      </div>
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function DynamicLockTarget() {
  const firstRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [useFirst, setUseFirst] = useState(true)
  const { isLocked, lock, unlock } = useScrollLock(
    useFirst ? firstRef : secondRef,
  )

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <button type="button" onClick={() => setUseFirst((value) => !value)}>
        Switch target
      </button>
      <div ref={firstRef} style={{ overflow: 'auto', height: 120 }}>
        <div style={{ height: '200%' }}>First</div>
      </div>
      <div ref={secondRef} style={{ overflow: 'scroll', height: 120 }}>
        <div style={{ height: '200%' }}>Second</div>
      </div>
      <p>
        active: {useFirst ? 'first' : 'second'} · locked: {String(isLocked)}
      </p>
    </>
  )
}`

export const lateTargetSnippet = `import { useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function LateTarget() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [showTarget, setShowTarget] = useState(false)
  const { isLocked, lock, unlock } = useScrollLock(ref)

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock before mount
      </button>
      <button type="button" onClick={() => setShowTarget(true)}>
        Mount target
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      {showTarget ? (
        <div ref={ref} style={{ overflow: 'auto', height: 140 }}>
          <div style={{ height: '200%' }}>Late target</div>
        </div>
      ) : null}
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}`

export const windowTargetSnippet = `import { useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function WindowLockTarget() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Window | null>(null)
  const [ready, setReady] = useState(false)
  const { isLocked, lock, unlock } = useScrollLock(targetRef)

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated window lock"
        srcDoc="<html><body style='margin:0;padding:16px;min-height:220vh;font-family:system-ui'>Isolated window</body></html>"
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentWindow ?? null
          setReady(true)
        }}
      />
      <button type="button" disabled={!ready} onClick={() => lock()}>
        Lock window
      </button>
      <button type="button" disabled={!ready} onClick={() => unlock()}>
        Unlock window
      </button>
      <p>
        ready: {String(ready)} · locked: {String(isLocked)}
      </p>
    </>
  )
}`

export const documentTargetSnippet = `import { useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function DocumentLockTarget() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<Document | null>(null)
  const [ready, setReady] = useState(false)
  const { isLocked, lock, unlock } = useScrollLock(targetRef)

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Isolated document lock"
        srcDoc="<html><body style='margin:0;padding:16px;min-height:220vh;font-family:system-ui'>Custom document</body></html>"
        onLoad={() => {
          targetRef.current = iframeRef.current?.contentDocument ?? null
          setReady(true)
        }}
      />
      <button type="button" disabled={!ready} onClick={() => lock()}>
        Lock document
      </button>
      <button type="button" disabled={!ready} onClick={() => unlock()}>
        Unlock document
      </button>
      <p>
        ready: {String(ready)} · locked: {String(isLocked)}
      </p>
    </>
  )
}`

export const svgTargetSnippet = `import { useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function SvgLockTarget() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(svgRef)

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock SVG
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock SVG
      </button>
      <svg
        ref={svgRef}
        viewBox="0 0 320 160"
        width="100%"
        height="160"
        style={{ overflow: 'auto', border: '1px solid #cbd5e1' }}
      >
        <rect x="0" y="0" width="640" height="320" fill="#eef2ff" />
        <text x="16" y="32">
          SVG scroll lock target
        </text>
      </svg>
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}`

export const scrollPositionSnippet = `import { useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function ScrollPositionPreserved() {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 160 }}>
        <div style={{ width: '180%', height: '220%' }}>
          Scroll, then lock — position stays put
        </div>
      </div>
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}`

export const externalStylesSnippet = `import { useRef } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

export function ExternalStylesPreserved() {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock } = useScrollLock(ref)

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <div
        ref={ref}
        style={{
          overflow: 'auto',
          overflowX: 'scroll',
          overflowY: 'auto',
          color: 'rgb(1, 2, 3)',
          height: 160,
        }}
      >
        <div style={{ height: '200%' }}>Unrelated styles stay intact</div>
      </div>
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}`

export const unmountCleanupSnippet = `import { useRef, useState, type RefObject } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

function LockedOwner({
  targetRef,
}: {
  targetRef: RefObject<HTMLDivElement | null>
}) {
  const { isLocked } = useScrollLock(targetRef, true)
  return <p>Hook mounted · isLocked: {String(isLocked)}</p>
}

export function UnmountCleanup() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(true)

  return (
    <>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount hook' : 'Remount hook'}
      </button>
      {mounted ? <LockedOwner targetRef={targetRef} /> : null}
      <div ref={targetRef} style={{ overflow: 'auto', height: 140 }}>
        <div style={{ height: '200%' }}>Unmount restores overflow</div>
      </div>
    </>
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useScrollLock } from '@muradyanvano/react-hooks'

function PlaygroundBody({ initialLocked }: { initialLocked: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const { isLocked, lock, unlock, toggle } = useScrollLock(ref, initialLocked)

  return (
    <>
      <button type="button" onClick={() => lock()}>
        Lock
      </button>
      <button type="button" onClick={() => unlock()}>
        Unlock
      </button>
      <button type="button" onClick={() => toggle()}>
        Toggle
      </button>
      <div ref={ref} style={{ overflow: 'auto', height: 180 }}>
        <div style={{ height: '200%' }}>Playground scroller</div>
      </div>
      <p>isLocked: {String(isLocked)}</p>
    </>
  )
}

export function ScrollLockPlayground({
  initialLocked = false,
}: {
  initialLocked?: boolean
}) {
  const [mounted, setMounted] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Mount playground
      </button>
      {mounted ? (
        <PlaygroundBody
          key={String(initialLocked)}
          initialLocked={initialLocked}
        />
      ) : null}
    </>
  )
}`
