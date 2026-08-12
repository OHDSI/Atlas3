<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="t('views.cohorts.eyebrowMain', 'OHDSI · Cohorts').value"
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
        <AtlasButton
          toggle
          value="tile"
          size="sm"
          :aria-label="t('common.tileView', 'Tile view').value"
          data-testid="cohorts-view-toggle-tile"
        >
          <AtlasIcon>mdi-view-grid-outline</AtlasIcon>
        </AtlasButton>
        <AtlasButton
          toggle
          value="table"
          size="sm"
          :aria-label="t('dataSources.table.tableTab', 'Table view').value"
          data-testid="cohorts-view-toggle-table"
        >
          <AtlasIcon>mdi-view-list-outline</AtlasIcon>
        </AtlasButton>
      </v-btn-toggle>
    </template>

    <div class="cohorts-view">
      <!-- Toolbar: primary actions on the left, status chip + filters
           toggle on the right. Sits flush on the page card surface
           with no inner v-card wrapper. -->
      <div class="cohorts-view__toolbar">
        <AtlasButton
          icon="mdi-plus"
          :aria-label="t('cohortDefinitions.newDefinitionTitle', 'Create new cohort').value"
          :disabled="!canCreateCohort"
          @click="handleCreateCohort"
        >
          {{ t('cohortDefinitions.newDefinition', 'New cohort') }}
        </AtlasButton>

        <AtlasButton
          variant="secondary"
          icon="mdi-upload-outline"
          :aria-label="t('common.import', 'Import cohort from JSON').value"
          :disabled="!canCreateCohort"
          data-testid="import-cohort-btn"
          @click="handleImportCohort"
        >
          {{ t('common.import', 'Import') }}
        </AtlasButton>

        <AtlasChip
          v-if="!loading && filteredCohorts.length > 0"
          size="sm"
          tone="primary"
          class="cohorts-view__count"
        >
          {{ countLabel }}
        </AtlasChip>

        <AtlasSpacer />
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
        <AtlasProgressLinear
          indeterminate
          color="primary"
          height="2"
          rounded
        />
        <div class="cohorts-view__filtering-text">
          {{ t('common.filtering', 'Filtering').value }} {{ cohorts.length.toLocaleString() }}
          {{ t('cohortDefinitions.cohortsLower', 'cohorts').value }}…
        </div>
      </div>

      <cohort-table
        v-if="viewMode === 'table'"
        :cohorts="paginatedCohorts"
        :loading="loading"
        :error="error"
        :search-query="searchQuery"
        :selected-tags="filters.selectedTags"
        :can-copy="canCreateCohort"
        :copying-id="copyingId"
        @retry="fetchCohorts"
        @create-cohort="handleCreateCohort"
        @clear-filters="clearFilters"
        @delete="handleDeleteClick"
        @copy="handleCopyClick"
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
        :can-copy="canCreateCohort"
        :copying-id="copyingId"
        @retry="fetchCohorts"
        @create-cohort="handleCreateCohort"
        @clear-filters="clearFilters"
        @delete="handleDeleteClick"
        @copy="handleCopyClick"
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

      <!-- Import Dialog -->
      <AtlasDialog
        v-model="showImportDialog"
        :eyebrow="t('views.cohorts.eyebrowImport', 'IMPORT').value"
        :title="t('common.importCohort', 'Import cohort definition').value"
        max-width="640"
        @close="closeImportDialog"
      >
        <p class="cohorts-view__import-hint">
          {{
            t(
              'cohortDefinitions.importHint',
              'Paste an Atlas cohort JSON or upload a .json file. The expression is validated before saving.'
            ).value
          }}
        </p>

        <AtlasTextField
          v-model="importName"
          :label="t('columns.name', 'Cohort name').value"
          variant="outlined"
          :disabled="importing"
          class="mb-3"
          data-testid="import-name-field"
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

        <AtlasTextField
          v-model="importJson"
          :label="t('cohortDefinitions.expressionJsonLabel', 'Expression JSON').value"
          :placeholder="'{ &quot;ConceptSets&quot;: [], &quot;PrimaryCriteria&quot;: { … } }'"
          :rows="8"
          multiline
          variant="outlined"
          hide-details
          :disabled="importing"
          class="cohorts-view__import-json"
          data-testid="import-json-field"
        />

        <AtlasAlert
          v-if="importError"
          severity="danger"
          density="compact"
          class="mt-3"
        >
          {{ importError }}
        </AtlasAlert>
        <template #actions>
          <AtlasButton
            variant="ghost"
            :disabled="importing"
            @click="closeImportDialog"
          >
            {{ t('common.cancel', 'Cancel').value }}
          </AtlasButton>
          <AtlasButton
            :loading="importing"
            :disabled="!canImport"
            data-testid="import-confirm-btn"
            @click="confirmImport"
          >
            {{ t('common.import', 'Import').value }}
          </AtlasButton>
        </template>
      </AtlasDialog>

      <!-- Delete Confirmation Dialog -->
      <AtlasDialog
        v-model="showDeleteDialog"
        :eyebrow="t('views.cohorts.eyebrowConfirm', 'CONFIRM').value"
        :title="t('common.deleteCohortTitle', 'Delete cohort?').value"
        max-width="500"
        @close="showDeleteDialog = false"
      >
        <p class="mb-2">
          {{
            t(
              'cohortDefinitions.cohortDefinitionManager.confirms.delete',
              'Delete cohort definition? Warning: deletion can not be undone!'
            )
          }}
        </p>
        <p class="mb-2">
          <strong>{{ selectedCohort?.name }}</strong>
        </p>
        <p class="text-body-2 text-error">
          {{ t('common.cannotUndo', 'This action cannot be undone.') }}
        </p>
        <template #actions>
          <AtlasButton
            variant="ghost"
            @click="showDeleteDialog = false"
          >
            {{ t('common.cancel', 'Cancel') }}
          </AtlasButton>
          <AtlasButton
            variant="danger"
            :loading="deleting"
            @click="confirmDelete"
          >
            {{ t('common.delete', 'Delete') }}
          </AtlasButton>
        </template>
      </AtlasDialog>

      <!-- New Cohort Dialog -->
      <AtlasDialog
        v-model="showNewCohortDialog"
        :eyebrow="t('views.cohorts.eyebrowNew', 'NEW').value"
        :title="t('cohortDefinitions.newDefinitionTitle', 'Create new cohort').value"
        max-width="500"
        @close="showNewCohortDialog = false"
      >
        <AtlasTextField
          v-model="newCohortName"
          :label="t('columns.name', 'Cohort name').value"
          variant="outlined"
          @keyup.enter="confirmCreateCohort"
        />
        <template #actions>
          <AtlasButton
            variant="ghost"
            @click="showNewCohortDialog = false"
          >
            {{ t('common.cancel', 'Cancel') }}
          </AtlasButton>
          <AtlasButton
            :disabled="!newCohortName.trim()"
            @click="confirmCreateCohort"
          >
            {{ t('common.create', 'Create') }}
          </AtlasButton>
        </template>
      </AtlasDialog>

      <AtlasDialog
        v-model="showCohortInfoDialog"
        :eyebrow="t('views.cohorts.eyebrowCohort', 'COHORT').value"
        :title="selectedCohort?.name || t('common.cohortInformation', 'Cohort information').value"
        max-width="900"
        @close="showCohortInfoDialog = false"
      >
        <div
          v-if="cohortInfoHtml"
          style="max-height: 600px; overflow-y: auto"
          class="cohort-info-content"
        >
          <!-- eslint-disable-next-line vue/no-v-html -- trusted server content -->
          <div v-html="cohortInfoHtml" />
        </div>
        <div
          v-else-if="loadingCohortInfo"
          class="text-center pa-6"
        >
          <AtlasProgressCircular
            indeterminate
            color="primary"
          />
          <div class="mt-4">
            {{ t('common.loading', 'Loading') }}…
          </div>
        </div>
        <div
          v-else
          class="text-center pa-6 text-error"
        >
          {{
            t(
              'cs.manager.concept.tabs.recordCounts.failedToLoadData',
              'Failed to load cohort information'
            )
          }}
        </div>
      </AtlasDialog>

      <AtlasSnackbar
        v-model="snackbar.show"
        :severity="snackbar.severity"
        :text="snackbar.message"
        :timeout="snackbar.timeout"
        data-testid="cohorts-view-snackbar"
      />
    </div>
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'
import { usePermissions } from '@/composables/usePermissions'
import {
  deleteCohort,
  getCohortDefinition,
  getCohortPrintFriendly,
  saveCohortDefinition,
} from '@/services/cohort-definition.service'
import { logger } from '@/utils/logger'
import { AtlasAlert, AtlasButton, AtlasChip, AtlasDialog, AtlasIcon, AtlasPageShell, AtlasProgressCircular, AtlasProgressLinear, AtlasSnackbar, AtlasTextField } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import CohortGrid from '@/components/cohort/CohortGrid.vue'
import CohortTable from '@/components/cohort/CohortTable.vue'
import CohortPagination from '@/components/cohort/CohortPagination.vue'
import CohortFilters from '@/components/cohort/CohortFilters.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const router = useRouter()
const { t } = useI18n()
const { hasPermission } = usePermissions()
const canCreateCohort = computed(() => hasPermission('create:cohort-definition'))

const pageTitle = computed(
  () => t('cohortDefinitions.cohortDefinitions', 'Cohort Definitions').value
)
const pageSubtitle = computed(
  () => t('cohortDefinitions.pageSubtitle', 'Browse, filter, and manage cohort definitions.').value
)

// View mode (tile vs table) — persisted to localStorage so the choice
// survives across navigations and reloads.
const VIEW_MODE_KEY = 'cohorts-view-mode'
type CohortsViewMode = 'tile' | 'table'
const persistedViewMode = (
  typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_MODE_KEY) : null
) as CohortsViewMode | null
const viewMode = ref<CohortsViewMode>(persistedViewMode === 'tile' ? 'tile' : 'table')
watch(viewMode, mode => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, mode)
})

const showImportDialog = ref(false)
const showDeleteDialog = ref(false)
const showNewCohortDialog = ref(false)
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
let cohortInfoRequestId = 0

// Copy-cohort state
const copyingId = ref<number | null>(null)

const snackbar = reactive<{
  show: boolean
  message: string
  severity: AtlasSnackbarSeverity
  timeout: number
}>({
  show: false,
  message: '',
  severity: 'success',
  timeout: 3000,
})

function showSnackbar(message: string, severity: AtlasSnackbarSeverity = 'success') {
  snackbar.message = message
  snackbar.severity = severity
  snackbar.timeout = severity === 'danger' ? 5000 : 3000
  snackbar.show = true
}

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

const { page, itemsPerPage, itemsPerPageOptions, rangeDisplay, setPage, setItemsPerPage } =
  usePagination(totalItems)

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
  return n === 1
    ? t('views.cohorts.countSingular', '1 cohort').value
    : t('views.cohorts.countPlural', '{count} cohorts', { count: n.toLocaleString() }).value
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
    importError.value = t(
      'cohortDefinitions.importFileReadError',
      'Failed to read the selected file.'
    ).value
  }
}

const canImport = computed(() => {
  return (
    importName.value.trim().length > 0 && importJson.value.trim().length > 0 && !importing.value
  )
})

async function confirmImport() {
  importError.value = null
  let parsed: unknown
  try {
    parsed = JSON.parse(importJson.value)
  } catch {
    importError.value = t(
      'cohortDefinitions.importInvalidJson',
      'Expression JSON is not valid JSON.'
    ).value
    return
  }

  if (!parsed || typeof parsed !== 'object') {
    importError.value = t(
      'cohortDefinitions.importInvalidShape',
      'Expression must be a JSON object.'
    ).value
    return
  }

  importing.value = true
  try {
    const result = await saveCohortDefinition({
      name: importName.value.trim(),
      expressionType: 'SIMPLE_EXPRESSION',
      expression: parsed as object,
    })

    if (!result.success || !result.data.id) {
      importError.value = t(
        'cohortDefinitions.importFailed',
        'Import failed. Check the JSON and try again.'
      ).value
      return
    }

    closeImportDialog()
    await fetchCohorts()
    router.push(`/cohorts/${result.data.id}`)
  } catch (err) {
    logger.error('CohortsView', 'Failed to import cohort', err)
    importError.value = t(
      'cohortDefinitions.importFailed',
      'Import failed. Check the JSON and try again.'
    ).value
  } finally {
    importing.value = false
  }
}

/**
 * Build a "{name} (copy)" name that doesn't collide with an existing
 * cohort name, falling back to "{name} (copy 2)", "(copy 3)", … so
 * repeated copies of the same cohort stay distinguishable.
 */
function buildCopyName(sourceName: string): string {
  const existingNames = new Set(cohorts.value.map(c => c.name))
  const base = `${sourceName} (copy)`
  if (!existingNames.has(base)) return base

  let n = 2
  while (existingNames.has(`${sourceName} (copy ${n})`)) {
    n += 1
  }
  return `${sourceName} (copy ${n})`
}

/**
 * Duplicate a cohort: fetch its full definition, save it as a new cohort
 * with a "(copy)" name, then jump into the new cohort's builder — WebAPI
 * has no server-side /cohortdefinition/{id}/copy endpoint (unlike pathways
 * or incidence rates), so the duplicate is built client-side.
 */
async function handleCopyClick(cohort: CohortDefinitionSummary) {
  if (copyingId.value) return
  copyingId.value = cohort.id

  try {
    const loaded = await getCohortDefinition(cohort.id)
    if (!loaded.success) {
      const message =
        loaded.error.status === 403
          ? t(
              'cohortDefinitions.copyLoadForbidden',
              'You do not have permission to read this cohort.'
            ).value
          : t('cohortDefinitions.copyLoadError', 'Failed to load the cohort to copy.').value
      showSnackbar(message, 'danger')
      return
    }
    const definition = loaded.data

    const created = await saveCohortDefinition({
      name: buildCopyName(cohort.name),
      description: definition.description,
      expressionType: 'SIMPLE_EXPRESSION',
      expression: definition.expression ?? {},
    })

    if (!created.success || !created.data.id) {
      showSnackbar(
        t('cohortDefinitions.copyError', 'Failed to copy the cohort.').value,
        'danger'
      )
      return
    }

    await fetchCohorts()
    router.push(`/cohorts/${created.data.id}`)
  } catch (err) {
    logger.error('CohortsView', 'Failed to copy cohort', err)
    showSnackbar(t('cohortDefinitions.copyError', 'Failed to copy the cohort.').value, 'danger')
  } finally {
    copyingId.value = null
  }
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
    const result = await deleteCohort(selectedCohort.value.id)

    if (!result.success) {
      logger.error('CohortsView', 'Failed to delete cohort', result.error)
      showSnackbar(t('cohortDefinitions.deleteError', 'Failed to delete the cohort.').value, 'danger')
      return
    }

    // Refresh cohort list
    await fetchCohorts()

    // Close dialog
    showDeleteDialog.value = false
    selectedCohort.value = null
  } catch (err) {
    logger.error('CohortsView', 'Failed to delete cohort', err)
    showSnackbar(t('cohortDefinitions.deleteError', 'Failed to delete the cohort.').value, 'danger')
  } finally {
    deleting.value = false
  }
}

/**
 * Show cohort info dialog and fetch print-friendly HTML
 */
async function handleShowInfo(cohort: CohortDefinitionSummary) {
  // Clicking through cohorts faster than the network would otherwise land an
  // earlier cohort's HTML in the dialog of the one now selected.
  const requestId = ++cohortInfoRequestId

  selectedCohort.value = cohort
  showCohortInfoDialog.value = true
  loadingCohortInfo.value = true
  cohortInfoHtml.value = null

  try {
    const definitionResult = await getCohortDefinition(cohort.id)
    if (requestId !== cohortInfoRequestId) return
    if (definitionResult.success) {
      const htmlResult = await getCohortPrintFriendly(definitionResult.data)
      if (requestId !== cohortInfoRequestId) return
      cohortInfoHtml.value = htmlResult.success ? htmlResult.data : null
    } else {
      logger.error('CohortsView', 'Failed to fetch cohort definition', definitionResult.error)
    }
  } catch (error) {
    if (requestId !== cohortInfoRequestId) return
    logger.error('CohortsView', 'Failed to fetch cohort print-friendly view', error)
    cohortInfoHtml.value = null
  } finally {
    if (requestId === cohortInfoRequestId) {
      loadingCohortInfo.value = false
    }
  }
}

// Fetch cohorts on component mount
onMounted(() => {
  fetchCohorts()
})

// Deliberate, named test surface for the import flow (as opposed to the
// unreviewable `wrapper.vm.$.setupState` back door).
defineExpose({
  confirmImport,
  handleImportCohort,
  showImportDialog,
  canImport,
  importName,
  importJson,
  importError,
  importing,
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
.cohort-info-content :deep(h1) {
  font-size: 1.25rem;
}
.cohort-info-content :deep(h2) {
  font-size: 1.1rem;
}
.cohort-info-content :deep(h3) {
  font-size: 1rem;
}
.cohort-info-content :deep(h4) {
  font-size: 0.95rem;
}
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
.cohort-info-content :deep(code) {
  padding: 0.1rem 0.3rem;
}
.cohort-info-content :deep(pre) {
  padding: 0.75rem;
  overflow-x: auto;
}
</style>
