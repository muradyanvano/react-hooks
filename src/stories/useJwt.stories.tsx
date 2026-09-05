import type { Meta, StoryObj } from '@storybook/react-vite'

import { waitForDisclosedCode } from './components/expectCodeDisclosure'

import { createHookStoryMeta } from './docs/createHookStoryMeta'
import { storyDescription } from './docs/storyDescription'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  AlgorithmWarningExample,
  AudienceIssuerExample,
  DynamicTokenExample,
  ErrorCallbackExample,
  ExpirationClaimExample,
  FallbackValueExample,
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
  tags: ['autodocs'],
  ...createHookStoryMeta('useJwt', PlaygroundExample),
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

export const Overview: Story = {
  name: 'Overview',
  ...storyDescription(
    'Inspect synthetic JWTs into header, payload, and signature segments without verifying signatures. Paste/edit the demo token and read claims — the banner must stay Decoded only. Never treat decode success as authentication.',
  ),
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

export const TypedClaims: Story = {
  name: 'Typed claims',
  ...storyDescription(
    'Typed claims with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Unicode claims with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Token editor with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Fallback value with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Invalid structure — trigger the failure path for useJwt and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'Invalid Base64URL — trigger the failure path for useJwt and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'Invalid JSON — trigger the failure path for useJwt and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
  render: () => <InvalidJsonExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId('json-errors')).toHaveTextContent('header')
    await expectCodeDisclosure(canvas, invalidJsonSnippet)
  },
}

export const ExpirationClaim: Story = {
  name: 'Expiration claim',
  ...storyDescription(
    'Expiration claim with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Not-before and issued-at with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Audience and issuer with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Algorithm warning with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Dynamic token with useJwt: perform the named interaction and watch status reflect hook state (not mock chrome alone). Open Show code to copy the consumer snippet for this scenario, and leave timers, streams, and locks idle when finished.',
  ),
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
  ...storyDescription(
    'Error callback — trigger the failure path for useJwt and confirm the UI surfaces a recoverable error without crashing the story. Reset or retry when available, then check Show code for honest error handling.',
  ),
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
  ...storyDescription(
    'SSR-safe useJwt usage: confirm the demo stays idle without browser globals at import time and hydrates without duplicate subscriptions. Inspect status after mount and open Show code for the consumer-safe import pattern.',
  ),
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
  ...storyDescription(
    'useJwt Playground: experiment with Controls and edge cases. Docs stay idle (autoplay off). Compare runtime feedback with the curated code panel.',
  ),
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
