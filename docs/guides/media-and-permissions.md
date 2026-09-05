# Media and permissions

Related: [Browser APIs](./browser-apis.md) · [SSR](./ssr.md) · [Public API](../public-api.md)

## `useDevicesList`

- Enumerates `navigator.mediaDevices` with optional permission workflows.
- Temporary permission tracks are stopped after enumeration when the hook creates them.
- Prefer an explicit “Allow access” control over auto-requesting permissions on mount.
- Browsers generally cannot revoke camera/microphone permission from the page; users must use site settings.

## `useDisplayMedia`

- Screen capture via `getDisplayMedia` with explicit `start` / `stop`.
- Requires a user gesture for the permission / picker UI.
- Attach streams to `<video>` with `srcObject`; do not rely on `URL.createObjectURL(stream)` for live tracks in examples.

## `useUserMedia`

- Camera and microphone capture with owned streams, constraint switching, and track-ended cleanup.
- Start from a user gesture; do not auto-start on documentation load.
- The hook does not analyze audio levels.

## `useEyeDropper`

- Imperative native EyeDropper sampling (`open()`).
- Limited browser support; typically requires a secure context.
- Escape / abort cancels picking; treat cancellation as documented in the API reference.

## Permissions and privacy

- Automated tests and CI must mock media APIs; do not click Allow or open real pickers in play tests.
- Live Storybook stories exist for manual local verification only.
- Always stop tracks you no longer need; leftover tracks keep camera/mic indicators active.
