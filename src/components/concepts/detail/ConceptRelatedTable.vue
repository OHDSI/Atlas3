<script setup lang="ts">
import type { RelatedConcept } from '@/models/concept-detail.types'
defineProps<{ related: RelatedConcept[] }>()
</script>
<template><div data-testid="concept-related-table" /></template>
