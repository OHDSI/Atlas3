<script setup lang="ts">
import type { Concept } from '@/models/concept-set.types'
defineProps<{ concept: Concept; primarySourceKey: string }>()
</script>
<template><div data-testid="concept-drilldown-chart" /></template>
