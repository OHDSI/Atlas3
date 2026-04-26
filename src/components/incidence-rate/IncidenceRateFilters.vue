<template>
  <div class="incidence-rate-filters">
    <v-text-field
      :model-value="modelValue.searchQuery"
      :label="tv('incidenceRate.search', 'Search')"
      density="compact"
      hide-details
      style="max-width: 280px"
      @update:model-value="(v: string | null) => emit('update:modelValue', { ...modelValue, searchQuery: v ?? '' })"
    />
    <v-select
      :model-value="modelValue.selectedTags"
      :items="allTags"
      :label="tv('incidenceRate.tags', 'Tags')"
      multiple
      chips
      density="compact"
      hide-details
      style="max-width: 280px"
      @update:model-value="(v: string[] | null) => emit('update:modelValue', { ...modelValue, selectedTags: v ?? [] })"
    />
    <v-text-field
      :model-value="modelValue.author"
      :label="tv('incidenceRate.author', 'Author')"
      density="compact"
      hide-details
      style="max-width: 200px"
      @update:model-value="(v: string | null) => emit('update:modelValue', { ...modelValue, author: v ?? '' })"
    />
    <v-btn
      variant="text"
      @click="emit('clear')"
    >
      Clear
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import type { IncidenceRateListFilters } from '@/composables/useIncidenceRates'
import { useI18n } from '@/composables/useI18n'

defineProps<{ modelValue: IncidenceRateListFilters; allTags: string[] }>()
const emit = defineEmits<{
  'update:modelValue': [v: IncidenceRateListFilters]
  clear: []
}>()
const { tv } = useI18n()
</script>

<style scoped>
.incidence-rate-filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
</style>
