<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AtlasCard, AtlasChip, AtlasDataTable, AtlasProgressCircular, AtlasSelect } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import ConceptAddOptions from '@/components/concepts/ConceptAddOptions.vue'
import ConceptColumnChooser from '@/components/concepts/ConceptColumnChooser.vue'
import ConceptFacetFilters from '@/components/concepts/ConceptFacetFilters.vue'
import { useConceptFacets, type FacetDefinition } from '@/composables/useConceptFacets'
import { useConceptRecordCounts } from '@/composables/useConceptRecordCounts'
import { useConceptTablePreferencesStore } from '@/stores/concept-table-preferences'
import type { RelatedConcept } from '@/models/concept-detail.types'
import type { Concept, ConceptAddFlags } from '@/models/concept-set.types'

const { t } = useI18n()

const props = defineProps<{ related: RelatedConcept[]; sourceKey?: string }>()

const emit = defineEmits<{
  'add-concepts': [concepts: Concept[], flags: Required<ConceptAddFlags>]
  navigate: [conceptId: number]
}>()

// Prefer the explicit sourceKey prop; fall back to the route param for the
// stand-alone /concept/:sourceKey page.
const route = useRoute()
const sourceKey = computed(() => props.sourceKey || ((route.params.sourceKey as string) ?? ''))

// The host decides what showing another concept means: the stand-alone page
// changes the route, the drawer and the concept set editor swap the concept
// in place. Opening the global drawer here stacked a second detail view on top.
function openConceptDetail(conceptId: number) {
  if (!sourceKey.value) return
  emit('navigate', conceptId)
}

interface Row extends Concept {
  relationship: string
  rowKey: string
}

// WebAPI lists a relationship once per hierarchy distance, so "Subsumes" can
// come back several times for the same concept; one row per pair is enough.
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const seen = new Set<string>()
  for (const c of props.related) {
    for (const r of c.relationships) {
      const key = `${c.conceptId}|${r.relationshipName}`
      if (seen.has(key)) continue
      seen.add(key)
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
        rowKey: key,
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
  // Copy only the counts: the counted concept is this concept's first row, so
  // spreading it whole would stamp that row's relationship onto every other row.
  return rows.value.map(row => {
    const counted = countsByConceptId.get(row.conceptId)
    return {
      ...row,
      recordCount: counted?.recordCount,
      descendantRecordCount: counted?.descendantRecordCount,
      personCount: counted?.personCount,
      descendantPersonCount: counted?.descendantPersonCount,
    }
  })
})

const facets: FacetDefinition<Row>[] = [
  {
    key: 'relationship',
    label: t('facets.caption.relationship').value,
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

const selectedConceptIds = ref<number[]>([])
const addFlags = ref<Required<ConceptAddFlags>>({
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
})

watch(() => props.related, () => {
  selectedConceptIds.value = []
})

// A concept appears once per relationship, so selection is keyed by conceptId
// and scoped to the rows the filters currently show: Add must never pick up a
// ticked concept the user has since filtered out of view.
const visibleById = computed(() => {
  const map = new Map<number, Row>()
  for (const row of filteredConcepts.value) {
    if (!map.has(row.conceptId)) map.set(row.conceptId, row)
  }
  return map
})
const selectedSet = computed(() => new Set(selectedConceptIds.value))
const selectedVisible = computed(() => selectedConceptIds.value.filter(id => visibleById.value.has(id)))
const allVisibleSelected = computed(
  () => visibleById.value.size > 0 && [...visibleById.value.keys()].every(id => selectedSet.value.has(id))
)
const someVisibleSelected = computed(() => selectedVisible.value.length > 0)

function onToggleRow(conceptId: number, value: boolean | null) {
  const next = new Set(selectedConceptIds.value)
  if (value) next.add(conceptId)
  else next.delete(conceptId)
  selectedConceptIds.value = [...next]
}

function onToggleSelectAll(value: boolean | null) {
  const next = new Set(selectedConceptIds.value)
  for (const id of visibleById.value.keys()) {
    if (value) next.add(id)
    else next.delete(id)
  }
  selectedConceptIds.value = [...next]
}

function onAddSelected() {
  const concepts: Concept[] = []
  for (const id of selectedVisible.value) {
    const row = visibleById.value.get(id)
    if (!row) continue
    const { relationship: _relationship, ...concept } = row
    concepts.push(concept)
  }
  if (!concepts.length) return
  emit('add-concepts', concepts, { ...addFlags.value })
  selectedConceptIds.value = []
}

const viewCountsForLabel = t('search.viewCountMessage')
const sortBy = ref([{ key: 'descendantRecordCount', order: 'desc' as const }])
const columnPreferences = useConceptTablePreferencesStore()

// Column visibility is shared with the other concept tables through the
// Columns chooser; selection, relationship, and name are always shown.
const requiredColumnKeys = new Set(['select', 'relationship', 'conceptName'])

const headers = computed(() => [
  { title: '', key: 'select', sortable: false, width: 48 },
  { title: t('facets.caption.relationship').value, key: 'relationship', sortable: true },
  { title: t('columns.conceptName').value, key: 'conceptName', sortable: true },
  { title: t('columns.vocabulary').value, key: 'vocabularyId', sortable: true },
  { title: t('columns.code').value, key: 'conceptCode', sortable: true },
  { title: t('columns.domain').value, key: 'domainId', sortable: true },
  { title: t('columns.class').value, key: 'conceptClassId', sortable: true },
  { title: t('columns.standard').value, key: 'standardConcept', sortable: true, width: 80 },
  { title: t('columns.validity').value, key: 'invalidReason', sortable: true, width: 100 },
  { title: t('columns.rcTooltip').value, key: 'recordCount', sortable: true, width: 100, align: 'end' as const },
  { title: t('columns.drcTooltip').value, key: 'descendantRecordCount', sortable: true, width: 100, align: 'end' as const },
  { title: t('columns.pcTooltip').value, key: 'personCount', sortable: true, width: 100, align: 'end' as const },
  { title: t('columns.dpcTooltip').value, key: 'descendantPersonCount', sortable: true, width: 100, align: 'end' as const },
].filter(header => requiredColumnKeys.has(header.key) || columnPreferences.visibleColumnKeys.includes(header.key)))

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
      <span>{{ t('cs.manager.concept.tabs.relatedConcepts.caption').value }}</span>
      <span class="muted">{{ t('components.conceptDetail.relationshipsCount', { count: rows.length }).value }}</span>
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
      <template #after-filter>
        <ConceptColumnChooser />
      </template>
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
          data-testid="related-record-count-source"
          @update:model-value="(value: unknown) => setRecordCountSource(String(value))"
        />
      </template>
    </ConceptFacetFilters>
    <ConceptAddOptions
      v-if="rows.length > 0"
      v-model="addFlags"
      :selected-count="selectedVisible.length"
      class="related-add-options"
      data-testid="related-add-options"
      @add="onAddSelected"
    />
    <p
      v-if="rows.length === 0"
      class="empty"
    >
      {{ t('components.conceptDetail.noRelatedConcepts').value }}
    </p>
    <AtlasDataTable
      v-else
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="filteredConcepts"
      item-value="rowKey"
      :items-per-page="25"
      must-sort
    >
      <template #[`header.select`]>
        <v-checkbox-btn
          :model-value="allVisibleSelected"
          :indeterminate="someVisibleSelected && !allVisibleSelected"
          :aria-label="t('components.conceptTable.selectAllConcepts').value"
          density="compact"
          hide-details
          data-testid="related-select-all"
          @update:model-value="onToggleSelectAll"
        />
      </template>
      <template #[`item.select`]="{ item }">
        <v-checkbox-btn
          :model-value="selectedSet.has(item.conceptId)"
          :aria-label="t('components.conceptTable.selectConcept', { name: item.conceptName }).value"
          density="compact"
          hide-details
          :data-testid="`related-select-${item.conceptId}`"
          @update:model-value="(value: boolean | null) => onToggleRow(item.conceptId, value)"
        />
      </template>
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
      <template #item.invalidReason="{ item }">
        <AtlasChip
          :color="item.invalidReason ? 'error' : 'success'"
          size="sm"
          label
        >
          {{ item.invalidReason ? t('commonErrors.invalid').value : t('commonErrors.valid').value }}
        </AtlasChip>
      </template>
      <template #item.personCount="{ item }">
        <div class="count">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.personCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span v-else>{{ formatCount(item.personCount) }}</span>
        </div>
      </template>
      <template #item.descendantPersonCount="{ item }">
        <div class="count">
          <AtlasProgressCircular
            v-if="loadingRecordCounts && item.descendantPersonCount === undefined"
            indeterminate
            size="16"
            width="2"
            color="primary"
          />
          <span v-else>{{ formatCount(item.descendantPersonCount) }}</span>
        </div>
      </template>
      <template #no-data>
        <p class="empty">
          {{ t('cs.manager.emptyFilteredMessage').value }}
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
.related-add-options { padding: 0 16px 12px; }
.count { display: flex; justify-content: end; align-items: center; }
.concept-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.concept-link:hover { text-decoration: underline; }
</style>
