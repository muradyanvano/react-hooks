export const overviewSnippet = `import { useRef, useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function GlobalSearch() {
  const [lastKey, setLastKey] = useState('None yet')
  const [count, setCount] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useOnStartTyping((event) => {
    setLastKey(event.key)
    setCount((value) => value + 1)
    inputRef.current?.focus()
  })

  return (
    <div>
      <input
        ref={inputRef}
        type="search"
        aria-label="Search"
        placeholder="Start typing anywhere…"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <p>Last key: {lastKey}</p>
      <p>Activations: {count}</p>
      <p>{focused ? 'Search focused' : 'Waiting'}</p>
    </div>
  )
}`

export const searchFocusSnippet = `import { useRef, useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

const RECENT = ['Accessibility checklist', 'SSR-safe hooks', 'Keyboard UX']

export function DocsSearch() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useOnStartTyping(() => {
    inputRef.current?.focus()
  })

  const results = RECENT.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <label htmlFor="docs-search">Search the knowledge base</label>
      <input
        id="docs-search"
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Type to jump into search"
      />
      <p>{focused ? 'Ready to filter' : 'Click outside, then start typing'}</p>
      <ul>
        {results.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}`

export const commandPaletteSnippet = `import { useEffect, useId, useRef, useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Type a letter or digit to open')
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useOnStartTyping((event) => {
    setOpen(true)
    setStatus(\`Opened with “\${event.key}”\`)
    queueMicrotask(() => inputRef.current?.focus())
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setStatus('Closed')
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div>
      <p role="status" aria-live="polite">
        {status}
      </p>
      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <h2 id={titleId}>Commands</h2>
          <input
            ref={inputRef}
            type="search"
            aria-label="Filter commands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  )
}`

export const editableProtectionSnippet = `import { useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function EditableProtection() {
  const [status, setStatus] = useState('Waiting for typing outside editables')
  const [count, setCount] = useState(0)

  useOnStartTyping((event) => {
    setStatus(\`Accepted “\${event.key}”\`)
    setCount((value) => value + 1)
  })

  return (
    <div>
      <label>
        Text
        <input type="text" />
      </label>
      <label>
        Notes
        <textarea rows={2} />
      </label>
      <label>
        Topic
        <select defaultValue="hooks">
          <option value="hooks">Hooks</option>
          <option value="ssr">SSR</option>
        </select>
      </label>
      <div
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        aria-label="Editable note"
      >
        Editable region
      </div>
      <button type="button">Non-editable focus target</button>
      <p role="status" aria-live="polite">
        {status} · {count}
      </p>
    </div>
  )
}`

export const characterValidationSnippet = `import { useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function DigitsOnly() {
  const [last, setLast] = useState('None yet')
  const [count, setCount] = useState(0)

  useOnStartTyping(
    (event) => {
      setLast(event.key)
      setCount((value) => value + 1)
    },
    {
      isTypedCharacterValid: (event) => /^\\d$/.test(event.key),
    },
  )

  return (
    <div>
      <p>Last accepted digit: {last}</p>
      <p>Accepted count: {count}</p>
    </div>
  )
}`

export const modifierKeysSnippet = `import { useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function ModifierDemo() {
  const [log, setLog] = useState<string[]>([])

  useOnStartTyping((event) => {
    setLog((entries) => [\`Accepted “\${event.key}”\`, ...entries].slice(0, 5))
  })

  return (
    <div>
      <p>Shift+letter is accepted. Ctrl / Alt / Meta combinations are ignored.</p>
      <ul>
        {log.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}`

export const enabledSnippet = `import { useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function EnabledDemo() {
  const [enabled, setEnabled] = useState(true)
  const [lastKey, setLastKey] = useState('None yet')
  const [count, setCount] = useState(0)

  useOnStartTyping(
    (event) => {
      setLastKey(event.key)
      setCount((value) => value + 1)
    },
    { enabled },
  )

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Detection enabled
      </label>
      <p>{enabled ? 'Listening' : 'Paused'}</p>
      <p>Last key: {lastKey}</p>
      <p>Count: {count}</p>
    </div>
  )
}`

export const contentEditableSnippet = `import { useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

export function NotesComposer() {
  const [status, setStatus] = useState('Type from the non-editable area')

  useOnStartTyping((event) => {
    setStatus(\`Accepted “\${event.key}” from non-editable focus\`)
  })

  return (
    <div>
      <div
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        aria-label="Message composer"
      >
        Draft a note here…
      </div>
      <button type="button">Focus this non-editable control, then type</button>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </div>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useOnStartTyping } from '@muradyanvano/react-hooks'

type Mode = 'alphanumeric' | 'digits' | 'letters'

function validatorFor(mode: Mode) {
  if (mode === 'digits') {
    return (event: KeyboardEvent) => /^\\d$/.test(event.key)
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

export function Playground({
  enabled = true,
  mode = 'alphanumeric',
}: {
  enabled?: boolean
  mode?: Mode
}) {
  const [log, setLog] = useState<string[]>([])

  useOnStartTyping(
    (event) => {
      setLog((entries) => [\`\${event.key}\`, ...entries].slice(0, 8))
    },
    {
      enabled,
      isTypedCharacterValid: validatorFor(mode),
    },
  )

  return (
    <div>
      <p>Mode: {mode}</p>
      <ul>
        {log.map((entry, index) => (
          <li key={\`\${entry}-\${index}\`}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}`
