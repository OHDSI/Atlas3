<template>
  <div class="concept-facet-filters">
    <div class="concept-facet-filters__bar">
      <AtlasMenu
        v-model="menuOpen"
        :close-on-content-click="false"
        location="bottom end"
        offset="8"
      >
        <template #activator="{ props: activatorProps }">
          <AtlasButton
            v-bind="activatorProps"
            variant="secondary"
            icon="mdi-filter-variant"
            class="concept-facet-filters__menu-btn"
          >
            {{ filtersLabel }}
            <AtlasChip
              v-if="activeFilterCount > 0"
              size="sm"
              variant="flat"
              tone="primary"
              class="concept-facet-filters__count"
            >
              {{ activeFilterCount }}
            </AtlasChip>
          </AtlasButton>
        </template>

        <AtlasCard
          padding="none"
          class="concept-facet-filters__menu-card"
        >
          <div class="concept-facet-filters__menu-header">
            <span class="text-eyebrow">{{ filtersLabel }}</span>
            <AtlasSpacer />
            <AtlasButton
              :disabled="activeFilterCount === 0"
              variant="ghost"
              size="sm"
              @click="emit('clear')"
            >
              {{ clearAllLabel }}
            </AtlasButton>
          </div>

          <div class="concept-facet-filters__menu-body">
            <AtlasAutocomplete
              v-for="facet in facets"
              :key="facet.key"
              :model-value="selected[facet.key]"
              :items="itemsFor(facet.key)"
              item-title="label"
              item-value="value"
              :label="facetLabel(facet.key)"
              chips
              closable-chips
              multiple
              clearable
              variant="outlined"
              hide-details
              @update:model-value="(v) => onUpdate(facet.key, v as string[])"
            />
          </div>
        </AtlasCard>
      </AtlasMenu>
    </div>

    <div
      v-if="activeFilterCount > 0"
      class="concept-facet-filters__active"
    >
      <template
        v-for="facet in facets"
        :key="`chips-${facet.key}`"
      >
        <AtlasChip
          v-for="value in selected[facet.key]"
          :key="`${facet.key}-${value}`"
          size="sm"
          closable
          @close="removeValue(facet.key, value)"
        >
          {{ facetLabel(facet.key) }}: {{ value }}
        </AtlasChip>
      </template>
      <AtlasButton
        variant="ghost"
        size="sm"
        icon="mdi-close"
        @click="emit('clear')"
      >
        {{ clearAllLabel }}
      </AtlasButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { CONCEPT_FACETS, type FacetKey, type FacetOption } from '@/composables/useConceptFacets'
import { AtlasAutocomplete, AtlasButton, AtlasCard, AtlasChip, AtlasMenu, AtlasSpacer } from '@/components/ui'

interface Props {
  facetOptions: Record<FacetKey, FacetOption[]>
  selected: Record<FacetKey, string[]>
  activeFilterCount: number
}

interface Emits {
  (e: 'update:facet', payload: { key: FacetKey; values: string[] }): void
  (e: 'clear'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const facets = CONCEPT_FACETS
const filtersLabel = t('common.filters', 'Filters')
const clearAllLabel = t('search.clearAllSelections', 'Clear all')
const menuOpen = ref(false)

// Translate facet labels via the existing column i18n keys.
const labelKeys: Record<FacetKey, [string, string]> = {
  vocabularyId: ['columns.vocabulary', 'Vocabulary'],
  domainId: ['columns.domain', 'Domain'],
  standardConcept: ['columns.standard', 'Standard'],
  conceptClassId: ['columns.class', 'Class'],
  invalidReason: ['columns.validity', 'Validity'],
}

function facetLabel(key: FacetKey): string {
  const [k, fallback] = labelKeys[key]
  return t(k, fallback).value
}

// Facet counts are cross-facet, so a still-selected value can drop out of
// facetOptions[key] (count 0). Re-add such values so their menu chips keep
// a resolvable title.
function itemsFor(key: FacetKey) {
  const options = props.facetOptions[key]
  const present = new Set(options.map(o => o.value))
  const missing = props.selected[key]
    .filter(v => !present.has(v))
    .map(v => ({ value: v, label: v, count: 0 }))
  return [...options, ...missing]
}

function onUpdate(key: FacetKey, values: string[]) {
  emit('update:facet', { key, values })
}

function removeValue(key: FacetKey, value: string) {
  emit('update:facet', { key, values: props.selected[key].filter(v => v !== value) })
}
</script>

<style scoped>
.concept-facet-filters {
  width: 100%;
}

.concept-facet-filters__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.concept-facet-filters__count {
  margin-inline-start: 8px;
  height: 18px !important;
  font-size: 11px !important;
}

.concept-facet-filters__menu-card {
  width: 420px;
  max-width: 90vw;
}

.concept-facet-filters__menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.concept-facet-filters__menu-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.concept-facet-filters__active {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 600px) {
  .concept-facet-filters__menu-card {
    width: 320px;
  }
}
</style>
