<script setup lang="ts">
import type { Concept } from '@/models/concept-set.types'
defineProps<{ concept: Concept }>()
</script>
<template><div data-testid="concept-attributes-card" /></template>
