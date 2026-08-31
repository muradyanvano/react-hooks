# Change workflow

- Do not commit, push, tag, publish, release, or deploy unless explicitly asked.
- Keep `private: true` until publishing is authorized.
- Implement only requested hooks and directly related tests/docs/guidance/Storybook updates.
- Prefer small, reversible config and docs changes over speculative product surface.
- Always update affected documentation and `.ai` skills in the same change when behavior, APIs, tooling, or agent workflow changes. Do not leave README, `docs/public-api.md`, Storybook, CHANGELOG, `AGENTS.md`, or skills stale.

When architecture, conventions, API behavior, package usage or testing policy changes, update this skill if its instructions become stale.
