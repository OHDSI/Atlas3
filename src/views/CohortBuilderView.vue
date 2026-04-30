<template>
  <page-shell>
    <cohort-builder :id="id" />
  </page-shell>
</template>

<script setup lang="ts">
import PageShell from '@/components/shared/PageShell.vue'
import CohortBuilder from '@/components/cohort/CohortBuilder.vue'

/**
 * CohortBuilderView - Main cohort builder page
 * Contains the CohortBuilder component for creating/editing cohorts
 */
defineProps<{
  id?: string
}>()
</script>
