import { useId, useRef, useState } from 'react'
import {
  useOnKeyStroke,
  type KeyStrokeEventType,
} from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  commandSnippet,
  customTargetSnippet,
  enabledSnippet,
  keyupSnippet,
  multipleKeysSnippet,
  overviewSnippet,
  playgroundSnippet,
  repeatedSnippet,
} from './useOnKeyStroke.snippets'

const GRID_SIZE = 3
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const
const MEDIA_KEYS = [' ', 'Enter'] as const

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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function dispatchArrowRight(repeat: boolean) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      code: 'ArrowRight',
      bubbles: true,
      cancelable: true,
      repeat,
    }),
  )
}

function formatKeyLabel(key: string) {
  return key === ' ' ? 'Space' : key
}

export function OverviewExample() {
  const [row, setRow] = useState(1)
  const [col, setCol] = useState(1)
  const [lastKey, setLastKey] = useState('None yet')
  const [eventCount, setEventCount] = useState(0)

  useOnKeyStroke([...ARROW_KEYS], (event) => {
    event.preventDefault()
    setLastKey(event.key)
    setEventCount((count) => count + 1)

    setRow((current) => {
      if (event.key === 'ArrowUp') {
        return Math.max(0, current - 1)
      }
      if (event.key === 'ArrowDown') {
        return Math.min(GRID_SIZE - 1, current + 1)
      }
      return current
    })
    setCol((current) => {
      if (event.key === 'ArrowLeft') {
        return Math.max(0, current - 1)
      }
      if (event.key === 'ArrowRight') {
        return Math.min(GRID_SIZE - 1, current + 1)
      }
      return current
    })
  })

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Arrow grid navigation"
      description="Listen for an array of arrow keys, call preventDefault, and move an active selection across a 3×3 grid."
      instruction="Focus the page and press ArrowUp, ArrowDown, ArrowLeft, or ArrowRight. Use Reset to restore the center cell and counters."
      badge={`Cell ${row},${col}`}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active cell',
              value: `${row}, ${col}`,
            },
            {
              label: 'Last key',
              value: lastKey,
              testId: 'last-key',
            },
            {
              label: 'Events',
              value: String(eventCount),
              testId: 'event-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          role="grid"
          aria-label="Selection grid"
          data-testid="nav-grid"
          className="mx-auto flex w-full max-w-xs flex-col gap-2"
        >
          {Array.from({ length: GRID_SIZE }, (_, r) => (
            <div key={r} role="row" className="grid grid-cols-3 gap-2">
              {Array.from({ length: GRID_SIZE }, (_, c) => {
                const active = r === row && c === col
                return (
                  <div
                    key={`${r}-${c}`}
                    role="gridcell"
                    aria-selected={active}
                    data-testid={`nav-cell-${r}-${c}`}
                    className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {r},{c}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          Active cell highlighted. Arrow keys move the selection.
        </p>
        <button
          type="button"
          className={secondaryButtonClassName()}
          data-testid="reset-nav"
          onClick={() => {
            setRow(1)
            setCol(1)
            setLastKey('None yet')
            setEventCount(0)
          }}
        >
          Reset
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function CommandShortcutExample() {
  const [open, setOpen] = useState(false)
  const [shortcutCount, setShortcutCount] = useState(0)
  const ignoreInputId = useId()
  const commandInputId = useId()

  useOnKeyStroke(
    (event) =>
      (event.key === 'k' || event.key === 'K') &&
      (event.ctrlKey || event.metaKey),
    (event) => {
      if (isEditableTarget(event.target)) {
        return
      }
      event.preventDefault()
      setOpen(true)
      setShortcutCount((count) => count + 1)
    },
  )

  useOnKeyStroke('Escape', () => {
    setOpen(false)
  })

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Command palette shortcut"
      description="Open a command panel with Ctrl/Meta+K. Escape closes it. Shortcuts are ignored while focus is inside an editable field."
      instruction="Press Ctrl+K or Cmd+K to open. Type in the ignore input first to confirm the shortcut stays quiet, then Escape to close the panel."
      badge={open ? 'Open' : 'Closed'}
      code={commandSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Panel',
              value: open ? 'Open' : 'Closed',
              testId: 'open-status',
            },
            {
              label: 'Shortcuts',
              value: String(shortcutCount),
              testId: 'shortcut-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor={ignoreInputId}
          className="block space-y-1.5 text-sm font-medium text-slate-800"
        >
          Type here (shortcut ignored while focused)
          <input
            id={ignoreInputId}
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            placeholder="Focus, then try Ctrl/Cmd+K"
          />
        </label>

        {open ? (
          <div
            role="dialog"
            aria-label="Command panel"
            data-testid="command-panel"
            className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4"
          >
            <p className="text-sm font-semibold text-indigo-900">
              Command panel
            </p>
            <label
              htmlFor={commandInputId}
              className="block space-y-1.5 text-sm font-medium text-slate-800"
            >
              Search
              <input
                id={commandInputId}
                type="text"
                data-testid="command-input"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                placeholder="Search commands…"
              />
            </label>
            <p className="text-xs text-slate-600">
              Press Escape to dismiss. Typing here also skips the open shortcut.
            </p>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Panel closed. Use Ctrl/Cmd+K when focus is not in an input.
          </p>
        )}
      </div>
    </ExampleShowcase>
  )
}

export function MultipleKeysExample() {
  const [last, setLast] = useState('None yet')
  const [count, setCount] = useState(0)

  useOnKeyStroke([...MEDIA_KEYS], (event) => {
    event.preventDefault()
    setLast(`Matched: ${formatKeyLabel(event.key)}`)
    setCount((value) => value + 1)
  })

  useOnKeyStroke(true, (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      return
    }
    setLast(`Ignored: ${formatKeyLabel(event.key)}`)
  })

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Multiple keys"
      description="Accept Space and Enter as media-like controls. Other keys are tracked as ignored."
      instruction="Press Space or Enter to count a match. Press another letter to see it listed as ignored."
      badge={`${count} matched`}
      code={multipleKeysSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Last result',
              value: last,
              testId: 'multi-last',
            },
            {
              label: 'Matched',
              value: String(count),
              testId: 'multi-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            ▶
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Media control
            </p>
            <p className="text-sm text-slate-600">
              Space / Enter play or pause
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600" aria-live="polite">
          {last}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function RepeatedEventsExample() {
  const [offCount, setOffCount] = useState(0)
  const [onCount, setOnCount] = useState(0)

  useOnKeyStroke('ArrowRight', () => {
    setOffCount((count) => count + 1)
  })

  useOnKeyStroke(
    'ArrowRight',
    () => {
      setOnCount((count) => count + 1)
    },
    { dedupe: true },
  )

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Repeated events"
      description="By default, keydown repeats call the handler. With dedupe: true, events where event.repeat is true are ignored."
      instruction="Use the buttons to dispatch a normal ArrowRight keydown and a repeat ArrowRight keydown. Compare the two counters."
      badge="dedupe"
      code={repeatedSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'dedupe false',
              value: String(offCount),
              testId: 'dedupe-off-count',
            },
            {
              label: 'dedupe true',
              value: String(onCount),
              testId: 'dedupe-on-count',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            dedupe false
          </p>
          <p className="text-2xl font-semibold text-slate-900">{offCount}</p>
          <p className="text-sm text-slate-600">
            Counts normal and repeat events.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
            dedupe true
          </p>
          <p className="text-2xl font-semibold text-indigo-900">{onCount}</p>
          <p className="text-sm text-slate-600">
            Ignores events with repeat set.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClassName()}
          data-testid="fire-normal"
          onClick={() => {
            dispatchArrowRight(false)
          }}
        >
          Fire normal ArrowRight
        </button>
        <button
          type="button"
          className={secondaryButtonClassName()}
          data-testid="fire-repeat"
          onClick={() => {
            dispatchArrowRight(true)
          }}
        >
          Fire repeat ArrowRight
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function CustomTargetExample() {
  const regionRef = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)

  useOnKeyStroke(
    'Enter',
    () => {
      setCount((value) => value + 1)
    },
    { target: regionRef },
  )

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Custom target"
      description="Scope listening to a focusable region via target: regionRef. Keys on outside controls do not reach that listener."
      instruction="Focus the key region, press Enter to increment. Focus the outside control and press Enter — the region counter should stay put."
      badge={`${count} enters`}
      code={customTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Region Enter',
              value: String(count),
              testId: 'region-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div
          ref={regionRef}
          tabIndex={0}
          aria-label="Key region"
          data-testid="key-region"
          className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-6 text-sm text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Focus this region, then press Enter.
        </div>
        <div
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3"
          data-testid="outside-key-area"
        >
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Outside area
          </p>
          <button type="button" className={secondaryButtonClassName()}>
            Outside control
          </button>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function KeyupExample() {
  const [count, setCount] = useState(0)
  const [last, setLast] = useState('None yet')

  useOnKeyStroke(
    true,
    (event) => {
      setCount((value) => value + 1)
      setLast(event.key)
    },
    { eventType: 'keyup' },
  )

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Keyup only"
      description="With eventType: 'keyup', keydown strokes do not invoke the handler — only release events count."
      instruction="Hold a key down briefly, then release. The counter should update on keyup, not while the key is held from keydown alone."
      badge="keyup"
      code={keyupSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Keyup count',
              value: String(count),
              testId: 'keyup-count',
            },
            {
              label: 'Last keyup',
              value: last,
              testId: 'keyup-last',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Listening for all keys on <code className="font-semibold">keyup</code>
          . Keydown events are ignored by this listener.
        </p>
        <p className="text-sm text-slate-600" aria-live="polite">
          Last release: {last}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const [count, setCount] = useState(0)
  const enabledId = useId()

  useOnKeyStroke(
    true,
    () => {
      setCount((value) => value + 1)
    },
    { enabled },
  )

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Enabled and paused"
      description="When enabled is false, no listener is registered and key strokes are ignored until listening resumes."
      instruction="Uncheck Listening enabled, press keys (count stays), then re-enable and press a key again."
      badge={enabled ? 'Enabled' : 'Paused'}
      code={enabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mode',
              value: enabled ? 'Enabled' : 'Paused',
            },
            {
              label: 'Events',
              value: String(count),
              testId: 'key-enabled-count',
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
            data-testid="key-enabled-checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onChange={(event) => {
              setEnabled(event.target.checked)
            }}
          />
          Listening enabled
        </label>
        <p className="text-sm text-slate-600" aria-live="polite">
          {enabled
            ? 'Any key increments the counter.'
            : 'Paused — key strokes are ignored.'}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export type PlaygroundOptions = {
  enabled?: boolean
  eventType?: KeyStrokeEventType
  dedupe?: boolean
  capture?: boolean
  passive?: boolean
}

export function PlaygroundExample({
  enabled = true,
  eventType = 'keydown',
  dedupe = false,
  capture = false,
  passive = false,
}: PlaygroundOptions) {
  const [count, setCount] = useState(0)
  const [lastKey, setLastKey] = useState('None yet')
  const [modifiers, setModifiers] = useState('—')
  const [repeat, setRepeat] = useState('false')

  useOnKeyStroke(
    true,
    (event) => {
      setCount((value) => value + 1)
      setLastKey(event.key)
      setModifiers(
        [
          event.ctrlKey ? 'Ctrl' : null,
          event.metaKey ? 'Meta' : null,
          event.altKey ? 'Alt' : null,
          event.shiftKey ? 'Shift' : null,
        ]
          .filter(Boolean)
          .join('+') || 'None',
      )
      setRepeat(String(event.repeat))
    },
    { enabled, eventType, dedupe, capture, passive },
  )

  return (
    <ExampleShowcase
      hookName="useOnKeyStroke"
      title="Playground"
      description="Tune enabled, eventType, dedupe, capture, and passive from Controls. Filter is true so every matching event is reported."
      instruction="Adjust options in Controls, press keys, inspect modifiers and repeat, then reset the counters."
      badge={enabled ? 'Active' : 'Paused'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Last key',
              value: lastKey,
              testId: 'playground-last-key',
            },
            {
              label: 'Modifiers',
              value: modifiers,
            },
            {
              label: 'Repeat',
              value: repeat,
            },
            {
              label: 'Count',
              value: String(count),
              testId: 'playground-key-count',
            },
          ]}
        />
      }
    >
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              eventType
            </dt>
            <dd className="font-semibold text-slate-900">{eventType}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Options
            </dt>
            <dd className="font-semibold text-slate-900">
              {[
                enabled ? 'enabled' : 'paused',
                dedupe ? 'dedupe' : null,
                capture ? 'capture' : null,
                passive ? 'passive' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600" aria-live="polite">
          Last: {lastKey} · modifiers {modifiers} · repeat {repeat}
        </p>
        <button
          type="button"
          className={secondaryButtonClassName()}
          data-testid="playground-reset"
          onClick={() => {
            setCount(0)
            setLastKey('None yet')
            setModifiers('—')
            setRepeat('false')
          }}
        >
          Reset
        </button>
      </div>
    </ExampleShowcase>
  )
}
