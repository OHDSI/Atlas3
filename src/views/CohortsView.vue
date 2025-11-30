<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="cohorts-view"
      >
        <v-row>
          <v-col cols="12">
            <div class="cohorts-view__actions">
              <v-btn
                color="primary"
                variant="flat"
                size="large"
                class="cohorts-view__action-btn"
                :aria-label="t('cohortDefinitions.newDefinitionTitle', 'Create new cohort').value"
                @click="handleCreateCohort"
              >
                {{ t('cohortDefinitions.newDefinition', 'New Cohort') }}
              </v-btn>

              <v-btn
                color="primary"
                variant="flat"
                size="large"
                class="cohorts-view__action-btn"
                :aria-label="t('common.import', 'Import cohort from JSON').value"
                @click="handleImportCohort"
              >
                {{ t('common.import', 'Import') }}
              </v-btn>
            </div>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-row>
          <v-col cols="12">
            <cohort-filters
              :filters="filters"
              :available-tags="availableTags"
              :available-authors="availableAuthors"
              :active-filter-count="activeFilterCount"
              @update:filters="filters = $event"
              @clear="clearFilters"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <!-- Filtering indicator -->
            <div
              v-if="filtering"
              class="cohorts-view__filtering"
            >
              <v-progress-linear
                indeterminate
                color="primary"
                height="2"
              />
              <div class="cohorts-view__filtering-text">
                Filtering {{ cohorts.length.toLocaleString() }} cohorts...
              </div>
            </div>

            <cohort-grid
              :cohorts="paginatedCohorts"
              :loading="loading"
              :error="error"
              :search-query="searchQuery"
              :selected-tags="filters.selectedTags"
              @retry="fetchCohorts"
              @create-cohort="handleCreateCohort"
              @generate="handleGenerate"
              @delete="handleDeleteClick"
              @tag-click="handleTagClick"
              @show-info="handleShowInfo"
            />
          </v-col>
        </v-row>

        <!-- Pagination -->
        <v-row v-if="!loading && !error && filteredCohorts.length > 0">
          <v-col cols="12">
            <div class="cohorts-view__pagination">
              <cohort-pagination
                :page="page"
                :items-per-page="itemsPerPage"
                :items-per-page-options="itemsPerPageOptions"
                :total-items="totalItems"
                :can-go-previous="canGoPrevious"
                :can-go-next="canGoNext"
                :range-display="rangeDisplay"
                @previous="previousPage"
                @next="nextPage"
                @update:items-per-page="setItemsPerPage"
              />
            </div>
          </v-col>
        </v-row>

        <!-- Import Dialog -->
        <v-dialog
          v-model="showImportDialog"
          max-width="600px"
        >
          <v-card>
            <v-card-title class="text-h5">
              {{ t('common.import', 'Import') }}
            </v-card-title>
            <v-card-text>
              <p class="mb-4">
                {{ t('common.comingSoon', 'Import functionality will be implemented in a future update.') }}
              </p>
              <p class="text-body-2 text-grey">
                {{ t('cohortDefinitions.cohortDefinitionManager.panels.importConceptSetExpression', 'Import Concept Set Expression') }}
              </p>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="grey"
                variant="text"
                @click="showImportDialog = false"
              >
                {{ t('common.close', 'Close') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete Confirmation Dialog -->
        <v-dialog
          v-model="showDeleteDialog"
          max-width="500px"
        >
          <v-card>
            <v-card-title class="text-h5">
              {{ t('common.deleteCohortTitle', 'Delete Cohort?') }}
            </v-card-title>
            <v-card-text>
              <p class="mb-2">
                {{ t('cohortDefinitions.cohortDefinitionManager.confirms.delete', 'Delete cohort definition? Warning: deletion can not be undone!') }}
              </p>
              <p class="mb-2">
                <strong>{{ selectedCohort?.name }}</strong>
              </p>
              <p class="text-body-2 text-error">
                {{ t('common.cannotUndo', 'This action cannot be undone.') }}
              </p>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="grey"
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

        <!-- Generation Panel -->
        <generation-panel
          v-model="showGenerationPanel"
          :cohort-id="selectedCohort?.id ?? null"
        />

        <!-- Cohort Info Dialog -->
        <v-dialog
          v-model="showCohortInfoDialog"
          max-width="900px"
          scrollable
        >
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon
                color="primary"
                class="mr-2"
              >
                mdi-information-outline
              </v-icon>
              {{ t('common.cohortInformation', 'Cohort Information') }}
            </v-card-title>
            <v-divider />
            <v-card-text
              v-if="cohortInfoHtml"
              style="max-height: 600px;"
              class="cohort-info-content"
            >
              <div v-html="cohortInfoHtml" />
            </v-card-text>
            <v-card-text
              v-else-if="loadingCohortInfo"
              class="text-center pa-6"
            >
              <v-progress-circular
                indeterminate
                color="primary"
              />
              <div class="mt-4">
                {{ t('common.loading', 'Loading') }}...
              </div>
            </v-card-text>
            <v-card-text
              v-else
              class="text-center pa-6 text-error"
            >
              {{ t('common.failedToLoad', 'Failed to load cohort information') }}
            </v-card-text>
            <v-divider />
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="grey"
                variant="text"
                @click="showCohortInfoDialog = false"
              >
                {{ t('common.close', 'Close') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'
import { deleteCohort, getCohortDefinition, getCohortPrintFriendly } from '@/services/webapi'
import { logger } from '@/utils/logger'
import CohortGrid from '@/components/cohort/CohortGrid.vue'
import CohortPagination from '@/components/cohort/CohortPagination.vue'
import CohortFilters from '@/components/cohort/CohortFilters.vue'
import GenerationPanel from '@/components/cohort/GenerationPanel.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const router = useRouter()
const { t } = useI18n()
const showImportDialog = ref(false)
const showDeleteDialog = ref(false)
const showGenerationPanel = ref(false)
const selectedCohort = ref<CohortDefinitionSummary | null>(null)
const deleting = ref(false)

// Cohort info dialog state
const showCohortInfoDialog = ref(false)
const cohortInfoHtml = ref<string | null>(null)
const loadingCohortInfo = ref(false)

// Cohorts state management
const {
  cohorts,
  loading,
  filtering,
  error,
  searchQuery,
  filters,
  filteredCohorts,
  availableTags,
  availableAuthors,
  activeFilterCount,
  fetchCohorts,
  clearFilters,
} = useCohorts()

// Pagination state management
const totalItems = computed(() => filteredCohorts.value.length)

const {
  page,
  itemsPerPage,
  itemsPerPageOptions,
  canGoPrevious,
  canGoNext,
  rangeDisplay,
  nextPage,
  previousPage,
  setItemsPerPage,
} = usePagination(totalItems)

/**
 * Paginated cohorts (current page slice)
 */
const paginatedCohorts = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCohorts.value.slice(start, end)
})

/**
 * Navigate to create new cohort page
 */
function handleCreateCohort() {
  router.push('/cohorts/new')
}

/**
 * Open import cohort dialog
 */
function handleImportCohort() {
  showImportDialog.value = true
}

/**
 * Open generation panel for a cohort
 */
function handleGenerate(cohort: CohortDefinitionSummary) {
  selectedCohort.value = cohort
  showGenerationPanel.value = true
}

/**
 * Open delete confirmation dialog
 */
function handleDeleteClick(cohort: CohortDefinitionSummary) {
  selectedCohort.value = cohort
  showDeleteDialog.value = true
}

/**
 * Handle tag click - toggle tag filter on/off
 */
function handleTagClick(tagName: string) {
  const index = filters.value.selectedTags.indexOf(tagName)
  if (index === -1) {
    // Tag not selected - add it
    filters.value.selectedTags.push(tagName)
  } else {
    // Tag already selected - remove it
    filters.value.selectedTags.splice(index, 1)
  }
}

/**
 * Confirm and execute cohort deletion
 */
async function confirmDelete() {
  if (!selectedCohort.value) return

  deleting.value = true

  try {
    await deleteCohort(selectedCohort.value.id)

    // Refresh cohort list
    await fetchCohorts()

    // Close dialog
    showDeleteDialog.value = false
    selectedCohort.value = null
  } catch (err) {
    logger.error('CohortsView', 'Failed to delete cohort', err)
    // Error handling could be enhanced with a snackbar notification
  } finally {
    deleting.value = false
  }
}

/**
 * Show cohort info dialog and fetch print-friendly HTML
 */
async function handleShowInfo(cohort: CohortDefinitionSummary) {
  selectedCohort.value = cohort
  showCohortInfoDialog.value = true
  loadingCohortInfo.value = true
  cohortInfoHtml.value = null

  try {
    // Fetch the full cohort definition
    const atlasDefinition = await getCohortDefinition(cohort.id)
    if (atlasDefinition) {
      // Get print-friendly HTML
      const html = await getCohortPrintFriendly(atlasDefinition)
      cohortInfoHtml.value = html
    }
  } catch (error) {
    logger.error('CohortsView', 'Failed to fetch cohort print-friendly view', error)
    cohortInfoHtml.value = null
  } finally {
    loadingCohortInfo.value = false
  }
}

// Fetch cohorts on component mount
onMounted(() => {
  fetchCohorts()
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

.cohorts-view {
  padding: 0;
}

/* Breadcrumb */
.cohorts-view__breadcrumb {
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
}

.cohorts-view__breadcrumb-item {
  font-size: 1rem;
  color: #666;
}

.cohorts-view__breadcrumb-item--active {
  font-weight: 500;
  color: #333;
}

/* Actions */
.cohorts-view__actions {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
}

.cohorts-view__action-btn {
  flex: 1;
  text-transform: none;
  font-weight: 400;
  letter-spacing: normal;
}

/* Pagination */
.cohorts-view__pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

@media (max-width: 599px) {
  .cohorts-view__actions {
    flex-direction: column;
  }
}

/* Filtering indicator */
.cohorts-view__filtering {
  margin-bottom: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 12px 16px;
}

.cohorts-view__filtering-text {
  margin-top: 8px;
  font-size: 0.875rem;
  color: #666;
  text-align: center;
}

/* Cohort Info Dialog Styling */
.cohort-info-content :deep(h1),
.cohort-info-content :deep(h2),
.cohort-info-content :deep(h3),
.cohort-info-content :deep(h4) {
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #333;
}

.cohort-info-content :deep(h1) {
  font-size: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.cohort-info-content :deep(h2) {
  font-size: 1.25rem;
  color: rgb(var(--v-theme-primary));
}

.cohort-info-content :deep(h3) {
  font-size: 1.1rem;
}

.cohort-info-content :deep(h4) {
  font-size: 1rem;
}

.cohort-info-content :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.cohort-info-content :deep(ul),
.cohort-info-content :deep(ol) {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
  padding-left: 0.5rem;
}

.cohort-info-content :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.cohort-info-content :deep(ul ul),
.cohort-info-content :deep(ol ol),
.cohort-info-content :deep(ul ol),
.cohort-info-content :deep(ol ul) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.cohort-info-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.cohort-info-content :deep(th),
.cohort-info-content :deep(td) {
  padding: 0.75rem;
  text-align: left;
  border: 1px solid #e0e0e0;
}

.cohort-info-content :deep(th) {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
}

.cohort-info-content :deep(tr:nth-child(even)) {
  background-color: #fafafa;
}

.cohort-info-content :deep(strong),
.cohort-info-content :deep(b) {
  font-weight: 600;
  color: #333;
}

.cohort-info-content :deep(code) {
  background-color: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.cohort-info-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-bottom: 1rem;
}

/* Specific styling for entry/exit events and inclusion criteria */
.cohort-info-content :deep(.event),
.cohort-info-content :deep(.criteria) {
  background-color: #f9f9f9;
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 4px;
}

.cohort-info-content :deep(.entry-event),
.cohort-info-content :deep(.exit-event) {
  padding-left: 1rem;
  margin-top: 0.5rem;
}
</style>
