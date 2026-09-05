import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BasicCardExample,
  ClampComparisonExample,
  CustomSensitivityExample,
  DeviceOrientationExample,
  DynamicTargetExample,
  EnabledStateExample,
  InvertedMovementExample,
  LayeredSceneExample,
  MouseNormalizationExample,
  MouseOnlyExample,
  PermissionGuidanceExample,
  PlaygroundExample,
  ScreenRotationExample,
  SourceFallbackExample,
  SvgTargetExample,
} from './components/UseParallaxExamples'
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
} from './components/useParallax.snippets'
import { waitForDisclosedCode } from './components/expectCodeDisclosure'

const meta = {
  title: 'Hooks/useParallax',
  tags: ['autodocs'],
  ...createHookStoryMeta('useParallax', PlaygroundExample, {
    argTypes: {
      enabled: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      mouse: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      deviceOrientation: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      clamp: {
        control: 'boolean',
        table: { defaultValue: { summary: 'true' } },
      },
      mouseSensitivity: {
        control: { type: 'number', min: 0.25, max: 4, step: 0.25 },
        table: { defaultValue: { summary: '1' } },
      },
      orientationSensitivity: {
        control: { type: 'number', min: 0.25, max: 4, step: 0.25 },
        table: { defaultValue: { summary: '1' } },
      },
      invertRoll: {
        control: 'boolean',
        table: { defaultValue: { summary: 'false' } },
      },
      invertTilt: {
        control: 'boolean',
        table: { defaultValue: { summary: 'false' } },
      },
    },
    args: {
      enabled: true,
      mouse: true,
      deviceOrientation: true,
      clamp: true,
      mouseSensitivity: 1,
      orientationSensitivity: 1,
      invertRoll: false,
      invertTilt: false,
    },
  }),
} satisfies Meta<typeof PlaygroundExample>

export default meta

type Story = StoryObj<typeof meta>

async function expectCodeDisclosure(
  canvas: ReturnType<typeof within>,
  expectedSnippet: string,
) {
  const toggle = canvas.getByTestId('toggle-code')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const highlighted = await waitForDisclosedCode(canvas)
  await expect(highlighted).toBeVisible()
  await expect(highlighted.textContent?.trim().length ?? 0).toBeGreaterThan(0)

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
}

function dispatchOrientation(beta: number, gamma: number) {
  const event = new Event('deviceorientation')
  Object.defineProperty(event, 'beta', { value: beta })
  Object.defineProperty(event, 'gamma', { value: gamma })
  Object.defineProperty(event, 'alpha', { value: 0 })
  window.dispatchEvent(event)
}

function dispatchMouseMove(element: Element, clientX: number, clientY: number) {
  element.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  )
}

function moveMouseToRelative(element: Element, relX: number, relY: number) {
  const rect = element.getBoundingClientRect()
  dispatchMouseMove(
    element,
    rect.left + rect.width * relX,
    rect.top + rect.height * relY,
  )
}

function parseAxis(text: string): number {
  const value = Number.parseFloat(text)
  return Number.isFinite(value) ? value : 0
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Layered illustration depth driven by pointer (and optional orientation). Move across the scene to see roll/tilt multipliers; reduced-motion should restrain motion. Consumers own transforms and permission prompts — demos never open native orientation dialogs in Docs.',
  ),
  render: () => <LayeredSceneExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, layeredSceneSnippet)

    const stage = canvas.getByTestId('parallax-stage')
    moveMouseToRelative(stage, 0.5, 0.5)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('layer-roll').textContent ?? ''),
      ).toBeCloseTo(0, 1)
      expect(
        parseAxis(canvas.getByTestId('layer-tilt').textContent ?? ''),
      ).toBeCloseTo(0, 1)
    })

    moveMouseToRelative(stage, 0.1, 0.1)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('layer-roll').textContent ?? ''),
      ).toBeLessThan(0)
      expect(
        parseAxis(canvas.getByTestId('layer-tilt').textContent ?? ''),
      ).toBeLessThan(0)
    })

    moveMouseToRelative(stage, 0.9, 0.9)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('layer-roll').textContent ?? ''),
      ).toBeGreaterThan(0)
      expect(
        parseAxis(canvas.getByTestId('layer-tilt').textContent ?? ''),
      ).toBeGreaterThan(0)
      expect(canvas.getByTestId('layer-source')).toHaveTextContent('mouse')
    })

    const sky = canvas.getByTestId('layer-sky')
    const object = canvas.getByTestId('layer-object')
    expect(sky.style.transform).not.toBe(object.style.transform)
  },
}

export const BasicCard: Story = {
  name: 'Basic card',
  ...storyDescription(
    'Basic card with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <BasicCardExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, basicCardSnippet)

    const card = canvas.getByTestId('basic-card')
    moveMouseToRelative(card, 0.8, 0.2)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('card-roll').textContent ?? ''),
      ).toBeGreaterThan(0)
      expect(canvas.getByTestId('card-source')).toHaveTextContent('mouse')
    })
  },
}

export const MouseNormalization: Story = {
  name: 'Mouse normalization',
  ...storyDescription(
    'Mouse normalization with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MouseNormalizationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, mouseNormalizationSnippet)

    const surface = canvas.getByTestId('norm-surface')
    moveMouseToRelative(surface, 0.5, 0.5)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('norm-roll').textContent ?? ''),
      ).toBeCloseTo(0, 1)
    })

    moveMouseToRelative(surface, 1, 1)
    await waitFor(() => {
      const roll = parseAxis(canvas.getByTestId('norm-roll').textContent ?? '')
      const tilt = parseAxis(canvas.getByTestId('norm-tilt').textContent ?? '')
      expect(roll).toBeCloseTo(0.5, 1)
      expect(tilt).toBeCloseTo(0.5, 1)
    })
  },
}

export const DeviceOrientation: Story = {
  name: 'Device orientation',
  ...storyDescription(
    'Device orientation with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <DeviceOrientationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, deviceOrientationSnippet)

    await userEvent.click(canvas.getByTestId('orient-left'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('orient-roll').textContent ?? ''),
      ).toBeLessThan(0)
      expect(canvas.getByTestId('orient-source')).toHaveTextContent(
        'deviceOrientation',
      )
    })

    await userEvent.click(canvas.getByTestId('orient-forward'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('orient-tilt').textContent ?? ''),
      ).toBeGreaterThan(0)
    })

    await userEvent.click(canvas.getByTestId('orient-center'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('orient-roll').textContent ?? ''),
      ).toBeCloseTo(0, 1)
      expect(
        parseAxis(canvas.getByTestId('orient-tilt').textContent ?? ''),
      ).toBeCloseTo(0, 1)
    })
  },
}

export const SourceFallback: Story = {
  name: 'Source fallback',
  ...storyDescription(
    'Source fallback with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <SourceFallbackExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, sourceFallbackSnippet)

    const target = canvas.getByTestId('fallback-target')
    moveMouseToRelative(target, 0.75, 0.25)
    await waitFor(() => {
      expect(canvas.getByTestId('fallback-source')).toHaveTextContent('mouse')
    })

    await userEvent.click(canvas.getByTestId('fallback-invalid'))
    await expect(canvas.getByTestId('fallback-source')).toHaveTextContent(
      'mouse',
    )

    await userEvent.click(canvas.getByTestId('fallback-valid'))
    await waitFor(() => {
      expect(canvas.getByTestId('fallback-source')).toHaveTextContent(
        'deviceOrientation',
      )
    })

    moveMouseToRelative(target, 0.25, 0.75)
    await waitFor(() => {
      expect(canvas.getByTestId('fallback-source')).toHaveTextContent('mouse')
    })
  },
}

export const ScreenRotation: Story = {
  name: 'Screen rotation',
  ...storyDescription(
    'Screen rotation with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ScreenRotationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, screenRotationSnippet)

    await userEvent.click(canvas.getByTestId('rotation-0'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('rotation-tilt').textContent ?? ''),
      ).toBeCloseTo(0.5, 1)
    })

    await userEvent.click(canvas.getByTestId('rotation-90'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('rotation-roll').textContent ?? ''),
      ).toBeCloseTo(-0.5, 1)
    })

    await userEvent.click(canvas.getByTestId('rotation-180'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('rotation-tilt').textContent ?? ''),
      ).toBeCloseTo(-0.5, 1)
    })

    await userEvent.click(canvas.getByTestId('rotation-270'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('rotation-roll').textContent ?? ''),
      ).toBeCloseTo(0.5, 1)
    })
  },
}

export const CustomSensitivity: Story = {
  name: 'Custom sensitivity',
  ...storyDescription(
    'Custom sensitivity: bind useParallax to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <CustomSensitivityExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, customSensitivitySnippet)

    const card = canvas.getByTestId('sens-card')
    moveMouseToRelative(card, 0.75, 0.5)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('sens-roll').textContent ?? ''),
      ).toBeCloseTo(0.5, 1)
    })
  },
}

export const InvertedMovement: Story = {
  name: 'Inverted movement',
  ...storyDescription(
    'Inverted movement with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <InvertedMovementExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, invertedMovementSnippet)

    const card = canvas.getByTestId('invert-card')
    moveMouseToRelative(card, 0.9, 0.5)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('invert-roll').textContent ?? ''),
      ).toBeLessThan(0)
    })

    moveMouseToRelative(card, 0.5, 0.9)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('invert-tilt').textContent ?? ''),
      ).toBeLessThan(0)
    })
  },
}

export const ClampComparison: Story = {
  name: 'Clamp comparison',
  ...storyDescription(
    'Clamp comparison: compare both configurations side by side and note how useParallax options change observable behavior. Interact with each variant, then confirm Show code documents the option you intend to ship.',
  ),
  render: () => <ClampComparisonExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, clampComparisonSnippet)

    const card = canvas.getByTestId('clamp-card')
    moveMouseToRelative(card, 1, 1)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('clamp-roll').textContent ?? ''),
      ).toBeCloseTo(0.5, 1)
    })

    await userEvent.click(canvas.getByTestId('clamp-toggle'))
    moveMouseToRelative(card, 1, 1)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('clamp-roll').textContent ?? ''),
      ).toBeGreaterThan(0.5)
    })
  },
}

export const MouseOnly: Story = {
  name: 'Mouse only',
  ...storyDescription(
    'Mouse only with useParallax: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <MouseOnlyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, mouseOnlySnippet)

    const surface = canvas.getByTestId('mouse-only-surface')
    moveMouseToRelative(surface, 0.2, 0.8)
    await waitFor(() => {
      expect(canvas.getByTestId('mouse-only-source')).toHaveTextContent('mouse')
    })

    const rollBefore = canvas.getByTestId('mouse-only-roll').textContent
    await userEvent.click(canvas.getByTestId('mouse-only-orient'))
    await expect(canvas.getByTestId('mouse-only-source')).toHaveTextContent(
      'mouse',
    )
    await expect(canvas.getByTestId('mouse-only-roll')).toHaveTextContent(
      rollBefore ?? '',
    )
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useParallax and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, enabledStateSnippet)

    const card = canvas.getByTestId('enabled-card')
    moveMouseToRelative(card, 0.9, 0.1)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('enabled-roll').textContent ?? ''),
      ).not.toBeCloseTo(0, 1)
    })

    await userEvent.click(canvas.getByTestId('toggle-enabled'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('enabled-roll').textContent ?? ''),
      ).toBeCloseTo(0, 1)
      expect(
        parseAxis(canvas.getByTestId('enabled-tilt').textContent ?? ''),
      ).toBeCloseTo(0, 1)
    })
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target: bind useParallax to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)

    moveMouseToRelative(canvas.getByTestId('surface-a'), 0.9, 0.5)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('dynamic-roll').textContent ?? ''),
      ).toBeGreaterThan(0)
    })

    await userEvent.click(canvas.getByTestId('switch-target'))
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('dynamic-roll').textContent ?? ''),
      ).toBeCloseTo(0, 1)
      expect(canvas.getByTestId('dynamic-active')).toHaveTextContent('B')
    })

    moveMouseToRelative(canvas.getByTestId('surface-b'), 0.1, 0.5)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('dynamic-roll').textContent ?? ''),
      ).toBeLessThan(0)
    })
  },
}

export const SvgTarget: Story = {
  name: 'SVG target',
  ...storyDescription(
    'SVG target: bind useParallax to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <SvgTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, svgTargetSnippet)

    const svg = canvas.getByTestId('svg-target')
    moveMouseToRelative(svg, 0.1, 0.1)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('svg-roll').textContent ?? ''),
      ).toBeLessThan(0)
      expect(
        parseAxis(canvas.getByTestId('svg-tilt').textContent ?? ''),
      ).toBeLessThan(0)
    })
  },
}

export const PermissionGuidance: Story = {
  name: 'Permission guidance',
  ...storyDescription(
    'Permission guidance: reproduce the race or permission edge for useParallax with the on-canvas controls. Confirm newer requests win or aborts clear state as documented, then inspect Show code for ownership rules.',
  ),
  render: () => <PermissionGuidanceExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, permissionGuidanceSnippet)

    await expect(canvas.getByTestId('permission-mounted')).toHaveTextContent(
      'false',
    )
    await userEvent.click(canvas.getByTestId('permission-mount'))
    await waitFor(() => {
      expect(canvas.getByTestId('permission-mounted')).toHaveTextContent('true')
      expect(canvas.getByTestId('permission-panel')).toBeVisible()
    })
    await expect(canvas.queryByTestId('request-permission')).toBeVisible()
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useParallax Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, playgroundSnippet)

    await userEvent.click(canvas.getByTestId('play-mount'))
    const card = canvas.getByTestId('playground-card')
    moveMouseToRelative(card, 0.6, 0.4)
    await waitFor(() => {
      expect(
        parseAxis(canvas.getByTestId('play-roll').textContent ?? ''),
      ).toBeGreaterThan(0)
      expect(canvas.getByTestId('play-source')).toHaveTextContent('mouse')
    })

    dispatchOrientation(45, 0)
    await waitFor(() => {
      expect(canvas.getByTestId('play-source')).toHaveTextContent(
        'deviceOrientation',
      )
    })
  },
}
