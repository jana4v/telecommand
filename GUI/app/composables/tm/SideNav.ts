import type { MenuItem } from '../useSideNav'
import { useSideNav } from '../useSideNav'

const menuItems: MenuItem[] = [
  { label: 'Live TM', icon: 'pi pi-chart-line', route: '/tm' },
  { label: 'Chain Simulator', icon: 'pi pi-play-circle', route: '/tm/chain-simulator' },
  { label: 'Upload TM', icon: 'pi pi-upload', route: '/tm/upload' },
  { label: 'Update TM Db', icon: 'pi pi-database', route: '/tm/updateDb' },
  { label: 'UDTM', icon: 'pi pi-pencil', route: '/tm/udtm' },
  { label: 'Dynamic Limits', icon: 'pi pi-sliders-h', route: '/tm/dynamic-limits' },
  { label: 'System States', icon: 'pi pi-cog', route: '/tm/system-states' },
  { label: 'Delete TM Data', icon: 'pi pi-trash', route: '/tm/delete' },
  { label: 'Home', icon: 'pi pi-home', route: '/' },
]

export const wamp_topic = 'com.tm.status'

export const { initMenu, side_nav_config } = useSideNav(
  'Telemetry',
  '/tc.gif',
  menuItems,
  '60%',
)
