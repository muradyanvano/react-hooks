import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'

function ResetCounterDemo() {
  const [count, setCount] = useState(0)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm text-slate-600">
        Internal reset-after-play integration fixture. The play function mutates
        state, then the preview decorator remounts when the story finishes.
      </p>
      <button
        type="button"
        data-testid="reset-counter"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        onClick={() => {
          setCount((current) => current + 1)
        }}
      >
        Count {count}
      </button>
    </div>
  )
}

function ErroredResetDemo() {
  const [count, setCount] = useState(0)
  return (
    <div className="rounded-xl border border-rose-200 bg-white p-4">
      <p className="mb-3 text-sm text-slate-600">
        Intentional play failure after mutation. Tagged <code>!test</code> so
        Storybook CI skips it; the reset audit asserts remount clears state.
      </p>
      <button
        type="button"
        data-testid="errored-reset-counter"
        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
        onClick={() => {
          setCount((current) => current + 1)
        }}
      >
        Count {count}
      </button>
    </div>
  )
}

function SwitchTargetDemo() {
  return (
    <div
      data-testid="switch-target-marker"
      className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
    >
      Story B stable — must not remount from Story A’s stale reset.
    </div>
  )
}

function getGeneration(canvasElement: HTMLElement): string | null {
  return (
    canvasElement
      .querySelector('[data-story-reset-generation]')
      ?.getAttribute('data-story-reset-generation') ?? null
  )
}

const meta = {
  title: 'Internal/Layout',
  component: ResetCounterDemo,
  tags: ['!autodocs', '!dev'],
} satisfies Meta<typeof ResetCounterDemo>

export default meta
type Story = StoryObj<typeof meta>

export const ResetAfterPlay: Story = {
  name: 'Reset after play',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    expect(getGeneration(canvasElement)).toBe('0')
    await expect(canvas.getByTestId('reset-counter')).toHaveTextContent(
      'Count 0',
    )

    await userEvent.click(canvas.getByTestId('reset-counter'))
    await expect(canvas.getByTestId('reset-counter')).toHaveTextContent(
      'Count 1',
    )

    // Remount happens after this play function returns (`played` phase).
  },
}

/**
 * Expected-failure fixture for browser reset audit only.
 * Excluded from Vitest Storybook project via `!test`.
 */
export const ErroredPlayReset: Story = {
  name: 'Errored play reset',
  tags: ['!autodocs', '!dev', '!test'],
  render: () => <ErroredResetDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('errored-reset-counter'))
    await expect(canvas.getByTestId('errored-reset-counter')).toHaveTextContent(
      'Count 1',
    )
    throw new Error('Intentional errored-play reset fixture')
  },
}

/** Target for story-switch stale-reset race in `scripts/storybook-reset-audit.mjs`. */
export const ResetSwitchTarget: Story = {
  name: 'Reset switch target',
  tags: ['!autodocs', '!dev', '!test'],
  render: () => <SwitchTargetDemo />,
}
