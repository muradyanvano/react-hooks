# @muradyanvano/react-hooks

Early prerelease React hooks library inspired by VueUse, designed for React.

This package is **not published to npm yet**. Consume it from this repository only until publishing is authorized.

## Status

- Version: `0.1.0-beta.1` (unreleased)
- Module format: ESM-only
- React peer range: `^18.0.0 || ^19.0.0`
- Goal: SSR-safe imports with no browser globals required at module evaluation time
- Publishing has not been authorized

## Documentation

Local Storybook documents public package behavior with interactive examples, Controls, Actions, accessibility checks, and interaction tests.

Every example includes collapsible consumer-facing TypeScript code with Show code / Hide code and Copy code controls. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.

```bash
npm run storybook
npm run build:storybook
```

A future GitHub Pages URL may host the static Storybook build. Deployment is not configured yet.

## Available hooks

### `useOnClickOutside`

Invokes a handler when a document-level pointer or click event happens outside a referenced element.

```tsx
import { useRef, useState } from 'react'
import { useOnClickOutside } from '@muradyanvano/react-hooks'

export function Menu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(containerRef, () => {
    setOpen(false)
  })

  return (
    <div ref={containerRef}>
      <button type="button" onClick={() => setOpen((value) => !value)}>
        Toggle menu
      </button>

      {open ? <div>Menu content</div> : null}
    </div>
  )
}
```

The toggle control is inside the referenced container so the default `pointerdown` listener does not close the menu when opening it.

#### Options

| Option      | Type                       | Default         | Description                                       |
| ----------- | -------------------------- | --------------- | ------------------------------------------------- |
| `enabled`   | `boolean`                  | `true`          | When `false`, no document listener is registered. |
| `eventType` | `'pointerdown' \| 'click'` | `'pointerdown'` | Document event to listen for.                     |
| `capture`   | `boolean`                  | `true`          | Capture-phase listener registration.              |

#### Event semantics

- `pointerdown` (default): registers a `pointerdown` listener; the handler receives the original `PointerEvent`. Pointer Events cover mouse, touch, and pen.
- `click`: registers a `click` listener; the handler receives the original `MouseEvent`.

#### SSR and StrictMode

- Importing the package does not touch `window` or `document`.
- The hook registers listeners only in an effect, so server rendering does not attach document listeners.
- Effects clean up correctly under React StrictMode, so duplicate active listeners are not left behind.

#### Current limitations

- Single ref only (no ref arrays)
- No ignored selectors / ignored elements
- No iframe-specific handling
- Not a full Shadow DOM API (uses `composedPath()` when available, then `contains()`)

## Development

```bash
npm install
npm run verify
```

Useful scripts:

| Script                                                      | Purpose                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm run storybook`                                         | Start local Storybook docs                                          |
| `npm run build:storybook`                                   | Build static Storybook output                                       |
| `npm run test:storybook`                                    | Run Storybook browser interaction/a11y checks                       |
| `npm run build` / `npm run build:lib`                       | Build the ESM library and declarations                              |
| `npm run typecheck`                                         | TypeScript project build                                            |
| `npm run lint`                                              | ESLint                                                              |
| `npm run format` / `npm run format:check`                   | Prettier                                                            |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Unit tests (Vitest)                                                 |
| `npm run pack:dry-run`                                      | Inspect the future publish tarball                                  |
| `npm run verify`                                            | Format, typecheck, lint, unit tests, library build, Storybook build |
| `npm run verify:ci`                                         | `verify` plus Storybook browser tests                               |

## License

MIT © Vano Muradyan
