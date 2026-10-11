<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AtlasCard, AtlasChip, AtlasDataTable, AtlasProgressCircular, AtlasSelect } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import ConceptFacetFilters from '@/components/concepts/ConceptFacetFilters.vue'
import { useConceptFacets, type FacetDefinition } from '@/composables/useConceptFacets'
import { useConceptRecordCounts } from '@/composables/useConceptRecordCounts'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import type { RelatedConcept } from '@/models/concept-detail.types'
import type { Concept } from '@/models/concept-set.types'

const { t } = useI18n()

const props = defineProps<{ related: RelatedConcept[]; sourceKey?: string }>()

// Prefer the explicit sourceKey prop. The drawer renders this table over other
// routes, so route.params.sourceKey is empty there and the link would no-op.
// Fall back to the route param for the stand-alone /concept/:sourceKey page.
const route = useRoute()
const sourceKey = computed(() => props.sourceKey || ((route.params.sourceKey as string) ?? ''))
const conceptDrawer = useConceptDetailDrawerStore()

function openConceptDetail(conceptId: number) {
  if (!sourceKey.value) return
  conceptDrawer.open(sourceKey.value, conceptId)
}

interface Row extends Concept {
  relationship: string
}

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const c of props.related) {
    for (const r of c.relationships) {
      out.push({
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        conceptCode: c.conceptCode,
        vocabularyId: c.vocabularyId,
        domainId: c.domainId,
        conceptClassId: c.conceptClassId,
        standardConcept: c.standardConcept,
        invalidReason: c.invalidReason,
        relationship: r.relationshipName,
      })
    }
  }
  return out
})

// Relationship rows repeat a concept for every relationship. Fetch its count
// once, then merge it back onto each row that represents that concept.
const conceptsForCounts = computed<Concept[]>(() => {
  const conceptsById = new Map<number, Concept>()
  for (const row of rows.value) {
    if (!conceptsById.has(row.conceptId)) conceptsById.set(row.conceptId, row)
  }
  return [...conceptsById.values()]
})

const {
  conceptsWithCounts,
  loading: loadingRecordCounts,
  sources: recordCountSources,
  effectiveSourceKey: effectiveRecordCountSource,
  setSource: setRecordCountSource,
} = useConceptRecordCounts(conceptsForCounts)

const rowsWithCounts = computed<Row[]>(() => {
  const countsByConceptId = new Map(
    conceptsWithCounts.value.map(concept => [concept.conceptId, concept])
  )
  return rows.value.map(row => ({ ...row, ...countsByConceptId.get(row.conceptId) }))
})

const facets: FacetDefinition<Row>[] = [
  {
    key: 'relationship',
    label: t('facets.caption.relationship', 'Relationship').value,
    display: row => row.relationship,
  },
  { key: 'vocabularyId', label: 'Vocabulary', display: row => row.vocabularyId },
  { key: 'domainId', label: 'Domain', display: row => row.domainId },
  {
    key: 'standardConcept',
    label: 'Standard',
    display: row =>
      row.standardConcept === 'S'
        ? 'Standard'
        : row.standardConcept === 'C'
          ? 'Classification'
          : 'Non-Standard',
  },
]

const {
  facetOptions,
  selected,
  textFilter,
  filteredConcepts,
  activeFilterCount,
  setFacet,
  setTextFilter,
  clearFilters,
} = useConceptFacets(
  rowsWithCounts,
  facets,
  row => row.conceptName,
  row => [row.conceptId, row.conceptCode]
)

const viewCountsForLabel = t('search.viewCountMessage', 'View record count for:')
const sortBy = ref([{ key: 'descendantRecordCount', order: 'desc' as const }])

const headers = computed(() => [
  { title: t('facets.caption.relationship', 'Relationship').value, key: 'relationship', sortable: true },
  { title: t('columns.conceptName', 'Concept Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true },
  { title: t('columns.code', 'Code').value, key: 'conceptCode', sortable: true },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true },
  { title: t('columns.standard', 'Standard').value, key: 'standardConcept', sortable: true, width: 80 },
  { title: t('columns.rcTooltip', 'RC').value, key: 'recordCount', sortable: true, width: 100, align: 'end' as const },
  { title: t('columns.drcTooltip', 'DRC').value, key: 'descendantRecordCount', sortable: true, width: 100, align: 'end' as const },
])

function formatCount(count: number | undefined): string {
  return count === undefined ? '-' : count.toLocaleString()
}
</script>

<template>
  <AtlasCard
    padding="none"
    data-testid="concept-related-table"
  >
    <header class="card-title">
      <span>{{ t('cs.manager.concept.tabs.relatedConcepts.caption', 'Related Concepts').value }}</span>
      <span class="muted">{{ t('components.conceptDetail.relationshipsCount', '{count} relationships', { count: rows.length }).value }}</span>
    </header>
    <ConceptFacetFilters
      v-if="rows.length > 0"
      :facets="facets"
      :facet-options="facetOptions"
      :selected="selected"
      :active-filter-count="activeFilterCount"
      :result-filter="textFilter"
      class="related-filters"
      @update:facet="({ key, values }) => setFacet(key, values)"
      @update:result-filter="setTextFilter"
      @clear="clearFilters()"
    >
      <template
        v-if="recordCountSources.length > 0"
        #append
      >
        <AtlasSelect
          :model-value="effectiveRecordCountSource"
          :items="recordCountSources"
          item-title="sourceName"
          item-value="sourceKey"
          :label="viewCountsForLabel"
          density="compact"
          variant="outlined"
          hide-details
          :loading="loadingRecordCounts"
          :menu-props="{ zIndex: 2300 }"
          data-testid="related-record-count-source"
          @update:model-value="(value: unknown) => setRecordCountSource(String(value))"
        />
      </template>
    </ConceptFacetFilters>
    <p
      v-if="rows.length === 0"
      class="empty"
    >
      {{ t('components.conceptDetail.noRelatedConcepts', 'No related concepts found.').value }}
    </p>
    <AtlasDataTable
      v-else
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="filteredConcepts"
      :items-per-page="25"
      must-sort
    >
      <template #[`item.relationship`]="{ item }">
        <AtlasChip size="sm">
          {{ item.relationship }}
        </AtlasChip>
      </template>
      <template #[`item.conceptName`]="{ item }">
        <a
          href="#"
          class="concept-link"
          @click.prevent="openConceptDetail(item.conceptId)"
        >
          {{ item.conceptName }}
        </a>
      </template>
      <template #[`item.standardConcept`]="{ item }">
        <AtlasChip
          v-if="item.standardConcept === 'S'"
          size="xs"
          tone="success"
        >
          S
        </AtlasChip>
        <AtlasChip
          v-else-if="item.standardConcept === 'C'"
          size="xs"
        >
          C
        </AtlasChip>
        <span
          v-else
          class="muted"
        >—</span>
      </template>
      <template #item.recordCount="{ item }">
        <div class="count">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.recordCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span v-else>{{ formatCount(item.recordCount) }}</span>
        </div>
      </template>
      <template #item.descendantRecordCount="{ item }">
        <div class="count">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.descendantRecordCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span v-else>{{ formatCount(item.descendantRecordCount) }}</span>
        </div>
      </template>
      <template #no-data>
        <p class="empty">
          {{ t('cs.manager.emptyFilteredMessage', 'No concepts match the active filters.').value }}
        </p>
      </template>
    </AtlasDataTable>
  </AtlasCard>
</template>

<style scoped>
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--atlas-color-on-surface-variant);
  justify-content: space-between;
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid var(--atlas-color-outline);
  display: flex;
  align-items: center;
}
.muted { color: var(--atlas-color-on-surface-variant); font-size: 11px; }
.empty { padding: 24px; color: var(--atlas-color-on-surface-variant); font-size: 13px; margin: 0; text-align: center; }
.related-filters { padding: 12px 16px; }
.count { display: flex; justify-content: end; align-items: center; }
.concept-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.concept-link:hover { text-decoration: underline; }
</style>
