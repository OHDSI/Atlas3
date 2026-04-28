<template>
  <AnalysisListLayout
    :title="t('ir.title', 'Incidence rate analyses').value"
    :subtitle="subtitle"
    :error="error?.message ?? null"
    testid="incidence-rates"
  >
    <template #actions>
      <v-text-field
        :model-value="searchInput"
        :label="t('datatable.language.searchPlaceholder', 'Search incidence rates…').value"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="incidence-rates-view__search"
        data-testid="incidence-rates-search"
        @update:model-value="handleSearchInput"
      />
      <v-spacer />
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        prepend-icon="mdi-plus"
        data-testid="incidence-rates-create"
        @click="handleNew"
      >
        {{ t('home.newEntityNames.incidenceRate', 'New incidence rate') }}
      </v-btn>
    </template>

    <AnalysisDataTable
      :headers="headers"
      :items="paginatedIncidenceRates"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :empty-text="t('common.noData', 'No incidence rates yet.').value"
      testid="incidence-rates-table"
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
      <v-btn
        variant="text"
        :disabled="page === 0"
        @click="updatePage(page - 1)"
      >
        {{ t('datatable.language.paginate.previous', 'Previous') }}
      </v-btn>
      <span class="incidence-rates-view__range">{{ page + 1 }} / {{ totalPages }}</span>
      <v-btn
        variant="text"
        :disabled="page + 1 >= totalPages"
        @click="updatePage(page + 1)"
      >
        {{ t('configuration.userImport.wizard.buttons.next', 'Next') }}
      </v-btn>
    </template>
  </AnalysisListLayout>

  <v-dialog
    v-model="showDelete"
    max-width="400"
  >
    <v-card>
      <v-card-title>{{ t('common.delete', 'Delete incidence rate') }}</v-card-title>
      <v-card-text>{{ t('ir.deleteConfirmation', 'Delete incidence rate analysis? Warning: deletion can not be undone!') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showDelete = false">
          {{ t('common.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="error"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar
    :model-value="!!feedback"
    :color="feedback?.color ?? 'info'"
    :timeout="3000"
    @update:model-value="(open: boolean) => { if (!open) feedback = null }"
  >
    {{ feedback?.message }}
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIncidenceRates } from '@/composables/useIncidenceRates'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { deleteIncidenceRate, copyIncidenceRate } from '@/services/webapi'
import { logger } from '@/utils/logger'
import type { IncidenceRate } from '@/models/incidence-rate.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'

const {
  loading, error,
  filters, page, itemsPerPage,
  fetchIncidenceRates,
  paginatedIncidenceRates, totalItems, totalPages,
} = useIncidenceRates()

const router = useRouter()
const store = useIncidenceRateStore()
const { t } = useI18n()
const showDelete = ref(false)
const deleteTarget = ref<number | null>(null)
const feedback = ref<{ message: string; color: 'success' | 'error' | 'info' } | null>(null)
const searchInput = ref('')

const subtitle = computed(() =>
  totalItems.value === 0
    ? t('common.noData', 'No incidence rates yet.').value
    : `${totalItems.value} ${totalItems.value === 1 ? 'analysis' : 'analyses'}`
)

const headers = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('columns.description', 'Description').value, key: 'description' },
  { title: t('facets.caption.targetCohorts', 'Targets').value, key: 'targetCount', sortable: false },
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
    feedback.value = { message: 'Incidence rate copied', color: 'success' }
    router.push(`/incidence-rates/${result.data.id}`)
  } else {
    feedback.value = { message: 'Copy failed', color: 'error' }
    logger.error('IncidenceRatesView', 'copyIncidenceRate failed', !result.success ? result.error : null)
  }
}

function handleRemove(ir: IncidenceRate) {
  if (!ir.id) return
  deleteTarget.value = ir.id
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const ok = await deleteIncidenceRate(deleteTarget.value)
  if (ok) {
    feedback.value = { message: 'Incidence rate deleted', color: 'success' }
    await fetchIncidenceRates()
  } else {
    feedback.value = { message: 'Delete failed', color: 'error' }
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
