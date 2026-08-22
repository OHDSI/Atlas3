<template>
  <div class="included-concepts-table">
    <AtlasAlert
      v-if="error"
      severity="danger"
      variant="tonal"
      class="included-concepts-table__error"
    >
      <div class="d-flex align-center">
        <span class="flex-grow-1">{{ error }}</span>
        <AtlasButton
          size="sm"
          variant="ghost"
          data-testid="included-retry-btn"
          @click="$emit('retry')"
        >
          {{ t('common.retry', 'Retry').value }}
        </AtlasButton>
      </div>
    </AtlasAlert>

    <ConceptFacetFilters
      v-if="items.length > 0"
      :facets="facets"
      :facet-options="facetOptions"
      :selected="selectedFacets"
      :active-filter-count="activeFilterCount"
      :result-filter="textFilter"
      text-field-test-id="included-result-filter"
      class="included-concepts-table__filters"
      @update:facet="({ key, values }) => setFacet(key, values)"
      @update:result-filter="setTextFilter"
      @clear="clearFilters()"
    />

    <AtlasCard
      v-if="loading || items.length > 0"
      padding="none"
    >
      <AtlasDataTable
        v-model:sort-by="sortBy"
        v-model:items-per-page="pageSize"
        :headers="headers"
        :items="visibleConcepts"
        :loading="loading"
        multi-sort
        hover
        class="included-concepts-table__table"
      >
        <template
          v-if="sourceKey"
          #item.conceptName="{ item }"
        >
          <a
            href="#"
            :data-testid="`included-name-link-${item.conceptId}`"
            class="concept-name-link"
            @click.prevent="onView(item)"
          >
            {{ item.conceptName }}
          </a>
        </template>

        <template
          v-else
          #item.conceptName="{ item }"
        >
          {{ item.conceptName }}
        </template>

        <template #item.domainId="{ item }">
          <AtlasChip
            v-if="item.domainId"
            :color="getDomainColor(item.domainId, themeStore.resolved)"
            size="xs"
            variant="tonal"
          >
            {{ item.domainId }}
          </AtlasChip>
        </template>

        <template #item.vocabularyId="{ item }">
          <AtlasChip
            v-if="item.vocabularyId"
            size="xs"
            variant="outlined"
          >
            {{ item.vocabularyId }}
          </AtlasChip>
        </template>

        <template #item.standardConcept="{ item }">
          <AtlasChip
            :color="getConceptTypeColor(item)"
            size="xs"
            variant="tonal"
          >
            {{ getConceptTypeLabel(item) }}
          </AtlasChip>
        </template>

        <template #item.invalidReason="{ item }">
          <AtlasChip
            v-if="item.invalidReason"
            tone="danger"
            size="xs"
            variant="tonal"
          >
            {{ t('commonErrors.invalid', 'Invalid').value }}
          </AtlasChip>
        </template>

        <template #no-data>
          <div class="included-concepts-table__no-match">
            <p class="included-concepts-table__no-match-text">
              {{ t('cs.manager.emptyFilteredMessage', 'No concepts match the active filters.').value }}
            </p>
            <AtlasButton
              size="sm"
              variant="ghost"
              data-testid="included-clear-filters-btn"
              @click="clearFilters()"
            >
              {{ t('versions.filterClear', 'Clear filters').value }}
            </AtlasButton>
          </div>
        </template>

        <template #loading>
          <AtlasSkeleton
            v-for="i in 5"
            :key="i"
            type="table-row"
            class="mx-2"
          />
        </template>
      </AtlasDataTable>
    </AtlasCard>

    <div
      v-else
      class="included-concepts-table__empty"
    >
      <AtlasIcon
        icon="mdi-family-tree"
        size="36"
        class="included-concepts-table__empty-icon"
      />
      <p class="included-concepts-table__empty-text">
        {{ emptyMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/concept-set.types'
import {
  AtlasAlert,
  AtlasButton,
  AtlasCard,
  AtlasChip,
  AtlasDataTable,
  AtlasIcon,
  AtlasSkeleton,
} from '@/components/ui'
import ConceptFacetFilters from './ConceptFacetFilters.vue'
import { CONCEPT_FACETS, useConceptFacets } from '@/composables/useConceptFacets'
import { getDomainColor } from '@/utils/domain-colors'
import { useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()

interface Props {
  items: Concept[]
  loading: boolean
  error: string | null
  manualCount: number
  sourceKey?: string
}
const props = defineProps<Props>()

const emit = defineEmits<{
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
  retry: []
}>()

const sortBy = ref([{ key: 'conceptId', order: 'asc' as const }])

/**
 * The footer's rows-per-page control only works when the caller round-trips the
 * value: binding a bare number makes v-data-table's model controlled, so the
 * user's choice is emitted and then overwritten by the unchanged prop. Owning it
 * here is what makes the dropdown live (issue #266).
 */
const pageSize = ref(50)

/**
 * Facets mirror this table's own categorical columns, so every filter the bar
 * offers corresponds to something on screen. Concept class is left out because
 * this table does not show it.
 */
const facets = CONCEPT_FACETS.filter(f => f.key !== 'conceptClassId')

const {
  facetOptions,
  selected: selectedFacets,
  textFilter,
  filteredConcepts: visibleConcepts,
  activeFilterCount,
  setFacet,
  setTextFilter,
  clearFilters,
} = useConceptFacets(toRef(props, 'items'), facets)

const headers = [
  { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '90px' },
  { title: t('columns.conceptCode', 'Code').value, key: 'conceptCode', sortable: true, width: '110px' },
  { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true, width: '120px' },
  { title: t('columns.type', 'Type').value, key: 'standardConcept', sortable: true, width: '120px' },
  { title: t('columns.validity', 'Validity').value, key: 'invalidReason', sortable: true, width: '90px' },
]

const emptyMessage = computed(() => {
  if (props.manualCount === 0) {
    return t(
      'cs.manager.includedEmptyNoManual',
      'Add concepts on the Selected tab to see them here.',
    ).value
  }
  return t(
    'cs.manager.includedEmptyNoResolve',
    'No concepts resolved from this expression.',
  ).value
})

function getConceptTypeColor(concept: Concept): string {
  if (concept.standardConcept === 'S') return 'primary'
  if (concept.standardConcept === 'C') return 'info'
  return 'default'
}

function getConceptTypeLabel(concept: Concept): string {
  if (concept.standardConcept === 'S') return t('search.standard', 'Standard').value
  if (concept.standardConcept === 'C') return t('search.classification', 'Classification').value
  return t('search.nonStandard', 'Non-Std').value
}

function onView(c: Concept) {
  emit('view-concept', { conceptId: c.conceptId, sourceKey: props.sourceKey! })
}
</script>

<style scoped>
.included-concepts-table {
  width: 100%;
}

.included-concepts-table__filters {
  margin-bottom: 12px;
}

.included-concepts-table__no-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
}

.included-concepts-table__no-match-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.included-concepts-table__error {
  margin-bottom: 12px;
}

.included-concepts-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.included-concepts-table__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.included-concepts-table__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}

.concept-name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.concept-name-link:hover {
  text-decoration: underline;
}
</style>
