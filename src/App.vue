<template>
  <v-app>
    <!-- Initial loading overlay while translations load -->
    <v-overlay
      v-model="isInitializing"
      persistent
      class="align-center justify-center"
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
        />
        <div class="mt-4 text-h6">
          {{ t('common.loading', 'Loading...') }}
        </div>
      </div>
    </v-overlay>

    <NavBar />

    <v-main>
      <!-- Configuration validation warnings (FR-016) -->
      <v-container class="pt-4">
        <ConfigurationWarningBanner />
      </v-container>

      <router-view />
    </v-main>

    <!-- License Agreement Dialog -->
    <LicenseAgreementDialog
      v-model="showLicenseDialog"
      @accept="handleAcceptLicense"
      @reject="handleRejectLicense"
    />

    <!-- Session Expiry Modal (T036-T037) -->
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
  </v-app>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import NavBar from '@/components/shared/NavBar.vue'
import SessionExpiryModal from '@/components/auth/SessionExpiryModal.vue'
import ConfigurationWarningBanner from '@/components/cohort-builder/ConfigurationWarningBanner.vue'
import LicenseAgreementDialog from '@/components/shared/LicenseAgreementDialog.vue'
import { useLocaleStore } from '@/stores/locale'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useLicenseAgreement } from '@/composables/useLicenseAgreement'

const localeStore = useLocaleStore()
const authStore = useAuthStore()
const { t } = useI18n()
const {
  showLicenseDialog,
  acceptLicense,
  rejectLicense,
  checkLicenseStatus
} = useLicenseAgreement()

// Show overlay while initial translations are loading
const isInitializing = computed(() => {
  // Only show during initial load (when no translations are loaded yet)
  return localeStore.loading && Object.keys(localeStore.translations).length === 0
})

// Session expiry modal state
const extensionError = ref<string | null>(null)
const remainingSeconds = computed(() => {
  if (!authStore.sessionExpiresAt) return 0
  const now = Date.now()
  const remaining = Math.max(0, Math.floor((authStore.sessionExpiresAt.getTime() - now) / 1000))
  return remaining
})

// Handle "Extend Session" button (T037)
async function handleExtendSession() {
  try {
    extensionError.value = null
    await authStore.extendSession()
  } catch (error) {
    console.error('[App] Failed to extend session:', error)
    extensionError.value = 'Failed to extend session. Please try again.'
  }
}

// Handle "Logout" button (T037)
function handleLogout() {
  authStore.clearAuth()
  authStore.openLoginModal()
}

// Handle modal dismissal (T037)
async function handleDismissModal() {
  // Treat dismissal as implicit "Extend Session"
  await handleExtendSession()
}

// Handle session expired (T037)
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

// Check license status on mount
onMounted(() => {
  checkLicenseStatus()
})
</script>

<style scoped>
/* Global styles will be added in assets/styles/ during implementation */
</style>
