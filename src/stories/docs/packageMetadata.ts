/**
 * Storybook-only package metadata sourced from the repository package.json.
 * Excluded from the library build and npm tarball (`src/stories/**`).
 */
import packageJson from '../../../package.json' with { type: 'json' }

export const PACKAGE_NAME = packageJson.name
export const PACKAGE_VERSION = packageJson.version
export const PACKAGE_HOMEPAGE = packageJson.homepage
export const PACKAGE_REPOSITORY_URL = packageJson.repository.url

/** Badge / status label shown on Storybook docs headers. */
export const PACKAGE_STATUS_LABEL = `${PACKAGE_VERSION} · stable`

/** Version-independent consumer install command. */
export const PACKAGE_INSTALL_COMMAND = `npm install ${PACKAGE_NAME}`
