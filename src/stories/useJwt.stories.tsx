import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AlgorithmWarningExample,
  AudienceIssuerExample,
  DynamicTokenExample,
  ErrorCallbackExample,
  ExpirationClaimExample,
  FallbackValueExample,
  HeaderAndPayloadExample,
  InvalidBase64Example,
  InvalidJsonExample,
  InvalidStructureExample,
  JwtInspectorExample,
  NotBeforeIssuedAtExample,
  PlaygroundExample,
  SsrSafeDecodingExample,
  TokenEditorExample,
  TypedClaimsExample,
  UnicodeClaimsExample,
} from './components/UseJwtExamples'
import {
  algorithmWarningSnippet,
  audienceIssuerSnippet,
  dynamicTokenSnippet,
  errorCallbackSnippet,
  expirationClaimSnippet,
  fallbackValueSnippet,
  headerAndPayloadSnippet,
  invalidBase64Snippet,
  invalidJsonSnippet,
  invalidStructureSnippet,
  jwtInspectorSnippet,
  notBeforeIssuedAtSnippet,
  playgroundSnippet,
  ssrSafeDecodingSnippet,
  tokenEditorSnippet,
  typedClaimsSnippet,
  unicodeClaimsSnippet,
} from './components/useJwt.snippets'

const meta = {
  title: 'Hooks/useJwt',
  component: PlaygroundExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Decode compact JWS-style JWT header and payload contents synchronously.

**Decoding a JWT does not verify its signature or prove that its claims are trustworthy.**

\`\`\`ts
import { useJwt } from '@muradyanvano/react-hooks'

useJwt(encodedJwt, options?): { header, payload, errors }
\`\`\`

**Defaults:** \`{ fallbackValue: null }\` with a no-op \`onError\`.

Use only synthetic demonstration tokens in these examples. Never paste production tokens into Storybook, screenshots, logs, or public issues.

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

export const JwtInspector: Story = {
  name: 'JWT inspector',
  render: () => <JwtInspectorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('security-banner')).toHaveTextContent(
      /signature not verified/i,
    )
    await expect(canvas.getByTestId('inspector-header-json')).toHaveTextContent(
      'HS256',
    )
    await expect(
      canvas.getByTestId('inspector-payload-json'),
    ).toHaveTextContent('Demo User')
    await expect(canvas.getByTestId('inspector-status')).toHaveTextContent(
      'Structurally decodable',
    )

    const input = canvas.getByTestId('inspector-token-input')
    await userEvent.clear(input)
    await userEvent.type(input, 'bad-token')
    await waitFor(() =>
      expect(canvas.getByTestId('inspector-status')).toHaveTextContent(
        'Decode error',
      ),
    )

    await userEvent.click(canvas.getByTestId('inspector-reset'))
    await waitFor(() =>
      expect(canvas.getByTestId('inspector-status')).toHaveTextContent(
        'Structurally decodable',
      ),
    )

    await expectCodeDisclosure(canvas, jwtInspectorSnippet)
  },
}

export const HeaderAndPayload: Story = {
  name: 'Header and payload',
  render: () => <HeaderAndPayloadExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('hp-header')).toHaveTextContent('HS256')
    await expect(canvas.getByTestId('hp-payload')).toHaveTextContent(
      '1234567890',
    )
    await expectCodeDisclosure(canvas, headerAndPayloadSnippet)
  },
}

export const TypedClaims: Story = {
  name: 'Typed claims',
  render: () => <TypedClaimsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('typed-kid')).toHaveTextContent('demo-key')
    await expect(canvas.getByTestId('typed-role')).toHaveTextContent('admin')
    await expect(canvas.getByTestId('typed-permissions')).toHaveTextContent(
      'read, write',
    )
    await expectCodeDisclosure(canvas, typedClaimsSnippet)
  },
}

export const UnicodeClaims: Story = {
  name: 'Unicode claims',
  render: () => <UnicodeClaimsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('unicode-name')).toHaveTextContent(
      'Վանո Մուրադյան',
    )
    await expect(canvas.getByTestId('unicode-note')).toHaveTextContent('🙂')
    await expectCodeDisclosure(canvas, unicodeClaimsSnippet)
  },
}

export const TokenEditor: Story = {
  name: 'Token editor',
  render: () => <TokenEditorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('editor-result')).toHaveTextContent(
      'Demo User',
    )
    const payloadInput = canvas.getByTestId('editor-payload')
    await userEvent.clear(payloadInput)
    await userEvent.type(payloadInput, '@@@')
    await waitFor(() =>
      expect(canvas.getByTestId('editor-result')).toHaveTextContent('payload'),
    )
    await expectCodeDisclosure(canvas, tokenEditorSnippet)
  },
}

export const FallbackValue: Story = {
  name: 'Fallback value',
  render: () => <FallbackValueExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('fallback-errors')).toHaveTextContent(
      'header',
    )
    await expect(canvas.getByTestId('fallback-payload')).toHaveTextContent(
      'payload-ok',
    )
    await userEvent.click(canvas.getByTestId('fallback-bad-payload'))
    await waitFor(() =>
      expect(canvas.getByTestId('fallback-errors')).toHaveTextContent(
        'payload',
      ),
    )
    await expectCodeDisclosure(canvas, fallbackValueSnippet)
  },
}

export const InvalidStructure: Story = {
  name: 'Invalid structure',
  render: () => <InvalidStructureExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('structure-errors')).toHaveTextContent(
      'token',
    )
    await userEvent.click(canvas.getByTestId('structure-five-parts'))
    await waitFor(() =>
      expect(canvas.getByTestId('structure-errors')).toHaveTextContent(
        'three segments',
      ),
    )
    await expectCodeDisclosure(canvas, invalidStructureSnippet)
  },
}

export const InvalidBase64URL: Story = {
  name: 'Invalid Base64URL',
  render: () => <InvalidBase64Example />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('base64-error')).toHaveTextContent(
      /invalid|Base64URL|character/i,
    )
    await expectCodeDisclosure(canvas, invalidBase64Snippet)
  },
}

export const InvalidJSON: Story = {
  name: 'Invalid JSON',
  render: () => <InvalidJsonExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('json-errors')).toHaveTextContent('header')
    await expectCodeDisclosure(canvas, invalidJsonSnippet)
  },
}

export const ExpirationClaim: Story = {
  name: 'Expiration claim',
  render: () => <ExpirationClaimExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('exp-seconds')).toHaveTextContent(
      '1700004200',
    )
    await expect(canvas.getByTestId('exp-display')).toHaveTextContent('T')
    await expect(canvas.getByTestId('exp-relative')).toHaveTextContent(
      /display only/i,
    )
    await expectCodeDisclosure(canvas, expirationClaimSnippet)
  },
}

export const NotBeforeAndIssuedAt: Story = {
  name: 'Not-before and issued-at',
  render: () => <NotBeforeIssuedAtExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('timeline-iat')).toHaveTextContent('T')
    await expect(canvas.getByTestId('timeline-nbf')).toHaveTextContent('T')
    await expect(canvas.getByTestId('timeline-exp')).toHaveTextContent('T')
    await expectCodeDisclosure(canvas, notBeforeIssuedAtSnippet)
  },
}

export const AudienceAndIssuer: Story = {
  name: 'Audience and issuer',
  render: () => <AudienceIssuerExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('aud-iss')).toHaveTextContent(
      'issuer.example.synthetic',
    )
    await expect(canvas.getByTestId('aud-aud')).toHaveTextContent('api://demo')
    await expectCodeDisclosure(canvas, audienceIssuerSnippet)
  },
}

export const AlgorithmWarning: Story = {
  name: 'Algorithm warning',
  render: () => <AlgorithmWarningExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('alg-value')).toHaveTextContent('none')
    await userEvent.click(canvas.getByTestId('alg-hs256'))
    await waitFor(() =>
      expect(canvas.getByTestId('alg-value')).toHaveTextContent('HS256'),
    )
    await expectCodeDisclosure(canvas, algorithmWarningSnippet)
  },
}

export const DynamicToken: Story = {
  name: 'Dynamic token',
  render: () => <DynamicTokenExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('dynamic-name')).toHaveTextContent(
      'Alice Demo',
    )
    await userEvent.click(canvas.getByTestId('account-bob'))
    await waitFor(() =>
      expect(canvas.getByTestId('dynamic-name')).toHaveTextContent('Bob Demo'),
    )
    await expectCodeDisclosure(canvas, dynamicTokenSnippet)
  },
}

export const ErrorCallback: Story = {
  name: 'Error callback',
  render: () => <ErrorCallbackExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() =>
      expect(
        canvas.getByTestId('callback-timeline').querySelectorAll('li').length,
      ).toBe(1),
    )

    await userEvent.click(canvas.getByTestId('callback-invalid'))
    await waitFor(() =>
      expect(
        canvas.getByTestId('callback-timeline').querySelectorAll('li').length,
      ).toBe(2),
    )

    const afterSecondInvalid = canvas
      .getByTestId('callback-timeline')
      .querySelectorAll('li').length
    await userEvent.click(canvas.getByTestId('callback-rerender'))
    await expect(
      canvas.getByTestId('callback-timeline').querySelectorAll('li').length,
    ).toBe(afterSecondInvalid)

    await userEvent.click(canvas.getByTestId('callback-valid'))
    await waitFor(() =>
      expect(canvas.getByTestId('callback-errors-length')).toHaveTextContent(
        'errors.length: 0',
      ),
    )

    await userEvent.click(canvas.getByTestId('callback-invalid-again'))
    await waitFor(() =>
      expect(
        canvas.getByTestId('callback-timeline').querySelectorAll('li').length,
      ).toBe(3),
    )
    await expectCodeDisclosure(canvas, errorCallbackSnippet)
  },
}

export const SsrSafeDecoding: Story = {
  name: 'SSR-safe decoding',
  render: () => <SsrSafeDecodingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('ssr-alg')).toHaveTextContent('HS256')
    await expect(canvas.getByTestId('ssr-sub')).toHaveTextContent('1234567890')
    await expect(canvas.getByTestId('ssr-errors')).toHaveTextContent('0')
    await expectCodeDisclosure(canvas, ssrSafeDecodingSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: (args) => <PlaygroundExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('playground-mount'))
    await waitFor(() => canvas.getByTestId('playground-token'))
    await userEvent.click(canvas.getByTestId('playground-invalid'))
    await waitFor(() =>
      expect(canvas.getByTestId('playground-result')).toHaveTextContent(
        'token',
      ),
    )
    await userEvent.click(canvas.getByTestId('playground-valid'))
    await waitFor(() =>
      expect(canvas.getByTestId('playground-result')).toHaveTextContent(
        'Demo User',
      ),
    )
    await expectCodeDisclosure(canvas, playgroundSnippet)
  },
}
