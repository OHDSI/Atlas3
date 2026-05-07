<script setup lang="ts">
import type { Concept } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'
defineProps<{ concept: Concept; parents: RelatedConcept[]; children: RelatedConcept[] }>()
</script>
<template><div data-testid="concept-hierarchy-minimap" /></template>
