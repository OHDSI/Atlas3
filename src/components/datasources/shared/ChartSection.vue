<template>
  <AtlasCard
    class="chart-section"
    padding="none"
  >
    <div class="chart-section__title">
      {{ title }}
    </div>
    <div class="chart-section__body">
      <v-skeleton-loader
        v-if="loading"
        type="image"
        height="300"
      />

      <v-alert
        v-else-if="error"
        type="error"
        variant="tonal"
      >
        {{ error }}
      </v-alert>

      <div
        v-else
        class="chart-section__content"
      >
        <slot />
      </div>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { AtlasCard } from '@/components/ui'

interface Props {
  title: string
  loading?: boolean
  error?: string | null
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})
</script>

<style scoped>
.chart-section__title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  padding: 16px 20px 8px;
}

.chart-section__body {
  padding: 0 20px 20px;
}

.chart-section__content {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
