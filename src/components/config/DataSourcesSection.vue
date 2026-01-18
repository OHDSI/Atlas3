<template>
  <div class="data-sources-section">
    <!-- Priority Scope Selector -->
    <v-card class="mb-4">
      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1">{{ t('configuration.changeSourcePriorities') }}</span>
          <v-btn-toggle
            v-model="priorityScope"
            mandatory
            color="primary"
            density="compact"
          >
            <v-btn value="session">
              {{ t('configuration.priorityOptions.session') }}
            </v-btn>
            <v-btn value="application">
              {{ t('configuration.priorityOptions.application') }}
            </v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>
    </v-card>

    <!-- Data Sources Table -->
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('navigation.datasources') }}</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          {{ t('configuration.newSource') }}
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>{{ t('columns.name') }}</th>
              <th>{{ t('columns.dialect') }}</th>
              <th>{{ t('columns.vocabulary') }}</th>
              <th>{{ t('columns.evidence') }}</th>
              <th>{{ t('columns.results') }}</th>
              <th>{{ t('columns.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="source in dataSources"
              :key="source.sourceKey"
            >
              <td>
                <div class="d-flex align-center">
                  <v-icon
                    :color="source.initialized ? 'success' : 'error'"
                    size="small"
                    class="mr-2"
                  >
                    {{ source.initialized ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                  </v-icon>
                  {{ source.sourceName }}
                  <span class="text-grey ml-1">[{{ source.sourceKey }}]</span>
                </div>
              </td>
              <td>{{ source.sourceDialect }}</td>
              <td>
                <div class="d-flex align-center">
                  <input
                    v-model="selectedVocabulary"
                    type="radio"
                    :value="source.sourceKey"
                    :disabled="!source.hasVocabulary"
                    class="mr-2"
                  >
                  <span>{{ source.vocabularyVersion || source.version || '-' }}</span>
                </div>
              </td>
              <td>
                <input
                  v-model="selectedEvidence"
                  type="radio"
                  :value="source.sourceKey"
                  :disabled="!source.hasEvidence"
                >
              </td>
              <td>
                <input
                  v-model="selectedResults"
                  type="radio"
                  :value="source.sourceKey"
                  :disabled="!source.hasResults"
                >
              </td>
              <td>
                <div class="d-flex gap-2">
                  <v-btn
                    size="small"
                    variant="tonal"
                    icon
                    :title="tv('configuration.tagManagement.edit')"
                    @click="openEditDialog(source)"
                  >
                    <v-icon size="small">
                      mdi-pencil
                    </v-icon>
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    icon
                    :title="tv('columns.checkConnection')"
                    @click="checkConnection(source)"
                  >
                    <v-icon size="small">
                      mdi-connection
                    </v-icon>
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    icon
                    :disabled="!source.hasResults"
                    :title="tv('columns.refreshCache')"
                    @click="refreshCache(source)"
                  >
                    <v-icon size="small">
                      mdi-refresh
                    </v-icon>
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    icon
                    color="error"
                    :title="tv('common.delete')"
                    @click="confirmDeleteSource(source)"
                  >
                    <v-icon size="small">
                      mdi-delete
                    </v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-alert
          v-if="dataSources.length === 0"
          type="info"
          variant="tonal"
          class="mt-4"
        >
          <span v-html="tv('commonErrors.noSources')" />
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Action Buttons -->
    <v-card class="mt-4">
      <v-card-title>{{ t('configuration.title') }}</v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap gap-2">
          <v-btn
            color="primary"
            prepend-icon="mdi-delete-sweep"
            @click="clearLocalCache"
          >
            {{ t('configuration.buttons.clearConfigurationCache') }}
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-server"
            @click="clearServerCache"
          >
            {{ t('configuration.buttons.clearServerCache') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Success Toast -->
    <v-snackbar
      v-model="showToast"
      :timeout="5000"
      color="success"
      location="bottom"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Error Toast -->
    <v-snackbar
      v-model="showErrorToast"
      :timeout="5000"
      color="error"
      location="bottom"
    >
      {{ errorMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showErrorToast = false"
        >
          {{ t('common.close') }}
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Data Source Dialog -->
    <DataSourceDialog
      v-model="showDialog"
      :source-id="editingSourceId"
      @saved="handleDialogSaved"
      @deleted="handleDialogDeleted"
      @error="handleDialogError"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteConfirm"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ t('common.delete') }}</v-card-title>
        <v-card-text>{{ t('configuration.viewEdit.source.confirms.delete') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteConfirm = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :loading="isDeleting"
            @click="executeDelete"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { deleteSource } from '@/services/source.service'
import { listDataSources } from '@/services/datasource.service'
import { httpGet, httpPost } from '@/services/http-client'
import DataSourceDialog from './DataSourceDialog.vue'

const { t, tv } = useI18n()

interface DataSourceDisplay {
  sourceId: number
  sourceKey: string
  sourceName: string
  sourceDialect: string
  version?: string
  vocabularyVersion?: string
  initialized: boolean
  hasVocabulary: boolean
  hasEvidence: boolean
  hasResults: boolean
}

// State
const priorityScope = ref<'session' | 'application'>('session')
const dataSources = ref<DataSourceDisplay[]>([])
const selectedVocabulary = ref<string>('')
const selectedEvidence = ref<string>('')
const selectedResults = ref<string>('')
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMessage = ref('')

// Dialog state
const showDialog = ref(false)
const editingSourceId = ref<number | null>(null)

// Delete confirmation state
const showDeleteConfirm = ref(false)
const deletingSource = ref<DataSourceDisplay | null>(null)
const isDeleting = ref(false)

// Watch for changes in selectedVocabulary and persist to localStorage
watch(selectedVocabulary, (newValue) => {
  if (newValue) {
    localStorage.setItem('selectedVocabulary', newValue)
  }
})

watch(selectedEvidence, (newValue) => {
  if (newValue) {
    localStorage.setItem('selectedEvidence', newValue)
  }
})

watch(selectedResults, (newValue) => {
  if (newValue) {
    localStorage.setItem('selectedResults', newValue)
  }
})

/**
 * Load data sources on mount
 */
onMounted(async () => {
  await loadDataSources()
})

/**
 * Load data sources from API
 */
async function loadDataSources() {
  try {
    const sources = await listDataSources()

    // Load each source and fetch vocabulary version if it has vocabulary
    const sourcesWithVersions = await Promise.all(
      sources.map(async (s) => {
        const hasVocab = s.daimons?.some((d) => d.daimonType === 'Vocabulary') ?? false
        let vocabularyVersion: string | undefined

        // If source has vocabulary, try to fetch the vocabulary info
        if (hasVocab && s.sourceKey) {
          try {
            const vocabData = await httpGet<{ version?: string }>(`/vocabulary/${s.sourceKey}/info`)
            vocabularyVersion = vocabData.version
          } catch {
            // Fallback if vocabulary info fetch fails
            vocabularyVersion = undefined
          }
        }

        return {
          sourceId: s.sourceId,
          sourceKey: s.sourceKey,
          sourceName: s.sourceName,
          sourceDialect: s.sourceDialect,
          version: undefined,
          vocabularyVersion,
          initialized: true,
          hasVocabulary: hasVocab,
          hasEvidence: s.daimons?.some((d) => d.daimonType === 'CEM') ?? false,
          hasResults: s.daimons?.some((d) => d.daimonType === 'Results') ?? false
        }
      })
    )

    dataSources.value = sourcesWithVersions

    // Set initial selections from localStorage or first available source
    const savedVocab = localStorage.getItem('selectedVocabulary')
    const savedEvidence = localStorage.getItem('selectedEvidence')
    const savedResults = localStorage.getItem('selectedResults')

    selectedVocabulary.value = savedVocab || dataSources.value.find(s => s.hasVocabulary)?.sourceKey || ''
    selectedEvidence.value = savedEvidence || dataSources.value.find(s => s.hasEvidence)?.sourceKey || ''
    selectedResults.value = savedResults || dataSources.value.find(s => s.hasResults)?.sourceKey || ''
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load data sources'
    showErrorToast.value = true
  }
}

/**
 * Check source connection
 */
async function checkConnection(source: DataSourceDisplay) {
  try {
    await httpGet(`/source/connection/${source.sourceKey}`)
    toastMessage.value = `${source.sourceName}: ${tv('executionStatus.values.COMPLETED')}`
    showToast.value = true
  } catch {
    errorMessage.value = tv('configuration.userImport.wizard.provider.connection.failed')
    showErrorToast.value = true
  }
}

/**
 * Refresh source cache (clear then refresh, matching Atlas 2.x behavior)
 */
async function refreshCache(source: DataSourceDisplay) {
  try {
    // First clear the cache, then refresh (matching Atlas 2.x)
    await httpPost(`/cdmresults/${source.sourceKey}/clearCache`)
    await httpGet(`/cdmresults/${source.sourceKey}/refreshCache`)
    toastMessage.value = `${source.sourceName}: ${tv('executionStatus.values.STARTED')}`
    showToast.value = true
  } catch {
    errorMessage.value = `${source.sourceName}: ${tv('executionStatus.values.FAILED')}`
    showErrorToast.value = true
  }
}

/**
 * Clear local storage cache
 */
function clearLocalCache() {
  localStorage.clear()
  toastMessage.value = tv('configuration.alerts.clearLocalCache')
  showToast.value = true
}

/**
 * Clear server cache
 */
async function clearServerCache() {
  if (!confirm(tv('configuration.confirms.clearServerCache'))) {
    return
  }

  try {
    await httpPost('/cache/clear')
    toastMessage.value = tv('configuration.alerts.clearServerCache')
    showToast.value = true
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : tv('executionStatus.values.FAILED')
    showErrorToast.value = true
  }
}

/**
 * Open dialog to create a new data source
 */
function openCreateDialog() {
  editingSourceId.value = null
  showDialog.value = true
}

/**
 * Open dialog to edit an existing data source
 */
function openEditDialog(source: DataSourceDisplay) {
  editingSourceId.value = source.sourceId
  showDialog.value = true
}

/**
 * Handle dialog saved event
 */
async function handleDialogSaved() {
  toastMessage.value = tv('executionStatus.values.COMPLETED')
  showToast.value = true
  await loadDataSources()
}

/**
 * Handle dialog deleted event
 */
async function handleDialogDeleted() {
  toastMessage.value = tv('executionStatus.values.COMPLETED')
  showToast.value = true
  await loadDataSources()
}

/**
 * Handle dialog error event
 */
function handleDialogError(message: string) {
  errorMessage.value = message
  showErrorToast.value = true
}

/**
 * Confirm deletion of a data source
 */
function confirmDeleteSource(source: DataSourceDisplay) {
  deletingSource.value = source
  showDeleteConfirm.value = true
}

/**
 * Execute the deletion of the selected source
 */
async function executeDelete() {
  if (!deletingSource.value) return

  isDeleting.value = true

  try {
    await deleteSource(deletingSource.value.sourceId)
    toastMessage.value = tv('executionStatus.values.COMPLETED')
    showToast.value = true
    showDeleteConfirm.value = false
    deletingSource.value = null
    await loadDataSources()
  } catch (error) {
    const message = error instanceof Error ? error.message : tv('executionStatus.values.FAILED')
    errorMessage.value = message
    showErrorToast.value = true
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped>
.data-sources-section {
  max-width: 1200px;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
