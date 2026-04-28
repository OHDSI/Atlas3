<template>
  <v-dialog
    v-model="isOpen"
    :max-width="440"
    :persistent="true"
    transition="dialog-bottom-transition"
    class="login-modal"
  >
    <v-card
      :elevation="8"
      rounded="lg"
      class="login-card"
    >
      <div class="login-card__header">
        <div class="login-card__brand">
          Atlas
        </div>
        <h1 class="login-card__title">
          {{ t('components.auth.welcomeBack', 'Welcome back') }}
        </h1>
        <p class="login-card__subtitle">
          {{ t('components.auth.signInToAtlas', 'Sign in to continue') }}
        </p>
      </div>

      <div class="login-card__body">
        <div
          v-if="errorMessage"
          class="login-card__error"
          role="alert"
        >
          <v-icon
            size="18"
            color="error"
            class="mr-2"
          >
            mdi-alert-circle-outline
          </v-icon>
          <span>{{ errorMessage }}</span>
          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            class="ml-auto"
            :aria-label="t('common.close', 'Dismiss').value"
            @click="clearError"
          />
        </div>

        <div v-if="!selectedProvider">
          <p class="login-card__providers-label">
            {{ t('components.authProviderSelect.info', 'Continue with') }}
          </p>

          <div class="login-card__providers">
            <v-btn
              v-for="provider in providers"
              :key="provider.name"
              variant="outlined"
              color="default"
              size="large"
              block
              class="login-card__provider-btn"
              :prepend-icon="provider.icon"
              :append-icon="'mdi-chevron-right'"
              @click="selectProvider(provider)"
            >
              {{ provider.name }}
            </v-btn>
          </div>
        </div>

        <div v-else>
          <v-btn
            v-if="providers.length > 1"
            variant="text"
            size="small"
            class="login-card__back-btn"
            prepend-icon="mdi-arrow-left"
            @click="backToProviders"
          >
            {{ t('common.back', 'Back') }}
          </v-btn>

          <CredentialsForm
            v-if="selectedProvider.isUseCredentialsForm"
            :provider="selectedProvider"
            :loading="isAuthenticating"
            @submit="handleLogin"
          />
        </div>

        <div
          v-if="!authConfig.userAuthenticationEnabled"
          class="login-card__skip"
        >
          <v-btn
            variant="text"
            size="small"
            @click="close"
          >
            {{ t('components.authProviderSelect.skipLogin', 'Skip Login') }}
          </v-btn>
        </div>
      </div>

      <div class="login-card__footer">
        Atlas v3.0 · OHDSI
      </div>
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

async function fetchProviders() {
  loadingProviders.value = true
  try {
    const fetchedProviders = await authService.fetchOAuthProviders()
    logger.debug('LoginModal', 'Fetched providers from WebAPI', fetchedProviders)

    if (fetchedProviders.length > 0) {
      providers.value = fetchedProviders
    } else {
      logger.debug('LoginModal', 'Using providers from config', authConfig.authProviders)
      providers.value = authConfig.authProviders
    }
  } catch (error) {
    logger.error('LoginModal', 'Failed to fetch providers from WebAPI', error)
    providers.value = authConfig.authProviders
  } finally {
    loadingProviders.value = false
  }
}

watch(
  () => auth.loginModalOpen.value,
  async (newValue) => {
    if (newValue) {
      selectedProvider.value = null
      await fetchProviders()

      if (providers.value.length === 1) {
        const firstProvider = providers.value[0]
        if (firstProvider && firstProvider.isUseCredentialsForm) {
          selectProvider(firstProvider)
        }
      }
    } else {
      selectedProvider.value = null
    }
  },
  { immediate: true }
)

function selectProvider(provider: AuthProvider) {
  selectedProvider.value = provider

  if (provider.logoutUrl) {
    auth.saveLogoutUrl(provider.logoutUrl)
  }

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
  auth.setError(null)
}

function close() {
  auth.closeLoginModal()
  selectedProvider.value = null
}
</script>

<style scoped>
.login-modal :deep(.v-overlay__scrim) {
  backdrop-filter: blur(4px);
  background: rgba(31, 66, 90, 0.45);
  opacity: 1;
}

.login-card {
  background: #ffffff;
  overflow: hidden;
}

.login-card__header {
  padding: 32px 32px 0;
  text-align: center;
}

.login-card__brand {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 24px;
}

.login-card__title {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: rgba(0, 0, 0, 0.87);
  margin: 0 0 6px;
}

.login-card__subtitle {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.55);
  margin: 0 0 28px;
}

.login-card__body {
  padding: 0 32px 24px;
}

.login-card__providers-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(0, 0, 0, 0.5);
  margin: 0 0 12px;
  text-align: center;
}

.login-card__providers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.login-card__provider-btn {
  justify-content: flex-start;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  border-color: rgba(0, 0, 0, 0.12);
  transition: background-color 120ms ease, border-color 120ms ease;
}

.login-card__provider-btn:hover {
  background-color: rgba(31, 66, 90, 0.04);
  border-color: rgba(31, 66, 90, 0.4);
}

.login-card__provider-btn :deep(.v-btn__content) {
  flex: 1;
  text-align: left;
}

.login-card__back-btn {
  margin: 0 0 12px -8px;
  text-transform: none;
  letter-spacing: 0;
}

.login-card__error {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background-color: rgba(255, 82, 82, 0.08);
  border: 1px solid rgba(255, 82, 82, 0.25);
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.78);
  font-size: 13px;
  line-height: 1.4;
}

.login-card__skip {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.login-card__footer {
  padding: 16px;
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
