import { describe, expect, it } from 'vitest'

import * as entry from './index'

describe('package entry', () => {
  it('imports as a plain module object without throwing', () => {
    expect(entry).toBeTypeOf('object')
  })

  it('exports useOnClickOutside and its public types', () => {
    expect(entry.useOnClickOutside).toBeTypeOf('function')
  })
})
