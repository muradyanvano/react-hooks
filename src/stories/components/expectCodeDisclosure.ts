import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

/**
 * Shared Show/Hide + Copy + Shiki assertions for ExampleShowcase stories.
 */
export async function expectCodeDisclosure(
  canvas: ReturnType<typeof within>,
  expectedSnippet: string,
): Promise<void> {
  const toggle = canvas.getAllByTestId('toggle-code')[0]
  if (toggle == null) {
    throw new Error('Missing toggle-code control')
  }

  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  const highlighted = await canvas.findByTestId('highlighted-code')
  await expect(highlighted).toBeVisible()
  await waitFor(() => {
    expect(highlighted.textContent?.length ?? 0).toBeGreaterThan(0)
  })

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
}

export function disclosurePlay(expectedSnippet: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)
    await expectCodeDisclosure(canvas, expectedSnippet)
  }
}
