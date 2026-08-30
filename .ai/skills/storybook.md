# Storybook

Operational rules for the consumer-facing Storybook documentation environment.

- Document public package behavior only. Stories import from `@muradyanvano/react-hooks`, never from internal hook paths.
- Keep the Storybook Vite alias scoped to Storybook/development configuration.
- Present examples with the shared `ExampleShowcase` system: polished preview, Show/Hide code, Copy code, and curated snippets.
- Prefer Controls for real options (`enabled`, `eventType`, `capture`, `dedupe`, `passive`, `once`) and Actions/event logs for handler calls.
- For event-listener examples, show omitted-window vs explicit-target SSR guidance honestly, and prefer accessible interactive targets over pointer-only regions.
- For keyboard examples, document shortcuts, keep focus rings visible, avoid trapping focus, and use predicates when character shortcuts should not fire while typing in inputs.
- For observer-based hooks, demonstrate external or imperative DOM mutation accurately. Do not fake detection through ordinary conditional React rendering when that behavior is not guaranteed.
- After imperative `ref.current` assignment in examples, include a small commit/state signal when needed so observation can sync, and keep the snippet honest about that requirement.
- Hide Storybook autodocs source when the custom code panel already shows the consumer snippet.
- Highlight TSX with Shiki (or an official Storybook Source block if it meets the same bar). Keep highlighters development-only.
- Add meaningful `play` interaction tests and accessibility checks for important stories, including disclosure and clipboard behavior.
- Keep examples responsive across mobile, tablet, and desktop viewports.
- Provide clean consumer source snippets that match the public API and do not claim npm publication.
- Example styling may use Tailwind; the hooks package must not require Tailwind.
- Light-only design. Do not add dark mode or theme switching.
- Tailwind, Storybook, and syntax highlighters stay development-only and must never enter the library bundle or npm tarball.
- Do not invent empty sections for hooks that do not exist yet.
- When public hook behavior changes, update the related stories and docs in the same change.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
