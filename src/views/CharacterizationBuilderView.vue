<!--
  Characterization Builder

  Tabbed editor: Design / Concept Sets / Versions. The Design tab wires up
  the linked-cohort picker, linked-feature-analysis picker, and a strata
  editor with JSON criteria input — the criteria builder integration
  lands in a follow-up. The Run button is rendered but disabled; cohort
  characterization execution arrives in Phase 4.

  Versions integration TODO: the shared VersionsTabContent component is
  hard-typed to `cohortdefinition` / `conceptset` and reaches into the
  matching Pinia stores via dynamic imports. Until that contract is
  generalised the tab renders a stub note and we wire characterization
  versions through `characterization-versions.service` separately.
-->
<template>
  <AnalysisBuilderShell
    :title="titleText"
    :error="storeError"
    testid="char-builder"
    @back="handleBack"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <v-tooltip
        :text="t('cc.fa.tabs.conceptSets', 'Concept Sets').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-bookmark-multiple-outline"
            variant="text"
            size="small"
            density="comfortable"
            data-testid="char-builder-conceptsets-icon"
            @click="showConceptSetsDialog = true"
          />
        </template>
      </v-tooltip>

      <v-tooltip
        v-if="isEditing"
        :text="t('cc.viewEdit.tabs.versions', 'Versions').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-history"
            variant="text"
            size="small"
            density="comfortable"
            data-testid="char-builder-versions-icon"
            @click="showVersionsDialog = true"
          />
        </template>
      </v-tooltip>

      <v-tooltip
        :text="t('cc.viewEdit.tabs.messages', 'Validation').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-badge
            v-bind="tipProps"
            :color="validationBadge?.color || 'default'"
            :content="validationBadge?.count ?? 0"
            :model-value="!!validationBadge"
            offset-x="6"
            offset-y="6"
          >
            <v-btn
              icon="mdi-checkbox-marked-circle-outline"
              variant="text"
              size="small"
              density="comfortable"
              data-testid="char-builder-validation-icon"
              @click="showValidationDialog = true"
            />
          </v-badge>
        </template>
      </v-tooltip>

      <v-tooltip
        :text="t('common.import', 'Import design').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-upload"
            variant="text"
            size="small"
            density="comfortable"
            :loading="importing"
            data-testid="char-builder-import-icon"
            @click="handleImportClick"
          />
        </template>
      </v-tooltip>

      <v-tooltip
        v-if="isEditing"
        :text="t('common.export', 'Export design').value"
        location="bottom"
      >
        <template #activator="{ props: tipProps }">
          <v-btn
            v-bind="tipProps"
            icon="mdi-download"
            variant="text"
            size="small"
            density="comfortable"
            :loading="exporting"
            :disabled="!canExport"
            data-testid="char-builder-export-icon"
            @click="handleExport"
          />
        </template>
      </v-tooltip>

      <input
        ref="importFileInput"
        type="file"
        accept="application/json,.json"
        style="display: none"
        data-testid="char-builder-import-input"
        @change="handleImportFileChange"
      >

      <v-tooltip
        location="top"
        :text="runDisabledReason"
        :disabled="!runDisabledReason"
      >
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps">
            <v-btn
              color="primary"
              variant="tonal"
              prepend-icon="mdi-play-outline"
              :disabled="!canRun"
              data-testid="char-builder-run"
              @click="handleRunClick"
            >
              {{ t('cohortDefinitions.cohort.modals.configureReportsToRun.run', 'Run') }}
            </v-btn>
          </div>
        </template>
      </v-tooltip>
      <v-btn
        v-if="isEditing"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-content-copy-outline"
        :disabled="loading || !canCopy"
        data-testid="char-builder-copy"
        @click="handleSaveCopy"
      >
        {{ t('common.createACopy', 'Save as Copy') }}
      </v-btn>
      <v-btn
        v-if="isEditing"
        variant="text"
        color="error"
        prepend-icon="mdi-delete-outline"
        :disabled="loading || !canDelete"
        data-testid="char-builder-delete"
        @click="handleDeleteClick"
      >
        {{ t('common.delete', 'Delete') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-content-save-outline"
        :disabled="!canSave"
        :loading="saving"
        data-testid="char-builder-save"
        @click="handleSave"
      >
        {{ t('common.save', 'Save') }}
      </v-btn>
    </template>

    <CharacterizationDesignTab
      :model-value="draft"
      :available-cohorts="availableCohorts"
      :available-feature-analyses="availableFeatureAnalyses"
      data-testid="char-builder-design-tab"
      @update:model-value="onDraftChange"
    />

    <section
      v-if="isEditing"
      class="char-builder__executions-section"
    >
      <header class="char-builder__executions-header">
        <span class="text-eyebrow">{{ t('cc.viewEdit.tabs.executions', 'Executions').value }}</span>
        <span class="char-builder__executions-rule" />
      </header>
      <ExecutionsPanel
        :characterization-id="draftId"
        data-testid="char-builder-executions-tab"
      />
    </section>

    <v-dialog
      v-model="showConceptSetsDialog"
      max-width="1200"
      scrollable
    >
      <v-card>
        <AppDialogHeader
          :eyebrow="t('cc.title', 'Characterization').value"
          :title="t('cc.fa.tabs.conceptSets', 'Concept Sets').value"
          :show-close="true"
          :close-label="t('common.close', 'Close').value"
          @close="showConceptSetsDialog = false"
        />
        <v-card-text class="pa-4">
          <CharacterizationConceptSetsTab
            :characterization="draft"
            data-testid="char-builder-conceptsets-tab"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showVersionsDialog"
      max-width="1000"
      scrollable
    >
      <v-card>
        <AppDialogHeader
          :eyebrow="t('cc.title', 'Characterization').value"
          :title="t('cc.viewEdit.tabs.versions', 'Versions').value"
          :show-close="true"
          :close-label="t('common.close', 'Close').value"
          @close="showVersionsDialog = false"
        />
        <v-card-text class="pa-4">
          <div
            class="char-builder__versions-stub"
            data-testid="char-builder-versions-tab"
          >
            <p>
              {{
                t(
                  'characterizations.editor.versionsTodo',
                  'Versions integration TODO — wires into characterization-versions.service in a follow-up.'
                )
              }}
            </p>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showValidationDialog"
      max-width="800"
      scrollable
    >
      <v-card>
        <AppDialogHeader
          :eyebrow="t('cc.title', 'Characterization').value"
          :title="t('cc.viewEdit.tabs.messages', 'Validation').value"
          :show-close="true"
          :close-label="t('common.close', 'Close').value"
          @close="showValidationDialog = false"
        />
        <v-card-text class="pa-4">
          <CharacterizationMessagesTab
            :characterization="draft"
            data-testid="char-builder-validation-tab"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete confirmation dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="500"
    >
      <v-card>
        <div class="confirm-dialog__header">
          <div class="confirm-dialog__title-block">
            <div class="confirm-dialog__eyebrow-row">
              <span class="text-eyebrow">{{ t('cc.title', 'Characterization').value }}</span>
              <span class="confirm-dialog__accent-rule" />
            </div>
            <h2 class="confirm-dialog__title">
              {{ t('common.delete', 'Delete').value }}
            </h2>
          </div>
        </div>
        <v-divider />
        <v-card-text>
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
            variant="flat"
            :loading="loading"
            data-testid="char-builder-delete-confirm"
            @click="confirmDelete"
          >
            {{ t('common.delete', 'Delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      data-testid="char-builder-snackbar"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn
          variant="text"
          @click="snackbar.show = false"
        >
          {{ t('common.close', 'Close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizationStore } from '@/stores/characterization'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { getCohorts } from '@/services/webapi'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import {
  exportCharacterization,
  importCharacterization,
} from '@/services/characterization.service'
import { logger } from '@/utils/logger'
import CharacterizationDesignTab from '@/components/characterization/CharacterizationDesignTab.vue'
import CharacterizationConceptSetsTab from '@/components/characterization/CharacterizationConceptSetsTab.vue'
import CharacterizationMessagesTab from '@/components/characterization/CharacterizationMessagesTab.vue'
import AppDialogHeader from '@/components/shared/AppDialogHeader.vue'
import ExecutionsPanel from '@/components/characterization/ExecutionsPanel.vue'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import {
  validateCharacterization,
  countByLevel,
} from '@/utils/characterization-validators'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const props = defineProps<{
  id?: string
}>()

const router = useRouter()
const { t } = useI18n()
const store = useCharacterizationStore()

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

function makeEmptyDraft(): CharacterizationDefinition {
  return {
    name: '',
    description: '',
    cohorts: [],
    featureAnalyses: [],
    stratas: [],
  }
}

const draft = ref<CharacterizationDefinition>(makeEmptyDraft())
const saving = ref<boolean>(false)
const showDeleteDialog = ref<boolean>(false)
const showConceptSetsDialog = ref<boolean>(false)
const showVersionsDialog = ref<boolean>(false)
const showValidationDialog = ref<boolean>(false)
const importing = ref<boolean>(false)
const exporting = ref<boolean>(false)
const importFileInput = ref<HTMLInputElement | null>(null)

const availableCohorts = ref<CohortDefinitionSummary[]>([])
const availableFeatureAnalyses = ref<FeatureAnalysisListItem[]>([])

const snackbar = reactive<{
  show: boolean
  message: string
  color: 'success' | 'error' | 'info'
  timeout: number
}>({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000,
})

function showSnackbar(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.timeout = color === 'error' ? 5000 : 3000
  snackbar.show = true
}

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

const isEditing = computed<boolean>(() => Boolean(props.id))

const titleText = computed(() => {
  return isEditing.value
    ? t('configuration.tagManagement.edit', 'Edit Characterization').value
    : t('cc.new', 'New Characterization').value
})

const storeError = computed<string | null>(() => store.error)
const loading = computed<boolean>(() => store.loading)

const validationMessages = computed(() => validateCharacterization(draft.value))
const validationCounts = computed(() => countByLevel(validationMessages.value))
const hasValidationErrors = computed<boolean>(() => validationCounts.value.error > 0)

const validationBadge = computed<{ color: string; count: number } | null>(() => {
  const { error, warning } = validationCounts.value
  if (error > 0) return { color: 'error', count: error }
  if (warning > 0) return { color: 'warning', count: warning }
  return null
})

const draftId = computed<number | null>(() => draft.value.id ?? null)

// Permission gating: new characterizations need create:cohort-characterization;
// existing ones need write access on the specific entity (ownership counts).
const { hasPermission } = usePermissions()
const { canWrite, canDelete } = useEntityAccess('cohortCharacterization', draftId)
const canCopy = computed<boolean>(() => hasPermission('create:cohort-characterization'))

const canSave = computed<boolean>(() => {
  if (saving.value || loading.value) return false
  if (draft.value.name.trim().length === 0) return false
  return isEditing.value ? canWrite.value : hasPermission('create:cohort-characterization')
})

const canRun = computed<boolean>(() => {
  return draftId.value != null && !store.isDirty
})

const runDisabledReason = computed<string>(() => {
  if (draftId.value == null) {
    return t(
      'characterizations.editor.executions.runDisabledNoId',
      'Save the characterization before running.'
    ).value
  }
  if (store.isDirty) {
    return t(
      'const.disabledReason.dirty',
      'Save your changes before running.'
    ).value
  }
  return ''
})

function handleRunClick() {
  if (!canRun.value) return
  // Executions live inline in the design view; nothing to switch to.
}

const deleteMessage = computed<string>(() => {
  return t(
    'cc.viewEdit.deleteConfirmation',
    `Delete characterization '${draft.value.name}'?`,
    { name: draft.value.name }
  ).value
})

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

function hydrateFrom(cc: CharacterizationDefinition | null) {
  if (!cc) {
    draft.value = makeEmptyDraft()
  } else {
    draft.value = {
      ...cc,
      description: cc.description ?? '',
      cohorts: [...(cc.cohorts ?? [])],
      featureAnalyses: [...(cc.featureAnalyses ?? [])],
      stratas: [...(cc.stratas ?? [])],
      strataConceptSets: cc.strataConceptSets ? [...cc.strataConceptSets] : undefined,
      parameters: cc.parameters ? [...cc.parameters] : undefined,
      tags: cc.tags ? [...cc.tags] : undefined,
    }
  }
  store.markClean()
}

function onDraftChange(next: CharacterizationDefinition) {
  draft.value = next
  store.markDirty()
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleSave() {
  if (draft.value.name.trim().length === 0) {
    showSnackbar(
      t('components.nameValidation.empty', 'Name is required').value,
      'error'
    )
    return
  }

  if (hasValidationErrors.value) {
    showSnackbar(
      t(
        'const.disabledReason.invalidDesign',
        'Fix validation errors first.'
      ).value,
      'error'
    )
    showValidationDialog.value = true
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      const updated = await store.update(draft.value)
      if (updated) {
        showSnackbar(
          t('characterizations.editor.saveSuccess', 'Characterization saved').value,
          'success'
        )
        store.markClean()
        hydrateFrom(updated)
      } else {
        showSnackbar(
          t('cc.fa.saveError', 'Failed to save characterization').value,
          'error'
        )
      }
    } else {
      const created = await store.create(draft.value)
      if (created?.id) {
        showSnackbar(
          t('characterizations.editor.saveSuccess', 'Characterization saved').value,
          'success'
        )
        store.markClean()
        await router.push(`/characterizations/${created.id}`)
      } else {
        showSnackbar(
          t('cc.fa.saveError', 'Failed to save characterization').value,
          'error'
        )
      }
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Save failed', err)
    showSnackbar(
      t('cc.fa.saveError', 'Failed to save characterization').value,
      'error'
    )
  } finally {
    saving.value = false
  }
}

async function handleSaveCopy() {
  if (!props.id) return
  const numericId = Number(props.id)
  if (Number.isNaN(numericId)) return

  saving.value = true
  try {
    const copied = await store.copy(numericId)
    if (copied?.id) {
      store.markClean()
      await router.push(`/characterizations/${copied.id}`)
    } else {
      showSnackbar(
        t('cc.fa.saveError', 'Failed to save characterization').value,
        'error'
      )
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Save Copy failed', err)
    showSnackbar(
      t('cc.fa.saveError', 'Failed to save characterization').value,
      'error'
    )
  } finally {
    saving.value = false
  }
}

const canExport = computed<boolean>(() => Boolean(draft.value.id))

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'design'
}

function triggerDownload(filename: string, payload: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function handleExport(): Promise<void> {
  if (!draft.value.id) return
  exporting.value = true
  try {
    const design = await exportCharacterization(draft.value.id)
    const json = JSON.stringify(design, null, 2)
    const filename = `characterization-${slugifyName(draft.value.name)}-${draft.value.id}.json`
    triggerDownload(filename, json)
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Export failed', err)
    showSnackbar(
      t('characterizations.editor.utilities.import.importError', 'Export failed.').value,
      'error',
    )
  } finally {
    exporting.value = false
  }
}

function handleImportClick() {
  importFileInput.value?.click()
}

async function handleImportFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  // Reset so selecting the same file twice still triggers a change event.
  target.value = ''
  if (!file) return

  importing.value = true
  let parsed: unknown
  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Import parse failed', err)
    showSnackbar(
      t('characterizations.editor.utilities.import.parseError', 'Could not parse design JSON.').value,
      'error',
    )
    importing.value = false
    return
  }

  try {
    const created = await importCharacterization(parsed)
    store.markClean()
    showSnackbar(
      t('characterizations.editor.utilities.import.importSuccess', 'Imported successfully.').value,
      'success',
    )
    if (created.id != null) {
      await router.push(`/characterizations/${created.id}`)
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Import failed', err)
    showSnackbar(
      t('characterizations.editor.utilities.import.importError', 'Import failed.').value,
      'error',
    )
  } finally {
    importing.value = false
  }
}

function handleDeleteClick() {
  if (!props.id) return
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (!props.id) return
  const numericId = Number(props.id)
  if (Number.isNaN(numericId)) return

  const ok = await store.remove(numericId)
  if (ok) {
    store.markClean()
    showDeleteDialog.value = false
    await router.push('/characterizations')
  } else {
    showSnackbar(
      t('cc.fa.saveError', 'Failed to save characterization').value,
      'error'
    )
  }
}

function handleBack() {
  if (store.isDirty) {
    const confirmed = window.confirm(
      t('common.unsavedWarning', 'You have unsaved changes. Leave anyway?').value
    )
    if (!confirmed) return
  }
  router.push('/characterizations')
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

async function loadAvailableCohorts() {
  try {
    const result = await getCohorts()
    if (result.success) {
      availableCohorts.value = result.data
    } else {
      logger.error('CharacterizationBuilder', 'Failed to load cohorts', result.error)
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Failed to load cohorts', err)
  }
}

async function loadAvailableFeatureAnalyses() {
  try {
    availableFeatureAnalyses.value = await listFeatureAnalyses()
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Failed to load feature analyses', err)
  }
}

onMounted(async () => {
  // Load picker data once per editor mount.
  loadAvailableCohorts()
  loadAvailableFeatureAnalyses()

  if (props.id) {
    const numericId = Number(props.id)
    if (Number.isNaN(numericId)) {
      router.push('/characterizations')
      return
    }
    await store.fetchOne(numericId)
    hydrateFrom(store.currentCharacterization)
  } else {
    store.clearCurrent()
    hydrateFrom(null)
  }
})

onBeforeRouteLeave((_to, _from, next) => {
  if (!store.isDirty) {
    next()
    return
  }
  const confirmed = window.confirm(
    t('common.unsavedWarning', 'You have unsaved changes. Leave anyway?').value
  )
  next(confirmed)
})
</script>

<style scoped>
.char-builder__executions-section {
  margin-top: 24px;
}

.char-builder__executions-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.char-builder__executions-rule {
  flex: 1;
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}

.char-builder__versions-stub {
  padding: 24px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-style: italic;
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
