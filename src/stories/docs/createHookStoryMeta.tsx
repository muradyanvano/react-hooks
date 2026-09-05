import type { Meta } from '@storybook/react-vite'

import { getHookDoc } from './catalog'
import { HookDocumentationPage } from './HookDocumentationPage'
import type { HookName } from './types'

type A11yParameters = {
  test?: 'todo' | 'error' | 'off'
}

type MetaOptions<T> = {
  layout?: 'fullscreen' | 'padded' | 'centered'
  argTypes?: Meta<T>['argTypes']
  args?: Meta<T>['args']
  a11y?: A11yParameters
}

/**
 * Shared docs/parameters for hook stories.
 *
 * CSF note: Storybook's static indexer cannot see `title` / `tags` inside this
 * helper. Every `*.stories.tsx` meta must still declare literal:
 * `title: 'Hooks/useHookName'` and `tags: ['autodocs']` before spreading this.
 */
export function createHookStoryMeta<T>(
  hookName: HookName,
  component: T,
  options: MetaOptions<T> = {},
): Meta<T> {
  const doc = getHookDoc(hookName)
  const layout = options.layout ?? 'fullscreen'

  const meta = {
    title: `Hooks/${hookName}`,
    component,
    tags: ['autodocs'],
    parameters: {
      layout,
      docs: {
        page: () => <HookDocumentationPage hookName={hookName} />,
        canvas: {
          sourceState: 'none' as const,
        },
        description: {
          component: doc.purpose,
        },
      },
    },
  } as Meta<T>

  if (options.argTypes) {
    meta.argTypes = options.argTypes
  }

  if (options.args) {
    meta.args = options.args
  }

  if (options.a11y) {
    meta.parameters = {
      ...meta.parameters,
      a11y: options.a11y,
    }
  }

  return meta
}
