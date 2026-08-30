export const overviewSnippet = `import { useEffect, useId, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

export function ExternalWidgetHost() {
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
    widget.textContent = \`External widget #\${instanceId}\`
    host.replaceChildren(widget)
    widgetRef.current = widget
    // Assignment happens in an effect; bump state so the hook re-syncs after commit.
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
    <div>
      <div ref={hostRef} aria-describedby={statusId} />
      <p id={statusId}>
        {present ? 'Widget mounted' : 'Widget removed'} · Removals: {removalCount}
      </p>
      <button
        type="button"
        onClick={() => {
          widgetRef.current?.remove()
        }}
        disabled={!present}
      >
        Simulate external removal
      </button>
      <button
        type="button"
        onClick={() => {
          setInstanceId((value) => value + 1)
          setPresent(true)
        }}
      >
        Restore new widget
      </button>
      <p>Last removed instance: {lastRemoved}</p>
    </div>
  )
}`

export const ancestorSnippet = `import { useEffect, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

export function EmbeddedPanelMonitor() {
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
    sibling.textContent = 'Unrelated sibling'

    const ancestor = document.createElement('div')
    ancestor.dataset.testid = 'widget-shell'
    ancestor.textContent = ''

    const shell = document.createElement('div')
    shell.dataset.testid = 'inner-shell'

    const target = document.createElement('div')
    target.dataset.testid = 'observed-target'
    target.dataset.generation = String(generation)
    target.textContent = \`Observed target #\${generation}\`

    shell.append(target)
    ancestor.append(shell)
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
      \`Detected removal of target #\${element.getAttribute('data-generation')}\`,
    )
  })

  return (
    <div>
      <div ref={rootRef} />
      <p>{status}</p>
      <p>Removals: {removals}</p>
      <button
        type="button"
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
        onClick={() => {
          setGeneration((value) => value + 1)
          setStatus('Observing nested target')
        }}
      >
        Restore hierarchy
      </button>
    </div>
  )
}`

export const enabledSnippet = `import { useEffect, useId, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

export function MonitoringControl() {
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
    target.textContent = \`Monitored target #\${instanceId}\`
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
    <div>
      <label htmlFor={enabledId}>
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Outside observation enabled
      </label>
      <div ref={hostRef} />
      <p>{enabled ? 'Enabled' : 'Paused'} · Removals: {removals}</p>
      <button
        type="button"
        onClick={() => {
          targetRef.current?.remove()
        }}
        disabled={!present}
      >
        Simulate removal
      </button>
      <button
        type="button"
        onClick={() => {
          setInstanceId((value) => value + 1)
          setPresent(true)
        }}
      >
        Restore target
      </button>
    </div>
  )
}`

export const replacementSnippet = `import { useEffect, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

export function ElementReplacement() {
  const hostRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [instanceId, setInstanceId] = useState(1)
  const [observed, setObserved] = useState('Waiting')
  const [lastRemoved, setLastRemoved] = useState('None yet')
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (host == null) {
      return
    }

    const target = document.createElement('div')
    target.dataset.testid = 'replacement-target'
    target.dataset.instance = String(instanceId)
    target.textContent = \`Instance #\${instanceId}\`
    host.replaceChildren(target)
    targetRef.current = target
    setObserved(\`Observing #\${instanceId}\`)
    setSyncTick((tick) => tick + 1)

    return () => {
      target.remove()
      targetRef.current = null
    }
  }, [instanceId])

  useOnElementRemoval(targetRef, (element) => {
    setLastRemoved(element.getAttribute('data-instance') ?? 'unknown')
    setObserved('Awaiting replacement')
  })

  return (
    <div>
      <div ref={hostRef} />
      <p>{observed}</p>
      <p>Last removed: {lastRemoved}</p>
      <button
        type="button"
        onClick={() => {
          targetRef.current?.remove()
        }}
      >
        Remove current instance
      </button>
      <button
        type="button"
        onClick={() => {
          setInstanceId((value) => value + 1)
        }}
      >
        Mount next instance
      </button>
    </div>
  )
}`

export const svgSnippet = `import { useEffect, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

export function SvgRemovalMonitor() {
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
      \`Detected SVG removal #\${element.getAttribute('data-generation')}\`,
    )
  })

  return (
    <div>
      <svg
        ref={svgRef}
        width="96"
        height="96"
        viewBox="0 0 96 96"
        role="img"
        aria-label="Observed indigo square"
      />
      <p>{status}</p>
      <button
        type="button"
        onClick={() => {
          shapeRef.current?.remove()
        }}
        disabled={!present}
      >
        Remove SVG shape
      </button>
      <button
        type="button"
        onClick={() => {
          setGeneration((value) => value + 1)
          setPresent(true)
          setStatus('Observing SVG shape')
        }}
      >
        Restore SVG shape
      </button>
    </div>
  )
}`

export const playgroundSnippet = `import { useEffect, useRef, useState } from 'react'
import { useOnElementRemoval } from '@muradyanvano/react-hooks'

type Options = {
  enabled?: boolean
}

export function Playground({ enabled = true }: Options) {
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
    target.textContent = \`Playground target #\${instanceId}\`
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
    <div>
      <div ref={hostRef} />
      <p>
        {enabled ? 'Active' : 'Paused'} · Present: {String(present)} · Removals:{' '}
        {removals}
      </p>
      <p>Last removed: {lastRemoved}</p>
      <button
        type="button"
        onClick={() => {
          targetRef.current?.remove()
        }}
        disabled={!present}
      >
        Simulate removal
      </button>
      <button
        type="button"
        onClick={() => {
          setInstanceId((value) => value + 1)
          setPresent(true)
        }}
      >
        Restore
      </button>
      <button
        type="button"
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
  )
}`
