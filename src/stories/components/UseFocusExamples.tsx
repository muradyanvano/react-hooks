import { useEffect, useRef, useState } from 'react'
import { useFocus } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  alreadyFocusedSnippet,
  basicInputSnippet,
  customDocumentSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  focusControlsSnippet,
  focusVisibleSnippet,
  initialFocusSnippet,
  playgroundSnippet,
  preventScrollSnippet,
  svgTargetSnippet,
} from './useFocus.snippets'

const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const focusableSurfaceClass =
  'rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const inputClass =
  'w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

function focusStatusLabel(
  paragraphFocused: boolean,
  inputFocused: boolean,
  buttonFocused: boolean,
): string {
  if (inputFocused) {
    return 'The input control has focus'
  }

  if (paragraphFocused) {
    return 'The paragraph has focus'
  }

  if (buttonFocused) {
    return 'The button has focus'
  }

  return 'No tracked target has focus'
}

export function FocusControlsExample() {
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const paragraphFocus = useFocus(paragraphRef)
  const inputFocus = useFocus(inputRef)
  const buttonFocus = useFocus(buttonRef)

  const status = focusStatusLabel(
    paragraphFocus.focused,
    inputFocus.focused,
    buttonFocus.focused,
  )

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Focus controls"
      description="Three separate useFocus calls track direct focus on a paragraph, search input, and button. Status reflects native activeElement ownership — descendant focus does not count."
      instruction="Use the Focus text, Focus input, and Focus button commands, or Tab between targets. Keyboard focus updates the same boolean state as programmatic focus."
      code={focusControlsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Paragraph',
              value: String(paragraphFocus.focused),
              testId: 'fc-paragraph-value',
            },
            {
              label: 'Input',
              value: String(inputFocus.focused),
              testId: 'fc-input-value',
            },
            {
              label: 'Button',
              value: String(buttonFocus.focused),
              testId: 'fc-button-value',
            },
          ]}
        />
      }
    >
      <p
        ref={paragraphRef}
        tabIndex={0}
        data-testid="fc-paragraph"
        className={focusableSurfaceClass}
      >
        Paragraph that can be focused
      </p>

      <div className="mt-4 max-w-md space-y-2">
        <label
          htmlFor="fc-input"
          className="text-sm font-medium text-slate-700"
        >
          Search
        </label>
        <input
          ref={inputRef}
          id="fc-input"
          data-testid="fc-input"
          type="search"
          className={inputClass}
        />
      </div>

      <button
        ref={buttonRef}
        type="button"
        data-testid="fc-button"
        className={`mt-4 ${secondaryButtonClass}`}
      >
        Button that can be focused
      </button>

      <p
        className="mt-4 text-sm font-medium text-slate-800"
        aria-live="polite"
        data-testid="fc-status"
      >
        {status}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="fc-focus-text"
          className={primaryButtonClass}
          onClick={() => paragraphFocus.focus()}
        >
          Focus text
        </button>
        <button
          type="button"
          data-testid="fc-focus-input"
          className={primaryButtonClass}
          onClick={() => inputFocus.focus()}
        >
          Focus input
        </button>
        <button
          type="button"
          data-testid="fc-focus-button"
          className={primaryButtonClass}
          onClick={() => buttonFocus.focus()}
        >
          Focus button
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function BasicInputExample() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, {
    preventScroll: true,
  })

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Basic input"
      description="A labeled search field with imperative focus and blur helpers. preventScroll is enabled for programmatic focus requests."
      instruction="Tab to the field or use the buttons to move focus programmatically."
      badge={focused ? 'Focused' : 'Not focused'}
      code={basicInputSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focused',
              value: String(focused),
              testId: 'basic-focused-value',
            },
          ]}
        />
      }
    >
      <label
        htmlFor="basic-input"
        className="text-sm font-medium text-slate-700"
      >
        Search
      </label>
      <input
        ref={inputRef}
        id="basic-input"
        data-testid="basic-input"
        type="search"
        className={`mt-2 ${inputClass}`}
        aria-describedby="basic-help"
      />
      <p id="basic-help" className="mt-2 text-sm text-slate-600">
        {focused ? 'Search has focus' : 'Search is not focused'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="basic-focus-btn"
          className={primaryButtonClass}
          onClick={focus}
        >
          Focus search
        </button>
        <button
          type="button"
          data-testid="basic-blur-btn"
          className={secondaryButtonClass}
          onClick={blur}
        >
          Blur search
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function InitialFocusExample() {
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused } = useFocus(inputRef, {
    initialValue: true,
  })

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Initial focus"
      description="initialValue focuses the target once when it becomes available. Mount the field explicitly so Docs mode is not auto-focused on load."
      instruction="Click Mount field, observe one-time focus, then Tab away and rerender — focus is not stolen again."
      code={initialFocusSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'initial-mounted-value',
            },
            {
              label: 'Focused',
              value: String(focused),
              testId: 'initial-focused-value',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        data-testid="initial-toggle"
        className={secondaryButtonClass}
        onClick={() => setMounted((value) => !value)}
      >
        {mounted ? 'Unmount field' : 'Mount field'}
      </button>

      {mounted ? (
        <div className="mt-4 max-w-md space-y-2">
          <label
            htmlFor="initial-input"
            className="text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            ref={inputRef}
            id="initial-input"
            data-testid="initial-input"
            type="email"
            className={inputClass}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Field is unmounted.</p>
      )}
    </ExampleShowcase>
  )
}

export function PreventScrollExample() {
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const { focus } = useFocus(inputRef, { preventScroll: true })

  useEffect(() => {
    const panel = panelRef.current
    if (panel == null) {
      return undefined
    }

    const update = () => {
      setScrollTop(Math.round(panel.scrollTop))
    }

    update()
    panel.addEventListener('scroll', update)
    return () => {
      panel.removeEventListener('scroll', update)
    }
  }, [])

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Prevent scroll"
      description="preventScroll applies to hook-initiated focus inside a contained scroll panel. User scrolling is unaffected."
      instruction="Scroll the panel, then click Focus without scrolling. Scroll position should remain stable where the browser supports preventScroll."
      code={preventScrollSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Scroll top',
              value: String(scrollTop),
              testId: 'prevent-scroll-value',
            },
          ]}
        />
      }
    >
      <div
        ref={panelRef}
        data-testid="prevent-scroll-panel"
        className="h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3"
      >
        <div className="space-y-48">
          <p className="text-sm text-slate-600">Top of panel</p>
          <input
            ref={inputRef}
            data-testid="prevent-scroll-input"
            type="text"
            aria-label="Target field"
            className={inputClass}
          />
        </div>
      </div>
      <button
        type="button"
        data-testid="prevent-scroll-focus"
        className={`mt-3 ${primaryButtonClass}`}
        onClick={focus}
      >
        Focus without scrolling
      </button>
    </ExampleShowcase>
  )
}

export function FocusVisibleExample() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused } = useFocus(inputRef, { focusVisible: true })

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Focus visible"
      description="focusVisible filters on native :focus-visible matching. Pointer focus may leave focused false even when activeElement matches."
      instruction="Tab to the field for keyboard focus, or click for pointer focus. Compare the live boolean with the visible ring."
      code={focusVisibleSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus-visible',
              value: String(focused),
              testId: 'visible-focused-value',
            },
          ]}
        />
      }
    >
      <label
        htmlFor="visible-input"
        className="text-sm font-medium text-slate-700"
      >
        Name
      </label>
      <input
        ref={inputRef}
        id="visible-input"
        data-testid="visible-input"
        type="text"
        className={`mt-2 ${inputClass}`}
      />
      <p className="mt-2 text-sm text-slate-600">
        Native :focus-visible match: {String(focused)}
      </p>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const [attachTo, setAttachTo] = useState<'a' | 'b'>('a')
  const ref = useRef<HTMLInputElement | null>(null)
  const { focused, focus, blur } = useFocus(ref)

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Dynamic target"
      description="The same ref object tracks one input at a time. Replacement resets hook state without blurring the old browser focus automatically."
      instruction="Focus target A, switch tracking to B, then use Focus tracked target."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Tracked',
              value: attachTo.toUpperCase(),
              testId: 'dynamic-target-value',
            },
            {
              label: 'Focused',
              value: String(focused),
              testId: 'dynamic-focused-value',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-3">
        <input
          ref={attachTo === 'a' ? ref : undefined}
          data-testid="dynamic-target-a"
          type="text"
          aria-label="Target A"
          className={inputClass}
        />
        <input
          ref={attachTo === 'b' ? ref : undefined}
          data-testid="dynamic-target-b"
          type="text"
          aria-label="Target B"
          className={inputClass}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="dynamic-switch-b"
          className={secondaryButtonClass}
          onClick={() => setAttachTo('b')}
        >
          Switch to B
        </button>
        <button
          type="button"
          data-testid="dynamic-focus-btn"
          className={primaryButtonClass}
          onClick={focus}
        >
          Focus tracked target
        </button>
        <button
          type="button"
          data-testid="dynamic-blur-btn"
          className={secondaryButtonClass}
          onClick={blur}
        >
          Blur tracked target
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function AlreadyFocusedExample() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused } = useFocus(inputRef)

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Already focused"
      description="When a target is focused before listeners attach, the hook synchronizes from ownerDocument.activeElement after commit."
      instruction="Load the example — the field receives native focus once, then the hook reports true."
      code={alreadyFocusedSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focused',
              value: String(focused),
              testId: 'already-focused-value',
            },
          ]}
        />
      }
    >
      <input
        ref={(node) => {
          inputRef.current = node
          if (node != null && node.ownerDocument.activeElement !== node) {
            node.focus()
          }
        }}
        data-testid="already-focused-input"
        type="text"
        aria-label="Synchronized field"
        className={inputClass}
      />
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, { enabled })

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Enabled state"
      description="Disabling resets the hook boolean and makes focus/blur no-ops without removing browser focus from the element."
      instruction="Focus the field, disable the hook, then try the commands again."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'enabled-flag-value',
            },
            {
              label: 'Focused',
              value: String(focused),
              testId: 'enabled-focused-value',
            },
          ]}
        />
      }
    >
      <label
        htmlFor="enabled-input"
        className="text-sm font-medium text-slate-700"
      >
        Notes
      </label>
      <input
        ref={inputRef}
        id="enabled-input"
        data-testid="enabled-input"
        type="text"
        className={`mt-2 ${inputClass}`}
      />
      <button
        type="button"
        data-testid="enabled-toggle"
        className={`mt-3 ${secondaryButtonClass}`}
        onClick={() => setEnabled((value) => !value)}
      >
        Toggle enabled ({enabled ? 'on' : 'off'})
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="enabled-focus-btn"
          className={primaryButtonClass}
          onClick={focus}
        >
          Focus
        </button>
        <button
          type="button"
          data-testid="enabled-blur-btn"
          className={secondaryButtonClass}
          onClick={blur}
        >
          Blur
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function SvgTargetExample() {
  const circleRef = useRef<SVGCircleElement>(null)
  const { focused, focus } = useFocus(circleRef)

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="SVG focus"
      description="SVG elements with tabIndex={0} are valid UseFocusTarget values."
      instruction="Tab to the ring or use Focus SVG."
      code={svgTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focused',
              value: String(focused),
              testId: 'svg-focused-value',
            },
          ]}
        />
      }
    >
      <svg
        width="120"
        height="120"
        aria-labelledby="svg-focus-title"
        className="overflow-visible"
      >
        <title id="svg-focus-title">Focusable status ring</title>
        <circle
          ref={circleRef}
          data-testid="svg-target"
          cx="60"
          cy="60"
          r="40"
          tabIndex={0}
          className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          fill={focused ? '#4f46e5' : '#cbd5e1'}
        />
      </svg>
      <p className="mt-2 text-sm text-slate-600" data-testid="svg-label">
        {focused ? 'Active' : 'Inactive'}
      </p>
      <button
        type="button"
        data-testid="svg-focus-btn"
        className={`mt-3 ${primaryButtonClass}`}
        onClick={focus}
      >
        Focus SVG
      </button>
    </ExampleShowcase>
  )
}

export function CustomDocumentExample() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<HTMLInputElement | null>(null)
  const [ready, setReady] = useState(false)
  const { focused, focus } = useFocus(targetRef)

  const setupIframeTarget = () => {
    const doc = iframeRef.current?.contentDocument
    if (doc == null || targetRef.current != null) {
      return
    }

    const input = doc.createElement('input')
    input.type = 'text'
    input.setAttribute('aria-label', 'Iframe field')
    input.className = 'rounded border border-slate-300 px-2 py-1 text-sm'
    doc.body.appendChild(input)
    targetRef.current = input
    setReady(true)
  }

  useEffect(() => {
    return () => {
      targetRef.current?.remove()
      targetRef.current = null
      setReady(false)
    }
  }, [])

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Custom document"
      description="Active element is read from the target ownerDocument, not the parent page document."
      instruction="Focus the iframe field — parent document activeElement must not drive the boolean."
      code={customDocumentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Iframe focused',
              value: String(focused),
              testId: 'iframe-focused-value',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Same-origin focus demo"
        srcDoc="<!doctype html><html><body style='margin:8px;font-family:sans-serif'></body></html>"
        onLoad={setupIframeTarget}
        className="h-24 w-full max-w-md rounded-lg border border-slate-300 bg-white"
        data-testid="iframe-host"
      />
      <button
        type="button"
        data-testid="iframe-focus-btn"
        className={`mt-3 ${primaryButtonClass}`}
        onClick={focus}
        disabled={!ready}
      >
        Focus iframe field
      </button>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  initialValue = false,
  focusVisible = false,
  preventScroll = false,
}: {
  enabled?: boolean
  initialValue?: boolean
  focusVisible?: boolean
  preventScroll?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { focused, focus, blur } = useFocus(inputRef, {
    enabled,
    initialValue: mounted ? initialValue : false,
    focusVisible,
    preventScroll,
  })

  return (
    <ExampleShowcase
      hookName="useFocus"
      title="Playground"
      description="Mount the target before enabling initialValue so Docs mode is not auto-focused."
      instruction="Mount target, adjust controls, then focus or blur programmatically."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'pg-mounted-value',
            },
            {
              label: 'Focused',
              value: String(focused),
              testId: 'pg-focused-value',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        data-testid="pg-mount-toggle"
        className={secondaryButtonClass}
        onClick={() => setMounted((value) => !value)}
      >
        {mounted ? 'Unmount target' : 'Mount target'}
      </button>

      {mounted ? (
        <input
          ref={inputRef}
          data-testid="pg-target"
          type="text"
          aria-label="Playground target"
          className={`mt-3 ${inputClass}`}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="pg-focus-btn"
          className={primaryButtonClass}
          onClick={focus}
        >
          Focus
        </button>
        <button
          type="button"
          data-testid="pg-blur-btn"
          className={secondaryButtonClass}
          onClick={blur}
        >
          Blur
        </button>
      </div>
    </ExampleShowcase>
  )
}
