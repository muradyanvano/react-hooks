import { useEffect, useId, useRef, useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  characterValidationSnippet,
  commandPaletteSnippet,
  contentEditableSnippet,
  editableProtectionSnippet,
  enabledSnippet,
  modifierKeysSnippet,
  overviewSnippet,
  playgroundSnippet,
  searchFocusSnippet,
} from './useOnStartTyping.snippets'

const RECENT_SEARCHES = [
  'Accessibility checklist',
  'SSR-safe hooks',
  'Keyboard UX patterns',
  'StrictMode listeners',
]

export type ValidationMode = 'alphanumeric' | 'digits' | 'letters'

function validatorFor(
  mode: ValidationMode,
): ((event: KeyboardEvent) => boolean) | undefined {
  if (mode === 'digits') {
    return (event: KeyboardEvent) => /^\d$/.test(event.key)
  }

  if (mode === 'letters') {
    return (event: KeyboardEvent) =>
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.isComposing &&
      !event.repeat &&
      /^[a-z]$/i.test(event.key)
  }

  return undefined
}

function optionsFor(
  enabled: boolean,
  mode: ValidationMode,
): {
  enabled: boolean
  isTypedCharacterValid?: (event: KeyboardEvent) => boolean
} {
  if (mode === 'alphanumeric') {
    return { enabled }
  }

  const isTypedCharacterValid = validatorFor(mode)
  if (isTypedCharacterValid == null) {
    return { enabled }
  }

  return { enabled, isTypedCharacterValid }
}

export function OverviewExample({
  onAccepted,
}: {
  onAccepted?: ((event: KeyboardEvent) => void) | undefined
}) {
  const [lastKey, setLastKey] = useState('None yet')
  const [count, setCount] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useOnStartTyping((event) => {
    setLastKey(event.key)
    setCount((value) => value + 1)
    inputRef.current?.focus()
    onAccepted?.(event)
  })

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Global search"
      description="Start typing anywhere in the preview to focus the search field. The hook reports typing intent without calling preventDefault."
      instruction="Click the preview background or the Reset control, then press a letter or digit. Shift+letter works; Ctrl/Alt/Meta do not."
      badge={focused ? 'Focused' : 'Waiting'}
      code={overviewSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Last key', value: lastKey, testId: 'overview-last-key' },
            {
              label: 'Activations',
              value: String(count),
              testId: 'overview-count',
            },
            {
              label: 'Search field',
              value: focused ? 'Focused' : 'Not focused',
              testId: 'overview-focus',
            },
          ]}
        />
      }
    >
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block space-y-2" htmlFor={inputId}>
          <span className="text-sm font-semibold text-slate-800">Search</span>
          <input
            id={inputId}
            ref={inputRef}
            data-testid="overview-search"
            type="search"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            placeholder="Start typing to search…"
            onFocus={() => {
              setFocused(true)
            }}
            onBlur={() => {
              setFocused(false)
            }}
          />
        </label>
        <p
          className="text-sm text-slate-600"
          role="status"
          aria-live="polite"
          data-testid="overview-status"
        >
          {focused
            ? `Search is focused. Last accepted key: ${lastKey}.`
            : 'Waiting for typing outside editable fields.'}
        </p>
        <button
          type="button"
          data-testid="overview-reset"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            setLastKey('None yet')
            setCount(0)
            inputRef.current?.blur()
          }}
        >
          Reset
        </button>
      </div>
    </ExampleShowcase>
  )
}

export function SearchFocusExample() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useOnStartTyping(() => {
    inputRef.current?.focus()
  })

  const results = RECENT_SEARCHES.filter((item) =>
    item.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Knowledge-base search"
      description="A documentation-style search card. Typing outside the field focuses the input so readers can jump into search immediately."
      instruction="Focus the Recent searches heading or the page chrome beside the card, then type a letter to activate search."
      badge={focused ? 'Ready' : 'Idle'}
      code={searchFocusSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Field',
              value: focused ? 'Focused' : 'Waiting',
              testId: 'search-focus-state',
            },
            {
              label: 'Query',
              value: query || '(empty)',
              testId: 'search-query',
            },
          ]}
        />
      }
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"
          >
            ⌕
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <label
              className="block text-sm font-semibold text-slate-900"
              htmlFor={inputId}
            >
              Search the knowledge base
            </label>
            <input
              id={inputId}
              ref={inputRef}
              data-testid="kb-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
              }}
              onFocus={() => {
                setFocused(true)
              }}
              onBlur={() => {
                setFocused(false)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              placeholder="Type anywhere to jump in"
            />
            <p className="text-xs text-slate-500">
              Tip: leave the field, then press a letter or digit.
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3
            tabIndex={0}
            data-testid="recent-heading"
            className="text-xs font-semibold tracking-wide text-slate-500 uppercase outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Recent searches
          </h3>
          <ul className="mt-2 space-y-1.5">
            {results.map((item) => (
              <li
                key={item}
                className="rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function CommandPaletteExample() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Type a letter or digit to open')
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const inputId = useId()

  useOnStartTyping((event) => {
    setOpen(true)
    setStatus(`Opened with “${event.key}”`)
    queueMicrotask(() => {
      inputRef.current?.focus()
    })
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setStatus('Closed with Escape')
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Command palette"
      description="Valid typing outside editable fields opens a command menu and focuses its filter input. This demonstrates typing intent, not Ctrl/Cmd shortcuts."
      instruction="Click the canvas (not an input), then press a letter. Press Escape or Close to dismiss."
      badge={open ? 'Open' : 'Closed'}
      code={commandPaletteSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Palette',
              value: open ? 'Open' : 'Closed',
              testId: 'palette-state',
            },
            { label: 'Status', value: status, testId: 'palette-status' },
          ]}
        />
      }
    >
      <div className="relative min-h-48 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p
          className="text-sm text-slate-600"
          role="status"
          aria-live="polite"
          data-testid="palette-live"
        >
          {status}
        </p>
        {open ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="command-palette"
            className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              Commands
            </h2>
            <label className="mt-3 block space-y-1.5" htmlFor={inputId}>
              <span className="text-sm text-slate-700">Filter commands</span>
              <input
                id={inputId}
                ref={inputRef}
                data-testid="palette-input"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </label>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>Open documentation</li>
              <li>Copy package name</li>
              <li>Toggle theme</li>
            </ul>
            <button
              type="button"
              data-testid="palette-close"
              className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => {
                setOpen(false)
                setQuery('')
                setStatus('Closed')
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            Palette closed. Start typing to open.
          </p>
        )}
      </div>
    </ExampleShowcase>
  )
}

export function EditableProtectionExample() {
  const [status, setStatus] = useState('Waiting for typing outside editables')
  const [count, setCount] = useState(0)

  useOnStartTyping((event) => {
    setStatus(`Accepted “${event.key}”`)
    setCount((value) => value + 1)
  })

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Editable protection"
      description="Typing inside inputs, textareas, selects, or contenteditable regions does not fire the handler. Non-editable focus targets still do."
      instruction="Type inside each editable control (should stay blocked), then focus the button and type a letter (should accept)."
      code={editableProtectionSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Status', value: status, testId: 'editable-status' },
            {
              label: 'Accepted',
              value: String(count),
              testId: 'editable-count',
            },
          ]}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm text-slate-700">
          Text input
          <input
            data-testid="editable-text"
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </label>
        <label className="block space-y-1 text-sm text-slate-700">
          Textarea
          <textarea
            data-testid="editable-textarea"
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </label>
        <label className="block space-y-1 text-sm text-slate-700">
          Select
          <select
            data-testid="editable-select"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            defaultValue="hooks"
          >
            <option value="hooks">Hooks</option>
            <option value="ssr">SSR</option>
          </select>
        </label>
        <div
          role="textbox"
          contentEditable
          suppressContentEditableWarning
          tabIndex={0}
          aria-label="Editable note"
          data-testid="editable-ce"
          className="min-h-16 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Editable region
        </div>
        <button
          type="button"
          data-testid="non-editable-target"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:col-span-2"
        >
          Non-editable focus target
        </button>
      </div>
      <p
        className="text-sm text-slate-600"
        role="status"
        aria-live="polite"
        data-testid="editable-live"
      >
        {status} · activations {count}
      </p>
    </ExampleShowcase>
  )
}

export function CharacterValidationExample() {
  const [last, setLast] = useState('None yet')
  const [count, setCount] = useState(0)

  useOnStartTyping(
    (event) => {
      setLast(event.key)
      setCount((value) => value + 1)
    },
    {
      isTypedCharacterValid: (event) => /^\d$/.test(event.key),
    },
  )

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Character validation"
      description="A custom numeric-only validator replaces the default ASCII alphanumeric rule. Letters are rejected; digits are accepted."
      instruction="Focus the preview chrome, press a digit (accepted), then press a letter (ignored)."
      code={characterValidationSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Last digit', value: last, testId: 'digits-last' },
            {
              label: 'Accepted count',
              value: String(count),
              testId: 'digits-count',
            },
          ]}
        />
      }
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          Validator:{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            {'/^\\d$/.test(event.key)'}
          </code>
        </p>
        <button
          type="button"
          data-testid="digits-focus"
          className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Focus here, then type
        </button>
        <p
          className="mt-3 text-sm text-slate-600"
          role="status"
          aria-live="polite"
          data-testid="digits-status"
        >
          Last accepted: {last}. Count: {count}.
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function ModifierKeysExample() {
  const [log, setLog] = useState<string[]>([])

  useOnStartTyping((event) => {
    setLog((entries) => [`Accepted “${event.key}”`, ...entries].slice(0, 6))
  })

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Modifier keys"
      description="The default validator allows Shift so uppercase letters work, and ignores Ctrl, Alt, and Meta combinations."
      instruction="Try Shift+A (accepted). Then try Ctrl/Alt/Meta with a letter (ignored). Controlled events are also fine for demos."
      code={modifierKeysSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Latest',
              value: log[0] ?? 'None yet',
              testId: 'modifier-latest',
            },
            {
              label: 'Accepted',
              value: String(log.length),
              testId: 'modifier-count',
            },
          ]}
        />
      }
    >
      <ul
        className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
        data-testid="modifier-log"
        aria-live="polite"
      >
        {log.length === 0 ? <li>No accepted keys yet</li> : null}
        {log.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
      <button
        type="button"
        data-testid="modifier-focus"
        className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Focus here, then type
      </button>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const [lastKey, setLastKey] = useState('None yet')
  const [count, setCount] = useState(0)
  const checkboxId = useId()

  useOnStartTyping(
    (event) => {
      setLastKey(event.key)
      setCount((value) => value + 1)
    },
    { enabled },
  )

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Enabled state"
      description="Toggle detection on and off. While disabled, no document listener is registered."
      instruction="With the checkbox on, type a letter. Turn it off and type again (ignored). Re-enable and type."
      badge={enabled ? 'Listening' : 'Paused'}
      code={enabledSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: enabled ? 'true' : 'false',
              testId: 'typing-enabled',
            },
            { label: 'Last key', value: lastKey, testId: 'enabled-last-key' },
            {
              label: 'Count',
              value: String(count),
              testId: 'enabled-count',
            },
          ]}
        />
      }
    >
      <label
        htmlFor={checkboxId}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <input
          id={checkboxId}
          data-testid="typing-enabled-checkbox"
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked)
          }}
          className="h-4 w-4 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        Detection enabled
      </label>
      <button
        type="button"
        data-testid="enabled-focus"
        className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Focus here, then type
      </button>
      <p
        className="mt-3 text-sm text-slate-600"
        role="status"
        aria-live="polite"
        data-testid="enabled-status"
      >
        {enabled
          ? 'Listening for typing intent.'
          : 'Paused — listener removed.'}{' '}
        Last key: {lastKey}. Count: {count}.
      </p>
    </ExampleShowcase>
  )
}

export function ContenteditableExample() {
  const [status, setStatus] = useState('Type from the non-editable area')

  useOnStartTyping((event) => {
    setStatus(`Accepted “${event.key}” from non-editable focus`)
  })

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Contenteditable composer"
      description="A notes-style editor blocks detection while focused. A sibling non-editable control still allows typing intent."
      instruction="Type inside the composer (blocked). Focus the button below, then type a letter (accepted)."
      code={contentEditableSnippet}
      aside={
        <StatusPanel
          items={[{ label: 'Status', value: status, testId: 'ce-status' }]}
        />
      }
    >
      <div
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        tabIndex={0}
        aria-label="Message composer"
        data-testid="composer"
        className="min-h-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Draft a note here…
      </div>
      <button
        type="button"
        data-testid="composer-outside"
        className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Focus this non-editable control, then type
      </button>
      <p
        className="mt-3 text-sm text-slate-600"
        role="status"
        aria-live="polite"
        data-testid="composer-live"
      >
        {status}
      </p>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  mode = 'alphanumeric',
  onAccepted,
}: {
  enabled?: boolean | undefined
  mode?: ValidationMode | undefined
  onAccepted?: ((event: KeyboardEvent) => void) | undefined
}) {
  const [log, setLog] = useState<string[]>([])

  const options = optionsFor(enabled, mode)

  useOnStartTyping((event) => {
    setLog((entries) => [`${event.key}`, ...entries].slice(0, 8))
    onAccepted?.(event)
  }, options)

  return (
    <ExampleShowcase
      hookName="useOnStartTyping"
      title="Playground"
      description="Use Storybook controls to toggle enabled state and character-validation mode. Accepted keys appear in the live log."
      instruction="Adjust controls, focus the preview, then type letters or digits."
      badge={enabled ? mode : 'paused'}
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: enabled ? 'true' : 'false',
              testId: 'playground-enabled',
            },
            { label: 'Mode', value: mode, testId: 'playground-mode' },
            {
              label: 'Events',
              value: String(log.length),
              testId: 'playground-count',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="playground-reset"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          onClick={() => {
            setLog([])
          }}
        >
          Clear log
        </button>
      </div>
      <ul
        className="mt-3 min-h-28 space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
        data-testid="playground-log"
        aria-live="polite"
      >
        {log.length === 0 ? <li>No accepted keys yet</li> : null}
        {log.map((entry, index) => (
          <li
            key={`${entry}-${index}`}
            data-testid={`playground-entry-${index}`}
          >
            {entry}
          </li>
        ))}
      </ul>
    </ExampleShowcase>
  )
}
