import { useRef, useState } from 'react'
import { useMousePressed } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  callbacksSnippet,
  captureModeSnippet,
  dragLifecycleSnippet,
  dynamicTargetSnippet,
  elementTargetSnippet,
  enabledStateSnippet,
  entirePageSnippet,
  initialValueSnippet,
  mouseOnlySnippet,
  nestedContentSnippet,
  playgroundSnippet,
  pressAndHoldSnippet,
  touchInputSnippet,
} from './useMousePressed.snippets'

const padClass =
  'relative flex min-h-56 w-full select-none items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center outline-none transition-[transform,box-shadow,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none'
const padPressedClass =
  'scale-[0.985] border-indigo-500 bg-indigo-50 shadow-inner'
const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

function SourceBadge({ sourceType }: { sourceType: 'mouse' | 'touch' | null }) {
  const label =
    sourceType === 'mouse' ? 'mouse' : sourceType === 'touch' ? 'touch' : 'idle'
  const tone =
    sourceType === 'mouse'
      ? 'bg-emerald-50 text-emerald-800'
      : sourceType === 'touch'
        ? 'bg-sky-50 text-sky-800'
        : 'bg-slate-100 text-slate-600'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
      data-testid="source-badge"
    >
      source: {label}
    </span>
  )
}

function PressStatus({
  pressed,
  sourceType,
  pressedTestId = 'pressed-value',
  sourceTestId = 'source-value',
}: {
  pressed: boolean
  sourceType: 'mouse' | 'touch' | null
  pressedTestId?: string
  sourceTestId?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p
        className="font-mono text-sm font-semibold tabular-nums text-slate-900"
        data-testid={pressedTestId}
      >
        {pressed ? 'Pressed' : 'Released'}
      </p>
      <span data-testid={sourceTestId}>
        <SourceBadge sourceType={sourceType} />
      </span>
    </div>
  )
}

export function PressAndHoldExample() {
  const padRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: padRef })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Press and hold"
      description="Tracks an aggregate mouse, touch, or drag press lifecycle on the pad. Release listeners attach to the owning window, so releasing outside the pad still returns to idle."
      instruction="Press and hold inside the pad, then release anywhere — including outside the pad — to return to Released."
      code={pressAndHoldSnippet}
      badge="Primary"
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'status-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'status-source',
            },
          ]}
        />
      }
    >
      <div
        ref={padRef}
        role="img"
        aria-label="Press and hold interaction pad"
        data-testid="press-pad"
        className={`${padClass} ${pressed ? padPressedClass : ''}`}
      >
        <div className="space-y-2 px-4">
          <p className="text-lg font-semibold text-slate-900">Press and hold</p>
          <PressStatus
            pressed={pressed}
            sourceType={sourceType}
            pressedTestId="pad-pressed"
            sourceTestId="pad-source"
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        This surface tracks pointer press state only. It is not a
        keyboard-accessible button.
      </p>
      <p className="sr-only" aria-live="polite">
        {pressed ? `Pressed via ${sourceType ?? 'unknown'}` : 'Released'}
      </p>
    </ExampleShowcase>
  )
}

export function EntirePageExample() {
  const [mounted, setMounted] = useState(false)
  const { pressed, sourceType } = useMousePressed({
    enabled: mounted,
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Tracking on entire page"
      description="Omitted target resolves to window inside an effect. This demo is mount-gated so Storybook Docs does not track presses globally on load."
      instruction="Mount the tracker, then press anywhere inside this story preview."
      code={entirePageSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'page-mounted',
            },
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'page-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'page-source',
            },
          ]}
        />
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="page-mount"
          checked={mounted}
          onChange={(event) => {
            setMounted(event.target.checked)
          }}
        />
        Mount window tracking
      </label>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <PressStatus
          pressed={pressed}
          sourceType={sourceType}
          pressedTestId="page-status-pressed"
          sourceTestId="page-status-source"
        />
      </div>
    </ExampleShowcase>
  )
}

export function ElementTargetExample() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: cardRef })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Element target"
      description="Only presses that begin on the card activate the lifecycle. Global release listeners still clear the state when the pointer lifts outside."
      instruction="Press on the card, then release outside it."
      code={elementTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'card-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'card-source',
            },
          ]}
        />
      }
    >
      <div
        ref={cardRef}
        data-testid="card-target"
        className={`${padClass} ${pressed ? padPressedClass : ''}`}
        aria-label="Pressable card target"
      >
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

export function MouseOnlyExample() {
  const padRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: padRef,
    touch: false,
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Mouse only"
      description="With touch: false, synthetic touch events do not change the hook state."
      instruction="Use mouse input on the pad. Synthetic touch events should leave state unchanged."
      code={mouseOnlySnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'mouse-only-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'mouse-only-source',
            },
          ]}
        />
      }
    >
      <div
        ref={padRef}
        data-testid="mouse-only-pad"
        className={`${padClass} ${pressed ? padPressedClass : ''}`}
        aria-label="Mouse-only press pad"
      >
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

export function TouchInputExample() {
  const padRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: padRef })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Touch input"
      description="Touchstart activates the lifecycle. The hook stays pressed until the final active touch ends."
      instruction="Use touch or synthetic touch events on the pad."
      code={touchInputSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'touch-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'touch-source',
            },
          ]}
        />
      }
    >
      <div
        ref={padRef}
        data-testid="touch-pad"
        style={{ touchAction: 'none' }}
        className={`${padClass} ${pressed ? padPressedClass : ''}`}
        aria-label="Touch press pad"
      >
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

export function DragLifecycleExample() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: zoneRef })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Drag lifecycle"
      description="dragstart activates the lifecycle; dragend or drop releases it. The hook does not make elements draggable — the card below uses native draggable."
      instruction="Drag the card across the drop zone."
      code={dragLifecycleSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'drag-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'drag-source',
            },
          ]}
        />
      }
    >
      <div
        ref={zoneRef}
        data-testid="drag-zone"
        className="min-h-56 rounded-xl border border-dashed border-slate-400 bg-slate-50 p-4"
        aria-label="Drag tracking drop zone"
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDrop={(event) => {
          event.preventDefault()
        }}
      >
        <div
          draggable
          data-testid="drag-card"
          className="inline-flex cursor-grab rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow active:cursor-grabbing"
        >
          Draggable card
        </div>
        <div className="mt-4">
          <PressStatus pressed={pressed} sourceType={sourceType} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Keyboard alternative: use mouse press tracking separately from drag if
          needed.
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function CallbacksExample() {
  const padRef = useRef<HTMLDivElement>(null)
  const [pressCount, setPressCount] = useState(0)
  const [releaseCount, setReleaseCount] = useState(0)
  const [lastType, setLastType] = useState('none')

  const { pressed, sourceType } = useMousePressed({
    target: padRef,
    onPressed: (event) => {
      setPressCount((value) => value + 1)
      setLastType(event.type)
    },
    onReleased: (event) => {
      setReleaseCount((value) => value + 1)
      setLastType(event.type)
    },
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Callbacks"
      description="onPressed and onReleased fire only on lifecycle transitions, not on administrative resets."
      instruction="Press and release the pad to increment the counters."
      code={callbacksSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Press count',
              value: String(pressCount),
              testId: 'press-count',
            },
            {
              label: 'Release count',
              value: String(releaseCount),
              testId: 'release-count',
            },
            {
              label: 'Last event',
              value: lastType,
              testId: 'last-event',
            },
          ]}
        />
      }
    >
      <div
        ref={padRef}
        data-testid="callback-pad"
        className={`${padClass} ${pressed ? padPressedClass : ''}`}
        aria-label="Callback demonstration pad"
      >
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

export function CaptureModeExample() {
  const outerRef = useRef<HTMLDivElement>(null)
  const [capture, setCapture] = useState(false)
  const { pressed } = useMousePressed({
    target: outerRef,
    capture,
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Capture mode"
      description="capture: true registers listeners in the capture phase, so the outer target can observe nested presses even when a child calls stopPropagation(). Toggle capture to compare behavior."
      instruction="With capture off, press the nested button — bubbling is stopped, so the outer target stays idle. Enable capture and press again — the outer lifecycle activates before bubbling stops."
      code={captureModeSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Capture',
              value: String(capture),
              testId: 'capture-flag',
            },
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'capture-pressed',
            },
          ]}
        />
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="capture-toggle"
          checked={capture}
          onChange={(event) => {
            setCapture(event.target.checked)
          }}
        />
        Use capture phase
      </label>
      <div
        ref={outerRef}
        data-testid="capture-outer"
        className={`rounded-xl border border-slate-300 p-4 ${pressed ? 'bg-indigo-50' : 'bg-white'}`}
        aria-label="Capture mode outer container"
      >
        <button
          type="button"
          data-testid="capture-inner"
          className={secondaryButtonClass}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
        >
          Nested button (stops bubbling)
        </button>
        <p className="mt-3 text-sm text-slate-700">
          {pressed ? 'Outer lifecycle active' : 'Outer idle'}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const padRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: padRef,
    enabled,
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Enabled state"
      description="Disabling removes listeners and administratively resets the lifecycle without calling onReleased."
      instruction="Press the pad, disable tracking, then try pressing again."
      code={enabledStateSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Enabled',
              value: String(enabled),
              testId: 'enabled-flag',
            },
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'enabled-pressed',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={enabled ? secondaryButtonClass : buttonClass}
        data-testid="toggle-enabled"
        onClick={() => {
          setEnabled((value) => !value)
        }}
      >
        {enabled ? 'Disable tracking' : 'Enable tracking'}
      </button>
      <div
        ref={padRef}
        data-testid="enabled-pad"
        className={`${padClass} mt-3 ${pressed ? padPressedClass : ''}`}
        aria-label="Enabled state press pad"
      >
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const { pressed, sourceType } = useMousePressed({
    target: useA ? aRef : bRef,
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Dynamic target"
      description="Switching targets resets the lifecycle without calling onReleased."
      instruction="Press card A, switch to card B, and confirm only the active card responds."
      code={dynamicTargetSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Active',
              value: useA ? 'A' : 'B',
              testId: 'dynamic-active',
            },
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'dynamic-pressed',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="switch-target"
        onClick={() => {
          setUseA((value) => !value)
        }}
      >
        Switch to card {useA ? 'B' : 'A'}
      </button>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div
          ref={aRef}
          data-testid="card-a"
          className={`${padClass} min-h-40 ${useA ? 'ring-2 ring-indigo-400' : ''} ${pressed && useA ? padPressedClass : ''}`}
          aria-label="Pressable card A"
        >
          Card A
        </div>
        <div
          ref={bRef}
          data-testid="card-b"
          className={`${padClass} min-h-40 ${!useA ? 'ring-2 ring-indigo-400' : ''} ${pressed && !useA ? padPressedClass : ''}`}
          aria-label="Pressable card B"
        >
          Card B
        </div>
      </div>
      <div className="mt-3">
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

function InitialValueActiveDemo() {
  const padRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({
    target: padRef,
    initialValue: true,
  })

  return (
    <div
      ref={padRef}
      data-testid="initial-pad"
      className={`${padClass} ${pressed ? padPressedClass : ''}`}
      aria-label="Initial value press pad"
    >
      <PressStatus pressed={pressed} sourceType={sourceType} />
    </div>
  )
}

export function InitialValueExample() {
  const [mounted, setMounted] = useState(false)

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Initial value"
      description="initialValue: true starts pressed with sourceType null until a real input event occurs."
      instruction="Mount the example to see the initial pressed state, then release with a mouseup."
      code={initialValueSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'initial-mounted',
            },
            {
              label: 'Pressed',
              value: mounted ? 'true' : 'false',
              testId: 'initial-pressed',
            },
            {
              label: 'Source',
              value: 'idle',
              testId: 'initial-source',
            },
          ]}
        />
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="initial-mount"
          checked={mounted}
          onChange={(event) => {
            setMounted(event.target.checked)
          }}
        />
        Mount with initialValue: true
      </label>
      {mounted ? <InitialValueActiveDemo key="initial-value-active" /> : null}
    </ExampleShowcase>
  )
}

export function NestedContentExample() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { pressed, sourceType } = useMousePressed({ target: containerRef })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Nested content"
      description="Presses that begin on descendants still activate the container lifecycle."
      instruction="Press on the nested paragraph, then release outside the container."
      code={nestedContentSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'nested-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'nested-source',
            },
          ]}
        />
      }
    >
      <div
        ref={containerRef}
        data-testid="nested-container"
        className={`rounded-xl border border-slate-300 p-4 ${pressed ? 'bg-indigo-50' : 'bg-white'}`}
        aria-label="Nested press container"
      >
        <p className="text-sm text-slate-700">
          Press anywhere inside this container, including this paragraph.
        </p>
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  touch = true,
  drag = true,
  capture = false,
  initialValue = false,
}: {
  enabled?: boolean
  touch?: boolean
  drag?: boolean
  capture?: boolean
  initialValue?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const padRef = useRef<HTMLDivElement>(null)
  const remountKey = `${initialValue}:${mounted}`

  const { pressed, sourceType } = useMousePressed({
    target: padRef,
    enabled: mounted && enabled,
    touch,
    drag,
    capture,
    initialValue,
  })

  return (
    <ExampleShowcase
      hookName="useMousePressed"
      title="Playground"
      description="Experiment with registration-relevant options. Mount explicitly so Docs stays idle until you opt in."
      instruction="Mount the playground, adjust Controls, then press the pad."
      code={playgroundSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'play-mounted',
            },
            {
              label: 'Pressed',
              value: String(pressed),
              testId: 'play-pressed',
            },
            {
              label: 'Source',
              value: sourceType ?? 'idle',
              testId: 'play-source',
            },
          ]}
        />
      }
    >
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          data-testid="play-mount"
          checked={mounted}
          onChange={(event) => {
            setMounted(event.target.checked)
          }}
        />
        Mount playground
      </label>
      <div
        key={remountKey}
        ref={padRef}
        data-testid="playground-pad"
        className={`${padClass} ${pressed ? padPressedClass : ''}`}
        aria-label="Playground press pad"
      >
        <PressStatus pressed={pressed} sourceType={sourceType} />
      </div>
    </ExampleShowcase>
  )
}
