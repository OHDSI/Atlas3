<template>
  <AtlasSelect
    :model-value="modelValue"
    :items="filterItems"
    :label="label"
    :placeholder="placeholder"
    item-title="name"
    item-value="criteriaType"
    variant="outlined"
    @update:model-value="(v: unknown) => onFilterSelect(v != null ? String(v) : null)"
  >
    <template #item="{ props: slotProps, item }">
      <AtlasListItem
        v-bind="slotProps"
        :title="item.raw.name"
        :subtitle="item.raw.description"
      >
        <template #append>
          <AtlasChip
            v-if="item.raw.groupOnly"
            size="sm"
            tone="primary"
          >
            Group Only
          </AtlasChip>
          <AtlasChip
            v-if="!item.raw.requiresConceptSet"
            size="sm"
            color="secondary"
          >
            No Concept Set
          </AtlasChip>
        </template>
      </AtlasListItem>
    </template>
  </AtlasSelect>
</template>

<script setup lang="ts">
import { AtlasChip, AtlasListItem, AtlasSelect } from '@/components/ui'
/**
 * FilterTypeSelector Component
 *
 * Dynamic filter type dropdown that displays available filters based on section context.
 * Integrates with configuration-driven filter system and i18n for localized display.
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
  return availableFilters.value.map(filter => ({
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
