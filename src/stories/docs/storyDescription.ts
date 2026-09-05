import type { StoryObj } from '@storybook/react-vite'

export function storyDescription(text: string): Pick<StoryObj, 'parameters'> {
  return {
    parameters: {
      docs: {
        description: {
          story: text,
        },
      },
    },
  }
}

export function storyDescriptionFromParts(parts: {
  demonstrates: string
  try: string
  observe: string
}): Pick<StoryObj, 'parameters'> {
  return storyDescription(
    `${parts.demonstrates} ${parts.try} ${parts.observe}`.trim(),
  )
}
