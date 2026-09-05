import { useCallback, useEffect, useId, useState, type ReactNode } from 'react'

import { usePageLeave } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import * as snippets from './usePageLeave.snippets'

const EMPTY_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        font-family: system-ui, sans-serif;
        background:
          radial-gradient(circle at 20% 20%, #e0e7ff 0%, transparent 45%),
          radial-gradient(circle at 80% 0%, #c7d2fe 0%, transparent 40%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        color: #0f172a;
      }
      body {
        display: grid;
        place-items: center;
        padding: 1rem;
      }
      .card {
        width: min(100%, 18rem);
        border: 1px solid #c7d2fe;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.9);
        padding: 1rem 1.1rem;
        box-shadow: 0 10px 30px rgba(79, 70, 229, 0.08);
      }
      h1 {
        margin: 0 0 0.4rem;
        font-size: 1rem;
      }
      p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.45;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Isolated page</h1>
      <p>Move the pointer outside this frame to leave the browsing context.</p>
    </div>
  </body>
</html>`

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
      hookName="usePageLeave"
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

function useIframeWindow(testId: string) {
  const [pageWindow, setPageWindow] = useState<Window | null>(null)

  const bind = useCallback((node: HTMLIFrameElement | null) => {
    if (node == null) {
      setPageWindow(null)
      return
    }
    if (node.contentWindow != null) {
      setPageWindow(node.contentWindow)
    }
  }, [])

  const iframe = (
    <iframe
      ref={bind}
      title="Isolated page leave surface"
      data-testid={testId}
      className="h-48 w-full rounded-xl border border-indigo-200 bg-white"
      srcDoc={EMPTY_PAGE}
      onLoad={(event) => {
        setPageWindow(event.currentTarget.contentWindow)
      }}
    />
  )

  return { pageWindow, iframe }
}

/** Story-only: distinguish idle (never entered) from true inside after mouseover. */
function usePointerEntered(pageWindow: Window | null): boolean {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    setEntered(false)
    if (pageWindow == null) {
      return
    }

    const onOver = () => {
      setEntered(true)
    }
    pageWindow.addEventListener('mouseover', onOver)
    return () => {
      pageWindow.removeEventListener('mouseover', onOver)
    }
  }, [pageWindow])

  return entered
}

function pageLeaveStatusLabel(hasLeft: boolean, hasEntered: boolean): string {
  if (hasLeft) {
    return 'Mouse left page'
  }
  if (hasEntered) {
    return 'Inside page'
  }
  return 'Idle — pointer not in page'
}

function CursorArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="mx-auto h-24 w-24 text-indigo-500 motion-safe:animate-[pulse_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
    >
      <circle cx="60" cy="60" r="46" fill="currentColor" opacity="0.08" />
      <circle cx="60" cy="60" r="28" fill="currentColor" opacity="0.12" />
      <path
        d="M42 34 L42 78 L56 66 L68 90 L76 86 L64 62 L82 62 Z"
        fill="currentColor"
      />
    </svg>
  )
}

function Snapshot({
  hasLeft,
  testId = 'page-leave-snapshot',
}: {
  hasLeft: boolean
  testId?: string
}) {
  return (
    <pre
      data-testid={testId}
      className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-xs text-emerald-300"
    >
      {JSON.stringify({ hasLeft }, null, 2)}
    </pre>
  )
}

function StatusText({
  hasLeft,
  hasEntered,
  testId = 'page-leave-status',
}: {
  hasLeft: boolean
  hasEntered: boolean
  testId?: string
}) {
  const label = pageLeaveStatusLabel(hasLeft, hasEntered)

  return (
    <p
      data-testid={testId}
      aria-live="polite"
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        hasLeft
          ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
          : hasEntered
            ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
            : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
      }`}
    >
      {label}
    </p>
  )
}

export function PageLeaveDetectorExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-primary-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Page leave detector"
      description="Observes mouse boundary events on an isolated same-origin iframe window — not the Storybook manager document. Idle means the pointer has not entered this frame yet; hasLeft stays false until a real leave after enter."
      instruction="Move into the framed page first, then outside it. Re-enter to clear leave state. Automated tests dispatch native events on the iframe window."
      badge={pageWindow ? 'Observing iframe' : 'Waiting for iframe'}
      code={snippets.pageLeaveDetectorSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'hasLeft',
              value: String(hasLeft),
              testId: 'page-leave-has-left',
            },
            {
              label: 'Window',
              value: pageWindow ? 'iframe' : 'pending',
              testId: 'page-leave-window-state',
            },
          ]}
        />
      }
    >
      <div className="space-y-4" data-testid="page-leave-detector">
        <div
          className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4"
          role="region"
          aria-label="Isolated demo page"
        >
          <p className="text-center text-sm font-semibold text-slate-800">
            Move into this page, then outside it
          </p>
          <div className="mt-3">
            <CursorArt />
          </div>
          <div className="mt-3">{iframe}</div>
        </div>
        <StatusText hasLeft={hasLeft} hasEntered={hasEntered} />
        <Snapshot hasLeft={hasLeft} />
      </div>
    </Shell>
  )
}

export function BasicUsageExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-basic-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Basic usage"
      description="Minimal boolean leave state from mouseout / mouseover on the selected window."
      instruction="Leave and re-enter the framed page to toggle the boolean."
      code={snippets.basicUsageSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-basic">
        {iframe}
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-basic-status"
        />
      </div>
    </Shell>
  )
}

export function ReEnteringExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-reenter-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Re-entering the page"
      description="mouseover clears leave state. Leave is not sticky until a qualifying mouseout happens again."
      instruction="Leave the frame, then move back in."
      code={snippets.reEnteringSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-reenter">
        {iframe}
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-reenter-status"
        />
      </div>
    </Shell>
  )
}

export function InternalMovementExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-internal-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Internal element movement"
      description="mouseout with a non-null relatedTarget (nested elements or an in-document iframe) does not count as leaving."
      instruction="Use the Simulate internal move control, then compare with a real leave."
      code={snippets.internalMovementSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-internal">
        {iframe}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            data-testid="page-leave-internal-move"
            onClick={() => {
              if (pageWindow == null) return
              const doc = pageWindow.document
              const related = doc.body
              pageWindow.dispatchEvent(
                new MouseEvent('mouseout', {
                  bubbles: true,
                  relatedTarget: related,
                }),
              )
            }}
          >
            Simulate internal move
          </button>
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            data-testid="page-leave-internal-leave"
            onClick={() => {
              if (pageWindow == null) return
              pageWindow.dispatchEvent(
                new MouseEvent('mouseover', {
                  bubbles: true,
                }),
              )
              pageWindow.dispatchEvent(
                new MouseEvent('mouseout', {
                  bubbles: true,
                  relatedTarget: null,
                }),
              )
            }}
          >
            Simulate leave
          </button>
        </div>
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-internal-status"
        />
      </div>
    </Shell>
  )
}

export function ExitIntentExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-exit-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)
  const [dismissed, setDismissed] = useState(false)
  const titleId = useId()

  if (!hasLeft && dismissed) {
    setDismissed(false)
  }

  const show = hasLeft && !dismissed

  return (
    <Shell
      title="Exit-intent message"
      description="Ethical, dismissible reminder UI. No beforeunload, no focus theft, no fake urgency, and no navigation blocking."
      instruction="Move into the framed page, leave it to reveal the message, then Dismiss."
      code={snippets.exitIntentSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-exit">
        {iframe}
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-exit-status"
        />
        {show ? (
          <div
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm"
            data-testid="page-leave-exit-dialog"
          >
            <h3 id={titleId} className="text-base font-semibold text-slate-900">
              Still browsing?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              This is a gentle reminder only. It does not block navigation or
              submit anything.
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              data-testid="page-leave-exit-dismiss"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </Shell>
  )
}

export function PausingEffectExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-pause-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)
  const effectActive = hasEntered && !hasLeft

  return (
    <Shell
      title="Pausing a visual effect"
      description="Pause decorative motion when the pointer leaves the page. Respects prefers-reduced-motion."
      instruction="Move into the frame, then leave it to pause the panel animation."
      code={snippets.pausingEffectSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-pause">
        {iframe}
        <div
          aria-hidden="true"
          data-testid="page-leave-pause-panel"
          data-paused={hasLeft ? 'true' : 'false'}
          className={`h-16 rounded-xl bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-500 ${
            effectActive
              ? 'motion-safe:animate-[pulse_1.6s_ease-in-out_infinite] motion-reduce:animate-none'
              : ''
          }`}
        />
        <p data-testid="page-leave-pause-status" aria-live="polite">
          {hasLeft
            ? 'Effect paused'
            : hasEntered
              ? 'Effect running'
              : 'Effect idle'}
        </p>
      </div>
    </Shell>
  )
}

export function DraftReminderExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-draft-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const [draft, setDraft] = useState('Hello draft')

  return (
    <Shell
      title="Draft reminder"
      description="Local UI reminder only. Does not intercept navigation, persist, or send content."
      instruction="Type a draft, then leave the framed page."
      code={snippets.draftReminderSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-draft">
        {iframe}
        <label className="block text-sm text-slate-700">
          Draft
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            value={draft}
            data-testid="page-leave-draft-input"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        {hasLeft ? (
          <p role="status" data-testid="page-leave-draft-reminder">
            Draft is still local in this tab.
          </p>
        ) : null}
      </div>
    </Shell>
  )
}

export function EnabledStateExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-enabled-iframe')
  const [enabled, setEnabled] = useState(true)
  const hasLeft = usePageLeave({ window: pageWindow, enabled })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Enabled state"
      description="Disabling detaches listeners and preserves the current boolean. Re-enabling does not reseed initialValue."
      instruction="Toggle enabled, leave the page, disable, and confirm state is preserved."
      code={snippets.enabledStateSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-enabled">
        {iframe}
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          data-testid="page-leave-enabled-toggle"
          onClick={() => setEnabled((value) => !value)}
        >
          {enabled ? 'Disable' : 'Enable'}
        </button>
        <p data-testid="page-leave-enabled-flag">enabled: {String(enabled)}</p>
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-enabled-status"
        />
      </div>
    </Shell>
  )
}

export function InitialValueExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-initial-iframe')
  const hasLeft = usePageLeave({ window: pageWindow, initialValue: true })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Initial value"
      description="initialValue seeds the first render and SSR once. Later prop changes do not overwrite live state."
      instruction="Confirm the story starts left, then re-enter the frame."
      code={snippets.initialValueSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-initial">
        {iframe}
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-initial-status"
        />
        <Snapshot hasLeft={hasLeft} testId="page-leave-initial-snapshot" />
      </div>
    </Shell>
  )
}

export function CustomIframeExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-custom-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Custom iframe window"
      description="Pass an iframe contentWindow to observe that browsing context only."
      instruction="Leave events are scoped to the iframe window, not the manager document."
      code={snippets.customIframeSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-custom">
        {iframe}
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-custom-status"
        />
      </div>
    </Shell>
  )
}

export function DynamicWindowExample() {
  const a = useIframeWindow('page-leave-dynamic-a')
  const b = useIframeWindow('page-leave-dynamic-b')
  const [target, setTarget] = useState<'a' | 'b'>('a')
  const pageWindow = target === 'a' ? a.pageWindow : b.pageWindow
  const hasLeft = usePageLeave({
    window: pageWindow,
  })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Dynamic window"
      description="Replacing the observed window preserves the current boolean and does not synthesize enter or leave."
      instruction="Leave window A, switch observation to B, then confirm state is preserved until B emits events."
      code={snippets.dynamicWindowSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-dynamic">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">
              Window A
            </p>
            {a.iframe}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">
              Window B
            </p>
            {b.iframe}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="page-leave-observe-a"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setTarget('a')}
          >
            Observe A
          </button>
          <button
            type="button"
            data-testid="page-leave-observe-b"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => setTarget('b')}
          >
            Observe B
          </button>
        </div>
        <p data-testid="page-leave-dynamic-target">Observing: {target}</p>
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-dynamic-status"
        />
      </div>
    </Shell>
  )
}

export function MultipleInstancesExample() {
  const a = useIframeWindow('page-leave-multi-a')
  const b = useIframeWindow('page-leave-multi-b')
  const leftA = usePageLeave({ window: a.pageWindow })
  const leftB = usePageLeave({ window: b.pageWindow })
  const enteredA = usePointerEntered(a.pageWindow)
  const enteredB = usePointerEntered(b.pageWindow)

  return (
    <Shell
      title="Multiple instances"
      description="Each hook instance tracks its own window independently."
      instruction="Leave A and B separately and compare statuses."
      code={snippets.multipleInstancesSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-multi">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            {a.iframe}
            <StatusText
              hasLeft={leftA}
              hasEntered={enteredA}
              testId="page-leave-multi-a-status"
            />
          </div>
          <div>
            {b.iframe}
            <StatusText
              hasLeft={leftB}
              hasEntered={enteredB}
              testId="page-leave-multi-b-status"
            />
          </div>
        </div>
      </div>
    </Shell>
  )
}

export function TabVisibilityExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-visibility-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)
  const [hidden, setHidden] = useState(false)

  return (
    <Shell
      title="Tab visibility is different"
      description="document.hidden / blur / visibilitychange are not page-leave signals. Consumers needing visibility should use a dedicated visibility hook."
      instruction="Simulate blur and visibility on the iframe document — leave state should stay unchanged."
      code={snippets.tabVisibilitySnippet}
    >
      <div className="space-y-3" data-testid="page-leave-visibility">
        {iframe}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="page-leave-sim-blur"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              pageWindow?.dispatchEvent(new Event('blur'))
              setHidden(true)
            }}
          >
            Simulate blur / hidden
          </button>
          <button
            type="button"
            data-testid="page-leave-sim-visible"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={() => {
              pageWindow?.dispatchEvent(new Event('focus'))
              setHidden(false)
            }}
          >
            Simulate focus / visible
          </button>
        </div>
        <p data-testid="page-leave-visibility-hidden">
          Simulated hidden: {String(hidden)}
        </p>
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-visibility-status"
        />
      </div>
    </Shell>
  )
}

export function TouchLimitationExample() {
  const { pageWindow, iframe } = useIframeWindow('page-leave-touch-iframe')
  const hasLeft = usePageLeave({ window: pageWindow })
  const hasEntered = usePointerEntered(pageWindow)

  return (
    <Shell
      title="Touch-device limitation"
      description="Mouse-only by design. Touch and pointer-capture behavior are outside this hook’s contract."
      instruction="Dispatch a touchend on the iframe window — leave state should stay false."
      code={snippets.touchLimitationSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-touch">
        {iframe}
        <button
          type="button"
          data-testid="page-leave-sim-touch"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => {
            pageWindow?.dispatchEvent(new Event('touchend'))
          }}
        >
          Simulate touchend
        </button>
        <StatusText
          hasLeft={hasLeft}
          hasEntered={hasEntered}
          testId="page-leave-touch-status"
        />
      </div>
    </Shell>
  )
}

export function NullWindowExample() {
  const hasLeft = usePageLeave({ window: null, initialValue: false })

  return (
    <Shell
      title="Unsupported or null window"
      description="Explicit window: null never falls back to the global window and registers no listeners."
      instruction="Confirm idle false state with no observation."
      code={snippets.nullWindowSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-null">
        <p className="text-sm text-slate-600">
          Explicit null disables browser resolution.
        </p>
        <StatusText
          hasLeft={hasLeft}
          hasEntered={false}
          testId="page-leave-null-status"
        />
        <Snapshot hasLeft={hasLeft} testId="page-leave-null-snapshot" />
      </div>
    </Shell>
  )
}

export function PlaygroundExample({
  enabled = true,
  initialValue = false,
}: {
  enabled?: boolean
  initialValue?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const { pageWindow, iframe } = useIframeWindow('page-leave-playground-iframe')
  const hasLeft = usePageLeave({
    window: pageWindow,
    enabled: mounted && enabled,
    initialValue,
  })
  const hasEntered = usePointerEntered(mounted ? pageWindow : null)

  return (
    <Shell
      title="Playground"
      description="Docs-safe playground. Mount explicitly so Docs mode does not attach listeners until you opt in."
      instruction="Mount the demo, then leave/re-enter the framed page."
      code={snippets.playgroundSnippet}
    >
      <div className="space-y-3" data-testid="page-leave-playground">
        <button
          type="button"
          data-testid="page-leave-playground-mount"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setMounted(true)}
        >
          {mounted ? 'Mounted' : 'Mount playground'}
        </button>
        {mounted ? (
          <>
            {iframe}
            <StatusText
              hasLeft={hasLeft}
              hasEntered={hasEntered}
              testId="page-leave-playground-status"
            />
            <Snapshot
              hasLeft={hasLeft}
              testId="page-leave-playground-snapshot"
            />
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Playground is idle until mounted.
          </p>
        )}
      </div>
    </Shell>
  )
}
