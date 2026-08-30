import { describe, expect, it } from 'vitest'

import * as entry from './index'

describe('package entry', () => {
  it('imports as a plain module object without throwing', () => {
    expect(entry).toBeTypeOf('object')
  })

  it('exports useOnClickOutside and its public types', () => {
    expect(entry.useOnClickOutside).toBeTypeOf('function')
  })

  it('exports useOnElementRemoval and its public types', () => {
    expect(entry.useOnElementRemoval).toBeTypeOf('function')
  })

  it('exports useOnKeyStroke and its public types', () => {
    expect(entry.useOnKeyStroke).toBeTypeOf('function')
  })

  it('exports useEventListener and its public types', () => {
    expect(entry.useEventListener).toBeTypeOf('function')
  })

  it('does not expose private source subpaths on the root entry', () => {
    expect(entry).not.toHaveProperty('default')
    expect(Object.keys(entry).sort()).toEqual([
      'useEventListener',
      'useOnClickOutside',
      'useOnElementRemoval',
      'useOnKeyStroke',
    ])
  })
})
