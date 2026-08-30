# @muradyanvano/react-hooks

Early prerelease foundation for a production-oriented React hooks library.

This package is **not published** and **does not expose any hooks yet**. Public APIs will be defined in later phases.

## Status

- Version: `0.1.0-beta.1` (unreleased)
- Module format: ESM-only
- React peer range: `^18.0.0 || ^19.0.0`
- Goal: SSR-safe imports with no browser globals required at module evaluation time
- Publishing has not been authorized

## Development

```bash
npm install
npm run verify
```

Useful scripts:

| Script                                                      | Purpose                                         |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `npm run build` / `npm run build:lib`                       | Build the ESM library and declarations          |
| `npm run typecheck`                                         | TypeScript project build                        |
| `npm run lint`                                              | ESLint                                          |
| `npm run format` / `npm run format:check`                   | Prettier                                        |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Vitest                                          |
| `npm run pack:dry-run`                                      | Inspect the future publish tarball              |
| `npm run verify`                                            | Format check, typecheck, lint, tests, and build |

## License

MIT © Vano Muradyan
