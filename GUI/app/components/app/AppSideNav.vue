<script setup lang="ts">
interface MenuItem {
  label?: string | ((...args: any) => string)
  icon?: string
  url?: string
  items?: MenuItem[]
}

interface SideNavConfig {
  show_side_nav: boolean
  app_name: string
  logo_url: string
  logo_width: string
  selected_item_label?: string
  items?: MenuItem[]
}

const visible = useState<boolean>('visible', () => true)
const lock_side_nav = useState<boolean>('lock_side_nav', () => false)
const side_nav_config = useState<SideNavConfig>('side_nav_config', () => ({
  show_side_nav: false,
  app_name: '',
  logo_url: '',
  logo_width: '',
  items: [],
  selected_item_label: '',
}))
const side_nav_width = useState<string>('side_nav_width', () => '220px')

const menu_selected_item = ref('')

function selected_item(label: string) {
  menu_selected_item.value = label
}

const isDrawerVisible = computed({
  get: () => visible.value || lock_side_nav.value,
  set: (value: boolean) => {
    visible.value = value
  },
})

function getFirstItemLabel(): string {
  const label = side_nav_config.value.items?.[0]?.label
  if (!label)
    return ''
  return typeof label === 'function' ? label() : label
}

watch(
  side_nav_config,
  () => {
    if (side_nav_config.value.show_side_nav)
      visible.value = true

    if (side_nav_config.value.items && side_nav_config.value.items.length > 0) {
      const firstItemLabel = getFirstItemLabel()
      if (side_nav_config.value.selected_item_label)
        menu_selected_item.value = side_nav_config.value.selected_item_label
      else if (firstItemLabel)
        menu_selected_item.value = firstItemLabel
    }
  },
  { deep: true, immediate: true },
)

onMounted(() => {
  if (side_nav_config.value.items && side_nav_config.value.items.length > 0) {
    const firstItemLabel = getFirstItemLabel()
    if (side_nav_config.value.selected_item_label)
      menu_selected_item.value = side_nav_config.value.selected_item_label
    else if (firstItemLabel)
      menu_selected_item.value = firstItemLabel
  }
})
</script>

<template>
  <div v-if="side_nav_config?.show_side_nav" class="sidenav-wrapper">
    <Drawer
      v-model:visible="isDrawerVisible"
      class="side_nav"
      :style="{ width: side_nav_width, top: '1rem', height: 'calc(100vh - 1rem)' }"
      :modal="false"
      :show-close-icon="false"
      :dismissable="false"
    >
      <template #container>
        <div class="sidenav-header">
          <div class="logo-container">
            <img
              :style="{ width: side_nav_config.logo_width, maxWidth: '150px' }"
              :src="side_nav_config.logo_url"
              :alt="side_nav_config.app_name"
              class="logo-image"
            >
          </div>
          <h2 class="app-title">
            {{ side_nav_config.app_name }}
          </h2>
          <div class="divider" />
        </div>

        <PanelMenu
          class="sidenav-menu"
          :model="side_nav_config.items"
          :pt="{
            root: {
              class: 'sidenav-menu-root',
              style: 'gap: 0.25rem',
            },
            panel: {
              class: 'sidenav-panel',
              style: 'border: none; margin-bottom: 0.25rem;',
            },
          }"
        >
          <template #item="{ item, props }">
            <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
              <div
                class="menu-item" :class="[{ 'menu-item--active': menu_selected_item === item.label }]"
                @click="item.label && selected_item(typeof item.label === 'function' ? item.label() : item.label)"
              >
                <a
                  v-ripple
                  class="menu-link"
                  :href="href"
                  v-bind="props.action"
                  @click="navigate"
                >
                  <component
                    :is="item.icon?.startsWith('i-') ? 'div' : 'i'"
                    v-if="item.icon"
                    class="menu-icon" :class="[item.icon]"
                  />
                  <span class="menu-label">{{ item.label }}</span>
                </a>
              </div>
            </router-link>
            <a
              v-else
              v-ripple
              class="menu-link"
              :href="item.url"
              :target="item.target"
              v-bind="props.action"
            >
              <component
                :is="item.icon?.startsWith('i-') ? 'div' : 'i'"
                v-if="item.icon"
                class="menu-icon" :class="[item.icon]"
              />
              <span class="menu-label">{{ item.label }}</span>
            </a>
          </template>
        </PanelMenu>
      </template>

      <template #footer>
        <div class="sidenav-footer">
          <Button
            label="Account"
            icon="pi pi-user"
            class="footer-btn"
            outlined
            size="small"
          />
          <Button
            label="Logout"
            icon="pi pi-sign-out"
            class="footer-btn"
            severity="danger"
            text
            size="small"
          />
        </div>
      </template>
    </Drawer>
  </div>
</template>

<style scoped lang="scss">
.side_nav {
  top: 1rem !important;
  height: calc(100vh - 4rem) !important;
  left: 0;
  backdrop-filter: #555556 !important;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidenav-header {
  padding: 1.5rem 1rem;
  margin-top: 0.0rem;
  text-align: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  background: #0f172a;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
}

.logo-image {
  transition: transform 0.3s ease;
}

.logo-image:hover {
  transform: scale(1.05);
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-primary-color);
  margin: 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--p-primary-color), transparent);
  margin-top: 1rem;
}

.sidenav-menu {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem 0.5rem;
  background: transparent;
}

.sidenav-menu-root {
  background: transparent !important;
  border: none !important;
  padding: 0;
}

.sidenav-panel {
  background: transparent !important;
  border: none !important;
  margin-bottom: 0.1rem !important;
}

.menu-item {
  border-radius: 8px;
  margin-bottom: 0.1rem;
  transition: all 0.2s ease;
  overflow: hidden;
}

.menu-item:hover {
  background: var(--p-surface-100);
  transform: translateX(4px);
}

.menu-item--active {
  background: linear-gradient(135deg, var(--p-primary-color) 0%, var(--p-primary-600) 100%) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.menu-item--active .menu-link {
  color: white !important;
}

.menu-link {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: var(--p-text-color);
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.menu-icon {
  font-size: 1.25rem;
  width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  transition: transform 0.2s ease;
}

.menu-item--active .menu-icon {
  transform: scale(1.1);
}

.menu-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidenav-footer {
  padding: 1rem;
  border-top: 1px solid var(--p-surface-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #0f172a;
}

.footer-btn {
  width: 100%;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.footer-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.sidenav-menu::-webkit-scrollbar {
  width: 6px;
}

.sidenav-menu::-webkit-scrollbar-track {
  background: transparent;
}

.sidenav-menu::-webkit-scrollbar-thumb {
  background: var(--p-surface-300);
  border-radius: 3px;
}

.sidenav-menu::-webkit-scrollbar-thumb:hover {
  background: var(--p-surface-400);
}

.dark .side_nav {
  background: #555556;
}
</style>