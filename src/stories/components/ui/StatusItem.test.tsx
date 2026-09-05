import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusPanel } from '../ExampleShowcase'
import { resolveStatusValueMode, StatusItem } from './StatusItem'

const INLINE_GRID_CLASS = 'grid-cols-[minmax(0,auto)_minmax(0,1fr)]'

describe('resolveStatusValueMode', () => {
  it('uses explicit mode when provided', () => {
    expect(resolveStatusValueMode('short', 'truncate')).toBe('truncate')
  })

  it('detects long values as block', () => {
    const long = 'a'.repeat(49)
    expect(resolveStatusValueMode(long)).toBe('block')
  })

  it('detects URLs as code', () => {
    expect(resolveStatusValueMode('https://example.com/path')).toBe('code')
  })

  it('defaults short values to inline', () => {
    expect(resolveStatusValueMode('ready')).toBe('inline')
  })

  it('detects JWT-like tokens as code', () => {
    const jwt =
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ0ZXN0In0.signature-padding-'.padEnd(
        64,
        'x',
      )
    expect(resolveStatusValueMode(jwt)).toBe('code')
  })

  it('detects long base64 payloads as code', () => {
    const base64 = `data:image/png;base64,${'A'.repeat(64)}`
    expect(resolveStatusValueMode(base64)).toBe('code')
  })
})

describe('StatusItem layout modes', () => {
  it('renders long unbroken values in block layout without inline grid', () => {
    const value = 'catalog-metadata-'.padEnd(300, 'x')
    const { container } = render(
      <StatusItem label="Result" value={value} testId="status-result" />,
    )

    expect(resolveStatusValueMode(value)).toBe('block')
    expect(
      container.querySelector('[data-testid="status-result"]'),
    ).toBeTruthy()
    expect(container.innerHTML).not.toContain(INLINE_GRID_CLASS)
    expect(
      container.querySelector('[data-testid="status-result"]')?.className,
    ).toContain('whitespace-pre-wrap')
  })

  it('renders token-like values in scrollable code blocks', () => {
    const value = 'https://example.com/'.padEnd(120, 'z')
    const { container } = render(
      <StatusItem label="URL" value={value} testId="status-url" />,
    )

    expect(resolveStatusValueMode(value)).toBe('code')
    expect(
      container
        .querySelector('[data-testid="status-url"]')
        ?.hasAttribute('data-allow-h-scroll'),
    ).toBe(true)
    expect(container.innerHTML).not.toContain(INLINE_GRID_CLASS)
  })
})

describe('StatusPanel long values', () => {
  it('maps debounced search overflow fixtures to block mode', () => {
    const debouncedResult = `Results for “atlas”: Atlas, Cedar, Nova · ${'x'.repeat(300)}`
    const { container } = render(
      <StatusPanel
        items={[
          {
            label: 'Debounced result',
            value: debouncedResult,
            testId: 'debounce-result',
            mode: 'block',
          },
        ]}
      />,
    )

    const valueNode = container.querySelector('[data-testid="debounce-result"]')
    expect(valueNode).toBeTruthy()
    expect(container.innerHTML).not.toContain(INLINE_GRID_CLASS)
    expect(valueNode?.className).toContain('whitespace-pre-wrap')
  })
})
