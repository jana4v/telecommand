import type { MenuItem } from '../useSideNav'
import { useSideNav } from '../useSideNav'

const menuItems: MenuItem[] = [
  {
    label: 'Upload TC',
    icon: 'pi pi-upload',
    route: '/tc',
  },
  {
    label: 'Update TC DB',
    icon: 'pi pi-database',
    route: '/tc/updateDb',
  },
  {
    label: 'Data Command Maps',
    icon: 'pi pi-table',
    route: '/tc/dataCommandMaps',
  },
]

export const wamp_topic = 'com.tc_file.status'

export const { initMenu, side_nav_config } = useSideNav(
  'TeleCommand',
  '/tc.gif',
  menuItems,
  '60%',
)
