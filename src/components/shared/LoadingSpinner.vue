<template>
  <div class="loading-spinner">
    <AtlasProgressCircular
      :size="size"
      :width="width"
      color="primary"
      indeterminate
    />
    <p
      v-if="message"
      class="text-body-2 mt-2"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { AtlasProgressCircular } from '@/components/ui'
/**
 * LoadingSpinner - Vuetify v-progress-circular wrapper
 */
defineProps<{
  size?: number | string
  width?: number | string
  message?: string
}>()
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
