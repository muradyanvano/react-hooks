export const focusInFormSnippet = `import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const { focused } = useFocusWithin(formRef)

  return (
    <form ref={formRef}>
      <p>Focus in form: {String(focused)}</p>

      <label>
        First Name
        <input name="firstName" type="text" />
      </label>

      <label>
        Last Name
        <input name="lastName" type="text" />
      </label>

      <label>
        Email
        <input name="email" type="email" />
      </label>

      <label>
        Password
        <input name="password" type="password" />
      </label>
    </form>
  )
}`

export const fieldGroupSnippet = `import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function BillingGroup() {
  const groupRef = useRef<HTMLFieldSetElement>(null)
  const { focused } = useFocusWithin(groupRef)

  return (
    <fieldset ref={groupRef}>
      <legend>Billing address</legend>
      <p>{focused ? 'Editing billing details' : 'Billing details idle'}</p>
      <label>
        Street
        <input name="street" type="text" />
      </label>
      <label>
        City
        <input name="city" type="text" />
      </label>
    </fieldset>
  )
}`

export const movingWithinSnippet = `import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function MovingWithinPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { focused } = useFocusWithin(panelRef)

  return (
    <div ref={panelRef}>
      <p>Focus within: {String(focused)}</p>
      <input type="text" aria-label="First field" />
      <input type="text" aria-label="Second field" />
      <button type="button">Inside action</button>
    </div>
  )
}`

export const targetFocusSnippet = `import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function FocusablePanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { focused } = useFocusWithin(panelRef)

  return (
    <div ref={panelRef} tabIndex={0}>
      <p>Focus within: {String(focused)}</p>
      <p>Tab to this panel or its children.</p>
    </div>
  )
}`

export const nestedControlsSnippet = `import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function NestedControls() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { focused } = useFocusWithin(rootRef)

  return (
    <div ref={rootRef}>
      <p>Focus within: {String(focused)}</p>
      <section>
        <label>
          Nested name
          <input type="text" />
        </label>
        <div>
          <label>
            Nested note
            <textarea rows={2} />
          </label>
        </div>
      </section>
    </div>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function DynamicTarget() {
  const [active, setActive] = useState<'a' | 'b'>('a')
  const ref = useRef<HTMLDivElement | null>(null)
  const { focused } = useFocusWithin(ref)

  return (
    <div>
      <button type="button" onClick={() => setActive('a')}>
        Track panel A
      </button>
      <button type="button" onClick={() => setActive('b')}>
        Track panel B
      </button>
      <div
        ref={(node) => {
          ref.current = node
        }}
      >
        {active === 'a' ? (
          <div data-panel="a">
            <input type="text" aria-label="Panel A field" />
          </div>
        ) : (
          <div data-panel="b">
            <input type="text" aria-label="Panel B field" />
          </div>
        )}
      </div>
      <p>Focus within: {String(focused)}</p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function EnabledStateForm() {
  const [enabled, setEnabled] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)
  const { focused } = useFocusWithin(formRef, { enabled })

  return (
    <form ref={formRef}>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Hook enabled
      </label>
      <p>Focus within: {String(focused)}</p>
      <label>
        Email
        <input type="email" />
      </label>
    </form>
  )
}`

export const portalBoundarySnippet = `import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function PortalBoundary() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null)
  const { focused } = useFocusWithin(containerRef)

  return (
    <>
      <div ref={containerRef}>
        <p>Focus within container: {String(focused)}</p>
        <input type="text" aria-label="Inside field" />
      </div>
      <div ref={setPortalRoot} />
      {portalRoot
        ? createPortal(
            <input type="text" aria-label="Portal field" />,
            portalRoot,
          )
        : null}
    </>
  )
}`

export const svgGroupSnippet = `import { useRef } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function SvgToolbar() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { focused } = useFocusWithin(svgRef)

  return (
    <svg ref={svgRef} role="group" aria-label="Icon toolbar" tabIndex={-1}>
      <title>Icon toolbar</title>
      <rect width="100%" height="100%" fill="transparent" />
      <circle cx="20" cy="20" r="12" role="button" tabIndex={0} aria-label="Circle tool" />
      <circle cx="60" cy="20" r="12" role="button" tabIndex={0} aria-label="Square tool" />
      <text x="0" y="48">
        Focus within: {String(focused)}
      </text>
    </svg>
  )
}`

export const customDocumentSnippet = `import { useRef, useState } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function CustomDocumentExample() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<HTMLDivElement | null>(null)
  const [, setReady] = useState(false)
  const { focused } = useFocusWithin(targetRef)

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Same-origin form"
        srcDoc="<div id='panel'><input id='inner' type='text' aria-label='Iframe field' /></div>"
        onLoad={() => {
          const doc = iframeRef.current?.contentDocument
          targetRef.current = doc?.getElementById('panel') as HTMLDivElement | null
          setReady(true)
        }}
      />
      <p>Focus within iframe panel: {String(focused)}</p>
    </>
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useFocusWithin } from '@muradyanvano/react-hooks'

export function Playground() {
  const [enabled, setEnabled] = useState(true)
  const [mounted, setMounted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const { focused } = useFocusWithin(formRef, { enabled })

  return (
    <div>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Hide form' : 'Show form'}
      </button>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      {mounted ? (
        <form ref={formRef}>
          <p>Focus in form: {String(focused)}</p>
          <label>
            Name
            <input type="text" />
          </label>
        </form>
      ) : null}
    </div>
  )
}`
