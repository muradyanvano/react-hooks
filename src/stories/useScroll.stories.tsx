import type { Meta, StoryObj } from '@storybook/react-vite'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
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
import { waitForDisclosedCode } from './components/expectCodeDisclosure'

const meta = {
  title: 'Hooks/useScroll',
  tags: ['autodocs'],
  ...createHookStoryMeta('useScroll', PlaygroundExample, {
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

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Two-axis scroll dashboards with arrived/direction metrics and programmatic setX/setY. Scroll the contained region and drive the inputs. Prefer contained scrollers over locking the Storybook page.',
  ),
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
  ...storyDescription(
    'Vertical article with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Horizontal gallery with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Offsets with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Programmatic position with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Smooth scrolling with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Scrolling state with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Throttle comparison: compare both configurations side by side and note how useScroll options change observable behavior. Interact with each variant, then confirm Show code documents the option you intend to ship.',
  ),
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
  ...storyDescription(
    'Directions with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Dynamic content with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Mutation observation with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Window target: bind useScroll to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
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
  ...storyDescription(
    'Document target: bind useScroll to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
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
  ...storyDescription(
    'Dynamic target: bind useScroll to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
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
  ...storyDescription(
    'Toggle enabled for useScroll and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
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
  ...storyDescription(
    'RTL horizontal with useScroll: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Error handling — trigger the failure path for useScroll and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'useScroll Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
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
