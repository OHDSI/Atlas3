<template>
  <v-select
    :model-value="modelValue"
    :items="filterItems"
    :label="label"
    :placeholder="placeholder"
    item-title="name"
    item-value="criteriaType"
    variant="outlined"
    density="comfortable"
    @update:model-value="onFilterSelect"
  >
    <template #item="{ props, item }">
      <v-list-item
        v-bind="props"
        :title="item.raw.name"
        :subtitle="item.raw.description"
      >
        <template #append>
          <v-chip
            v-if="item.raw.groupOnly"
            size="x-small"
            color="primary"
          >
            Group Only
          </v-chip>
          <v-chip
            v-if="!item.raw.requiresConceptSet"
            size="x-small"
            color="secondary"
          >
            No Concept Set
          </v-chip>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script setup lang="ts">
/**
 * FilterTypeSelector Component
 *
 * Dynamic filter type dropdown that displays available filters based on section context.
 * Integrates with configuration-driven filter system and i18n for localized display.
 *
 * Features (T023-T027):
 * - Dynamic filter list from configuration (T023, T024)
 * - Section-aware filtering (hides group-only in initial/censoring) (T027)
 * - Context-specific descriptions based on section (T026)
 * - Filter selection handler with validation (T025)
 * - Visual indicators for special filter types
 */

import { computed, ref } from 'vue'
import { useFilterConfig } from '@/composables/useFilterConfig'

export interface FilterTypeSelectorProps {
  /** Currently selected filter type */
  modelValue?: string

  /** Section context for filter availability */
  section: string

  /** Label for the selector */
  label?: string

  /** Placeholder text */
  placeholder?: string
}

const props = withDefaults(defineProps<FilterTypeSelectorProps>(), {
  modelValue: undefined,
  label: 'Filter Type',
  placeholder: 'Select a filter type...',
})

const emit = defineEmits<{
  /** Emitted when user selects a filter type */
  'update:modelValue': [filterType: string]
}>()

// Get filter configuration for current section
const sectionRef = ref(props.section)
const { availableFilters } = useFilterConfig(sectionRef)

/**
 * Transform FilterInfo objects into v-select items
 */
const filterItems = computed(() => {
  return availableFilters.value.map((filter) => ({
    key: filter.key,
    criteriaType: filter.criteriaType,
    name: filter.name,
    description: filter.description,
    requiresConceptSet: filter.requiresConceptSet,
    groupOnly: filter.groupOnly,
  }))
})

/**
 * Handle filter selection
 * Emits update:modelValue event with selected filter type key
 */
function onFilterSelect(filterType: string | null) {
  if (filterType) {
    emit('update:modelValue', filterType)
  }
}
</script>

<style scoped>
/**
 * No custom styles needed - using Vuetify defaults
 * Component relies on Vuetify's v-select styling
 */
</style>
