# Getting started

Install the package from npm:

```bash
npm install @muradyanvano/react-hooks
```

## Requirements

- React `^18.0.0 || ^19.0.0` (peer dependency)
- ESM-capable bundler or runtime (the package is ESM-only)
- TypeScript is recommended; declaration files ship with the package

The only intentional runtime dependency is `qrcode`, used by `useQRCode`. Other hooks do not require extra packages at the public API surface.

## Minimal example

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

Keep the toggle control inside the referenced container so the default `pointerdown` listener does not close the menu when opening it.

## Next steps

- Browse interactive examples in [Storybook](https://muradyanvano1995.github.io/react-hooks/)
- Read the [public API reference](./public-api.md)
- Review [SSR guidance](./guides/ssr.md) before using hooks in server-rendered apps
- See category guides for [browser APIs](./guides/browser-apis.md), [storage and cookies](./guides/storage-and-cookies.md), and [media and permissions](./guides/media-and-permissions.md)

## Local documentation

```bash
npm run storybook
npm run build:storybook
```

Storybook is development-only and is not included in the npm tarball. Example styling uses Tailwind for documentation only; the hooks package does not require Tailwind.
