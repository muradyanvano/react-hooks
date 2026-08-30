import { createHighlighter, type Highlighter } from 'shiki'

export const CODE_THEME = 'github-light-high-contrast' as const

let highlighterPromise: Promise<Highlighter> | null = null

/** Shared Shiki instance for Storybook docs (tsx + bash). */
export function getDocsHighlighter() {
  highlighterPromise ??= createHighlighter({
    // Bundled high-contrast light theme — `css-variables` is not in the default bundle.
    themes: [CODE_THEME],
    langs: ['tsx', 'bash'],
  })
  return highlighterPromise
}
