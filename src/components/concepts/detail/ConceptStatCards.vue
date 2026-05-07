<script setup lang="ts">
import type { ConceptRecordCount } from '@/models/concept-detail.types'
defineProps<{
  conceptId: number
  primarySourceKey: string
  countsBySource: Map<string, ConceptRecordCount>
}>()
</script>
<template><div data-testid="concept-stat-cards" /></template>
