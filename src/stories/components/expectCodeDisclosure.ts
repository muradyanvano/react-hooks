import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { assertNoPageOverflow } from './assertNoPageOverflow'

/** Wait until the code panel is open and code text is available (Shiki or plain). */
export async function waitForDisclosedCode(
  canvas: ReturnType<typeof within>,
): Promise<HTMLElement> {
  await waitFor(() => {
    expect(canvas.getByTestId('code-panel')).toBeVisible()
  })

  const panel = within(canvas.getByTestId('code-panel'))

  await waitFor(
    () => {
      const code =
        panel.queryByTestId('highlighted-code') ??
        panel.queryByTestId('plain-code')
      expect(code).toBeTruthy()
      expect(code?.textContent?.length ?? 0).toBeGreaterThan(0)
    },
    { timeout: 8000 },
  )

  return (
    panel.queryByTestId('highlighted-code') ?? panel.getByTestId('plain-code')
  )
}

/**
 * Shared Show/Hide + Copy + Shiki assertions for ExampleShowcase stories.
 */
export async function expectCodeDisclosure(
  canvas: ReturnType<typeof within>,
  expectedSnippet: string,
  canvasElement?: HTMLElement,
): Promise<void> {
  const toggle = canvas.getAllByTestId('toggle-code')[0]
  if (toggle == null) {
    throw new Error('Missing toggle-code control')
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  const highlighted = await waitForDisclosedCode(canvas)
  await expect(highlighted).toBeVisible()

  const markerMatch = expectedSnippet.match(
    /(?:export )?function ([A-Za-z0-9_]+)|use(?:TextSelection|Base64|DebounceFn|EventBus)/,
  )
  if (markerMatch?.[0]) {
    await expect(highlighted).toHaveTextContent(
      markerMatch[0].replace(/^export /, ''),
    )
  }

  const clipboardDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'clipboard',
  )
  const writeText = fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  try {
    await userEvent.click(canvas.getByTestId('copy-code'))
    await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
    await expect(canvas.getByTestId('copy-code')).toHaveTextContent('Copied')
  } finally {
    if (clipboardDescriptor === undefined) {
      delete (navigator as { clipboard?: unknown }).clipboard
    } else {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
    }
  }

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  const root =
    canvasElement ??
    canvas
      .getByTestId('toggle-code')
      .closest('[data-testid="storybook-root"]') ??
    document
  assertNoPageOverflow(root instanceof HTMLElement ? root : document)
}

export function disclosurePlay(expectedSnippet: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, expectedSnippet, canvasElement)
  }
}
