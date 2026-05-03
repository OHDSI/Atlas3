<template>
  <AnalysisListLayout
    :error="error ?? null"
    testid="feature-analyses"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <v-text-field
        :model-value="searchInput"
        :label="t('datatable.language.searchPlaceholder', 'Search feature analyses…').value"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="feature-analyses-view__search"
        data-testid="feature-analyses-search"
        @update:model-value="handleSearchInput"
      />
      <AtlasSpacer />
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        :aria-label="t('cc.tabs.featureAnalyses.newLabel', 'New Feature Analysis').value"
        data-testid="feature-analyses-create"
        :disabled="!canCreate"
        @click="handleCreate"
      >
        {{ t('home.newEntityNames.featureAnalysis', 'New feature analysis') }}
      </v-btn>
    </template>

    <AnalysisDataTable
      :headers="headers"
      :items="paginatedFeatureAnalyses"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :empty-text="t('common.noData', 'No feature analyses yet.').value"
      testid="feature-analyses-table"
      :can-copy-item="item => canCopy && !!item.id"
      :can-delete-item="item => entityAccess.canDelete(item.id)"
      @open="handleOpen"
      @copy="handleCopy"
      @delete="handleDeleteClick"
    >
      <template #[`item.type`]="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="typeChipColor(item.type)"
        >
          {{ item.type }}
        </v-chip>
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
      <v-btn
        variant="text"
        :disabled="!canGoPrevious"
        @click="previousPage"
      >
        {{ t('datatable.language.paginate.previous', 'Previous') }}
      </v-btn>
      <span class="feature-analyses-view__range">{{ rangeDisplay }}</span>
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
      <div class="confirm-dialog__header">
        <div class="confirm-dialog__title-block">
          <div class="confirm-dialog__eyebrow-row">
            <span class="text-eyebrow">{{ t('fa.entity', 'Feature analysis').value }}</span>
            <span class="confirm-dialog__accent-rule" />
          </div>
          <h2 class="confirm-dialog__title">
            {{ t('common.delete', 'Delete').value }}
          </h2>
        </div>
      </div>
      <AtlasDivider />
      <v-card-text v-if="selectedFA">
        {{ deleteMessage }}
      </v-card-text>
      <v-card-actions>
        <AtlasSpacer />
        <v-btn
          variant="text"
          @click="showDeleteDialog = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
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
import { AtlasDivider, AtlasSpacer } from '@/components/ui'
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

const router = useRouter()
const { t } = useI18n()
const store = useFeatureAnalysesStore()
const { hasPermission } = usePermissions()
const canCreate = computed(() => hasPermission('create:feature-analysis'))
const canCopy = computed(() => hasPermission('create:feature-analysis'))
const entityAccess = useEntityAccessFor('feAnalysis')

const {
  loading,
  error,
  paginatedFeatureAnalyses,
  totalItems,
  itemsPerPage,
  canGoPrevious,
  canGoNext,
  rangeDisplay,
  nextPage,
  previousPage,
  setFilter,
  refresh,
} = useFeatureAnalyses()

const searchInput = ref<string>('')

const headers = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('cc.fa.analysisType', 'Type').value, key: 'type' },
  { title: t('cc.fa.domain', 'Domain').value, key: 'domain' },
  { title: t('cc.fa.statType', 'Stat Type').value, key: 'statType' },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.modified', 'Modified').value, key: 'modifiedDate' },
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

function handleSearchInput(value: string | null) {
  const next = value ?? ''
  searchInput.value = next
  setFilter(next)
}

function handleCreate() {
  router.push('/feature-analyses/new')
}

function handleOpen(item: FeatureAnalysisListItem) {
  router.push(`/feature-analyses/${item.id}`)
}

async function handleCopy(item: FeatureAnalysisListItem) {
  const copied = await store.copy(item.id)
  if (copied?.id) {
    router.push(`/feature-analyses/${copied.id}`)
  }
}

function handleDeleteClick(item: FeatureAnalysisListItem) {
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

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.feature-analyses-view__search {
  max-width: 360px;
  flex: 1 1 280px;
}

.feature-analyses-view__range {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 12px;
}

.confirm-dialog__header {
  padding: 20px 24px 14px;
}
.confirm-dialog__title-block {
  flex: 1;
}
.confirm-dialog__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.confirm-dialog__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}
.confirm-dialog__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}
</style>
