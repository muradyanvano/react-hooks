# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.1] - Unreleased

### Added

- Package foundation for `@muradyanvano/react-hooks`
- ESM-only Vite library build with TypeScript declarations
- Strict TypeScript, ESLint, Prettier, and Vitest tooling
- `useOnClickOutside` hook with public types:
  - `UseOnClickOutsideEventType`
  - `UseOnClickOutsideOptions`
  - `UseOnClickOutsideHandler`
- Runtime, type, and SSR coverage for `useOnClickOutside`
- `useOnElementRemoval` hook with public types:
  - `UseOnElementRemovalOptions`
  - `UseOnElementRemovalHandler`
- Runtime, type, and SSR coverage for `useOnElementRemoval`
- `useOnKeyStroke` hook with public types:
  - `KeyStrokeEventType`
  - `KeyStrokeFilter`
  - `KeyStrokePredicate`
  - `KeyStrokeTarget`
  - `UseOnKeyStrokeHandler`
  - `UseOnKeyStrokeOptions`
- Runtime, type, and SSR coverage for `useOnKeyStroke`
- `useEventListener` hook with public types:
  - `UseEventListenerTarget`
  - `UseEventListenerHandler`
  - `UseEventListenerOptions`
- Runtime, type, and SSR coverage for `useEventListener`
- `useOnLongPress` hook with public types:
  - `UseOnLongPressDelay`
  - `UseOnLongPressHandler`
  - `UseOnLongPressOptions`
  - `UseOnLongPressReleaseDetails`
  - `UseOnLongPressReleaseHandler`
- Runtime, type, and SSR coverage for `useOnLongPress`
- `useOnStartTyping` hook with public types:
  - `UseOnStartTypingHandler`
  - `UseOnStartTypingCharacterValidator`
  - `UseOnStartTypingEditableDetector`
  - `UseOnStartTypingOptions`
- Runtime, type, and SSR coverage for `useOnStartTyping`
- `useDevicesList` hook with public types:
  - `UseDevicesListUpdatedHandler`
  - `UseDevicesListOptions`
  - `UseDevicesListReturn`
- Runtime, type, and SSR coverage for `useDevicesList`
- `useDisplayMedia` hook with public types:
  - `UseDisplayMediaOptions`
  - `UseDisplayMediaReturn`
- Runtime, type, and SSR coverage for `useDisplayMedia`
- `useElementByPoint` hook with public types:
  - `UseElementByPointOptions`
  - `UseElementByPointReturn`
  - `UseElementByPointScheduler`
- Runtime, type, and SSR coverage for `useElementByPoint`
- `useElementHover` hook with public types:
  - `UseElementHoverOptions`
- Runtime, type, and SSR coverage for `useElementHover`
- `useFocus` hook with public types:
  - `UseFocusTarget`
  - `UseFocusOptions`
  - `UseFocusReturn`
- Runtime, type, and SSR coverage for `useFocus`
- `useFocusWithin` hook with public types:
  - `UseFocusWithinOptions`
  - `UseFocusWithinReturn`
- Runtime, type, and SSR coverage for `useFocusWithin`
- `useInfiniteScroll` hook with public types:
  - `UseInfiniteScrollDirection`
  - `UseInfiniteScrollTarget`
  - `UseInfiniteScrollState`
  - `UseInfiniteScrollLoadMore`
  - `UseInfiniteScrollCanLoadMore`
  - `UseInfiniteScrollOptions`
  - `UseInfiniteScrollReturn`
- Runtime, type, and SSR coverage for `useInfiniteScroll`
- `useMouse` hook with public types:
  - `UseMouseCoordinateType`
  - `UseMouseSourceType`
  - `UseMouseTarget`
  - `UseMousePosition`
  - `UseMouseEventExtractor`
  - `UseMouseEventFilter`
  - `UseMouseOptions`
  - `UseMouseReturn`
- Runtime, type, and SSR coverage for `useMouse`
- React 18 packed-consumer SSR check (`npm run test:ssr:react18`) integrated into `verify:ci`
- Public API notes in `docs/public-api.md`
- Storybook documentation environment (local only; not deployed):
  - Introduction and Getting Started pages
  - Interactive examples for `useOnClickOutside`, `useOnElementRemoval`, `useOnKeyStroke`, `useEventListener`, `useOnLongPress`, `useOnStartTyping`, `useDevicesList`, `useDisplayMedia`, `useElementByPoint`, `useElementHover`, `useFocus`, `useFocusWithin`, `useInfiniteScroll`, and `useMouse`
  - Accessibility addon checks and browser interaction tests
  - Tailwind CSS v4 styling limited to Storybook
  - Shared example showcase with Show/Hide code, Copy code, and Shiki TSX highlighting (`github-light-high-contrast`)
  - MDX pages use relative Storybook manager links (`target="_top"`) so docs navigation does not 404 in the iframe
