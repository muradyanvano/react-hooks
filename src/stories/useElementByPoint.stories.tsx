import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  CustomDocumentExample,
  EnabledStateExample,
  ManualUpdateExample,
  MultipleElementsExample,
  OutOfViewportExample,
  PauseResumeExample,
  PlaygroundExample,
  PointerInspectorExample,
  SchedulerComparisonExample,
  SvgDetectionExample,
  XYCoordinatesExample,
} from './components/UseElementByPointExamples'
import {
  customDocumentSnippet,
  enabledStateSnippet,
  manualUpdateSnippet,
  multipleElementsSnippet,
  outOfViewportSnippet,
  pauseResumeSnippet,
  playgroundSnippet,
  pointerInspectorSnippet,
  schedulerComparisonSnippet,
  svgDetectionSnippet,
  xyCoordinatesSnippet,
} from './components/useElementByPoint.snippets'

const meta = {
  title: 'Hooks/useElementByPoint',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Reactively resolves the DOM \`Element\` (or elements) sitting at viewport coordinates via \`elementFromPoint\` / \`elementsFromPoint\`.

\`\`\`ts
import { useElementByPoint } from '@muradyanvano/react-hooks'

useElementByPoint(options: UseElementByPointOptions): UseElementByPointReturn
\`\`\`

**Defaults:** \`{ multiple: false, enabled: true, scheduler: 'animationFrame' }\`

**Coordinate space:** \`x\` / \`y\` are viewport ("client") coordinates — the same space as \`event.clientX\` / \`event.clientY\` and \`element.getBoundingClientRect()\`, not page/document coordinates.

**Non-mutating:** the hook only reads the DOM. It never writes to the returned element's style, class, or attributes. Every highlight overlay and crosshair below is a separate, \`pointer-events: none\` Storybook-only visual — never part of the hook's result.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    x: {
      control: { type: 'number', min: 0, max: 400, step: 10 },
      description:
        'Horizontal position, relative to the stage below (converted to viewport coordinates internally).',
      table: { defaultValue: { summary: '100' } },
    },
    y: {
      control: { type: 'number', min: 0, max: 240, step: 10 },
      description: 'Vertical position, relative to the stage below.',
      table: { defaultValue: { summary: '70' } },
    },
    multiple: {
      control: 'boolean',
      description:
        'Switch the result to a readonly Element[] via elementsFromPoint.',
      table: { defaultValue: { summary: 'false' } },
    },
    enabled: {
      control: 'boolean',
      description:
        'When false, clears the result and stops scheduling lookups.',
      table: { defaultValue: { summary: 'true' } },
    },
    scheduler: {
      control: 'select',
      options: ['animationFrame', 'sync'],
      description: 'Lookup scheduling strategy.',
      table: { defaultValue: { summary: 'animationFrame' } },
    },
  },
  args: {
    x: 100,
    y: 70,
    multiple: false,
    enabled: true,
    scheduler: 'animationFrame',
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

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

export const XYCoordinates: Story = {
  name: 'X and Y coordinates',
  render: () => <XYCoordinatesExample />,
  parameters: { docs: { source: { code: xyCoordinatesSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('xy-supported-value')).toHaveTextContent(
      'true',
    )
    await expect(canvas.getByTestId('xy-x-input')).toBeVisible()
    await expect(canvas.getByTestId('xy-y-input')).toBeVisible()

    await waitFor(() => {
      expect(canvas.getByTestId('xy-element-value')).toHaveTextContent(
        'xy-box-a',
      )
    })

    const boxB = canvas.getByTestId('xy-box-b')
    const boxBRect = boxB.getBoundingClientRect()
    const currentY =
      canvas.getByTestId('xy-y-input').getAttribute('value') ?? ''

    await userEvent.clear(canvas.getByTestId('xy-x-input'))
    await userEvent.type(
      canvas.getByTestId('xy-x-input'),
      String(Math.round(boxBRect.left + boxBRect.width / 2)),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('xy-element-value')).toHaveTextContent(
        'xy-box-b',
      )
    })

    const stage = canvas.getByTestId('xy-stage')
    const stageRect = stage.getBoundingClientRect()
    await userEvent.clear(canvas.getByTestId('xy-y-input'))
    await userEvent.type(
      canvas.getByTestId('xy-y-input'),
      String(Math.round(stageRect.bottom - 4)),
    )
    await waitFor(() => {
      expect(canvas.getByTestId('xy-y-value')).not.toHaveTextContent(currentY)
    })
    await waitFor(() => {
      expect(canvas.getByTestId('xy-element-value')).not.toHaveTextContent(
        'xy-box-b',
      )
    })

    await expect(canvas.getByTestId('xy-overlay')).toBeInTheDocument()
    await expect(canvas.getByTestId('xy-crosshair')).toBeInTheDocument()
    await expect(canvas.getByTestId('xy-element-value')).not.toHaveTextContent(
      'xy-overlay',
    )
    await expect(canvas.getByTestId('xy-element-value')).not.toHaveTextContent(
      'xy-crosshair',
    )

    await expectCodeDisclosure(canvas, xyCoordinatesSnippet)
  },
}

export const PointerInspector: Story = {
  name: 'Pointer inspector',
  render: () => <PointerInspectorExample />,
  parameters: { docs: { source: { code: pointerInspectorSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('insp-move-strong'))
    await waitFor(() => {
      expect(canvas.getByTestId('insp-tag-value')).toHaveTextContent('strong')
    })
    await expect(canvas.getByTestId('insp-text-value')).toHaveTextContent(
      'bold text',
    )

    await userEvent.click(canvas.getByTestId('insp-move-link'))
    await waitFor(() => {
      expect(canvas.getByTestId('insp-tag-value')).toHaveTextContent('a')
    })

    await userEvent.click(canvas.getByTestId('insp-move-code'))
    await waitFor(() => {
      expect(canvas.getByTestId('insp-tag-value')).toHaveTextContent('code')
    })

    await expectCodeDisclosure(canvas, pointerInspectorSnippet)
  },
}

export const MultipleElements: Story = {
  name: 'Multiple elements',
  render: () => <MultipleElementsExample />,
  parameters: { docs: { source: { code: multipleElementsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('multi-move-overlap'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('multi-count-value').textContent),
      ).toBeGreaterThanOrEqual(3)
    })
    await expect(canvas.getByTestId('multi-list-item-0')).toHaveTextContent(
      'multi-box-top',
    )

    await userEvent.click(canvas.getByTestId('multi-move-top-only'))
    await waitFor(() => {
      expect(canvas.getByTestId('multi-count-value')).toHaveTextContent('1')
    })
    await expect(canvas.getByTestId('multi-list-item-0')).toHaveTextContent(
      'multi-box-top',
    )
    await expect(canvas.getByTestId('multi-list-item-0')).not.toHaveTextContent(
      'overlay',
    )
    await expect(canvas.getByTestId('multi-list-item-0')).not.toHaveTextContent(
      'crosshair',
    )

    await expectCodeDisclosure(canvas, multipleElementsSnippet)
  },
}

export const PauseAndResume: Story = {
  name: 'Pause and resume',
  render: () => <PauseResumeExample />,
  parameters: { docs: { source: { code: pauseResumeSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('pause-move-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('pause-element-value')).toHaveTextContent(
        'pause-box-a',
      )
    })

    await userEvent.click(canvas.getByTestId('pause-toggle'))
    await expect(canvas.getByTestId('pause-status-value')).toHaveTextContent(
      'Paused',
    )

    await userEvent.click(canvas.getByTestId('pause-move-b'))
    await expect(canvas.getByTestId('pause-element-value')).toHaveTextContent(
      'pause-box-a',
    )

    await userEvent.click(canvas.getByTestId('pause-toggle'))
    await expect(canvas.getByTestId('pause-status-value')).toHaveTextContent(
      'Running',
    )
    await waitFor(() => {
      expect(canvas.getByTestId('pause-element-value')).toHaveTextContent(
        'pause-box-b',
      )
    })

    await expectCodeDisclosure(canvas, pauseResumeSnippet)
  },
}

export const ManualUpdate: Story = {
  name: 'Manual update',
  render: () => <ManualUpdateExample />,
  parameters: { docs: { source: { code: manualUpdateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('manual-element-value')).toHaveTextContent(
        'manual-box',
      )
    })

    await userEvent.click(canvas.getByTestId('manual-nudge'))
    await expect(canvas.getByTestId('manual-shifted-value')).toHaveTextContent(
      'Yes',
    )
    // No coordinate changed, so the memoized result stays stale.
    await expect(canvas.getByTestId('manual-element-value')).toHaveTextContent(
      'manual-box',
    )

    await userEvent.click(canvas.getByTestId('manual-refresh'))
    await waitFor(() => {
      expect(canvas.getByTestId('manual-element-value')).not.toHaveTextContent(
        'manual-box',
      )
    })

    await userEvent.click(canvas.getByTestId('manual-restore'))
    await userEvent.click(canvas.getByTestId('manual-refresh'))
    await waitFor(() => {
      expect(canvas.getByTestId('manual-element-value')).toHaveTextContent(
        'manual-box',
      )
    })

    await expectCodeDisclosure(canvas, manualUpdateSnippet)
  },
}

export const SvgDetection: Story = {
  name: 'SVG detection',
  render: () => <SvgDetectionExample />,
  parameters: { docs: { source: { code: svgDetectionSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('svg-move-circle'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-tag-value')).toHaveTextContent('circle')
    })
    await expect(canvas.getByTestId('svg-is-svg-value')).toHaveTextContent(
      'true',
    )
    await expect(canvas.getByTestId('svg-namespace-value')).toHaveTextContent(
      'http://www.w3.org/2000/svg',
    )

    await userEvent.click(canvas.getByTestId('svg-move-rect'))
    await waitFor(() => {
      expect(canvas.getByTestId('svg-tag-value')).toHaveTextContent('rect')
    })

    await expectCodeDisclosure(canvas, svgDetectionSnippet)
  },
}

export const OutOfViewport: Story = {
  name: 'Out-of-viewport',
  render: () => <OutOfViewportExample />,
  parameters: { docs: { source: { code: outOfViewportSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('oov-move-onscreen'))
    await waitFor(() => {
      expect(canvas.getByTestId('oov-element-value')).toHaveTextContent(
        'oov-box',
      )
    })
    await expect(canvas.getByTestId('oov-in-viewport-value')).toHaveTextContent(
      'true',
    )

    await userEvent.click(canvas.getByTestId('oov-move-before'))
    await waitFor(() => {
      expect(canvas.getByTestId('oov-element-value')).toHaveTextContent('none')
    })
    await expect(canvas.getByTestId('oov-in-viewport-value')).toHaveTextContent(
      'false',
    )

    await userEvent.click(canvas.getByTestId('oov-move-beyond'))
    await waitFor(() => {
      expect(canvas.getByTestId('oov-element-value')).toHaveTextContent('none')
    })

    await expectCodeDisclosure(canvas, outOfViewportSnippet)
  },
}

export const CustomDocument: Story = {
  name: 'Custom document',
  render: () => <CustomDocumentExample />,
  parameters: { docs: { source: { code: customDocumentSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('iframe-ready-value')).toHaveTextContent('Yes')
    })
    await expect(
      canvas.getByTestId('iframe-supported-value'),
    ).toHaveTextContent('true')

    await userEvent.click(canvas.getByTestId('iframe-move-target'))
    await waitFor(() => {
      expect(canvas.getByTestId('iframe-element-value')).toHaveTextContent(
        'iframe-target',
      )
    })

    await expectCodeDisclosure(canvas, customDocumentSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('enabled-move'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-element-value')).toHaveTextContent(
        'enabled-box',
      )
    })

    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-element-value')).toHaveTextContent(
        'none',
      )
    })
    await expect(canvas.getByTestId('enabled-status-value')).toHaveTextContent(
      'Disabled',
    )

    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('enabled-element-value')).toHaveTextContent(
        'enabled-box',
      )
    })

    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const SchedulerComparison: Story = {
  name: 'Scheduler comparison',
  render: () => <SchedulerComparisonExample />,
  parameters: { docs: { source: { code: schedulerComparisonSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByTestId('sched-move'))
    await waitFor(() => {
      expect(canvas.getByTestId('sched-sync-element-value')).toHaveTextContent(
        'sched-box',
      )
    })
    await waitFor(() => {
      expect(canvas.getByTestId('sched-af-element-value')).toHaveTextContent(
        'sched-box',
      )
    })

    await expectCodeDisclosure(canvas, schedulerComparisonSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() => {
      expect(canvas.getByTestId('pg-element-value')).toHaveTextContent(
        'pg-box-a',
      )
    })
    await expect(canvas.getByTestId('pg-supported-value')).toHaveTextContent(
      'true',
    )

    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
