# SSR and React Server Components

Related: [Getting started](../getting-started.md) · [Public API](../public-api.md) · [Browser APIs](./browser-apis.md)

## Import safety

Importing `@muradyanvano/react-hooks` does not access `window`, `document`, `MutationObserver`, or other browser globals at module evaluation time. Hooks that need the DOM register listeners, observers, or media APIs inside effects (or equivalent post-render paths).

## Calling hooks

Hooks must run in a React client environment:

- In frameworks that use React Server Components, call these hooks from Client Components (`'use client'` or the framework equivalent).
- Server `renderToString` / streaming can import and call hooks that are designed for SSR-safe idle state; they must not require browser APIs during the render phase.

## Common patterns

| Pattern                                  | Guidance                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Omitted `window` / `document` targets    | Prefer hook defaults that resolve the browsing context in effects, not at call time.                                                  |
| Explicit `document` / `window` arguments | Evaluating `document` or `window` as an argument is not SSR-safe; pass them only in client code or after mount.                       |
| Storage and cookies                      | Expect default/initial state on the server, then hydrate from the browser store. See [storage and cookies](./storage-and-cookies.md). |
| Media and permissions                    | Idle / unsupported until the client mounts. See [media and permissions](./media-and-permissions.md).                                  |

## StrictMode

Effects clean up on unmount. Under React StrictMode development remounts, hooks should not leave duplicate active listeners, observers, sockets, or ownership entries behind.

## Verification

The repository includes a packed-consumer React 18 SSR check:

```bash
npm run test:ssr:react18
```

This runs as part of `npm run verify:ci`.
