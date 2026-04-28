<template>
  <AnalysisListLayout
    :error="error ?? null"
    testid="feature-analyses"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        prepend-icon="mdi-plus"
        :aria-label="t('cc.tabs.featureAnalyses.newLabel', 'New Feature Analysis').value"
        data-testid="feature-analyses-create"
        @click="handleCreate"
      >
        {{ t('cc.tabs.featureAnalyses.newLabel', 'New Feature Analysis') }}
      </v-btn>
    </template>

    <template #filters>
      <v-text-field
        :model-value="searchInput"
        :label="t('datatable.language.searchPlaceholder', 'Search feature analyses...').value"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="feature-analyses-view__search"
        data-testid="feature-analyses-search"
        @update:model-value="handleSearchInput"
      />
    </template>

    <v-data-table
      :headers="headers"
      :items="paginatedFeatureAnalyses"
      :loading="loading"
      :items-per-page="itemsPerPage"
      hide-default-footer
      density="comfortable"
      data-testid="feature-analyses-table"
    >
      <template #[`item.name`]="{ item }">
        <a
          href="#"
          class="feature-analyses-view__name-link"
          data-testid="feature-analyses-row-name"
          @click.prevent="openEditor(item.id)"
        >
          {{ item.name }}
        </a>
      </template>

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

      <template #[`item.createdBy`]="{ item }">
        {{ formatUser(item.createdBy) }}
      </template>

      <template #[`item.createdDate`]="{ item }">
        {{ formatDate(item.createdDate) }}
      </template>

      <template #[`item.modifiedDate`]="{ item }">
        {{ formatDate(item.modifiedDate) }}
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          icon="mdi-pencil"
          size="small"
          variant="text"
          :aria-label="t('components.linkedCohortList.table.actions.edit', 'Edit').value"
          @click="openEditor(item.id)"
        />
        <v-btn
          icon="mdi-content-copy"
          size="small"
          variant="text"
          :aria-label="t('common.copy', 'Copy').value"
          @click="handleCopy(item)"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          :aria-label="t('common.delete', 'Delete').value"
          @click="handleDeleteClick(item)"
        />
      </template>

      <template #no-data>
        <div
          class="feature-analyses-view__empty"
          data-testid="feature-analyses-empty"
        >
          {{ t('common.noData', 'No feature analyses found.') }}
        </div>
      </template>
    </v-data-table>

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
      <v-card-title class="text-h5">
        {{ t('common.delete', 'Delete') }}
      </v-card-title>
      <v-card-text v-if="selectedFA">
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
import { useFeatureAnalyses } from '@/composables/useFeatureAnalyses'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { formatDate } from '@/utils/date-format'
import { logger } from '@/utils/logger'
import type { FeatureAnalysisListItem, FeatureAnalysisType } from '@/models/feature-analysis.types'
import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'

const router = useRouter()
const { t } = useI18n()
const store = useFeatureAnalysesStore()

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

// Local search input state — debounce is handled in the store via setFilter.
const searchInput = ref<string>('')

const headers = computed(() => [
  { title: t('columns.name', 'Name').value, key: 'name' },
  { title: t('cc.fa.analysisType', 'Type').value, key: 'type' },
  { title: t('cc.fa.domain', 'Domain').value, key: 'domain' },
  { title: t('cc.fa.analysisType', 'Stat Type').value, key: 'statType' },
  { title: t('columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('columns.createdDate', 'Created').value, key: 'createdDate' },
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

function openEditor(id: number) {
  router.push(`/feature-analyses/${id}`)
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

function formatUser(user: FeatureAnalysisListItem['createdBy']): string {
  if (!user) return '—'
  if (typeof user === 'string') return user
  return user.name ?? user.login ?? '—'
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
  max-width: 480px;
}

.feature-analyses-view__name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 500;
}

.feature-analyses-view__name-link:hover {
  text-decoration: underline;
}

.feature-analyses-view__empty {
  padding: 32px;
  text-align: center;
  color: #666;
}

.feature-analyses-view__range {
  font-size: 0.875rem;
  color: #666;
  padding: 0 12px;
}
</style>
