<template>
  <v-btn
    :prepend-icon="provider.icon"
    variant="outlined"
    block
    size="large"
    class="mb-2"
    @click="handleClick"
  >
    {{ provider.name }}
  </v-btn>
</template>

<script setup lang="ts">
import type { AuthProvider } from '@/models/auth.types'

interface Props {
  provider: AuthProvider
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', provider: AuthProvider): void
}>()

function handleClick() {
  emit('click', props.provider)
}
</script>
