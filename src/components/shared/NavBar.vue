<template>
  <header class="nav-bar">
    <div class="nav-bar__container">
      <!-- Debug: Show what's being rendered -->
      <!-- Custom logo (when configured) -->
      <div
        v-if="customLogoUrl"
        class="nav-bar__logo nav-bar__logo--custom"
        role="button"
        tabindex="0"
        @click="handleLogoClick"
      >
        <img
          :src="customLogoUrl"
          alt="Logo"
          class="nav-bar__custom-logo"
          @error="handleLogoError"
          @load="handleLogoLoad"
        >
      </div>

      <!-- Default logos (OHDSI + ATLAS) -->
      <template v-else>
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
      </template>
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
        <AtlasMenu>
          <template #activator="{ props: menuProps }">
            <AtlasButton
              v-bind="menuProps"
              variant="ghost"
              icon="mdi-menu-down"
              icon-position="end"
            >
              <AtlasIcon start>
                mdi-menu
              </AtlasIcon>
              {{ t('common.menu', 'Menu') }}
            </AtlasButton>
          </template>
          <AtlasList>
            <template
              v-for="item in navigationItems"
              :key="item.id"
            >
              <AtlasListItem
                v-if="item.visible"
                :active="item.active"
                @click="handleNavClick(item)"
              >
                <v-list-item-title>
                  {{ getNavTitle(item.titleKey) }}
                </v-list-item-title>
              </AtlasListItem>
            </template>
          </AtlasList>
        </AtlasMenu>
      </div>
      <div
        class="nav-bar__right"
        tabindex="0"
      >
        <!-- Feedback Button -->
        <v-btn
          v-if="showFeedbackButton"
          rounded
          color="orange"
          variant="flat"
          size="small"
          :href="feedbackUrl"
          target="_blank"
          class="mr-4"
        >
          Feedback
        </v-btn>

        <!-- Language Selector -->
        <LanguageSelector v-if="showLanguageSelector" />

        <!-- Configuration Panel Icon: hidden when user has no admin perms -->
        <v-btn
          v-if="showConfigButton && hasAnyAdminAccess"
          icon
          variant="text"
          aria-label="Open configuration panel"
          @click="handleConfigClick"
        >
          <AtlasIcon>mdi-cog</AtlasIcon>
        </v-btn>

        <!-- Authentication UI -->
        <div
          v-if="!auth.isAuthenticated.value"
          class="nav-bar__auth"
        >
          <AtlasButton
            variant="ghost"
            icon="mdi-login"
            @click="auth.openLoginModal()"
          >
            {{ signInLabel }}
          </AtlasButton>
        </div>
        <div
          v-else-if="showUserMenu"
          class="nav-bar__user"
        >
          <AtlasMenu>
            <template #activator="{ props }">
              <AtlasButton
                variant="ghost"
                v-bind="props"
                icon="mdi-menu-down"
                icon-position="end"
              >
                <AtlasIcon left>
                  mdi-account-circle
                </AtlasIcon>
                {{ auth.userDisplayName.value }}
              </AtlasButton>
            </template>
            <AtlasList>
              <AtlasListItem @click="handleLogout">
                <template #prepend>
                  <AtlasIcon>mdi-logout</AtlasIcon>
                </template>
                <v-list-item-title>
                  {{ signOutLabel }}
                </v-list-item-title>
              </AtlasListItem>
            </AtlasList>
          </AtlasMenu>
        </div>
      </div>
    </div>

    <!-- Login Modal -->
    <LoginModal />
  </header>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { usePermissions } from '@/composables/usePermissions'
import { useUIStore } from '@/stores/ui'
import { authConfig } from '@/config/auth.config'
import {
  generatePluginMenuItems,
  type PluginMenuItem,
} from '@/plugins/navigation/PluginMenuIntegration.ts'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'
import { pluginConfigService } from '@/services/PluginConfigService'
import { logger } from '@/utils/logger'
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
const { hasAnyPermission } = usePermissions()
const uiStore = useUIStore()

// Hide the cog icon entirely for users without any admin permission. Mirrors
// the per-tab gating in ConfigPanel — if every section would be hidden, the
// entry point shouldn't be visible at all.
const hasAnyAdminAccess = computed(() =>
  hasAnyPermission(['admin:cache', 'admin:source', 'admin:tags', 'admin:security', 'job:*:get'])
)

const logoSrc = logoSvg
const logoOhdsiOnlySrc = logoOhdsiOnlyPng
const customLogoUrl = ref<string | null>(null)

const showFeedbackButton = ref(true)
const showLanguageSelector = ref(true)
const showConfigButton = ref(true)
const showUserMenu = ref(true)
const feedbackUrl = ref('https://forms.office.com/r/2JzrYy1yDP')
const logoNavigateTo = ref('/')

const signInLabel = t('components.userBar.signin', 'Sign In')
const signOutLabel = t('components.userBar.signout', 'Sign Out')

// Core navigation items (will be filtered based on plugin configuration)
const coreNavigationItems: NavigationItem[] = [
  {
    id: 'datasources',
    titleKey: 'navigation.datasources',
    route: '/datasources',
    visible: true,
    active: false,
  },
  {
    id: 'concepts',
    titleKey: 'navigation.conceptsets',
    route: '/concepts',
    visible: true,
    active: false,
  },
  {
    id: 'cohorts',
    titleKey: 'navigation.cohortdefinitions',
    route: '/cohorts',
    visible: true,
    active: true,
  },
  {
    id: 'analysis',
    titleKey: 'navigation.analysis',
    route: '/analysis',
    visible: true,
    active: false,
  },
  {
    id: 'profiles',
    titleKey: 'navigation.profiles',
    route: '/profiles',
    visible: true,
    active: false,
  },
]

const navigationItems = ref<NavigationItem[]>(getFilteredCoreNavigationItems())

function getFilteredCoreNavigationItems(): NavigationItem[] {
  return coreNavigationItems.filter(item =>
    pluginConfigService.isCoreNavigationItemEnabled(item.id)
  )
}

// Load plugin menu items
function loadPluginMenuItems() {
  try {
    const pluginMenuItems = generatePluginMenuItems()

    // Start with filtered core navigation items based on plugin configuration
    navigationItems.value = getFilteredCoreNavigationItems()

    // Add plugin menu items to navigation
    pluginMenuItems.forEach((pluginItem: PluginMenuItem) => {
      if (pluginItem.visible) {
        navigationItems.value.push({
          id: pluginItem.id,
          titleKey: pluginItem.name, // Use name directly as title
          route: pluginItem.route,
          visible: true,
          active: false,
        })
      }
    })

    logger.debug('NavBar', 'Loaded plugin menu items', pluginMenuItems.length)
  } catch (error) {
    logger.error('NavBar', 'Failed to load plugin menu items', error)
  }
}

function getNavTitle(key: string): string {
  const defaults: Record<string, string> = {
    'navigation.conceptsets': 'Concept Sets',
    'navigation.cohortdefinitions': 'Cohorts',
    'navigation.profiles': 'Profiles',
    'navigation.datasources': 'Data Sources',
    'navigation.analysis': 'Analysis',
    'navigation.characterizations': 'Characterizations',
    'navigation.featureAnalyses': 'Feature Analyses',
    'navigation.pathways': 'Pathways',
    'navigation.incidenceRates': 'Incidence Rates',
  }
  // If key starts with a capital letter, it's likely a direct title (from plugin)
  if (key && key.length > 0 && key[0] && key[0] === key[0].toUpperCase()) {
    return key
  }
  return t(key, defaults[key] || key).value
}

const handleLogoClick = async () => {
  await router.isReady()
  router.push(logoNavigateTo.value)
}

const handleLogoError = (event: Event) => {
  logger.error('NavBar', 'Custom logo failed to load', { url: customLogoUrl.value, event })
}

const handleLogoLoad = () => {
  logger.debug('NavBar', 'Custom logo loaded successfully', customLogoUrl.value)
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
    logger.error('NavBar', 'Logout failed', error)
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
  customLogoUrl.value = pluginConfigService.getLogoUrl()
  showFeedbackButton.value = pluginConfigService.showFeedbackButton()
  showLanguageSelector.value = pluginConfigService.showLanguageSelector()
  showConfigButton.value = pluginConfigService.showConfigButton()
  showUserMenu.value = pluginConfigService.showUserMenu()
  feedbackUrl.value = pluginConfigService.getFeedbackUrl()
  logoNavigateTo.value = pluginConfigService.getLogoNavigateTo()

  pluginConfigService.onChange(() => {
    customLogoUrl.value = pluginConfigService.getLogoUrl()
    showFeedbackButton.value = pluginConfigService.showFeedbackButton()
    showLanguageSelector.value = pluginConfigService.showLanguageSelector()
    showConfigButton.value = pluginConfigService.showConfigButton()
    showUserMenu.value = pluginConfigService.showUserMenu()
    feedbackUrl.value = pluginConfigService.getFeedbackUrl()
    logoNavigateTo.value = pluginConfigService.getLogoNavigateTo()
  })

  // Load plugin menu items initially (will be empty if plugins haven't loaded yet)
  loadPluginMenuItems()

  // Set up plugin state watchers
  const watchedPlugins = new Set<string>()

  const setupPluginWatchers = () => {
    const plugins = pluginRegistry.getAllPlugins()
    plugins.forEach(plugin => {
      if (!watchedPlugins.has(plugin.registration.id)) {
        watchedPlugins.add(plugin.registration.id)
        pluginRegistry.onStateChange(plugin.registration.id, state => {
          if (state === 'loaded') {
            logger.debug('NavBar', `Plugin ${plugin.registration.id} loaded, reloading menu items`)
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
      logger.debug('NavBar', 'Stopped checking for new plugins')
    }
  }, 500)

  updateActiveNavFromRoute()
  router.afterEach(() => {
    updateActiveNavFromRoute()
  })

  if (
    authConfig.userAuthenticationEnabled &&
    authConfig.enableSkipLogin &&
    !auth.isAuthenticated.value
  ) {
    auth.openLoginModal()
  }
})
</script>

<style scoped>
.nav-bar {
  width: 100%;
  height: 60px;
  background-color: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.nav-bar__container {
  display: flex;
  align-items: center;
  height: 100%;
}

.nav-bar__ohdsi-logo {
  display: block;
  height: 48px;
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

.nav-bar__logo--custom {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  margin-left: 1rem;
  cursor: pointer;
}

.nav-bar__custom-logo {
  display: block;
  height: 48px;
  width: auto;
  object-fit: contain;
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
  padding: 20px 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 400;
  text-decoration: none;
  transition: color 0.15s ease-in-out;
  font-size: 14px;
}

.nav-bar__nav-link:hover {
  color: rgb(var(--v-theme-primary));
}

@media (min-width: 960px) and (max-width: 1279px) {
  .nav-bar__nav-link {
    font-size: 13px;
    padding: 20px 8px;
  }
}

.nav-bar__nav-item--active .nav-bar__nav-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.nav-bar__nav-item--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 8px;
  right: 8px;
  height: 2px;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 2px;
}
</style>
