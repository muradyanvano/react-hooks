# Releasing

This guide covers the first stable release of `@muradyanvano/react-hooks` and later versioned releases. It never stores or prints npm credentials.

Related: [Contributing](./contributing.md) · [Changelog](../CHANGELOG.md)

## Prerequisites

- You own or control the npm scope `@muradyanvano`.
- You can push to `muradyanvano1995/react-hooks` and manage repository environments.
- Local Node/npm satisfy repository engines (`npm@11.8.0` via `packageManager`, Node `^20.19.0 || >=22.12.0`; CI uses Node 24).

### Verify npm scope ownership (required before first publish)

```bash
npm login
npm whoami
npm access list packages
```

Confirm your account can create `@muradyanvano/*` packages (scope exists under your user/org, or create the scope on first publish of a scoped package). Do not proceed with publication automation assumptions until this check succeeds.

---

## A. First-release bootstrap (`1.0.0`)

Trusted Publishing can only be configured on an **existing** package page. The first `1.0.0` publish must therefore be interactive.

1. **Validate the tree**

   ```bash
   npm ci
   npm run verify:ci
   npm run test:coverage
   npm run test:reset
   npm run pack:dry-run
   npm run validate:release
   npm audit --omit=dev
   ```

2. **Confirm metadata**

   - `package.json` `version` is `1.0.0`
   - `private` is absent / not `true`
   - `publishConfig.access` is `public`
   - Tarball contains only `dist/`, `LICENSE`, `README.md`, `CHANGELOG.md`, and `package.json`

3. **Interactive publish (once)**

   ```bash
   npm login
   npm whoami
   npm publish --access public
   ```

   Complete npm 2FA when prompted. Do **not** create a GitHub Release before this step if that would trigger `.github/workflows/publish.yml` without Trusted Publishing configured yet — or ensure the workflow’s “version already exists” guard can skip a duplicate (see below).

4. **Configure npm Trusted Publishing** on https://www.npmjs.com/package/@muradyanvano/react-hooks → **Settings** → **Trusted Publisher**:

   | Field                | Value              |
   | -------------------- | ------------------ |
   | Provider             | GitHub Actions     |
   | Organization or user | `muradyanvano1995` |
   | Repository           | `react-hooks`      |
   | Workflow filename    | `publish.yml`      |
   | Environment          | `npm`              |
   | Allowed action       | `npm publish`      |

5. **Create the annotated tag and GitHub Release** (after the package exists on npm):

   ```bash
   git tag -a v1.0.0 -m "v1.0.0"
   git push origin v1.0.0
   ```

   Then create a GitHub Release for `v1.0.0` from that tag (UI or `gh release create`). Publishing the release triggers `publish.yml`.

6. **Duplicate protection**

   `publish.yml` checks whether `@muradyanvano/react-hooks@<version>` already exists on the registry. If it does (manual bootstrap), the workflow reports that and **skips** `npm publish` successfully. Registry 404 for a missing version is treated as “not published yet”. Genuine network/registry errors still fail the job.

7. **Verify**

   - npm package page, version, and provenance (for OIDC publishes)
   - Tarball contents
   - Storybook on GitHub Pages after `pages.yml` runs on `main`

---

## B. Later releases

1. Update `package.json` / lockfile version and `CHANGELOG.md`.
2. Open a PR; let `ci.yml` pass; merge to `main`.
3. Create annotated tag `vX.Y.Z` matching `package.json` exactly and push it.
4. Publish a **stable** (non-prerelease) GitHub Release for that tag.
5. `publish.yml` runs on the `npm` environment with OIDC Trusted Publishing (no `NPM_TOKEN`).
6. Verify npm, provenance, tarball, and Storybook deployment.

Prerelease GitHub Releases do **not** publish stable packages (`publish.yml` ignores them).

---

## GitHub Pages setup (manual, once)

1. Open the repository on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**.
3. Protect the `github-pages` environment so only the `main` branch (and required reviewers, if desired) can deploy.
4. After the first successful `pages.yml` run, confirm:

   https://muradyanvano1995.github.io/react-hooks/

Storybook is built with `STORYBOOK_BASE_PATH=/react-hooks/` so assets resolve under the repository subpath. Do not change the library Vite `base` for this.

---

## GitHub environment: `npm`

Create a repository environment named `npm` for `publish.yml`:

- Required reviewers recommended
- Deployment branches limited to release tags / default branch policy as appropriate
- No `NPM_TOKEN` secret — Trusted Publishing is token-free

---

## Safety rules

- Never commit npm tokens or put `NODE_AUTH_TOKEN` / `NPM_TOKEN` in workflows for publish.
- Do not publish from pull requests or ordinary pushes.
- Do not force-overwrite or unpublish versions.
- Prefer a reviewable manual first publish over automation that could double-publish.
