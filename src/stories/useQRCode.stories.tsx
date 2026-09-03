import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { SAMPLE_GENERATOR_TEXT } from './components/useQRCode.fictional'
import {
  CalendarEventExample,
  ContactCardExample,
  CustomColorsExample,
  EmailCompositionExample,
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
  SmsPayloadExample,
  WebsiteUrlExample,
  WifiSetupExample,
  WidthScaleExample,
} from './components/UseQRCodeExamples'
import {
  calendarEventSnippet,
  contactCardSnippet,
  customColorsSnippet,
  emailCompositionSnippet,
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
  smsPayloadSnippet,
  websiteUrlSnippet,
  wifiSetupSnippet,
  widthScaleSnippet,
} from './components/useQRCode.snippets'

const meta = {
  title: 'Hooks/useQRCode',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Generate QR code image data URLs from text using the \`qrcode\` encoder.

\`\`\`ts
import { useQRCode } from '@muradyanvano/react-hooks'

useQRCode(text, options?): { dataUrl, isLoading, error, generate }
\`\`\`

**Defaults:** \`enabled: true\`, \`errorCorrectionLevel: 'M'\`, \`margin: 4\`

**Scanning a QR code does not validate or trust its content.**

Each example includes Show code / Hide code and Copy code. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
        `,
      },
    },
    a11y: {
      test: 'error',
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

async function waitForQrImage(
  canvas: ReturnType<typeof within>,
  testId: string,
) {
  await waitFor(
    () => {
      const img = canvas.getByTestId(testId)
      expect(img.getAttribute('src') ?? '').toMatch(/^data:image\//)
    },
    { timeout: 5000 },
  )
}

export const QrCodeGenerator: Story = {
  name: 'QR code generator',
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

export const WebsiteUrl: Story = {
  name: 'Website URL',
  render: () => <WebsiteUrlExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'url-qr')
    await expect(canvas.getByTestId('url-encoded')).toHaveTextContent(
      'https://example.com',
    )
    await expectCodeDisclosure(canvas, websiteUrlSnippet)
  },
}

export const PlainTextAndUnicode: Story = {
  name: 'Plain text and Unicode',
  render: () => <PlainTextUnicodeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'plain-qr')
    await waitForQrImage(canvas, 'unicode-qr')
    await expect(canvas.getByTestId('unicode-text')).toHaveTextContent('🙂')
    await expectCodeDisclosure(canvas, plainTextUnicodeSnippet)
  },
}

export const WifiSetup: Story = {
  name: 'Wi-Fi setup payload',
  render: () => <WifiSetupExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'wifi-qr')
    await expect(canvas.getByTestId('wifi-encoded')).toHaveTextContent(
      'WIFI:T:WPA',
    )
    await expectCodeDisclosure(canvas, wifiSetupSnippet)
  },
}

export const ContactCard: Story = {
  name: 'Contact card payload',
  render: () => <ContactCardExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'contact-qr')
    await expect(canvas.getByTestId('contact-encoded')).toHaveTextContent(
      'BEGIN:VCARD',
    )
    await expectCodeDisclosure(canvas, contactCardSnippet)
  },
}

export const EmailComposition: Story = {
  name: 'Email composition payload',
  render: () => <EmailCompositionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'email-qr')
    await expect(canvas.getByTestId('email-encoded')).toHaveTextContent(
      'mailto:',
    )
    await expectCodeDisclosure(canvas, emailCompositionSnippet)
  },
}

export const SmsPayload: Story = {
  name: 'SMS payload',
  render: () => <SmsPayloadExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'sms-qr')
    await expect(canvas.getByTestId('sms-encoded')).toHaveTextContent('smsto:')
    await expectCodeDisclosure(canvas, smsPayloadSnippet)
  },
}

export const CalendarEvent: Story = {
  name: 'Calendar/event payload',
  render: () => <CalendarEventExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitForQrImage(canvas, 'event-qr')
    await expect(canvas.getByTestId('event-encoded')).toHaveTextContent(
      'BEGIN:VEVENT',
    )
    await expectCodeDisclosure(canvas, calendarEventSnippet)
  },
}

export const ErrorCorrectionComparison: Story = {
  name: 'Error-correction comparison',
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
