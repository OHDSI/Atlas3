<template>
  <cohort-builder :id="id" />
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
