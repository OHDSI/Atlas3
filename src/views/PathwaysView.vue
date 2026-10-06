<template>
  <AnalysisListLayout
    :error="error?.message ?? null"
    testid="pathways"
  >
    <template #actions>
      <AtlasTextField
        :model-value="searchInput"
        :label="t('datatable.language.searchPlaceholder', 'Search pathways…').value"
        prepend-icon="mdi-magnify"
        variant="outlined"
        hide-details
        clearable
        class="pathways-view__search"
        data-testid="pathways-search"
        @update:model-value="(v: string | number) => handleSearchInput(v != null ? String(v) : null)"
      />
    </template>

    <template #primary-action>
      <AtlasButton
        icon="mdi-plus"
        data-testid="pathways-create"
        :disabled="!canCreate"
        @click="handleNew"
      >
        {{ t('home.newEntityNames.pathway', 'New pathway') }}
      </AtlasButton>
      <EntityImportButton
        :label="t('common.import', 'Import').value"
        testid="pathways-import"
        :disabled="!canCreate"
        :import-design="importDesign"
        @imported="onImported"
        @failed="(message: string) => { feedback = { message, color: 'error' } }"
      />
    </template>

    <AnalysisDataTable
      v-model:sort-by="sortBy"
      :headers="headers"
      :items="paginatedPathways"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :empty-text="t('common.noData', 'No pathways yet.').value"
      testid="pathways-table"
      :can-copy-item="item => canCopy && !!item.id"
      :can-delete-item="item => entityAccess.canDelete(item.id)"
      @open="handleOpen"
      @copy="handleCopy"
      @delete="handleRemove"
    >
      <template #[`item.targetCount`]="{ item }">
        {{ item.targetCohorts?.length ?? 0 }}
      </template>
      <template #[`item.eventCount`]="{ item }">
        {{ item.eventCohorts?.length ?? 0 }}
      </template>
    </AnalysisDataTable>

    <template
      v-if="!loading && totalPages > 1"
      #pagination
    >
      <AtlasButton
        variant="ghost"
        :disabled="page === 0"
        @click="updatePage(page - 1)"
      >
        {{ t('datatable.language.paginate.previous', 'Previous') }}
      </AtlasButton>
      <span class="pathways-view__range">{{ page + 1 }} / {{ totalPages }}</span>
      <AtlasButton
        variant="ghost"
        :disabled="page + 1 >= totalPages"
        @click="updatePage(page + 1)"
      >
        {{ t('configuration.userImport.wizard.buttons.next', 'Next') }}
      </AtlasButton>
    </template>
  </AnalysisListLayout>

  <AtlasDialog
    v-model="showDelete"
    eyebrow="CONFIRM"
    :title="t('common.delete', 'Delete').value"
    max-width="400"
    @close="showDelete = false"
  >
    {{
      t('pathwayDefinitions.deleteConfirm', 'Delete this pathway? This cannot be undone.')
    }}
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="showDelete = false"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        @click="confirmDelete"
      >
        {{ t('common.delete', 'Delete') }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <AtlasSnackbar
    :model-value="!!feedback"
    :severity="feedbackSeverity"
    :text="feedback?.message ?? ''"
    :timeout="3000"
    @update:model-value="(open: boolean) => { if (!open) feedback = null }"
  />
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDialog, AtlasSnackbar, AtlasTextField } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePathways } from '@/composables/usePathways'
import { useI18n } from '@/composables/useI18n'
import { usePathwayStore } from '@/stores/pathway'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { deletePathway, copyPathway, importPathway } from '@/services/pathway.service'
import { logger } from '@/utils/logger'
import type { Pathway } from '@/models/pathway.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'
import EntityImportButton from '@/components/shared/EntityImportButton.vue'

type SortItem = { key: string; order: 'asc' | 'desc' }

const {
  loading,
  error,
  filters,
  page,
  itemsPerPage,
  fetchPathways,
  filteredPathways,
  totalPages,
} = usePathways()

const router = useRouter()
const { hasPermission } = usePermissions()
const canCreate = computed(() => hasPermission('create:pathway'))
const canCopy = computed(() => hasPermission('create:pathway'))
const entityAccess = useEntityAccessFor('pathway')
const store = usePathwayStore()
const { t, tv } = useI18n()
const showDelete = ref(false)
const deleteTarget = ref<number | null>(null)
const feedback = ref<{ message: string; color: 'success' | 'error' | 'info' } | null>(null)
const feedbackSeverity = computed<AtlasSnackbarSeverity>(() =>
  feedback.value?.color === 'error' ? 'danger' : (feedback.value?.color ?? 'info')
)
const searchInput = ref('')
const sortBy = ref<SortItem[]>([{ key: 'modifiedDate', order: 'desc' }])

function sortValue(item: Pathway, key: string): string | number {
  const value = item[key as keyof Pathway]
  if (key === 'createdBy' && value && typeof value === 'object') {
    const user = value as { name?: string; login?: string; id?: number }
    return (user.name ?? user.login ?? user.id ?? '').toString().toLowerCase()
  }
  if (typeof value === 'string') return value.toLowerCase()
  return typeof value === 'number' ? value : ''
}

const sortedPathways = computed(() => {
  const activeSort = sortBy.value[0]
  if (!activeSort) return filteredPathways.value

  const direction = activeSort.order === 'asc' ? 1 : -1
  return [...filteredPathways.value].sort((left, right) => {
    const leftValue = sortValue(left, activeSort.key)
    const rightValue = sortValue(right, activeSort.key)
    if (leftValue === rightValue) return 0
    return leftValue > rightValue ? direction : -direction
  })
})

const paginatedPathways = computed(() => {
  const start = page.value * itemsPerPage.value
  return sortedPathways.value.slice(start, start + itemsPerPage.value)
})

const headers = computed(() => [
  { title: t('columns.id', 'ID').value, key: 'id' },
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('columns.description', 'Description').value, key: 'description' },
  {
    title: t('facets.caption.targetCohorts', 'Targets').value,
    key: 'targetCount',
    sortable: false,
  },
  { title: t('columns.eventCohort', 'Events').value, key: 'eventCount', sortable: false },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.created', 'Created').value, key: 'createdDate' },
  { title: t('columns.updated', 'Updated').value, key: 'modifiedDate' },
  { title: t('columns.actions', 'Actions').value, key: 'actions', sortable: false },
])

onMounted(fetchPathways)

function handleSearchInput(v: string | null) {
  const next = v ?? ''
  searchInput.value = next
  filters.value = { ...filters.value, searchQuery: next }
  page.value = 0
}

function updatePage(n: number) {
  page.value = Math.max(0, Math.min(n, totalPages.value - 1))
}

function handleNew() {
  store.createNewPathway()
  router.push('/pathways/new')
}

function handleOpen(p: Pathway) {
  if (p.id) router.push(`/pathways/${p.id}`)
}

async function handleCopy(p: Pathway) {
  if (!p.id) return
  const result = await copyPathway(p.id)
  if (result.success && result.data.id) {
    feedback.value = { message: tv('views.pathways.copied', 'Pathway copied'), color: 'success' }
    router.push(`/pathways/${result.data.id}`)
  } else {
    feedback.value = { message: tv('views.pathways.copyFailed', 'Copy failed'), color: 'error' }
    logger.error('PathwaysView', 'copyPathway failed', !result.success ? result.error : null)
  }
}

function handleRemove(p: Pathway) {
  if (!p.id) return
  deleteTarget.value = p.id
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const result = await deletePathway(deleteTarget.value)
  if (result.success) {
    feedback.value = { message: tv('views.pathways.deleted', 'Pathway deleted'), color: 'success' }
    await fetchPathways()
  } else {
    feedback.value = {
      message: result.error.message || tv('views.pathways.deleteFailed', 'Delete failed'),
      color: 'error',
    }
    logger.error('PathwaysView', 'deletePathway failed', result.error)
  }
  showDelete.value = false
  deleteTarget.value = null
}

async function importDesign(design: unknown): Promise<{ id?: number }> {
  const created = await importPathway(design)
  return { id: created.id }
}

function onImported(entity: { id?: number | string }) {
  if (entity.id != null) router.push(`/pathways/${entity.id}`)
}

defineExpose({ importDesign, onImported })
</script>

<style scoped>
.pathways-view__search {
  max-width: 360px;
  flex: 1 1 280px;
}

.pathways-view__range {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
}

</style>
