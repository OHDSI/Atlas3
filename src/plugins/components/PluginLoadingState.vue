<template>
  <div class="plugin-loading-state">
    <AtlasProgressCircular
      indeterminate
      color="primary"
      size="64"
    />
    <p>Loading plugin...</p>
  </div>
</template>

<script setup lang="ts">
import { AtlasProgressCircular } from '@/components/ui'
</script>

<style scoped>
.plugin-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.plugin-loading-state p {
  color: var(--atlas-color-on-surface-variant);
  font-size: 0.875rem;
}
</style>
