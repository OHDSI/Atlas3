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
    :eyebrow="t('cc.title', 'Characterization').value"
    :title="titleText"
    :error="storeError"
    :authorship="store.currentCharacterization"
    :show-back="false"
    testid="char-builder"
    @back="handleBack"
    @clear-error="store.clearError()"
  >
    <template #title>
      <input
        :value="draft.name"
        :placeholder="t('cc.viewEdit.namePlaceholder', 'Name this characterization').value"
        :aria-label="t('columns.name', 'Name').value"
        class="char-builder__title-input"
        data-testid="char-builder-name"
        @input="(e: Event) => onDraftChange({ ...draft, name: (e.target as HTMLInputElement).value })"
      >
    </template>
    <template #subtitle>
      <input
        :value="draft.description ?? ''"
        :placeholder="t('cc.viewEdit.descriptionPlaceholder', 'Add a short description').value"
        :aria-label="t('columns.description', 'Description').value"
        class="char-builder__subtitle-input"
        data-testid="char-builder-description"
        @input="(e: Event) => onDraftChange({ ...draft, description: (e.target as HTMLInputElement).value })"
      >
    </template>
    <template #actions>
      <AtlasActionToolbar>
        <template #status>
          <AtlasTooltip
            :text="t('cc.fa.tabs.conceptSets', 'Concept Sets').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('cc.fa.tabs.conceptSets', 'Concept sets').value }"
                icon="mdi-shape"
                variant="text"
                size="sm"
                data-testid="char-builder-conceptsets-icon"
                @click="showConceptSetsDialog = true"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('cc.viewEdit.tabs.messages', 'Validation').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasBadge
                v-bind="tipProps"
                :color="validationBadge?.color || 'default'"
                :content="validationBadge?.count ?? 0"
                :model-value="!!validationBadge"
                offset-x="6"
                offset-y="6"
              >
                <AtlasIconButton
                  icon="mdi-message-text"
                  v-bind="{ ariaLabel: t('cc.viewEdit.tabs.messages', 'Validation messages').value }"
                  variant="text"
                  size="sm"
                  data-testid="char-builder-validation-icon"
                  @click="showValidationDialog = true"
                />
              </AtlasBadge>
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('cc.viewEdit.tabs.versions', 'Versions').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('cc.viewEdit.tabs.versions', 'Versions').value }"
                icon="mdi-history"
                variant="text"
                size="sm"
                :disabled="!isEditing"
                data-testid="char-builder-versions-icon"
                @click="showVersionsDialog = true"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            v-if="isEditing && draftId"
            :text="t('components.access.configureAccess', 'Configure access').value"
            location="bottom"
          >
            <template #activator="{ props: tooltipProps }">
              <EntityAccessLockButton
                v-bind="{ ...tooltipProps, ariaLabel: t('components.access.configureAccess', 'Configure access').value }"
                size="sm"
                data-testid="char-builder-access-icon"
                @click="showAccessDialog = true"
              />
            </template>
          </AtlasTooltip>
        </template>
        <template #actions>
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="char-builder-cancel"
            @click="handleBack"
          >
            <AtlasIcon class="d-md-none">
              mdi-close
            </AtlasIcon>
            <span class="d-none d-md-inline">{{ t('common.cancel', 'Cancel').value }}</span>
          </AtlasButton>
          <AtlasTooltip
            :text="t('common.import', 'Import design').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('common.import', 'Import design').value }"
                icon="mdi-upload"
                variant="text"
                size="sm"
                :loading="importing"
                data-testid="char-builder-import-icon"
                @click="handleImportClick"
              />
            </template>
          </AtlasTooltip>
          <AtlasTooltip
            :text="t('common.export', 'Export design').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: 'Export design' }"
                icon="mdi-download"
                variant="text"
                size="sm"
                :loading="exporting"
                :disabled="!isEditing || !canExport"
                data-testid="char-builder-export-icon"
                @click="handleExport"
              />
            </template>
          </AtlasTooltip>
          <input
            ref="importFileInput"
            type="file"
            accept="application/json,.json"
            :aria-label="t('views.characterizationBuilder.importInputAria', 'Import characterization design').value"
            style="display: none"
            data-testid="char-builder-import-input"
            @change="handleImportFileChange"
          >
          <AtlasTooltip
            :text="t('common.duplicate', 'Duplicate').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <AtlasIconButton
                v-bind="{ ...tipProps, ariaLabel: t('common.duplicate', 'Duplicate').value }"
                icon="mdi-content-copy"
                variant="text"
                size="sm"
                :disabled="!isEditing || loading || !canCopy"
                data-testid="char-builder-copy"
                @click="handleSaveCopy"
              />
            </template>
          </AtlasTooltip>
          <AtlasButton
            variant="ghost"
            tone="danger"
            icon="mdi-delete-outline"
            :disabled="!isEditing || loading || !canDelete"
            data-testid="char-builder-delete"
            @click="handleDeleteClick"
          >
            {{ t('common.delete', 'Delete') }}
          </AtlasButton>
          <DisabledReasonTooltip :reason="saveDisabledReason">
            <AtlasButton
              variant="primary"
              :disabled="!canSave"
              :loading="saving"
              data-testid="char-builder-save"
              @click="handleSave"
            >
              {{ t('common.save', 'Save') }}
            </AtlasButton>
          </DisabledReasonTooltip>
        </template>
      </AtlasActionToolbar>
    </template>

    <CharacterizationWorkbench
      :model-value="draft"
      :characterization-id="draftId"
      :available-cohorts="availableCohorts"
      :available-feature-analyses="availableFeatureAnalyses"
      data-testid="char-builder-workbench"
      @update:model-value="onDraftChange"
      @explore="onExplore"
      @snackbar="(msg, sev) => showSnackbar(msg, sev)"
    />

    <ExplorePrevalenceDialog
      v-model="exploreOpen"
      :stat="exploreStat"
    />

    <AtlasDialog
      v-model="showConceptSetsDialog"
      :eyebrow="t('cc.title', 'Characterization').value"
      :title="t('cc.fa.tabs.conceptSets', 'Concept Sets').value"
      :close-label="t('common.close', 'Close').value"
      max-width="1200"
      @close="showConceptSetsDialog = false"
    >
      <CharacterizationConceptSetsTab
        :characterization="draft"
        data-testid="char-builder-conceptsets-tab"
      />
    </AtlasDialog>

    <AtlasDialog
      v-model="showVersionsDialog"
      :eyebrow="t('cc.title', 'Characterization').value"
      :title="t('cc.viewEdit.tabs.versions', 'Versions').value"
      :close-label="t('common.close', 'Close').value"
      max-width="1000"
      @close="showVersionsDialog = false"
    >
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
    </AtlasDialog>

    <EntityAccessDialog
      v-model="showAccessDialog"
      entity-type="COHORT_CHARACTERIZATION"
      :entity-id="draftId"
      :title="t('components.access.configureAccess', 'Configure access').value"
      :subtitle="draft.name || undefined"
      @close="showAccessDialog = false"
    />

    <AtlasDialog
      v-model="showValidationDialog"
      :eyebrow="t('cc.title', 'Characterization').value"
      :title="t('cc.viewEdit.tabs.messages', 'Validation').value"
      :close-label="t('common.close', 'Close').value"
      max-width="800"
      @close="showValidationDialog = false"
    >
      <CharacterizationMessagesTab
        :characterization="draft"
        data-testid="char-builder-validation-tab"
      />
    </AtlasDialog>

    <AtlasDialog
      v-model="showDeleteDialog"
      eyebrow="CONFIRM"
      :title="t('common.delete', 'Delete').value"
      max-width="500"
      @close="showDeleteDialog = false"
    >
      {{ deleteMessage }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDeleteDialog = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          :loading="loading"
          data-testid="char-builder-delete-confirm"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasSnackbar
      v-model="snackbar.show"
      :severity="snackbar.severity"
      :text="snackbar.message"
      :timeout="snackbar.timeout"
      data-testid="char-builder-snackbar"
    />
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizationStore } from '@/stores/characterization'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { getCohorts } from '@/services/cohort-definition.service'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { exportCharacterization, importCharacterization } from '@/services/characterization.service'
import { logger } from '@/utils/logger'
import CharacterizationWorkbench from '@/components/characterization/CharacterizationWorkbench.vue'
import CharacterizationConceptSetsTab from '@/components/characterization/CharacterizationConceptSetsTab.vue'
import CharacterizationMessagesTab from '@/components/characterization/CharacterizationMessagesTab.vue'
import { EntityAccessDialog, EntityAccessLockButton } from '@/components/access'
import { AtlasButton, AtlasBadge, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasSnackbar, AtlasTooltip } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import ExplorePrevalenceDialog from '@/components/characterization-results/ExplorePrevalenceDialog.vue'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { resolveSaveDisabledReason } from '@/utils/save-disabled-reason'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'
import { validateCharacterization, countByLevel } from '@/utils/characterization-validators'
import type { CharacterizationDefinition, PrevalenceStat } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

const props = defineProps<{
  id?: string
}>()

const router = useRouter()
const { t, tv } = useI18n()
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
const showAccessDialog = ref<boolean>(false)
const showValidationDialog = ref<boolean>(false)
const importing = ref<boolean>(false)
const exporting = ref<boolean>(false)
const importFileInput = ref<HTMLInputElement | null>(null)

const availableCohorts = ref<CohortDefinitionSummary[]>([])
const availableFeatureAnalyses = ref<FeatureAnalysisListItem[]>([])

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

function showSnackbar(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.message = message
  snackbar.severity = color === 'error' ? 'danger' : color
  snackbar.timeout = color === 'error' ? 5000 : 3000
  snackbar.show = true
}

const exploreOpen = ref<boolean>(false)
const exploreStat = ref<PrevalenceStat | null>(null)

function onExplore(row: PrevalenceStat): void {
  exploreStat.value = row
  exploreOpen.value = true
}

// ---------------------------------------------------------------------------
// Computed helpers
// ---------------------------------------------------------------------------

const isEditing = computed<boolean>(() => Boolean(props.id))

const titleText = computed(() => {
  if (!isEditing.value) {
    return t('cc.new', 'New Characterization').value
  }
  const name = draft.value.name?.trim()
  if (name && name.length > 0) return name
  return t('configuration.tagManagement.edit', 'Edit Characterization').value
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

const saveDisabledReason = computed<string>(() =>
  resolveSaveDisabledReason({
    entity: tv('const.entityName.characterization', 'characterization'),
    isNew: !isEditing.value,
    hasName: draft.value.name.trim().length > 0,
    hasPermission: isEditing.value ? canWrite.value : hasPermission('create:cohort-characterization'),
    isSaving: saving.value || loading.value,
    translate: tv,
  })
)

const deleteMessage = computed<string>(() => {
  return t('cc.viewEdit.deleteConfirmation', `Delete characterization '${draft.value.name}'?`, {
    name: draft.value.name,
  }).value
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
    showSnackbar(t('components.nameValidation.empty', 'Name is required').value, 'error')
    return
  }

  if (hasValidationErrors.value) {
    showSnackbar(
      t('const.disabledReason.invalidDesign', 'Fix validation errors first.').value,
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
        showSnackbar(t('cc.fa.saveError', 'Failed to save characterization').value, 'error')
      }
    } else {
      const created = await store.create(draft.value)
      if (created?.id) {
        showSnackbar(
          t('characterizations.editor.saveSuccess', 'Characterization saved').value,
          'success'
        )
        // Unlike the update branch, there was previously no hydrateFrom() call
        // here, so draft.value.id (and therefore draftId/isEditing) stayed
        // null after the very first save. Generate stayed disabled forever
        // because its gate checks characterizationId == null (#223).
        hydrateFrom(created)
        await router.push(`/characterizations/${created.id}`)
      } else {
        showSnackbar(t('cc.fa.saveError', 'Failed to save characterization').value, 'error')
      }
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Save failed', err)
    showSnackbar(t('cc.fa.saveError', 'Failed to save characterization').value, 'error')
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
      showSnackbar(t('cc.fa.saveError', 'Failed to save characterization').value, 'error')
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Save Copy failed', err)
    showSnackbar(t('cc.fa.saveError', 'Failed to save characterization').value, 'error')
  } finally {
    saving.value = false
  }
}

const canExport = computed<boolean>(() => Boolean(draft.value.id))

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'design'
  )
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
  const result = await exportCharacterization(draft.value.id)
  if (result.success) {
    const json = JSON.stringify(result.data, null, 2)
    const filename = `characterization-${slugifyName(draft.value.name)}-${draft.value.id}.json`
    triggerDownload(filename, json)
  } else {
    logger.error('CharacterizationBuilder', 'Export failed', result.error)
    showSnackbar(
      t('characterizations.editor.utilities.export.exportError', 'Export failed.').value,
      'error'
    )
  }
  exporting.value = false
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
      t('characterizations.editor.utilities.import.parseError', 'Could not parse design JSON.')
        .value,
      'error'
    )
    importing.value = false
    return
  }

  const result = await importCharacterization(parsed)
  if (result.success) {
    store.markClean()
    showSnackbar(
      t('characterizations.editor.utilities.import.importSuccess', 'Imported successfully.').value,
      'success'
    )
    if (result.data.id != null) {
      await router.push(`/characterizations/${result.data.id}`)
    }
  } else {
    logger.error('CharacterizationBuilder', 'Import failed', result.error)
    showSnackbar(
      t('characterizations.editor.utilities.import.importError', 'Import failed.').value,
      'error'
    )
  }
  importing.value = false
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
    showSnackbar(t('cc.fa.saveError', 'Failed to save characterization').value, 'error')
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
  const result = await listFeatureAnalyses()
  if (result.success) {
    availableFeatureAnalyses.value = result.data
  } else {
    logger.error('CharacterizationBuilder', 'Failed to load feature analyses', result.error)
  }
}

// Which id this editor has already loaded ('' means the blank "new" draft,
// null means "nothing loaded yet"). Guards the watcher and onMounted from
// both fetching on first mount, and doubles as a race token below.
const loadedKey = ref<string | null>(null)

/**
 * Load (or reset) the editor for a given route id. Shared by onMounted and
 * the props.id watcher so both paths hydrate identically.
 */
async function loadForId(rawId: string | undefined): Promise<void> {
  const key = rawId ?? ''
  if (loadedKey.value === key) return
  loadedKey.value = key

  if (!rawId) {
    // :id -> new must not keep showing the previous design.
    store.clearCurrent()
    hydrateFrom(null)
    return
  }

  const numericId = Number(rawId)
  if (Number.isNaN(numericId)) {
    router.push('/characterizations')
    return
  }

  // Drop the previous entity up front so a slow fetch can never leave one
  // characterization's design rendered under another one's URL.
  store.clearCurrent()
  hydrateFrom(null)

  await store.fetchOne(numericId)
  // A newer navigation started while this fetch was in flight — it owns the
  // draft now, so discard this (stale) result.
  if (loadedKey.value !== key) return
  hydrateFrom(store.currentCharacterization)
}

// /characterizations/new and /characterizations/:id are two route records
// pointing at this one component, and <router-view/> is unkeyed, so Vue reuses
// the instance and onMounted does NOT re-run when import / save / duplicate
// navigate from `new` to a real id (nor when the id changes from one
// characterization to another). Without this watcher the draft stayed empty
// while the URL claimed an id — the "stuck on an empty page after Import"
// bug (OHDSI/Atlas3 #271, #272).
watch(
  () => props.id,
  newId => {
    void loadForId(newId)
  }
)

onMounted(async () => {
  // Load picker data once per editor mount.
  loadAvailableCohorts()
  loadAvailableFeatureAnalyses()

  await loadForId(props.id)
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

.char-builder__title-input {
  width: 100%;
  font-size: 26px;
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: 0.01em;
  color: rgb(var(--v-theme-primary));
  background: transparent;
  border: none;
  border-bottom: 1px dashed transparent;
  padding: 0 0 2px;
  margin: 0;
  font-family: inherit;
}
.char-builder__title-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
  font-weight: 300;
}
.char-builder__title-input:hover {
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.16);
}
.char-builder__title-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-bottom-color: rgb(var(--v-theme-orange));
}

.char-builder__subtitle-input {
  width: 100%;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
  background: transparent;
  border: none;
  border-bottom: 1px dashed transparent;
  padding: 0 0 2px;
  margin: 0;
  font-family: inherit;
}
.char-builder__subtitle-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.32);
}
.char-builder__subtitle-input:hover {
  border-bottom-color: rgba(var(--v-theme-on-surface), 0.12);
}
.char-builder__subtitle-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-bottom-color: rgb(var(--v-theme-orange));
}
</style>
