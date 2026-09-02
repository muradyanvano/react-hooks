import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AsyncLoadingExample,
  BottomDirectionExample,
  DynamicTargetExample,
  EnabledStateExample,
  EndOfDataExample,
  ErrorRetryExample,
  HorizontalDirectionsExample,
  InfiniteListExample,
  PlaygroundExample,
  ShortContainerExample,
  TopDirectionExample,
  WindowScrollingExample,
} from './components/UseInfiniteScrollExamples'
import {
  asyncLoadingSnippet,
  bottomDirectionSnippet,
  dynamicTargetSnippet,
  enabledStateSnippet,
  endOfDataSnippet,
  errorRetrySnippet,
  horizontalDirectionsSnippet,
  infiniteListSnippet,
  playgroundSnippet,
  shortContainerSnippet,
  topDirectionSnippet,
  windowScrollingSnippet,
} from './components/useInfiniteScroll.snippets'

const meta = {
  title: 'Hooks/useInfiniteScroll',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Loads more content when a scrollable target approaches a configured edge.

\`\`\`ts
import { useInfiniteScroll } from '@muradyanvano/react-hooks'

useInfiniteScroll(ref, onLoadMore, options?): UseInfiniteScrollReturn
\`\`\`

**Defaults:** \`{ enabled: true, distance: 0, direction: 'bottom', canLoadMore: () => true }\`

The hook owns threshold detection and serialized loading. Consumers own fetching, item state, scroll anchoring, and accessibility messaging.

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
  },
  argTypes: {
    enabled: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    direction: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      table: { defaultValue: { summary: 'bottom' } },
    },
    distance: {
      control: { type: 'number', min: 0, step: 1 },
      table: { defaultValue: { summary: '0' } },
    },
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
}

function scrollNearBottom(element: HTMLElement): void {
  element.scrollTop = Math.max(
    0,
    element.scrollHeight - element.clientHeight - 4,
  )
  element.dispatchEvent(new Event('scroll'))
}

export const InfiniteList: Story = {
  name: 'Infinite list',
  render: () => <InfiniteListExample />,
  parameters: { docs: { source: { code: infiniteListSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByTestId('infinite-list')

    await expect(canvas.getByTestId('list-count')).toHaveTextContent('6')

    await waitFor(
      () => {
        scrollNearBottom(list)
        expect(
          Number(canvas.getByTestId('list-count').textContent),
        ).toBeGreaterThan(6)
      },
      { timeout: 4000 },
    )

    await waitFor(
      () => {
        scrollNearBottom(list)
        expect(canvas.getByTestId('list-status')).toHaveTextContent(
          'All items loaded',
        )
      },
      { timeout: 8000 },
    )

    await userEvent.click(canvas.getByTestId('list-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('list-count')).toHaveTextContent('6')
    })

    await waitFor(
      () => {
        scrollNearBottom(list)
        expect(
          Number(canvas.getByTestId('list-count').textContent),
        ).toBeGreaterThan(6)
      },
      { timeout: 4000 },
    )

    await expectCodeDisclosure(canvas, infiniteListSnippet)
  },
}

export const BottomDirection: Story = {
  name: 'Bottom direction',
  render: () => <BottomDirectionExample />,
  parameters: { docs: { source: { code: bottomDirectionSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    scrollNearBottom(canvas.getByTestId('bottom-feed'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('bottom-count').textContent),
      ).toBeGreaterThan(8)
    })
    await expectCodeDisclosure(canvas, bottomDirectionSnippet)
  },
}

export const TopDirection: Story = {
  name: 'Top direction',
  render: () => <TopDirectionExample />,
  parameters: { docs: { source: { code: topDirectionSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const feed = canvas.getByTestId('top-feed')
    feed.scrollTop = 0
    feed.dispatchEvent(new Event('scroll'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('top-count').textContent),
      ).toBeGreaterThan(2)
    })
    await expectCodeDisclosure(canvas, topDirectionSnippet)
  },
}

export const HorizontalDirections: Story = {
  name: 'Horizontal directions',
  render: () => <HorizontalDirectionsExample />,
  parameters: { docs: { source: { code: horizontalDirectionsSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const right = canvas.getByTestId('right-strip')
    right.scrollLeft = Math.max(0, right.scrollWidth - right.clientWidth - 4)
    right.dispatchEvent(new Event('scroll'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('right-count').textContent),
      ).toBeGreaterThan(6)
    })
    await expectCodeDisclosure(canvas, horizontalDirectionsSnippet)
  },
}

export const AsyncLoading: Story = {
  name: 'Async loading',
  render: () => <AsyncLoadingExample />,
  parameters: { docs: { source: { code: asyncLoadingSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    scrollNearBottom(canvas.getByTestId('async-list'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('async-count').textContent),
      ).toBeGreaterThan(4)
    })
    await expectCodeDisclosure(canvas, asyncLoadingSnippet)
  },
}

export const EndOfData: Story = {
  name: 'End of data',
  render: () => <EndOfDataExample />,
  parameters: { docs: { source: { code: endOfDataSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByTestId('end-list')

    await waitFor(
      async () => {
        if (canvas.getByTestId('end-complete').textContent === 'true') {
          return
        }
        scrollNearBottom(list)
        expect(canvas.getByTestId('end-complete')).toHaveTextContent('true')
      },
      { timeout: 5000 },
    )

    await expectCodeDisclosure(canvas, endOfDataSnippet)
  },
}

export const ShortContainer: Story = {
  name: 'Short container',
  render: () => <ShortContainerExample />,
  parameters: { docs: { source: { code: shortContainerSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('short-count').textContent),
      ).toBeGreaterThan(2)
    })
    await expectCodeDisclosure(canvas, shortContainerSnippet)
  },
}

export const ErrorAndRetry: Story = {
  name: 'Error and retry',
  render: () => <ErrorRetryExample />,
  parameters: { docs: { source: { code: errorRetrySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    scrollNearBottom(canvas.getByTestId('error-list'))
    await waitFor(() => {
      expect(canvas.getByTestId('error-alert')).toBeVisible()
    })
    await userEvent.click(canvas.getByTestId('error-retry'))
    await waitFor(() => {
      expect(canvas.queryByTestId('error-alert')).toBeNull()
    })
    await expectCodeDisclosure(canvas, errorRetrySnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await expect(canvas.getByTestId('enabled-value')).toHaveTextContent('false')
    const before = Number(canvas.getByTestId('enabled-count').textContent)
    scrollNearBottom(canvas.getByTestId('enabled-list'))
    await waitFor(() => undefined)
    expect(Number(canvas.getByTestId('enabled-count').textContent)).toBe(before)
    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  render: () => <DynamicTargetExample />,
  parameters: { docs: { source: { code: dynamicTargetSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    scrollNearBottom(canvas.getByTestId('dynamic-first-list'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('dynamic-first').textContent),
      ).toBeGreaterThan(4)
    })
    const firstAfter = Number(canvas.getByTestId('dynamic-first').textContent)
    await userEvent.click(canvas.getByTestId('track-second'))
    scrollNearBottom(canvas.getByTestId('dynamic-first-list'))
    await waitFor(() => undefined)
    expect(Number(canvas.getByTestId('dynamic-first').textContent)).toBe(
      firstAfter,
    )
    await expectCodeDisclosure(canvas, dynamicTargetSnippet)
  },
}

export const WindowScrolling: Story = {
  name: 'Window scrolling',
  render: () => <WindowScrollingExample />,
  parameters: { docs: { source: { code: windowScrollingSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => {
      expect(canvas.getByTestId('window-ready')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, windowScrollingSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  args: { enabled: true, direction: 'bottom', distance: 10 },
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('pg-mount-toggle'))
    scrollNearBottom(canvas.getByTestId('pg-list'))
    await waitFor(() => {
      expect(
        Number(canvas.getByTestId('pg-count').textContent),
      ).toBeGreaterThan(6)
    })
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
