<template>
  <AnalysisListLayout
    :error="error?.message ?? null"
    testid="incidence-rates"
  >
    <template #actions>
      <AtlasTextField
        :model-value="searchInput"
        :label="t('datatable.language.searchPlaceholder', 'Search incidence rates…').value"
        prepend-icon="mdi-magnify"
        variant="outlined"
        hide-details
        clearable
        class="incidence-rates-view__search"
        data-testid="incidence-rates-search"
        @update:model-value="(v: string | number) => handleSearchInput(v != null ? String(v) : null)"
      />
    </template>

    <template #primary-action>
      <AtlasButton
        icon="mdi-plus"
        data-testid="incidence-rates-create"
        :disabled="!canCreate"
        @click="handleNew"
      >
        {{ t('home.newEntityNames.incidenceRate', 'New incidence rate') }}
      </AtlasButton>
    </template>

    <AnalysisDataTable
      :headers="headers"
      :items="paginatedIncidenceRates"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :empty-text="t('common.noData', 'No incidence rates yet.').value"
      testid="incidence-rates-table"
      :can-copy-item="item => canCopy && !!item.id"
      :can-delete-item="item => entityAccess.canDelete(item.id)"
      @open="handleOpen"
      @copy="handleCopy"
      @delete="handleRemove"
    >
      <template #[`item.targetCount`]="{ item }">
        {{ item.expression?.targetIds?.length ?? 0 }}
      </template>
      <template #[`item.outcomeCount`]="{ item }">
        {{ item.expression?.outcomeIds?.length ?? 0 }}
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
      <span class="incidence-rates-view__range">{{ page + 1 }} / {{ totalPages }}</span>
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
      t(
        'ir.deleteConfirmation',
        'Delete incidence rate analysis? Warning: deletion can not be undone!'
      )
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
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDialog, AtlasTextField } from '@/components/ui'
import { useNotifications } from '@/stores/notifications'
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIncidenceRates } from '@/composables/useIncidenceRates'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { deleteIncidenceRate, copyIncidenceRate } from '@/services/incidence-rate.service'
import { logger } from '@/utils/logger'
import type { IncidenceRate } from '@/models/incidence-rate.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'

const {
  loading,
  error,
  filters,
  page,
  itemsPerPage,
  fetchIncidenceRates,
  paginatedIncidenceRates,
  totalPages,
} = useIncidenceRates()

const router = useRouter()
const { hasPermission } = usePermissions()
const canCreate = computed(() => hasPermission('create:incidence'))
const canCopy = computed(() => hasPermission('create:incidence'))
const entityAccess = useEntityAccessFor('incidenceRate')
const store = useIncidenceRateStore()
const notify = useNotifications()
const { t, tv } = useI18n()
const showDelete = ref(false)
const deleteTarget = ref<number | null>(null)
const searchInput = ref('')

const headers = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('columns.description', 'Description').value, key: 'description' },
  {
    title: t('facets.caption.targetCohorts', 'Targets').value,
    key: 'targetCount',
    sortable: false,
  },
  { title: t('ir.editor.outcomes', 'Outcomes').value, key: 'outcomeCount', sortable: false },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.modified', 'Modified').value, key: 'modifiedDate' },
  { title: t('columns.actions', 'Actions').value, key: 'actions', sortable: false },
])

onMounted(fetchIncidenceRates)

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
  store.createNewIR()
  router.push('/incidence-rates/new')
}

function handleOpen(ir: IncidenceRate) {
  if (ir.id) router.push(`/incidence-rates/${ir.id}`)
}

async function handleCopy(ir: IncidenceRate) {
  if (!ir.id) return
  const result = await copyIncidenceRate(ir.id)
  if (result.success && result.data.id) {
    notify.success(tv('views.incidenceRates.copied', 'Incidence rate copied'))
    router.push(`/incidence-rates/${result.data.id}`)
  } else {
    notify.danger(tv('views.incidenceRates.copyFailed', 'Copy failed'))
    logger.error(
      'IncidenceRatesView',
      'copyIncidenceRate failed',
      !result.success ? result.error : null
    )
  }
}

function handleRemove(ir: IncidenceRate) {
  if (!ir.id) return
  deleteTarget.value = ir.id
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const result = await deleteIncidenceRate(deleteTarget.value)
  if (result.success) {
    notify.success(tv('views.incidenceRates.deleted', 'Incidence rate deleted'))
    await fetchIncidenceRates()
  } else {
    notify.danger(
      result.error.message || tv('views.incidenceRates.deleteFailed', 'Delete failed')
    )
    logger.error('IncidenceRatesView', 'deleteIncidenceRate failed', result.error)
  }
  showDelete.value = false
  deleteTarget.value = null
}
</script>

<style scoped>
.incidence-rates-view__search {
  max-width: 360px;
  flex: 1 1 280px;
}

.incidence-rates-view__range {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
}

</style>
