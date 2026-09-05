export const pageLeaveDetectorSnippet = `import { useEffect, useRef, useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function PageLeaveDetector() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [pageWindow, setPageWindow] = useState<Window | null>(null)
  const hasLeft = usePageLeave({ window: pageWindow })

  useEffect(() => {
    const frame = iframeRef.current
    if (frame?.contentWindow != null) {
      setPageWindow(frame.contentWindow)
    }
  }, [])

  return (
    <div>
      <p>Move your mouse outside this page</p>
      <iframe
        ref={iframeRef}
        title="Isolated demo page"
        srcDoc="<html><body><p>Demo page surface</p></body></html>"
        onLoad={(event) => setPageWindow(event.currentTarget.contentWindow)}
      />
      <p>{hasLeft ? 'Mouse left page' : 'Not left (idle or inside)'}</p>
      <pre>{JSON.stringify({ hasLeft }, null, 2)}</pre>
    </div>
  )
}`

export const basicUsageSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function BasicPageLeave() {
  const hasLeft = usePageLeave()

  return <p>{hasLeft ? 'Mouse left page' : 'Not left (idle or inside)'}</p>
}`

export const reEnteringSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function ReEnteringDemo() {
  const hasLeft = usePageLeave()

  return (
    <div>
      <p>{hasLeft ? 'Away' : 'Present'}</p>
      <p>Leave the page, then move back in to clear the leave state.</p>
    </div>
  )
}`

export const internalMovementSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function InternalMovementDemo() {
  const hasLeft = usePageLeave()

  return (
    <div>
      <p>Moving between nested buttons stays inside.</p>
      <button type="button">One</button>
      <button type="button">Two</button>
      <p>{hasLeft ? 'Left' : 'Still inside'}</p>
    </div>
  )
}`

export const exitIntentSnippet = `import { useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function ExitIntentMessage() {
  const hasLeft = usePageLeave()
  const [dismissed, setDismissed] = useState(false)
  const show = hasLeft && !dismissed

  return (
    <div>
      {show ? (
        <div role="dialog" aria-labelledby="exit-title">
          <h2 id="exit-title">Still browsing?</h2>
          <p>This is a gentle, dismissible reminder — not a navigation block.</p>
          <button type="button" onClick={() => setDismissed(true)}>
            Dismiss
          </button>
        </div>
      ) : null}
      <p>{hasLeft ? 'Mouse left page' : 'Not left (idle or inside)'}</p>
    </div>
  )
}`

export const pausingEffectSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function PausingVisualEffect() {
  const hasLeft = usePageLeave()

  return (
    <div>
      <div aria-hidden="true" data-paused={hasLeft ? 'true' : 'false'}>
        Animated panel
      </div>
      <p>{hasLeft ? 'Effect paused' : 'Effect running'}</p>
    </div>
  )
}`

export const draftReminderSnippet = `import { useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function DraftReminder() {
  const hasLeft = usePageLeave()
  const [draft, setDraft] = useState('Hello draft')

  return (
    <div>
      <label>
        Draft
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      {hasLeft ? <p role="status">Draft is still local in this tab.</p> : null}
    </div>
  )
}`

export const enabledStateSnippet = `import { useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function EnabledPageLeave() {
  const [enabled, setEnabled] = useState(true)
  const hasLeft = usePageLeave({ enabled })

  return (
    <div>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? 'Disable' : 'Enable'}
      </button>
      <p>{hasLeft ? 'Mouse left page' : 'Not left (idle or inside)'}</p>
    </div>
  )
}`

export const initialValueSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function InitialLeftState() {
  const hasLeft = usePageLeave({ initialValue: true })

  return <p>{hasLeft ? 'Starts left' : 'Not left (idle or inside)'}</p>
}`

export const customIframeSnippet = `import { useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function CustomIframeWindow() {
  const [pageWindow, setPageWindow] = useState<Window | null>(null)
  const hasLeft = usePageLeave({ window: pageWindow })

  return (
    <div>
      <iframe
        title="Custom page window"
        srcDoc="<html><body><p>Custom window</p></body></html>"
        onLoad={(event) => setPageWindow(event.currentTarget.contentWindow)}
      />
      <p>{hasLeft ? 'Left custom page' : 'Inside custom page'}</p>
    </div>
  )
}`

export const dynamicWindowSnippet = `import { useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function DynamicWindowDemo({
  windowA,
  windowB,
}: {
  windowA: Window
  windowB: Window
}) {
  const [target, setTarget] = useState<Window>(windowA)
  const hasLeft = usePageLeave({ window: target })

  return (
    <div>
      <button type="button" onClick={() => setTarget(windowA)}>
        Observe A
      </button>
      <button type="button" onClick={() => setTarget(windowB)}>
        Observe B
      </button>
      <p>{hasLeft ? 'Left' : 'Inside'}</p>
    </div>
  )
}`

export const multipleInstancesSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function MultiplePageLeave({
  windowA,
  windowB,
}: {
  windowA: Window
  windowB: Window
}) {
  const leftA = usePageLeave({ window: windowA })
  const leftB = usePageLeave({ window: windowB })

  return (
    <div>
      <p>A: {leftA ? 'left' : 'inside'}</p>
      <p>B: {leftB ? 'left' : 'inside'}</p>
    </div>
  )
}`

export const tabVisibilitySnippet = `import { useEffect, useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function TabVisibilityIsDifferent() {
  const hasLeft = usePageLeave()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div>
      <p>Page leave (mouse): {hasLeft ? 'true' : 'false'}</p>
      <p>document.hidden: {hidden ? 'true' : 'false'}</p>
      <p>Switching tabs changes visibility, not necessarily mouse leave.</p>
    </div>
  )
}`

export const touchLimitationSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function TouchDeviceLimitation() {
  const hasLeft = usePageLeave()

  return (
    <div>
      <p>
        This hook listens only to mouse boundary events. Touch-only devices may
        never update leave state.
      </p>
      <p>{hasLeft ? 'Mouse left page' : 'Not left (idle or inside)'}</p>
    </div>
  )
}`

export const nullWindowSnippet = `import { usePageLeave } from '@muradyanvano/react-hooks'

export function NullWindowDemo() {
  const hasLeft = usePageLeave({ window: null, initialValue: false })

  return (
    <div>
      <p>Explicit null disables observation.</p>
      <p>{hasLeft ? 'Left' : 'Idle (no listeners)'}</p>
    </div>
  )
}`

export const playgroundSnippet = `import { useState } from 'react'
import { usePageLeave } from '@muradyanvano/react-hooks'

export function PageLeavePlayground() {
  const [enabled, setEnabled] = useState(true)
  const [initialValue] = useState(false)
  const hasLeft = usePageLeave({ enabled, initialValue })

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <pre>{JSON.stringify({ hasLeft, enabled }, null, 2)}</pre>
    </div>
  )
}`
