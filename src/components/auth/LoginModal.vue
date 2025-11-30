<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 bg-primary">
        <v-icon left>
          mdi-login
        </v-icon>
        {{ t('common.menu', 'Sign In') }}
      </v-card-title>

      <v-card-text class="pa-6">
        <v-alert
          v-if="errorMessage"
          type="error"
          class="mb-4"
          closable
          @click:close="clearError"
        >
          {{ errorMessage }}
        </v-alert>

        <div v-if="!selectedProvider">
          <p class="text-subtitle-1 mb-4">
            {{ t('components.authProviderSelect.info', 'Select an authentication provider:') }}
          </p>

          <v-list>
            <v-list-item
              v-for="provider in providers"
              :key="provider.name"
              class="mb-2"
              @click="selectProvider(provider)"
            >
              <template #prepend>
                <v-icon
                  :icon="provider.icon"
                  size="24"
                  class="mr-3"
                />
              </template>
              <v-list-item-title>{{ provider.name }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>

        <div v-else>
          <v-btn
            text
            class="mb-4"
            @click="backToProviders"
          >
            <v-icon left>
              mdi-arrow-left
            </v-icon>
            {{ t('common.back', 'Back') }}
          </v-btn>

          <CredentialsForm
            v-if="selectedProvider.isUseCredentialsForm"
            :provider="selectedProvider"
            :loading="isAuthenticating"
            @submit="handleLogin"
          />
        </div>
      </v-card-text>

      <v-card-actions v-if="!authConfig.userAuthenticationEnabled">
        <v-spacer />
        <v-btn
          text
          @click="close"
        >
          {{ t('components.authProviderSelect.skipLogin', 'Skip Login') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useI18n } from '@/composables/useI18n'
import { authConfig } from '@/config/auth.config'
import { authService } from '@/services/auth/authService'
import { logger } from '@/utils/logger'
import type { AuthProvider, LoginCredentials } from '@/models/auth.types'
import CredentialsForm from './CredentialsForm.vue'

const auth = useAuth()
const { t } = useI18n()

const isOpen = computed({
  get: () => auth.loginModalOpen.value,
  set: (value) => {
    if (!value) {
      close()
    }
  },
})

const providers = ref<AuthProvider[]>(authConfig.authProviders)
const selectedProvider = ref<AuthProvider | null>(null)
const loadingProviders = ref(false)

const isAuthenticating = computed(() => auth.isAuthenticating.value)
const errorMessage = computed(() => auth.errorMessage.value)

// Function to fetch providers from WebAPI
async function fetchProviders() {
  loadingProviders.value = true
  try {
    const fetchedProviders = await authService.fetchOAuthProviders()
    logger.debug('LoginModal', 'Fetched providers from WebAPI', fetchedProviders)

    if (fetchedProviders.length > 0) {
      providers.value = fetchedProviders
    } else {
      // Fallback to config providers if WebAPI doesn't return any
      logger.debug('LoginModal', 'Using providers from config', authConfig.authProviders)
      providers.value = authConfig.authProviders
    }
  } catch (error) {
    logger.error('LoginModal', 'Failed to fetch providers from WebAPI', error)
    // Fallback to config providers
    providers.value = authConfig.authProviders
  } finally {
    loadingProviders.value = false
  }
}

// Don't fetch on mount - wait for modal to open to ensure fresh data

// Watch for modal open/close and fetch providers when it opens
watch(
  () => auth.loginModalOpen.value,
  async (newValue) => {
    if (newValue) {
      // Reset selection first
      selectedProvider.value = null

      // Fetch fresh providers whenever modal opens
      await fetchProviders()

      // IMPORTANT: Wait for providers to be fetched before auto-selecting
      // This ensures we use the backend's isUseCredentialsForm value, not env var
      // Only auto-select if it's a credentials form (not OAuth redirect)
      if (providers.value.length === 1) {
        const firstProvider = providers.value[0]
        if (firstProvider && firstProvider.isUseCredentialsForm) {
          selectProvider(firstProvider)
        }
      }
    } else {
      // Reset state when modal closes
      selectedProvider.value = null
    }
  }
)

function selectProvider(provider: AuthProvider) {
  selectedProvider.value = provider

  // For OAuth/redirect providers (non-AJAX), trigger redirect via authService
  if (!provider.isUseCredentialsForm && !provider.ajax) {
    auth.login(provider.url)
  }
}

function backToProviders() {
  selectedProvider.value = null
  clearError()
}

async function handleLogin(credentials: LoginCredentials) {
  const provider = selectedProvider.value
  if (!provider) return

  try {
    await auth.login(provider.url, credentials)
  } catch (error) {
    logger.error('LoginModal', 'Login failed', error)
  }
}

function clearError() {
  auth.closeLoginModal()
  auth.openLoginModal()
}

function close() {
  auth.closeLoginModal()
  selectedProvider.value = null
}
</script>
