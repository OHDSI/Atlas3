<template>
  <v-form @submit.prevent="handleSubmit" ref="formRef">
    <v-text-field
      v-model="credentials.username"
      :label="provider.loginPlaceholder || t('columns.login', 'Username').value"
      :placeholder="provider.loginPlaceholder || t('columns.login', 'Enter username').value"
      variant="outlined"
      prepend-inner-icon="mdi-account"
      :disabled="loading"
      :rules="[required]"
      required
      class="mb-3"
    ></v-text-field>

    <v-text-field
      v-model="credentials.password"
      :label="provider.passwordPlaceholder || t('common.password', 'Password').value"
      :placeholder="provider.passwordPlaceholder || t('common.password', 'Enter password').value"
      type="password"
      variant="outlined"
      prepend-inner-icon="mdi-lock"
      :disabled="loading"
      :rules="[required]"
      required
      class="mb-4"
    ></v-text-field>

    <v-btn type="submit" color="primary" block size="large" :loading="loading">
      <v-icon left>mdi-login</v-icon>
      {{ t('common.menu', 'Sign In') }}
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
