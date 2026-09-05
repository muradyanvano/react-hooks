import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORY_RENDER_PHASE_CHANGED = 'storyRenderPhaseChanged'

type Listener = (payload: unknown) => void

const channelListeners = new Map<string, Set<Listener>>()

const mockChannel = {
  on(event: string, listener: Listener) {
    const listeners = channelListeners.get(event) ?? new Set<Listener>()
    listeners.add(listener)
    channelListeners.set(event, listeners)
  },
  off(event: string, listener: Listener) {
    channelListeners.get(event)?.delete(listener)
  },
  emit(event: string, payload: unknown) {
    channelListeners.get(event)?.forEach((listener) => {
      listener(payload)
    })
  },
}

vi.mock('storybook/preview-api', () => ({
  addons: {
    getChannel: () => mockChannel,
  },
}))

const { resetAfterPlayDecorator } = await import('./resetAfterPlayDecorator')

afterEach(() => {
  cleanup()
  channelListeners.clear()
  vi.clearAllMocks()
})

beforeEach(() => {
  channelListeners.clear()
})

function CounterStory() {
  const [count, setCount] = useState(0)
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      Count {count}
    </button>
  )
}

function getGeneration(): string | null {
  return (
    document
      .querySelector('[data-story-reset-generation]')
      ?.getAttribute('data-story-reset-generation') ?? null
  )
}

async function emitPhase(storyId: string, newPhase: string) {
  await act(async () => {
    mockChannel.emit(STORY_RENDER_PHASE_CHANGED, { storyId, newPhase })
    await Promise.resolve()
  })
}

describe('resetAfterPlayDecorator', () => {
  it('increments data-story-reset-generation after played phase', async () => {
    const storyId = 'hooks-test-reset--primary'

    render(
      resetAfterPlayDecorator(CounterStory, {
        id: storyId,
        viewMode: 'story',
      } as Parameters<typeof resetAfterPlayDecorator>[1]),
    )

    expect(screen.getByRole('button', { name: 'Count 0' })).toBeTruthy()
    expect(getGeneration()).toBe('0')

    await emitPhase(storyId, 'played')

    await waitFor(() => {
      expect(getGeneration()).toBe('1')
    })

    expect(screen.getByRole('button', { name: 'Count 0' })).toBeTruthy()
  })

  it('increments generation after errored phase', async () => {
    const storyId = 'hooks-test-reset--error'

    render(
      resetAfterPlayDecorator(CounterStory, {
        id: storyId,
        viewMode: 'story',
      } as Parameters<typeof resetAfterPlayDecorator>[1]),
    )

    await emitPhase(storyId, 'errored')

    await waitFor(() => {
      expect(getGeneration()).toBe('1')
    })
  })

  it('ignores phase events for other stories', async () => {
    const storyId = 'hooks-test-reset--current'

    render(
      resetAfterPlayDecorator(CounterStory, {
        id: storyId,
        viewMode: 'story',
      } as Parameters<typeof resetAfterPlayDecorator>[1]),
    )

    await emitPhase('hooks-test-reset--other', 'played')

    await waitFor(() => {
      expect(getGeneration()).toBe('0')
    })
  })

  it('does not reset in docs view mode', async () => {
    const storyId = 'hooks-test-reset--docs'

    render(
      resetAfterPlayDecorator(CounterStory, {
        id: storyId,
        viewMode: 'docs',
      } as Parameters<typeof resetAfterPlayDecorator>[1]),
    )

    await emitPhase(storyId, 'played')

    await waitFor(() => {
      expect(getGeneration()).toBe('0')
    })
  })

  it('discards stale reset when storyId changes before the queued remount', async () => {
    const storyIdA = 'hooks-test-reset--stale-a'
    const storyIdB = 'hooks-test-reset--stale-b'

    const { rerender } = render(
      resetAfterPlayDecorator(CounterStory, {
        id: storyIdA,
        viewMode: 'story',
      } as Parameters<typeof resetAfterPlayDecorator>[1]),
    )

    rerender(
      resetAfterPlayDecorator(CounterStory, {
        id: storyIdB,
        viewMode: 'story',
      } as Parameters<typeof resetAfterPlayDecorator>[1]),
    )

    await emitPhase(storyIdA, 'played')

    await waitFor(() => {
      expect(getGeneration()).toBe('0')
    })
  })
})
