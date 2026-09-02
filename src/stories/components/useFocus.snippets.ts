export const focusControlsSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function FocusControls() {
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const paragraphFocus = useFocus(paragraphRef)
  const inputFocus = useFocus(inputRef)
  const buttonFocus = useFocus(buttonRef)

  const status = inputFocus.focused
    ? 'The input control has focus'
    : paragraphFocus.focused
      ? 'The paragraph has focus'
      : buttonFocus.focused
        ? 'The button has focus'
        : 'No tracked target has focus'

  return (
    <section>
      <p ref={paragraphRef} tabIndex={0}>
        Paragraph that can be focused
      </p>

      <label htmlFor="focus-demo-input">Search</label>
      <input ref={inputRef} id="focus-demo-input" type="search" />

      <button ref={buttonRef} type="button">
        Button that can be focused
      </button>

      <p aria-live="polite">{status}</p>

      <button type="button" onClick={() => paragraphFocus.focus()}>
        Focus text
      </button>
      <button type="button" onClick={() => inputFocus.focus()}>
        Focus input
      </button>
      <button type="button" onClick={() => buttonFocus.focus()}>
        Focus button
      </button>
    </section>
  )
}`

export const basicInputSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function SearchField() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, {
    preventScroll: true,
  })

  return (
    <section>
      <label htmlFor="search">Search</label>
      <input ref={inputRef} id="search" type="search" />

      <p>{focused ? 'Search has focus' : 'Search is not focused'}</p>

      <button type="button" onClick={focus}>
        Focus search
      </button>

      <button type="button" onClick={blur}>
        Blur search
      </button>
    </section>
  )
}`

export const initialFocusSnippet = `import { useRef, useState } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function InitialFocusField() {
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused } = useFocus(inputRef, {
    initialValue: true,
  })

  return (
    <section>
      <button type="button" onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount field' : 'Mount field'}
      </button>

      {mounted ? (
        <>
          <label htmlFor="initial">Email</label>
          <input ref={inputRef} id="initial" type="email" />
          <p>Focused: {String(focused)}</p>
        </>
      ) : null}
    </section>
  )
}`

export const preventScrollSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function PreventScrollPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focus } = useFocus(inputRef, { preventScroll: true })

  return (
    <div style={{ height: 240, overflow: 'auto' }}>
      <div style={{ height: 480 }}>
        <input ref={inputRef} type="text" aria-label="Target field" />
        <button type="button" onClick={focus}>
          Focus without scrolling
        </button>
      </div>
    </div>
  )
}`

export const focusVisibleSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function FocusVisibleField() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused } = useFocus(inputRef, { focusVisible: true })

  return (
    <section>
      <label htmlFor="visible">Name</label>
      <input ref={inputRef} id="visible" type="text" />
      <p>Focus-visible match: {String(focused)}</p>
    </section>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function SwitchableFocusTarget() {
  const [target, setTarget] = useState<'a' | 'b'>('a')
  const ref = useRef<HTMLInputElement | null>(null)
  const { focused, focus, blur } = useFocus(ref)

  return (
    <section>
      <input
        ref={target === 'a' ? ref : undefined}
        type="text"
        aria-label="Target A"
      />
      <input
        ref={target === 'b' ? ref : undefined}
        type="text"
        aria-label="Target B"
      />
      <button type="button" onClick={() => setTarget('b')}>
        Switch target
      </button>
      <p>Focused: {String(focused)}</p>
      <button type="button" onClick={focus}>
        Focus tracked target
      </button>
      <button type="button" onClick={blur}>
        Blur tracked target
      </button>
    </section>
  )
}`

export const alreadyFocusedSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function AlreadyFocusedField() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused } = useFocus(inputRef)

  return (
    <input
      ref={(node) => {
        inputRef.current = node
        node?.focus()
      }}
      type="text"
      aria-label="Synchronized field"
      data-focused={String(focused)}
    />
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function EnabledFocusField() {
  const [enabled, setEnabled] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, { enabled })

  return (
    <section>
      <label htmlFor="enabled-input">Notes</label>
      <input ref={inputRef} id="enabled-input" type="text" />
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        Toggle enabled
      </button>
      <p>Hook focused: {String(focused)}</p>
      <button type="button" onClick={focus}>
        Focus
      </button>
      <button type="button" onClick={blur}>
        Blur
      </button>
    </section>
  )
}`

export const svgTargetSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function SvgFocusTarget() {
  const circleRef = useRef<SVGCircleElement>(null)
  const { focused, focus } = useFocus(circleRef)

  return (
    <section>
      <svg width="120" height="120" aria-labelledby="svg-focus-title">
        <title id="svg-focus-title">Focusable status ring</title>
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r="40"
          tabIndex={0}
          fill={focused ? '#4f46e5' : '#cbd5e1'}
        />
      </svg>
      <p>SVG focused: {String(focused)}</p>
      <button type="button" onClick={focus}>
        Focus SVG
      </button>
    </section>
  )
}`

export const customDocumentSnippet = `import { useEffect, useRef, useState } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function IframeFocusTarget() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [target, setTarget] = useState<HTMLInputElement | null>(null)
  const { focused, focus } = useFocus({ current: target })

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (doc == null) {
      return undefined
    }

    const input = doc.createElement('input')
    input.type = 'text'
    input.setAttribute('aria-label', 'Iframe field')
    doc.body.appendChild(input)
    setTarget(input)

    return () => {
      input.remove()
      setTarget(null)
    }
  }, [])

  return (
    <section>
      <iframe ref={iframeRef} title="Same-origin focus demo" srcDoc="<body></body>" />
      <p>Iframe focused: {String(focused)}</p>
      <button type="button" onClick={focus}>
        Focus iframe field
      </button>
    </section>
  )
}`

export const playgroundSnippet = `import { useRef } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

export function FocusPlayground() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, {
    enabled: true,
    initialValue: false,
    focusVisible: false,
    preventScroll: false,
  })

  return (
    <section>
      <input ref={inputRef} type="text" aria-label="Playground target" />
      <p>Focused: {String(focused)}</p>
      <button type="button" onClick={focus}>
        Focus
      </button>
      <button type="button" onClick={blur}>
        Blur
      </button>
    </section>
  )
}`
