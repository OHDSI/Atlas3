<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="feature-analyses-view"
      >
        <!-- Toolbar -->
        <v-row align="center">
          <v-col
            cols="12"
            md="6"
          >
            <h1 class="feature-analyses-view__title">
              {{ t('featureAnalyses.list.title', 'Feature Analyses') }}
            </h1>
          </v-col>
          <v-col
            cols="12"
            md="6"
            class="feature-analyses-view__toolbar"
          >
            <v-text-field
              :model-value="searchInput"
              :label="t('featureAnalyses.list.searchPlaceholder', 'Search feature analyses...').value"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              class="feature-analyses-view__search"
              data-testid="feature-analyses-search"
              @update:model-value="handleSearchInput"
            />
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-plus"
              :aria-label="t('featureAnalyses.list.newButton', 'New Feature Analysis').value"
              data-testid="feature-analyses-create"
              @click="handleCreate"
            >
              {{ t('featureAnalyses.list.newButton', 'New Feature Analysis') }}
            </v-btn>
          </v-col>
        </v-row>

        <!-- Error -->
        <v-row v-if="error">
          <v-col cols="12">
            <v-alert
              type="error"
              variant="tonal"
              closable
              data-testid="feature-analyses-error"
              @click:close="store.clearError()"
            >
              {{ error }}
            </v-alert>
          </v-col>
        </v-row>

        <!-- Table -->
        <v-row>
          <v-col cols="12">
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
                  :aria-label="t('featureAnalyses.list.actions.edit', 'Edit').value"
                  @click="openEditor(item.id)"
                />
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  :aria-label="t('featureAnalyses.list.actions.copy', 'Copy').value"
                  @click="handleCopy(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  :aria-label="t('featureAnalyses.list.actions.delete', 'Delete').value"
                  @click="handleDeleteClick(item)"
                />
              </template>

              <template #no-data>
                <div
                  class="feature-analyses-view__empty"
                  data-testid="feature-analyses-empty"
                >
                  {{ t('featureAnalyses.list.empty', 'No feature analyses found.') }}
                </div>
              </template>
            </v-data-table>
          </v-col>
        </v-row>

        <!-- Pagination -->
        <v-row v-if="!loading && totalItems > itemsPerPage">
          <v-col cols="12">
            <div class="feature-analyses-view__pagination">
              <v-btn
                variant="text"
                :disabled="!canGoPrevious"
                @click="previousPage"
              >
                {{ t('common.previous', 'Previous') }}
              </v-btn>
              <span class="feature-analyses-view__range">{{ rangeDisplay }}</span>
              <v-btn
                variant="text"
                :disabled="!canGoNext"
                @click="nextPage"
              >
                {{ t('common.next', 'Next') }}
              </v-btn>
            </div>
          </v-col>
        </v-row>

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
      </v-container>
    </div>
  </div>
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
  { title: t('featureAnalyses.list.columns.name', 'Name').value, key: 'name' },
  { title: t('featureAnalyses.list.columns.type', 'Type').value, key: 'type' },
  { title: t('featureAnalyses.list.columns.domain', 'Domain').value, key: 'domain' },
  { title: t('featureAnalyses.list.columns.statType', 'Stat Type').value, key: 'statType' },
  { title: t('featureAnalyses.list.columns.createdBy', 'Created By').value, key: 'createdBy' },
  { title: t('featureAnalyses.list.columns.createdDate', 'Created').value, key: 'createdDate' },
  { title: t('featureAnalyses.list.columns.modifiedDate', 'Modified').value, key: 'modifiedDate' },
  { title: t('featureAnalyses.list.columns.actions', 'Actions').value, key: 'actions', sortable: false },
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
.page-wrapper {
  min-height: 100%;
  background-color: rgb(var(--v-theme-background));
  display: flex;
  padding: 32px;
  box-sizing: border-box;
}

.page-card {
  border-radius: 18px;
  padding: 30px;
  background-color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.feature-analyses-view {
  padding: 0;
}

.feature-analyses-view__title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
}

.feature-analyses-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.feature-analyses-view__search {
  max-width: 320px;
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

.feature-analyses-view__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0;
}

.feature-analyses-view__range {
  font-size: 0.875rem;
  color: #666;
}
</style>
