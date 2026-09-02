export const layeredSceneSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function LayeredParallaxScene() {
  const stageRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(stageRef)

  const layer = (depth: number, scale = 1) => ({
    transform: \`translate3d(\${roll * depth}px, \${tilt * depth}px, 0) scale(\${scale})\`,
  })

  return (
    <div ref={stageRef} className="relative overflow-hidden">
      <div style={layer(8)} aria-hidden="true">
        Sky
      </div>
      <div style={layer(18, 1.02)} aria-hidden="true">
        Mountains
      </div>
      <div style={layer(30, 1.03)} aria-hidden="true">
        Midground
      </div>
      <div style={layer(44, 1.04)} aria-hidden="true">
        Foreground
      </div>
      <div style={layer(62, 1.06)}>Central object</div>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const basicCardSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function ParallaxCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef)

  return (
    <div ref={cardRef}>
      <div
        style={{
          transform: \`perspective(900px) rotateY(\${roll * 14}deg) rotateX(\${-tilt * 14}deg)\`,
        }}
      >
        <p>roll: {roll.toFixed(3)}</p>
        <p>tilt: {tilt.toFixed(3)}</p>
        <p>source: {source}</p>
      </div>
    </div>
  )
}`

export const mouseNormalizationSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function MouseNormalizationDemo() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(surfaceRef, {
    deviceOrientation: false,
  })

  return (
    <div ref={surfaceRef}>
      <p>Center is 0. Edges map to about -0.5 and 0.5.</p>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const deviceOrientationSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function DeviceOrientationDemo() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(panelRef, { mouse: false })

  return (
    <div ref={panelRef}>
      <p>Listen for deviceorientation on the owning window.</p>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const sourceFallbackSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function SourceFallbackDemo() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(targetRef)

  return (
    <div ref={targetRef}>
      <p>
        Invalid orientation samples do not switch source. The latest valid input
        wins.
      </p>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const screenRotationSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function ScreenRotationDemo() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(panelRef, { mouse: false })

  return (
    <div ref={panelRef}>
      <p>Sensor axes are rotated to match screen.orientation.angle.</p>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const customSensitivitySnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function CustomSensitivityDemo() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
    mouseRollAdjust: (value) => value * 2,
    mouseTiltAdjust: (value) => value * 2,
  })

  return (
    <div ref={cardRef}>
      <p>Adjusters amplify normalized axes before optional clamping.</p>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const invertedMovementSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function InvertedParallax() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
    mouseRollAdjust: (value) => -value,
    mouseTiltAdjust: (value) => -value,
  })

  return (
    <div ref={cardRef} className="relative">
      <div
        style={{
          left: \`calc(50% + \${roll * 40}px)\`,
          top: \`calc(50% + \${tilt * 40}px)\`,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <p>roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}</p>
    </div>
  )
}`

export const clampComparisonSnippet = `import { useRef, useState } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function ClampComparison() {
  const [clamp, setClamp] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    deviceOrientation: false,
    clamp,
    mouseRollAdjust: (value) => value * 2,
    mouseTiltAdjust: (value) => value * 2,
  })

  return (
    <>
      <button type="button" onClick={() => setClamp((value) => !value)}>
        clamp: {String(clamp)}
      </button>
      <div ref={cardRef}>
        <p>
          roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
        </p>
      </div>
    </>
  )
}`

export const mouseOnlySnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function MouseOnlyParallax() {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(surfaceRef, {
    deviceOrientation: false,
  })

  return (
    <div ref={surfaceRef}>
      <p>Only mousemove updates this target.</p>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </div>
  )
}`

export const enabledStateSnippet = `import { useRef, useState } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function EnabledParallax() {
  const [enabled, setEnabled] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(cardRef, {
    enabled,
    deviceOrientation: false,
  })

  return (
    <>
      <button type="button" onClick={() => setEnabled((value) => !value)}>
        {enabled ? 'Disable' : 'Enable'}
      </button>
      <div ref={cardRef}>
        <p>
          roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
        </p>
      </div>
    </>
  )
}`

export const dynamicTargetSnippet = `import { useRef, useState } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function DynamicParallaxTarget() {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [useA, setUseA] = useState(true)
  const { roll, tilt, source } = useParallax(useA ? aRef : bRef, {
    deviceOrientation: false,
  })

  return (
    <>
      <button type="button" onClick={() => setUseA((value) => !value)}>
        Switch surface
      </button>
      <div ref={aRef}>Surface A</div>
      <div ref={bRef}>Surface B</div>
      <p>
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </p>
    </>
  )
}`

export const svgTargetSnippet = `import { useRef } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function SvgParallaxTarget() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { roll, tilt, source } = useParallax(svgRef, {
    deviceOrientation: false,
  })

  return (
    <svg ref={svgRef} viewBox="0 0 320 200">
      <g transform={\`translate(\${160 + roll * 36}, \${100 + tilt * 36})\`}>
        <circle cx="0" cy="0" r="16" />
      </g>
      <text x="8" y="20">
        roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
      </text>
    </svg>
  )
}`

export const permissionGuidanceSnippet = `import { useRef, useState } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function OrientationPermission() {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { roll, tilt, source } = useParallax(panelRef, {
    enabled: mounted,
    mouse: false,
  })

  const requestPermission = async () => {
    const request =
      typeof DeviceOrientationEvent !== 'undefined' &&
      'requestPermission' in DeviceOrientationEvent &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
        ? DeviceOrientationEvent.requestPermission
        : null
    if (request == null) {
      return 'unsupported'
    }
    return request.call(DeviceOrientationEvent)
  }

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Mount tracker
      </button>
      <button type="button" onClick={() => void requestPermission()}>
        Request orientation access
      </button>
      <div ref={panelRef}>
        <p>
          roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
        </p>
      </div>
    </>
  )
}`

export const playgroundSnippet = `import { useRef, useState } from 'react'
import { useParallax } from '@muradyanvano/react-hooks'

export function ParallaxPlayground(props: {
  enabled: boolean
  mouse: boolean
  deviceOrientation: boolean
  clamp: boolean
  mouseSensitivity: number
  orientationSensitivity: number
  invertRoll: boolean
  invertTilt: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const sign = (invert: boolean) => (invert ? -1 : 1)

  const { roll, tilt, source } = useParallax(cardRef, {
    enabled: mounted && props.enabled,
    mouse: props.mouse,
    deviceOrientation: props.deviceOrientation,
    clamp: props.clamp,
    mouseRollAdjust: (value) => value * props.mouseSensitivity * sign(props.invertRoll),
    mouseTiltAdjust: (value) => value * props.mouseSensitivity * sign(props.invertTilt),
    deviceOrientationRollAdjust: (value) =>
      value * props.orientationSensitivity * sign(props.invertRoll),
    deviceOrientationTiltAdjust: (value) =>
      value * props.orientationSensitivity * sign(props.invertTilt),
  })

  return (
    <>
      <button type="button" onClick={() => setMounted(true)}>
        Mount playground
      </button>
      <div ref={cardRef} className="relative overflow-hidden">
        <div
          style={{
            left: \`calc(50% + \${roll * 88}%)\`,
            top: \`calc(50% + \${tilt * 88}%)\`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <p>
          roll: {roll.toFixed(3)} tilt: {tilt.toFixed(3)} source: {source}
        </p>
      </div>
    </>
  )
}`
