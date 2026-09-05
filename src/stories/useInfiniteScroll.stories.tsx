import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
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
  tags: ['autodocs'],
  ...createHookStoryMeta('useInfiniteScroll', PlaygroundExample),
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
  await expect(await waitForDisclosedCode(canvas)).toBeVisible()

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

function nudgeScrollForLoad(element: HTMLElement): void {
  element.scrollTop = 0
  element.dispatchEvent(new Event('scroll'))
  scrollNearBottom(element)
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Feed-style lists that load the next page near the bottom. Scroll the contained list until more items appear, then Reset to the initial six. Stop loading with canLoadMore; Docs playgrounds stay mount-gated so they do not auto-fetch.',
  ),

  render: () => <InfiniteListExample />,
  parameters: { docs: { source: { code: infiniteListSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByTestId('infinite-list')

    await expect(canvas.getByTestId('list-count')).toHaveTextContent('6')

    await waitFor(
      () => {
        nudgeScrollForLoad(list)
        expect(
          Number(canvas.getByTestId('list-count').textContent),
        ).toBeGreaterThan(6)
      },
      { timeout: 6000 },
    )

    await waitFor(
      () => {
        nudgeScrollForLoad(list)
        expect(canvas.getByTestId('list-status')).toHaveTextContent(
          'All items loaded',
        )
      },
      { timeout: 15_000 },
    )

    await userEvent.click(canvas.getByTestId('list-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('list-count')).toHaveTextContent('6')
    })

    await waitFor(
      () => {
        nudgeScrollForLoad(list)
        expect(
          Number(canvas.getByTestId('list-count').textContent),
        ).toBeGreaterThan(6)
      },
      { timeout: 6000 },
    )

    await expectCodeDisclosure(canvas, infiniteListSnippet)
  },
}

export const BottomDirection: Story = {
  name: 'Bottom direction',
  ...storyDescription(
    'Bottom direction example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Top direction example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Horizontal directions example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Async loading example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'End of data example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

  render: () => <EndOfDataExample />,
  parameters: { docs: { source: { code: endOfDataSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const list = canvas.getByTestId('end-list')

    await waitFor(
      async () => {
        nudgeScrollForLoad(list)
        await new Promise((resolve) => {
          window.setTimeout(resolve, 75)
        })
        expect(canvas.getByTestId('end-status')).toHaveTextContent(
          'All items loaded',
        )
      },
      { timeout: 15000 },
    )

    await expect(canvas.getByTestId('end-complete')).toHaveTextContent('true')

    await expectCodeDisclosure(canvas, endOfDataSnippet)
  },
}

export const ShortContainer: Story = {
  name: 'Short container',
  ...storyDescription(
    'Short container example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Error and retry example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Enabled state example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Dynamic target example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Window scrolling example for useInfiniteScroll. Try the interactive controls shown in the canvas and observe the status panel, counters, or event log for resulting hook behavior.',
  ),

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
  ...storyDescription(
    'Configurable useInfiniteScroll playground. Use Controls when wired to hook options, try edge interactions, and compare runtime behavior with the code panel.',
  ),

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
