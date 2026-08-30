export const gettingStartedSnippet = `import { useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function Menu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useOnClickOutside(ref, () => {
    setOpen(false)
  })

  return (
    <div ref={ref}>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open ? <div>Menu content</div> : null}
    </div>
  )
}`

export const overviewSnippet = `import { useId, useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [outsideCount, setOutsideCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useOnClickOutside(containerRef, () => {
    setOpen(false)
    setOutsideCount((count) => count + 1)
  })

  return (
    <div ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Notifications
      </button>

      {open ? (
        <div id={panelId} role="region" aria-label="Notifications">
          <p>Deployment finished</p>
          <button type="button">Mark all read</button>
        </div>
      ) : null}

      <p>Outside events: {outsideCount}</p>
    </div>
  )
}`

export const dropdownSnippet = `import { useId, useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function AccountMenu() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('None yet')
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useOnClickOutside(containerRef, () => {
    setOpen(false)
  })

  return (
    <div ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Account
      </button>

      {open ? (
        <div id={menuId} role="menu" aria-label="Account">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setSelected('Profile')
              setOpen(false)
            }}
          >
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setSelected('Billing')
              setOpen(false)
            }}
          >
            Billing
          </button>
        </div>
      ) : null}

      <p>Last action: {selected}</p>
    </div>
  )
}`

export const filterSnippet = `import { useId, useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function TaskFilters() {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('hooks')
  const [enabledOnly, setEnabledOnly] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const queryId = useId()

  useOnClickOutside(containerRef, () => {
    setOpen(false)
  })

  return (
    <div ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Filters
      </button>

      {open ? (
        <form
          id={panelId}
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <label htmlFor={queryId}>Query</label>
          <input
            id={queryId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <label>
            <input
              type="checkbox"
              checked={enabledOnly}
              onChange={(event) => setEnabledOnly(event.target.checked)}
            />
            Enabled only
          </label>

          <button type="submit">Apply</button>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setEnabledOnly(false)
            }}
          >
            Reset
          </button>
        </form>
      ) : null}
    </div>
  )
}`

export const eventTypeSnippet = `import { useId, useRef, useState } from 'react'
import {
  useOnClickOutside,
  type UseOnClickOutsideEventType,
} from '@muradyanvano/react-hooks'

function Panel({ eventType }: { eventType: UseOnClickOutsideEventType }) {
  const [open, setOpen] = useState(true)
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useOnClickOutside(
    ref,
    (event) => {
      setOpen(false)
      setCount((value) => value + 1)
      console.log(event.type)
    },
    { eventType },
  )

  return (
    <div>
      <div ref={ref}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          Reopen {eventType}
        </button>
        {open ? <div id={panelId}>Listening for {eventType}</div> : null}
      </div>
      <button type="button">Outside target</button>
      <p>Closures: {count}</p>
    </div>
  )
}

export function EventTypeComparison() {
  return (
    <>
      <Panel eventType="pointerdown" />
      <Panel eventType="click" />
    </>
  )
}`

export const enabledSnippet = `import { useId, useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function DetectionToggle() {
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(true)
  const [outsideCount, setOutsideCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const enabledId = useId()

  useOnClickOutside(
    containerRef,
    () => {
      setOpen(false)
      setOutsideCount((count) => count + 1)
    },
    { enabled },
  )

  return (
    <div ref={containerRef}>
      <label htmlFor={enabledId}>
        <input
          id={enabledId}
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Outside detection enabled
      </label>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Open panel
      </button>

      {open ? <div id={panelId}>Protected content</div> : null}
      <p>Outside events: {outsideCount}</p>
    </div>
  )
}`

export const nestedSnippet = `import { useId, useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function NestedCommandPanel() {
  const [open, setOpen] = useState(true)
  const [log, setLog] = useState('Waiting for inside activity')
  const [outsideCount, setOutsideCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const noteId = useId()

  useOnClickOutside(containerRef, () => {
    setOpen(false)
    setOutsideCount((count) => count + 1)
  })

  return (
    <div ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Open nested panel
      </button>

      {open ? (
        <div id={panelId}>
          <div>
            <div>
              <label htmlFor={noteId}>Note</label>
              <input
                id={noteId}
                onChange={() => setLog('Edited nested note')}
              />
              <button
                type="button"
                onClick={() => setLog('Clicked deep nested button')}
              >
                Deep nested button
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p>{log}</p>
      <p>Outside events: {outsideCount}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useId, useRef, useState } from 'react'
import {
  useOnClickOutside,
  type UseOnClickOutsideEventType,
} from '@muradyanvano/react-hooks'

type Options = {
  enabled?: boolean
  eventType?: UseOnClickOutsideEventType
  capture?: boolean
}

export function Playground(options: Options = {}) {
  const {
    enabled = true,
    eventType = 'pointerdown',
    capture = true,
  } = options

  const [open, setOpen] = useState(true)
  const [calls, setCalls] = useState(0)
  const [lastEvent, setLastEvent] = useState('None yet')
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useOnClickOutside(
    containerRef,
    (event) => {
      setOpen(false)
      setCalls((count) => count + 1)
      setLastEvent(event.type)
    },
    { enabled, eventType, capture },
  )

  return (
    <div ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
      >
        Open playground panel
      </button>
      {open ? <div id={panelId}>Inside area</div> : null}
      <p>
        {enabled ? 'enabled' : 'paused'} · {eventType} · capture={String(capture)}
      </p>
      <p>
        Calls: {calls} · Last event: {lastEvent}
      </p>
    </div>
  )
}`
