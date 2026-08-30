import '@testing-library/jest-dom/vitest'

if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, init?: MouseEventInit) {
      super(type, init)
    }
  }

  globalThis.PointerEvent =
    PointerEventPolyfill as unknown as typeof PointerEvent
}
