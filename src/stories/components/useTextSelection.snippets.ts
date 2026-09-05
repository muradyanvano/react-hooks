export const inspectorSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function TextSelectionInspector() {
  const { text, rects, ranges } = useTextSelection()
  return <pre>{JSON.stringify({ text, ranges: ranges.length, rects: rects.length }, null, 2)}</pre>
}`

export const basicSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function BasicSelection() {
  const { text } = useTextSelection()
  return <p>Selected: {text || 'Nothing selected'}</p>
}`

export const paragraphsSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function MultipleParagraphs() {
  const selection = useTextSelection()
  return <p>{selection.text}</p>
}`

export const rangesSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function MultipleRanges() {
  const { ranges } = useTextSelection()
  return <p>Ranges: {ranges.length}</p>
}`

export const rectanglesSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function SelectionRectangles() {
  const { rects } = useTextSelection()
  return <p>Rectangles: {rects.length}</p>
}`

export const collapsedSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function CollapsedSelection() {
  const { text, ranges } = useTextSelection()
  return <p>{text ? text : \`Caret / collapsed range: \${ranges.length}\`}</p>
}`

export const unicodeSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function UnicodeAndWhitespace() {
  const { text } = useTextSelection()
  return <pre>{JSON.stringify(text)}</pre>
}`

export const enabledSnippet = `import { useState } from 'react'
import { useTextSelection } from '@muradyanvano/react-hooks'

export function EnabledSelection() {
  const [enabled, setEnabled] = useState(true)
  const selection = useTextSelection({ enabled })
  return <button onClick={() => setEnabled(!enabled)}>{selection.text || 'Toggle selection'}</button>
}`

export const iframeSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function IframeSelection({ frameWindow }: { frameWindow: Window | null }) {
  const selection = useTextSelection({ window: frameWindow })
  return <p>{selection.text}</p>
}`

export const dynamicSnippet = `import { useState } from 'react'
import { useTextSelection } from '@muradyanvano/react-hooks'

export function DynamicWindow({ first, second }: { first: Window; second: Window }) {
  const [target, setTarget] = useState(first)
  const selection = useTextSelection({ window: target })
  return <button onClick={() => setTarget(second)}>{selection.text}</button>
}`

export const clearingSnippet = `import { useTextSelection } from '@muradyanvano/react-hooks'

export function ClearingSelection() {
  const { selection, text } = useTextSelection()
  return <button onClick={() => selection?.removeAllRanges()}>{text || 'Selection cleared'}</button>
}`

export const playgroundSnippet = `import { useState } from 'react'
import { useTextSelection } from '@muradyanvano/react-hooks'

export function SelectionPlayground() {
  const [enabled, setEnabled] = useState(true)
  const selection = useTextSelection({ enabled })
  return <pre>{JSON.stringify({ enabled, text: selection.text }, null, 2)}</pre>
}`
