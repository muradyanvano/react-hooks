export const mediaViewerSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function FullscreenMediaViewer() {
  const ref = useRef<HTMLDivElement>(null)
  const { isSupported, isFullscreen, error, enter, exit } = useFullscreen(ref, {
    navigationUI: 'hide',
  })

  return (
    <div>
      <div ref={ref} data-fullscreen-stage>
        <h2>Media stage</h2>
        <p>{isFullscreen ? 'Fullscreen' : 'Inline'}</p>
      </div>
      <button
        type="button"
        disabled={!isSupported}
        onClick={() => {
          void (isFullscreen ? exit() : enter())
        }}
      >
        {isFullscreen ? 'Exit fullscreen' : 'Go Fullscreen'}
      </button>
      {error ? <p role="alert">{error.message}</p> : null}
      <p>Press Escape to exit fullscreen.</p>
    </div>
  )
}
`

export const liveNativeSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function LiveNativeFullscreen() {
  const ref = useRef<HTMLDivElement>(null)
  const { isSupported, isFullscreen, fullscreenElement, enter, exit, error } =
    useFullscreen(ref)

  return (
    <div>
      <div ref={ref}>
        <p>Supported: {String(isSupported)}</p>
        <p>Fullscreen: {String(isFullscreen)}</p>
        <p>Element: {fullscreenElement?.tagName ?? 'none'}</p>
      </div>
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Enter fullscreen
      </button>
      <button type="button" onClick={() => void exit()}>
        Exit fullscreen
      </button>
      {error ? <p role="alert">{error.message}</p> : null}
      <p>Requires a user gesture. Escape exits. iframe pages need allowfullscreen.</p>
    </div>
  )
}
`

export const entireDocumentSnippet = `import { useFullscreen } from '@muradyanvano/react-hooks'

export function EntireDocumentFullscreen() {
  const { isFullscreen, enter, exit, isSupported } = useFullscreen()

  return (
    <button
      type="button"
      disabled={!isSupported}
      onClick={() => void (isFullscreen ? exit() : enter())}
    >
      {isFullscreen ? 'Exit document fullscreen' : 'Enter document fullscreen'}
    </button>
  )
}
`

export const specificElementSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function SpecificElementFullscreen() {
  const ref = useRef<HTMLElement>(null)
  const { isFullscreen, toggle, isSupported } = useFullscreen(ref)

  return (
    <section ref={ref}>
      <p>Card content</p>
      <button type="button" disabled={!isSupported} onClick={() => void toggle()}>
        {isFullscreen ? 'Exit' : 'Make this card fullscreen'}
      </button>
    </section>
  )
}
`

export const videoPlayerSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function VideoPlayerLayout() {
  const stageRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, enter, exit, isSupported } = useFullscreen(stageRef)

  return (
    <div ref={stageRef}>
      <div role="img" aria-label="Synthetic video frame">Poster</div>
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Go Fullscreen
      </button>
      <button type="button" onClick={() => void exit()}>
        Exit fullscreen
      </button>
    </div>
  )
}
`

export const presentationSnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function PresentationSlides() {
  const ref = useRef<HTMLDivElement>(null)
  const [slide, setSlide] = useState(0)
  const { isFullscreen, toggle, isSupported } = useFullscreen(ref)

  return (
    <div ref={ref}>
      <p>Slide {slide + 1}</p>
      <button type="button" onClick={() => setSlide((s) => (s + 1) % 3)}>
        Next slide
      </button>
      <button type="button" disabled={!isSupported} onClick={() => void toggle()}>
        {isFullscreen ? 'Exit presentation' : 'Present fullscreen'}
      </button>
    </div>
  )
}
`

export const gallerySnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function ImageGalleryFullscreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const { isFullscreen, enter, exit, isSupported } = useFullscreen(ref)

  return (
    <div>
      <div ref={ref} aria-live="polite">
        Artwork {index + 1}
      </div>
      <button type="button" onClick={() => setIndex((i) => (i + 1) % 3)}>
        Next
      </button>
      <button
        type="button"
        disabled={!isSupported}
        onClick={() => void (isFullscreen ? exit() : enter())}
      >
        {isFullscreen ? 'Exit fullscreen' : 'Go Fullscreen'}
      </button>
    </div>
  )
}
`

export const svgSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function SvgVisualizationFullscreen() {
  const ref = useRef<SVGSVGElement>(null)
  const { isFullscreen, toggle, isSupported } = useFullscreen(ref)

  return (
    <div>
      <svg ref={ref} viewBox="0 0 120 80" role="img" aria-label="Chart">
        <rect width="120" height="80" fill="#e2e8f0" />
        <circle cx="60" cy="40" r="24" fill="#4f46e5" />
      </svg>
      <button type="button" disabled={!isSupported} onClick={() => void toggle()}>
        {isFullscreen ? 'Exit' : 'Fullscreen chart'}
      </button>
    </div>
  )
}
`

export const navigationUiSnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function NavigationUiOptions() {
  const ref = useRef<HTMLDivElement>(null)
  const [navigationUI, setNavigationUI] = useState<'auto' | 'show' | 'hide'>('auto')
  const { enter, isSupported, isFullscreen, exit } = useFullscreen(ref, {
    navigationUI,
  })

  return (
    <div>
      <div ref={ref}>Stage</div>
      <label>
        navigationUI
        <select
          value={navigationUI}
          onChange={(event) =>
            setNavigationUI(event.target.value as 'auto' | 'show' | 'hide')
          }
        >
          <option value="auto">auto</option>
          <option value="show">show</option>
          <option value="hide">hide</option>
        </select>
      </label>
      <button
        type="button"
        disabled={!isSupported}
        onClick={() => void (isFullscreen ? exit() : enter())}
      >
        {isFullscreen ? 'Exit fullscreen' : 'Go Fullscreen'}
      </button>
    </div>
  )
}
`

export const escapeExitSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function EscapeAndExternalExit() {
  const ref = useRef<HTMLDivElement>(null)
  const { isFullscreen, enter, isSupported } = useFullscreen(ref)

  return (
    <div>
      <div ref={ref}>Press Escape after entering to leave fullscreen.</div>
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Go Fullscreen
      </button>
      <p>Status: {isFullscreen ? 'fullscreen' : 'inline'}</p>
    </div>
  )
}
`

export const externalEntrySnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function ExternalFullscreenEntry() {
  const ref = useRef<HTMLDivElement>(null)
  const { isFullscreen, fullscreenElement, isSupported } = useFullscreen(ref)

  return (
    <div ref={ref}>
      <p>Supported: {String(isSupported)}</p>
      <p>This target fullscreen: {String(isFullscreen)}</p>
      <p>Active element: {fullscreenElement?.id ?? 'none'}</p>
    </div>
  )
}
`

export const anotherElementSnippet = `import { useRef } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function AnotherElementFullscreen() {
  const mine = useRef<HTMLDivElement>(null)
  const { isFullscreen, fullscreenElement, exit, isSupported } = useFullscreen(mine)

  return (
    <div>
      <div ref={mine} id="mine">Mine</div>
      <p>Mine fullscreen: {String(isFullscreen)}</p>
      <p>Active: {fullscreenElement?.id ?? 'none'}</p>
      <button type="button" disabled={!isSupported} onClick={() => void exit()}>
        Exit only if mine is active
      </button>
    </div>
  )
}
`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function EnabledFullscreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const { isSupported, isFullscreen, enter, exit } = useFullscreen(ref, { enabled })

  return (
    <div>
      <div ref={ref}>Stage</div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Observe fullscreen
      </label>
      <button type="button" disabled={!isSupported || !enabled} onClick={() => void enter()}>
        Go Fullscreen
      </button>
      <button type="button" onClick={() => void exit()}>
        Exit fullscreen
      </button>
      <p>{isFullscreen ? 'Fullscreen' : 'Inline'}</p>
    </div>
  )
}
`

export const autoExitSnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function AutoExitDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(true)

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={mounted}
          onChange={(event) => setMounted(event.target.checked)}
        />
        Mount viewer
      </label>
      {mounted ? <AutoExitViewer stageRef={ref} /> : null}
    </div>
  )
}

function AutoExitViewer({
  stageRef,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>
}) {
  const { enter, isFullscreen, isSupported } = useFullscreen(stageRef, {
    autoExit: true,
  })
  return (
    <div>
      <div ref={stageRef}>Unmount while fullscreen to auto-exit</div>
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Go Fullscreen
      </button>
      <p>{isFullscreen ? 'Fullscreen' : 'Inline'}</p>
    </div>
  )
}
`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function DynamicTargetFullscreen() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const active = useA ? aRef : bRef
  const { isFullscreen, enter, isSupported } = useFullscreen(active)

  return (
    <div>
      <div ref={aRef}>Target A</div>
      <div ref={bRef}>Target B</div>
      <button type="button" onClick={() => setUseA((value) => !value)}>
        Watch {useA ? 'B' : 'A'}
      </button>
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Go Fullscreen
      </button>
      <p>{isFullscreen ? 'Active target fullscreen' : 'Inline'}</p>
    </div>
  )
}
`

export const iframeDocumentSnippet = `import { useEffect, useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function IframeDocumentFullscreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const { isSupported, isFullscreen, enter, exit } = useFullscreen(undefined, {
    document: doc,
  })

  return (
    <div>
      <iframe
        ref={iframeRef}
        title="Fullscreen iframe demo"
        srcDoc="<html><body><main id='stage'>Iframe stage</main></body></html>"
        onLoad={(event) => setDoc(event.currentTarget.contentDocument)}
      />
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Go Fullscreen
      </button>
      <button type="button" onClick={() => void exit()}>
        Exit fullscreen
      </button>
      <p>{isFullscreen ? 'Fullscreen' : 'Inline'}</p>
    </div>
  )
}
`

export const unsupportedSnippet = `import { useFullscreen } from '@muradyanvano/react-hooks'

export function UnsupportedFullscreen() {
  const { isSupported, enter } = useFullscreen(undefined, { document: null })

  return (
    <div>
      <p>Supported: {String(isSupported)}</p>
      <button type="button" disabled={!isSupported} onClick={() => void enter()}>
        Go Fullscreen
      </button>
    </div>
  )
}
`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useFullscreen } from '@muradyanvano/react-hooks'

export function FullscreenPlayground() {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [navigationUI, setNavigationUI] = useState<'auto' | 'show' | 'hide'>('auto')
  const { isSupported, isFullscreen, error, enter, exit, toggle } = useFullscreen(
    ref,
    { enabled, navigationUI, autoExit: false },
  )

  return (
    <div>
      <div ref={ref}>Playground stage</div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <select
        value={navigationUI}
        onChange={(event) =>
          setNavigationUI(event.target.value as 'auto' | 'show' | 'hide')
        }
      >
        <option value="auto">auto</option>
        <option value="show">show</option>
        <option value="hide">hide</option>
      </select>
      <button type="button" disabled={!isSupported || !enabled} onClick={() => void enter()}>
        Enter
      </button>
      <button type="button" onClick={() => void exit()}>
        Exit
      </button>
      <button type="button" disabled={!isSupported || !enabled} onClick={() => void toggle()}>
        Toggle
      </button>
      <p>{isFullscreen ? 'Fullscreen' : 'Inline'}</p>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  )
}
`
