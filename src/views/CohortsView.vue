<template>
  <page-shell
    hero
    compact
    eyebrow="OHDSI · Cohorts"
    :title="pageTitle"
    :subtitle="pageSubtitle"
  >
    <template #actions>
      <v-btn-toggle
        v-model="viewMode"
        mandatory
        density="compact"
        variant="outlined"
        divided
        class="cohorts-view__view-toggle"
        data-testid="cohorts-view-toggle"
      >
        <v-btn
          value="tile"
          size="small"
          :aria-label="t('common.tileView', 'Tile view').value"
          data-testid="cohorts-view-toggle-tile"
        >
          <v-icon>mdi-view-grid-outline</v-icon>
        </v-btn>
        <v-btn
          value="table"
          size="small"
          :aria-label="t('dataSources.table.tableTab', 'Table view').value"
          data-testid="cohorts-view-toggle-table"
        >
          <v-icon>mdi-view-list-outline</v-icon>
        </v-btn>
      </v-btn-toggle>
    </template>

    <div class="cohorts-view">
      <!-- Toolbar: primary actions on the left, status chip + filters
           toggle on the right. Sits flush on the page card surface
           with no inner v-card wrapper. -->
      <div class="cohorts-view__toolbar">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          :aria-label="t('cohortDefinitions.newDefinitionTitle', 'Create new cohort').value"
          :disabled="!canCreateCohort"
          @click="handleCreateCohort"
        >
          {{ t('cohortDefinitions.newDefinition', 'New cohort') }}
        </v-btn>

        <v-btn
          variant="tonal"
          prepend-icon="mdi-upload-outline"
          :aria-label="t('common.import', 'Import cohort from JSON').value"
          :disabled="!canCreateCohort"
          @click="handleImportCohort"
        >
          {{ t('common.import', 'Import') }}
        </v-btn>

        <v-chip
          v-if="!loading && filteredCohorts.length > 0"
          size="small"
          variant="tonal"
          color="primary"
          class="cohorts-view__count"
        >
          {{ countLabel }}
        </v-chip>

        <v-spacer />
      </div>

      <!-- Filters -->
      <cohort-filters
        :filters="filters"
        :available-tags="availableTags"
        :available-authors="availableAuthors"
        :active-filter-count="activeFilterCount"
        class="cohorts-view__filters"
        @update:filters="filters = $event"
        @clear="clearFilters"
      />

      <!-- Filtering indicator -->
      <div
        v-if="filtering"
        class="cohorts-view__filtering"
      >
        <v-progress-linear
          indeterminate
          color="primary"
          height="2"
          rounded
        />
        <div class="cohorts-view__filtering-text">
          {{ t('common.filtering', 'Filtering').value }} {{ cohorts.length.toLocaleString() }} {{ t('cohortDefinitions.cohortsLower', 'cohorts').value }}…
        </div>
      </div>

      <cohort-table
        v-if="viewMode === 'table'"
        :cohorts="paginatedCohorts"
        :loading="loading"
        :error="error"
        :search-query="searchQuery"
        :selected-tags="filters.selectedTags"
        @retry="fetchCohorts"
        @create-cohort="handleCreateCohort"
        @clear-filters="clearFilters"
        @generate="handleGenerate"
        @delete="handleDeleteClick"
        @tag-click="handleTagClick"
        @show-info="handleShowInfo"
      />
      <cohort-grid
        v-else
        :cohorts="paginatedCohorts"
        :loading="loading"
        :error="error"
        :search-query="searchQuery"
        :selected-tags="filters.selectedTags"
        @retry="fetchCohorts"
        @create-cohort="handleCreateCohort"
        @clear-filters="clearFilters"
        @generate="handleGenerate"
        @delete="handleDeleteClick"
        @tag-click="handleTagClick"
        @show-info="handleShowInfo"
      />

      <!-- Pagination -->
      <div
        v-if="!loading && !error && filteredCohorts.length > 0"
        class="cohorts-view__pagination"
      >
        <cohort-pagination
          :page="page"
          :items-per-page="itemsPerPage"
          :items-per-page-options="itemsPerPageOptions"
          :total-items="totalItems"
          :range-display="rangeDisplay"
          @update:page="setPage"
          @update:items-per-page="setItemsPerPage"
        />
      </div>

      <!-- Import Dialog: paste an Atlas cohort JSON expression or
           upload a .json file. Posts to /cohortdefinition and
           navigates to the new cohort on success. -->
      <v-dialog
        v-model="showImportDialog"
        max-width="640"
      >
        <v-card>
          <v-card-title class="text-h6">
            {{ t('common.importCohort', 'Import cohort definition').value }}
          </v-card-title>
          <v-card-text>
            <p class="cohorts-view__import-hint">
              {{ t('cohortDefinitions.importHint', 'Paste an Atlas cohort JSON or upload a .json file. The expression is validated before saving.').value }}
            </p>

            <v-text-field
              v-model="importName"
              :label="t('columns.name', 'Cohort name').value"
              variant="outlined"
              density="comfortable"
              :disabled="importing"
              class="mb-3"
            />

            <v-file-input
              v-model="importFile"
              :label="t('cohortDefinitions.uploadJsonLabel', 'Upload JSON file').value"
              accept="application/json,.json"
              prepend-icon=""
              prepend-inner-icon="mdi-paperclip"
              variant="outlined"
              density="comfortable"
              show-size
              hide-details
              :disabled="importing"
              class="mb-3"
              @update:model-value="onImportFileSelected"
            />

            <v-textarea
              v-model="importJson"
              :label="t('cohortDefinitions.expressionJsonLabel', 'Expression JSON').value"
              :placeholder="'{ &quot;ConceptSets&quot;: [], &quot;PrimaryCriteria&quot;: { … } }'"
              rows="8"
              variant="outlined"
              density="comfortable"
              hide-details
              :disabled="importing"
              class="cohorts-view__import-json"
            />

            <v-alert
              v-if="importError"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              {{ importError }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn
              variant="text"
              :disabled="importing"
              @click="closeImportDialog"
            >
              {{ t('common.cancel', 'Cancel').value }}
            </v-btn>
            <v-spacer />
            <v-btn
              color="primary"
              variant="flat"
              :loading="importing"
              :disabled="!canImport"
              @click="confirmImport"
            >
              {{ t('common.import', 'Import').value }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation Dialog -->
      <v-dialog
        v-model="showDeleteDialog"
        max-width="500"
      >
        <v-card>
          <v-card-title class="text-h6">
            {{ t('common.deleteCohortTitle', 'Delete cohort?') }}
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

      <!-- New Cohort Dialog -->
      <v-dialog
        v-model="showNewCohortDialog"
        max-width="500"
      >
        <v-card>
          <v-card-title class="text-h6">
            {{ t('cohortDefinitions.newDefinitionTitle', 'Create new cohort') }}
          </v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newCohortName"
              :label="t('columns.name', 'Cohort name').value"
              variant="outlined"
              density="comfortable"
              autofocus
              @keyup.enter="confirmCreateCohort"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="showNewCohortDialog = false"
            >
              {{ t('common.cancel', 'Cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!newCohortName.trim()"
              @click="confirmCreateCohort"
            >
              {{ t('common.create', 'Create') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Generation Panel -->
      <generation-panel
        v-model="showGenerationPanel"
        :cohort-id="selectedCohort?.id ?? null"
      />

      <!-- Cohort Info Dialog: refreshed header (eyebrow + accent rule
           + clean title) and tightened typography in the body. -->
      <v-dialog
        v-model="showCohortInfoDialog"
        max-width="900"
        scrollable
      >
        <v-card>
          <div class="cohort-info__header">
            <div class="cohort-info__title-block">
              <div class="cohort-info__eyebrow-row">
                <span class="text-eyebrow">{{ t('common.cohortDefinition', 'Cohort definition').value }}</span>
                <span class="cohort-info__accent-rule" />
              </div>
              <h2 class="cohort-info__title">
                {{ selectedCohort?.name || t('common.cohortInformation', 'Cohort information').value }}
              </h2>
            </div>
            <v-btn
              icon="mdi-close"
              variant="text"
              :aria-label="t('common.close', 'Close').value"
              @click="showCohortInfoDialog = false"
            />
          </div>
          <v-divider />
          <v-card-text
            v-if="cohortInfoHtml"
            style="max-height: 600px;"
            class="cohort-info-content"
          >
            <!-- eslint-disable-next-line vue/no-v-html -- trusted server content -->
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
              {{ t('common.loading', 'Loading') }}…
            </div>
          </v-card-text>
          <v-card-text
            v-else
            class="text-center pa-6 text-error"
          >
            {{ t('cs.manager.concept.tabs.recordCounts.failedToLoadData', 'Failed to load cohort information') }}
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>
  </page-shell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'
import { usePermissions } from '@/composables/usePermissions'
import { deleteCohort, getCohortDefinition, getCohortPrintFriendly, saveCohortDefinition } from '@/services/webapi'
import { logger } from '@/utils/logger'
import PageShell from '@/components/shared/PageShell.vue'
import CohortGrid from '@/components/cohort/CohortGrid.vue'
import CohortTable from '@/components/cohort/CohortTable.vue'
import CohortPagination from '@/components/cohort/CohortPagination.vue'
import CohortFilters from '@/components/cohort/CohortFilters.vue'
import GenerationPanel from '@/components/cohort/GenerationPanel.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const router = useRouter()
const { t } = useI18n()
const { hasPermission } = usePermissions()
const canCreateCohort = computed(() => hasPermission('create:cohort-definition'))

const pageTitle = computed(() =>
  t('cohortDefinitions.cohortDefinitions', 'Cohort Definitions').value
)
const pageSubtitle = computed(() =>
  t(
    'cohortDefinitions.pageSubtitle',
    'Browse, filter, and manage cohort definitions.'
  ).value
)

// View mode (tile vs table) — persisted to localStorage so the choice
// survives across navigations and reloads.
const VIEW_MODE_KEY = 'cohorts-view-mode'
type CohortsViewMode = 'tile' | 'table'
const persistedViewMode = (typeof localStorage !== 'undefined'
  ? localStorage.getItem(VIEW_MODE_KEY)
  : null) as CohortsViewMode | null
const viewMode = ref<CohortsViewMode>(persistedViewMode === 'table' ? 'table' : 'tile')
watch(viewMode, (mode) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, mode)
})

const showImportDialog = ref(false)
const showDeleteDialog = ref(false)
const showNewCohortDialog = ref(false)
const showGenerationPanel = ref(false)
const newCohortName = ref('')
const selectedCohort = ref<CohortDefinitionSummary | null>(null)
const deleting = ref(false)

// Import-cohort state
const importName = ref('')
const importJson = ref('')
const importFile = ref<File | File[] | null>(null)
const importError = ref<string | null>(null)
const importing = ref(false)

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
  rangeDisplay,
  setPage,
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

const countLabel = computed(() => {
  const n = filteredCohorts.value.length
  return n === 1 ? '1 cohort' : `${n.toLocaleString()} cohorts`
})

/**
 * Open new cohort dialog
 */
function handleCreateCohort() {
  newCohortName.value = ''
  showNewCohortDialog.value = true
}

/**
 * Confirm and navigate to create new cohort page
 */
function confirmCreateCohort() {
  const name = newCohortName.value.trim()
  if (name) {
    router.push({ path: '/cohorts/new', query: { name } })
  }
  showNewCohortDialog.value = false
}

/**
 * Open import cohort dialog
 */
function handleImportCohort() {
  importName.value = ''
  importJson.value = ''
  importFile.value = null
  importError.value = null
  showImportDialog.value = true
}

function closeImportDialog() {
  showImportDialog.value = false
  importName.value = ''
  importJson.value = ''
  importFile.value = null
  importError.value = null
  importing.value = false
}

/**
 * When the user picks a .json file, read it into the textarea so they
 * see what's about to be imported (and can edit it if they want).
 */
async function onImportFileSelected(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return
  try {
    const text = await file.text()
    importJson.value = text
    importError.value = null
    // Try to derive a default name from the file if the user hasn't
    // typed one yet.
    if (!importName.value.trim()) {
      importName.value = file.name.replace(/\.json$/i, '')
    }
  } catch (err) {
    logger.error('CohortsView', 'Failed to read import file', err)
    importError.value = t('cohortDefinitions.importFileReadError', 'Failed to read the selected file.').value
  }
}

const canImport = computed(() => {
  return importName.value.trim().length > 0
    && importJson.value.trim().length > 0
    && !importing.value
})

async function confirmImport() {
  importError.value = null
  let parsed: unknown
  try {
    parsed = JSON.parse(importJson.value)
  } catch {
    importError.value = t('cohortDefinitions.importInvalidJson', 'Expression JSON is not valid JSON.').value
    return
  }

  if (!parsed || typeof parsed !== 'object') {
    importError.value = t('cohortDefinitions.importInvalidShape', 'Expression must be a JSON object.').value
    return
  }

  importing.value = true
  try {
    const result = await saveCohortDefinition({
      name: importName.value.trim(),
      expressionType: 'SIMPLE_EXPRESSION',
      expression: parsed as object,
    })

    if (!result || !result.id) {
      importError.value = t('cohortDefinitions.importFailed', 'Import failed. Check the JSON and try again.').value
      return
    }

    closeImportDialog()
    await fetchCohorts()
    router.push(`/cohorts/${result.id}`)
  } catch (err) {
    logger.error('CohortsView', 'Failed to import cohort', err)
    importError.value = t('cohortDefinitions.importFailed', 'Import failed. Check the JSON and try again.').value
  } finally {
    importing.value = false
  }
}

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
.cohorts-view {
  width: 100%;
}

.cohorts-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cohorts-view__count {
  align-self: center;
}

.cohorts-view__view-toggle {
  /* Sit in the page-shell #actions slot — keep it tight. */
  flex-shrink: 0;
}

.cohorts-view__filters {
  margin-bottom: 16px;
}

.cohorts-view__pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}

@media (max-width: 599px) {
  .cohorts-view__toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Filtering indicator: a slim progress bar with a quiet label, sits
 * directly on the page surface — no grey box. */
.cohorts-view__filtering {
  margin-bottom: 16px;
}

.cohorts-view__filtering-text {
  margin-top: 6px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.cohorts-view__import-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.cohorts-view__import-json :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

/* Cohort Info Dialog header */
.cohort-info__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px 16px;
}
.cohort-info__title-block {
  flex: 1;
  min-width: 0;
}
.cohort-info__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.cohort-info__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}
.cohort-info__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
  word-break: break-word;
}

/* Cohort Info body — quieter, token-driven typography (replaces the
 * old block of bespoke heading/list/table CSS). The print-friendly
 * HTML inherits Vuetify's text colour and gets a few minimal tweaks
 * so it reads as content, not chrome. */
.cohort-info-content :deep(h1),
.cohort-info-content :deep(h2),
.cohort-info-content :deep(h3),
.cohort-info-content :deep(h4) {
  font-weight: 600;
  margin: 1.25rem 0 0.5rem;
  color: rgb(var(--v-theme-primary));
}
.cohort-info-content :deep(h1) { font-size: 1.25rem; }
.cohort-info-content :deep(h2) { font-size: 1.1rem; }
.cohort-info-content :deep(h3) { font-size: 1rem; }
.cohort-info-content :deep(h4) { font-size: 0.95rem; }
.cohort-info-content :deep(p),
.cohort-info-content :deep(li) {
  line-height: 1.6;
}
.cohort-info-content :deep(ul),
.cohort-info-content :deep(ol) {
  padding-inline-start: 1.5rem;
  margin-block: 0.5rem;
}
.cohort-info-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-block: 0.75rem;
  font-size: 0.9rem;
}
.cohort-info-content :deep(th),
.cohort-info-content :deep(td) {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
}
.cohort-info-content :deep(th) {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface-variant));
  background: rgb(var(--v-theme-surface-variant));
}
.cohort-info-content :deep(code),
.cohort-info-content :deep(pre) {
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}
.cohort-info-content :deep(code) { padding: 0.1rem 0.3rem; }
.cohort-info-content :deep(pre) {
  padding: 0.75rem;
  overflow-x: auto;
}
</style>
