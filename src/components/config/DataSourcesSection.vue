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
            <AtlasButton
              toggle
              value="session"
            >
              {{ t('configuration.priorityOptions.session') }}
            </AtlasButton>
            <AtlasButton
              toggle
              value="application"
              :disabled="!canManageAll()"
            >
              {{ t('configuration.priorityOptions.application') }}
            </AtlasButton>
          </v-btn-toggle>
        </div>
      </v-card-text>
    </v-card>

    <!-- Data Sources Table -->
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('navigation.datasources') }}</span>
        <DisabledReasonTooltip :reason="denied(canManageAll())">
          <AtlasButton
            icon="mdi-plus"
            :disabled="!canManageAll()"
            @click="openCreateDialog"
          >
            {{ t('configuration.newSource') }}
          </AtlasButton>
        </DisabledReasonTooltip>
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
                  <AtlasIcon
                    :color="source.initialized ? 'success' : 'error'"
                    size="small"
                    class="mr-2"
                  >
                    {{ source.initialized ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                  </AtlasIcon>
                  {{ source.sourceName }}
                  <span class="text-grey ml-1">[{{ source.sourceKey }}]</span>
                </div>
              </td>
              <td>{{ source.sourceDialect }}</td>
              <td>
                <div class="d-flex align-center">
                  <input
                    type="radio"
                    :value="source.sourceKey"
                    :checked="isDaimonSelected(source.sourceKey, 'Vocabulary')"
                    :disabled="!canSelectDaimon(source, 'hasVocabulary')"
                    :aria-label="`${tv('columns.vocabulary')}: ${source.sourceName}`"
                    class="mr-2"
                    @change="selectDaimon(source, 'Vocabulary')"
                  >
                  <span>{{ source.vocabularyVersion || source.version || '-' }}</span>
                </div>
              </td>
              <td>
                <input
                  type="radio"
                  :value="source.sourceKey"
                  :checked="isDaimonSelected(source.sourceKey, 'CEM')"
                  :disabled="!canSelectDaimon(source, 'hasEvidence')"
                  :aria-label="`${tv('columns.evidence')}: ${source.sourceName}`"
                  @change="selectDaimon(source, 'CEM')"
                >
              </td>
              <td>
                <input
                  type="radio"
                  :value="source.sourceKey"
                  :checked="isDaimonSelected(source.sourceKey, 'Results')"
                  :disabled="!canSelectDaimon(source, 'hasResults')"
                  :aria-label="`${tv('columns.results')}: ${source.sourceName}`"
                  @change="selectDaimon(source, 'Results')"
                >
              </td>
              <td>
                <div class="d-flex gap-2">
                  <DisabledReasonTooltip :reason="denied(canManageAll())">
                    <AtlasIconButton
                      icon="mdi-pencil"
                      v-bind="{ ariaLabel: tv('common.edit') }"
                      size="sm"
                      :disabled="!canManageAll()"
                      @click="openEditDialog(source)"
                    />
                  </DisabledReasonTooltip>
                  <DisabledReasonTooltip :reason="denied(canManageAccess())">
                    <EntityAccessLockButton
                      v-bind="{ ariaLabel: tv('components.access.configureAccess') }"
                      size="sm"
                      :disabled="!canManageAccess()"
                      @click="openAccessDialog(source)"
                    />
                  </DisabledReasonTooltip>
                  <AtlasIconButton
                    icon="mdi-connection"
                    v-bind="{ ariaLabel: tv('columns.checkConnection') }"
                    size="sm"
                    @click="checkConnection(source)"
                  />
                  <DisabledReasonTooltip :reason="cacheDisabledReason()">
                    <AtlasIconButton
                      icon="mdi-refresh"
                      v-bind="{ ariaLabel: tv('columns.refreshCache') }"
                      size="sm"
                      :disabled="!source.hasResults || !canClearServerCache()"
                      @click="refreshCache(source)"
                    />
                  </DisabledReasonTooltip>
                  <DisabledReasonTooltip :reason="denied(canManageAll())">
                    <AtlasIconButton
                      icon="mdi-delete"
                      v-bind="{ ariaLabel: tv('common.delete') }"
                      size="sm"
                      tone="danger"
                      :disabled="!canManageAll()"
                      @click="confirmDeleteSource(source)"
                    />
                  </DisabledReasonTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <AtlasAlert
          v-if="dataSources.length === 0"
          severity="info"
          class="mt-4"
        >
          {{ t('commonErrors.noSources') }}
        </AtlasAlert>
      </v-card-text>
    </v-card>

    <!-- Action Buttons -->
    <v-card class="mt-4">
      <v-card-title>{{ t('configuration.title') }}</v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap gap-2">
          <AtlasButton
            icon="mdi-delete-sweep"
            @click="clearLocalCache"
          >
            {{ t('configuration.buttons.clearConfigurationCache') }}
          </AtlasButton>
          <DisabledReasonTooltip :reason="denied(canClearServerCache())">
            <AtlasButton
              icon="mdi-server"
              :disabled="!canClearServerCache()"
              @click="clearServerCache"
            >
              {{ t('configuration.buttons.clearServerCache') }}
            </AtlasButton>
          </DisabledReasonTooltip>
        </div>
      </v-card-text>
    </v-card>

    <AtlasSnackbar
      v-model="showToast"
      severity="success"
      :text="toastMessage"
      :timeout="5000"
      location="bottom"
    />

    <AtlasSnackbar
      v-model="showErrorToast"
      severity="danger"
      :text="errorMessage"
      :timeout="5000"
      location="bottom"
    />

    <!-- Data Source Dialog -->
    <DataSourceDialog
      v-model="showDialog"
      :source-key="editingSourceKey"
      :source-id="editingSourceId"
      @saved="handleDialogSaved"
      @deleted="handleDialogDeleted"
      @error="handleDialogError"
    />

    <EntityAccessDialog
      v-model="showAccessDialog"
      entity-type="SOURCE"
      :entity-id="accessSourceId"
      :title="tv('components.access.configureAccess')"
      :subtitle="accessSourceLabel"
      @close="showAccessDialog = false"
    />

    <!-- Delete Confirmation Dialog -->
    <AtlasDialog
      v-model="showDeleteConfirm"
      eyebrow="CONFIRM"
      :title="t('common.delete').value"
      max-width="400"
      @close="showDeleteConfirm = false"
    >
      {{ t('configuration.viewEdit.source.confirms.delete') }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDeleteConfirm = false"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          :loading="isDeleting"
          @click="executeDelete"
        >
          {{ t('common.delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasSnackbar } from '@/components/ui'
import { ref, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useSourceAccessFor } from '@/composables/useEntityAccess'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { deleteSource } from '@/services/source.service'
import { listDataSources } from '@/services/datasource.service'
import { httpGet, httpPost } from '@/services/http-client'
import DataSourceDialog from './DataSourceDialog.vue'
import { EntityAccessDialog, EntityAccessLockButton } from '@/components/access'

const { t, tv } = useI18n()

// This section is visible to any user who can read a source (#324), so the
// controls that change one need their own guard. They are disabled with a
// reason rather than hidden, so a user can see that the action exists and why
// it is unavailable to them.
const {
  canRead: canReadSource,
  canManageAll,
  canClearServerCache,
  canManageAccess,
} = useSourceAccessFor()

function denied(allowed: boolean): string {
  return allowed ? '' : tv('common.noPermission')
}

function cacheDisabledReason(): string {
  return denied(canClearServerCache())
}

function canSelectDaimon(source: DataSourceDisplay, flag: DaimonFlag): boolean {
  if (!source[flag]) return false
  return priorityScope.value === 'application'
    ? canManageAll()
    : canReadSource(source.sourceId)
}

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
  priority: Record<DaimonKind, number>
}

type DaimonKind = 'Vocabulary' | 'CEM' | 'Results'
type DaimonFlag = 'hasVocabulary' | 'hasEvidence' | 'hasResults'

const OWNED_CACHE_KEYS = ['selectedVocabulary', 'selectedEvidence', 'selectedResults']

// State
const priorityScope = ref<'session' | 'application'>('session')
const dataSources = ref<DataSourceDisplay[]>([])
const selectedVocabulary = ref<string>('')
const selectedEvidence = ref<string>('')
const selectedResults = ref<string>('')
const applicationVocabulary = ref<string>('')
const applicationEvidence = ref<string>('')
const applicationResults = ref<string>('')
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMessage = ref('')

// Dialog state
const showDialog = ref(false)
const editingSourceKey = ref<string | null>(null)
const editingSourceId = ref<number | null>(null)

const showAccessDialog = ref(false)
const accessSourceId = ref<number | null>(null)
const accessSourceLabel = ref('')

// Delete confirmation state
const showDeleteConfirm = ref(false)
const deletingSource = ref<DataSourceDisplay | null>(null)
const isDeleting = ref(false)

// Watch for changes in selectedVocabulary and persist to localStorage
watch(selectedVocabulary, newValue => {
  if (newValue) {
    localStorage.setItem('selectedVocabulary', newValue)
  }
})

watch(selectedEvidence, newValue => {
  if (newValue) {
    localStorage.setItem('selectedEvidence', newValue)
  }
})

watch(selectedResults, newValue => {
  if (newValue) {
    localStorage.setItem('selectedResults', newValue)
  }
})

// System default: highest daimon priority for the type, list order on ties.
function defaultKey(daimonType: DaimonKind, flag: DaimonFlag): string {
  let best: DataSourceDisplay | undefined
  for (const s of dataSources.value.filter(x => x[flag] && canReadSource(x.sourceId))) {
    if (!best || s.priority[daimonType] > best.priority[daimonType]) best = s
  }
  return best?.sourceKey ?? ''
}

function applicationDefaultKey(daimonType: DaimonKind, flag: DaimonFlag): string {
  let best: DataSourceDisplay | undefined
  for (const source of dataSources.value.filter(candidate => candidate[flag])) {
    if (!best || source.priority[daimonType] > best.priority[daimonType]) best = source
  }
  return best?.sourceKey ?? ''
}

function usableKey(saved: string | null, flag: DaimonFlag): string {
  const match = dataSources.value.find(s => s.sourceKey === saved && s[flag])
  return match && canReadSource(match.sourceId) ? match.sourceKey : ''
}

function maxPriority(daimons: Array<{ daimonType: string; priority?: number }>, type: DaimonKind): number {
  return Math.max(0, ...daimons.filter(d => d.daimonType === type).map(d => d.priority ?? 0))
}

function applyDefaultSelections() {
  selectedVocabulary.value = defaultKey('Vocabulary', 'hasVocabulary')
  selectedEvidence.value = defaultKey('CEM', 'hasEvidence')
  selectedResults.value = defaultKey('Results', 'hasResults')
}

function applyApplicationSelections() {
  applicationVocabulary.value = applicationDefaultKey('Vocabulary', 'hasVocabulary')
  applicationEvidence.value = applicationDefaultKey('CEM', 'hasEvidence')
  applicationResults.value = applicationDefaultKey('Results', 'hasResults')
}

function selectionFor(daimonType: DaimonKind) {
  if (priorityScope.value === 'application') {
    return daimonType === 'Vocabulary'
      ? applicationVocabulary
      : daimonType === 'CEM'
        ? applicationEvidence
        : applicationResults
  }
  return daimonType === 'Vocabulary'
    ? selectedVocabulary
    : daimonType === 'CEM'
      ? selectedEvidence
      : selectedResults
}

function isDaimonSelected(sourceKey: string, daimonType: DaimonKind): boolean {
  return selectionFor(daimonType).value === sourceKey
}

async function selectDaimon(source: DataSourceDisplay, daimonType: DaimonKind) {
  const selection = selectionFor(daimonType)
  selection.value = source.sourceKey
  if (priorityScope.value === 'application') {
    await updateSourceDaimonPriority(source, daimonType)
  }
}

async function updateSourceDaimonPriority(source: DataSourceDisplay, daimonType: DaimonKind) {
  if (priorityScope.value !== 'application') return

  try {
    await httpPost(`/source/${source.sourceKey}/daimons/${daimonType}/set-priority`)
    await loadDataSources()
  } catch {
    errorMessage.value = tv('configuration.alerts.failUpdatePrioritySourceDaimon')
    showErrorToast.value = true
  }
}

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
      sources.map(async s => {
        const hasVocab = s.daimons?.some(d => d.daimonType === 'Vocabulary') ?? false
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
          hasEvidence: s.daimons?.some(d => d.daimonType === 'CEM') ?? false,
          hasResults: s.daimons?.some(d => d.daimonType === 'Results') ?? false,
          priority: {
            Vocabulary: maxPriority(s.daimons, 'Vocabulary'),
            CEM: maxPriority(s.daimons, 'CEM'),
            Results: maxPriority(s.daimons, 'Results'),
          },
        }
      })
    )

    dataSources.value = sourcesWithVersions

    // Set initial selections from localStorage or first available source
    const savedVocab = localStorage.getItem('selectedVocabulary')
    const savedEvidence = localStorage.getItem('selectedEvidence')
    const savedResults = localStorage.getItem('selectedResults')

    selectedVocabulary.value = usableKey(savedVocab, 'hasVocabulary') || defaultKey('Vocabulary', 'hasVocabulary')
    selectedEvidence.value = usableKey(savedEvidence, 'hasEvidence') || defaultKey('CEM', 'hasEvidence')
    selectedResults.value = usableKey(savedResults, 'hasResults') || defaultKey('Results', 'hasResults')
    applyApplicationSelections()
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.config.dataSources.loadError')
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
 *
 * Only the data-source selections this screen owns. A blanket
 * localStorage.clear() would also drop the bearer token, the theme, the locale
 * and the license acceptance, logging the user out on the next reload.
 */
function clearLocalCache() {
  OWNED_CACHE_KEYS.forEach(key => localStorage.removeItem(key))
  applyDefaultSelections()
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
    errorMessage.value =
      error instanceof Error ? error.message : tv('executionStatus.values.FAILED')
    showErrorToast.value = true
  }
}

/**
 * Open dialog to create a new data source
 */
function openCreateDialog() {
  editingSourceKey.value = null
  editingSourceId.value = null
  showDialog.value = true
}

/**
 * Open dialog to edit an existing data source
 */
function openEditDialog(source: DataSourceDisplay) {
  editingSourceKey.value = source.sourceKey
  editingSourceId.value = source.sourceId
  showDialog.value = true
}

/**
 * Open the shared entity-access dialog for the selected source.
 */
function openAccessDialog(source: DataSourceDisplay) {
  accessSourceId.value = source.sourceId
  accessSourceLabel.value = `${source.sourceName} [${source.sourceKey}]`
  showAccessDialog.value = true
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
