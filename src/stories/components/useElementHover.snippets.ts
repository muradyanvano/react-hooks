export const hoverMeSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function HoverMePair() {
  const immediateRef = useRef<HTMLButtonElement>(null)
  const delayedRef = useRef<HTMLButtonElement>(null)

  const immediateHover = useElementHover(immediateRef)
  const delayedHover = useElementHover(delayedRef, { delayEnter: 1000 })

  return (
    <div className="flex flex-wrap gap-3">
      <button ref={immediateRef} type="button">
        {immediateHover ? 'Thank you!' : 'Hover me'}
      </button>
      <button ref={delayedRef} type="button">
        {delayedHover ? 'Thank you!' : 'Hover me'}
      </button>
    </div>
  )
}`

export const immediateHoverSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function ProfileCard() {
  const cardRef = useRef<HTMLElement>(null)
  const isHovered = useElementHover(cardRef)

  return (
    <article ref={cardRef} className="rounded-xl border p-4">
      <h2>Alex Morgan</h2>
      <p>Product designer</p>
      <p>{isHovered ? 'Thanks for stopping by!' : 'Hover for a greeting'}</p>
    </article>
  )
}`

export const delayedEnterSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function AccountPreview() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isHovered = useElementHover(triggerRef, { delayEnter: 400 })

  return (
    <div>
      <button ref={triggerRef} type="button">
        @alex
      </button>
      {isHovered ? (
        <div role="note">Account preview panel</div>
      ) : (
        <p>Preview appears after a short hover delay.</p>
      )}
    </div>
  )
}`

export const delayedLeaveSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function MenuWithPanel() {
  const menuRef = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(menuRef, { delayLeave: 300 })

  return (
    <div ref={menuRef} className="inline-flex gap-3 rounded-lg border p-2">
      <button type="button">Files</button>
      <div aria-hidden={!isHovered}>
        {isHovered ? 'Related shortcuts stay open briefly.' : null}
      </div>
    </div>
  )
}`

export const cancelledTransitionsSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function TransitionLog() {
  const targetRef = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(targetRef, {
    delayEnter: 500,
    delayLeave: 500,
  })

  return (
    <div
      ref={targetRef}
      tabIndex={-1}
      aria-label="Delayed hover target"
      className="rounded-lg border p-4"
    >
      <p>{isHovered ? 'Hovering' : 'Not hovering'}</p>
      <p>Leave before 500ms to cancel enter. Re-enter before 500ms to cancel leave.</p>
    </div>
  )
}`

export const nestedContentSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function FeatureTile() {
  const tileRef = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(tileRef)

  return (
    <div ref={tileRef} className="rounded-xl border p-4">
      <div aria-hidden="true">★</div>
      <h3>Analytics</h3>
      <p>Moving between icon, heading, and body does not reset hover.</p>
      <p>Status: {isHovered ? 'hovering' : 'idle'}</p>
    </div>
  )
}`

export const elementRemovalSnippet = `import { useRef, useState } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function RemovableTarget() {
  const targetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(true)
  const isHovered = useElementHover(targetRef, {
    triggerOnRemoval: true,
    delayLeave: 200,
  })

  return (
    <div>
      {mounted ? (
        <div ref={targetRef} tabIndex={0}>
          Hover me, then remove me from the DOM.
        </div>
      ) : null}
      <button type="button" onClick={() => setMounted(false)}>
        Remove target
      </button>
      <button type="button" onClick={() => setMounted(true)}>
        Restore target
      </button>
      <p>Hover state: {String(isHovered)}</p>
    </div>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function SwitchableTarget() {
  const ref = useRef<HTMLButtonElement | null>(null)
  const [active, setActive] = useState<'a' | 'b'>('a')
  const isHovered = useElementHover(ref)

  return (
    <div>
      <button
        ref={active === 'a' ? ref : undefined}
        type="button"
        onClick={() => setActive('a')}
      >
        Target A {active === 'a' && isHovered ? '(hovering)' : ''}
      </button>
      <button
        ref={active === 'b' ? ref : undefined}
        type="button"
        onClick={() => setActive('b')}
      >
        Target B {active === 'b' && isHovered ? '(hovering)' : ''}
      </button>
    </div>
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function ToggleableHover() {
  const targetRef = useRef<HTMLButtonElement>(null)
  const [enabled, setEnabled] = useState(true)
  const isHovered = useElementHover(targetRef, { enabled })

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
        />
        Enabled
      </label>
      <button ref={targetRef} type="button">
        {isHovered ? 'Thank you!' : 'Hover me'}
      </button>
      <p>Hover state: {String(isHovered)}</p>
    </div>
  )
}`

export const svgTargetSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function SvgBadge() {
  const shapeRef = useRef<SVGCircleElement>(null)
  const isHovered = useElementHover(shapeRef)

  return (
    <svg width="120" height="120" aria-labelledby="svg-badge-title">
      <title id="svg-badge-title">Status badge</title>
      <circle
        ref={shapeRef}
        cx="60"
        cy="60"
        r="40"
        fill={isHovered ? '#4f46e5' : '#cbd5e1'}
      />
      <text x="60" y="65" textAnchor="middle">
        {isHovered ? 'Active' : 'Idle'}
      </text>
    </svg>
  )
}`

export const playgroundSnippet = `import { useRef } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

export function HoverPlayground({
  enabled = true,
  delayEnter = 0,
  delayLeave = 0,
  triggerOnRemoval = false,
}: {
  enabled?: boolean
  delayEnter?: number
  delayLeave?: number
  triggerOnRemoval?: boolean
}) {
  const targetRef = useRef<HTMLButtonElement>(null)
  const isHovered = useElementHover(targetRef, {
    enabled,
    delayEnter,
    delayLeave,
    triggerOnRemoval,
  })

  return (
    <button ref={targetRef} type="button">
      {isHovered ? 'Thank you!' : 'Hover me'}
    </button>
  )
}`
