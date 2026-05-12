<template>
  <v-app>
    <a
      href="#main"
      class="skip-link"
    >
      {{ t('a11y.skipToMain', 'Skip to main content') }}
    </a>

    <!-- Initial loading overlay while translations load -->
    <v-overlay
      v-model="isInitializing"
      persistent
      class="align-center justify-center"
    >
      <div class="text-center">
        <AtlasProgressCircular
          indeterminate
          size="64"
          color="primary"
        />
        <div class="mt-4 text-h6">
          {{ t('common.loading', 'Loading...') }}
        </div>
      </div>
    </v-overlay>

    <NavBar v-if="showNavBar" />

    <v-main
      id="main"
      tabindex="-1"
    >
      <!-- Configuration validation warnings -->
      <ConfigurationWarningBanner />

      <router-view />
    </v-main>

    <!-- License Agreement Dialog -->
    <LicenseAgreementDialog
      v-model="showLicenseDialog"
      @accept="handleAcceptLicense"
      @reject="handleRejectLicense"
    />

    <!-- Session Expiry Modal -->
    <SessionExpiryModal
      :model-value="authStore.sessionExpiryModalOpen"
      :expires-at="authStore.sessionExpiresAt || new Date()"
      :remaining-seconds="remainingSeconds"
      :is-extending="authStore.isRefreshing"
      :extension-error="extensionError"
      @extend="handleExtendSession"
      @logout="handleLogout"
      @update:model-value="handleDismissModal"
      @expired="handleExpired"
    />

    <!-- Configuration Panel -->
    <ConfigPanel />

    <!-- Concept Detail Drawer (opens from concept tables and search results) -->
    <ConceptDetailDrawer />

    <!-- Pythia (Atlas3 cohort design advisor) — global FAB + overlay,
         gated on auth + feature flag. -->
    <template v-if="pythiaEnabled && authStore.isAuthenticated">
      <PluginFab mount-id="pythia.fab" />
      <PluginOverlayHost />
    </template>
  </v-app>
</template>

<script setup lang="ts">
import { AtlasProgressCircular } from '@/components/ui'
import { computed, ref, onMounted } from 'vue'
import NavBar from '@/components/shared/NavBar.vue'
import SessionExpiryModal from '@/components/auth/SessionExpiryModal.vue'
import ConfigurationWarningBanner from '@/components/cohort-builder/ConfigurationWarningBanner.vue'
import LicenseAgreementDialog from '@/components/shared/LicenseAgreementDialog.vue'
import ConfigPanel from '@/components/config/ConfigPanel.vue'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import ConceptDetailDrawer from '@/components/concepts/detail/ConceptDetailDrawer.vue'
import PluginFab from '@/components/plugins/PluginFab.vue'
import PluginOverlayHost from '@/components/plugins/PluginOverlayHost.vue'
import { useLocaleStore } from '@/stores/locale'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useLicenseAgreement } from '@/composables/useLicenseAgreement'
import { pluginConfigService } from '@/services/PluginConfigService'
import { logger } from '@/utils/logger'

const localeStore = useLocaleStore()
const authStore = useAuthStore()
const { t } = useI18n()
const { showLicenseDialog, acceptLicense, rejectLicense, checkLicenseStatus } =
  useLicenseAgreement()

// Show overlay while initial translations are loading
const isInitializing = computed(() => {
  // Only show during initial load (when no translations are loaded yet)
  return localeStore.loading && Object.keys(localeStore.translations).length === 0
})

const showNavBar = ref(true)

const pythiaEnabled = import.meta.env.VITE_BAO_AGENT_ENABLED === 'true'

pluginConfigService.onChange(() => {
  showNavBar.value = pluginConfigService.showNavBar()
})

// Session expiry modal state
const extensionError = ref<string | null>(null)
const remainingSeconds = computed(() => {
  if (!authStore.sessionExpiresAt) return 0
  const now = Date.now()
  const remaining = Math.max(0, Math.floor((authStore.sessionExpiresAt.getTime() - now) / 1000))
  return remaining
})

// Handle "Extend Session" button
async function handleExtendSession() {
  try {
    extensionError.value = null
    await authStore.extendSession()
  } catch (error) {
    logger.error('App', 'Failed to extend session', error)
    extensionError.value = 'Failed to extend session. Please try again.'
  }
}

// Handle "Logout" button
function handleLogout() {
  authStore.clearAuth()
  authStore.openLoginModal()
}

// Handle modal dismissal
async function handleDismissModal() {
  // Treat dismissal as implicit "Extend Session"
  await handleExtendSession()
}

// Handle session expired
function handleExpired() {
  authStore.clearAuth()
  authStore.openLoginModal()
}

// License agreement handlers
function handleAcceptLicense() {
  acceptLicense()
}

function handleRejectLicense() {
  rejectLicense()
}

onMounted(() => {
  checkLicenseStatus()
  showNavBar.value = pluginConfigService.showNavBar()
  // Kick off TrexSQL detection + dataSources cache-status fetch once, at
  // app boot. This populates the shared module-level state so any page
  // (cohort builder, configuration, etc.) sees `isTrexSQLEnabled = true`
  // and `dataSources` populated without each component re-running detection.
  void useTrexSQLCache().initialize()
})
</script>

<style scoped>
.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  z-index: 10000;
}

.skip-link:focus {
  left: 1rem;
  top: 1rem;
  width: auto;
  height: auto;
  padding: 0.5rem 1rem;
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  outline: none;
}
</style>
