<template>
  <div class="plugin-loading-state">
    <v-progress-circular indeterminate color="primary" size="64" />
    <p>Loading plugin...</p>
  </div>
</template>

<script setup lang="ts">
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
  color: #666;
  font-size: 0.875rem;
}
</style>
