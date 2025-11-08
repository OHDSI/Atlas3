<template>
  <div class="page-wrapper">
    <div class="page-card">
      <cohort-builder :id="id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import CohortBuilder from '@/components/cohort/CohortBuilder.vue'

/**
 * CohortBuilderView - Main cohort builder page
 * Contains the CohortBuilder component for creating/editing cohorts
 */
defineProps<{
  id?: string
}>()
</script>

<style scoped>
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}
</style>
