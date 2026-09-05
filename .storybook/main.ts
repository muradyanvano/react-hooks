import type { StorybookConfig } from '@storybook/react-vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.mdx', '../src/stories/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    defaultName: 'Documentation',
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  async viteFinal(viteConfig) {
    const basePath = process.env.STORYBOOK_BASE_PATH
    return mergeConfig(viteConfig, {
      ...(basePath ? { base: basePath } : {}),
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@muradyanvano/react-hooks': resolve(
            import.meta.dirname,
            '../src/index.ts',
          ),
        },
      },
    })
  },
}

export default config
