<template>
  <div class="facet-filter-bar">
    <div class="facet-filter-bar__bar">
      <AtlasTextField
        :model-value="resultFilter"
        :label="filterResultsLabel"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        class="facet-filter-bar__text"
        :data-testid="textFieldTestId"
        @update:model-value="(v: string | number) => emit('update:resultFilter', String(v ?? ''))"
      />

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
            class="facet-filter-bar__menu-btn"
          >
            {{ filtersLabel }}
            <AtlasChip
              v-if="activeFilterCount > 0"
              size="sm"
              variant="flat"
              tone="primary"
              class="facet-filter-bar__count"
            >
              {{ activeFilterCount }}
            </AtlasChip>
          </AtlasButton>
        </template>

        <AtlasCard
          padding="none"
          class="facet-filter-bar__menu-card"
        >
          <div class="facet-filter-bar__menu-header">
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

          <div class="facet-filter-bar__menu-body">
            <AtlasAutocomplete
              v-for="facet in facets"
              :key="facet.key"
              :model-value="selectionFor(facet.key)"
              :items="itemsFor(facet.key)"
              item-title="label"
              item-value="value"
              :label="resolveFacetLabel(facet.key)"
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
      class="facet-filter-bar__active"
    >
      <template
        v-for="facet in facets"
        :key="`chips-${facet.key}`"
      >
        <AtlasChip
          v-for="value in selectionFor(facet.key)"
          :key="`${facet.key}-${value}`"
          size="sm"
          closable
          @close="removeValue(facet.key, value)"
        >
          {{ resolveFacetLabel(facet.key) }}: {{ value }}
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
import type { FacetDefinition, FacetKey, FacetOption } from '@/composables/useConceptFacets'
import { AtlasAutocomplete, AtlasButton, AtlasCard, AtlasChip, AtlasMenu, AtlasSpacer, AtlasTextField } from '@/components/ui'

interface Props {
  facetOptions: Record<FacetKey, FacetOption[]>
  selected: Record<FacetKey, string[]>
  activeFilterCount: number
  facets: Pick<FacetDefinition, 'key' | 'label'>[]
  resultFilter?: string
  /**
   * Translated label for a facet. Defaults to the definition's own English
   * label, which keeps the bar usable without forcing every caller to supply a
   * mapping; callers with i18n keys for their columns pass them through here.
   */
  facetLabel?: (key: FacetKey) => string
  textFieldTestId?: string
}

interface Emits {
  (e: 'update:facet', payload: { key: FacetKey; values: string[] }): void
  (e: 'update:resultFilter', value: string): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  resultFilter: '',
  facetLabel: undefined,
  textFieldTestId: 'facet-result-filter',
})
const emit = defineEmits<Emits>()
const { t } = useI18n()

const filtersLabel = t('common.filters', 'Filters')
const clearAllLabel = t('search.clearAllSelections', 'Clear all')
const filterResultsLabel = t('search.filterResults', 'Filter results')
const menuOpen = ref(false)

function resolveFacetLabel(key: FacetKey): string {
  if (props.facetLabel) return props.facetLabel(key)
  return props.facets.find(f => f.key === key)?.label ?? key
}

function selectionFor(key: FacetKey): string[] {
  return props.selected[key] ?? []
}

// Facet counts are cross-facet, so a still-selected value can drop out of
// facetOptions[key] (count 0). Re-add such values so their menu chips keep
// a resolvable title.
function itemsFor(key: FacetKey) {
  const options = props.facetOptions[key] ?? []
  const present = new Set(options.map(o => o.value))
  const missing = selectionFor(key)
    .filter(v => !present.has(v))
    .map(v => ({ value: v, label: v, count: 0 }))
  return [...options, ...missing]
}

function onUpdate(key: FacetKey, values: string[]) {
  emit('update:facet', { key, values })
}

function removeValue(key: FacetKey, value: string) {
  emit('update:facet', { key, values: selectionFor(key).filter(v => v !== value) })
}
</script>

<style scoped>
.facet-filter-bar {
  width: 100%;
}

.facet-filter-bar__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.facet-filter-bar__text {
  max-width: 260px;
  flex: 1 1 200px;
}

.facet-filter-bar__count {
  margin-inline-start: 8px;
  height: 18px !important;
  font-size: 11px !important;
}

.facet-filter-bar__menu-card {
  width: 420px;
  max-width: 90vw;
}

.facet-filter-bar__menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.facet-filter-bar__menu-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.facet-filter-bar__active {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 600px) {
  .facet-filter-bar__menu-card {
    width: 320px;
  }
}
</style>
