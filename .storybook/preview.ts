import type { Preview } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import './preview.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
      sort: 'requiredFirst',
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    docs: {
      toc: true,
      codePanel: {
        type: 'dynamic',
      },
    },
    a11y: {
      test: 'error',
    },
    options: {
      storySort: {
        order: ['Introduction', 'Getting Started', 'Hooks'],
      },
    },
    backgrounds: {
      options: {
        canvas: { name: 'Canvas', value: '#f8fafc' },
        surface: { name: 'Surface', value: '#ffffff' },
      },
    },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '812px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
      },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'canvas' },
    viewport: { value: 'desktop', isRotated: false },
  },
  args: {
    onOutside: fn(),
  },
}

export default preview
