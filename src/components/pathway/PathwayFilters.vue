<template>
  <div class="pathway-filters">
    <v-text-field
      :model-value="modelValue.searchQuery"
      label="Search"
      density="compact"
      hide-details
      style="max-width: 280px"
      @update:model-value="(v: string | null) => emit('update:modelValue', { ...modelValue, searchQuery: v ?? '' })"
    />
    <v-select
      :model-value="modelValue.selectedTags"
      :items="allTags"
      label="Tags"
      multiple
      chips
      density="compact"
      hide-details
      style="max-width: 280px"
      @update:model-value="(v: string[] | null) => emit('update:modelValue', { ...modelValue, selectedTags: v ?? [] })"
    />
    <v-text-field
      :model-value="modelValue.author"
      label="Author"
      density="compact"
      hide-details
      style="max-width: 200px"
      @update:model-value="(v: string | null) => emit('update:modelValue', { ...modelValue, author: v ?? '' })"
    />
    <v-btn variant="text" @click="emit('clear')">Clear</v-btn>
  </div>
</template>

<script setup lang="ts">
import type { PathwayFilters } from '@/composables/usePathways'

defineProps<{ modelValue: PathwayFilters; allTags: string[] }>()
const emit = defineEmits<{
  'update:modelValue': [v: PathwayFilters]
  clear: []
}>()
</script>

<style scoped>
.pathway-filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
</style>
