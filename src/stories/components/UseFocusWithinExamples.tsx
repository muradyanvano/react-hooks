import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFocusWithin } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  customDocumentSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  fieldGroupSnippet,
  focusInFormSnippet,
  movingWithinSnippet,
  nestedControlsSnippet,
  playgroundSnippet,
  portalBoundarySnippet,
  svgGroupSnippet,
  targetFocusSnippet,
} from './useFocusWithin.snippets'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
const labelClass = 'block space-y-1 text-sm font-medium text-slate-700'
const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

const activeFormClass =
  'rounded-xl border-2 border-indigo-500 bg-indigo-50/40 p-4 shadow-sm transition-colors'
const idleFormClass =
  'rounded-xl border border-slate-300 bg-white p-4 shadow-sm transition-colors'

export function FocusInFormExample() {
  const formRef = useRef<HTMLFormElement>(null)
  const outsideRef = useRef<HTMLButtonElement>(null)
  const { focused } = useFocusWithin(formRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Focus in form"
      description="One useFocusWithin call tracks the whole form. Any direct child focus keeps the boolean true; moving between fields does not flicker false."
      instruction="Tab through First Name, Last Name, Email, and Password, or click each field. Use the outside button to leave the form."
      code={focusInFormSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'form-focused-value',
            },
          ]}
        />
      }
    >
      <form
        ref={formRef}
        className={focused ? activeFormClass : idleFormClass}
        data-testid="contact-form"
      >
        <p
          className="mb-4 text-sm font-medium text-slate-800"
          aria-live="polite"
          data-testid="form-status"
        >
          Focus in form: {String(focused)}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            First Name
            <input
              data-testid="field-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Last Name
            <input
              data-testid="field-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Email
            <input
              data-testid="field-email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Password
            <input
              data-testid="field-password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
        </div>
      </form>

      <button
        ref={outsideRef}
        type="button"
        data-testid="outside-button"
        className={`mt-4 ${secondaryButtonClass}`}
      >
        Outside the form
      </button>
    </ExampleShowcase>
  )
}

export function FieldGroupExample() {
  const groupRef = useRef<HTMLFieldSetElement>(null)
  const { focused } = useFocusWithin(groupRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Field group"
      description="A billing fieldset uses focus-within styling while any nested control is active."
      instruction="Focus a billing field to highlight the group border and helper text."
      code={fieldGroupSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'group-focused-value',
            },
          ]}
        />
      }
    >
      <fieldset
        ref={groupRef}
        className={`space-y-3 ${focused ? activeFormClass : idleFormClass}`}
        data-testid="billing-group"
      >
        <legend className="px-1 text-sm font-semibold text-slate-800">
          Billing address
        </legend>
        <p className="text-sm text-slate-600">
          {focused
            ? 'Editing billing details'
            : 'Billing details remain readable without focus.'}
        </p>
        <label className={labelClass}>
          Street
          <input
            data-testid="group-street"
            name="street"
            type="text"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          City
          <input
            data-testid="group-city"
            name="city"
            type="text"
            className={inputClass}
          />
        </label>
      </fieldset>
    </ExampleShowcase>
  )
}

export function MovingWithinExample() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { focused } = useFocusWithin(panelRef)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    // Story-only transition log for the moving-within demo.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional status history
    setHistory((previous) => [...previous, String(focused)])
  }, [focused])

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Moving within"
      description="Moving between child controls should never produce a false transition in the status history."
      instruction="Tab from the first field to the second field and the button. The history should stay true once focus enters."
      code={movingWithinSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Current',
              value: String(focused),
              testId: 'moving-focused-value',
            },
            {
              label: 'History',
              value: history.join(' → ') || 'false',
              testId: 'moving-history',
            },
          ]}
        />
      }
    >
      <div
        ref={panelRef}
        className={`space-y-3 ${focused ? activeFormClass : idleFormClass}`}
        data-testid="moving-panel"
      >
        <p className="text-sm font-medium text-slate-800">
          Focus within: {String(focused)}
        </p>
        <input
          data-testid="moving-field-a"
          type="text"
          aria-label="First field"
          className={inputClass}
        />
        <input
          data-testid="moving-field-b"
          type="text"
          aria-label="Second field"
          className={inputClass}
        />
        <button
          type="button"
          data-testid="moving-button"
          className={secondaryButtonClass}
        >
          Inside action
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function TargetFocusExample() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { focused } = useFocusWithin(panelRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Target focus"
      description="Focusing the container itself also counts as focus within when the target is focusable."
      instruction="Tab to the panel or click it directly."
      code={targetFocusSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'target-focused-value',
            },
          ]}
        />
      }
    >
      <div
        ref={panelRef}
        tabIndex={0}
        data-testid="target-panel"
        className={`${focused ? activeFormClass : idleFormClass} outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
      >
        <p className="text-sm font-medium text-slate-800">
          Focus within: {String(focused)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          This panel uses tabIndex={'{0}'} so the container can receive direct
          focus.
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function NestedControlsExample() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { focused } = useFocusWithin(rootRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Nested controls"
      description="Deeply nested regions stay active while focus moves between descendants."
      instruction="Tab through the nested name field and note textarea."
      code={nestedControlsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'nested-focused-value',
            },
          ]}
        />
      }
    >
      <div
        ref={rootRef}
        className={`space-y-3 ${focused ? activeFormClass : idleFormClass}`}
        data-testid="nested-root"
      >
        <p className="text-sm font-medium text-slate-800">
          Focus within: {String(focused)}
        </p>
        <section className="space-y-3 rounded-lg border border-slate-200 p-3">
          <label className={labelClass}>
            Nested name
            <input
              data-testid="nested-name"
              type="text"
              className={inputClass}
            />
          </label>
          <div>
            <label className={labelClass}>
              Nested note
              <textarea
                data-testid="nested-note"
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
        </section>
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const [attachTo, setAttachTo] = useState<'a' | 'b'>('a')
  const ref = useRef<HTMLDivElement | null>(null)
  const { focused } = useFocusWithin(ref)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Dynamic target"
      description="Switching the tracked container resets hook state without moving browser focus."
      instruction="Focus a field, switch panels, then focus the new panel field."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'dynamic-focused-value',
            },
            {
              label: 'Tracking',
              value: attachTo === 'a' ? 'Panel A' : 'Panel B',
              testId: 'dynamic-target-label',
            },
          ]}
        />
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="dynamic-switch-a"
          className={secondaryButtonClass}
          onClick={() => setAttachTo('a')}
        >
          Track panel A
        </button>
        <button
          type="button"
          data-testid="dynamic-switch-b"
          className={secondaryButtonClass}
          onClick={() => setAttachTo('b')}
        >
          Track panel B
        </button>
      </div>

      <div
        ref={(node) => {
          ref.current = node
        }}
        className={`${focused ? activeFormClass : idleFormClass}`}
        data-testid="dynamic-shell"
      >
        {attachTo === 'a' ? (
          <div data-testid="dynamic-panel-a">
            <label className={labelClass}>
              Panel A field
              <input
                data-testid="dynamic-field-a"
                type="text"
                className={inputClass}
              />
            </label>
          </div>
        ) : (
          <div data-testid="dynamic-panel-b">
            <label className={labelClass}>
              Panel B field
              <input
                data-testid="dynamic-field-b"
                type="text"
                className={inputClass}
              />
            </label>
          </div>
        )}
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)
  const { focused } = useFocusWithin(formRef, { enabled })

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Enabled state"
      description="Disabling the hook reports false without blurring actual browser focus."
      instruction="Focus the email field, disable the hook, then re-enable it."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'enabled-toggle-value',
            },
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'enabled-focused-value',
            },
          ]}
        />
      }
    >
      <form
        ref={formRef}
        className={`space-y-3 ${focused ? activeFormClass : idleFormClass}`}
        data-testid="enabled-form"
      >
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            data-testid="enabled-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Hook enabled
        </label>
        <p className="text-sm font-medium text-slate-800">
          Focus within: {String(focused)}
        </p>
        <label className={labelClass}>
          Email
          <input
            data-testid="enabled-email"
            type="email"
            className={inputClass}
          />
        </label>
      </form>
    </ExampleShowcase>
  )
}

export function PortalBoundaryExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null)
  const { focused } = useFocusWithin(containerRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Portal boundary"
      description="React portals rendered outside the DOM subtree do not count, even when visually nearby."
      instruction="Focus the inside field, then the portal field. Only inside focus counts."
      code={portalBoundarySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'portal-focused-value',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className={`space-y-3 ${focused ? activeFormClass : idleFormClass}`}
        data-testid="portal-container"
      >
        <p className="text-sm font-medium text-slate-800">
          Focus within container: {String(focused)}
        </p>
        <label className={labelClass}>
          Inside field
          <input
            data-testid="portal-inside-input"
            type="text"
            className={inputClass}
          />
        </label>
      </div>

      <div ref={setPortalRoot} data-testid="portal-root" className="mt-4" />
      {portalRoot != null
        ? createPortal(
            <label className={`${labelClass} mt-2 block`}>
              Portal field
              <input
                data-testid="portal-outside-input"
                type="text"
                className={inputClass}
              />
            </label>,
            portalRoot,
          )
        : null}
    </ExampleShowcase>
  )
}

export function SvgGroupExample() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { focused } = useFocusWithin(svgRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="SVG group"
      description="Generic Element typing supports SVG containers with focusable child shapes."
      instruction="Tab to each SVG tool shape."
      code={svgGroupSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'svg-focused-value',
            },
          ]}
        />
      }
    >
      <svg
        ref={svgRef}
        role="group"
        aria-label="Icon toolbar"
        viewBox="0 0 220 70"
        className={`h-auto w-full max-w-md outline-none ${focused ? 'rounded-xl ring-2 ring-indigo-500' : 'rounded-xl ring-1 ring-slate-300'}`}
        data-testid="svg-toolbar"
      >
        <title>Icon toolbar</title>
        <rect width="220" height="70" fill="transparent" />
        <circle
          cx="35"
          cy="35"
          r="16"
          role="button"
          tabIndex={0}
          aria-label="Circle tool"
          data-testid="svg-circle"
          className="fill-indigo-100 stroke-indigo-600 stroke-2 focus:outline-none focus-visible:stroke-[4]"
        />
        <circle
          cx="95"
          cy="35"
          r="16"
          role="button"
          tabIndex={0}
          aria-label="Square tool"
          data-testid="svg-square"
          className="fill-indigo-100 stroke-indigo-600 stroke-2 focus:outline-none focus-visible:stroke-[4]"
        />
        <text x="130" y="40" className="fill-slate-800 text-sm">
          {`Focus within: ${String(focused)}`}
        </text>
      </svg>
    </ExampleShowcase>
  )
}

export function CustomDocumentExample() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const targetRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const { focused } = useFocusWithin(targetRef)

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Custom document"
      description="Same-origin iframe targets use their owning document activeElement."
      instruction="Wait for the iframe to load, focus the inner field, then compare with the parent field."
      code={customDocumentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Ready',
              value: String(ready),
              testId: 'iframe-ready-value',
            },
            {
              label: 'Focus within',
              value: String(focused),
              testId: 'iframe-focused-value',
            },
          ]}
        />
      }
    >
      <iframe
        ref={iframeRef}
        title="Same-origin panel"
        className="h-28 w-full max-w-md rounded-lg border border-slate-300"
        srcDoc="<div id='panel' style='padding:12px'><label>Inner field<input id='inner' type='text' style='display:block;margin-top:8px' /></label></div>"
        data-testid="iframe-panel"
        onLoad={() => {
          const doc = iframeRef.current?.contentDocument
          targetRef.current = doc?.getElementById(
            'panel',
          ) as HTMLDivElement | null
          setReady(true)
        }}
      />
      <label className={`${labelClass} mt-4 max-w-md`}>
        Parent field
        <input
          data-testid="iframe-parent-input"
          type="text"
          className={inputClass}
        />
      </label>
      <p
        className="mt-3 text-sm font-medium text-slate-800"
        data-testid="iframe-status"
      >
        Focus within iframe panel: {String(focused)}
      </p>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({ enabled = true }: { enabled?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const { focused } = useFocusWithin(formRef, { enabled })

  return (
    <ExampleShowcase
      hookName="useFocusWithin"
      title="Playground"
      description="Toggle enabled and mount the form explicitly to avoid Docs autofocus."
      instruction="Show the form, focus a field, then experiment with enabled."
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
              label: 'Focus within',
              value: String(focused),
              testId: 'pg-focused-value',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="pg-mount-toggle"
          className={primaryButtonClass}
          onClick={() => setMounted((value) => !value)}
        >
          {mounted ? 'Hide form' : 'Show form'}
        </button>
      </div>

      {mounted ? (
        <form
          ref={formRef}
          className={`mt-4 space-y-3 ${focused ? activeFormClass : idleFormClass}`}
          data-testid="pg-form"
        >
          <p className="text-sm font-medium text-slate-800">
            Focus in form: {String(focused)}
          </p>
          <label className={labelClass}>
            Name
            <input data-testid="pg-name" type="text" className={inputClass} />
          </label>
        </form>
      ) : null}
    </ExampleShowcase>
  )
}
