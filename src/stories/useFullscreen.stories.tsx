import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AnotherElementExample,
  AutoExitExample,
  DynamicTargetExample,
  EnabledStateExample,
  EntireDocumentExample,
  EscapeExitExample,
  ExternalEntryExample,
  GalleryExample,
  IframeDocumentExample,
  LiveNativeExample,
  MediaViewerExample,
  NavigationUiExample,
  PlaygroundExample,
  PresentationExample,
  SpecificElementExample,
  SvgExample,
  UnsupportedExample,
  VideoPlayerExample,
} from './components/UseFullscreenExamples'
import {
  installFullscreenMock,
  type FullscreenMockHandle,
} from './components/fullscreenMock'
import * as snippets from './components/useFullscreen.snippets'

const meta = {
  title: 'Hooks/useFullscreen',
  tags: ['autodocs'],
  ...createHookStoryMeta('useFullscreen', PlaygroundExample, {
    argTypes: {
      enabled: { control: 'boolean' },
      navigationUI: {
        control: 'select',
        options: ['auto', 'show', 'hide'],
      },
      autoExit: { control: 'boolean' },
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
  const originalClipboard = navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  try {
    await userEvent.click(canvas.getByTestId('copy-code'))
    await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  } finally {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  }

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

/** Temporary mock for play tests so they never invoke the real Fullscreen API. */
async function withPlayMock(
  run: (mock: FullscreenMockHandle) => Promise<void>,
) {
  const mock = installFullscreenMock(document, { mode: 'success' })
  try {
    await run(mock)
  } finally {
    mock.uninstall()
  }
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Media-stage fullscreen enter/exit with Escape guidance. Enter via the mock in automated plays, exit cleanly, and avoid leaking fullscreen state. Live native fullscreen is manual-only.',
  ),
  render: () => <MediaViewerExample />,
  parameters: { docs: { source: { code: snippets.mediaViewerSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await expect(canvas.getByTestId('media-fullscreen')).toHaveTextContent(
        'false',
      )
      await userEvent.click(canvas.getByTestId('media-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('media-fullscreen')).toHaveTextContent(
          'true',
        ),
      )
      await expect(canvas.getByTestId('media-target')).toHaveTextContent(
        'stage',
      )
      await userEvent.click(canvas.getByTestId('media-exit'))
      await waitFor(() =>
        expect(canvas.getByTestId('media-fullscreen')).toHaveTextContent(
          'false',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.mediaViewerSnippet)
    })
  },
}

export const LiveNativeFullscreen: Story = {
  name: 'Live native fullscreen',
  ...storyDescription(
    'useFullscreen Live native fullscreen: automated tests inspect idle UI only and never trigger real camera, microphone, screen-share, EyeDropper, fullscreen, or network prompts.',
  ),
  render: () => <LiveNativeExample />,
  parameters: { docs: { source: { code: snippets.liveNativeSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const enter = canvas.getByTestId('live-enter')
    // Never click Enter fullscreen — it would invoke the real API.
    await expect(enter).toHaveTextContent('Enter fullscreen')
    await expect(canvas.getByTestId('live-fullscreen')).toHaveTextContent(
      'false',
    )
    await expect(canvas.getByTestId('live-help')).toBeVisible()
    await expectCodeDisclosure(canvas, snippets.liveNativeSnippet)
  },
}

export const EntireDocument: Story = {
  name: 'Entire document',
  ...storyDescription(
    'Entire document: bind useFullscreen to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <EntireDocumentExample />,
  parameters: { docs: { source: { code: snippets.entireDocumentSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('doc-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('doc-status')).toHaveTextContent(
          'Document fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('doc-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('doc-status')).toHaveTextContent(
          'Inline document',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.entireDocumentSnippet)
    })
  },
}

export const SpecificElement: Story = {
  name: 'Specific element',
  ...storyDescription(
    'Specific element with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <SpecificElementExample />,
  parameters: { docs: { source: { code: snippets.specificElementSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('card-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('card-status')).toHaveTextContent(
          'Card fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('card-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('card-status')).toHaveTextContent(
          'Card inline',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.specificElementSnippet)
    })
  },
}

export const VideoPlayerLayout: Story = {
  name: 'Video player layout',
  ...storyDescription(
    'Video player layout with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <VideoPlayerExample />,
  parameters: { docs: { source: { code: snippets.videoPlayerSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('video-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('video-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('video-exit'))
      await waitFor(() =>
        expect(canvas.getByTestId('video-status')).toHaveTextContent('Inline'),
      )
      await expectCodeDisclosure(canvas, snippets.videoPlayerSnippet)
    })
  },
}

export const PresentationSlides: Story = {
  name: 'Presentation slides',
  ...storyDescription(
    'Presentation slides with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <PresentationExample />,
  parameters: { docs: { source: { code: snippets.presentationSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('slides-next'))
      await userEvent.click(canvas.getByTestId('slides-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('slides-status')).toHaveTextContent(
          'Presenting',
        ),
      )
      await userEvent.click(canvas.getByTestId('slides-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('slides-status')).toHaveTextContent(
          'Editing',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.presentationSnippet)
    })
  },
}

export const ImageGallery: Story = {
  name: 'Image gallery',
  ...storyDescription(
    'Image gallery with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <GalleryExample />,
  parameters: { docs: { source: { code: snippets.gallerySnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('gallery-next'))
      await userEvent.click(canvas.getByTestId('gallery-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('gallery-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('gallery-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('gallery-status')).toHaveTextContent(
          'Inline',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.gallerySnippet)
    })
  },
}

export const SvgVisualization: Story = {
  name: 'SVG visualization',
  ...storyDescription(
    'SVG visualization with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <SvgExample />,
  parameters: { docs: { source: { code: snippets.svgSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('svg-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('svg-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('svg-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('svg-status')).toHaveTextContent('Inline'),
      )
      await expectCodeDisclosure(canvas, snippets.svgSnippet)
    })
  },
}

export const NavigationUIOptions: Story = {
  name: 'Navigation UI options',
  ...storyDescription(
    'Navigation UI options with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <NavigationUiExample />,
  parameters: { docs: { source: { code: snippets.navigationUiSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.selectOptions(canvas.getByTestId('nav-select'), 'hide')
      await userEvent.click(canvas.getByTestId('nav-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('nav-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('nav-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('nav-status')).toHaveTextContent('Inline'),
      )
      await expectCodeDisclosure(canvas, snippets.navigationUiSnippet)
    })
  },
}

export const EscapeAndExternalExit: Story = {
  name: 'Escape and external exit',
  ...storyDescription(
    'Escape and external exit with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <EscapeExitExample />,
  parameters: { docs: { source: { code: snippets.escapeExitSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('escape-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('escape-status')).toHaveTextContent(
          'fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('escape-external'))
      await waitFor(() =>
        expect(canvas.getByTestId('escape-status')).toHaveTextContent('inline'),
      )
      await expectCodeDisclosure(canvas, snippets.escapeExitSnippet)
    })
  },
}

export const ExternalFullscreenEntry: Story = {
  name: 'External fullscreen entry',
  ...storyDescription(
    'External fullscreen entry with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ExternalEntryExample />,
  parameters: { docs: { source: { code: snippets.externalEntrySnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('external-simulate'))
    await waitFor(() =>
      expect(canvas.getByTestId('external-status')).toHaveTextContent('true'),
    )
    await expectCodeDisclosure(canvas, snippets.externalEntrySnippet)
  },
}

export const AnotherElementFullscreen: Story = {
  name: 'Another element fullscreen',
  ...storyDescription(
    'Another element fullscreen with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <AnotherElementExample />,
  parameters: { docs: { source: { code: snippets.anotherElementSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('another-simulate'))
    await waitFor(() =>
      expect(canvas.getByTestId('another-status')).toHaveTextContent('other'),
    )
    await userEvent.click(canvas.getByTestId('another-exit'))
    await expect(canvas.getByTestId('another-status')).toHaveTextContent(
      'other',
    )
    await expectCodeDisclosure(canvas, snippets.anotherElementSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useFullscreen and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  parameters: { docs: { source: { code: snippets.enabledStateSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('enabled-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('enabled-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('enabled-toggle'))
      await waitFor(() =>
        expect(canvas.getByTestId('enabled-status')).toHaveTextContent(
          'Inline',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.enabledStateSnippet)
    })
  },
}

export const AutoExit: Story = {
  name: 'Auto-exit',
  ...storyDescription(
    'Auto-exit with useFullscreen: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <AutoExitExample />,
  parameters: { docs: { source: { code: snippets.autoExitSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('autoexit-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('autoexit-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('autoexit-mount'))
      await waitFor(() =>
        expect(canvas.queryByTestId('autoexit-stage')).not.toBeInTheDocument(),
      )
      await expectCodeDisclosure(canvas, snippets.autoExitSnippet)
    })
  },
}

export const DynamicTarget: Story = {
  name: 'Dynamic target',
  ...storyDescription(
    'Dynamic target: bind useFullscreen to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <DynamicTargetExample />,
  parameters: { docs: { source: { code: snippets.dynamicTargetSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('dyn-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('dyn-status')).toHaveTextContent(
          'fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('dyn-switch'))
      await waitFor(() =>
        expect(canvas.getByTestId('dyn-status')).toHaveTextContent(
          'Watching B',
        ),
      )
      await expectCodeDisclosure(canvas, snippets.dynamicTargetSnippet)
    })
  },
}

export const CustomIframeDocument: Story = {
  name: 'Custom iframe document',
  ...storyDescription(
    'Custom iframe document: bind useFullscreen to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <IframeDocumentExample />,
  parameters: { docs: { source: { code: snippets.iframeDocumentSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('iframe-frame')).toBeVisible()
    await waitFor(() =>
      expect(canvas.getByTestId('iframe-enter')).toBeEnabled(),
    )
    const frame = canvas.getByTestId('iframe-frame') as HTMLIFrameElement
    const iframeDoc = frame.contentDocument
    if (iframeDoc == null) {
      throw new Error('iframe document missing')
    }
    const mock = installFullscreenMock(iframeDoc, { mode: 'success' })
    try {
      await userEvent.click(canvas.getByTestId('iframe-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('iframe-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('iframe-exit'))
      await waitFor(() =>
        expect(canvas.getByTestId('iframe-status')).toHaveTextContent('Inline'),
      )
      await expectCodeDisclosure(canvas, snippets.iframeDocumentSnippet)
    } finally {
      mock.uninstall()
    }
  },
}

export const UnsupportedBrowser: Story = {
  name: 'Unsupported browser',
  ...storyDescription(
    'Unsupported browser — trigger the failure path for useFullscreen and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <UnsupportedExample />,
  parameters: { docs: { source: { code: snippets.unsupportedSnippet } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('unsupported-status')).toHaveTextContent(
      'false',
    )
    await expect(canvas.getByTestId('unsupported-enter')).toBeDisabled()
    await expectCodeDisclosure(canvas, snippets.unsupportedSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useFullscreen Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  args: {
    enabled: true,
    navigationUI: 'auto',
    autoExit: false,
  },
  render: (args) => <PlaygroundExample {...args} />,
  parameters: { docs: { source: { code: snippets.playgroundSnippet } } },
  play: async ({ canvasElement }) => {
    await withPlayMock(async () => {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByTestId('play-enter'))
      await waitFor(() =>
        expect(canvas.getByTestId('play-status')).toHaveTextContent(
          'Fullscreen',
        ),
      )
      await userEvent.click(canvas.getByTestId('play-exit'))
      await waitFor(() =>
        expect(canvas.getByTestId('play-status')).toHaveTextContent('Inline'),
      )
      await expectCodeDisclosure(canvas, snippets.playgroundSnippet)
    })
  },
}
