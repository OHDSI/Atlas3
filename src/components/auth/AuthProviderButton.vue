<template>
  <AtlasButton
    :icon="provider.icon"
    variant="secondary"
    size="lg"
    block
    class="mb-2"
    @click="handleClick"
  >
    {{ provider.name }}
  </AtlasButton>
</template>

<script setup lang="ts">
import { AtlasButton } from '@/components/ui'
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
