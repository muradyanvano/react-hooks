import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { SAMPLE_GENERATOR_TEXT } from './components/useQRCode.fictional'
import {
  CustomColorsExample,
  EnabledStateExample,
  ErrorCorrectionExample,
  ImageFormatExample,
  InvalidConfigExample,
  ManualGenerationExample,
  MarginComparisonExample,
  PlainTextUnicodeExample,
  PlaygroundExample,
  QrCodeGeneratorExample,
  RapidInputExample,
  WidthScaleExample,
} from './components/UseQRCodeExamples'
import {
  customColorsSnippet,
  enabledStateSnippet,
  errorCorrectionSnippet,
  imageFormatSnippet,
  invalidConfigSnippet,
  manualGenerationSnippet,
  marginComparisonSnippet,
  plainTextUnicodeSnippet,
  playgroundSnippet,
  qrCodeGeneratorSnippet,
  rapidInputSnippet,
  widthScaleSnippet,
} from './components/useQRCode.snippets'

const meta = {
  title: 'Hooks/useQRCode',
  tags: ['autodocs'],
  ...createHookStoryMeta('useQRCode', PlaygroundExample),
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

async function waitForQrImage(
  canvas: ReturnType<typeof within>,
  testId: string,
) {
  await waitFor(
    () => {
      const img = canvas.getByTestId(testId)
      expect(img.getAttribute('src') ?? '').toMatch(/^data:image\//)
    },
    { timeout: 15_000 },
  )
}

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Generate scannable QR images from editable text with loading and error states. Change the payload and confirm the square preview updates; scanning does not imply trust. Downloads stay attribute-only in automated plays.',
  ),
  render: () => <QrCodeGeneratorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('trust-banner')).toHaveTextContent(
      /does not make content trusted/i,
    )

    const download = canvas.getByTestId('generator-download')
    await expect(download).toHaveAttribute('download', 'qr-code.png')

    await waitForQrImage(canvas, 'generator-qr')
    const initialSrc = canvas.getByTestId('generator-qr').getAttribute('src')
    expect(initialSrc?.startsWith('data:image/')).toBe(true)

    const input = canvas.getByTestId('generator-text-input')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated QR payload')
    await waitForQrImage(canvas, 'generator-qr')
    const updatedSrc = canvas.getByTestId('generator-qr').getAttribute('src')
    expect(updatedSrc).not.toBe(initialSrc)

    await userEvent.clear(input)
    await waitFor(() =>
      expect(canvas.getByTestId('generator-empty')).toHaveTextContent(
        /enter text/i,
      ),
    )

    await userEvent.click(canvas.getByTestId('generator-reset'))
    await waitFor(() =>
      expect(canvas.getByTestId('generator-text-input')).toHaveValue(
        SAMPLE_GENERATOR_TEXT,
      ),
    )
    await waitForQrImage(canvas, 'generator-qr')

    await userEvent.click(canvas.getByTestId('generator-simulate-error'))
    await waitFor(() =>
      expect(canvas.getByTestId('generator-error')).toBeVisible(),
    )
    await userEvent.click(canvas.getByTestId('generator-reset'))
    await waitForQrImage(canvas, 'generator-qr')

    await expectCodeDisclosure(canvas, qrCodeGeneratorSnippet)
  },
}

export const PlainTextAndUnicode: Story = {
  name: 'Plain text and Unicode',
  ...storyDescription(
    'Plain text and Unicode with useQRCode: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <PlainTextUnicodeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'plain-qr')
    await waitForQrImage(canvas, 'unicode-qr')
    await expect(canvas.getByTestId('unicode-text')).toHaveTextContent('🙂')
    await expectCodeDisclosure(canvas, plainTextUnicodeSnippet)
  },
}

export const ErrorCorrectionComparison: Story = {
  name: 'Error-correction comparison',
  ...storyDescription(
    'Error-correction comparison — trigger the failure path for useQRCode and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <ErrorCorrectionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'ec-qr-low')
    await waitForQrImage(canvas, 'ec-qr-medium')
    await waitForQrImage(canvas, 'ec-qr-high')
    await expect(canvas.getByTestId('ec-label-high')).toHaveTextContent('H')
    await expectCodeDisclosure(canvas, errorCorrectionSnippet)
  },
}

export const WidthAndScale: Story = {
  name: 'Width and scale',
  ...storyDescription(
    'Width and scale with useQRCode: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <WidthScaleExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'width-qr')
    await waitForQrImage(canvas, 'scale-qr')
    await expect(canvas.getByTestId('width-label')).toHaveTextContent('320')
    await expectCodeDisclosure(canvas, widthScaleSnippet)
  },
}

export const MarginComparison: Story = {
  name: 'Margin / quiet-zone comparison',
  ...storyDescription(
    'Margin / quiet-zone comparison: compare both configurations side by side and note how useQRCode options change observable behavior. Interact with each variant, then confirm Show code documents the option you intend to ship.',
  ),
  render: () => <MarginComparisonExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'margin-tight-qr')
    await waitForQrImage(canvas, 'margin-default-qr')
    await expect(canvas.getByTestId('margin-tight-label')).toHaveTextContent(
      /not recommended/i,
    )
    await expectCodeDisclosure(canvas, marginComparisonSnippet)
  },
}

export const CustomColors: Story = {
  name: 'Custom colors with high contrast',
  ...storyDescription(
    'Custom colors with high contrast: bind useQRCode to a custom target or browsing context and confirm events stay scoped there — not the Storybook manager. Drive the demo controls, watch status, and keep fixtures cleaned up after interaction.',
  ),
  render: () => <CustomColorsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'colors-qr')
    await expect(canvas.getByTestId('colors-ready')).toHaveTextContent(/ready/i)
    await expectCodeDisclosure(canvas, customColorsSnippet)
  },
}

export const ImageFormatComparison: Story = {
  name: 'Image format comparison',
  ...storyDescription(
    'Image format comparison: compare both configurations side by side and note how useQRCode options change observable behavior. Interact with each variant, then confirm Show code documents the option you intend to ship.',
  ),
  render: () => <ImageFormatExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'format-qr-png')
    await waitForQrImage(canvas, 'format-qr-jpeg')
    await waitForQrImage(canvas, 'format-qr-webp')
    await expect(canvas.getByTestId('format-prefix-png')).toHaveTextContent(
      'data:image/png',
    )
    await expectCodeDisclosure(canvas, imageFormatSnippet)
  },
}

export const ManualGeneration: Story = {
  name: 'Manual generation',
  ...storyDescription(
    'Manual generation with useQRCode: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <ManualGenerationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('manual-qr-empty')).toBeVisible()
    await userEvent.click(canvas.getByTestId('manual-generate'))
    await waitForQrImage(canvas, 'manual-qr')
    await expect(canvas.getByTestId('manual-auto')).toHaveTextContent(
      'disabled',
    )
    await expectCodeDisclosure(canvas, manualGenerationSnippet)
  },
}

export const EnabledState: Story = {
  name: 'Enabled state',
  ...storyDescription(
    'Toggle enabled for useQRCode and confirm listeners or work stop without leaking when off, then resume cleanly when on. Use the canvas controls and status readouts to verify the lifecycle. Show code should match the gated subscription pattern.',
  ),
  render: () => <EnabledStateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'enabled-qr')
    await expect(canvas.getByTestId('enabled-has-url')).toHaveTextContent(
      'true',
    )

    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitFor(() =>
      expect(canvas.getByTestId('enabled-disabled-message')).toBeVisible(),
    )
    await expect(canvas.getByTestId('enabled-has-url')).toHaveTextContent(
      'false',
    )

    await userEvent.click(canvas.getByTestId('enabled-toggle'))
    await waitForQrImage(canvas, 'enabled-qr')
    await expectCodeDisclosure(canvas, enabledStateSnippet)
  },
}

export const InvalidConfiguration: Story = {
  name: 'Invalid configuration / error recovery',
  ...storyDescription(
    'Invalid configuration / error recovery — trigger the failure path for useQRCode and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <InvalidConfigExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('invalid-error')).toBeVisible()
    await userEvent.click(canvas.getByTestId('invalid-fix'))
    await waitFor(() =>
      expect(canvas.getByTestId('invalid-recovered')).toBeVisible(),
    )
    await waitForQrImage(canvas, 'invalid-qr')
    await expectCodeDisclosure(canvas, invalidConfigSnippet)
  },
}

export const RapidInputChanges: Story = {
  name: 'Rapid input changes',
  ...storyDescription(
    'Rapid input changes with useQRCode: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
  render: () => <RapidInputExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'rapid-qr')

    await userEvent.click(canvas.getByTestId('rapid-beta'))
    await waitFor(() =>
      expect(canvas.getByTestId('rapid-latest')).toHaveTextContent('beta'),
    )
    await waitForQrImage(canvas, 'rapid-qr')

    await userEvent.click(canvas.getByTestId('rapid-gamma'))
    await waitFor(() =>
      expect(canvas.getByTestId('rapid-latest')).toHaveTextContent(
        'gamma-final',
      ),
    )
    await waitForQrImage(canvas, 'rapid-qr')

    await expectCodeDisclosure(canvas, rapidInputSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  ...storyDescription(
    'useQRCode Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
  render: (args) => <PlaygroundExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('playground-mount'))
    await waitFor(() => canvas.getByTestId('playground-text'))

    await userEvent.clear(canvas.getByTestId('playground-text'))
    await userEvent.type(
      canvas.getByTestId('playground-text'),
      'Mounted sample',
    )
    await waitForQrImage(canvas, 'playground-qr')

    await userEvent.selectOptions(
      canvas.getByTestId('playground-correction'),
      'H',
    )
    await waitForQrImage(canvas, 'playground-qr')

    await expect(canvas.getByTestId('playground-summary')).toHaveTextContent(
      '"errorCorrectionLevel": "H"',
    )
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
