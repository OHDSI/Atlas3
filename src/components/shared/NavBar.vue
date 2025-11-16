<template>
  <header class="nav-bar">
    <div class="nav-bar__container">
      <img
        :src="logoOhdsiOnlySrc"
        alt="OHDSI"
        class="nav-bar__ohdsi-logo"
      >
      <div
        class="nav-bar__logo"
        role="button"
        tabindex="0"
        @click="handleLogoClick"
      >
        <img
          :src="logoSrc"
          alt="ATLAS"
          height="20"
        >
      </div>
      <!-- Full menu for larger screens -->
      <nav class="nav-bar__nav d-none d-md-block">
        <ul class="nav-bar__nav-list">
          <template
            v-for="item in navigationItems"
            :key="item.id"
          >
            <li
              v-if="item.visible"
              class="nav-bar__nav-item"
              :class="{ 'nav-bar__nav-item--active': item.active }"
            >
              <a
                href="#"
                class="nav-bar__nav-link"
                @click.prevent="handleNavClick(item)"
              >
                {{ getNavTitle(item.titleKey) }}
              </a>
            </li>
          </template>
        </ul>
      </nav>

      <!-- Dropdown menu for smaller screens -->
      <div class="nav-bar__nav-dropdown d-md-none">
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="text"
              append-icon="mdi-menu-down"
            >
              <v-icon start>
                mdi-menu
              </v-icon>
              {{ t('navigation.menu', 'Menu') }}
            </v-btn>
          </template>
          <v-list>
            <template
              v-for="item in navigationItems"
              :key="item.id"
            >
              <v-list-item
                v-if="item.visible"
                :active="item.active"
                @click="handleNavClick(item)"
              >
                <v-list-item-title>{{ getNavTitle(item.titleKey) }}</v-list-item-title>
              </v-list-item>
            </template>
          </v-list>
        </v-menu>
      </div>
      <div
        class="nav-bar__right"
        tabindex="0"
      >
        <!-- Feedback Button -->
        <v-btn
          rounded
          color="orange"
          variant="flat"
          size="small"
          href="https://forms.office.com/r/2JzrYy1yDP"
          target="_blank"
          class="mr-4"
        >
          Feedback
        </v-btn>

        <!-- Language Selector -->
        <LanguageSelector />

        <!-- Configuration Panel Icon (Feature: 013-config-panel) -->
        <v-btn
          icon
          variant="text"
          aria-label="Open configuration panel"
          @click="handleConfigClick"
        >
          <v-icon>mdi-cog</v-icon>
        </v-btn>

        <!-- Authentication UI -->
        <div
          v-if="!auth.isAuthenticated.value"
          class="nav-bar__auth"
        >
          <v-btn
            variant="text"
            prepend-icon="mdi-login"
            @click="auth.openLoginModal()"
          >
            {{ signInLabel }}
          </v-btn>
        </div>
        <div
          v-else
          class="nav-bar__user"
        >
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                variant="text"
                v-bind="props"
                append-icon="mdi-menu-down"
              >
                <v-icon left>
                  mdi-account-circle
                </v-icon>
                {{ auth.userDisplayName.value }}
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="handleLogout">
                <template #prepend>
                  <v-icon>mdi-logout</v-icon>
                </template>
                <v-list-item-title>{{ signOutLabel }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>

    <!-- Login Modal -->
    <LoginModal />
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { useUIStore } from '@/stores/ui'
import { authConfig } from '@/config/auth.config'
import { generatePluginMenuItems, type PluginMenuItem } from '@/plugins/navigation/PluginMenuIntegration.ts'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'
import LoginModal from '@/components/auth/LoginModal.vue'
import LanguageSelector from '@/components/LanguageSelector.vue'
import logoSvg from '@/assets/icons/atlas-text.svg'
import logoOhdsiOnlyPng from '@/assets/icons/OHDSI logo only - colored.png'

interface NavigationItem {
  id: string
  titleKey: string
  route: string
  visible: boolean
  active: boolean
}

const router = useRouter()
const auth = useAuth()
const { t } = useI18n()
const uiStore = useUIStore()

const logoSrc = logoSvg
const logoOhdsiOnlySrc = logoOhdsiOnlyPng

const signInLabel = t('components.userBar.signin', 'Sign In')
const signOutLabel = t('components.userBar.signout', 'Sign Out')

const navigationItems = ref<NavigationItem[]>([
  { id: 'datasources', titleKey: 'navigation.datasources', route: '/datasources', visible: true, active: false },
  { id: 'concepts', titleKey: 'navigation.conceptsets', route: '/concepts', visible: true, active: false },
  { id: 'cohorts', titleKey: 'navigation.cohortdefinitions', route: '/cohorts', visible: true, active: true }
])

// Load plugin menu items
function loadPluginMenuItems() {
  try {
    const pluginMenuItems = generatePluginMenuItems()

    // Remove existing plugin menu items first to avoid duplicates
    // Keep only the core navigation items (datasources, concepts, cohorts)
    navigationItems.value = navigationItems.value.filter(item =>
      !item.id.includes('-') // Plugin IDs contain hyphens (e.g., "hello-world-plugin-main")
    )

    // Add plugin menu items to navigation
    pluginMenuItems.forEach((pluginItem: PluginMenuItem) => {
      if (pluginItem.visible) {
        navigationItems.value.push({
          id: pluginItem.id,
          titleKey: pluginItem.name, // Use name directly as title
          route: pluginItem.route,
          visible: true,
          active: false
        })
      }
    })

    console.log('[NavBar] Loaded plugin menu items:', pluginMenuItems.length)
  } catch (error) {
    console.error('[NavBar] Failed to load plugin menu items:', error)
  }
}

function getNavTitle(key: string): string {
  const defaults: Record<string, string> = {
    'navigation.conceptsets': 'Concept Sets',
    'navigation.cohortdefinitions': 'Cohorts',
    'navigation.datasources': 'Data Sources'
  }
  // If key starts with a capital letter, it's likely a direct title (from plugin)
  if (key && key.length > 0 && key[0] && key[0] === key[0].toUpperCase()) {
    return key
  }
  return t(key, defaults[key] || key).value
}

const handleLogoClick = async () => {
  await router.isReady()
  router.push('/')
}

const handleNavClick = async (item: NavigationItem) => {
  await router.isReady()
  navigationItems.value.forEach(navItem => {
    navItem.active = navItem.id === item.id
  })
  router.push(item.route)
}

async function handleLogout() {
  try {
    await auth.logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

function handleConfigClick() {
  // Toggle the config panel state
  if (uiStore.configPanelState.isOpen) {
    uiStore.closeConfigPanel()
  } else {
    uiStore.openConfigPanel()
  }
}

const updateActiveNavFromRoute = () => {
  const currentPath = router.currentRoute.value.path
  
  navigationItems.value.forEach(item => {
    item.active = currentPath.startsWith(item.route)
  })
}

onMounted(() => {
  // Load plugin menu items initially (will be empty if plugins haven't loaded yet)
  loadPluginMenuItems()

  // Set up plugin state watchers
  const watchedPlugins = new Set<string>()

  const setupPluginWatchers = () => {
    const plugins = pluginRegistry.getAllPlugins()
    plugins.forEach(plugin => {
      if (!watchedPlugins.has(plugin.registration.id)) {
        watchedPlugins.add(plugin.registration.id)
        pluginRegistry.onStateChange(plugin.registration.id, (state) => {
          if (state === 'loaded') {
            console.log(`[NavBar] Plugin ${plugin.registration.id} loaded, reloading menu items`)
            loadPluginMenuItems()
          }
        })
      }
    })
  }

  // Initial setup
  setupPluginWatchers()

  // Check periodically for new plugins (for 5 seconds)
  let checkCount = 0
  const maxChecks = 10 // Check every 500ms for 5 seconds
  const intervalId = setInterval(() => {
    setupPluginWatchers()
    checkCount++
    if (checkCount >= maxChecks) {
      clearInterval(intervalId)
      console.log('[NavBar] Stopped checking for new plugins')
    }
  }, 500)

  updateActiveNavFromRoute()
  router.afterEach(() => {
    updateActiveNavFromRoute()
  })

  if (authConfig.enableSkipLogin && !auth.isAuthenticated.value) {
    auth.openLoginModal()
  }
})
</script>

<style scoped>
.nav-bar {
  width: 100%;
  height: 56px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-bar__container {
  display: flex;
  align-items: center;
  height: 100%;
}

.nav-bar__ohdsi-logo {
  display: block;
  height: 52px;
  margin-left: 1rem;
  margin-right: 0.25rem;
}

.nav-bar__logo {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  margin-left: 0.25rem;
  cursor: pointer;
}

.nav-bar__logo img {
  display: block;
}

.nav-bar__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 0.5rem;
  margin-left: auto;
}

.nav-bar__right img {
  padding: 0.5rem 0;
  cursor: pointer;
}

.nav-bar__auth,
.nav-bar__user {
  margin-right: 0;
}

.nav-bar__nav {
  padding-left: 1.5rem;
}

.nav-bar__nav-dropdown {
  padding-left: 1rem;
}

.nav-bar__nav-list {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-bar__nav-item {
  position: relative;
  margin-bottom: 0;
}

.nav-bar__nav-link {
  display: inline-block;
  padding: 18px 12px;
  color: #1f425a;
  font-weight: 400;
  text-decoration: none;
  transition: color 0.15s ease-in-out;
  font-size: 16px;
}

.nav-bar__nav-link:hover {
  color: #2d5f7f;
}

/* Reduce font size on lg breakpoint (1280px-1919px) for better fit */
@media (min-width: 960px) and (max-width: 1279px) {
  .nav-bar__nav-link {
    font-size: 14px;
    padding: 18px 8px;
  }
}

.nav-bar__nav-item--active .nav-bar__nav-link {
  font-weight: 500;
}

.nav-bar__nav-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 0.5rem;
  width: 100%;
  background-color: #1f425a;
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
