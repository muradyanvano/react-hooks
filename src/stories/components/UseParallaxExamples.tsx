import { useId, useRef, useState, type CSSProperties } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

import { ExampleShowcase, StatusPanel } from './ExampleShowcase'
import {
  basicCardSnippet,
  clampComparisonSnippet,
  customSensitivitySnippet,
  deviceOrientationSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  invertedMovementSnippet,
  layeredSceneSnippet,
  mouseNormalizationSnippet,
  mouseOnlySnippet,
  permissionGuidanceSnippet,
  playgroundSnippet,
  screenRotationSnippet,
  sourceFallbackSnippet,
  svgTargetSnippet,
} from './useParallax.snippets'

const surfaceClass =
  'relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 outline-none transition-[transform,box-shadow,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 motion-reduce:transition-none'
const buttonClass =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'

export function formatAxis(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : '0.000'
}

export function dispatchOrientation(beta: number, gamma: number) {
  const event = new Event('deviceorientation')
  Object.defineProperty(event, 'beta', { value: beta })
  Object.defineProperty(event, 'gamma', { value: gamma })
  Object.defineProperty(event, 'alpha', { value: 0 })
  window.dispatchEvent(event)
}

function ParallaxStatus({
  roll,
  tilt,
  source,
  rollTestId = 'status-roll',
  tiltTestId = 'status-tilt',
  sourceTestId = 'status-source',
}: {
  roll: number
  tilt: number
  source: 'mouse' | 'deviceOrientation'
  rollTestId?: string
  tiltTestId?: string
  sourceTestId?: string
}) {
  return (
    <StatusPanel
      items={[
        { label: 'Roll', value: formatAxis(roll), testId: rollTestId },
        { label: 'Tilt', value: formatAxis(tilt), testId: tiltTestId },
        { label: 'Source', value: source, testId: sourceTestId },
      ]}
    />
  )
}

function layerTransform(
  roll: number,
  tilt: number,
  depth: number,
  scale = 1,
): CSSProperties {
  return {
    transform: `translate3d(${roll * depth}px, ${tilt * depth}px, 0) scale(${scale})`,
    transformOrigin: 'center center',
  }
}

export function LayeredSceneExample() {
  const stageRef = useRef<HTMLDivElement>(null)
  const uid = useId().replace(/:/g, '')
  const { roll, tilt, source } = useParallax(stageRef, {
    deviceOrientation: false,
  })

  const layerMotion =
    'pointer-events-none absolute inset-0 will-change-transform motion-reduce:transition-none transition-transform duration-200 ease-out'

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Layered scene"
      description="Five decorative layers translate at different depths from normalized roll and tilt. The hook never writes CSS — the example maps values to transforms."
      instruction="Move the pointer across the stage. Layers at different depths should drift in opposite directions for a subtle depth effect."
      code={layeredSceneSnippet}
      badge="Primary"
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="layer-roll"
          tiltTestId="layer-tilt"
          sourceTestId="layer-source"
        />
      }
    >
      <div
        ref={stageRef}
        data-testid="parallax-stage"
        role="img"
        className={`${surfaceClass} relative aspect-[16/10] min-h-[22rem] w-full max-w-full cursor-crosshair bg-[#0b1020] shadow-inner`}
        aria-label="Layered parallax scene with sky, mountains, mist, hills, and a floating crystal"
      >
        <div
          aria-hidden="true"
          data-testid="layer-sky"
          className={layerMotion}
          style={layerTransform(roll, tilt, 8)}
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="45%" stopColor="#312e81" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
              <radialGradient id={`${uid}-moon-glow`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="800" height="500" fill={`url(#${uid}-sky)`} />
            {[
              [120, 80],
              [210, 120],
              [340, 60],
              [520, 95],
              [640, 130],
              [710, 70],
              [780, 110],
            ].map(([x, y]) => (
              <circle
                key={`${x}-${y}`}
                cx={x}
                cy={y}
                r="1.5"
                fill="#e0e7ff"
                opacity="0.85"
              />
            ))}
            <circle cx="620" cy="110" r="52" fill={`url(#${uid}-moon-glow)`} />
            <circle cx="620" cy="110" r="28" fill="#fde68a" />
          </svg>
        </div>

        <div
          aria-hidden="true"
          data-testid="layer-mountains"
          className={layerMotion}
          style={layerTransform(roll, tilt, 18, 1.02)}
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
          >
            <polygon
              points="0,340 120,180 220,260 340,140 480,250 620,160 800,280 800,500 0,500"
              fill="#4338ca"
              opacity="0.55"
            />
            <polygon
              points="0,380 90,240 200,300 330,210 470,320 590,230 800,340 800,500 0,500"
              fill="#3730a3"
              opacity="0.72"
            />
          </svg>
        </div>

        <div
          aria-hidden="true"
          data-testid="layer-midground"
          className={layerMotion}
          style={layerTransform(roll, tilt, 30, 1.03)}
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
          >
            <ellipse
              cx="200"
              cy="360"
              rx="180"
              ry="48"
              fill="#6366f1"
              opacity="0.22"
            />
            <ellipse
              cx="520"
              cy="340"
              rx="220"
              ry="56"
              fill="#818cf8"
              opacity="0.18"
            />
            <path
              d="M0,390 Q200,350 400,385 T800,370 L800,500 L0,500 Z"
              fill="#4c1d95"
              opacity="0.45"
            />
          </svg>
        </div>

        <div
          aria-hidden="true"
          data-testid="layer-foreground"
          className={layerMotion}
          style={layerTransform(roll, tilt, 44, 1.04)}
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M0,420 C120,390 180,430 280,405 C380,380 460,425 560,400 C660,375 720,415 800,395 L800,500 L0,500 Z"
              fill="#1e1b4b"
              opacity="0.92"
            />
            {[80, 160, 260, 360, 460, 560, 680].map((x, index) => (
              <path
                key={x}
                d={`M${x},420 L${x + 8},360 L${x + 16},420 Z`}
                fill="#312e81"
                opacity={0.85 - index * 0.04}
              />
            ))}
          </svg>
        </div>

        <div
          data-testid="layer-object"
          className={`${layerMotion} flex items-center justify-center`}
          style={layerTransform(roll, tilt, 62, 1.06)}
        >
          <svg
            width="200"
            height="160"
            viewBox="0 0 200 160"
            aria-hidden="true"
          >
            <ellipse
              cx="100"
              cy="132"
              rx="72"
              ry="16"
              fill="#000"
              opacity="0.35"
            />
            <path
              d="M40,128 C55,118 145,118 160,128 C150,138 50,138 40,128 Z"
              fill="#312e81"
            />
            <path
              d="M100,24 L132,72 L118,128 L82,128 L68,72 Z"
              fill="#eef2ff"
              stroke="#a5b4fc"
              strokeWidth="2"
            />
            <path
              d="M100,24 L100,128"
              stroke="#6366f1"
              strokeWidth="1.5"
              opacity="0.8"
            />
            <circle cx="100" cy="72" r="14" fill="#6366f1" />
            <circle cx="100" cy="72" r="22" fill="#818cf8" opacity="0.35" />
          </svg>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
        />
        <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-xs font-medium text-indigo-100/90">
          Move the pointer — depth multipliers 8 → 62
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        roll {formatAxis(roll)}, tilt {formatAxis(tilt)}, source {source}
      </p>
    </ExampleShowcase>
  )
}

export function BasicCardExample() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Basic card"
      description="Keep the ref on a stable tracking surface and apply visual transforms on a child so getBoundingClientRect stays consistent."
      instruction="Move the pointer across the card to see subtle 3D tilt on the inner panel."
      code={basicCardSnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="card-roll"
          tiltTestId="card-tilt"
          sourceTestId="card-source"
        />
      }
    >
      <div
        ref={cardRef}
        data-testid="basic-card"
        role="region"
        className={`${surfaceClass} flex min-h-60 w-full cursor-crosshair items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100 p-8`}
        aria-label="Parallax card tracking surface"
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-6 shadow-lg backdrop-blur-sm motion-reduce:transition-none transition-transform duration-200 ease-out"
          style={{
            transform: `perspective(900px) rotateY(${roll * 14}deg) rotateX(${-tilt * 14}deg)`,
          }}
          aria-hidden="true"
        >
          <div className="mb-4 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            Spotlight
          </div>
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            Aurora workspace
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Roll and tilt drive a lightweight perspective tilt without moving
            the tracking bounds.
          </p>
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function MouseNormalizationExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(surfaceRef, {
    deviceOrientation: false,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Mouse normalization"
      description="Pointer position is normalized to the target bounding box. Center is 0; left/up are negative; right/down are positive."
      instruction="Move to the center, then toward each edge. Values stay within about -0.5 to 0.5 when clamped."
      code={mouseNormalizationSnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="norm-roll"
          tiltTestId="norm-tilt"
          sourceTestId="norm-source"
        />
      }
    >
      <div
        ref={surfaceRef}
        data-testid="norm-surface"
        role="img"
        className={`${surfaceClass} h-64 w-full cursor-crosshair bg-white`}
        aria-label="Mouse normalization grid"
      >
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
            {Array.from({ length: 16 }).map((_, index) => (
              <div key={index} className="border border-slate-100" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-indigo-300/70" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-indigo-300/70" />
          </div>
          <div className="absolute inset-2 rounded-xl border border-dashed border-indigo-300" />
          <span className="absolute left-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            -0.5
          </span>
          <span className="absolute right-2 top-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            +0.5 roll
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            +0.5 tilt
          </span>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            0, 0
          </span>
        </div>
        <div
          data-testid="norm-marker"
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 ring-2 ring-white"
          style={{
            left: `${(roll + 0.5) * 100}%`,
            top: `${(tilt + 0.5) * 100}%`,
          }}
          aria-hidden="true"
        />
      </div>
    </ExampleShowcase>
  )
}

export function DeviceOrientationExample() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(panelRef, { mouse: false })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Device orientation"
      description="When mouse is disabled, valid deviceorientation events on the owning window update roll and tilt."
      instruction="Use the simulation buttons to dispatch synthetic orientation events. Labels are simulation-only."
      code={deviceOrientationSnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="orient-roll"
          tiltTestId="orient-tilt"
          sourceTestId="orient-source"
        />
      }
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Simulation controls
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="orient-left"
          onClick={() => dispatchOrientation(0, -90)}
        >
          Tilt left
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="orient-right"
          onClick={() => dispatchOrientation(0, 90)}
        >
          Tilt right
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="orient-forward"
          onClick={() => dispatchOrientation(90, 0)}
        >
          Tilt forward
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="orient-backward"
          onClick={() => dispatchOrientation(-90, 0)}
        >
          Tilt backward
        </button>
        <button
          type="button"
          className={buttonClass}
          data-testid="orient-center"
          onClick={() => dispatchOrientation(0, 0)}
        >
          Center
        </button>
      </div>
      <div
        ref={panelRef}
        data-testid="orient-panel"
        role="region"
        className={`${surfaceClass} mt-4 min-h-40 w-full bg-white p-4`}
        aria-label="Device orientation panel"
      >
        <div
          data-testid="orient-indicator"
          className="mx-auto h-16 w-16 rounded-xl bg-indigo-100 transition-transform duration-150 motion-reduce:transition-none"
          style={{
            transform: `translate(${roll * 48}px, ${tilt * 48}px) rotate(${roll * 20}deg)`,
          }}
          aria-hidden="true"
        />
      </div>
    </ExampleShowcase>
  )
}

export function SourceFallbackExample() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(targetRef)
  const hasOrientationApi = typeof DeviceOrientationEvent !== 'undefined'

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Source fallback"
      description="The hook starts with source mouse. Invalid orientation samples do not switch source — only valid events do. The latest valid input wins."
      instruction="Move the mouse, dispatch invalid orientation, then valid orientation, then mouse again."
      code={sourceFallbackSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'API present',
              value: String(hasOrientationApi),
              testId: 'fallback-api',
            },
            {
              label: 'Roll',
              value: formatAxis(roll),
              testId: 'fallback-roll',
            },
            {
              label: 'Tilt',
              value: formatAxis(tilt),
              testId: 'fallback-tilt',
            },
            {
              label: 'Source',
              value: source,
              testId: 'fallback-source',
            },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="fallback-invalid"
          onClick={() => {
            const event = new Event('deviceorientation')
            Object.defineProperty(event, 'beta', { value: null })
            Object.defineProperty(event, 'gamma', { value: 10 })
            window.dispatchEvent(event)
          }}
        >
          Invalid orientation
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          data-testid="fallback-valid"
          onClick={() => dispatchOrientation(45, 0)}
        >
          Valid orientation
        </button>
      </div>
      <div
        ref={targetRef}
        data-testid="fallback-target"
        role="img"
        className={`${surfaceClass} mt-4 min-h-48 w-full cursor-crosshair bg-white p-4`}
        aria-label="Source fallback target"
      >
        <p className="text-sm text-slate-700">
          DeviceOrientationEvent present: {String(hasOrientationApi)}
        </p>
        <p className="mt-2 font-mono text-sm text-slate-900">
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)} · {source}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function ScreenRotationExample() {
  const panelRef = useRef<HTMLDivElement>(null)
  const [angle, setAngle] = useState(0)
  const { roll, tilt, source } = useParallax(panelRef, { mouse: false })

  const simulateAngle = (nextAngle: number) => {
    Object.defineProperty(window.screen, 'orientation', {
      configurable: true,
      value: { angle: nextAngle },
    })
    setAngle(nextAngle)
    dispatchOrientation(90, 0)
  }

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Screen rotation"
      description="Sensor axes rotate to match screen.orientation.angle so roll/tilt stay aligned with the visual viewport."
      instruction="Pick a simulated screen angle, then dispatch the same beta/gamma sample and compare roll/tilt."
      code={screenRotationSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Screen angle',
              value: String(angle),
              testId: 'rotation-angle',
            },
            {
              label: 'Roll',
              value: formatAxis(roll),
              testId: 'rotation-roll',
            },
            {
              label: 'Tilt',
              value: formatAxis(tilt),
              testId: 'rotation-tilt',
            },
            {
              label: 'Source',
              value: source,
              testId: 'rotation-source',
            },
          ]}
        />
      }
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Simulation
      </p>
      <div className="flex flex-wrap gap-2">
        {[0, 90, 180, 270].map((value) => (
          <button
            key={value}
            type="button"
            className={angle === value ? buttonClass : secondaryButtonClass}
            data-testid={`rotation-${value}`}
            onClick={() => simulateAngle(value)}
          >
            {value}°
          </button>
        ))}
      </div>
      <div
        ref={panelRef}
        data-testid="rotation-panel"
        role="region"
        className={`${surfaceClass} mt-4 min-h-40 w-full bg-white p-4`}
        aria-label="Screen rotation panel"
      >
        <div
          data-testid="rotation-indicator"
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-xl bg-indigo-50 font-mono text-sm font-semibold text-indigo-700"
        >
          {formatAxis(roll)}
          <br />
          {formatAxis(tilt)}
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function CustomSensitivityExample() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
    mouseRollAdjust: (value) => value * 2,
    mouseTiltAdjust: (value) => value * 2,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Custom sensitivity"
      description="Adjusters multiply normalized axes before optional clamping. Here both axes use 2× sensitivity."
      instruction="Move toward an edge — values reach ±0.5 sooner than the default identity adjusters."
      code={customSensitivitySnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="sens-roll"
          tiltTestId="sens-tilt"
          sourceTestId="sens-source"
        />
      }
    >
      <div
        ref={cardRef}
        data-testid="sens-card"
        role="img"
        className={`${surfaceClass} relative min-h-60 w-full cursor-crosshair overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900`}
        aria-label="Custom sensitivity card"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(255,255,255,0.15) 0, transparent 55%), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 24px 24px, 24px 24px',
          }}
        />
        <div
          data-testid="sens-dot"
          className="absolute h-10 w-10 rounded-full bg-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.65)] motion-reduce:transition-none transition-transform duration-150"
          style={{
            left: `calc(50% + ${roll * 120}px)`,
            top: `calc(50% + ${tilt * 120}px)`,
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        />
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-medium text-indigo-100/90">
          2× adjusters — reaches ±0.5 sooner
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function InvertedMovementExample() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
    mouseRollAdjust: (value) => -value,
    mouseTiltAdjust: (value) => -value,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Inverted movement"
      description="Negating adjusters inverts parallax direction relative to pointer movement."
      instruction="Move right — the marker should travel left. Move down — the marker should travel up."
      code={invertedMovementSnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="invert-roll"
          tiltTestId="invert-tilt"
          sourceTestId="invert-source"
        />
      }
    >
      <div
        ref={cardRef}
        data-testid="invert-card"
        role="img"
        className={`${surfaceClass} relative min-h-60 w-full cursor-crosshair overflow-hidden bg-slate-950`}
        aria-label="Inverted parallax card"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_60%)]"
        />
        <div
          data-testid="invert-marker"
          className="absolute h-10 w-10 rounded-full border-2 border-white/80 bg-indigo-500 shadow-lg motion-reduce:transition-none transition-[left,top] duration-150"
          style={{
            left: `calc(50% + ${roll * 90}px)`,
            top: `calc(50% + ${tilt * 90}px)`,
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        />
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-medium text-slate-300">
          Pointer right → marker left · pointer down → marker up
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function ClampComparisonExample() {
  const [clamp, setClamp] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
    clamp,
    mouseRollAdjust: (value) => value * 2,
    mouseTiltAdjust: (value) => value * 2,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Clamp comparison"
      description="With clamp: true (default), adjusted values stay within -0.5…0.5. With clamp: false and 2× sensitivity, corners can exceed that range."
      instruction="Toggle clamp, then move to a corner. Compare displayed roll/tilt."
      code={clampComparisonSnippet}
      aside={
        <StatusPanel
          items={[
            { label: 'Clamp', value: String(clamp), testId: 'clamp-flag' },
            {
              label: 'Roll',
              value: formatAxis(roll),
              testId: 'clamp-roll',
            },
            {
              label: 'Tilt',
              value: formatAxis(tilt),
              testId: 'clamp-tilt',
            },
            {
              label: 'Source',
              value: source,
              testId: 'clamp-source',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={clamp ? buttonClass : secondaryButtonClass}
        data-testid="clamp-toggle"
        onClick={() => {
          setClamp((value) => !value)
        }}
      >
        clamp: {String(clamp)}
      </button>
      <div
        ref={cardRef}
        data-testid="clamp-card"
        role="img"
        className={`${surfaceClass} mt-4 min-h-56 w-full cursor-crosshair bg-white p-4`}
        aria-label="Clamp comparison card"
      >
        <p className="text-sm text-slate-600">
          2× sensitivity — corners exceed ±0.5 only when clamp is false.
        </p>
        <p
          className="mt-2 font-mono text-sm font-semibold text-slate-900"
          data-testid="clamp-values"
        >
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function MouseOnlyExample() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(surfaceRef, {
    deviceOrientation: false,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Mouse only"
      description="deviceOrientation: false registers no orientation listener. Synthetic orientation events leave state unchanged."
      instruction="Move the mouse, then click Simulate orientation — source should stay mouse."
      code={mouseOnlySnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="mouse-only-roll"
          tiltTestId="mouse-only-tilt"
          sourceTestId="mouse-only-source"
        />
      }
    >
      <button
        type="button"
        className={secondaryButtonClass}
        data-testid="mouse-only-orient"
        onClick={() => dispatchOrientation(90, -90)}
      >
        Simulate orientation
      </button>
      <div
        ref={surfaceRef}
        data-testid="mouse-only-surface"
        role="img"
        className={`${surfaceClass} mt-4 min-h-48 w-full cursor-crosshair bg-white p-4`}
        aria-label="Mouse-only parallax surface"
      >
        <p className="font-mono text-sm text-slate-800">
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function EnabledStateExample() {
  const [enabled, setEnabled] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    enabled,
    deviceOrientation: false,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Enabled state"
      description="Disabling removes listeners and resets roll/tilt to center without changing source to a special idle value."
      instruction="Move off-center, disable tracking, and confirm values return to 0."
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
              label: 'Roll',
              value: formatAxis(roll),
              testId: 'enabled-roll',
            },
            {
              label: 'Tilt',
              value: formatAxis(tilt),
              testId: 'enabled-tilt',
            },
            {
              label: 'Source',
              value: source,
              testId: 'enabled-source',
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
        ref={cardRef}
        data-testid="enabled-card"
        role="img"
        className={`${surfaceClass} mt-4 min-h-48 w-full cursor-crosshair bg-white p-4`}
        aria-label="Enabled state card"
      >
        <p className="font-mono text-sm text-slate-800">
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)}
        </p>
      </div>
    </ExampleShowcase>
  )
}

export function DynamicTargetExample() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const { roll, tilt, source } = useParallax(useA ? aRef : bRef, {
    deviceOrientation: false,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Dynamic target"
      description="Switching targets resets roll/tilt to center. Only the active surface receives mousemove listeners."
      instruction="Move on surface A, switch to B, and confirm only the active ring responds."
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
              label: 'Roll',
              value: formatAxis(roll),
              testId: 'dynamic-roll',
            },
            {
              label: 'Tilt',
              value: formatAxis(tilt),
              testId: 'dynamic-tilt',
            },
            {
              label: 'Source',
              value: source,
              testId: 'dynamic-source',
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
        Switch to surface {useA ? 'B' : 'A'}
      </button>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div
          ref={aRef}
          data-testid="surface-a"
          role="img"
          className={`${surfaceClass} min-h-40 cursor-crosshair bg-white p-4 ${useA ? 'ring-2 ring-indigo-400' : ''}`}
          aria-label="Parallax surface A"
        >
          Surface A
        </div>
        <div
          ref={bRef}
          data-testid="surface-b"
          role="img"
          className={`${surfaceClass} min-h-40 cursor-crosshair bg-white p-4 ${!useA ? 'ring-2 ring-indigo-400' : ''}`}
          aria-label="Parallax surface B"
        >
          Surface B
        </div>
      </div>
    </ExampleShowcase>
  )
}

export function SvgTargetExample() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { roll, tilt, source } = useParallax(svgRef, {
    deviceOrientation: false,
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="SVG target"
      description="SVGSVGElement refs are supported alongside HTML elements."
      instruction="Move across the SVG viewport to translate the circle."
      code={svgTargetSnippet}
      aside={
        <ParallaxStatus
          roll={roll}
          tilt={tilt}
          source={source}
          rollTestId="svg-roll"
          tiltTestId="svg-tilt"
          sourceTestId="svg-source"
        />
      }
    >
      <svg
        ref={svgRef}
        data-testid="svg-target"
        role="img"
        viewBox="0 0 320 200"
        className={`${surfaceClass} h-60 w-full cursor-crosshair`}
        aria-label="SVG parallax target"
      >
        <defs>
          <linearGradient id="svg-parallax-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#ddd6fe" />
          </linearGradient>
          <radialGradient id="svg-parallax-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="200" fill="url(#svg-parallax-bg)" />
        <g
          data-testid="svg-circle"
          transform={`translate(${160 + roll * 36}, ${100 + tilt * 36})`}
        >
          <circle cx="0" cy="0" r="28" fill="url(#svg-parallax-glow)" />
          <circle cx="0" cy="0" r="16" fill="#4338ca" />
        </g>
        <text x="16" y="24" className="fill-slate-600 text-sm">
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)}
        </text>
      </svg>
    </ExampleShowcase>
  )
}

function PermissionActiveDemo() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(panelRef, {
    mouse: false,
  })
  const [permissionState, setPermissionState] = useState('idle')

  const requestPermission = async () => {
    const request =
      typeof DeviceOrientationEvent !== 'undefined' &&
      'requestPermission' in DeviceOrientationEvent &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
        ? DeviceOrientationEvent.requestPermission
        : null

    if (request == null) {
      setPermissionState('unsupported')
      return
    }

    try {
      const result = await request.call(DeviceOrientationEvent)
      setPermissionState(String(result))
    } catch {
      setPermissionState('error')
    }
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        data-testid="request-permission"
        onClick={() => {
          void requestPermission()
        }}
      >
        Request orientation access
      </button>
      <div
        ref={panelRef}
        data-testid="permission-panel"
        role="region"
        className={`${surfaceClass} mt-4 min-h-40 w-full bg-white p-4`}
        aria-label="Orientation permission panel"
      >
        <p className="text-sm text-slate-700">
          Permission helper:{' '}
          {typeof DeviceOrientationEvent !== 'undefined' &&
          'requestPermission' in DeviceOrientationEvent
            ? 'available'
            : 'not required in this browser'}
        </p>
        <p
          className="mt-2 font-mono text-sm text-slate-900"
          data-testid="permission-state"
        >
          {permissionState}
        </p>
        <p className="mt-2 font-mono text-sm text-slate-800">
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)} · {source}
        </p>
      </div>
    </>
  )
}

export function PermissionGuidanceExample() {
  const [mounted, setMounted] = useState(false)

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Permission guidance"
      description="The hook never requests sensor permission. On iOS, consumers may call DeviceOrientationEvent.requestPermission from an explicit user gesture."
      instruction="Mount the tracker first, then use Request orientation access if your browser exposes the helper."
      code={permissionGuidanceSnippet}
      aside={
        <StatusPanel
          items={[
            {
              label: 'Mounted',
              value: String(mounted),
              testId: 'permission-mounted',
            },
            {
              label: 'Helper',
              value:
                typeof DeviceOrientationEvent !== 'undefined' &&
                'requestPermission' in DeviceOrientationEvent
                  ? 'present'
                  : 'absent',
              testId: 'permission-helper',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="permission-mount"
        onClick={() => {
          setMounted(true)
        }}
      >
        Mount tracker
      </button>
      {mounted ? <PermissionActiveDemo key="permission-active" /> : null}
    </ExampleShowcase>
  )
}

export function PlaygroundExample({
  enabled = true,
  mouse = true,
  deviceOrientation = true,
  clamp = true,
  mouseSensitivity = 1,
  orientationSensitivity = 1,
  invertRoll = false,
  invertTilt = false,
}: {
  enabled?: boolean
  mouse?: boolean
  deviceOrientation?: boolean
  clamp?: boolean
  mouseSensitivity?: number
  orientationSensitivity?: number
  invertRoll?: boolean
  invertTilt?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const sign = (invert: boolean) => (invert ? -1 : 1)

  const { roll, tilt, source } = useParallax(cardRef, {
    enabled: mounted && enabled,
    mouse,
    deviceOrientation,
    clamp,
    mouseRollAdjust: (value) => value * mouseSensitivity * sign(invertRoll),
    mouseTiltAdjust: (value) => value * mouseSensitivity * sign(invertTilt),
    deviceOrientationRollAdjust: (value) =>
      value * orientationSensitivity * sign(invertRoll),
    deviceOrientationTiltAdjust: (value) =>
      value * orientationSensitivity * sign(invertTilt),
  })

  return (
    <ExampleShowcase
      hookName="useParallax"
      title="Playground"
      description="Experiment with registration-relevant options. Mount explicitly so Docs stays idle until you opt in."
      instruction="Mount the playground, adjust Controls, then move across the card or simulate orientation."
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
              label: 'Roll',
              value: formatAxis(roll),
              testId: 'play-roll',
            },
            {
              label: 'Tilt',
              value: formatAxis(tilt),
              testId: 'play-tilt',
            },
            {
              label: 'Source',
              value: source,
              testId: 'play-source',
            },
          ]}
        />
      }
    >
      <button
        type="button"
        className={buttonClass}
        data-testid="play-mount"
        onClick={() => {
          setMounted(true)
        }}
      >
        Mount playground
      </button>
      <div
        ref={cardRef}
        data-testid="playground-card"
        role="img"
        className={`${surfaceClass} relative mt-4 min-h-60 w-full cursor-crosshair overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-100`}
        aria-label="Parallax playground card"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/80 ring-4 ring-indigo-200/60"
        />
        <div
          data-testid="play-dot"
          className="absolute h-10 w-10 rounded-full border-2 border-white bg-indigo-600 shadow-lg"
          style={{
            left: `calc(50% + ${roll * 88}%)`,
            top: `calc(50% + ${tilt * 88}%)`,
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        />
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-mono text-xs text-slate-700">
          roll {formatAxis(roll)} · tilt {formatAxis(tilt)} · {source}
        </p>
      </div>
    </ExampleShowcase>
  )
}
