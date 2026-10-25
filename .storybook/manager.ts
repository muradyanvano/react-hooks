import { addons } from 'storybook/manager-api'
import theme from './theme'

addons.setConfig({
  theme,
  sidebar: {
    showRoots: true,
  },
  layout: {
    panelPosition: 'bottom',
    showToolbar: true,
    initialActive: 'sidebar',
  },
  ui: {
    enableShortcuts: true,
  },
})
