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
      <AtlasButton
        icon="mdi-plus"
        data-testid="pathways-create"
        :disabled="!canCreate"
        @click="handleNew"
      >
        {{ t('home.newEntityNames.pathway', 'New pathway') }}
      </AtlasButton>
    </template>

    <AnalysisDataTable
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
import { deletePathway, copyPathway } from '@/services/webapi'
import { logger } from '@/utils/logger'
import type { Pathway } from '@/models/pathway.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'

const {
  loading,
  error,
  filters,
  page,
  itemsPerPage,
  fetchPathways,
  paginatedPathways,
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

const headers = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('columns.description', 'Description').value, key: 'description' },
  {
    title: t('facets.caption.targetCohorts', 'Targets').value,
    key: 'targetCount',
    sortable: false,
  },
  { title: t('columns.eventCohort', 'Events').value, key: 'eventCount', sortable: false },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.modified', 'Modified').value, key: 'modifiedDate' },
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
  const ok = await deletePathway(deleteTarget.value)
  if (ok) {
    feedback.value = { message: tv('views.pathways.deleted', 'Pathway deleted'), color: 'success' }
    await fetchPathways()
  } else {
    feedback.value = { message: tv('views.pathways.deleteFailed', 'Delete failed'), color: 'error' }
  }
  showDelete.value = false
  deleteTarget.value = null
}
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
