import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { defineConfig, type PluginOption } from 'vite'

const reactExternals = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]

/** Runtime encoder — keep external so Node/browser resolution stays with the consumer. */
const packageExternals = [...reactExternals, 'qrcode']

const isStorybook = process.argv.some((argument) =>
  argument.toLowerCase().includes('storybook'),
)

const plugins: PluginOption[] = [react()]

if (!isStorybook) {
  plugins.push(
    dts({
      include: ['src'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.type-test.ts',
        'src/stories/**',
        'src/test',
      ],
      tsconfigPath: './tsconfig.lib.json',
      bundleTypes: true,
    }),
  )
}

export default defineConfig({
  plugins,
  ...(isStorybook
    ? {}
    : {
        build: {
          lib: {
            entry: resolve(import.meta.dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
          },
          rollupOptions: {
            external: packageExternals,
          },
          sourcemap: true,
          emptyOutDir: true,
          minify: false,
        },
      }),
})
