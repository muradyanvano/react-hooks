import { useCallback, useState, type ReactNode } from 'react'

import { useTextSelection } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import * as snippets from './useTextSelection.snippets'

function Snapshot({
  text,
  ranges,
  rects,
}: {
  text: string
  ranges: number
  rects: number
}) {
  return (
    <pre
      data-testid="text-selection-snapshot"
      className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-emerald-300"
    >
      {JSON.stringify({ text, ranges, rects }, null, 2)}
    </pre>
  )
}

function Shell({
  title,
  description,
  instruction,
  code,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  children: ReactNode
}) {
  return (
    <ExampleShowcase
      hookName="useTextSelection"
      title={title}
      description={description}
      instruction={instruction}
      code={code}
    >
      {children}
    </ExampleShowcase>
  )
}

function SelectionSurface({
  title,
  description,
  instruction,
  code,
  enabled = true,
}: {
  title: string
  description: string
  instruction: string
  code: string
  enabled?: boolean
}) {
  const value = useTextSelection({ enabled })
  return (
    <Shell {...{ title, description, instruction, code }}>
      <article className="space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5">
        <p
          className="font-serif text-lg leading-8 text-slate-800"
          data-testid="selection-reading-surface"
        >
          Select any portion of this calm reading surface. The snapshot
          preserves every character, including whitespace and Unicode: café,
          世界, and ✨.
        </p>
        <p className="text-sm leading-6 text-slate-600">
          Native browser selections can span lines and may expose more than one
          range in browsers that support it.
        </p>
        <p
          aria-live="polite"
          data-testid="text-selection-text"
          className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm"
        >
          {value.text ? `Selected: ${value.text}` : 'Nothing selected'}
        </p>
        <Snapshot
          text={value.text}
          ranges={value.ranges.length}
          rects={value.rects.length}
        />
      </article>
    </Shell>
  )
}

export function TextSelectionInspectorExample() {
  const value = useTextSelection()
  return (
    <Shell
      title="Text selection inspector"
      description="A quiet reading surface that reports the browser’s current selection, its ranges, and its client rectangles without changing the selection."
      instruction="Select a phrase in the passage. The inspector updates on the document selectionchange event."
      code={snippets.inspectorSnippet}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_14rem]">
        <article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 shadow-sm">
          <p
            className="font-serif text-xl leading-9 text-slate-800"
            data-testid="selection-reading-surface"
          >
            Reading rewards attention: choose a sentence, a word, or a line
            break, and let the native selection describe what is actually
            highlighted.
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The hook reports text exactly as the platform returns it; it does
            not trim or normalize your selection.
          </p>
        </article>
        <StatusPanel
          items={[
            {
              label: 'Text',
              value: value.text || 'empty',
              testId: 'selection-inspector-text',
            },
            {
              label: 'Ranges',
              value: String(value.ranges.length),
              testId: 'selection-inspector-ranges',
            },
            {
              label: 'Rects',
              value: String(value.rects.length),
              testId: 'selection-inspector-rects',
            },
          ]}
        />
      </div>
      <Snapshot
        text={value.text}
        ranges={value.ranges.length}
        rects={value.rects.length}
      />
    </Shell>
  )
}

export function BasicSelectionExample() {
  return (
    <SelectionSurface
      title="Basic selection"
      description="Read the selected text as a string."
      instruction="Select text in the surface."
      code={snippets.basicSnippet}
    />
  )
}
export function MultipleParagraphsExample() {
  return (
    <SelectionSurface
      title="Multiple paragraphs"
      description="Selections may cross paragraph boundaries."
      instruction="Select across both paragraphs."
      code={snippets.paragraphsSnippet}
    />
  )
}
export function MultipleRangesExample() {
  return (
    <SelectionSurface
      title="Multiple ranges"
      description="Ranges are returned in native range order when supported by the browser."
      instruction="Use the fixture to inspect multiple native ranges."
      code={snippets.rangesSnippet}
    />
  )
}
export function SelectionRectanglesExample() {
  return (
    <SelectionSurface
      title="Selection rectangles"
      description="Client rectangles are flattened in range and rectangle order."
      instruction="Select text across a wrapped line."
      code={snippets.rectanglesSnippet}
    />
  )
}
export function CollapsedSelectionExample() {
  return (
    <SelectionSurface
      title="Collapsed selection"
      description="A caret can have a range while its text is empty."
      instruction="Place a caret in the surface."
      code={snippets.collapsedSnippet}
    />
  )
}
export function UnicodeWhitespaceExample() {
  return (
    <SelectionSurface
      title="Unicode and whitespace"
      description="Text is returned verbatim, without trimming or normalization."
      instruction="Select the Unicode and spaced text."
      code={snippets.unicodeSnippet}
    />
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const value = useTextSelection({ enabled })
  return (
    <Shell
      title="Enabled state"
      description="Disabling detaches observation and returns an empty snapshot. Enabling performs a fresh sync."
      instruction="Toggle observation, then select text."
      code={snippets.enabledSnippet}
    >
      <button
        type="button"
        data-testid="text-selection-toggle"
        onClick={() => setEnabled((current) => !current)}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
      >
        {enabled ? 'Disable selection observer' : 'Enable selection observer'}
      </button>
      <p data-testid="text-selection-enabled" aria-live="polite">
        enabled: {String(enabled)}; text: {value.text || 'empty'}
      </p>
    </Shell>
  )
}

function IframeExample({ dynamic = false }: { dynamic?: boolean }) {
  const [first, setFirst] = useState<Window | null>(null)
  const [second, setSecond] = useState<Window | null>(null)
  const [useSecond, setUseSecond] = useState(false)
  const target = dynamic && useSecond ? second : first
  const value = useTextSelection({ window: target })
  const bindFirst = useCallback(
    (node: HTMLIFrameElement | null) => setFirst(node?.contentWindow ?? null),
    [],
  )
  const bindSecond = useCallback(
    (node: HTMLIFrameElement | null) => setSecond(node?.contentWindow ?? null),
    [],
  )
  return (
    <Shell
      title={dynamic ? 'Dynamic window' : 'Custom iframe window'}
      description="Selection is observed in the selected same-origin iframe document only."
      instruction="Use the fixture to set a deterministic iframe selection."
      code={dynamic ? snippets.dynamicSnippet : snippets.iframeSnippet}
    >
      <div className="space-y-3">
        <iframe
          ref={bindFirst}
          onLoad={(event) => setFirst(event.currentTarget.contentWindow)}
          title="Selection frame A"
          data-testid="text-selection-iframe-a"
          srcDoc="<p>Select this iframe text.</p>"
          className="h-20 w-full rounded border"
        />
        {dynamic ? (
          <iframe
            ref={bindSecond}
            onLoad={(event) => setSecond(event.currentTarget.contentWindow)}
            title="Selection frame B"
            data-testid="text-selection-iframe-b"
            srcDoc="<p>Second selection frame.</p>"
            className="h-20 w-full rounded border"
          />
        ) : null}
        {dynamic ? (
          <button
            type="button"
            data-testid="text-selection-switch"
            onClick={() => setUseSecond(true)}
          >
            Observe frame B
          </button>
        ) : null}
        <button
          type="button"
          data-testid="text-selection-apply-fixture"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => {
            if (target == null) return
            const range = {
              getClientRects: () => [],
            } as unknown as Range
            const fixture = {
              toString: () =>
                dynamic && useSecond ? 'frame B fixture' : 'iframe fixture',
              rangeCount: 1,
              getRangeAt: () => range,
            } as unknown as Selection
            Object.defineProperty(target, 'getSelection', {
              configurable: true,
              writable: true,
              value: () => fixture,
            })
            target.document.dispatchEvent(new Event('selectionchange'))
          }}
        >
          Apply selection fixture
        </button>
        <p data-testid="text-selection-window-state">
          {target ? 'observing' : 'pending'}
        </p>
        <p data-testid="text-selection-iframe-text" aria-live="polite">
          {value.text || 'Nothing selected'}
        </p>
      </div>
    </Shell>
  )
}
export function CustomIframeExample() {
  return <IframeExample />
}
export function DynamicWindowExample() {
  return <IframeExample dynamic />
}

export function ClearingSelectionExample() {
  const value = useTextSelection()
  return (
    <Shell
      title="Clearing selection"
      description="The browser clears selection; the hook reflects the next selectionchange."
      instruction="Select text, then use Clear selection."
      code={snippets.clearingSnippet}
    >
      <button
        type="button"
        data-testid="text-selection-clear"
        onClick={() => value.selection?.removeAllRanges()}
      >
        Clear selection
      </button>
      <p data-testid="text-selection-cleared-text">
        {value.text || 'Selection cleared'}
      </p>
    </Shell>
  )
}

export function PlaygroundExample({ enabled = true }: { enabled?: boolean }) {
  const [mounted, setMounted] = useState(false)
  const value = useTextSelection({ enabled: mounted && enabled })
  return (
    <Shell
      title="Playground"
      description="Mount the observer explicitly to keep Docs idle."
      instruction="Mount, then select passage text."
      code={snippets.playgroundSnippet}
    >
      <button
        type="button"
        data-testid="text-selection-playground-mount"
        onClick={() => setMounted(true)}
      >
        {mounted ? 'Mounted' : 'Mount playground'}
      </button>
      {mounted ? (
        <article className="space-y-3 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5">
          <p
            className="font-serif text-lg leading-8 text-slate-800"
            data-testid="selection-reading-surface"
          >
            Select text in this playground surface once the observer is mounted.
          </p>
          <p data-testid="text-selection-text" aria-live="polite">
            {value.text ? `Selected: ${value.text}` : 'Nothing selected'}
          </p>
          <Snapshot
            text={value.text}
            ranges={value.ranges.length}
            rects={value.rects.length}
          />
        </article>
      ) : (
        <p>Playground is idle until mounted.</p>
      )}
    </Shell>
  )
}
