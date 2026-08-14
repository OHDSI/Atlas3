<!--
  ConceptFacetFilters

  The concept-search flavour of AtlasFacetFilterBar: same bar, but with the
  concept facet set as its default and the column i18n keys the concept views
  already use. The bar itself is shared, so a list that needs the same filtering
  (e.g. the characterization feature-analysis picker) does not have to
  reimplement it.
-->
<template>
  <AtlasFacetFilterBar
    :facet-options="facetOptions"
    :selected="selected"
    :active-filter-count="activeFilterCount"
    :facets="facets"
    :result-filter="resultFilter"
    :facet-label="facetLabel"
    text-field-test-id="concept-result-filter"
    @update:facet="payload => emit('update:facet', payload)"
    @update:result-filter="value => emit('update:resultFilter', value)"
    @clear="emit('clear')"
  />
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import {
  CONCEPT_FACETS,
  type FacetDefinition,
  type FacetKey,
  type FacetOption,
} from '@/composables/useConceptFacets'
import AtlasFacetFilterBar from '@/components/ui/AtlasFacetFilterBar.vue'

interface Props {
  facetOptions: Record<FacetKey, FacetOption[]>
  selected: Record<FacetKey, string[]>
  activeFilterCount: number
  resultFilter?: string
  facets?: Pick<FacetDefinition, 'key' | 'label'>[]
}

interface Emits {
  (e: 'update:facet', payload: { key: FacetKey; values: string[] }): void
  (e: 'update:resultFilter', value: string): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  resultFilter: '',
  facets: () => CONCEPT_FACETS,
})
const emit = defineEmits<Emits>()
const { t } = useI18n()

// Concept facets reuse the column labels the concept tables already translate.
const labelKeys: Record<string, [string, string]> = {
  vocabularyId: ['columns.vocabulary', 'Vocabulary'],
  domainId: ['columns.domain', 'Domain'],
  standardConcept: ['columns.standard', 'Standard'],
  conceptClassId: ['columns.class', 'Class'],
  invalidReason: ['columns.validity', 'Validity'],
  match: ['common.match', 'Match'],
}

function facetLabel(key: FacetKey): string {
  const entry = labelKeys[key]
  if (entry) return t(entry[0], entry[1]).value
  return props.facets.find(f => f.key === key)?.label ?? key
}
</script>
