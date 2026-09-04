import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

import { useFullscreen } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  installFullscreenMock,
  type FullscreenMockHandle,
  type FullscreenMockMode,
} from './fullscreenMock'
import * as snippets from './useFullscreen.snippets'

function WithFullscreenMock({
  children,
  mode = 'success',
  onReady,
}: {
  children: (handle: FullscreenMockHandle) => ReactNode
  mode?: FullscreenMockMode
  onReady?: ((handle: FullscreenMockHandle) => void) | undefined
}) {
  const [handle] = useState(() => installFullscreenMock(document, { mode }))

  if (!handle.isInstalled()) {
    handle.install()
  }

  useEffect(() => {
    handle.install()
    onReady?.(handle)
    return () => {
      handle.uninstall()
    }
  }, [handle, onReady])

  return <>{children(handle)}</>
}

function Stage({
  stageRef,
  title,
  accent,
  testId,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  title: string
  accent: string
  testId: string
}) {
  return (
    <div
      ref={stageRef}
      data-testid={testId}
      className="relative overflow-hidden rounded-2xl border border-slate-200 p-6 text-white"
      style={{
        background: `linear-gradient(145deg, ${accent}, #0f172a)`,
        minHeight: '12rem',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        aria-hidden
      >
        <svg viewBox="0 0 400 220" className="h-full w-full">
          <circle cx="320" cy="40" r="70" fill="#fff" />
          <circle cx="60" cy="180" r="90" fill="#fff" />
        </svg>
      </div>
      <div className="relative space-y-1">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
          Stage
        </p>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      </div>
    </div>
  )
}

function Shell({
  title,
  description,
  instruction,
  code,
  badge,
  aside,
  children,
}: {
  title: string
  description: string
  instruction: string
  code: string
  badge?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <ExampleShowcase
      hookName="useFullscreen"
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      badge={badge}
      aside={aside}
    >
      {children}
    </ExampleShowcase>
  )
}

export function MediaViewerExample() {
  return <MediaViewerInner />
}

function MediaViewerInner() {
  const ref = useRef<HTMLDivElement>(null)
  const enterButtonRef = useRef<HTMLButtonElement>(null)
  const { isSupported, isFullscreen, fullscreenElement, error, enter, exit } =
    useFullscreen(ref, { navigationUI: 'hide' })

  useEffect(() => {
    if (!isFullscreen) {
      enterButtonRef.current?.focus()
    }
  }, [isFullscreen])

  return (
    <Shell
      title="Fullscreen media viewer"
      description="Present a local media-style stage with Go Fullscreen / Exit controls, support status, Escape guidance, and navigationUI hide. Uses the real browser Fullscreen API."
      instruction="Click Go Fullscreen, confirm the stage is active, then Exit or press Escape."
      badge={isFullscreen ? 'Fullscreen' : 'Inline'}
      code={snippets.mediaViewerSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'media-supported',
            },
            {
              label: 'Fullscreen',
              value: String(isFullscreen),
              testId: 'media-fullscreen',
            },
            {
              label: 'Target',
              value: fullscreenElement ? 'stage' : 'none',
              testId: 'media-target',
            },
          ]}
        />
      }
    >
      <Stage
        stageRef={ref}
        title="Evening continuum"
        accent="#4338ca"
        testId="media-stage"
      />
      <div className="flex flex-wrap gap-2">
        <button
          ref={enterButtonRef}
          type="button"
          data-testid="media-enter"
          disabled={!isSupported || isFullscreen}
          onClick={() => {
            void enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Go Fullscreen
        </button>
        <button
          type="button"
          data-testid="media-exit"
          disabled={!isFullscreen}
          onClick={() => {
            void exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
        >
          Exit fullscreen
        </button>
      </div>
      <p className="text-sm text-slate-600" data-testid="media-escape-help">
        Press Escape or use the browser UI to exit. The hook does not trap focus
        or intercept keys.
      </p>
      {error ? (
        <p
          role="alert"
          className="text-sm text-rose-700"
          data-testid="media-error"
        >
          {error.message}
        </p>
      ) : null}
    </Shell>
  )
}

export function LiveNativeExample() {
  const ref = useRef<HTMLDivElement>(null)
  const { isSupported, isFullscreen, fullscreenElement, error, enter, exit } =
    useFullscreen(ref)

  return (
    <Shell
      title="Live native fullscreen"
      description="Uses the real browser Fullscreen API. Automated play tests never click Enter fullscreen."
      instruction="If supported, click Enter fullscreen from a user gesture. Escape exits."
      badge={isSupported ? 'Live API' : 'Unsupported'}
      code={snippets.liveNativeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Supported',
              value: String(isSupported),
              testId: 'live-supported',
            },
            {
              label: 'Fullscreen',
              value: String(isFullscreen),
              testId: 'live-fullscreen',
            },
            {
              label: 'Element',
              value: fullscreenElement?.tagName ?? 'none',
              testId: 'live-element',
            },
          ]}
        />
      }
    >
      <Stage
        stageRef={ref}
        title="Live stage"
        accent="#0f766e"
        testId="live-stage"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="live-enter"
          disabled={!isSupported}
          onClick={() => {
            void enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Enter fullscreen
        </button>
        <button
          type="button"
          data-testid="live-exit"
          onClick={() => {
            void exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
        >
          Exit fullscreen
        </button>
      </div>
      <p className="text-sm text-slate-600" data-testid="live-help">
        Requires user activation. Mobile video presentation is not necessarily
        the same as the document Fullscreen API.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error.message}
        </p>
      ) : null}
    </Shell>
  )
}

function NativeStageExample({
  title,
  description,
  instruction,
  code,
  testPrefix,
  accent,
}: {
  title: string
  description: string
  instruction: string
  code: string
  testPrefix: string
  accent: string
}) {
  return (
    <NativeStageInner
      title={title}
      description={description}
      instruction={instruction}
      code={code}
      testPrefix={testPrefix}
      accent={accent}
    />
  )
}

function NativeStageInner({
  title,
  description,
  instruction,
  code,
  testPrefix,
  accent,
}: {
  title: string
  description: string
  instruction: string
  code: string
  testPrefix: string
  accent: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const api = useFullscreen(ref)
  return (
    <Shell
      title={title}
      description={description}
      instruction={instruction}
      code={code}
    >
      <Stage
        stageRef={ref}
        title={title}
        accent={accent}
        testId={`${testPrefix}-stage`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={`${testPrefix}-enter`}
          disabled={!api.isSupported || api.isFullscreen}
          onClick={() => {
            void api.enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Go Fullscreen
        </button>
        <button
          type="button"
          data-testid={`${testPrefix}-exit`}
          disabled={!api.isFullscreen}
          onClick={() => {
            void api.exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Exit fullscreen
        </button>
      </div>
      <p data-testid={`${testPrefix}-status`}>
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </Shell>
  )
}

export function EntireDocumentExample() {
  return <EntireDocumentInner />
}

function EntireDocumentInner() {
  const api = useFullscreen()
  return (
    <Shell
      title="Entire document"
      description="Omit the ref to target document.documentElement."
      instruction="Toggle document fullscreen."
      code={snippets.entireDocumentSnippet}
    >
      <p data-testid="doc-status" className="text-sm text-slate-700">
        {api.isFullscreen ? 'Document fullscreen' : 'Inline document'}
      </p>
      <button
        type="button"
        data-testid="doc-toggle"
        disabled={!api.isSupported}
        onClick={() => {
          void api.toggle()
        }}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {api.isFullscreen
          ? 'Exit document fullscreen'
          : 'Enter document fullscreen'}
      </button>
    </Shell>
  )
}

export function SpecificElementExample() {
  return <SpecificElementInner />
}

function SpecificElementInner() {
  const ref = useRef<HTMLElement>(null)
  const api = useFullscreen(ref)
  return (
    <Shell
      title="Specific element"
      description="Fullscreen a concrete card element via ref."
      instruction="Toggle the card into fullscreen."
      code={snippets.specificElementSnippet}
    >
      <article
        ref={ref}
        data-testid="card-stage"
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <h3 className="font-semibold text-slate-900">Focus card</h3>
        <p className="mt-1 text-sm text-slate-600">
          Only this element becomes the fullscreen target.
        </p>
      </article>
      <button
        type="button"
        data-testid="card-toggle"
        disabled={!api.isSupported}
        onClick={() => {
          void api.toggle()
        }}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {api.isFullscreen ? 'Exit' : 'Make this card fullscreen'}
      </button>
      <p data-testid="card-status">
        {api.isFullscreen ? 'Card fullscreen' : 'Card inline'}
      </p>
    </Shell>
  )
}

export function VideoPlayerExample() {
  return (
    <NativeStageExample
      title="Video player layout"
      description="A synthetic player chrome around a local poster stage — not a real media stream. Uses the real Fullscreen API."
      instruction="Enter and exit the player stage."
      code={snippets.videoPlayerSnippet}
      testPrefix="video"
      accent="#b45309"
    />
  )
}

export function PresentationExample() {
  return <PresentationInner />
}

function PresentationInner() {
  const ref = useRef<HTMLDivElement>(null)
  const [slide, setSlide] = useState(0)
  const api = useFullscreen(ref)
  return (
    <Shell
      title="Presentation slides"
      description="Advance slides while optionally presenting the stage fullscreen."
      instruction="Next slide, then toggle presentation fullscreen."
      code={snippets.presentationSnippet}
    >
      <div
        ref={ref}
        data-testid="slides-stage"
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <p className="text-lg font-semibold text-slate-900">
          Slide {slide + 1}
        </p>
        <p className="text-sm text-slate-600">Local outline content only.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="slides-next"
          onClick={() => setSlide((value) => (value + 1) % 3)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Next slide
        </button>
        <button
          type="button"
          data-testid="slides-toggle"
          disabled={!api.isSupported}
          onClick={() => {
            void api.toggle()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {api.isFullscreen ? 'Exit presentation' : 'Present fullscreen'}
        </button>
      </div>
      <p data-testid="slides-status">
        {api.isFullscreen ? 'Presenting' : 'Editing'}
      </p>
    </Shell>
  )
}

export function GalleryExample() {
  return <GalleryInner />
}

function GalleryInner() {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const api = useFullscreen(ref)
  return (
    <Shell
      title="Image gallery"
      description="Browse local CSS artworks and fullscreen the active frame."
      instruction="Next artwork, then Go Fullscreen."
      code={snippets.gallerySnippet}
    >
      <div
        ref={ref}
        data-testid="gallery-stage"
        aria-live="polite"
        className="flex h-40 items-center justify-center rounded-xl text-white"
        style={{
          background: `hsl(${index * 40 + 200} 70% 40%)`,
        }}
      >
        Artwork {index + 1}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="gallery-next"
          onClick={() => setIndex((value) => (value + 1) % 3)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Next
        </button>
        <button
          type="button"
          data-testid="gallery-enter"
          disabled={!api.isSupported}
          onClick={() => {
            void (api.isFullscreen ? api.exit() : api.enter())
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {api.isFullscreen ? 'Exit fullscreen' : 'Go Fullscreen'}
        </button>
      </div>
      <p data-testid="gallery-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </Shell>
  )
}

export function SvgExample() {
  return <SvgInner />
}

function SvgInner() {
  const ref = useRef<SVGSVGElement>(null)
  const api = useFullscreen(ref)
  return (
    <Shell
      title="SVG visualization"
      description="Fullscreen an SVGElement target."
      instruction="Toggle the chart fullscreen."
      code={snippets.svgSnippet}
    >
      <svg
        ref={ref}
        data-testid="svg-stage"
        viewBox="0 0 120 80"
        role="img"
        aria-label="Chart"
        className="h-40 w-full rounded-xl border border-slate-200 bg-slate-50"
      >
        <rect width="120" height="80" fill="#e2e8f0" />
        <circle cx="60" cy="40" r="24" fill="#4f46e5" />
      </svg>
      <button
        type="button"
        data-testid="svg-toggle"
        disabled={!api.isSupported}
        onClick={() => {
          void api.toggle()
        }}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {api.isFullscreen ? 'Exit' : 'Fullscreen chart'}
      </button>
      <p data-testid="svg-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </Shell>
  )
}

export function NavigationUiExample() {
  return <NavigationUiInner />
}

function NavigationUiInner() {
  const ref = useRef<HTMLDivElement>(null)
  const [navigationUI, setNavigationUI] = useState<'auto' | 'show' | 'hide'>(
    'auto',
  )
  const api = useFullscreen(ref, { navigationUI })
  return (
    <Shell
      title="Navigation UI options"
      description="Pass navigationUI through to standard requestFullscreen."
      instruction="Choose a navigationUI value, then enter fullscreen."
      code={snippets.navigationUiSnippet}
    >
      <Stage
        stageRef={ref}
        title="Nav UI stage"
        accent="#7c3aed"
        testId="nav-stage"
      />
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        navigationUI
        <select
          data-testid="nav-select"
          value={navigationUI}
          onChange={(event) =>
            setNavigationUI(event.target.value as 'auto' | 'show' | 'hide')
          }
          className="rounded-lg border border-slate-300 px-2 py-1.5"
        >
          <option value="auto">auto</option>
          <option value="show">show</option>
          <option value="hide">hide</option>
        </select>
      </label>
      <button
        type="button"
        data-testid="nav-enter"
        disabled={!api.isSupported}
        onClick={() => {
          void (api.isFullscreen ? api.exit() : api.enter())
        }}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        {api.isFullscreen ? 'Exit fullscreen' : 'Go Fullscreen'}
      </button>
      <p data-testid="nav-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </Shell>
  )
}

export function EscapeExitExample() {
  return <EscapeExitInner />
}

function EscapeExitInner() {
  const ref = useRef<HTMLDivElement>(null)
  const api = useFullscreen(ref)
  return (
    <Shell
      title="Escape and external exit"
      description="Document change events keep isFullscreen in sync when Escape or external code exits. Uses the real Fullscreen API."
      instruction="Enter fullscreen, then press Escape or click Simulate external exit."
      code={snippets.escapeExitSnippet}
    >
      <Stage
        stageRef={ref}
        title="Escape stage"
        accent="#0369a1"
        testId="escape-stage"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="escape-enter"
          disabled={!api.isSupported}
          onClick={() => {
            void api.enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Go Fullscreen
        </button>
        <button
          type="button"
          data-testid="escape-external"
          onClick={() => {
            void api.exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Simulate Escape exit
        </button>
      </div>
      <p data-testid="escape-status">
        {api.isFullscreen ? 'fullscreen' : 'inline'}
      </p>
    </Shell>
  )
}

export function ExternalEntryExample() {
  return (
    <WithFullscreenMock>
      {(handle) => <ExternalEntryInner handle={handle} />}
    </WithFullscreenMock>
  )
}

function ExternalEntryInner({ handle }: { handle: FullscreenMockHandle }) {
  const ref = useRef<HTMLDivElement>(null)
  const api = useFullscreen(ref)
  return (
    <Shell
      title="External fullscreen entry"
      description="Observe fullscreen started outside the hook."
      instruction="Click Simulate external entry for this stage."
      code={snippets.externalEntrySnippet}
    >
      <div
        ref={ref}
        id="external-stage"
        data-testid="external-stage"
        className="rounded-xl border p-4"
      >
        Observed stage
      </div>
      <button
        type="button"
        data-testid="external-simulate"
        onClick={() => {
          if (ref.current) {
            handle.setFullscreenElement(ref.current, true)
          }
        }}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
      >
        Simulate external entry
      </button>
      <p data-testid="external-status">
        This target fullscreen: {String(api.isFullscreen)}
      </p>
    </Shell>
  )
}

export function AnotherElementExample() {
  return (
    <WithFullscreenMock>
      {(handle) => <AnotherElementInner handle={handle} />}
    </WithFullscreenMock>
  )
}

function AnotherElementInner({ handle }: { handle: FullscreenMockHandle }) {
  const mine = useRef<HTMLDivElement>(null)
  const other = useRef<HTMLDivElement>(null)
  const api = useFullscreen(mine)
  return (
    <Shell
      title="Another element fullscreen"
      description="exit() refuses to dismiss a different active fullscreen element."
      instruction="Simulate another element fullscreen, then try Exit."
      code={snippets.anotherElementSnippet}
    >
      <div
        ref={mine}
        id="mine"
        data-testid="another-mine"
        className="rounded border p-3"
      >
        Mine
      </div>
      <div
        ref={other}
        id="other"
        data-testid="another-other"
        className="rounded border p-3"
      >
        Other
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="another-simulate"
          onClick={() => {
            if (other.current) {
              handle.setFullscreenElement(other.current, true)
            }
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Make other fullscreen
        </button>
        <button
          type="button"
          data-testid="another-exit"
          onClick={() => {
            void api.exit()
          }}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Exit only if mine is active
        </button>
      </div>
      <p data-testid="another-status">
        Mine fullscreen: {String(api.isFullscreen)}; active:{' '}
        {api.fullscreenElement?.id ?? 'none'}
      </p>
    </Shell>
  )
}

export function EnabledStateExample() {
  return <EnabledStateInner />
}

function EnabledStateInner() {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const api = useFullscreen(ref, { enabled })
  return (
    <Shell
      title="Enabled state"
      description="Disabling stops observation without exiting platform fullscreen."
      instruction="Enter fullscreen, then uncheck Observe fullscreen."
      code={snippets.enabledStateSnippet}
    >
      <Stage
        stageRef={ref}
        title="Enabled stage"
        accent="#15803d"
        testId="enabled-stage"
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="enabled-toggle"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Observe fullscreen
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="enabled-enter"
          disabled={!api.isSupported || !enabled}
          onClick={() => {
            void api.enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Go Fullscreen
        </button>
        <button
          type="button"
          data-testid="enabled-exit"
          onClick={() => {
            void api.exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Exit fullscreen
        </button>
      </div>
      <p data-testid="enabled-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </Shell>
  )
}

export function AutoExitExample() {
  return <AutoExitOuter />
}

function AutoExitOuter() {
  const [mounted, setMounted] = useState(true)
  return (
    <Shell
      title="Auto-exit"
      description="autoExit best-effort exits on genuine unmount only. Uses the real Fullscreen API."
      instruction="Enter fullscreen, then unmount the viewer."
      code={snippets.autoExitSnippet}
    >
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="autoexit-mount"
          checked={mounted}
          onChange={(event) => setMounted(event.target.checked)}
        />
        Mount viewer
      </label>
      {mounted ? <AutoExitViewer /> : null}
    </Shell>
  )
}

function AutoExitViewer() {
  const ref = useRef<HTMLDivElement>(null)
  const api = useFullscreen(ref, { autoExit: true })
  return (
    <div className="space-y-2">
      <Stage
        stageRef={ref}
        title="Auto-exit stage"
        accent="#be123c"
        testId="autoexit-stage"
      />
      <button
        type="button"
        data-testid="autoexit-enter"
        disabled={!api.isSupported}
        onClick={() => {
          void api.enter()
        }}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        Go Fullscreen
      </button>
      <p data-testid="autoexit-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </div>
  )
}

export function DynamicTargetExample() {
  return <DynamicTargetInner />
}

function DynamicTargetInner() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const api = useFullscreen(useA ? aRef : bRef)
  return (
    <Shell
      title="Dynamic target"
      description="Switch which ref the hook observes after commit."
      instruction="Enter on A, switch to B, confirm ownership updates without auto-exit."
      code={snippets.dynamicTargetSnippet}
    >
      <div ref={aRef} data-testid="dyn-a" className="rounded border p-3">
        Target A
      </div>
      <div ref={bRef} data-testid="dyn-b" className="rounded border p-3">
        Target B
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="dyn-switch"
          onClick={() => setUseA((value) => !value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Watch {useA ? 'B' : 'A'}
        </button>
        <button
          type="button"
          data-testid="dyn-enter"
          disabled={!api.isSupported}
          onClick={() => {
            void api.enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Go Fullscreen
        </button>
      </div>
      <p data-testid="dyn-status">
        Watching {useA ? 'A' : 'B'};{' '}
        {api.isFullscreen ? 'fullscreen' : 'inline'}
      </p>
    </Shell>
  )
}

export function IframeDocumentExample() {
  return <IframeDocumentOuter />
}

function IframeDocumentOuter() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const api = useFullscreen(undefined, { document: doc })

  return (
    <Shell
      title="Custom iframe document"
      description="Observe fullscreen against a same-origin iframe document using the real Fullscreen API."
      instruction="Wait for the iframe, then enter document fullscreen inside it."
      code={snippets.iframeDocumentSnippet}
    >
      <iframe
        ref={iframeRef}
        title="Fullscreen iframe demo"
        data-testid="iframe-frame"
        className="h-40 w-full rounded-xl border border-slate-200"
        srcDoc="<html><body style='font-family:sans-serif;padding:1rem'><main id='stage'>Iframe stage</main></body></html>"
        onLoad={(event) => {
          setDoc(event.currentTarget.contentDocument)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="iframe-enter"
          disabled={!api.isSupported}
          onClick={() => {
            void api.enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Go Fullscreen
        </button>
        <button
          type="button"
          data-testid="iframe-exit"
          onClick={() => {
            void api.exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Exit fullscreen
        </button>
      </div>
      <p data-testid="iframe-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
    </Shell>
  )
}

export function UnsupportedExample() {
  return <UnsupportedInner />
}

function UnsupportedInner() {
  const api = useFullscreen(undefined, { document: null })
  return (
    <Shell
      title="Unsupported browser"
      description="Explicit document null stays unsupported with no global fallback."
      instruction="Confirm Go Fullscreen stays disabled."
      code={snippets.unsupportedSnippet}
    >
      <p data-testid="unsupported-status">
        Supported: {String(api.isSupported)}
      </p>
      <button
        type="button"
        data-testid="unsupported-enter"
        disabled={!api.isSupported}
        onClick={() => {
          void api.enter()
        }}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
      >
        Go Fullscreen
      </button>
    </Shell>
  )
}

export function PlaygroundExample({
  enabled = true,
  navigationUI = 'auto',
  autoExit = false,
}: {
  enabled?: boolean
  navigationUI?: 'auto' | 'show' | 'hide'
  autoExit?: boolean
}) {
  return (
    <PlaygroundInner
      enabled={enabled}
      navigationUI={navigationUI}
      autoExit={autoExit}
    />
  )
}

function PlaygroundInner({
  enabled,
  navigationUI,
  autoExit,
}: {
  enabled: boolean
  navigationUI: 'auto' | 'show' | 'hide'
  autoExit: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [localEnabled, setLocalEnabled] = useState(enabled)
  const [localNav, setLocalNav] = useState(navigationUI)
  const api = useFullscreen(ref, {
    enabled: localEnabled,
    navigationUI: localNav,
    autoExit,
  })

  return (
    <Shell
      title="Playground"
      description="Docs-safe controls for enabled, navigationUI, and commands."
      instruction="Tune options, then Enter / Exit / Toggle."
      code={snippets.playgroundSnippet}
    >
      <Stage
        stageRef={ref}
        title="Playground"
        accent="#334155"
        testId="play-stage"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          data-testid="play-enabled"
          checked={localEnabled}
          onChange={(event) => setLocalEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-700">
        navigationUI
        <select
          data-testid="play-nav"
          value={localNav}
          onChange={(event) =>
            setLocalNav(event.target.value as 'auto' | 'show' | 'hide')
          }
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="auto">auto</option>
          <option value="show">show</option>
          <option value="hide">hide</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="play-enter"
          disabled={!api.isSupported || !localEnabled}
          onClick={() => {
            void api.enter()
          }}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Enter
        </button>
        <button
          type="button"
          data-testid="play-exit"
          onClick={() => {
            void api.exit()
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
        >
          Exit
        </button>
        <button
          type="button"
          data-testid="play-toggle"
          disabled={!api.isSupported || !localEnabled}
          onClick={() => {
            void api.toggle()
          }}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          Toggle
        </button>
      </div>
      <p data-testid="play-status">
        {api.isFullscreen ? 'Fullscreen' : 'Inline'}
      </p>
      {api.error ? (
        <p
          role="alert"
          data-testid="play-error"
          className="text-sm text-rose-700"
        >
          {api.error.message}
        </p>
      ) : null}
    </Shell>
  )
}
