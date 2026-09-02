import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  DirectionsExample,
  DocumentTargetExample,
  DynamicContentExample,
  DynamicTargetExample,
  EnabledStateExample,
  ErrorHandlingExample,
  HorizontalGalleryExample,
  MutationObservationExample,
  OffsetsExample,
  PlaygroundExample,
  ProgrammaticPositionExample,
  RtlHorizontalExample,
  ScrollDashboardExample,
  ScrollingStateExample,
  SmoothScrollingExample,
  ThrottleComparisonExample,
  VerticalArticleExample,
  WindowTargetExample,
} from './components/UseScrollExamples'
import {
  directionsSnippet,
  documentTargetSnippet,
  dynamicContentSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  errorHandlingSnippet,
  horizontalGallerySnippet,
  mutationObservationSnippet,
  offsetsSnippet,
  playgroundSnippet,
  programmaticPositionSnippet,
  rtlHorizontalSnippet,
  scrollDashboardSnippet,
  scrollingStateSnippet,
  smoothScrollingSnippet,
  throttleComparisonSnippet,
  verticalArticleSnippet,
  windowTargetSnippet,
} from './components/useScroll.snippets'

const meta = {
  title: 'Hooks/useScroll',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Tracks scroll position, arrival, direction, and scrolling state for an element, \`window\`, or \`document\` target.

\`\`\`ts
import { useScroll } from '@muradyanvano/react-hooks'

useScroll(ref, options?): UseScrollReturn
\`\`\`

**Defaults:** \`{ enabled: true, throttle: 0, idle: 200, observe: false, behavior: 'auto' }\`

**Return:** \`{ x, y, isScrolling, arrivedState, directions, measure, scrollTo, setX, setY }\`

After imperative \`ref.current\` assignment, a later React commit is required before the hook can attach to the new target.

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
    throttle: {
      control: { type: 'number', min: 0, max: 500, step: 25 },
      table: { defaultValue: { summary: '0' } },
    },
    idle: {
      control: { type: 'number', min: 0, max: 1000, step: 50 },
      table: { defaultValue: { summary: '200' } },
    },
    offset: {
      control: { type: 'number', min: 0, max: 80, step: 5 },
      table: { defaultValue: { summary: '0' } },
    },
    behavior: {
      control: 'select',
      options: ['auto', 'smooth', 'instant'],
      table: { defaultValue: { summary: 'auto' } },
    },
    observeMutation: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  args: {
    enabled: true,
    throttle: 0,
    idle: 200,
    offset: 0,
    behavior: 'auto',
    observeMutation: false,
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
  const highlighted = await canvas.findByTestId('highlighted-code')
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

function scrollElement(element: HTMLElement, left: number, top: number): void {
  element.scrollLeft = left
  element.scrollTop = top
  element.dispatchEvent(new Event('scroll', { bubbles: true }))
}

function parseScrollValue(text: string | null | undefined): number {
  const value = Number.parseInt(text ?? '0', 10)
  return Number.isFinite(value) ? value : 0
}

function arrivedFlag(
  text: string,
  edge: 'L' | 'R' | 'T' | 'B',
): boolean | null {
  const match = text.match(new RegExp(`${edge}:(true|false)`))
  if (match == null) {
    return null
  }
  return match[1] === 'true'
}

export const ScrollDashboard: Story = {
  name: 'Scroll dashboard',
  render: () => <ScrollDashboardExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('scroll-dashboard')

    await waitFor(() => {
      const arrived = canvas.getByTestId('dashboard-arrived').textContent ?? ''
      expect(arrivedFlag(arrived, 'T')).toBe(true)
      expect(arrivedFlag(arrived, 'L')).toBe(true)
      expect(
        parseScrollValue(canvas.getByTestId('dashboard-x').textContent),
      ).toBe(0)
      expect(
        parseScrollValue(canvas.getByTestId('dashboard-y').textContent),
      ).toBe(0)
    })

    await waitFor(
      () => {
        scrollElement(scroller, 60, 45)
        expect(
          parseScrollValue(canvas.getByTestId('dashboard-x').textContent),
        ).toBeGreaterThan(0)
        expect(
          parseScrollValue(canvas.getByTestId('dashboard-y').textContent),
        ).toBeGreaterThan(0)
        expect(canvas.getByTestId('dashboard-scrolling')).toHaveTextContent(
          'true',
        )
      },
      { timeout: 800 },
    )

    scrollElement(scroller, 100, 80)
    await waitFor(() => {
      expect(canvas.getByTestId('dashboard-directions').textContent).toMatch(
        /right|bottom/i,
      )
    })

    await waitFor(
      () => {
        expect(canvas.getByTestId('dashboard-scrolling')).toHaveTextContent(
          'false',
        )
      },
      { timeout: 1200 },
    )

    const maxLeft = scroller.scrollWidth - scroller.clientWidth
    const maxTop = scroller.scrollHeight - scroller.clientHeight
    scrollElement(scroller, maxLeft, maxTop)
    await waitFor(() => {
      const arrived = canvas.getByTestId('dashboard-arrived').textContent ?? ''
      expect(arrivedFlag(arrived, 'R')).toBe(true)
      expect(arrivedFlag(arrived, 'B')).toBe(true)
    })

    const inputX = canvas.getByTestId('dashboard-input-x')
    const inputY = canvas.getByTestId('dashboard-input-y')
    await userEvent.clear(inputX)
    await userEvent.type(inputX, '24')
    await userEvent.clear(inputY)
    await userEvent.type(inputY, '16')
    await userEvent.click(canvas.getByTestId('dashboard-apply'))
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('dashboard-x').textContent),
      ).toBe(24)
      expect(
        parseScrollValue(canvas.getByTestId('dashboard-y').textContent),
      ).toBe(16)
    })

    await userEvent.click(canvas.getByTestId('dashboard-toggle-height'))
    await waitFor(() => {
      const arrived = canvas.getByTestId('dashboard-arrived').textContent ?? ''
      expect(arrived.length).toBeGreaterThan(0)
    })

    await expectCodeDisclosure(canvas, scrollDashboardSnippet)
  },
}

export const VerticalArticle: Story = {
  name: 'Vertical article',
  render: () => <VerticalArticleExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const article = canvas.getByTestId('vertical-article')
    scrollElement(article, 0, 120)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('article-y').textContent),
      ).toBeGreaterThan(0)
    })
    await expectCodeDisclosure(canvas, verticalArticleSnippet)
  },
}

export const HorizontalGallery: Story = {
  name: 'Horizontal gallery',
  render: () => <HorizontalGalleryExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const gallery = canvas.getByTestId('horizontal-gallery')
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('gallery-x').textContent),
      ).toBe(0)
    })
    const maxLeft = Math.max(gallery.scrollWidth - gallery.clientWidth, 160)
    scrollElement(gallery, Math.min(80, maxLeft), 0)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('gallery-x').textContent),
      ).toBeGreaterThan(0)
    })
    scrollElement(gallery, maxLeft, 0)
    await waitFor(() => {
      expect(canvas.getByTestId('gallery-directions').textContent).toMatch(
        /right/i,
      )
    })
    await expectCodeDisclosure(canvas, horizontalGallerySnippet)
  },
}

export const Offsets: Story = {
  name: 'Offsets',
  render: () => <OffsetsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('offsets-scroller')
    await waitFor(() => {
      const arrived = canvas.getByTestId('offsets-arrived').textContent ?? ''
      expect(arrivedFlag(arrived, 'T')).toBe(true)
      expect(arrivedFlag(arrived, 'L')).toBe(true)
    })
    const maxLeft = scroller.scrollWidth - scroller.clientWidth
    const maxTop = scroller.scrollHeight - scroller.clientHeight
    scrollElement(scroller, maxLeft, maxTop)
    await waitFor(() => {
      const arrived = canvas.getByTestId('offsets-arrived').textContent ?? ''
      expect(arrivedFlag(arrived, 'R')).toBe(true)
      expect(arrivedFlag(arrived, 'B')).toBe(true)
    })
    await expectCodeDisclosure(canvas, offsetsSnippet)
  },
}

export const ProgrammaticPosition: Story = {
  name: 'Programmatic position',
  render: () => <ProgrammaticPositionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('programmatic-jump'))
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('programmatic-x').textContent),
      ).toBe(40)
      expect(
        parseScrollValue(canvas.getByTestId('programmatic-y').textContent),
      ).toBe(40)
    })
    await userEvent.click(canvas.getByTestId('programmatic-reset-x'))
    await userEvent.click(canvas.getByTestId('programmatic-reset-y'))
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('programmatic-x').textContent),
      ).toBe(0)
      expect(
        parseScrollValue(canvas.getByTestId('programmatic-y').textContent),
      ).toBe(0)
    })
    await expectCodeDisclosure(canvas, programmaticPositionSnippet)
  },
}

export const SmoothScrolling: Story = {
  name: 'Smooth scrolling',
  render: () => <SmoothScrollingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('smooth-jump')).toBeVisible()
    await expect(canvas.getByTestId('smooth-scroller')).toBeVisible()
    await expectCodeDisclosure(canvas, smoothScrollingSnippet)
  },
}

export const ScrollingState: Story = {
  name: 'Scrolling state',
  render: () => <ScrollingStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('state-scroller')
    scrollElement(scroller, 0, 80)
    await waitFor(() => {
      expect(canvas.getByTestId('state-scrolling')).toHaveTextContent('true')
    })
    await waitFor(
      () => {
        expect(canvas.getByTestId('state-scrolling')).toHaveTextContent('false')
        expect(
          parseScrollValue(canvas.getByTestId('state-stop-count').textContent),
        ).toBeGreaterThan(0)
      },
      { timeout: 800 },
    )
    await expectCodeDisclosure(canvas, scrollingStateSnippet)
  },
}

export const ThrottleComparison: Story = {
  name: 'Throttle comparison',
  render: () => <ThrottleComparisonExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('throttle-scroller')
    scrollElement(scroller, 0, 40)
    scrollElement(scroller, 0, 80)
    scrollElement(scroller, 0, 120)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('throttle-updates').textContent),
      ).toBeGreaterThan(0)
    })
    await userEvent.click(canvas.getByTestId('throttle-toggle'))
    await expect(canvas.getByTestId('throttle-value')).toHaveTextContent(
      '100ms',
    )
    await expectCodeDisclosure(canvas, throttleComparisonSnippet)
  },
}

export const Directions: Story = {
  name: 'Directions',
  render: () => <DirectionsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scroller = canvas.getByTestId('directions-scroller')
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('directions-x').textContent),
      ).toBe(0)
    })
    scrollElement(scroller, 60, 0)
    await waitFor(() => {
      expect(canvas.getByTestId('direction-right')).toHaveTextContent(/true/)
    })
    scrollElement(scroller, 60, 60)
    await waitFor(() => {
      expect(canvas.getByTestId('direction-bottom')).toHaveTextContent(/true/)
    })
    await expectCodeDisclosure(canvas, directionsSnippet)
  },
}

export const DynamicContent: Story = {
  name: 'Dynamic content',
  render: () => <DynamicContentExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('dynamic-add'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-block-9')).toBeVisible()
    })
    await expectCodeDisclosure(canvas, dynamicContentSnippet)
  },
}

export const MutationObservation: Story = {
  name: 'Mutation observation',
  render: () => <MutationObservationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('mutation-add'))
    await waitFor(() => {
      expect(canvas.getByTestId('mutation-arrived').textContent).toMatch(
        /B:false/,
      )
    })
    await expectCodeDisclosure(canvas, mutationObservationSnippet)
  },
}

export const WindowTarget: Story = {
  name: 'Window target',
  render: () => <WindowTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('window-ready')).toHaveTextContent('true')
    })
    const iframe = canvas.getByTestId('window-iframe') as HTMLIFrameElement
    const doc = iframe.contentDocument
    const win = iframe.contentWindow
    expect(doc).toBeTruthy()
    expect(win).toBeTruthy()
    if (win != null && doc != null) {
      win.scrollTo(0, 120)
      win.dispatchEvent(new Event('scroll'))
    }
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('window-y').textContent),
      ).toBeGreaterThan(0)
    })
    await expectCodeDisclosure(canvas, windowTargetSnippet)
  },
}

export const DocumentTarget: Story = {
  name: 'Document target',
  render: () => <DocumentTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('document-ready')).toHaveTextContent('true')
    })
    const iframe = canvas.getByTestId('document-iframe') as HTMLIFrameElement
    const win = iframe.contentWindow
    if (win != null) {
      win.scrollTo(0, 100)
      win.dispatchEvent(new Event('scroll'))
    }
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('document-y').textContent),
      ).toBeGreaterThan(0)
    })
    await expectCodeDisclosure(canvas, documentTargetSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  render: () => <DynamicTargetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    scrollElement(canvas.getByTestId('dynamic-first'), 80, 0)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('dynamic-x').textContent),
      ).toBeGreaterThan(0)
    })
    await userEvent.click(canvas.getByTestId('dynamic-switch'))
    await waitFor(() => {
      expect(canvas.getByTestId('dynamic-active')).toHaveTextContent('second')
      expect(
        parseScrollValue(canvas.getByTestId('dynamic-x').textContent),
      ).toBe(0)
    })
    scrollElement(canvas.getByTestId('dynamic-second'), 72, 0)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('dynamic-x').textContent),
      ).toBeGreaterThan(0)
    })
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    scrollElement(canvas.getByTestId('enabled-scroller'), 0, 64)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('enabled-y').textContent),
      ).toBeGreaterThan(0)
    })
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    scrollElement(canvas.getByTestId('enabled-scroller'), 0, 120)
    await expect(canvas.getByTestId('enabled-flag')).toHaveTextContent('false')
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await expect(canvas.getByTestId('enabled-flag')).toHaveTextContent('true')
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const RtlHorizontal: Story = {
  name: 'RTL horizontal',
  render: () => <RtlHorizontalExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const gallery = canvas.getByTestId('rtl-gallery')
    await expect(canvas.getByTestId('rtl-arrived')).toBeVisible()
    const maxLeft = Math.max(0, gallery.scrollWidth - gallery.clientWidth)
    scrollElement(gallery, maxLeft, 0)
    scrollElement(gallery, 0, 0)
    await waitFor(() => {
      expect(canvas.getByTestId('rtl-arrived').textContent).toMatch(/L:|R:/)
    })
    await expectCodeDisclosure(canvas, rtlHorizontalSnippet)
  },
}

export const ErrorHandling: Story = {
  name: 'Error handling',
  render: () => <ErrorHandlingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('error-force'))
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('error-count').textContent),
      ).toBeGreaterThan(0)
      expect(canvas.getByTestId('error-item-0')).toHaveTextContent(
        'Scroll blocked',
      )
    })
    await expectCodeDisclosure(canvas, errorHandlingSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('play-mount'))
    const scroller = canvas.getByTestId('play-scroller')
    scrollElement(scroller, 48, 36)
    await waitFor(() => {
      expect(
        parseScrollValue(canvas.getByTestId('play-x').textContent),
      ).toBeGreaterThan(0)
      expect(canvas.getByTestId('play-scrolling')).toHaveTextContent('true')
    })
    await userEvent.click(canvas.getByTestId('play-measure'))
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
