import { useId, useRef, useState } from 'react'
import {
  useOnClickOutside,
  type UseOnClickOutsideEventType,
  type UseOnClickOutsideOptions,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, OutsideTarget, StatusPanel } from './ExampleShowcase'
import {
  BellIcon,
  ChevronDownIcon,
  FilterIcon,
  SettingsIcon,
  UserIcon,
} from './icons'
import {
  dropdownSnippet,
  enabledSnippet,
  eventTypeSnippet,
  filterSnippet,
  nestedSnippet,
  overviewSnippet,
  playgroundSnippet,
} from './useOnClickOutside.snippets'

export type DemoOptions = Pick<
  UseOnClickOutsideOptions,
  'enabled' | 'eventType' | 'capture'
>

export function OverviewExample({
  enabled = true,
  eventType = 'pointerdown',
  capture = true,
  onOutside,
}: DemoOptions & {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  const [open, setOpen] = useState(true)
  const [outsideCount, setOutsideCount] = useState(0)
  const [lastEvent, setLastEvent] = useState('None yet')
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useOnClickOutside(
    containerRef,
    (event) => {
      setOpen(false)
      setOutsideCount((count) => count + 1)
      setLastEvent(event.type)
      onOutside?.(event)
    },
    { enabled, eventType, capture },
  )

  return (
    <ExampleShowcase
      title="Overview"
      description="Dismiss a notifications panel when interaction happens outside its referenced boundary."
      instruction="Open the panel, interact inside, then use the outside area to close it."
      badge={open ? 'Open' : 'Closed'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Panel', value: open ? 'Open' : 'Closed' },
            {
              label: 'Detection',
              value: enabled ? 'Enabled' : 'Paused',
            },
            {
              label: 'Outside events',
              value: String(outsideCount),
              testId: 'outside-count',
            },
            {
              label: 'Last event',
              value: lastEvent,
              testId: 'last-event',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            aria-expanded={open}
            aria-controls={panelId}
            data-testid="overview-trigger"
            onClick={() => {
              setOpen((value) => !value)
            }}
          >
            <BellIcon />
            Notifications
          </button>
          <span className="text-sm text-slate-500">
            Trigger and panel share one ref.
          </span>
        </div>

        {open ? (
          <div
            id={panelId}
            role="region"
            aria-label="Notifications"
            data-testid="overview-panel"
            className="mt-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3"
          >
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              Deployment finished for <strong>main</strong>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
              Review requested on pull request #42
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          </div>
        ) : null}
      </div>

      <OutsideTarget label="Click outside notifications" />
    </ExampleShowcase>
  )
}

export function DropdownMenuExample({
  onOutside,
}: {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('None yet')
  const containerRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useOnClickOutside(containerRef, (event) => {
    setOpen(false)
    onOutside?.(event)
  })

  return (
    <ExampleShowcase
      title="Dropdown menu"
      description="Close an account menu on outside interaction while keeping inside actions available."
      instruction="Open the menu, choose an item, reopen it, then dismiss from outside."
      badge={open ? 'Expanded' : 'Collapsed'}
      code={dropdownSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Menu', value: open ? 'Open' : 'Closed' },
            { label: 'Last action', value: selected, testId: 'last-action' },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className="relative inline-flex max-w-full flex-col"
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          data-testid="menu-trigger"
          onClick={() => {
            setOpen((value) => !value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <UserIcon />
          </span>
          Account
          <ChevronDownIcon />
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Account"
            data-testid="menu-surface"
            className="absolute top-full left-0 z-10 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            {(
              [
                ['Profile', <UserIcon key="u" />],
                ['Billing', <SettingsIcon key="s" />],
                ['Preferences', <FilterIcon key="f" />],
              ] as const
            ).map(([label, icon]) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                onClick={() => {
                  setSelected(label)
                  setOpen(false)
                }}
              >
                {icon}
                {label}
              </button>
            ))}
            <div className="my-1 border-t border-slate-200" />
            <button
              type="button"
              role="menuitem"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
              onClick={() => {
                setSelected('Sign out')
                setOpen(false)
              }}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Escape closing is example UI behavior, not provided by the hook.
      </p>
      <OutsideTarget label="Dismiss from outside" />
    </ExampleShowcase>
  )
}

export function FilterPopoverExample({
  onOutside,
}: {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('hooks')
  const [enabledOnly, setEnabledOnly] = useState(true)
  const [priority, setPriority] = useState<'all' | 'high'>('all')
  const [summary, setSummary] = useState('hooks · enabled · all')
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const queryId = useId()

  useOnClickOutside(containerRef, (event) => {
    setOpen(false)
    onOutside?.(event)
  })

  return (
    <ExampleShowcase
      title="Filter popover"
      description="Keep filter controls interactive inside a panel and dismiss with an outside interaction."
      instruction="Edit filters inside the panel, then close it from the outside area."
      badge={open ? 'Filters open' : 'Filters closed'}
      code={filterSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Panel', value: open ? 'Open' : 'Closed' },
            {
              label: 'Active filters',
              value: summary,
              testId: 'filter-summary',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-expanded={open}
          aria-controls={panelId}
          data-testid="filter-trigger"
          onClick={() => {
            setOpen((value) => !value)
          }}
        >
          <FilterIcon />
          {open ? 'Hide filters' : 'Show filters'}
        </button>

        {open ? (
          <form
            id={panelId}
            className="mt-3 space-y-3"
            data-testid="filter-panel"
            onSubmit={(event) => {
              event.preventDefault()
              setSummary(
                `${query || 'any'} · ${enabledOnly ? 'enabled' : 'all states'} · ${priority}`,
              )
            }}
          >
            <div className="space-y-1.5">
              <label
                htmlFor={queryId}
                className="block text-sm font-medium text-slate-700"
              >
                Query
              </label>
              <input
                id={queryId}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={enabledOnly}
                onChange={(event) => {
                  setEnabledOnly(event.target.checked)
                }}
              />
              Enabled only
            </label>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">
                Priority
              </legend>
              <div className="flex flex-wrap gap-2">
                {(['all', 'high'] as const).map((value) => (
                  <label
                    key={value}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name="priority"
                      className="accent-indigo-600"
                      checked={priority === value}
                      onChange={() => {
                        setPriority(value)
                      }}
                    />
                    {value === 'all' ? 'All' : 'High'}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Apply
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => {
                  setQuery('')
                  setEnabledOnly(false)
                  setPriority('all')
                  setSummary('any · all states · all')
                }}
              >
                Reset
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <OutsideTarget label="Click outside filters" />
    </ExampleShowcase>
  )
}

function EventTypeCard({
  label,
  eventType,
  onOutside,
}: {
  label: string
  eventType: UseOnClickOutsideEventType
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  const [open, setOpen] = useState(true)
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState(`Listening for ${eventType}`)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useOnClickOutside(
    ref,
    (event) => {
      setOpen(false)
      setCount((value) => value + 1)
      setPhase(`Closed by ${event.type}`)
      onOutside?.(event)
    },
    { eventType },
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          eventType: {label}
        </h3>
        <span
          className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
          data-testid={`${label}-status`}
        >
          {open ? 'Open' : 'Closed'}
        </span>
      </div>
      <p className="mb-3 text-xs leading-5 text-slate-500">
        {eventType === 'pointerdown'
          ? 'Closes as soon as a pointer is pressed outside.'
          : 'Closes only after a full click outside.'}
      </p>
      <div ref={ref} className="space-y-2">
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
          aria-expanded={open}
          aria-controls={panelId}
          data-testid={`${label}-trigger`}
          onClick={() => {
            setOpen(true)
            setPhase(`Listening for ${eventType}`)
          }}
        >
          Reopen
        </button>
        {open ? (
          <div
            id={panelId}
            className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-slate-700"
            data-testid={`${label}-panel`}
          >
            Inside target for {label}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700"
        data-testid={`${label}-outside`}
      >
        Outside target
      </button>
      <p className="mt-2 text-xs text-slate-500" data-testid={`${label}-log`}>
        {phase} · closures {count}
      </p>
    </div>
  )
}

export function EventTypeComparisonExample({
  onOutside,
}: {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  return (
    <ExampleShowcase
      title="Event type comparison"
      description="Compare pointerdown and click outside detection side by side."
      instruction="Press outside the pointerdown card without completing a click, then fully click outside the click card."
      badge="pointerdown vs click"
      code={eventTypeSnippet}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <EventTypeCard
          label="pointerdown"
          eventType="pointerdown"
          onOutside={onOutside}
        />
        <EventTypeCard label="click" eventType="click" onOutside={onOutside} />
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample({
  onOutside,
}: {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(true)
  const [outsideCount, setOutsideCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const enabledId = useId()

  useOnClickOutside(
    containerRef,
    (event) => {
      setOpen(false)
      setOutsideCount((count) => count + 1)
      onOutside?.(event)
    },
    { enabled },
  )

  return (
    <ExampleShowcase
      title="Enabled state"
      description="Pause and resume outside detection without remounting the example."
      instruction="Close from outside, reopen, pause detection, verify ignore, then resume."
      badge={enabled ? 'Enabled' : 'Paused'}
      code={enabledSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Panel', value: open ? 'Open' : 'Closed' },
            {
              label: 'Detection',
              value: enabled ? 'Enabled' : 'Paused',
            },
            {
              label: 'Outside events',
              value: String(outsideCount),
              testId: 'outside-count',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <label
          htmlFor={enabledId}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
        >
          <input
            id={enabledId}
            type="checkbox"
            className="accent-indigo-600"
            checked={enabled}
            data-testid="enabled-toggle"
            onChange={(event) => {
              setEnabled(event.target.checked)
            }}
          />
          Outside detection enabled
        </label>

        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
          aria-expanded={open}
          aria-controls={panelId}
          data-testid="enabled-trigger"
          onClick={() => {
            setOpen(true)
          }}
        >
          Open panel
        </button>

        {open ? (
          <div
            id={panelId}
            className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
            data-testid="enabled-panel"
          >
            Outside presses are ignored while detection is paused.
          </div>
        ) : null}
      </div>

      <OutsideTarget />
    </ExampleShowcase>
  )
}

export function NestedContentExample({
  onOutside,
}: {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
  const [open, setOpen] = useState(true)
  const [log, setLog] = useState('Waiting for inside activity')
  const [outsideCount, setOutsideCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const noteId = useId()

  useOnClickOutside(containerRef, (event) => {
    setOpen(false)
    setOutsideCount((count) => count + 1)
    onOutside?.(event)
  })

  return (
    <ExampleShowcase
      title="Nested content"
      description="Descendant fields and buttons remain inside the referenced element."
      instruction="Interact with the deep nested controls, then dismiss from outside."
      badge="Descendants stay inside"
      code={nestedSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Panel', value: open ? 'Open' : 'Closed' },
            { label: 'Activity', value: log, testId: 'nested-log' },
            {
              label: 'Outside events',
              value: String(outsideCount),
              testId: 'outside-count',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen(true)
          }}
        >
          Open nested panel
        </button>

        {open ? (
          <div
            id={panelId}
            className="mt-3 space-y-2"
            data-testid="nested-panel"
          >
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Nest level 1
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  Nest level 2
                </p>
                <div className="space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2">
                  <p className="text-[11px] font-semibold tracking-wide text-indigo-700 uppercase">
                    Nest level 3
                  </p>
                  <label
                    htmlFor={noteId}
                    className="block text-sm font-medium text-slate-700"
                  >
                    Note
                  </label>
                  <input
                    id={noteId}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    onChange={() => {
                      setLog('Edited nested note')
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-800"
                    data-testid="deep-nested-button"
                    onClick={() => {
                      setLog('Clicked deep nested button')
                    }}
                  >
                    Deep nested button
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <OutsideTarget />
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  eventType = 'pointerdown',
  capture = true,
  onOutside,
}: DemoOptions & {
  onOutside?: ((event: PointerEvent | MouseEvent) => void) | undefined
}) {
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
      onOutside?.(event)
    },
    { enabled, eventType, capture },
  )

  return (
    <ExampleShowcase
      title="Playground"
      description="Drive enabled, eventType, and capture from Storybook Controls while watching live status."
      instruction="Use Controls to change options, then interact inside and outside the panel."
      badge="Controls-driven"
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Options',
              value: `${enabled ? 'enabled' : 'paused'} · ${eventType} · capture=${String(capture)}`,
              testId: 'playground-options',
            },
            {
              label: 'Handler calls',
              value: String(calls),
              testId: 'outside-count',
            },
            {
              label: 'Last event',
              value: lastEvent,
              testId: 'last-event',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
            aria-expanded={open}
            aria-controls={panelId}
            data-testid="overview-trigger"
            onClick={() => {
              setOpen(true)
            }}
          >
            Open playground panel
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            data-testid="playground-reset"
            onClick={() => {
              setCalls(0)
              setLastEvent('None yet')
              setOpen(true)
            }}
          >
            Reset status
          </button>
        </div>
        {open ? (
          <div
            id={panelId}
            className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-slate-700"
            data-testid="overview-panel"
          >
            Inside area for the current option combination.
          </div>
        ) : null}
      </div>

      <OutsideTarget />
    </ExampleShowcase>
  )
}
