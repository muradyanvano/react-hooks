import { useCallback, useId, useRef, useState, type RefObject } from 'react'
import { useElementHover } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  cancelledTransitionsSnippet,
  delayedEnterSnippet,
  delayedLeaveSnippet,
  dynamicTargetSnippet,
  elementRemovalSnippet,
  enabledStateSnippet,
  hoverMeSnippet,
  immediateHoverSnippet,
  nestedContentSnippet,
  playgroundSnippet,
  svgTargetSnippet,
} from './useElementHover.snippets'

const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white outline-none transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

function HoverButton({
  label,
  hoveredLabel = 'Thank you!',
  isHovered,
  testId,
  buttonRef,
}: {
  label: string
  hoveredLabel?: string
  isHovered: boolean
  testId: string
  buttonRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid={testId}
      className={primaryButtonClass}
    >
      {isHovered ? hoveredLabel : label}
    </button>
  )
}

export function HoverMeExample({
  delayedEnterMs = 1000,
}: {
  delayedEnterMs?: number
}) {
  const immediateRef = useRef<HTMLButtonElement>(null)
  const delayedRef = useRef<HTMLButtonElement>(null)
  const immediateHover = useElementHover(immediateRef)
  const delayedHover = useElementHover(delayedRef, {
    delayEnter: delayedEnterMs,
  })

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Hover me"
      description="Two adjacent buttons show the same public API with different timing. Mouse hover only — keyboard focus does not change the boolean. Touch presses are outside this hook's scope."
      instruction="Hover the first button for an immediate reaction. Hover the second and keep the pointer still until its enter delay completes."
      code={hoverMeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Immediate',
              value: String(immediateHover),
              testId: 'hover-me-immediate-value',
            },
            {
              label: 'Delayed',
              value: String(delayedHover),
              testId: 'hover-me-delayed-value',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-3">
        <HoverButton
          buttonRef={immediateRef}
          testId="hover-me-immediate"
          label="Hover me"
          isHovered={immediateHover}
        />
        <HoverButton
          buttonRef={delayedRef}
          testId="hover-me-delayed"
          label="Hover me"
          isHovered={delayedHover}
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Delayed enter: {delayedEnterMs} ms. Essential content remains available
        without hover.
      </p>
    </ExampleShowcase>
  )
}

export function ImmediateHoverExample() {
  const cardRef = useRef<HTMLElement>(null)
  const isHovered = useElementHover(cardRef)

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Immediate hover"
      description="A profile card reacts as soon as the pointer crosses the card boundary. The greeting is decorative; the name and role stay visible without hover."
      instruction="Move the pointer over the card to read the live greeting."
      badge={isHovered ? 'Hovering' : 'Idle'}
      code={immediateHoverSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'immediate-hover-value',
            },
          ]}
        />
      }
    >
      <article
        ref={cardRef}
        data-testid="immediate-card"
        className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      >
        <h3 className="text-lg font-semibold text-slate-900">Alex Morgan</h3>
        <p className="text-sm text-slate-600">Product designer</p>
        <p
          data-testid="immediate-message"
          className="mt-3 text-sm font-medium text-indigo-700"
        >
          {isHovered ? 'Thanks for stopping by!' : 'Hover for a greeting'}
        </p>
      </article>
    </ExampleShowcase>
  )
}

export function DelayedEnterExample({
  delayEnter = 400,
}: {
  delayEnter?: number
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isHovered = useElementHover(triggerRef, { delayEnter })
  const panelId = useId()

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Delayed enter"
      description="A short enter delay avoids accidental activation when the pointer briefly crosses a dense UI. Pending UI below is Storybook-only — the hook exposes only the final boolean."
      instruction="Hover @alex and hold still until the preview activates. Move away quickly to cancel."
      badge={isHovered ? 'Open' : 'Closed'}
      code={delayedEnterSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'delayed-enter-value',
            },
            {
              label: 'Delay',
              value: `${delayEnter} ms`,
              testId: 'delayed-enter-ms',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-start gap-4">
        <button
          ref={triggerRef}
          type="button"
          data-testid="delayed-enter-trigger"
          className={secondaryButtonClass}
          aria-expanded={isHovered}
          aria-controls={panelId}
        >
          @alex
        </button>
        <div
          id={panelId}
          data-testid="delayed-enter-panel"
          className={`min-w-[12rem] rounded-xl border p-4 text-sm transition-opacity ${
            isHovered
              ? 'border-indigo-200 bg-indigo-50 text-indigo-900 opacity-100'
              : 'border-slate-200 bg-slate-50 text-slate-500 opacity-70'
          }`}
        >
          {isHovered
            ? 'Account preview: Alex Morgan · Product designer'
            : 'Preview appears after the configured enter delay.'}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function DelayedLeaveExample({
  delayLeave = 300,
}: {
  delayLeave?: number
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(menuRef, { delayLeave })

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Delayed leave"
      description="The trigger and related panel share one wrapper ref so moving between them keeps hover true. Leave delay gives the pointer time to travel without flicker."
      instruction="Hover the menu, move into the related panel, then leave to see the brief grace period."
      badge={isHovered ? 'Open' : 'Closed'}
      code={delayedLeaveSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'delayed-leave-value',
            },
            {
              label: 'Leave delay',
              value: `${delayLeave} ms`,
              testId: 'delayed-leave-ms',
            },
          ]}
        />
      }
    >
      <div
        ref={menuRef}
        data-testid="delayed-leave-menu"
        className="inline-flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
      >
        <button
          type="button"
          data-testid="delayed-leave-trigger"
          className={secondaryButtonClass}
        >
          Files
        </button>
        <div
          data-testid="delayed-leave-panel"
          className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
          aria-hidden={!isHovered}
        >
          {isHovered
            ? 'Related shortcuts stay open briefly while you move away.'
            : 'Panel hidden'}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function CancelledTransitionsExample({
  delayEnter = 500,
  delayLeave = 500,
}: {
  delayEnter?: number
  delayLeave?: number
}) {
  const targetRef = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(targetRef, { delayEnter, delayLeave })
  const [log, setLog] = useState<string[]>([])

  const pushLog = useCallback((entry: string) => {
    setLog((current) => [...current.slice(-4), entry])
  }, [])

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Cancelled transitions"
      description="Opposite transitions cancel pending timers. Leave before enter completes and the state never becomes true. Re-enter before leave completes and hover stays true."
      instruction="Cross the target quickly, re-enter during leave delay, and watch the transition log."
      badge={isHovered ? 'Hovering' : 'Idle'}
      code={cancelledTransitionsSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'cancelled-hover-value',
            },
          ]}
        />
      }
    >
      <div
        ref={targetRef}
        data-testid="cancelled-target"
        tabIndex={-1}
        aria-label="Delayed hover target"
        onMouseEnter={() => pushLog('mouseenter')}
        onMouseLeave={() => pushLog('mouseleave')}
        className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-6 text-sm text-slate-700"
      >
        <p data-testid="cancelled-status">
          {isHovered ? 'Hovering' : 'Not hovering'}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Enter delay {delayEnter} ms · Leave delay {delayLeave} ms
        </p>
      </div>
      <ol
        data-testid="cancelled-log"
        className="mt-3 list-decimal space-y-1 pl-5 text-xs text-slate-600"
      >
        {log.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </ExampleShowcase>
  )
}

export function NestedContentExample() {
  const tileRef = useRef<HTMLDivElement>(null)
  const isHovered = useElementHover(tileRef)

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Nested content"
      description="Native mouseenter and mouseleave track the observed boundary. Moving between descendants does not toggle the boolean."
      instruction="Move between the icon, heading, and description without leaving the tile."
      badge={isHovered ? 'Hovering' : 'Idle'}
      code={nestedContentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'nested-hover-value',
            },
          ]}
        />
      }
    >
      <div
        ref={tileRef}
        data-testid="nested-tile"
        className="max-w-md rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div aria-hidden="true" className="text-lg">
          ★
        </div>
        <h3 className="mt-2 text-base font-semibold text-slate-900">
          Analytics
        </h3>
        <p data-testid="nested-body" className="mt-2 text-sm text-slate-600">
          Moving between nested regions does not reset hover.
        </p>
        <p className="mt-3 text-xs font-medium text-indigo-700">
          Status: {isHovered ? 'hovering' : 'idle'}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function ElementRemovalExample({
  delayLeave = 200,
}: {
  delayLeave?: number
}) {
  const targetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(true)
  const isHovered = useElementHover(targetRef, {
    triggerOnRemoval: true,
    delayLeave,
  })

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Element removal"
      description="With triggerOnRemoval, removing the target or an ancestor starts a leave transition using delayLeave. Restoring the target requires a fresh mouseenter."
      instruction="Hover the target, remove it from the DOM, then restore it."
      badge={mounted ? 'Mounted' : 'Removed'}
      code={elementRemovalSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'removal-hover-value',
            },
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'removal-mounted-value',
            },
          ]}
        />
      }
    >
      {mounted ? (
        <div
          ref={targetRef}
          data-testid="removal-target"
          tabIndex={0}
          className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
        >
          Hover me, then remove me from the DOM.
        </div>
      ) : (
        <p className="text-sm text-slate-500">Target removed from the tree.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="removal-remove"
          className={secondaryButtonClass}
          onClick={() => {
            setMounted(false)
          }}
        >
          Remove target
        </button>
        <button
          type="button"
          data-testid="removal-restore"
          className={secondaryButtonClass}
          onClick={() => {
            setMounted(true)
          }}
        >
          Restore target
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const ref = useRef<HTMLButtonElement | null>(null)
  const [active, setActive] = useState<'a' | 'b'>('a')
  const isHovered = useElementHover(ref)

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Dynamic target"
      description="The same ref object tracks one active target at a time. Switching targets resets hover immediately without applying delayLeave."
      instruction="Hover target A, switch to target B, then hover B."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: active.toUpperCase(),
              testId: 'dynamic-active-value',
            },
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'dynamic-hover-value',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-3">
        <button
          ref={active === 'a' ? ref : undefined}
          type="button"
          data-testid="dynamic-target-a"
          className={secondaryButtonClass}
          onClick={() => setActive('a')}
        >
          Target A
        </button>
        <button
          ref={active === 'b' ? ref : undefined}
          type="button"
          data-testid="dynamic-target-b"
          className={secondaryButtonClass}
          onClick={() => setActive('b')}
        >
          Target B
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Active target: {active.toUpperCase()} · Hover: {String(isHovered)}
      </p>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const targetRef = useRef<HTMLButtonElement>(null)
  const [enabled, setEnabled] = useState(true)
  const isHovered = useElementHover(targetRef, { enabled })

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="Enabled state"
      description="Disabling detaches listeners, cancels pending timers, and resets hover to false. Re-enabling starts from false and waits for the next mouseenter."
      instruction="Toggle enabled off while hovering, then enable again."
      badge={enabled ? 'Enabled' : 'Disabled'}
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
              label: 'Hover',
              value: String(isHovered),
              testId: 'enabled-hover-value',
            },
          ]}
        />
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          data-testid="enabled-toggle"
          checked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
          className="size-4 rounded border-slate-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        Enabled
      </label>
      <HoverButton
        buttonRef={targetRef}
        testId="enabled-target"
        label="Hover me"
        isHovered={isHovered}
      />
    </ExampleShowcase>
  )
}

export function SvgTargetExample() {
  const shapeRef = useRef<SVGCircleElement>(null)
  const isHovered = useElementHover(shapeRef)
  const titleId = useId()

  return (
    <ExampleShowcase
      hookName="useElementHover"
      title="SVG target"
      description="Generic Element refs include SVG shapes. Hover detection uses the same native mouseenter and mouseleave listeners."
      instruction="Hover the circle to toggle its fill and label."
      badge={isHovered ? 'Active' : 'Idle'}
      code={svgTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'svg-hover-value',
            },
          ]}
        />
      }
    >
      <svg
        width="120"
        height="120"
        data-testid="svg-root"
        aria-labelledby={titleId}
        className="overflow-visible"
      >
        <title id={titleId}>Status badge</title>
        <circle
          ref={shapeRef}
          data-testid="svg-target"
          cx="60"
          cy="60"
          r="40"
          fill={isHovered ? '#4f46e5' : '#cbd5e1'}
        />
        <text x="60" y="65" textAnchor="middle" data-testid="svg-label">
          {isHovered ? 'Active' : 'Idle'}
        </text>
      </svg>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
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
    <ExampleShowcase
      hookName="useElementHover"
      title="Playground"
      description="Combine enabled, delayEnter, delayLeave, and triggerOnRemoval."
      instruction="Adjust the Controls panel and hover the button."
      badge={isHovered ? 'Hovering' : 'Idle'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Hover',
              value: String(isHovered),
              testId: 'pg-hover-value',
            },
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'pg-enabled-value',
            },
          ]}
        />
      }
    >
      <HoverButton
        buttonRef={targetRef}
        testId="pg-target"
        label="Hover me"
        isHovered={isHovered}
      />
    </ExampleShowcase>
  )
}
