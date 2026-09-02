import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BasicUsageExample,
  CoordinateSystemsExample,
  CustomExtractorExample,
  CustomTargetExample,
  DragTrackingExample,
  DynamicTargetExample,
  EnabledStateExample,
  FilteredUpdatesExample,
  InitialValueExample,
  MouseOnlyExample,
  PageScrollingExample,
  PlaygroundExample,
  TouchTrackingExample,
} from './components/UseMouseExamples'
import {
  basicUsageSnippet,
  coordinateSystemsSnippet,
  customExtractorSnippet,
  customTargetSnippet,
  dragTrackingSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  filteredUpdatesSnippet,
  initialValueSnippet,
  mouseOnlySnippet,
  pageScrollingSnippet,
  playgroundSnippet,
  touchTrackingSnippet,
} from './components/useMouse.snippets'

const meta = {
  title: 'Hooks/useMouse',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Tracks mouse and optional touch coordinates for a target.

\`\`\`ts
import { useMouse } from '@muradyanvano/react-hooks'

useMouse(options?: UseMouseOptions): UseMouseReturn
\`\`\`

**Defaults:** \`{ enabled: true, type: 'page', target: window, touch: true, scroll: true, resetOnTouchEnd: false, initialValue: { x: 0, y: 0 } }\`

**Targets:** Omitted \`target\` resolves to \`window\` inside an effect. Explicit \`target: null\` registers nothing.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    type: {
      control: 'select',
      options: ['page', 'client', 'screen', 'movement'],
      table: { defaultValue: { summary: 'page' } },
    },
    touch: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    scroll: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    resetOnTouchEnd: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    initialX: {
      control: { type: 'number' },
      table: { defaultValue: { summary: '0' } },
    },
    initialY: {
      control: { type: 'number' },
      table: { defaultValue: { summary: '0' } },
    },
  },
  args: {
    enabled: true,
    type: 'page',
    touch: true,
    scroll: true,
    resetOnTouchEnd: false,
    initialX: 0,
    initialY: 0,
  },
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
  await expect(await canvas.findByTestId('highlighted-code')).toBeVisible()

  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  await userEvent.click(canvas.getByTestId('copy-code'))
  await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
}

function dispatchMouseOn(
  element: Element,
  coords: { clientX: number; clientY: number; pageX: number; pageY: number },
) {
  const event = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: coords.clientX,
    clientY: coords.clientY,
  })
  Object.defineProperty(event, 'pageX', { value: coords.pageX })
  Object.defineProperty(event, 'pageY', { value: coords.pageY })
  Object.defineProperty(event, 'offsetX', { value: coords.clientX })
  Object.defineProperty(event, 'offsetY', { value: coords.clientY })
  element.dispatchEvent(event)
}

export const BasicUsage: Story = {
  name: 'Basic usage',
  render: () => <BasicUsageExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, basicUsageSnippet)

    const surface = canvas.getByTestId('basic-surface')
    const rect = surface.getBoundingClientRect()
    const pageX = rect.left + window.scrollX + 40
    const pageY = rect.top + window.scrollY + 55

    dispatchMouseOn(surface, {
      clientX: rect.left + 40,
      clientY: rect.top + 55,
      pageX,
      pageY,
    })

    await waitFor(() => {
      expect(canvas.getByTestId('status-source')).toHaveTextContent('mouse')
    })
    await expect(canvas.getByTestId('status-x')).toHaveTextContent(
      pageX.toFixed(1),
    )
    await expect(canvas.getByTestId('status-y')).toHaveTextContent(
      pageY.toFixed(1),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('cursor-marker')).toBeTruthy()
    })
  },
}

export const CustomExtractor: Story = {
  name: 'Custom extractor',
  render: () => <CustomExtractorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, customExtractorSnippet)

    const surface = canvas.getByTestId('extractor-surface')
    const rect = surface.getBoundingClientRect()
    dispatchMouseOn(surface, {
      clientX: rect.left + 40,
      clientY: rect.top + 50,
      pageX: rect.left + 40,
      pageY: rect.top + 50,
    })

    await waitFor(() => {
      expect(canvas.getByTestId('offset-source')).toHaveTextContent('mouse')
    })
    const offsetX = Number(
      (canvas.getByTestId('offset-x').textContent ?? '').replace('x: ', ''),
    )
    const offsetY = Number(
      (canvas.getByTestId('offset-y').textContent ?? '').replace('y: ', ''),
    )
    await expect(Math.abs(offsetX - 40)).toBeLessThan(1)
    await expect(Math.abs(offsetY - 50)).toBeLessThan(1)
  },
}

export const CoordinateSystems: Story = {
  name: 'Coordinate systems',
  render: () => <CoordinateSystemsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, coordinateSystemsSnippet)
    await expect(canvas.getByTestId('coord-page')).toBeVisible()
    await expect(canvas.getByTestId('coord-movement')).toBeVisible()
  },
}

export const TouchTracking: Story = {
  name: 'Touch tracking',
  render: () => <TouchTrackingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, touchTrackingSnippet)

    const surface = canvas.getByTestId('touch-surface')
    const touch = new Event('touchstart', { bubbles: true })
    const touchPoint = {
      identifier: 1,
      target: surface,
      clientX: 20,
      clientY: 30,
      pageX: 20,
      pageY: 30,
      screenX: 20,
      screenY: 30,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 0,
    }
    Object.defineProperty(touch, 'touches', {
      value: {
        length: 1,
        0: touchPoint,
        item: (index: number) => (index === 0 ? touchPoint : null),
      },
    })
    Object.defineProperty(touch, 'changedTouches', {
      value: {
        length: 1,
        0: touchPoint,
        item: (index: number) => (index === 0 ? touchPoint : null),
      },
    })
    surface.dispatchEvent(touch)

    await waitFor(() => {
      expect(canvas.getByTestId('touch-source')).toHaveTextContent('touch')
    })

    const touchEnd = new Event('touchend', { bubbles: true })
    Object.defineProperty(touchEnd, 'touches', {
      value: { length: 0, item: () => null },
    })
    Object.defineProperty(touchEnd, 'changedTouches', {
      value: {
        length: 1,
        0: touchPoint,
        item: (index: number) => (index === 0 ? touchPoint : null),
      },
    })
    surface.dispatchEvent(touchEnd)

    await waitFor(() => {
      expect(canvas.getByTestId('touch-source')).toHaveTextContent('idle')
    })
  },
}

export const MouseOnly: Story = {
  name: 'Mouse only',
  render: () => <MouseOnlyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, mouseOnlySnippet)

    const surface = canvas.getByTestId('mouse-only-surface')
    dispatchMouseOn(surface, {
      clientX: 11,
      clientY: 12,
      pageX: 11,
      pageY: 12,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('mouse-only-source')).toHaveTextContent('mouse')
    })

    const touch = new Event('touchstart', { bubbles: true })
    const touchPoint = {
      identifier: 1,
      target: surface,
      clientX: 90,
      clientY: 90,
      pageX: 90,
      pageY: 90,
      screenX: 90,
      screenY: 90,
      radiusX: 0,
      radiusY: 0,
      rotationAngle: 0,
      force: 0,
    }
    Object.defineProperty(touch, 'touches', {
      value: {
        length: 1,
        0: touchPoint,
        item: () => touchPoint,
      },
    })
    Object.defineProperty(touch, 'changedTouches', {
      value: {
        length: 1,
        0: touchPoint,
        item: () => touchPoint,
      },
    })
    surface.dispatchEvent(touch)

    await expect(canvas.getByTestId('mouse-only-x')).toHaveTextContent('11.0')
    await expect(canvas.getByTestId('mouse-only-source')).toHaveTextContent(
      'mouse',
    )
  },
}

export const DragTracking: Story = {
  name: 'Drag tracking',
  render: () => <DragTrackingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, dragTrackingSnippet)

    const zone = canvas.getByTestId('drag-zone')
    const event = new MouseEvent('dragover', {
      bubbles: true,
      clientX: 42,
      clientY: 43,
    })
    Object.defineProperty(event, 'pageX', { value: 42 })
    Object.defineProperty(event, 'pageY', { value: 43 })
    zone.dispatchEvent(event)

    await waitFor(() => {
      expect(canvas.getByTestId('drag-source')).toHaveTextContent('mouse')
    })
    await expect(canvas.getByTestId('drag-x')).toHaveTextContent('42.0')
  },
}

export const PageScrolling: Story = {
  name: 'Page scrolling',
  render: () => <PageScrollingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, pageScrollingSnippet)
    await expect(canvas.getByTestId('scroll-iframe')).toBeVisible()
  },
}

export const CustomTarget: Story = {
  name: 'Custom target',
  render: () => <CustomTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, customTargetSnippet)

    const surface = canvas.getByTestId('custom-target-surface')
    dispatchMouseOn(surface, {
      clientX: 15,
      clientY: 16,
      pageX: 15,
      pageY: 16,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('custom-source')).toHaveTextContent('mouse')
    })

    dispatchMouseOn(document.body, {
      clientX: 200,
      clientY: 200,
      pageX: 200,
      pageY: 200,
    })
    await expect(canvas.getByTestId('custom-x')).toHaveTextContent('15.0')
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)

    const surfaceA = canvas.getByTestId('surface-a')
    dispatchMouseOn(surfaceA, {
      clientX: 10,
      clientY: 11,
      pageX: 10,
      pageY: 11,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-x')).toHaveTextContent('10.0')
    })

    await userEvent.click(canvas.getByTestId('switch-target'))
    await expect(canvas.getByTestId('dynamic-active')).toHaveTextContent('B')

    dispatchMouseOn(surfaceA, {
      clientX: 99,
      clientY: 99,
      pageX: 99,
      pageY: 99,
    })
    await expect(canvas.getByTestId('dynamic-x')).toHaveTextContent('10.0')

    const surfaceB = canvas.getByTestId('surface-b')
    dispatchMouseOn(surfaceB, {
      clientX: 21,
      clientY: 22,
      pageX: 21,
      pageY: 22,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-x')).toHaveTextContent('21.0')
    })
  },
}

export const FilteredUpdates: Story = {
  name: 'Filtered updates',
  render: () => <FilteredUpdatesExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, filteredUpdatesSnippet)

    const surface = canvas.getByTestId('filter-surface')
    dispatchMouseOn(surface, {
      clientX: 18,
      clientY: 19,
      pageX: 18,
      pageY: 19,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('filter-source')).toHaveTextContent('mouse')
    })
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, enabledStateSnippet)

    const surface = canvas.getByTestId('enabled-surface')
    dispatchMouseOn(surface, {
      clientX: 13,
      clientY: 14,
      pageX: 13,
      pageY: 14,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-x')).toHaveTextContent('13.0')
    })

    await userEvent.click(canvas.getByTestId('toggle-enabled'))
    await expect(canvas.getByTestId('enabled-flag')).toHaveTextContent('false')

    dispatchMouseOn(surface, {
      clientX: 80,
      clientY: 80,
      pageX: 80,
      pageY: 80,
    })
    await expect(canvas.getByTestId('enabled-x')).toHaveTextContent('13.0')
  },
}

export const InitialValue: Story = {
  name: 'Initial value',
  render: () => <InitialValueExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, initialValueSnippet)
    await expect(canvas.getByTestId('initial-x')).toHaveTextContent('24.0')
    await expect(canvas.getByTestId('initial-y')).toHaveTextContent('48.0')
  },
}

export const Playground: Story = {
  name: 'Playground',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, playgroundSnippet)
    await userEvent.click(canvas.getByTestId('play-mount'))
    await waitFor(() => {
      expect(canvas.getByTestId('play-mounted')).toHaveTextContent('true')
    })
    const surface = canvas.getByTestId('playground-surface')
    dispatchMouseOn(surface, {
      clientX: 5,
      clientY: 6,
      pageX: 5,
      pageY: 6,
    })
    await waitFor(() => {
      expect(canvas.getByTestId('play-source')).toHaveTextContent('mouse')
    })
  },
}
