# Browser APIs

Related: [SSR](./ssr.md) · [Public API](../public-api.md) · [Storybook](https://muradyanvano1995.github.io/react-hooks/)

Several hooks wrap browser platform APIs. They share these boundaries:

## Ownership and cleanup

- Listeners, observers, and document mutations are attached after mount and removed on cleanup.
- Shared document-level features (for example favicon links or progress bars) use ownership so multiple hook instances do not fight over the same resource.
- Prefer leaving Storybook and production demos with no leftover timers, styles, or DOM nodes.

## User-gesture requirements

Some APIs only work from a user gesture:

- `useEyeDropper` — `open()`
- `useFullscreen` — `enter()` / `toggle()`
- `useDisplayMedia` / `useUserMedia` — `start()` (and related permission prompts)

Do not auto-start these on Docs load or during automated tests.

## Secure context and support

Support varies by browser and context (HTTPS / localhost, permissions policy, feature detection):

| Area                       | Hooks                                                                                                        | Notes                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Pointer / keyboard / focus | `useOnClickOutside`, `useOnKeyStroke`, `useEventListener`, `useOnLongPress`, `useFocus`, `useFocusWithin`, … | Broad support; still SSR-safe to import.               |
| Fullscreen                 | `useFullscreen`                                                                                              | Prefixed adapters where needed; may require gesture.   |
| EyeDropper                 | `useEyeDropper`                                                                                              | Limited browser support; secure context.               |
| Selection                  | `useTextSelection`                                                                                           | Geometry depends on the Selection API.                 |
| History / URL              | `useUrlSearchParams`                                                                                         | Mutates History only when writes are enabled.          |
| Page leave                 | `usePageLeave`                                                                                               | Mouse-boundary leave only; not a beforeunload blocker. |

## Security boundaries

- `useJwt` decodes compact JWT header/payload contents only. Decoding success is **not** authentication, signature verification, or trust.
- `useQRCode` encodes payloads; scanning a generated code does not validate trustworthiness of the content.
- `useBase64` is encoding, not encryption.
- Do not store secrets in Storybook examples, cookies, or web storage demos.

## Accessibility

Most hooks do not manage focus, announcements, or keyboard alternatives. Pair pointer-only dismissal, long-press, hover, and media controls with accessible alternatives in your UI.
