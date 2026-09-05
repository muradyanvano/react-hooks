import { useCallback, useState, type ReactNode } from 'react'

import { useTextSelection } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import { BrowserFrame, CodeValue, MetricGrid, MetricTile } from './ui'
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
  layout = 'split' as const,
  aside,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  layout?: 'split' | 'inspector' | 'single' | 'form'
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <ExampleShowcase
      hookName="useTextSelection"
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      layout={layout}
      aside={aside}
    >
      {children}
    </ExampleShowcase>
  )
}

function GeometryInspector({
  text,
  rangeCount,
  rects,
}: {
  text: string
  rangeCount: number
  rects: ReadonlyArray<Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>>
}) {
  const preview = rects.slice(0, 4).map((rect, index) => (
    <li key={index} className="font-mono text-[11px] text-slate-700">
      #{index + 1}: x={Math.round(rect.left)}, y={Math.round(rect.top)}, w=
      {Math.round(rect.width)}, h={Math.round(rect.height)}
    </li>
  ))

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Selection geometry
      </p>
      <MetricGrid columns={3}>
        <MetricTile label="Characters" value={text.length} />
        <MetricTile label="Ranges" value={rangeCount} />
        <MetricTile label="Rects" value={rects.length} />
      </MetricGrid>
      {rects.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-slate-200 bg-white p-2">
          {preview}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          Select text to inspect client rectangles.
        </p>
      )}
      {text ? (
        <div>
          <p className="text-xs font-medium text-slate-500">Selected text</p>
          <CodeValue value={text} />
        </div>
      ) : null}
    </div>
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
    <Shell {...{ title, description, instruction, code }} layout="inspector">
      <BrowserFrame url="https://reading.local/article">
        <article className="space-y-4">
          <p
            className="font-serif text-lg leading-8 text-slate-800"
            data-testid="selection-reading-surface"
          >
            Select any portion of this calm reading surface. The snapshot
            preserves every character, including whitespace and Unicode: café,
            世界, and ✨.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            Native browser selections can span lines and may expose more than
            one range in browsers that support it.
          </p>
        </article>
      </BrowserFrame>
      <p
        aria-live="polite"
        data-testid="text-selection-text"
        className="rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200"
      >
        {value.text ? `Selected: ${value.text}` : 'Nothing selected'}
      </p>
      <Snapshot
        text={value.text}
        ranges={value.ranges.length}
        rects={value.rects.length}
      />
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
      layout="inspector"
      aside={
        <StatusPanel
          items={[
            {
              label: 'Text',
              value: value.text || 'empty',
              testId: 'selection-inspector-text',
              mode: 'block',
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
      }
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(14rem,20rem)]">
        <BrowserFrame url="https://reading.local/inspector">
          <article className="rounded-lg bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5">
            <h3 className="text-sm font-semibold tracking-wide text-indigo-700 uppercase">
              Fictional essay
            </h3>
            <p
              className="mt-3 font-serif text-xl leading-9 text-slate-800"
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
        </BrowserFrame>

        <GeometryInspector
          text={value.text}
          rangeCount={value.ranges.length}
          rects={value.rects}
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
      layout="form"
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
      layout="form"
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
      layout="single"
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
      layout="inspector"
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
