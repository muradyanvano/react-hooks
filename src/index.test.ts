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

  it('exports useOnLongPress and its public types', () => {
    expect(entry.useOnLongPress).toBeTypeOf('function')
  })

  it('exports useOnStartTyping and its public types', () => {
    expect(entry.useOnStartTyping).toBeTypeOf('function')
  })

  it('exports useDevicesList and its public types', () => {
    expect(entry.useDevicesList).toBeTypeOf('function')
  })

  it('exports useDisplayMedia and its public types', () => {
    expect(entry.useDisplayMedia).toBeTypeOf('function')
  })

  it('exports useElementByPoint and its public types', () => {
    expect(entry.useElementByPoint).toBeTypeOf('function')
  })

  it('exports useElementHover and its public types', () => {
    expect(entry.useElementHover).toBeTypeOf('function')
  })

  it('exports useFocus and its public types', () => {
    expect(entry.useFocus).toBeTypeOf('function')
  })

  it('exports useFocusWithin and its public types', () => {
    expect(entry.useFocusWithin).toBeTypeOf('function')
  })

  it('exports useInfiniteScroll and its public types', () => {
    expect(entry.useInfiniteScroll).toBeTypeOf('function')
  })

  it('exports useMouse and its public types', () => {
    expect(entry.useMouse).toBeTypeOf('function')
  })

  it('exports useMousePressed and its public types', () => {
    expect(entry.useMousePressed).toBeTypeOf('function')
  })

  it('exports useParallax and its public types', () => {
    expect(entry.useParallax).toBeTypeOf('function')
  })

  it('exports useScroll and its public types', () => {
    expect(entry.useScroll).toBeTypeOf('function')
  })

  it('exports useScrollLock and its public types', () => {
    expect(entry.useScrollLock).toBeTypeOf('function')
  })

  it('does not expose private source subpaths on the root entry', () => {
    expect(entry).not.toHaveProperty('default')
    expect(Object.keys(entry).sort()).toEqual([
      'useDevicesList',
      'useDisplayMedia',
      'useElementByPoint',
      'useElementHover',
      'useEventListener',
      'useFocus',
      'useFocusWithin',
      'useInfiniteScroll',
      'useMouse',
      'useMousePressed',
      'useOnClickOutside',
      'useOnElementRemoval',
      'useOnKeyStroke',
      'useOnLongPress',
      'useOnStartTyping',
      'useParallax',
      'useScroll',
      'useScrollLock',
    ])
  })
})
