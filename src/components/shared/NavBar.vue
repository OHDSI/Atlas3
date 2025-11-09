<template>
  <header class="nav-bar">
    <div class="nav-bar__container">
      <div class="nav-bar__logo" @click="handleLogoClick" role="button" tabindex="0">
        <img :src="logoSrc" alt="ATLAS" height="20" />
      </div>
      <nav class="nav-bar__nav">
        <ul class="nav-bar__nav-list">
          <template v-for="item in navigationItems" :key="item.id">
            <li v-if="item.visible" class="nav-bar__nav-item" :class="{ 'nav-bar__nav-item--active': item.active }">
              <a href="#" class="nav-bar__nav-link" @click.prevent="handleNavClick(item)">
                {{ getNavTitle(item.titleKey) }}
              </a>
            </li>
          </template>
        </ul>
      </nav>
      <div class="nav-bar__right" tabindex="0">
        <!-- Language Selector -->
        <LanguageSelector />
        
        <!-- Authentication UI -->
        <div v-if="!auth.isAuthenticated.value" class="nav-bar__auth">
          <v-btn variant="text" @click="auth.openLoginModal()" prepend-icon="mdi-login">
            {{ signInLabel }}
          </v-btn>
        </div>
        <div v-else class="nav-bar__user">
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn variant="text" v-bind="props" append-icon="mdi-menu-down">
                <v-icon left>mdi-account-circle</v-icon>
                {{ auth.userDisplayName.value }}
              </v-btn>
            </template>
            <v-list>
              <v-list-item @click="handleLogout">
                <template v-slot:prepend>
                  <v-icon>mdi-logout</v-icon>
                </template>
                <v-list-item-title>{{ signOutLabel }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
        
        <img :src="logoOhdsiSrc" alt="OHDSI" height="36" role="button" @click="handleOhdsiClick" class="ml-4" />
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
import { authConfig } from '@/config/auth.config'
import LoginModal from '@/components/auth/LoginModal.vue'
import LanguageSelector from '@/components/LanguageSelector.vue'
import logoSvg from '@/assets/icons/atlas-text.svg'
import logoOhdsiPng from '@/assets/icons/ohdsi.png'

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

const logoSrc = logoSvg
const logoOhdsiSrc = logoOhdsiPng

const signInLabel = t('common.menu', 'Sign In')
const signOutLabel = t('common.menu', 'Sign Out')

const navigationItems = ref<NavigationItem[]>([
  { id: 'datasources', titleKey: 'navigation.datasources', route: '/datasources', visible: true, active: false },
  { id: 'concepts', titleKey: 'navigation.conceptsets', route: '/concepts', visible: true, active: false },
  { id: 'cohorts', titleKey: 'navigation.cohortdefinitions', route: '/cohorts', visible: true, active: true }
])

function getNavTitle(key: string): string {
  const defaults: Record<string, string> = {
    'navigation.conceptsets': 'Concept Sets',
    'navigation.cohortdefinitions': 'Cohorts',
    'navigation.datasources': 'Data Sources'
  }
  return t(key, defaults[key] || key).value
}

const handleLogoClick = async () => {
  await router.isReady()
  router.push('/')
}

const handleOhdsiClick = () => {
  window.open('https://ohdsi.org', '_blank')
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

const updateActiveNavFromRoute = () => {
  const currentPath = router.currentRoute.value.path
  
  navigationItems.value.forEach(item => {
    item.active = currentPath.startsWith(item.route)
  })
}

onMounted(() => {
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

.nav-bar__logo {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  margin-left: 2rem;
  cursor: pointer;
}

.nav-bar__logo img {
  display: block;
}

.nav-bar__right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 2rem;
}

.nav-bar__right img {
  padding: 0.5rem 0;
  cursor: pointer;
}

.nav-bar__auth,
.nav-bar__user {
  margin-right: 1rem;
}

.nav-bar__nav {
  padding-left: 2rem;
}

.nav-bar__nav-list {
  display: flex;
  align-items: center;
  gap: 1rem;
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
  padding: 18px;
  color: #1f425a;
  font-weight: 400;
  text-decoration: none;
  transition: color 0.15s ease-in-out;
}

.nav-bar__nav-link:hover {
  color: #2d5f7f;
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
