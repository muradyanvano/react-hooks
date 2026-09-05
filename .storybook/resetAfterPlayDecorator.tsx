import { useEffect, useRef, useState, type ReactNode } from 'react'
import { addons } from 'storybook/preview-api'
import type { Decorator } from '@storybook/react'

type PhasePayload = {
  storyId?: string
  newPhase?: string
}

/** Storybook preview channel event (avoid importing core-events into Vitest). */
const STORY_RENDER_PHASE_CHANGED = 'storyRenderPhaseChanged'

type StoryResetBoundaryProps = {
  Story: () => ReactNode
  storyId: string
  viewMode?: string
}

function StoryResetBoundary({
  Story,
  storyId,
  viewMode,
}: StoryResetBoundaryProps) {
  const [generation, setGeneration] = useState(0)
  const storyIdRef = useRef(storyId)

  useEffect(() => {
    storyIdRef.current = storyId
  }, [storyId])

  useEffect(() => {
    if (viewMode === 'docs') {
      return
    }

    let cancelled = false
    const channel = addons.getChannel()
    const subscribedStoryId = storyId

    const onPhase = (payload: PhasePayload) => {
      if (payload.storyId !== subscribedStoryId) {
        return
      }
      if (payload.newPhase !== 'played' && payload.newPhase !== 'errored') {
        return
      }

      // Defer past the play return so Vitest/instrumenter teardown settles.
      queueMicrotask(() => {
        if (cancelled) {
          return
        }
        if (storyIdRef.current !== subscribedStoryId) {
          return
        }
        setGeneration((current) => current + 1)
      })
    }

    channel.on(STORY_RENDER_PHASE_CHANGED, onPhase)
    return () => {
      cancelled = true
      channel.off(STORY_RENDER_PHASE_CHANGED, onPhase)
    }
  }, [storyId, viewMode])

  return (
    <div data-story-reset-generation={String(generation)} key={generation}>
      <Story />
    </div>
  )
}

/**
 * After a story's play function finishes (`played`) or errors, remount the
 * React tree so Docs/canvas demos return to their idle initial UI.
 *
 * Uses a decorator key remount (not Storybook FORCE_REMOUNT) so the play
 * function does not run again.
 */
export const resetAfterPlayDecorator: Decorator = (Story, context) => (
  <StoryResetBoundary
    Story={Story}
    storyId={context.id}
    viewMode={context.viewMode}
  />
)
