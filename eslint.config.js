import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Type-test files assert call signatures at compile time and are not
    // executed as React components.
    files: ['**/*.type-test.ts', '**/*.type-test.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  eslintConfigPrettier,
])
