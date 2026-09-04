import type { Meta, StoryObj } from '@storybook/react-vite'
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
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Wraps the native Fullscreen API for imperative, user-gesture-driven presentation.

\`\`\`ts
import { useFullscreen } from '@muradyanvano/react-hooks'

useFullscreen(ref?, options?): UseFullscreenReturn
\`\`\`

**Defaults:** \`enabled: true\`, \`autoExit: false\`, \`navigationUI: 'auto'\`

Call \`enter()\` / \`toggle()\` directly from a click handler — never from an effect — so transient user activation is preserved. Document events are the source of truth. \`exit()\` only exits when this hook’s target is the active fullscreen element. The hook does not provide focus trapping, Escape interception, orientation lock, or wake lock.

**Interactive demos** use the real browser Fullscreen API so Enter/Exit work when you click them. Automated play tests install a temporary Storybook-only mock (try/finally) so CI never takes over the display. Scenario stories that simulate another element / external entry keep a persistent mock. The **Live native fullscreen** play test never clicks Enter.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
  },
  argTypes: {
    enabled: { control: 'boolean' },
    navigationUI: {
      control: 'select',
      options: ['auto', 'show', 'hide'],
    },
    autoExit: { control: 'boolean' },
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

export const FullscreenMediaViewer: Story = {
  name: 'Fullscreen media viewer',
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
