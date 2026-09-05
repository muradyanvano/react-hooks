import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { addons } from 'storybook/preview-api'

type PhasePayload = {
  storyId?: string
  newPhase?: string
}

type StoryContextLike = {
  id: string
}

/** Storybook preview channel event (avoid importing core-events into Vitest). */
const STORY_RENDER_PHASE_CHANGED = 'storyRenderPhaseChanged'

/**
 * After a story's play function finishes (`played`) or errors, remount the
 * React tree so Docs/canvas demos return to their idle initial UI.
 *
 * Uses a decorator key remount (not Storybook FORCE_REMOUNT) so the play
 * function does not run again.
 */
export function resetAfterPlayDecorator(
  Story: () => ReactNode,
  context: StoryContextLike,
): ReactElement {
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const channel = addons.getChannel()

    const onPhase = (payload: PhasePayload) => {
      if (payload.storyId !== context.id) {
        return
      }
      if (payload.newPhase !== 'played' && payload.newPhase !== 'errored') {
        return
      }

      // Defer past the play return so Vitest/instrumenter teardown settles.
      queueMicrotask(() => {
        setGeneration((current) => current + 1)
      })
    }

    channel.on(STORY_RENDER_PHASE_CHANGED, onPhase)
    return () => {
      channel.off(STORY_RENDER_PHASE_CHANGED, onPhase)
    }
  }, [context.id])

  return (
    <div data-story-reset-generation={String(generation)} key={generation}>
      <Story />
    </div>
  )
}
