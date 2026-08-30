import { useEffect, useId, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  ancestorSnippet,
  enabledSnippet,
  overviewSnippet,
  playgroundSnippet,
  replacementSnippet,
  svgSnippet,
} from './useOnElementRemoval.snippets'

function primaryButtonClassName(disabled = false) {
  return `inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
    disabled
      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
      : 'bg-indigo-600 text-white hover:bg-indigo-500'
  }`
}

function secondaryButtonClassName() {
  return 'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
}

function WidgetGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
      <path d="M7 10h6M10 7v6" strokeLinecap="round" />
    </svg>
  )
}

export function OverviewExample() {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const [instanceId, setInstanceId] = useState(1)
  const [present, setPresent] = useState(true)
  const [removalCount, setRemovalCount] = useState(0)
  const [lastRemoved, setLastRemoved] = useState('None yet')
  const [, setSyncTick] = useState(0)
  const statusId = useId()

  useEffect(() => {
    const host = hostRef.current
    if (host == null || !present) {
      widgetRef.current = null
      host?.replaceChildren()
      return
    }

    const widget = document.createElement('div')
    widget.dataset.testid = 'external-widget'
    widget.dataset.instance = String(instanceId)
    widget.className =
      'rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900'
    widget.textContent = `External widget #${instanceId}`
    host.replaceChildren(widget)
    widgetRef.current = widget
    setSyncTick((tick) => tick + 1)

    return () => {
      widget.remove()
      widgetRef.current = null
    }
  }, [instanceId, present])

  useOnElementRemoval(widgetRef, (element) => {
    setPresent(false)
    setRemovalCount((count) => count + 1)
    setLastRemoved(
      element.getAttribute('data-instance') ?? element.tagName.toLowerCase(),
    )
  })

  return (
    <ExampleShowcase
      hookName="useOnElementRemoval"
      title="External widget lifecycle"
      description="Observe an imperatively mounted external widget. Detection uses MutationObserver after DOM removal — not ordinary React conditional rendering."
      instruction="Use Simulate external removal to detach the widget from the DOM. Restore mounts a new element instance that becomes observed after the next commit."
      badge={present ? 'Mounted' : 'Removed'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Widget',
              value: present ? `Mounted #${instanceId}` : 'Removed',
              testId: 'widget-state',
            },
            {
              label: 'Observer',
              value: present ? 'Active' : 'Idle',
              testId: 'observer-state',
            },
            {
              label: 'Removals',
              value: String(removalCount),
              testId: 'removal-count',
            },
            {
              label: 'Last removed',
              value: lastRemoved,
              testId: 'last-removed',
            },
          ]}
        />
      }
    >
      <div
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        aria-describedby={statusId}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <WidgetGlyph />
          External host
        </div>
        <div
          ref={hostRef}
          className="min-h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
          data-testid="external-host"
        />
        <p id={statusId} className="text-sm text-slate-600" aria-live="polite">
          {present
            ? `Watching external widget #${instanceId}.`
            : 'Widget removed from the document tree.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClassName(!present)}
            data-testid="simulate-removal"
            disabled={!present}
            onClick={() => {
              widgetRef.current?.remove()
            }}
          >
            Simulate external removal
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="restore-widget"
            onClick={() => {
              setInstanceId((value) => value + 1)
              setPresent(true)
            }}
          >
            Restore new widget
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function AncestorRemovalExample() {
  const rootRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [generation, setGeneration] = useState(1)
  const [status, setStatus] = useState('Observing nested target')
  const [removals, setRemovals] = useState(0)
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (root == null) {
      return
    }

    root.replaceChildren()

    const sibling = document.createElement('div')
    sibling.dataset.testid = 'unrelated-sibling'
    sibling.className =
      'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'
    sibling.textContent = 'Unrelated sibling'

    const ancestor = document.createElement('div')
    ancestor.dataset.testid = 'widget-shell'
    ancestor.className =
      'space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3'

    const shellLabel = document.createElement('p')
    shellLabel.className =
      'text-xs font-semibold tracking-wide text-indigo-700 uppercase'
    shellLabel.textContent = 'Widget shell'

    const shell = document.createElement('div')
    shell.dataset.testid = 'inner-shell'
    shell.className = 'rounded-md border border-indigo-200 bg-white p-2'

    const target = document.createElement('div')
    target.dataset.testid = 'observed-target'
    target.dataset.generation = String(generation)
    target.className =
      'rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white'
    target.textContent = `Observed target #${generation}`

    shell.append(target)
    ancestor.append(shellLabel, shell)
    root.append(ancestor, sibling)
    targetRef.current = target
    setSyncTick((tick) => tick + 1)

    return () => {
      targetRef.current = null
      root.replaceChildren()
    }
  }, [generation])

  useOnElementRemoval(targetRef, (element) => {
    setRemovals((count) => count + 1)
    setStatus(
      `Detected removal of target #${element.getAttribute('data-generation')}`,
    )
  })

  return (
    <ExampleShowcase
      hookName="useOnElementRemoval"
      title="Ancestor removal"
      description="Removing an ancestor that contains the observed target counts as removal. Removing an unrelated sibling does not."
      instruction="Try Remove unrelated sibling first, then Remove ancestor shell. Restore hierarchy to remount a new nested target."
      badge={status.startsWith('Detected') ? 'Detected' : 'Watching'}
      code={ancestorSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'ancestor-status' },
            {
              label: 'Removals',
              value: String(removals),
              testId: 'ancestor-removals',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          External container
        </p>
        <div ref={rootRef} className="space-y-3" data-testid="ancestor-root" />
        <p className="text-sm text-slate-600" aria-live="polite">
          {status}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="remove-sibling"
            onClick={() => {
              rootRef.current
                ?.querySelector('[data-testid="unrelated-sibling"]')
                ?.remove()
            }}
          >
            Remove unrelated sibling
          </button>
          <button
            type="button"
            className={primaryButtonClassName()}
            data-testid="remove-ancestor"
            onClick={() => {
              rootRef.current
                ?.querySelector('[data-testid="widget-shell"]')
                ?.remove()
            }}
          >
            Remove ancestor shell
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="restore-hierarchy"
            onClick={() => {
              setGeneration((value) => value + 1)
              setStatus('Observing nested target')
            }}
          >
            Restore hierarchy
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const hostRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [present, setPresent] = useState(true)
  const [instanceId, setInstanceId] = useState(1)
  const [removals, setRemovals] = useState(0)
  const [, setSyncTick] = useState(0)
  const enabledId = useId()

  useEffect(() => {
    const host = hostRef.current
    if (host == null || !present) {
      targetRef.current = null
      host?.replaceChildren()
      return
    }

    const target = document.createElement('div')
    target.dataset.testid = 'monitored-target'
    target.className =
      'rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900'
    target.textContent = `Monitored target #${instanceId}`
    host.replaceChildren(target)
    targetRef.current = target
    setSyncTick((tick) => tick + 1)

    return () => {
      target.remove()
      targetRef.current = null
    }
  }, [instanceId, present])

  useOnElementRemoval(
    targetRef,
    () => {
      setPresent(false)
      setRemovals((count) => count + 1)
    },
    { enabled },
  )

  return (
    <ExampleShowcase
      hookName="useOnElementRemoval"
      title="Enabled and paused observation"
      description="When observation is paused, external removals are ignored. Enabling again watches the current connected target after the next sync."
      instruction="Pause observation, remove the target, then restore and enable to detect a later removal."
      badge={enabled ? 'Enabled' : 'Paused'}
      code={enabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Detection',
              value: enabled ? 'Enabled' : 'Paused',
              testId: 'enabled-state',
            },
            {
              label: 'Target',
              value: present ? 'Present' : 'Removed',
              testId: 'enabled-target-state',
            },
            {
              label: 'Removals',
              value: String(removals),
              testId: 'enabled-removals',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor={enabledId}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-800"
        >
          <input
            id={enabledId}
            type="checkbox"
            checked={enabled}
            data-testid="enabled-checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onChange={(event) => {
              setEnabled(event.target.checked)
            }}
          />
          Observation enabled
        </label>
        <div
          ref={hostRef}
          className="min-h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
          data-testid="enabled-host"
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {enabled
            ? 'Removals are observed.'
            : 'Paused observation ignores removal.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClassName(!present)}
            data-testid="enabled-remove"
            disabled={!present}
            onClick={() => {
              targetRef.current?.remove()
            }}
          >
            Simulate removal
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="enabled-restore"
            onClick={() => {
              setInstanceId((value) => value + 1)
              setPresent(true)
            }}
          >
            Restore target
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function ElementReplacementExample() {
  const hostRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [instanceId, setInstanceId] = useState(1)
  const [observed, setObserved] = useState('Waiting')
  const [lastRemoved, setLastRemoved] = useState('None yet')
  const [present, setPresent] = useState(true)
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (host == null || !present) {
      targetRef.current = null
      host?.replaceChildren()
      return
    }

    const target = document.createElement('div')
    target.dataset.testid = 'replacement-target'
    target.dataset.instance = String(instanceId)
    target.className =
      'rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white'
    target.textContent = `Instance #${instanceId}`
    host.replaceChildren(target)
    targetRef.current = target
    setObserved(`Observing #${instanceId}`)
    setSyncTick((tick) => tick + 1)

    return () => {
      target.remove()
      targetRef.current = null
    }
  }, [instanceId, present])

  useOnElementRemoval(targetRef, (element) => {
    setPresent(false)
    setLastRemoved(element.getAttribute('data-instance') ?? 'unknown')
    setObserved('Awaiting replacement')
  })

  return (
    <ExampleShowcase
      hookName="useOnElementRemoval"
      title="Element replacement"
      description="After a React commit assigns a new external element instance to the same ref, observation switches to that instance."
      instruction="Remove the current instance, then mount the next instance. The status should track the latest connected element after commit."
      badge={present ? `Instance #${instanceId}` : 'Awaiting'}
      code={replacementSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Observed',
              value: observed,
              testId: 'replacement-observed',
            },
            {
              label: 'Current id',
              value: present ? String(instanceId) : 'None',
              testId: 'replacement-current',
            },
            {
              label: 'Last removed',
              value: lastRemoved,
              testId: 'replacement-last-removed',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          ref={hostRef}
          className="min-h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
          data-testid="replacement-host"
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {observed}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClassName(!present)}
            data-testid="replacement-remove"
            disabled={!present}
            onClick={() => {
              targetRef.current?.remove()
            }}
          >
            Remove current instance
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="replacement-next"
            onClick={() => {
              setInstanceId((value) => value + 1)
              setPresent(true)
            }}
          >
            Mount next instance
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function SvgRemovalExample() {
  const svgRef = useRef<SVGSVGElement>(null)
  const shapeRef = useRef<SVGRectElement>(null)
  const [present, setPresent] = useState(true)
  const [generation, setGeneration] = useState(1)
  const [status, setStatus] = useState('Observing SVG shape')
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const svg = svgRef.current
    if (svg == null || !present) {
      shapeRef.current = null
      while (svg?.lastChild) {
        svg.removeChild(svg.lastChild)
      }
      return
    }

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('data-testid', 'svg-shape')
    rect.setAttribute('data-generation', String(generation))
    rect.setAttribute('x', '16')
    rect.setAttribute('y', '16')
    rect.setAttribute('width', '64')
    rect.setAttribute('height', '64')
    rect.setAttribute('rx', '12')
    rect.setAttribute('fill', '#4f46e5')
    svg.append(rect)
    shapeRef.current = rect
    setSyncTick((tick) => tick + 1)

    return () => {
      rect.remove()
      shapeRef.current = null
    }
  }, [generation, present])

  useOnElementRemoval(shapeRef, (element) => {
    setPresent(false)
    setStatus(
      `Detected SVG removal #${element.getAttribute('data-generation')}`,
    )
  })

  return (
    <ExampleShowcase
      hookName="useOnElementRemoval"
      title="SVG removal"
      description="Generic Element support includes SVG nodes. The hook captures the observed shape instance and reports it after external removal."
      instruction="Remove the indigo square from the SVG, then restore it as a new shape instance."
      badge={present ? 'Shape present' : 'Shape removed'}
      code={svgSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'svg-status' },
            {
              label: 'Generation',
              value: String(generation),
              testId: 'svg-generation',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-center rounded-xl bg-slate-50 p-4">
          <svg
            ref={svgRef}
            width="96"
            height="96"
            viewBox="0 0 96 96"
            role="img"
            aria-label="Observed indigo square"
            data-testid="svg-root"
            className="overflow-visible"
          />
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          {status}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClassName(!present)}
            data-testid="svg-remove"
            disabled={!present}
            onClick={() => {
              shapeRef.current?.remove()
            }}
          >
            Remove SVG shape
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="svg-restore"
            onClick={() => {
              setGeneration((value) => value + 1)
              setPresent(true)
              setStatus('Observing SVG shape')
            }}
          >
            Restore SVG shape
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({ enabled = true }: { enabled?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [instanceId, setInstanceId] = useState(1)
  const [present, setPresent] = useState(true)
  const [removals, setRemovals] = useState(0)
  const [lastRemoved, setLastRemoved] = useState('None yet')
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (host == null || !present) {
      targetRef.current = null
      host?.replaceChildren()
      return
    }

    const target = document.createElement('div')
    target.dataset.testid = 'playground-target'
    target.dataset.instance = String(instanceId)
    target.className =
      'rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-900'
    target.textContent = `Playground target #${instanceId}`
    host.replaceChildren(target)
    targetRef.current = target
    setSyncTick((tick) => tick + 1)

    return () => {
      target.remove()
      targetRef.current = null
    }
  }, [instanceId, present])

  useOnElementRemoval(
    targetRef,
    (element) => {
      setPresent(false)
      setRemovals((count) => count + 1)
      setLastRemoved(element.getAttribute('data-instance') ?? 'unknown')
    },
    { enabled },
  )

  return (
    <ExampleShowcase
      hookName="useOnElementRemoval"
      title="Playground"
      description="Tune the enabled option from Controls and exercise mount, removal, restore, and reset flows."
      instruction="Toggle enabled in Controls, simulate removal, restore a new target, and reset activity counters."
      badge={enabled ? 'Active' : 'Paused'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mode',
              value: enabled ? 'Active' : 'Paused',
              testId: 'playground-mode',
            },
            {
              label: 'Target',
              value: present ? `#${instanceId}` : 'None',
              testId: 'playground-target-state',
            },
            {
              label: 'Removals',
              value: String(removals),
              testId: 'playground-removals',
            },
            {
              label: 'Last removed',
              value: lastRemoved,
              testId: 'playground-last-removed',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          ref={hostRef}
          className="min-h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
          data-testid="playground-host"
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {enabled ? 'Observation active.' : 'Observation paused.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClassName(!present)}
            data-testid="playground-remove"
            disabled={!present}
            onClick={() => {
              targetRef.current?.remove()
            }}
          >
            Simulate removal
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="playground-restore"
            onClick={() => {
              setInstanceId((value) => value + 1)
              setPresent(true)
            }}
          >
            Restore
          </button>
          <button
            type="button"
            className={secondaryButtonClassName()}
            data-testid="playground-reset"
            onClick={() => {
              setRemovals(0)
              setLastRemoved('None yet')
              setInstanceId(1)
              setPresent(true)
            }}
          >
            Reset activity
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}
