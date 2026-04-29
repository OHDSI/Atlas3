<template>
  <v-form
    ref="formRef"
    class="credentials-form"
    @submit.prevent="handleSubmit"
  >
    <v-text-field
      v-model="credentials.username"
      :label="provider.loginPlaceholder || t('columns.login', 'Username').value"
      :placeholder="provider.loginPlaceholder || t('columns.login', 'Enter username').value"
      variant="outlined"
      density="compact"
      prepend-inner-icon="mdi-account-outline"
      autocomplete="username"
      :disabled="loading"
      :rules="[required]"
      required
      class="mb-3"
    />

    <v-text-field
      v-model="credentials.password"
      :label="provider.passwordPlaceholder || t('components.welcome.password', 'Password').value"
      :placeholder="provider.passwordPlaceholder || t('components.welcome.password', 'Enter password').value"
      type="password"
      variant="outlined"
      density="compact"
      prepend-inner-icon="mdi-lock-outline"
      autocomplete="current-password"
      :disabled="loading"
      :rules="[required]"
      required
      class="mb-4"
    />

    <v-btn
      type="submit"
      color="primary"
      block
      size="large"
      :loading="loading"
      class="credentials-form__submit"
    >
      {{ t('common.menu', 'Sign in') }}
    </v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { AuthProvider, LoginCredentials } from '@/models/auth.types'

const { t } = useI18n()

interface Props {
  provider: AuthProvider
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'submit', credentials: LoginCredentials): void
}>()

const formRef = ref()
const credentials = ref<LoginCredentials>({
  username: '',
  password: '',
})

function required(value: string) {
  return !!value || t('common.requiredField', 'This field is required').value
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (valid) {
    emit('submit', { ...credentials.value })
    credentials.value.password = ''
  }
}
</script>

<style scoped>
.credentials-form__submit {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  margin-top: 4px;
}
</style>
