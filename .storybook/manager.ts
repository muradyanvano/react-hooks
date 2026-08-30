import { addons } from 'storybook/manager-api'
import theme from './theme'

addons.setConfig({
  theme,
  sidebar: {
    showRoots: true,
  },
  panelPosition: 'bottom',
  enableShortcuts: true,
  showToolbar: true,
  initialActive: 'sidebar',
})
