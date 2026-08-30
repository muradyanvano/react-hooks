# Storybook

Operational rules for the consumer-facing Storybook documentation environment.

- Document public package behavior only. Stories import from `@muradyanvano/react-hooks`, never from internal hook paths.
- Keep the Storybook Vite alias scoped to Storybook/development configuration.
- Present examples with the shared `ExampleShowcase` system: polished preview, Show/Hide code, Copy code, and curated snippets.
- Prefer Controls for real options (`enabled`, `eventType`, `capture`) and Actions/event logs for handler calls.
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
