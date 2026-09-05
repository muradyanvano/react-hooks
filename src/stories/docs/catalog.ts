import {
  HOOK_NAMES,
  HOOK_CATEGORIES,
  type HookCategory,
  type HookDocumentation,
  type HookName,
} from './types'

export { HOOK_CATEGORIES, HOOK_NAMES }

const PACKAGE = '@muradyanvano/react-hooks'

function importLine(hook: HookName, types?: string): string {
  if (types) {
    return `import { ${hook}, type ${types} } from '${PACKAGE}'`
  }
  return `import { ${hook} } from '${PACKAGE}'`
}

export const HOOK_CATALOG: Record<HookName, HookDocumentation> = {
  useOnClickOutside: {
    name: 'useOnClickOutside',
    category: 'Events',
    purpose:
      'Invokes a handler when a document-level pointer or click event happens outside a referenced element.',
    overview:
      'Registers a capture-phase listener on `document` and calls your handler when the event target is outside the referenced element and its descendants.',
    whenToUse: [
      'Closing dropdowns, popovers, and menus on outside interaction',
      'Dismissing transient panels while keeping the trigger inside the boundary',
    ],
    whenNotToUse: [
      'Shadow DOM or iframe-specific hit testing without custom logic',
      'Multiple refs or ignore-selector lists in one call',
    ],
    importExample: importLine('useOnClickOutside', 'UseOnClickOutsideHandler'),
    signature: `function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: UseOnClickOutsideHandler,
  options?: UseOnClickOutsideOptions,
): void`,
    parameters: [
      { name: 'ref', description: 'React ref to the boundary element.' },
      {
        name: 'handler',
        description: 'Called with the original PointerEvent or MouseEvent.',
      },
      {
        name: 'options.enabled',
        description: 'When false, no listener is registered.',
      },
      {
        name: 'options.eventType',
        description: "'pointerdown' (default) or 'click'.",
      },
      {
        name: 'options.capture',
        description: 'Use capture-phase registration (default true).',
      },
    ],
    returnValues: '`void`',
    defaults: '{ enabled: true, eventType: "pointerdown", capture: true }',
    runtimeBehavior: [
      'Reads ref.current at event time; skips non-Node or disconnected targets',
      'Keeps latest handler without re-subscribing for handler identity alone',
      'Re-subscribes when enabled, eventType, or capture change',
    ],
    ssrBehavior:
      'Safe to import and call during SSR. Listeners attach in effects only.',
    strictModeBehavior:
      'Effect cleanup removes the listener on unmount/remount; no duplicate active listeners after Strict Mode cycles.',
    accessibility:
      'The hook does not manage focus or keyboard dismissal. Examples pair outside-click with explicit close controls and visible focus rings; consumers should not rely on pointer-only dismissal alone.',
    limitations: [
      'One ref only',
      'No ignore lists or iframe helpers',
      'Not a complete Shadow DOM surface',
    ],
    relatedHooks: ['useOnKeyStroke', 'useEventListener', 'useFocusWithin'],
  },

  useOnElementRemoval: {
    name: 'useOnElementRemoval',
    category: 'Events',
    purpose:
      'Calls a handler once when a referenced element is removed from its document tree.',
    overview:
      'Observes the target document with `MutationObserver` and invokes the handler with the removed element instance, then disconnects.',
    whenToUse: [
      'Detecting imperative DOM removal from still-mounted observers',
      'Cleaning up third-party widgets removed outside React',
    ],
    whenNotToUse: [
      'Replacing React effect cleanup when the observing component unmounts',
      'Watching multiple refs in one call',
    ],
    importExample: importLine(
      'useOnElementRemoval',
      'UseOnElementRemovalHandler',
    ),
    signature: `function useOnElementRemoval<T extends Element>(
  ref: RefObject<T | null>,
  handler: UseOnElementRemovalHandler<T>,
  options?: UseOnElementRemovalOptions,
): void`,
    parameters: [
      { name: 'ref', description: 'React ref to the observed element.' },
      {
        name: 'handler',
        description: 'Called once with the removed element instance.',
      },
      {
        name: 'options.enabled',
        description: 'When false, observation is inactive.',
      },
    ],
    returnValues: '`void`',
    defaults: '{ enabled: true }',
    runtimeBehavior: [
      'Detects direct removal and ancestor removal containing the target',
      'Captures element instance so handler still receives it if ref is cleared',
      'Re-syncs when ref.current identity changes across commits',
    ],
    ssrBehavior:
      'Safe during SSR. Observers are effect-only; no browser globals at module evaluation.',
    strictModeBehavior:
      'Observer disconnects on cleanup; Strict Mode remount re-establishes observation without duplicate callbacks for the same removal.',
    accessibility:
      'The hook does not announce removal. Examples use status text for demonstration only.',
    limitations: [
      'One ref only',
      'Not a substitute for React unmount cleanup in all cases',
      'Imperative ref assignment requires a later commit to sync',
    ],
    relatedHooks: ['useElementHover', 'useEventListener'],
  },

  useOnKeyStroke: {
    name: 'useOnKeyStroke',
    category: 'Events',
    purpose:
      'Listens for matching keyboard strokes on window or a custom target.',
    overview:
      'Registers keyboard listeners with exact `event.key` matching, optional predicates, and dedupe support.',
    whenToUse: [
      'Global shortcuts with explicit key filters',
      'Element-scoped keyboard handlers with typed options',
    ],
    whenNotToUse: [
      'Parsing combination strings like "ctrl+s" without a predicate',
      'Automatic suppression while typing in editable fields without custom logic',
    ],
    importExample: importLine('useOnKeyStroke', 'UseOnKeyStrokeHandler'),
    signature: `function useOnKeyStroke(
  key: KeyStrokeFilter,
  handler: UseOnKeyStrokeHandler,
  options?: UseOnKeyStrokeOptions,
): void`,
    parameters: [
      {
        name: 'key',
        description:
          'true, exact event.key string, readonly array, or predicate.',
      },
      { name: 'handler', description: 'Receives the original KeyboardEvent.' },
      {
        name: 'options.target',
        description: 'Defaults to window; explicit null registers nothing.',
      },
      {
        name: 'options.dedupe',
        description: 'When true, ignores event.repeat.',
      },
    ],
    returnValues: '`void`',
    defaults:
      '{ enabled: true, eventType: "keydown", target: window, dedupe: false, capture: false, passive: false }',
    runtimeBehavior: [
      'Case-sensitive event.key matching',
      'Latest handler/filter without listener churn',
      'Ref targets sync after React commits',
    ],
    ssrBehavior: 'Safe during SSR. Listeners are effect-only.',
    strictModeBehavior:
      'Listeners removed on effect cleanup; no duplicate handlers after remount.',
    accessibility:
      'Examples document shortcuts and keep focus visible. The hook does not prevent default or manage roving focus; use predicates to avoid firing while typing in inputs.',
    limitations: [
      'No combination-string parser',
      'No automatic editable-target filtering',
      'passive: true prevents preventDefault reliance',
    ],
    relatedHooks: ['useOnStartTyping', 'useEventListener', 'useFocus'],
  },

  useEventListener: {
    name: 'useEventListener',
    category: 'Events',
    purpose:
      'Typed DOM event listeners for window, elements, refs, and custom events.',
    overview:
      'Registers native listeners with overloads for window-default and explicit targets, keeping the latest handler without registration churn.',
    whenToUse: [
      'Window or element listeners with stable subscription semantics',
      'Custom events with typed handlers',
    ],
    whenNotToUse: [
      'Evaluating document as an argument during SSR without guarding',
      'Expecting built-in debouncing or deduplication',
    ],
    importExample: importLine('useEventListener'),
    signature: `// Window form (target omitted)
useEventListener<K extends keyof WindowEventMap>(
  eventName: K | readonly K[],
  handler: UseEventListenerHandler<WindowEventMap[K]>,
  options?: UseEventListenerOptions,
): void

// Target form
useEventListener(
  target: UseEventListenerTarget | null,
  eventName: string | readonly string[],
  handler: UseEventListenerHandler,
  options?: UseEventListenerOptions,
): void`,
    parameters: [
      {
        name: 'target',
        description: 'Omitted → window; explicit null → no listener.',
      },
      { name: 'eventName', description: 'Single name or deduped array.' },
      { name: 'handler', description: 'Called with the native event.' },
      {
        name: 'options',
        description: 'enabled, capture, passive, once, signal (AbortSignal).',
      },
    ],
    returnValues: '`void`',
    defaults: '{ enabled: true, capture: false, passive: false, once: false }',
    runtimeBehavior: [
      'Ref targets sync after commits',
      'Event-name arrays dedupe by first occurrence',
      'Re-registers when target, names, or listener options change',
    ],
    ssrBehavior:
      'Import-safe. Omitted window resolves inside effects. Passing document during render is not SSR-safe.',
    strictModeBehavior:
      'Removes listeners on cleanup; Strict Mode does not leave duplicate subscriptions.',
    accessibility:
      'Examples prefer semantic buttons and keyboard-reachable targets. The hook does not interpret ARIA or manage focus.',
    limitations: [
      'One target per call',
      'Returns void',
      'Explicit document argument during SSR requires care',
    ],
    relatedHooks: ['useOnKeyStroke', 'useOnClickOutside', 'useMouse'],
  },

  useOnLongPress: {
    name: 'useOnLongPress',
    category: 'Events',
    purpose:
      'Calls a handler after a sustained pointer press on a referenced element.',
    overview:
      'Pointer Events–based press detection with optional movement cancellation and release metrics.',
    whenToUse: [
      'Context menus or press-and-hold actions with pointer alternatives',
      'Release timing/distance metrics for custom UX',
    ],
    whenNotToUse: [
      'Essential actions without click or keyboard alternatives',
      'Expecting automatic click suppression',
    ],
    importExample: importLine('useOnLongPress'),
    signature: `function useOnLongPress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: UseOnLongPressHandler,
  options?: UseOnLongPressOptions,
): void`,
    parameters: [
      { name: 'ref', description: 'Press target element ref.' },
      {
        name: 'handler',
        description: 'Called after delay when press completes.',
      },
      {
        name: 'options.delay',
        description: 'Milliseconds before long-press fires.',
      },
      {
        name: 'options.distanceThreshold',
        description: 'Movement beyond threshold cancels the press.',
      },
    ],
    returnValues: '`void`',
    defaults: 'delay: 500, distanceThreshold: 10, enabled: true',
    runtimeBehavior: [
      'Pointer Events only',
      'Does not suppress subsequent click events',
      'Optional onRelease callback with duration/distance',
    ],
    ssrBehavior: 'Safe during SSR. Pointer listeners attach in effects.',
    strictModeBehavior:
      'Timers and listeners cleaned up on unmount; no duplicate long-press timers.',
    accessibility:
      'Examples provide click/keyboard alternatives for every meaningful action. The hook does not expose progress state or ARIA attributes.',
    limitations: [
      'Pointer Events only',
      'No built-in progress UI',
      'Does not prevent default click',
    ],
    relatedHooks: ['useMousePressed', 'useOnClickOutside'],
  },

  useOnStartTyping: {
    name: 'useOnStartTyping',
    category: 'Events',
    purpose:
      'Detects typing intent outside editable fields to focus search or open palettes.',
    overview:
      'Listens for keydown outside editable targets using configurable character validation.',
    whenToUse: [
      'Search-focus on first printable key',
      'Command palette entry from document keyboard activity',
    ],
    whenNotToUse: [
      'IME composition reconstruction',
      'Global shortcuts with modifiers without custom validators',
    ],
    importExample: importLine('useOnStartTyping'),
    signature: `function useOnStartTyping(
  handler: UseOnStartTypingHandler,
  options?: UseOnStartTypingOptions,
): void`,
    parameters: [
      {
        name: 'handler',
        description:
          'Called with the KeyboardEvent when typing intent matches.',
      },
      {
        name: 'options.isEditable',
        description: 'Custom editable-element detector.',
      },
      {
        name: 'options.isValidCharacter',
        description: 'Defaults to ASCII alphanumeric keys.',
      },
    ],
    returnValues: '`void`',
    defaults: 'enabled: true; ASCII alphanumeric validator by default',
    runtimeBehavior: [
      'Uses keydown, not IME reconstruction',
      'Does not call preventDefault',
      'Blocks when focus is in editable fields by default',
    ],
    ssrBehavior: 'Safe during SSR. Listeners are effect-only.',
    strictModeBehavior: 'Listener cleanup on unmount; no duplicate handlers.',
    accessibility:
      'Examples show search and palette flows without trapping focus. Consumers should expose keyboard paths to the same destinations.',
    limitations: [
      'keydown-based; IME limitations',
      'Default ASCII-only character filter',
      'Does not prevent default browser behavior',
    ],
    relatedHooks: ['useOnKeyStroke', 'useFocus'],
  },

  useEventBus: {
    name: 'useEventBus',
    category: 'Events',
    purpose:
      'Typed in-memory event bus with owner-scoped subscriptions for the same realm.',
    overview:
      'Synchronous pub/sub keyed by string, number, or symbol with stable controls and channel reset.',
    whenToUse: [
      'Sibling component communication without prop drilling',
      'Feature-local event channels in one SPA bundle',
    ],
    whenNotToUse: [
      'Cross-tab, persistence, or network delivery',
      'Authorization or trusted event validation',
    ],
    importExample: importLine('useEventBus'),
    signature: `function useEventBus<T = unknown, P = undefined>(
  key: EventBusIdentifier<T, P>,
): UseEventBusReturn<T, P>`,
    parameters: [
      {
        name: 'key',
        description: 'string | number | symbol channel identifier.',
      },
    ],
    returnValues: '`{ on, once, off, emit, reset }` — stable methods',
    defaults: 'N/A (channel keyed by argument)',
    runtimeBehavior: [
      'Owner-scoped subscriptions; reset clears whole channel',
      'Snapshot iteration; once listeners unsubscribe before invoke',
      'Emit alone does not cause React rerenders',
    ],
    ssrBehavior:
      'Methods exist; no-ops until mount. Avoid emit/subscribe during render.',
    strictModeBehavior:
      'Unmount removes owner subscriptions; duplicate on/once registration is idempotent per owner.',
    accessibility:
      'Examples use labeled buttons and live status regions for demo timelines only. The bus has no a11y semantics.',
    limitations: [
      'Same realm / package copy only',
      'No persistence, replay, buffering, or cross-tab delivery',
      'Listener errors collected and rethrown after dispatch',
    ],
    relatedHooks: ['useDebounceFn', 'useLocalStorage'],
  },

  useElementByPoint: {
    name: 'useElementByPoint',
    category: 'Elements',
    purpose:
      'Reactive element hit-testing at client (viewport) coordinates via elementFromPoint.',
    overview:
      'Returns the topmost element or ancestor chain at x/y with optional animation-frame scheduling and pause/resume controls.',
    whenToUse: [
      'Pointer-driven inspectors and hover-free hit testing',
      'Custom iframe document hit testing with explicit document option',
    ],
    whenNotToUse: [
      'Page/document coordinates without conversion',
      'Automatic layout-change polling without calling update()',
    ],
    importExample: importLine('useElementByPoint'),
    signature: `function useElementByPoint(
  options: UseElementByPointOptions<Multiple extends boolean>,
): UseElementByPointReturn<Multiple>`,
    parameters: [
      {
        name: 'options.x / options.y',
        description: 'Client viewport coordinates (required).',
      },
      {
        name: 'options.multiple',
        description: 'Use elementsFromPoint chain when true.',
      },
      {
        name: 'options.scheduler',
        description: "'animationFrame' (default) or 'sync'.",
      },
      {
        name: 'options.document',
        description: 'Optional custom Document (e.g. iframe contentDocument).',
      },
    ],
    returnValues: '{ element, isSupported, isPaused, update, pause, resume }',
    defaults: '{ multiple: false, enabled: true, scheduler: "animationFrame" }',
    runtimeBehavior: [
      'Non-finite coordinates skip lookup and clear result',
      'update() forces immediate lookup; no-op while paused',
      'Skips state updates when element identity unchanged',
    ],
    ssrBehavior:
      'Returns isSupported: false and empty result during SSR; no RAF or hit testing.',
    strictModeBehavior:
      'RAF/generation counters cancelled on cleanup; no stale frames after remount.',
    accessibility:
      'Examples keep overlays pointer-events: none so they do not affect hit testing. The hook does not expose accessible names of detected elements.',
    limitations: [
      'Client coordinates only',
      'elementsFromPoint includes ancestor chain',
      'Custom document must exist and be same-origin-accessible',
    ],
    relatedHooks: ['useMouse', 'useElementHover', 'usePageLeave'],
  },

  useElementHover: {
    name: 'useElementHover',
    category: 'Elements',
    purpose:
      'Tracks whether the mouse pointer is hovering a referenced element.',
    overview:
      'Native mouseenter/mouseleave with optional enter/leave delays and removal-triggered leave.',
    whenToUse: [
      'Boolean hover state for tooltips and panels tied to mouse presence',
      'Delayed enter/leave to reduce flicker',
    ],
    whenNotToUse: [
      'Keyboard focus or touch hover equivalence',
      'CSS :hover replacement for essential information',
    ],
    importExample: importLine('useElementHover'),
    signature: `function useElementHover<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseElementHoverOptions,
): boolean`,
    parameters: [
      { name: 'ref', description: 'Observed element ref.' },
      {
        name: 'options.delayEnter / delayLeave',
        description: 'Milliseconds before state transitions.',
      },
      {
        name: 'options.triggerOnRemoval',
        description: 'Start leave transition when target is removed from DOM.',
      },
    ],
    returnValues: '`boolean` — false initially and during SSR',
    defaults:
      '{ enabled: true, delayEnter: 0, delayLeave: 0, triggerOnRemoval: false }',
    runtimeBehavior: [
      'Mouse hover only via native enter/leave',
      'Target replacement resets hover immediately',
      'Optional MutationObserver for removal leave',
    ],
    ssrBehavior: 'Returns false; no listeners, timers, or observers.',
    strictModeBehavior:
      'Listeners/timers/observers cleaned on unmount; no duplicate hover timers.',
    accessibility:
      'Examples keep essential content available without hover and document that keyboard focus does not affect the boolean. Consumers must not hide critical information behind hover-only UI.',
    limitations: [
      'Mouse hover only — not touch or keyboard focus',
      'No public pending-state API',
      'Re-enabling does not infer pointer already over target',
    ],
    relatedHooks: ['useFocusWithin', 'useMouse', 'useOnElementRemoval'],
  },

  useFocus: {
    name: 'useFocus',
    category: 'Elements',
    purpose:
      'Tracks direct native focus on a referenced element with imperative focus/blur.',
    overview:
      'Compares activeElement to the target for direct focus only, with optional :focus-visible matching.',
    whenToUse: [
      'Command buttons that programmatically focus specific controls',
      'Direct focus state for a single field or button',
    ],
    whenNotToUse: [
      'Container focus-within detection — use useFocusWithin',
      'Auto-focus on every Docs page load without user intent',
    ],
    importExample: importLine('useFocus', 'UseFocusReturn'),
    signature: `function useFocus<T extends UseFocusTarget>(
  ref: RefObject<T | null>,
  options?: UseFocusOptions,
): UseFocusReturn`,
    parameters: [
      { name: 'ref', description: 'Focusable element ref.' },
      {
        name: 'options.initialValue',
        description: 'Seeds focused state once (use carefully in Docs).',
      },
      {
        name: 'options.focusVisible',
        description: 'Require :focus-visible match when true.',
      },
      {
        name: 'options.preventScroll',
        description: 'Passed to native focus().',
      },
    ],
    returnValues: '{ focused, focus, blur }',
    defaults:
      '{ enabled: true, initialValue: false, focusVisible: false, preventScroll: false }',
    runtimeBehavior: [
      'Descendant focus does not count as direct focus',
      'Disabling resets hook state without blurring the element',
      'Ref sync after commits',
    ],
    ssrBehavior:
      'Returns focused: false; focus/blur are safe no-ops until mount.',
    strictModeBehavior: 'Focus listeners removed on cleanup.',
    accessibility:
      'Examples keep visible focus rings and avoid auto-focus on Docs load. The hook does not implement focus traps.',
    limitations: [
      'Direct focus only, not focus-within',
      'Disabling does not blur the browser element',
    ],
    relatedHooks: ['useFocusWithin', 'useOnKeyStroke'],
  },

  useFocusWithin: {
    name: 'useFocusWithin',
    category: 'Elements',
    purpose:
      'Tracks whether focus is inside a referenced container via focusin/focusout.',
    overview:
      'Container-level focus tracking using bubbling focus events on the subtree.',
    whenToUse: [
      'Form-level focus styling or validation summaries',
      'Detecting when any field inside a panel is focused',
    ],
    whenNotToUse: [
      'Portaled controls outside the DOM subtree',
      'Focus trapping or modal behavior by itself',
    ],
    importExample: importLine('useFocusWithin'),
    signature: `function useFocusWithin<T extends Element>(
  ref: RefObject<T | null>,
  options?: UseFocusWithinOptions,
): boolean`,
    parameters: [
      { name: 'ref', description: 'Container element ref.' },
      {
        name: 'options.enabled',
        description: 'When false, resets to false and detaches listeners.',
      },
    ],
    returnValues: '`boolean`',
    defaults: '{ enabled: true }',
    runtimeBehavior: [
      'Uses native focusin/focusout on the container',
      'Portals outside subtree do not count',
      'Does not move or trap focus',
    ],
    ssrBehavior: 'Returns false during SSR.',
    strictModeBehavior: 'Listeners removed on effect cleanup.',
    accessibility:
      'Examples use labeled fields and outside focus controls. The hook does not manage roving tabindex or aria-activedescendant.',
    limitations: [
      'DOM containment only — portals excluded',
      'Not a focus trap or modal primitive',
    ],
    relatedHooks: ['useFocus', 'useOnKeyStroke'],
  },

  useTextSelection: {
    name: 'useTextSelection',
    category: 'Elements',
    purpose:
      'Observes document selection text, ranges, and client rectangles for a chosen window.',
    overview:
      'Listens to selectionchange and exposes selected text, range count, and rectangle list.',
    whenToUse: [
      'Selection inspectors and copy helpers',
      'Tracking highlight rectangles for custom UI',
    ],
    whenNotToUse: [
      'Cross-origin iframe selections without the correct window',
      'Expecting automatic clipboard write',
    ],
    importExample: importLine('useTextSelection'),
    signature: `function useTextSelection(
  options?: UseTextSelectionOptions,
): UseTextSelectionReturn`,
    parameters: [
      {
        name: 'options.window',
        description: 'Browsing context to observe; null observes nothing.',
      },
      {
        name: 'options.enabled',
        description: 'When false, detaches and clears state.',
      },
    ],
    returnValues: '{ text, rangeCount, ranges, rectangles, isEmpty, clear }',
    defaults: '{ enabled: true, window: defaultView when available }',
    runtimeBehavior: [
      'First render is empty until selectionchange',
      'clear() removes all ranges in the observed document',
    ],
    ssrBehavior: 'Empty selection state during SSR.',
    strictModeBehavior: 'selectionchange listener cleaned on unmount.',
    accessibility:
      'Examples provide selectable text and empty-state guidance. The hook does not expose selection to screen readers; consumers should not rely on selection alone for critical actions.',
    limitations: [
      'Observes one window at a time',
      'No clipboard integration',
      'Collapsed selections may have zero rectangles',
    ],
    relatedHooks: ['useEventListener', 'useOnClickOutside', 'useElementHover'],
  },

  useMouse: {
    name: 'useMouse',
    category: 'Input',
    purpose:
      'Tracks mouse and optional touch coordinates with page/client/screen modes.',
    overview:
      'High-frequency coordinate state from mousemove/touch events with optional custom extractors and filters.',
    whenToUse: [
      'Cursor trackers and element-relative coordinates',
      'Drag overlays with custom eventFilter throttling',
    ],
    whenNotToUse: [
      'Unified Pointer Events abstraction',
      'Announcing every mousemove to assistive tech without throttling',
    ],
    importExample: importLine('useMouse'),
    signature: `function useMouse<T extends EventTarget = Window>(
  target?: RefObject<T | null> | T | null,
  options?: UseMouseOptions,
): UseMouseReturn`,
    parameters: [
      {
        name: 'target',
        description: 'Window, element ref, or element; defaults to window.',
      },
      {
        name: 'options.type',
        description: 'page | client | screen | movement coordinate mode.',
      },
      {
        name: 'options.touch',
        description: 'Include touch events when true.',
      },
      {
        name: 'options.eventFilter',
        description: 'Consumer-owned scheduler/throttle wrapper.',
      },
    ],
    returnValues: '{ x, y, sourceType, elementX, elementY, ... }',
    defaults: 'type: "page", touch: false, enabled: true',
    runtimeBehavior: [
      'Mouse and optional touch — not Pointer Events unified',
      'Element-relative coords need custom extractor',
      'High-frequency updates; consider eventFilter',
    ],
    ssrBehavior: 'Initial coordinates from options.initialValue or zeroed.',
    strictModeBehavior: 'Listeners removed on cleanup.',
    accessibility:
      'Examples mark decorative markers aria-hidden and use restrained live regions. The hook does not provide accessible cursor position announcements.',
    limitations: [
      'Not Pointer Events unified',
      'Element-relative requires custom extractor',
      'High-frequency updates may need throttling',
    ],
    relatedHooks: ['useMousePressed', 'useElementByPoint', 'useParallax'],
  },

  useMousePressed: {
    name: 'useMousePressed',
    category: 'Input',
    purpose:
      'Aggregate mouse/touch/drag press lifecycle with global release tracking.',
    overview:
      'Single boolean press state with optional target scoping and capture-phase listeners.',
    whenToUse: [
      'Press-and-hold pads and drag initiation detection',
      'Global release when pointer leaves the target',
    ],
    whenNotToUse: [
      'Per-button mouse state or keyboard activation',
      'Accessible button semantics without a real button',
    ],
    importExample: importLine('useMousePressed'),
    signature: `function useMousePressed<T extends EventTarget = Window>(
  target?: RefObject<T | null> | T | null,
  options?: UseMousePressedOptions,
): boolean`,
    parameters: [
      {
        name: 'target',
        description: 'Optional scoped target; default window.',
      },
      {
        name: 'options.mouse',
        description: 'Include mouse events when true.',
      },
      {
        name: 'options.touch',
        description: 'Include touch events when true.',
      },
      {
        name: 'options.capture',
        description: 'Register capture-phase listeners when true.',
      },
    ],
    returnValues: '`boolean` press state',
    defaults: 'mouse: true, touch: true, drag: true, capture: false',
    runtimeBehavior: [
      'Release tracked globally on the owning window',
      'One aggregate boolean — not per-button state',
    ],
    ssrBehavior: 'Returns false during SSR.',
    strictModeBehavior: 'Global and target listeners cleaned on unmount.',
    accessibility:
      'Examples explain global release behavior. Generic press pads are not keyboard buttons; pair with real controls for essential actions.',
    limitations: [
      'Aggregate boolean only',
      'Release via owning window',
      'Not keyboard activation',
    ],
    relatedHooks: ['useOnLongPress', 'useMouse'],
  },

  useParallax: {
    name: 'useParallax',
    category: 'Input',
    purpose:
      'Normalized roll/tilt from mouse movement and optional device orientation for consumer-owned transforms.',
    overview:
      'Returns normalized offset values; consumers apply CSS transforms and reduced-motion rules.',
    whenToUse: [
      'Layered scenes with depth multipliers',
      'Mouse-normalized tilt on contained stages',
    ],
    whenNotToUse: [
      'Built-in CSS transform application',
      'Automatic orientation permission prompts in Docs',
    ],
    importExample: importLine('useParallax'),
    signature: `function useParallax<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
  options?: UseParallaxOptions,
): UseParallaxReturn`,
    parameters: [
      { name: 'ref', description: 'Reference element for bounds/source.' },
      {
        name: 'options.source',
        description: 'mouse | orientation | both.',
      },
      {
        name: 'options.multiplier',
        description: 'Sensitivity scalar for output values.',
      },
    ],
    returnValues: '{ roll, tilt, source, ... }',
    defaults: 'source: "mouse", multiplier: 1, enabled: true',
    runtimeBehavior: [
      'Does not write CSS or request orientation permission',
      'Consumers own transforms and reduced-motion behavior',
    ],
    ssrBehavior: 'Neutral values during SSR.',
    strictModeBehavior: 'Listeners/device orientation cleaned on unmount.',
    accessibility:
      'Examples respect prefers-reduced-motion. The hook does not disable motion automatically in consumer apps.',
    limitations: [
      'Values only — no CSS application',
      'Orientation requires permission and limited support',
      'No sensor smoothing',
    ],
    relatedHooks: ['useMouse', 'useScroll'],
  },

  useScroll: {
    name: 'useScroll',
    category: 'Sensors',
    purpose:
      'Scroll position, arrival edges, direction, and scrolling-state for element, window, and document targets.',
    overview:
      'Scroll-metric tracking with measure/setX/setY controls, throttling, and mutation observation options.',
    whenToUse: [
      'Contained scroll dashboards and minimaps',
      'Detecting arrival at scroll edges for infinite feeds',
    ],
    whenNotToUse: [
      'Expecting automatic smooth-scroll state sync without measure()',
      'Page-level scroll in Storybook Docs without iframe isolation',
    ],
    importExample: importLine('useScroll'),
    signature: `function useScroll<T extends UseScrollTarget = HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseScrollOptions,
): UseScrollReturn`,
    parameters: [
      { name: 'ref', description: 'Element, window, or document target ref.' },
      {
        name: 'options.throttle',
        description: 'Ms throttle for scroll handler.',
      },
      {
        name: 'options.offset',
        description: 'Edge arrival threshold pixels.',
      },
      {
        name: 'options.observeMutation',
        description: 'Re-measure when content mutates.',
      },
    ],
    returnValues:
      '{ x, y, isScrolling, arrivedState, directions, setX, setY, measure, ... }',
    defaults: 'throttle: 0, offset: { top: 0, ... }, enabled: true',
    runtimeBehavior: [
      'Imperative smooth scroll may need measure() or scroll events',
      'Ref assignment requires later commit before attachment',
    ],
    ssrBehavior: 'Zeroed/inactive state during SSR.',
    strictModeBehavior: 'Scroll listeners and timers cleaned on unmount.',
    accessibility:
      'Examples use labeled scroll regions and restrained live updates. The hook does not manage focus or announcements.',
    limitations: [
      'Scroll-metric based',
      'Imperative ref assignment needs commit signal',
      'Smooth scroll does not auto-sync',
    ],
    relatedHooks: ['useInfiniteScroll', 'useScrollLock'],
  },

  useScrollLock: {
    name: 'useScrollLock',
    category: 'Sensors',
    purpose:
      'Locks scrolling on element, window, or document via inline overflow: hidden.',
    overview:
      'Multi-owner registry with snapshot/restore of inline overflow styles.',
    whenToUse: [
      'Modal dialogs with contained scrollers',
      'Temporary page lock while overlay open',
    ],
    whenNotToUse: [
      'Focus trapping or scroll event suppression alone',
      'iOS body lock without consumer testing',
    ],
    importExample: importLine('useScrollLock', 'UseScrollLockReturn'),
    signature: `function useScrollLock<T extends UseScrollLockTarget = HTMLElement>(
  ref: RefObject<T | null>,
  initialLocked?: boolean,
): UseScrollLockReturn`,
    parameters: [
      { name: 'ref', description: 'Element, window, or document target.' },
      {
        name: 'initialLocked',
        description: 'Seeds requested lock state once (default false).',
      },
    ],
    returnValues: '{ isLocked, lock, unlock, toggle }',
    defaults: 'initialLocked = false',
    runtimeBehavior: [
      'Applies overflow: hidden on resolved scroll root',
      'Multiple owners share one registry; restore when final owner releases',
      'Does not suppress scroll/wheel events or trap focus',
    ],
    ssrBehavior: 'Returns requested isLocked without style writes during SSR.',
    strictModeBehavior:
      'Ownership released on unmount; overflow restored when last owner releases.',
    accessibility:
      'Modal examples include accessible dialog markup in Storybook only. The hook does not trap focus or label locked regions.',
    limitations: [
      'overflow: hidden only',
      'No focus trap',
      'Mobile Safari body locking varies',
    ],
    relatedHooks: ['useScroll', 'useFullscreen'],
  },

  useInfiniteScroll: {
    name: 'useInfiniteScroll',
    category: 'Sensors',
    purpose:
      'Edge-triggered loading callback for element, window, and document scroll targets.',
    overview:
      'Invokes loadMore when scroll metrics cross a distance threshold; consumers own data fetching.',
    whenToUse: [
      'Infinite lists with canLoadMore guards',
      'Horizontal and vertical edge detection',
    ],
    whenNotToUse: [
      'Built-in data fetching or scroll anchoring',
      'Focus management for long feeds',
    ],
    importExample: importLine('useInfiniteScroll'),
    signature: `function useInfiniteScroll<T extends UseInfiniteScrollTarget>(
  ref: RefObject<T | null>,
  loadMore: () => void | Promise<void>,
  options?: UseInfiniteScrollOptions,
): UseInfiniteScrollReturn`,
    parameters: [
      { name: 'ref', description: 'Scroll container or window/document ref.' },
      { name: 'loadMore', description: 'Async-safe load callback.' },
      {
        name: 'options.distance',
        description: 'Pixels from edge before triggering.',
      },
      {
        name: 'options.canLoadMore',
        description: 'Guard to stop further loads.',
      },
      {
        name: 'options.direction',
        description: 'bottom | top | left | right.',
      },
    ],
    returnValues: '{ isLoading, reset, ... }',
    defaults: 'distance: 0, direction: "bottom", enabled: true',
    runtimeBehavior: [
      'Scroll-metric based triggering',
      'Consumers own items, errors, and anchoring',
      'reset() restores internal load state',
    ],
    ssrBehavior: 'Inactive during SSR.',
    strictModeBehavior: 'Listeners/state cleaned on unmount.',
    accessibility:
      'Examples add aria-busy and keyboard-focusable regions for demo purposes only. The hook does not announce loads.',
    limitations: [
      'No built-in fetching or anchoring',
      'Consumers own item state',
    ],
    relatedHooks: ['useScroll', 'useEventListener'],
  },

  usePageLeave: {
    name: 'usePageLeave',
    category: 'Sensors',
    purpose:
      'Mouse-boundary leave state for a browsing context (mouseout with relatedTarget == null).',
    overview:
      'Tracks whether the pointer has left the window viewport boundary — not tab close or visibility.',
    whenToUse: [
      'Exit-intent education demos with ethical UX',
      'Boundary leave indicators in isolated iframe windows',
    ],
    whenNotToUse: [
      'Tab close or document.hidden visibility',
      'Touch-only primary input without caveats',
    ],
    importExample: importLine('usePageLeave'),
    signature: `function usePageLeave(
  options?: UsePageLeaveOptions,
): UsePageLeaveReturn`,
    parameters: [
      {
        name: 'options.window',
        description: 'Browsing context to observe.',
      },
      {
        name: 'options.enabled',
        description: 'When false, resets and detaches.',
      },
      {
        name: 'options.initialValue',
        description: 'Seed hasLeft once.',
      },
    ],
    returnValues: '{ hasLeft, ... }',
    defaults: '{ enabled: true, initialValue: false }',
    runtimeBehavior: [
      'mouseout with relatedTarget == null on the window',
      'Does not fire for internal movement between elements',
    ],
    ssrBehavior: 'Conservative false/idle during SSR.',
    strictModeBehavior: 'mouseout listener removed on cleanup.',
    accessibility:
      'Examples avoid fake urgency and beforeunload traps. The hook does not manage focus or announcements.',
    limitations: [
      'Mouse boundary only',
      'Touch-only devices may never update',
      'Not visibility or navigation signal',
    ],
    relatedHooks: ['useElementHover', 'useEventListener'],
  },

  useDevicesList: {
    name: 'useDevicesList',
    category: 'Media',
    purpose:
      'Enumerates cameras, microphones, and speakers with explicit permission workflow.',
    overview:
      'Wraps enumerateDevices with optional permission request and devicechange listening.',
    whenToUse: [
      'Device pickers before getUserMedia',
      'Reacting to hardware connect/disconnect',
    ],
    whenNotToUse: [
      'Automatic permission prompts on mount in Docs',
      'Assuming permissionGranted reflects OS-wide revocation',
    ],
    importExample: importLine('useDevicesList', 'UseDevicesListReturn'),
    signature: `function useDevicesList(
  options?: UseDevicesListOptions,
): UseDevicesListReturn`,
    parameters: [
      {
        name: 'options.requestPermissions',
        description: 'When true, may prompt on mount (default false).',
      },
      {
        name: 'options.onUpdated',
        description: 'Callback after device list refresh.',
      },
    ],
    returnValues:
      '{ devices, audioInputs, videoInputs, audioOutputs, permissionGranted, requestPermissions, ... }',
    defaults: '{ requestPermissions: false }',
    runtimeBehavior: [
      'Lists devices only — does not acquire streams',
      'Stops temporary permission tracks immediately',
      'permissionGranted is hook-local state',
    ],
    ssrBehavior: 'Empty device lists during SSR.',
    strictModeBehavior: 'devicechange listener cleaned on unmount.',
    accessibility:
      'Examples use explicit Allow-access buttons. The hook does not label devices; consumers should expose human-readable labels in UI.',
    limitations: [
      'Enumeration only',
      'permissionGranted is hook-local',
      'Label availability depends on prior permission',
    ],
    relatedHooks: ['useUserMedia', 'useDisplayMedia'],
  },

  useDisplayMedia: {
    name: 'useDisplayMedia',
    category: 'Media',
    purpose:
      'Screen/window capture via getDisplayMedia with explicit start/stop and track cleanup.',
    overview:
      'Owns captured MediaStream lifecycle, stopping tracks on stop, unmount, and browser-ended sharing.',
    whenToUse: [
      'Screen sharing with user-gesture start()',
      'Preview attached via video.srcObject',
    ],
    whenNotToUse: [
      'Auto-start capture in documentation',
      'Camera/mic capture — use useUserMedia',
    ],
    importExample: importLine('useDisplayMedia', 'UseDisplayMediaReturn'),
    signature: `function useDisplayMedia(
  options?: UseDisplayMediaOptions,
): UseDisplayMediaReturn`,
    parameters: [
      {
        name: 'options.enabled',
        description: 'Declarative auto-start when true (default false).',
      },
      {
        name: 'options.constraints',
        description: 'DisplayMediaStreamConstraints.',
      },
    ],
    returnValues:
      '{ stream, isActive, isLoading, error, start, stop, isSupported }',
    defaults: 'enabled: false',
    runtimeBehavior: [
      'Owns streams; stops tracks on stop/unmount/browser-ended',
      'Recommends imperative start() from user gesture',
    ],
    ssrBehavior: 'Idle unsupported state during SSR.',
    strictModeBehavior: 'Tracks stopped and listeners removed on cleanup.',
    accessibility:
      'Examples use labeled Start sharing buttons. The hook does not describe shared content to assistive tech.',
    limitations: [
      'Browser picker required',
      'No automatic privacy redaction',
      'Support varies by browser',
    ],
    relatedHooks: ['useUserMedia', 'useDevicesList'],
  },

  useUserMedia: {
    name: 'useUserMedia',
    category: 'Media',
    purpose:
      'Camera/microphone capture with owned streams, constraint auto-switch, and track-ended cleanup.',
    overview:
      'Manages getUserMedia lifecycle with start/stop/restart and deep constraint comparison.',
    whenToUse: [
      'Camera/mic previews with explicit start()',
      'Device selection composed with useDevicesList',
    ],
    whenNotToUse: [
      'Auto-start on Docs load',
      'Audio level analysis or recording upload',
    ],
    importExample: importLine('useUserMedia', 'UseUserMediaReturn'),
    signature: `function useUserMedia(
  options?: UseUserMediaOptions,
): UseUserMediaReturn`,
    parameters: [
      {
        name: 'options.enabled',
        description: 'Declarative auto-start (default false).',
      },
      {
        name: 'options.autoSwitch',
        description: 'Reacquire when constraints change while active.',
      },
      {
        name: 'options.constraints',
        description: 'MediaStreamConstraints.',
      },
    ],
    returnValues:
      '{ stream, isActive, isLoading, error, start, stop, restart, isSupported }',
    defaults:
      'enabled: false, autoSwitch: true, constraints: { video: true, audio: false }',
    runtimeBehavior: [
      'Atomic replacement keeps old stream if new request fails',
      'Track ended clears stream when no live tracks remain',
    ],
    ssrBehavior: 'Idle unsupported during SSR.',
    strictModeBehavior: 'Tracks stopped on unmount cleanup.',
    accessibility:
      'Examples use muted autoplay previews with labeled Start camera. Consumers must provide consent UX and alternatives.',
    limitations: [
      'Secure context and gesture restrictions',
      'No recording or audio analysis',
      'Constraint requests not guaranteed settings',
    ],
    relatedHooks: ['useDevicesList', 'useDisplayMedia'],
  },

  useEyeDropper: {
    name: 'useEyeDropper',
    category: 'Media',
    purpose:
      'Imperative native EyeDropper color sampling (user-gesture open(), six-digit opaque sRGB).',
    overview:
      'Wraps window.EyeDropper when supported; returns hex results from open().',
    whenToUse: [
      'Design tools with explicit Open picker buttons',
      'Theme token pickers in secure contexts',
    ],
    whenNotToUse: [
      'Auto-open on mount or unsupported browsers without fallback',
      'Continuous sampling or element-only regions',
    ],
    importExample: importLine('useEyeDropper'),
    signature: `function useEyeDropper(
  options?: UseEyeDropperOptions,
): UseEyeDropperReturn`,
    parameters: [
      {
        name: 'options.initialValue',
        description: 'Seed hex string when supported.',
      },
      {
        name: 'options.enabled',
        description: 'When false, open() rejects/disabled.',
      },
    ],
    returnValues: '{ hex, isSupported, isPicking, error, open, reset, ... }',
    defaults: 'enabled: true',
    runtimeBehavior: [
      'open() must be called from user gesture',
      'Samples full screen via browser UI',
      'Opaque six-digit sRGB only',
    ],
    ssrBehavior: 'Unsupported idle state during SSR.',
    strictModeBehavior:
      'In-flight open promises handled; no duplicate pickers.',
    accessibility:
      'Examples label Open buttons and show support badges. Native picker UI is platform-controlled; hook does not expose a11y tree for sampling.',
    limitations: [
      'Limited browser support',
      'Secure context typically required',
      'No alpha channel or palette persistence',
    ],
    relatedHooks: ['useBase64', 'useFavicon'],
  },

  useLocalStorage: {
    name: 'useLocalStorage',
    category: 'State and storage',
    purpose:
      'Persist values in localStorage with SSR-safe hydration, serializers, and same-document sync.',
    overview:
      'React state backed by localStorage with mergeDefaults, cross-tab StorageEvent option, and malformed fallback.',
    whenToUse: [
      'User preferences and non-secret client persistence',
      'Cross-tab sync with storage events',
    ],
    whenNotToUse: [
      'Secrets, tokens, or security-sensitive data',
      'Server-authoritative session state',
    ],
    importExample: importLine('useLocalStorage'),
    signature: `function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options?: UseLocalStorageOptions<T>,
): [T, SetValue<T>, Remove]`,
    parameters: [
      { name: 'key', description: 'Storage key string.' },
      { name: 'initialValue', description: 'Default when missing/malformed.' },
      {
        name: 'options.serializer',
        description: 'Custom read/write pair.',
      },
      {
        name: 'options.listenToStorageEvents',
        description: 'Sync other tabs/windows when true.',
      },
    ],
    returnValues:
      '[value, setValue, remove] — setValue supports functional updates',
    defaults: 'Automatic JSON/Date/Map/Set serializers when applicable',
    runtimeBehavior: [
      'Reads storage only after mount',
      'remove() deletes; reset() writes defaults',
      'Malformed payloads fall back locally without auto-delete',
    ],
    ssrBehavior: 'Returns initialValue during SSR; hydrates after mount.',
    strictModeBehavior:
      'Storage listeners removed on cleanup; no duplicate cross-tab handlers.',
    accessibility:
      'Examples use labeled form controls. The hook does not announce persistence to screen readers.',
    limitations: [
      'Not encryption',
      'Same-origin storage quotas apply',
      'Cross-tab sync requires listenToStorageEvents',
    ],
    relatedHooks: ['useSessionStorage', 'useCookies', 'useUrlSearchParams'],
  },

  useSessionStorage: {
    name: 'useSessionStorage',
    category: 'State and storage',
    purpose:
      'Tab-scoped sessionStorage persistence with the same hydration-safe control surface as useLocalStorage.',
    overview:
      'sessionStorage-backed state surviving reloads in the same browsing context only.',
    whenToUse: [
      'Wizard/checkout drafts for the current tab',
      'Temporary workspace state',
    ],
    whenNotToUse: [
      'Cross-tab durable storage',
      'Secrets or authentication tokens',
    ],
    importExample: importLine('useSessionStorage'),
    signature: `function useSessionStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options?: UseSessionStorageOptions<T>,
): [T, SetValue<T>, Remove]`,
    parameters: [
      { name: 'key', description: 'sessionStorage key.' },
      { name: 'initialValue', description: 'Fallback default.' },
      { name: 'options', description: 'Serializers, mergeDefaults, events.' },
    ],
    returnValues: '[value, setValue, remove]',
    defaults: 'Same serializer defaults as useLocalStorage',
    runtimeBehavior: [
      'Survives reload in same tab/context',
      'Not shared across ordinary separate tabs',
    ],
    ssrBehavior: 'initialValue during SSR; hydrates after mount.',
    strictModeBehavior: 'Listeners cleaned on unmount.',
    accessibility:
      'Examples label multi-step flows. Hook does not expose storage state to AT.',
    limitations: [
      'Tab/context scoped',
      'Not durable cross-tab store',
      'Not encryption',
    ],
    relatedHooks: ['useLocalStorage', 'useCookies'],
  },

  useCookies: {
    name: 'useCookies',
    category: 'State and storage',
    purpose:
      'Reactive document.cookie manager with SSR injection, attributes, and observation.',
    overview:
      'Parse/set/delete cookies with optional JSON encoding, polling, and CookieStore observation when available.',
    whenToUse: [
      'Client-readable preference cookies',
      'Theme/locale flags not marked HttpOnly',
    ],
    whenNotToUse: [
      'HttpOnly authentication cookies',
      'Secrets or session tokens in client JS',
    ],
    importExample: importLine('useCookies'),
    signature: `function useCookies<T extends CookieDict = CookieDict>(
  options?: UseCookiesOptions<T>,
): UseCookiesReturn<T>`,
    parameters: [
      {
        name: 'options.initialCookies',
        description: 'SSR injection string or object.',
      },
      {
        name: 'options.doNotParse',
        description: 'Keep values as raw strings.',
      },
      {
        name: 'options.poll',
        description: 'Polling interval for environments without events.',
      },
    ],
    returnValues: '[cookies, setCookie, removeCookie, ...]',
    defaults: 'JSON parse when doNotParse false',
    runtimeBehavior: [
      'Cannot read HttpOnly cookies',
      'Deletion requires matching path/domain',
    ],
    ssrBehavior: 'Requires explicit initialCookies for SSR reads.',
    strictModeBehavior: 'Poll timers and listeners cleaned on unmount.',
    accessibility:
      'Examples show cookie tables for transparency. Hook does not manage consent banners.',
    limitations: [
      'No HttpOnly access',
      'Assignment success is not acceptance proof',
      'Size limits per browser',
    ],
    relatedHooks: ['useLocalStorage', 'useSessionStorage', 'useJwt'],
  },

  useUrlSearchParams: {
    name: 'useUrlSearchParams',
    category: 'State and storage',
    purpose:
      'Immutable URL search-parameter snapshots for history, hash, and hash-params modes.',
    overview:
      'Read/write query state with push/replace, filters, and explicit refresh for external history changes.',
    whenToUse: [
      'Shareable filter/query state in SPAs',
      'Hash-route query segments',
    ],
    whenNotToUse: [
      'Router library integration or schema validation built-in',
      'Cross-tab sync',
    ],
    importExample: importLine('useUrlSearchParams'),
    signature: `function useUrlSearchParams<T extends QueryDict = QueryDict>(
  options?: UseUrlSearchParamsOptions<T>,
): UseUrlSearchParamsReturn<T>`,
    parameters: [
      {
        name: 'options.mode',
        description: 'history | hash | hash-params.',
      },
      {
        name: 'options.write',
        description: 'Allow local mutations when true.',
      },
      {
        name: 'options.window',
        description: 'Custom browsing context (e.g. iframe).',
      },
    ],
    returnValues: '{ params, set, reset, refresh, ... }',
    defaults: 'mode: "history", write: true',
    runtimeBehavior: [
      'Immutable snapshots per update',
      'External pushState needs refresh()',
      'Does not coerce types on read',
    ],
    ssrBehavior: 'Use initialValues for SSR; window effects after mount.',
    strictModeBehavior: 'Popstate/hash listeners cleaned on unmount.',
    accessibility:
      'Examples use labeled editors in isolated iframes. Hook does not expose URL changes to AT.',
    limitations: [
      'One URL component per mode',
      'No router integration',
      'No cross-tab sync',
    ],
    relatedHooks: ['useLocalStorage', 'useCookies'],
  },

  useJwt: {
    name: 'useJwt',
    category: 'State and storage',
    purpose:
      'Decode compact JWT header/payload segments only — signature is not verified.',
    overview:
      'Client-side Base64URL decode for inspection; never treat decoded claims as authenticated.',
    whenToUse: [
      'Debugging token structure in development',
      'Displaying claims with clear “not verified” warnings',
    ],
    whenNotToUse: [
      'Authorization decisions',
      'Production credentials in examples',
    ],
    importExample: importLine('useJwt', 'UseJwtReturn'),
    signature: `function useJwt<T extends JwtPayload = JwtPayload>(
  token: string | null | undefined,
  options?: UseJwtOptions<T>,
): UseJwtReturn<T>`,
    parameters: [
      { name: 'token', description: 'Compact JWT string or null.' },
      {
        name: 'options.fallback',
        description: 'Payload when decode fails.',
      },
      {
        name: 'options.onError',
        description: 'Decode error callback.',
      },
    ],
    returnValues:
      '{ header, payload, signature, isValid, error, ... } — isValid means structurally decodable, not trusted',
    defaults: 'fallback: undefined',
    runtimeBehavior: [
      'No signature verification',
      'exp/nbf/iat displayed as NumericDate seconds — not validation',
    ],
    ssrBehavior: 'Safe decode during SSR when token provided.',
    strictModeBehavior: 'Pure decode; no subscriptions.',
    accessibility:
      'Examples show prominent “Decoded only — signature not verified” warnings. Never authorize from client decode alone.',
    limitations: [
      'Decode only — not verified or trusted',
      'Use synthetic tokens in demos',
      'alg:none and malformed tokens surface errors',
    ],
    relatedHooks: ['useCookies', 'useBase64'],
  },

  useWebSocket: {
    name: 'useWebSocket',
    category: 'Network',
    purpose:
      'Browser WebSocket helper with send buffering, reconnect, and application-level heartbeats.',
    overview:
      'Effect-constructed socket with explicit open/close, autoReconnect, and heartbeat messages.',
    whenToUse: [
      'Live dashboards with manual connect in Docs',
      'Reconnect/backoff with consumer-owned URLs',
    ],
    whenNotToUse: [
      'Auto-connect to production servers in documentation',
      'Native WebSocket ping frames (uses app messages)',
    ],
    importExample: importLine('useWebSocket', 'UseWebSocketReturn'),
    signature: `function useWebSocket<T = unknown>(
  url: string | URL | null | undefined,
  options?: UseWebSocketOptions<T>,
): UseWebSocketReturn<T>`,
    parameters: [
      { name: 'url', description: 'WebSocket URL; null skips construction.' },
      {
        name: 'options.autoConnect',
        description: 'Connect in effect when true (default true).',
      },
      {
        name: 'options.autoReconnect',
        description: 'Backoff reconnect policy.',
      },
      {
        name: 'options.heartbeat',
        description: 'Application-level ping/pong messages.',
      },
    ],
    returnValues: '{ data, status, ws, send, open, close }',
    defaults:
      'immediate: true, autoConnect: true, autoClose: true, autoReconnect: false, heartbeat: false',
    runtimeBehavior: [
      'Explicit close() never auto-reconnects',
      'Send buffer while CONNECTING when enabled',
      'Unmount always releases ownership',
    ],
    ssrBehavior: 'CLOSED idle state; sockets created in effects only.',
    strictModeBehavior: 'Socket closed and timers cleared on effect cleanup.',
    accessibility:
      'Examples expose connection status text. Hook does not announce messages to AT.',
    limitations: [
      'Browser WebSocket only',
      'Heartbeats are app messages',
      'No cross-tab sync',
    ],
    relatedHooks: ['useEventBus', 'useDebounceFn'],
  },

  useFullscreen: {
    name: 'useFullscreen',
    category: 'Browser',
    purpose: 'Imperative Fullscreen API enter/exit with document-event sync.',
    overview:
      'Tracks fullscreenElement with enter/exit/toggle requiring user gestures.',
    whenToUse: [
      'Media viewers and presentation layouts',
      'Element-level fullscreen with navigationUI options',
    ],
    whenNotToUse: ['CSS-only faux fullscreen', 'Auto-enter on Docs load'],
    importExample: importLine('useFullscreen'),
    signature: `function useFullscreen<T extends Element = HTMLElement>(
  ref: RefObject<T | null>,
  options?: UseFullscreenOptions,
): UseFullscreenReturn`,
    parameters: [
      { name: 'ref', description: 'Element to fullscreen.' },
      {
        name: 'options.navigationUI',
        description: 'FullscreenNavigationUI hint.',
      },
      {
        name: 'options.autoExit',
        description: 'Exit on genuine unmount when true.',
      },
    ],
    returnValues: '{ isFullscreen, enter, exit, toggle, isSupported }',
    defaults: 'autoExit: true, enabled: true',
    runtimeBehavior: [
      'enter()/toggle() require user activation',
      'Syncs via fullscreenchange events',
      'Disabling observation does not exit platform fullscreen',
    ],
    ssrBehavior: 'Unsupported idle during SSR.',
    strictModeBehavior:
      'Event listeners removed; autoExit on unmount when enabled.',
    accessibility:
      'Examples document Escape to exit. Hook does not trap focus or provide screen reader announcements.',
    limitations: [
      'Native API only',
      'No orientation lock or wake lock',
      'Prefix/support varies',
    ],
    relatedHooks: ['useScrollLock', 'useDisplayMedia'],
  },

  useFavicon: {
    name: 'useFavicon',
    category: 'Browser',
    purpose:
      'Controlled document favicon link management with shared ownership.',
    overview:
      'Sets/restores favicon href/rel on a document with multi-owner registry.',
    whenToUse: [
      'Status/badge favicons in isolated documents',
      'Theme-aware icon switching',
    ],
    whenNotToUse: [
      'Manifest icons or generated badge images',
      'Assuming immediate tab icon refresh',
    ],
    importExample: importLine('useFavicon'),
    signature: `function useFavicon(
  icon: string | null | undefined,
  options?: UseFaviconOptions,
): UseFaviconReturn`,
    parameters: [
      { name: 'icon', description: 'href string or null to clear.' },
      {
        name: 'options.rel',
        description: 'link rel (default icon).',
      },
      {
        name: 'options.document',
        description: 'Target document (default global).',
      },
      {
        name: 'options.restoreOnUnmount',
        description: 'Restore previous icon when true.',
      },
    ],
    returnValues: '{ isActive, set, reset, ... }',
    defaults: 'restoreOnUnmount: true',
    runtimeBehavior: [
      'Shared ownership per (document, rel)',
      'Browsers may cache favicons',
    ],
    ssrBehavior: 'No DOM writes during SSR.',
    strictModeBehavior:
      'Ownership released on unmount; restore when configured.',
    accessibility:
      'Examples pair favicon changes with in-page status text. Tab icons are not reliably exposed to AT.',
    limitations: [
      'Head metadata only',
      'Caching/delays vary by browser',
      'No image generation',
    ],
    relatedHooks: ['useNProgress', 'useQRCode'],
  },

  useNProgress: {
    name: 'useNProgress',
    category: 'Browser',
    purpose:
      'Package-native top-of-page progress indicator with shared ownership.',
    overview:
      'Injects namespaced DOM/CSS for determinate/indeterminate progress with trickle and multi-owner merging.',
    whenToUse: [
      'Route transitions and async save indicators',
      'Contained custom parent progress bars',
    ],
    whenNotToUse: [
      'Automatic fetch/router interception',
      'Mounting onto Storybook manager document.body',
    ],
    importExample: importLine('useNProgress', 'UseNProgressReturn'),
    signature: `function useNProgress(
  currentProgress?: number | null,
  options?: UseNProgressOptions,
): UseNProgressReturn`,
    parameters: [
      {
        name: 'currentProgress',
        description:
          'Declarative progress, null to complete, undefined imperative.',
      },
      {
        name: 'options.parent',
        description: 'Container element (default body).',
      },
      {
        name: 'options.trickle',
        description: 'Estimated progress increments.',
      },
    ],
    returnValues:
      '{ isLoading, progress, start, set, increment, done, remove }',
    defaults: 'minimum: 0.08, trickle: true, showSpinner: true, ...',
    runtimeBehavior: [
      'Shared channel merges minimum progress across owners',
      'prefers-reduced-motion disables spinner animation',
      'Manual start/done — no fetch hooks',
    ],
    ssrBehavior:
      '{ isLoading: false, progress: null }; methods no-op until mount.',
    strictModeBehavior:
      'DOM/styles removed when last owner completes on cleanup.',
    accessibility:
      'Examples pair bar with textual loading and aria-busy. aria-valuenow reflects visual estimate including trickle.',
    limitations: [
      'No router/fetch integration',
      'CSP may restrict injected styles',
      'Trickle is estimated, not measured work',
    ],
    relatedHooks: ['useDebounceFn', 'useWebSocket'],
  },

  useQRCode: {
    name: 'useQRCode',
    category: 'Browser',
    purpose:
      'Generate QR code image data URLs from text via the qrcode encoder dependency.',
    overview:
      'Async data URL generation with enabled lifecycle, manual generate(), and newest-wins concurrency.',
    whenToUse: [
      'On-screen QR previews and download links',
      'Wi-Fi/vCard/URL payload demos with synthetic data',
    ],
    whenNotToUse: [
      'Trusting scanned destinations',
      'Zero runtime dependencies requirement',
    ],
    importExample: importLine('useQRCode', 'UseQRCodeReturn'),
    signature: `function useQRCode(
  text: string,
  options?: UseQRCodeOptions,
): UseQRCodeReturn`,
    parameters: [
      { name: 'text', description: 'Exact content to encode.' },
      {
        name: 'options.errorCorrectionLevel',
        description: 'L/M/Q/H (default M).',
      },
      {
        name: 'options.width / margin / color',
        description: 'Visual encoder options.',
      },
      {
        name: 'options.enabled',
        description: 'Automatic generation when true.',
      },
    ],
    returnValues: '{ dataUrl, isLoading, error, generate }',
    defaults: 'enabled: true, errorCorrectionLevel: "M", margin: 4',
    runtimeBehavior: [
      'Newest generation wins',
      'Empty string clears without encoding',
      'Scanning does not validate content',
    ],
    ssrBehavior: 'Idle empty dataUrl during SSR; encoder runs after mount.',
    strictModeBehavior: 'In-flight generations discarded via generation id.',
    accessibility:
      'Examples include encoded content preview and honest scan-trust notes. Provide textual content alongside QR images.',
    limitations: [
      'Runtime qrcode dependency',
      'No built-in scanner',
      'Capacity/contrast/quiet-zone affect scan reliability',
    ],
    relatedHooks: ['useBase64', 'useFavicon'],
  },

  useBase64: {
    name: 'useBase64',
    category: 'Utilities',
    purpose: 'UTF-8-safe Base64 and data URL encoding/decoding helpers.',
    overview:
      'Reactive encode/decode with optional manual execution and custom serializers.',
    whenToUse: [
      'Client-side data URL previews',
      'Binary-safe text encoding in the browser',
    ],
    whenNotToUse: [
      'Secrets, credentials, or security tokens',
      'Replacing proper encryption',
    ],
    importExample: importLine('useBase64'),
    signature: `function useBase64(
  input: UseBase64Input,
  options?: UseBase64Options,
): UseBase64Return`,
    parameters: [
      { name: 'input', description: 'String, Blob, File, or byte source.' },
      {
        name: 'options.asDataUrl',
        description: 'Prefix with data:*;base64, when true.',
      },
      {
        name: 'options.enabled',
        description: 'Auto encode when true.',
      },
    ],
    returnValues: '{ result, error, encode, decode, ... }',
    defaults: 'enabled: true, asDataUrl: false',
    runtimeBehavior: [
      'UTF-8 safe encoding',
      'Manual encode/decode always available',
    ],
    ssrBehavior: 'Safe import; browser APIs used after mount when needed.',
    strictModeBehavior: 'Async work cancelled via generation guards.',
    accessibility:
      'Examples show text previews and byte counts. Hook does not expose binary content to AT.',
    limitations: [
      'Not encryption',
      'Large payloads can block main thread',
      'Browser File/Blob APIs required for some inputs',
    ],
    relatedHooks: ['useJwt', 'useQRCode'],
  },

  useDebounceFn: {
    name: 'useDebounceFn',
    category: 'Utilities',
    purpose:
      'Debounced callbacks with pending state, cancel, flush, and optional maxWait.',
    overview:
      'Trailing debounce with latest-args-win promises shared per debounce window.',
    whenToUse: [
      'Search inputs and autosave drafts',
      'Coalescing high-frequency validation',
    ],
    whenNotToUse: [
      'Throttle-style fixed-interval sampling',
      'Aborting in-flight async work on cancel',
    ],
    importExample: importLine('useDebounceFn', 'UseDebounceFnReturn'),
    signature: `function useDebounceFn<T extends (...args: never[]) => unknown>(
  fn: T,
  delay?: number,
  options?: UseDebounceFnOptions,
): UseDebounceFnReturn<T>`,
    parameters: [
      { name: 'fn', description: 'Callback to debounce.' },
      { name: 'delay', description: 'Ms delay (invalid → 200).' },
      {
        name: 'options.maxWait',
        description: 'Maximum wait before forced invoke.',
      },
      {
        name: 'options.rejectOnCancel',
        description: 'Reject pending promises on cancel.',
      },
    ],
    returnValues: '{ run, cancel, flush, isPending }',
    defaults: 'delay: 200, rejectOnCancel: false',
    runtimeBehavior: [
      'Trailing debounce; shared promise per window',
      'Cancel does not abort running callback',
      'Unmount cancels without rejection',
    ],
    ssrBehavior: 'Methods exist; no timers until run().',
    strictModeBehavior: 'Timers cleared on unmount.',
    accessibility:
      'Examples show pending state text. Hook does not announce debounced results to AT.',
    limitations: [
      'Debounce not throttle',
      'Background tab timer throttling',
      'Cancel does not abort active callback',
    ],
    relatedHooks: ['useEventBus', 'useLocalStorage'],
  },
}

export const HOOK_CATALOG_LIST = HOOK_NAMES.map((name) => HOOK_CATALOG[name])

export function getHookDoc(name: HookName): HookDocumentation {
  return HOOK_CATALOG[name]
}

export function hooksByCategory(category: HookCategory): HookDocumentation[] {
  return HOOK_CATALOG_LIST.filter((hook) => hook.category === category)
}

export function hookDocsPath(name: HookName): string {
  return `?path=/docs/hooks-${name.toLowerCase()}--documentation`
}

export const HOOK_COUNT = HOOK_NAMES.length
