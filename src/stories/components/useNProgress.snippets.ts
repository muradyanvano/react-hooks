export const routeTransitionSnippet = `import { useState } from 'react'
import { useNProgress } from '@muradyanvano/react-hooks'

const ROUTES = ['Home', 'Dashboard', 'Settings', 'Profile']

export function AppShell() {
  const [current, setCurrent] = useState('Home')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { start, done } = useNProgress(undefined, {
    parent: containerRef.current ?? undefined,
    trickle: true,
    color: '#4f46e5',
  })

  const navigate = async (route: string) => {
    if (route === current || loading) return
    setLoading(true)
    start()
    await new Promise((r) => setTimeout(r, 800))
    setCurrent(route)
    setLoading(false)
    done()
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden' }}>
      <nav>
        {ROUTES.map((r) => (
          <button key={r} onClick={() => navigate(r)}>{r}</button>
        ))}
      </nav>
      <main>
        {loading ? <p>Loading {current}…</p> : <p>{current} content</p>}
      </main>
    </div>
  )
}`

export const startAndDoneSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function StartDoneDemo() {
  const { isLoading, progress, start, done } = useNProgress()

  return (
    <div>
      <p>{isLoading ? \`Loading \${Math.round((progress ?? 0) * 100)}%\` : 'Idle'}</p>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Complete</button>
    </div>
  )
}`

export const determinateSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function DeterminateDemo() {
  const { isLoading, progress, set } = useNProgress()

  return (
    <div>
      <p>{Math.round((progress ?? 0) * 100)}%</p>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round((progress ?? 0) * 100)}
        onChange={(e) => set(Number(e.target.value) / 100)}
      />
      <button type="button" onClick={() => set(0)}>Reset</button>
    </div>
  )
}`

export const declarativeSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function DeclarativeDemo({ uploadProgress }: { uploadProgress: number | null }) {
  // Pass the progress value directly — useNProgress will activate, update, and
  // complete based on the value. null means complete; undefined means imperative mode.
  const { isLoading, progress } = useNProgress(uploadProgress)

  return (
    <p>
      {isLoading
        ? \`Uploading \${Math.round((progress ?? 0) * 100)}%\`
        : 'Ready'}
    </p>
  )
}`

export const trickleSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function TrickleDemo() {
  const { isLoading, progress, start, done } = useNProgress({
    trickle: true,
    trickleSpeed: 600,
  })

  return (
    <div>
      <p>
        {isLoading
          ? \`Estimated: \${Math.round((progress ?? 0) * 100)}%\`
          : 'Idle'}
      </p>
      <button type="button" onClick={start}>Start trickle</button>
      <button type="button" onClick={() => done()}>Complete</button>
    </div>
  )
}`

export const incrementSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function IncrementDemo() {
  const { isLoading, progress, start, increment, done } = useNProgress({
    trickle: false,
  })

  return (
    <div>
      <p>{Math.round((progress ?? 0) * 100)}%</p>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => increment()}>Increment auto</button>
      <button type="button" onClick={() => increment(0.1)}>+10%</button>
      <button type="button" onClick={() => done()}>Complete</button>
    </div>
  )
}`

export const forcedDoneSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function ForcedDoneDemo() {
  const { isLoading, progress, done } = useNProgress({ trickle: false })

  return (
    <div>
      <p>{isLoading ? \`Progress: \${Math.round((progress ?? 0) * 100)}%\` : 'Idle'}</p>
      <button type="button" onClick={() => done()}>done() — no-op when idle</button>
      <button type="button" onClick={() => done(true)}>done(force) — shows then hides</button>
    </div>
  )
}`

export const immediateRemoveSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function ImmediateRemoveDemo() {
  const { isLoading, start, done, remove } = useNProgress({ trickle: false })

  return (
    <div>
      <p>{isLoading ? 'Active' : 'Idle'}</p>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>done() — completes with transition</button>
      <button type="button" onClick={remove}>remove() — immediate, no animation</button>
    </div>
  )
}`

export const multipleOwnersSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

// Two hooks share one visual bar. The bar shows the slowest (minimum) progress.
function SlowRequest() {
  const { isLoading, start, done } = useNProgress({ trickle: false })
  const simulate = () => {
    start()
    setTimeout(() => done(), 3000)
  }
  return (
    <div>
      <p>Slow: {isLoading ? 'Loading' : 'Idle'}</p>
      <button type="button" onClick={simulate}>Start slow</button>
    </div>
  )
}

function FastRequest() {
  const { isLoading, start, done } = useNProgress({ trickle: false })
  const simulate = () => {
    start()
    setTimeout(() => done(), 800)
  }
  return (
    <div>
      <p>Fast: {isLoading ? 'Loading' : 'Idle'}</p>
      <button type="button" onClick={simulate}>Start fast</button>
    </div>
  )
}`

export const customContainerSnippet = `import { useRef } from 'react'
import { useNProgress } from '@muradyanvano/react-hooks'

export function CardProgress() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { isLoading, start, done } = useNProgress(undefined, {
    parent: cardRef.current,
    color: '#10b981',
    height: 2,
  })

  return (
    <div ref={cardRef} style={{ position: 'relative', overflow: 'hidden' }}>
      <p>{isLoading ? 'Saving…' : 'Ready'}</p>
      <button type="button" onClick={start}>Save</button>
      <button type="button" onClick={() => done()}>Done</button>
    </div>
  )
}`

export const multipleContainersSnippet = `import { useRef } from 'react'
import { useNProgress } from '@muradyanvano/react-hooks'

// Each panel has its own independent progress channel.
function Panel({ label, color }: { label: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { isLoading, start, done } = useNProgress(undefined, {
    parent: ref.current,
    color,
    height: 2,
  })

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden' }}>
      <strong>{label}</strong>
      <p>{isLoading ? 'Loading…' : 'Ready'}</p>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Done</button>
    </div>
  )
}`

export const spinnerSnippet = `import { useState } from 'react'
import { useNProgress } from '@muradyanvano/react-hooks'

export function SpinnerToggle() {
  const [showSpinner, setShowSpinner] = useState(true)
  const { start, done } = useNProgress(undefined, { showSpinner })

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={showSpinner}
          onChange={(e) => setShowSpinner(e.target.checked)}
        />
        Show spinner
      </label>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Done</button>
    </div>
  )
}`

export const visualCustomizationSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function CustomStyles() {
  const { start, done } = useNProgress(undefined, {
    color: '#f59e0b',
    height: 5,
    speed: 400,
    easing: 'linear',
    zIndex: 9999,
  })

  return (
    <div>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Complete</button>
    </div>
  )
}`

export const reducedMotionSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

// The progress bar automatically respects prefers-reduced-motion via its
// injected stylesheet. When the user prefers reduced motion, the CSS transition
// and spinner animation are disabled via the media query:
//
//   @media (prefers-reduced-motion: reduce) {
//     [data-react-hooks-nprogress-bar] { transition: none !important; }
//     [data-react-hooks-nprogress-spinner-icon] { animation: none !important; }
//   }
//
// No additional code is required in your component.

export function ReducedMotionDemo() {
  const { start, done } = useNProgress()
  return (
    <div>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Done</button>
      <p>The bar respects your OS reduced-motion preference automatically.</p>
    </div>
  )
}`

export const asyncSaveSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

async function saveChanges(): Promise<void> {
  await new Promise((r) => setTimeout(r, 1500))
}

export function SaveButton() {
  const { isLoading, progress, start, increment, done } = useNProgress()

  const save = async () => {
    start()
    try {
      await saveChanges()
      done()
    } catch {
      done()
    }
  }

  return (
    <section>
      <p>
        {isLoading
          ? \`Saving \${Math.round((progress ?? 0) * 100)}%\`
          : 'Ready'}
      </p>
      <button type="button" onClick={() => increment()}>
        Advance
      </button>
      <button type="button" disabled={isLoading} onClick={save}>
        Save changes
      </button>
    </section>
  )
}`

export const ssrBehaviorSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

// During server-side rendering, useNProgress returns idle state.
// No DOM elements, styles, or timers are created on the server.
// After the client mounts, effects run and the hook becomes fully active.

export function LoadingIndicator() {
  const { isLoading, progress } = useNProgress()
  // isLoading = false, progress = null during SSR
  // After mount, imperative calls work normally.

  return (
    <p aria-live="polite">
      {isLoading ? \`Loading \${Math.round((progress ?? 0) * 100)}%\` : null}
    </p>
  )
}`

export const playgroundSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

export function ProgressPlayground() {
  const { isLoading, progress, start, set, increment, done, remove } = useNProgress({
    minimum: 0.08,
    trickle: true,
    trickleSpeed: 200,
    speed: 200,
    removeDelay: 200,
    showSpinner: true,
    color: '#4f46e5',
    height: 3,
  })

  return (
    <div>
      <p>{isLoading ? \`\${Math.round((progress ?? 0) * 100)}%\` : 'Idle'}</p>
      <button type="button" onClick={start}>start()</button>
      <button type="button" onClick={() => set(0.5)}>set(0.5)</button>
      <button type="button" onClick={() => increment()}>increment()</button>
      <button type="button" onClick={() => done()}>done()</button>
      <button type="button" onClick={remove}>remove()</button>
    </div>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useNProgress } from '@muradyanvano/react-hooks'

export function DynamicTarget() {
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<1 | 2>(1)

  const parent = active === 1 ? ref1.current : ref2.current
  const { isLoading, start, done } = useNProgress(undefined, { parent })

  return (
    <div>
      <button type="button" onClick={() => setActive(1)}>Use Panel 1</button>
      <button type="button" onClick={() => setActive(2)}>Use Panel 2</button>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Done</button>
      <div ref={ref1} style={{ position: 'relative', overflow: 'hidden' }}>Panel 1</div>
      <div ref={ref2} style={{ position: 'relative', overflow: 'hidden' }}>Panel 2</div>
    </div>
  )
}`

export const concurrentRequestsSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

function useRequest(label: string, duration: number) {
  const { isLoading, progress, start, done } = useNProgress({ trickle: false })
  const run = () => {
    start()
    let p = 0
    const step = () => {
      p += 0.1
      if (p >= 1) { done(); return }
      setTimeout(step, duration / 10)
    }
    step()
  }
  return { label, isLoading, progress, run }
}`

export const strictCleanupSnippet = `import { useNProgress } from '@muradyanvano/react-hooks'

// On unmount, useNProgress automatically releases its owner, cancels any
// pending completion/trickle timers, and removes its DOM elements if no
// other hook instances remain active.

export function MountableProgress({ mounted }: { mounted: boolean }) {
  return mounted ? <ProgressIndicator /> : <p>Unmounted — DOM is clean</p>
}

function ProgressIndicator() {
  const { isLoading, start, done } = useNProgress({ trickle: false })
  return (
    <div>
      <p>{isLoading ? 'Loading' : 'Idle'}</p>
      <button type="button" onClick={start}>Start</button>
      <button type="button" onClick={() => done()}>Done</button>
    </div>
  )
}`
