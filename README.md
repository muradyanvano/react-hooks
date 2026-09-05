# @muradyanvano/react-hooks

Production-oriented React hooks for React 18 and 19 — strongly typed, ESM-only, SSR-safe to import, and StrictMode-safe.

[![CI](https://github.com/muradyanvano1995/react-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/muradyanvano1995/react-hooks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@muradyanvano/react-hooks.svg)](https://www.npmjs.com/package/@muradyanvano/react-hooks)
[![npm downloads](https://img.shields.io/npm/dm/@muradyanvano/react-hooks.svg)](https://www.npmjs.com/package/@muradyanvano/react-hooks)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Storybook](https://img.shields.io/badge/docs-Storybook-ff4785.svg)](https://muradyanvano1995.github.io/react-hooks/)

## Installation

```bash
npm install @muradyanvano/react-hooks
```

## Compatibility

| Requirement        | Value                               |
| ------------------ | ----------------------------------- |
| React (peer)       | `^18.0.0 \|\| ^19.0.0`              |
| Module format      | ESM-only                            |
| Node (engines)     | `^20.19.0 \|\| >=22.12.0`           |
| Runtime dependency | `qrcode` (used by `useQRCode` only) |

## Quick start

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

Keep the trigger inside the referenced container so the default `pointerdown` listener does not close the menu when opening it.

## Features

- Typed public APIs with declaration files
- SSR-safe module evaluation (no `window` / `document` at import time)
- StrictMode-safe listener and observer cleanup
- Tree-shakable ESM build with React externalized
- Interactive Storybook docs with consumer code samples

## Hook index

### Events

`useOnClickOutside` · `useOnElementRemoval` · `useOnKeyStroke` · `useEventListener` · `useOnLongPress` · `useOnStartTyping` · `useEventBus`

### Elements

`useElementByPoint` · `useElementHover` · `useFocus` · `useFocusWithin` · `useTextSelection`

### Input / sensors

`useMouse` · `useMousePressed` · `useParallax` · `useScroll` · `useScrollLock` · `useInfiniteScroll` · `usePageLeave`

### Media

`useDevicesList` · `useDisplayMedia` · `useUserMedia` · `useEyeDropper`

### State and storage

`useLocalStorage` · `useSessionStorage` · `useCookies` · `useUrlSearchParams` · `useJwt`

### Network / browser / utilities

`useWebSocket` · `useFullscreen` · `useFavicon` · `useNProgress` · `useQRCode` · `useBase64` · `useDebounceFn`

## Documentation

| Resource                                                     | Description                                   |
| ------------------------------------------------------------ | --------------------------------------------- |
| [Storybook](https://muradyanvano1995.github.io/react-hooks/) | Interactive examples and docs                 |
| [Public API](./docs/public-api.md)                           | Authoritative signatures, types, and behavior |
| [Getting started](./docs/getting-started.md)                 | Install, peers, and first usage               |
| [SSR guide](./docs/guides/ssr.md)                            | Server rendering and Client Components        |
| [Release guide](./docs/releasing.md)                         | First release and later releases              |
| [Changelog](./CHANGELOG.md)                                  | Version history                               |
| [Contributing](./docs/contributing.md)                       | Local development and verification            |

Additional guides: [browser APIs](./docs/guides/browser-apis.md), [storage and cookies](./docs/guides/storage-and-cookies.md), [media and permissions](./docs/guides/media-and-permissions.md).

## SSR and tree-shaking

Importing the package does not touch browser globals. Subscriptions attach in effects. Call hooks from Client Components when using React Server Components. The package sets `"sideEffects": false` and ships a single ESM entry for tree-shaking.

## License

MIT © Vano Muradyan
