import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  BackForwardExample,
  BasicHistoryExample,
  CustomIframeWindowExample,
  CustomStringifyExample,
  DisabledEditingExample,
  DynamicModeExample,
  EmptyBareExample,
  HashParamsExample,
  HashRouteExample,
  InitialResetExample,
  MultiSyncExample,
  PlaygroundExample,
  ProductFiltersExample,
  PushVersusReplaceExample,
  ReadOnlyExample,
  RemoveFalsyExample,
  RemoveNullishExample,
  RepeatedTagsExample,
  SearchPaginationExample,
  UrlParameterEditorExample,
} from './components/UseUrlSearchParamsExamples'
import * as snippets from './components/useUrlSearchParams.snippets'

const meta = {
  title: 'Hooks/useUrlSearchParams',
  component: UrlParameterEditorExample,
  parameters: {
    layout: 'fullscreen',
    docs: {
      canvas: {
        sourceState: 'none',
      },
      description: {
        component: `
Observe and update URL search parameters for \`history\`, \`hash\`, and \`hash-params\` modes with immutable snapshots and explicit controls.

\`\`\`ts
import { useUrlSearchParams } from '@muradyanvano/react-hooks'

useUrlSearchParams(mode?, options?): UseUrlSearchParamsReturn
\`\`\`

**Defaults:** \`mode: 'history'\`, \`enabled: true\`, \`write: true\`, \`writeMode: 'replace'\`, \`removeNullishValues: true\`, \`removeFalsyValues: false\`

Demos write only isolated same-origin iframe History stacks. Storybook manager/preview routes are never mutated. Unrelated \`pushState\`/\`replaceState\` calls do not emit \`popstate\` — call \`refresh()\` when integrating with external routers.
        `,
      },
    },
    a11y: {
      test: 'error',
    },
  },
} satisfies Meta<typeof UrlParameterEditorExample>

export default meta

type Story = StoryObj<typeof meta>

async function expectCodeDisclosure(
  canvas: ReturnType<typeof within>,
  expectedSnippet: string,
) {
  const toggle = canvas.getByTestId('toggle-code')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const highlighted = await canvas.findByTestId('highlighted-code')
  await expect(highlighted).toBeVisible()
  await expect(highlighted.textContent?.trim().length ?? 0).toBeGreaterThan(0)

  const writeText = fn(async () => undefined)
  const originalClipboard = navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })

  try {
    await userEvent.click(canvas.getByTestId('copy-code'))
    await expect(writeText).toHaveBeenCalledWith(expectedSnippet)
  } finally {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  }

  await userEvent.click(toggle)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
}

async function waitReady(canvas: ReturnType<typeof within>) {
  await waitFor(() => {
    expect(canvas.getByTestId('usp-ready')).toHaveTextContent('true')
  })
}

export const UrlParameterEditor: Story = {
  name: 'URL parameter editor',
  render: () => <UrlParameterEditorExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
      'foo=bar&library=awesome&biz=biz',
    )

    const fooInput = canvas.getByTestId('usp-value-foo')
    await userEvent.clear(fooInput)
    await userEvent.type(fooInput, 'edited')
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
        'foo=edited',
      )
    })

    await userEvent.click(canvas.getByTestId('usp-add-param'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
        'newKey=newValue',
      )
    })

    await userEvent.click(canvas.getByTestId('usp-add-tag'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
        'tag=react',
      )
    })

    await userEvent.click(canvas.getByRole('button', { name: 'Remove biz' }))
    await waitFor(() => {
      const serialized = canvas.getByTestId('usp-serialized').textContent ?? ''
      expect(/(?:^|&)biz=/.test(serialized)).toBe(false)
    })

    await userEvent.click(canvas.getByTestId('usp-write-push'))
    await userEvent.click(canvas.getByTestId('usp-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('foo=bar')
    })

    await expectCodeDisclosure(canvas, snippets.editorSnippet)
  },
}

export const BasicHistory: Story = {
  name: 'Basic history mode',
  render: () => <BasicHistoryExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-set-q'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('q=hooks')
    })
    await userEvent.click(canvas.getByTestId('usp-clear'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('(empty)')
    })
    await expectCodeDisclosure(canvas, snippets.basicHistorySnippet)
  },
}

export const ProductFilters: Story = {
  name: 'Product filters',
  render: () => <ProductFiltersExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.selectOptions(
      canvas.getByTestId('usp-category'),
      'keyboards',
    )
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
        'category=keyboards',
      )
    })
    await expectCodeDisclosure(canvas, snippets.filtersSnippet)
  },
}

export const SearchPagination: Story = {
  name: 'Search and pagination',
  render: () => <SearchPaginationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-next-page'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('page=2')
    })
    await expectCodeDisclosure(canvas, snippets.searchPaginationSnippet)
  },
}

export const RepeatedTags: Story = {
  name: 'Repeated tags',
  render: () => <RepeatedTagsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-add-react'))
    await userEvent.click(canvas.getByTestId('usp-add-ts'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-tags')).toHaveTextContent(
        'react, typescript',
      )
    })
    await userEvent.click(canvas.getByTestId('usp-remove-react'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-tags')).toHaveTextContent('typescript')
    })
    await expectCodeDisclosure(canvas, snippets.repeatedTagsSnippet)
  },
}

export const EmptyAndBare: Story = {
  name: 'Empty and bare values',
  render: () => <EmptyBareExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-empty-flag'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-flag-empty')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, snippets.emptyBareSnippet)
  },
}

export const PushVersusReplace: Story = {
  name: 'Push versus replace',
  render: () => <PushVersusReplaceExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-replace'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
        'mode=replace',
      )
    })
    await expectCodeDisclosure(canvas, snippets.pushReplaceSnippet)
  },
}

export const BrowserBackForward: Story = {
  name: 'Demo previous parameter state',
  render: () => <BackForwardExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-step-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-step')).toHaveTextContent('a')
    })
    await userEvent.click(canvas.getByTestId('usp-step-b'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-step')).toHaveTextContent('b')
    })
    await userEvent.click(canvas.getByTestId('usp-back'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-step')).toHaveTextContent('a')
    })
    await expectCodeDisclosure(canvas, snippets.backForwardSnippet)
  },
}

export const ReadOnlyUrl: Story = {
  name: 'Read-only URL with write false',
  render: () => <ReadOnlyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-draft'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-draft-value')).toHaveTextContent('local')
    })
    await expect(canvas.getByTestId('usp-iframe-search')).toHaveTextContent(
      '?a=1',
    )
    await expectCodeDisclosure(canvas, snippets.readOnlySnippet)
  },
}

export const DisabledLocalEditing: Story = {
  name: 'Disabled local editing',
  render: () => <DisabledEditingExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('usp-set-q'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-snapshot')).toHaveTextContent('local')
    })
    await userEvent.click(canvas.getByTestId('usp-enabled-toggle'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-enabled')).toHaveTextContent('true')
    })
    await expectCodeDisclosure(canvas, snippets.disabledSnippet)
  },
}

export const InitialValuesAndReset: Story = {
  name: 'Initial values and reset',
  render: () => <InitialResetExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-list'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-view')).toHaveTextContent('list')
    })
    await userEvent.click(canvas.getByTestId('usp-reset'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-view')).toHaveTextContent('grid')
    })
    await expectCodeDisclosure(canvas, snippets.initialResetSnippet)
  },
}

export const RemoveNullishValues: Story = {
  name: 'Remove nullish values',
  render: () => <RemoveNullishExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-clear-q'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('(empty)')
    })
    await expectCodeDisclosure(canvas, snippets.nullishSnippet)
  },
}

export const RemoveFalsyValues: Story = {
  name: 'Remove falsy values',
  render: () => <RemoveFalsyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-set-zero'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('(empty)')
    })
    await expectCodeDisclosure(canvas, snippets.falsySnippet)
  },
}

export const HashRouteMode: Story = {
  name: 'Hash route mode',
  render: () => <HashRouteExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-set-tab'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-hash')).toHaveTextContent(
        '#/products/list?tab=details',
      )
    })
    await expect(canvas.getByTestId('usp-search')).toHaveTextContent('?keep=1')
    await expectCodeDisclosure(canvas, snippets.hashRouteSnippet)
  },
}

export const HashParametersMode: Story = {
  name: 'Hash parameters mode',
  render: () => <HashParamsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-set-focus'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-hash')).toHaveTextContent('#focus=reviews')
    })
    await expect(canvas.getByTestId('usp-search')).toHaveTextContent(
      '?view=grid',
    )
    await expectCodeDisclosure(canvas, snippets.hashParamsSnippet)
  },
}

export const CustomStringifier: Story = {
  name: 'Custom stringifier',
  render: () => <CustomStringifyExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-custom-write'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-url')).toHaveTextContent('q=hello')
    })
    await expectCodeDisclosure(canvas, snippets.customStringifySnippet)
  },
}

export const MultipleSynchronized: Story = {
  name: 'Multiple synchronized components',
  render: () => <MultiSyncExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('usp-write-a'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-b-value')).toHaveTextContent('from-a')
    })
    await expectCodeDisclosure(canvas, snippets.multiSyncSnippet)
  },
}

export const DynamicMode: Story = {
  name: 'Dynamic mode',
  render: () => <DynamicModeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTestId('usp-mode-hash'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-mode')).toHaveTextContent('hash')
    })
    await userEvent.click(canvas.getByTestId('usp-set-x'))
    await expectCodeDisclosure(canvas, snippets.dynamicModeSnippet)
  },
}

export const CustomIframeWindow: Story = {
  name: 'Custom iframe window',
  render: () => <CustomIframeWindowExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-isolated'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent(
        'isolated=yes',
      )
    })
    await expectCodeDisclosure(canvas, snippets.iframeWindowSnippet)
  },
}

export const Playground: Story = {
  name: 'Playground',
  render: () => <PlaygroundExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitReady(canvas)
    await userEvent.click(canvas.getByTestId('usp-set-demo'))
    await waitFor(() => {
      expect(canvas.getByTestId('usp-serialized')).toHaveTextContent('demo=1')
    })
    await userEvent.click(canvas.getByTestId('usp-clear'))
    await userEvent.click(canvas.getByTestId('usp-refresh'))
    await expectCodeDisclosure(canvas, snippets.playgroundSnippet)
  },
}
