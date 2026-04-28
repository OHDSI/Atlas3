<template>
  <AnalysisListLayout
    :title="t('cc.title', 'Characterizations').value"
    :subtitle="ccSubtitle"
    :error="error ?? null"
    testid="characterizations"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <v-text-field
        :model-value="searchInput"
        :label="t('datatable.language.searchPlaceholder', 'Search characterizations…').value"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="characterizations-view__search"
        data-testid="characterizations-search"
        @update:model-value="handleSearchInput"
      />
      <v-spacer />
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        prepend-icon="mdi-plus"
        :aria-label="t('cc.new', 'New Characterization').value"
        data-testid="characterizations-create"
        @click="handleCreate"
      >
        {{ t('home.newEntityNames.characterization', 'New characterization') }}
      </v-btn>
    </template>

    <AnalysisDataTable
      :headers="headers"
      :items="paginatedCharacterizations"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :empty-text="t('common.noData', 'No characterizations yet.').value"
      testid="characterizations-table"
      @open="handleOpen"
      @copy="handleCopy"
      @delete="handleDeleteClick"
    >
      <template #[`item.cohorts`]="{ item }">
        {{ item.cohorts?.length ?? 0 }}
      </template>
      <template #[`item.featureAnalyses`]="{ item }">
        {{ item.featureAnalyses?.length ?? 0 }}
      </template>
    </AnalysisDataTable>

    <template
      v-if="!loading && totalItems > itemsPerPage"
      #pagination
    >
      <v-btn
        variant="text"
        :disabled="!canGoPrevious"
        @click="previousPage"
      >
        {{ t('datatable.language.paginate.previous', 'Previous') }}
      </v-btn>
      <span class="characterizations-view__range">{{ rangeDisplay }}</span>
      <v-btn
        variant="text"
        :disabled="!canGoNext"
        @click="nextPage"
      >
        {{ t('configuration.userImport.wizard.buttons.next', 'Next') }}
      </v-btn>
    </template>
  </AnalysisListLayout>

  <!-- Delete confirmation dialog -->
  <v-dialog
    v-model="showDeleteDialog"
    max-width="500"
  >
    <v-card>
      <v-card-title class="text-h5">
        {{ t('common.delete', 'Delete') }}
      </v-card-title>
      <v-card-text v-if="selectedCC">
        {{ deleteMessage }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="showDeleteDialog = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="error"
          variant="elevated"
          :loading="deleting"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizations } from '@/composables/useCharacterizations'
import { useCharacterizationStore } from '@/stores/characterization'
import { logger } from '@/utils/logger'
import type { CharacterizationListItem } from '@/models/characterization.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'
import AnalysisDataTable from '@/components/analysis/AnalysisDataTable.vue'

const router = useRouter()
const { t } = useI18n()
const store = useCharacterizationStore()

const {
  loading,
  error,
  paginatedCharacterizations,
  totalItems,
  itemsPerPage,
  canGoPrevious,
  canGoNext,
  rangeDisplay,
  nextPage,
  previousPage,
  setFilter,
  refresh,
} = useCharacterizations()

const searchInput = ref<string>('')

const ccSubtitle = computed(() =>
  totalItems.value === 0
    ? t('common.noData', 'No characterizations yet.').value
    : `${totalItems.value} ${totalItems.value === 1 ? 'characterization' : 'characterizations'}`
)

const headers = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('columns.description', 'Description').value, key: 'description' },
  { title: t('cc.viewEdit.results.filters.cohorts', 'Cohorts').value, key: 'cohorts', sortable: false },
  { title: t('cc.tabs.featureAnalyses.title', 'Feature Analyses').value, key: 'featureAnalyses', sortable: false },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.modified', 'Modified').value, key: 'modifiedDate' },
  { title: t('columns.actions', 'Actions').value, key: 'actions', sortable: false },
])

const showDeleteDialog = ref(false)
const selectedCC = ref<CharacterizationListItem | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() => {
  if (!selectedCC.value) return ''
  return t(
    'cc.viewEdit.deleteConfirmation',
    `Delete characterization '${selectedCC.value.name}'?`,
    { name: selectedCC.value.name }
  ).value
})

function handleSearchInput(value: string | null) {
  const next = value ?? ''
  searchInput.value = next
  setFilter(next)
}

function handleCreate() {
  router.push('/characterizations/new')
}

function handleOpen(item: CharacterizationListItem) {
  router.push(`/characterizations/${item.id}`)
}

async function handleCopy(item: CharacterizationListItem) {
  const copied = await store.copy(item.id)
  if (copied?.id) {
    router.push(`/characterizations/${copied.id}`)
  }
}

function handleDeleteClick(item: CharacterizationListItem) {
  selectedCC.value = item
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!selectedCC.value) return
  deleting.value = true
  try {
    const success = await store.remove(selectedCC.value.id)
    if (success) {
      showDeleteDialog.value = false
      selectedCC.value = null
    }
  } catch (err) {
    logger.error('CharacterizationsView', 'Failed to delete characterization', err)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.characterizations-view__search {
  max-width: 360px;
  flex: 1 1 280px;
}

.characterizations-view__range {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
}
</style>
