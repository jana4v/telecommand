import type { MenuItem } from '../useSideNav'
import { useSideNav } from '../useSideNav'

const menuItems: MenuItem[] = [
  {
    label: 'CFG Based Commands',
    icon: 'pi pi-microsoft',
    route: '/payloadTc/cfgCommands',
  },
  {
    label: 'Data Commands',
    icon: 'pi pi-calculator',
    route: '/payloadTc/dataCommands',
  },
  {
    label: 'Manual Commands',
    icon: 'pi pi-eye',
    route: '/payloadTc/manualCommands',
  },
  {
    label: 'TC Files',
    icon: 'i-carbon-document',
    route: '/payloadTc/files',
  },
  {
    label: 'Utility',
    icon: 'pi pi-box',
    route: '/payloadTc/utility',
  },
  {
    label: 'Database',
    icon: 'pi pi-database',
    route: '/payloadTc/database',
  },
]

export const wamp_topic = 'com.tc_file.status'

export const { initMenu, side_nav_config } = useSideNav(
  'TeleCommand',
  '/tc.gif',
  menuItems,
  '60%', // Logo width reduced to 50%
)
