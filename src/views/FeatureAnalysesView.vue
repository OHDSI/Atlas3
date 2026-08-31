<template>
  <AnalysisListLayout
    :error="error ?? null"
    testid="feature-analyses"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <!-- The same bar and the same facets the design editor's picker offers,
           so the two lists of the same entity filter the same way (#264). -->
      <AtlasFacetFilterBar
        :facet-options="facetOptions"
        :selected="selectedFacets"
        :active-filter-count="activeFilterCount"
        :facets="facets"
        :result-filter="textFilter"
        class="feature-analyses-view__search"
        text-field-test-id="feature-analyses-search"
        @update:facet="(payload: { key: string; values: string[] }) => setFacet(payload.key, payload.values)"
        @update:result-filter="setTextFilter"
        @clear="clearFilters"
      />
    </template>

    <template #primary-action>
      <AtlasButton
        icon="mdi-plus"
        :aria-label="t('cc.tabs.featureAnalyses.newLabel', 'New Feature Analysis').value"
        data-testid="feature-analyses-create"
        :disabled="!canCreate"
        @click="handleCreate"
      >
        {{ t('home.newEntityNames.featureAnalysis', 'New feature analysis') }}
      </AtlasButton>
    </template>

    <AnalysisDataTable
      :headers="headers"
      :items="paginatedFeatureAnalyses"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :empty-text="t('common.noData', 'No feature analyses yet.').value"
      testid="feature-analyses-table"
      :can-open-item="item => !isPreset(item)"
      :can-copy-item="item => !isPreset(item) && canCopy && !!item.id"
      :can-delete-item="item => !isPreset(item) && entityAccess.canDelete(item.id)"
      @open="handleOpen"
      @copy="handleCopy"
      @delete="handleDeleteClick"
    >
      <template #[`item.type`]="{ item }">
        <AtlasChip
          size="sm"
          variant="tonal"
          :color="typeChipColor(item.type)"
        >
          {{ item.type }}
        </AtlasChip>
      </template>
      <template #[`item.domain`]="{ item }">
        {{ item.domain ?? '—' }}
      </template>
      <template #[`item.statType`]="{ item }">
        {{ item.statType ?? '—' }}
      </template>
    </AnalysisDataTable>

    <template
      v-if="!loading && totalItems > itemsPerPage"
      #pagination
    >
      <AtlasButton
        variant="ghost"
        :disabled="!canGoPrevious"
        @click="previousPage"
      >
        {{ t('datatable.language.paginate.previous', 'Previous') }}
      </AtlasButton>
      <span class="feature-analyses-view__range">{{ rangeDisplay }}</span>
      <AtlasButton
        variant="ghost"
        :disabled="!canGoNext"
        @click="nextPage"
      >
        {{ t('configuration.userImport.wizard.buttons.next', 'Next') }}
      </AtlasButton>
    </template>
  </AnalysisListLayout>

  <AtlasDialog
    v-model="showDeleteDialog"
    eyebrow="CONFIRM"
    :title="t('common.delete', 'Delete').value"
    max-width="500"
    @close="showDeleteDialog = false"
  >
    <span v-if="selectedFA">{{ deleteMessage }}</span>
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="showDeleteDialog = false"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :loading="deleting"
        @click="confirmDelete"
      >
        {{ t('common.delete', 'Delete') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasDialog, AtlasFacetFilterBar } from '@/components/ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useFeatureAnalyses } from '@/composables/useFeatureAnalyses'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { logger } from '@/utils/logger'
import type { FeatureAnalysisListItem, FeatureAnalysisType } from '@/models/feature-analysis.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'
import { useConceptFacets } from '@/composables/useConceptFacets'
import {
  featureAnalysisFacets,
  featureAnalysisSearchText,
} from '@/composables/useFeatureAnalysisFacets'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const store = useFeatureAnalysesStore()
const { hasPermission } = usePermissions()
const canCreate = computed(() => hasPermission('create:feature-analysis'))
const canCopy = computed(() => hasPermission('create:feature-analysis'))
const entityAccess = useEntityAccessFor('feAnalysis')

const {
  featureAnalyses,
  loading,
  error,
  page,
  itemsPerPage,
  canGoPrevious,
  canGoNext,
  nextPage,
  previousPage,
  refresh,
} = useFeatureAnalyses()

const authStore = useAuthStore()

// Captured rather than read per render: the Created and Updated facets bucket
// by recency, and a list stays open long enough that a row would otherwise
// drift from one bucket to the next under the user. Re-taken on refresh.
const facetNow = ref(Date.now())

const facets = computed(() =>
  featureAnalysisFacets({ currentUserLogin: authStore.user?.login, now: facetNow.value })
)

const {
  selected: selectedFacets,
  textFilter,
  facetOptions,
  filteredConcepts: filteredAnalyses,
  activeFilterCount,
  setFacet,
  setTextFilter,
  clearFilters,
} = useConceptFacets(featureAnalyses, facets, featureAnalysisSearchText)

// Pagination follows the facets. useFeatureAnalyses paginates the store's own
// text filter, which the bar above has replaced, so counting that instead
// would offer pages the filters have already emptied.
const totalItems = computed<number>(() => filteredAnalyses.value.length)

const paginatedFeatureAnalyses = computed<FeatureAnalysisListItem[]>(() => {
  const start = (page.value - 1) * itemsPerPage.value
  return filteredAnalyses.value.slice(start, start + itemsPerPage.value)
})

// Mirrors usePagination's own range string, over the filtered total rather
// than the store's, so the count under the table matches the rows above it.
const rangeDisplay = computed<string>(() => {
  if (totalItems.value === 0) return '0-0 of 0'
  const start = (page.value - 1) * itemsPerPage.value + 1
  const end = Math.min(page.value * itemsPerPage.value, totalItems.value)
  return `${start}-${end} of ${totalItems.value}`
})

const headers = computed(() => [
  { title: t('columns.id', 'ID').value, key: 'id' },
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('cc.fa.analysisType', 'Type').value, key: 'type' },
  { title: t('cc.fa.domain', 'Domain').value, key: 'domain' },
  { title: t('cc.fa.statType', 'Stat Type').value, key: 'statType' },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.created', 'Created').value, key: 'createdDate' },
  { title: t('columns.updated', 'Updated').value, key: 'modifiedDate' },
  { title: t('columns.actions', 'Actions').value, key: 'actions', sortable: false },
])

const showDeleteDialog = ref(false)
const selectedFA = ref<FeatureAnalysisListItem | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() => {
  if (!selectedFA.value) return ''
  return t(
    'featureAnalyses.list.deleteConfirm',
    `Delete feature analysis '${selectedFA.value.name}'?`,
    { name: selectedFA.value.name }
  ).value
})

function handleCreate() {
  router.push('/feature-analyses/new')
}

/**
 * Built-in PRESET feature analyses are shipped with WebAPI and are shared by
 * every characterization, so they are read-only: they cannot be opened in the
 * editor, copied or deleted. See OHDSI/Atlas3#265.
 */
function isPreset(item: FeatureAnalysisListItem): boolean {
  return item.type === 'PRESET'
}

function handleOpen(item: FeatureAnalysisListItem) {
  if (isPreset(item)) return
  router.push(`/feature-analyses/${item.id}`)
}

async function handleCopy(item: FeatureAnalysisListItem) {
  if (isPreset(item)) return
  const copied = await store.copy(item.id)
  if (copied?.id) {
    router.push(`/feature-analyses/${copied.id}`)
  }
}

function handleDeleteClick(item: FeatureAnalysisListItem) {
  if (isPreset(item)) return
  selectedFA.value = item
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedFA.value) return
  deleting.value = true
  try {
    const success = await store.remove(selectedFA.value.id)
    if (success) {
      showDeleteDialog.value = false
      selectedFA.value = null
    }
  } catch (err) {
    logger.error('FeatureAnalysesView', 'Failed to delete feature analysis', err)
  } finally {
    deleting.value = false
  }
}

function typeChipColor(type: FeatureAnalysisType): string {
  switch (type) {
    case 'PRESET':
      return 'primary'
    case 'CRITERIA_SET':
      return 'info'
    case 'CUSTOM_FE':
      return 'warning'
    default:
      return 'default'
  }
}

function reload() {
  facetNow.value = Date.now()
  refresh()
}

onMounted(() => {
  reload()
})
</script>

<style scoped>
.feature-analyses-view__search {
  /* Sized for the facet bar, not the single search box it replaced: the bar
     carries a text field plus six facet menus and wraps rather than crushing
     them. */
  flex: 1 1 100%;
  min-width: 0;
}

.feature-analyses-view__range {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
}

</style>
