<template>
  <div class="cohort-builder">
    <!-- Breadcrumb Navigation (hidden when host view renders its own
         hero header — the eyebrow + title already convey location). -->
    <cohort-breadcrumb
      v-if="!hideInternalBreadcrumb"
      v-model="cohortName"
      :is-previewing-version="isPreviewingVersion"
      :preview-version="cohortStore.previewVersion?.version"
      @navigate-back="router.push('/cohorts')"
    />

    <!-- Quiet preview-mode banner — single line, tonal background,
         primary action right-aligned. Replaces the heavy v-alert. -->
    <div
      v-if="isPreviewingVersion"
      class="cohort-builder__preview-banner"
    >
      <AtlasIcon
        icon="mdi-history"
        size="18"
        class="cohort-builder__preview-banner-icon"
      />
      <span>{{
        t('versions.previewingVersion', { version: cohortStore.previewVersion?.version || '' })
      }}</span>
      <AtlasSpacer />
      <AtlasButton
        size="sm"
        icon="mdi-arrow-left"
        @click="handleBackToCurrent"
      >
        {{ t('common.backToCurrent', 'Back to current') }}
      </AtlasButton>
    </div>

    <CohortGenerationSection
      v-if="!loadError"
      :cohort-id="cohortId"
      :critical-count="criticalValidationCount"
      :validation-status="validationStatus"
      :is-dirty="hasUnsavedChanges"
    />

    <!-- Toolbar (status + actions) — hidden when the host view
         renders its own copy in the hero header. State stays here;
         exposed via defineExpose so the parent can wire it up. -->
    <div
      v-if="!hideInternalToolbar"
      class="cohort-builder__toolbar-row"
    >
      <AtlasActionToolbar>
        <template #status>
          <cohort-toolbar-status
            :total-concept-sets="expression.ConceptSets?.length ?? 0"
            :unused-concept-set-count="(expression.ConceptSets?.length ?? 0) - usedConceptSets.length"
            :validation-count="validationWarnings.length"
            :validation-color="highestSeverityColor"
            :is-validating="isValidating"
            :version-count="versionCount"
            :tag-count="tagCount"
            :cohort-id="cohortId"
            :is-previewing-version="isPreviewingVersion"
            @show-concept-sets="showConceptSetsDialog = true"
            @show-validation="showValidationDialog = true"
            @show-versions="showVersionsDialog = true"
            @show-tags="showTagsDialog = true"
            @show-access="showAccessDialog = true"
          />
        </template>
        <template #actions>
          <cohort-toolbar-actions
            :can-save="canSave"
            :is-dirty="hasUnsavedChanges"
            :is-previewing-version="isPreviewingVersion"
            @cancel="handleCancel"
            @save="handleSave"
            @export-download="handleExportDownload"
            @export-copy="handleExportCopy"
            @view-json="openJsonDialog"
          />
        </template>
      </AtlasActionToolbar>
    </div>

    <concept-sets-list-dialog
      v-model="showConceptSetsDialog"
      :concept-sets="expressionConceptSets"
      :used-concept-sets="usedConceptSets"
      @view="handleViewConceptSet"
      @delete="handleDeleteConceptSet"
    />

    <validation-messages-dialog
      v-model="showValidationDialog"
      :warnings="validationWarnings"
      :severity-color="highestSeverityColor"
    />

    <EntityAccessDialog
      v-model="showAccessDialog"
      entity-type="COHORT_DEFINITION"
      :entity-id="cohortId"
      :title="t('components.access.configureAccess', 'Configure access').value"
      :subtitle="cohortName || undefined"
      @close="showAccessDialog = false"
    />

    <cohort-json-dialog
      v-model="showJsonDialog"
      :json="jsonDialogSource"
      :filename="exportFilename()"
      :can-apply="!isPreviewingVersion"
      @apply="handleApplyJson"
    />

    <AtlasAlert
      v-if="loadError"
      class="cohort-builder__load-error"
      severity="danger"
      :title="loadError"
    >
      <template #actions>
        <AtlasButton
          size="sm"
          variant="ghost"
          @click="retryLoad"
        >
          {{ t('common.retry', 'Retry') }}
        </AtlasButton>
      </template>
    </AtlasAlert>

    <!-- Step rail: delegated to CohortExpressionEditor (Phase 4) -->
    <div
      v-else
      class="cohort-builder__steps"
    >
      <CohortExpressionEditor
        :expression="expression"
        :concept-sets="conceptSetOptions"
        @select-concept-set="onSelectConceptSet"
        @edit-concept-set="onSelectConceptSet"
        @clear-concept-set="handleClearConceptSet"
      />
    </div>
    <!-- /.cohort-builder__steps -->


    <!-- Concept Set Selection Dialog: in-definition (local) sets to reuse, plus
         the repository to import a copy from (#111). -->
    <concept-set-selection-dialog
      v-model="isConceptSetDialogOpen"
      :local-concept-sets="expressionConceptSets"
      @local-concept-set-selected="onLocalConceptSetSelected"
      @concept-set-selected="onConceptSetSelected"
      @edit-concept-set="handleEditConceptSet"
      @create-new="handleCreateNewConceptSet"
    />

    <!-- Concept Search Dialog (for single concept selection) -->
    <concept-search-dialog
      v-model="isConceptSearchDialogOpen"
      :domain-filter="selectedConceptDomainFilter"
      :pre-selected-concepts="currentlySelectedConcepts"
      @concepts-selected="handleConceptsSelected"
    />

    <!-- Concept Set Editor Side Panel (for editing/creating concept sets) -->
    <concept-set-editor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="
        value => {
          if (!value) {
            conceptSetsStore.closeEditor()
            cancelSelection()
          }
        }
      "
      @apply="handleConceptSetApplied"
    />

    <AtlasSnackbar
      v-model="showError"
      severity="danger"
      :text="errorMessage"
      :timeout="5000"
    />

    <AtlasSnackbar
      v-model="showSuccess"
      severity="success"
      :text="successMessage"
      :timeout="3000"
    />

    <!-- Loading Overlay -->
    <v-overlay
      v-model="isLoadingCohort"
      class="align-center justify-center"
      persistent
    >
      <AtlasProgressCircular
        indeterminate
        size="64"
        color="primary"
      />
      <div class="text-h6 mt-4">
        {{ t('common.loadingWithDots', 'Loading...') }}
      </div>
    </v-overlay>

    <AtlasDialog
      v-model="showVersionsDialog"
      eyebrow="VERSIONS"
      :title="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
      max-width="1200"
      @close="showVersionsDialog = false"
    >
      <versions-tab-content
        v-if="cohortId"
        :config="versionsConfig"
      />
    </AtlasDialog>

    <!-- Unsaved-changes confirmation dialog -->
    <AtlasDialog
      v-model="showUnsavedDialog"
      eyebrow="COHORT"
      :title="t('common.unsavedChanges', 'Unsaved changes').value"
      max-width="440"
      @close="cancelLeaveUnsaved"
    >
      {{
        t(
          'common.unsavedWarning',
          'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
        ).value
      }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="cancelLeaveUnsaved"
        >
          {{ t('common.cancel', 'Cancel').value }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          @click="confirmLeaveUnsaved"
        >
          {{ t('common.discard', 'Discard changes').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <!-- Concept-set delete confirmation, shown only when something still uses it -->
    <AtlasDialog
      v-model="showDeleteConceptSetDialog"
      eyebrow="CONCEPT SET"
      :title="t('components.cohortBuilder.deleteConceptSetTitle', 'Delete concept set?').value"
      max-width="480"
      @close="cancelDeleteConceptSet"
    >
      {{ deleteConceptSetWarning }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="cancelDeleteConceptSet"
        >
          {{ t('common.cancel', 'Cancel').value }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          data-testid="confirm-delete-concept-set"
          @click="confirmDeleteConceptSet"
        >
          {{ t('common.delete', 'Delete').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <!-- Tags Dialog -->
    <tag-selection-dialog
      v-model="showTagsDialog"
      :selected-tags="cohortTags"
      @update:selected-tags="handleTagsUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasIcon, AtlasProgressCircular, AtlasSnackbar, AtlasSpacer } from '@/components/ui'
import { ref, computed, onMounted, onBeforeUnmount, watch, toRef, toRaw } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { logger } from '@/utils/logger'
import { useCohortStore, type CohortDocument } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { provideCriteriaSelection, type CriteriaSelectionService } from '@/composables/useCriteriaSelection'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { useI18n } from '@/composables/useI18n'
import { useCohortValidation } from '@/composables/useCohortValidation'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { getCohortDefinition } from '@/services/cohort-definition.service'
import { getConceptSetById } from '@/services/concept-set.service'
import type { CohortDefinition, ConceptSetReference } from '@/models/cohort.types'
import type { Concept as SearchConcept, ConceptSetItem } from '@/models/concept-set.types'
import ConceptSetSelectionDialog from './ConceptSetSelectionDialog.vue'
import ConceptSearchDialog from './ConceptSearchDialog.vue'
import ConceptSetEditor from '../concepts/ConceptSetEditor.vue'
import CohortExpressionEditor from '@/components/cohort-editor/CohortExpressionEditor.vue'
import { CohortExpressionSchema, defaultExpression as blankExpression } from '@/models/circe-types'
import type { CohortExpression, Concept as CirceConcept, ConceptSetItem as CirceConceptSetItem } from '@/models/circe-types'
import { unassignConceptSetId, walkConceptSetReferences } from '@/components/cohort-editor/concept-set-usage'
import { normalizeForCirce } from '@/components/cohort-editor/normalize'
import { convertAtlasItemToCirce } from '@/components/cohort-editor/atlas-concept-set'
import CohortGenerationSection from './CohortGenerationSection.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import type { VersionsConfig, User } from '@/components/versions/types'
import { format, parseISO } from 'date-fns'
import * as cohortDefinitionVersionsService from '@/services/cohort-definition-versions.service'
import CohortBreadcrumb from './CohortBreadcrumb.vue'
import CohortToolbarActions from './CohortToolbarActions.vue'
import CohortToolbarStatus from './CohortToolbarStatus.vue'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'
import { nextConceptSetId } from '@/utils/concept-set-id'
import { normalizeInvalidReason } from '@/utils/api-mappers'
import ConceptSetsListDialog from './ConceptSetsListDialog.vue'
import CohortJsonDialog from './CohortJsonDialog.vue'
import ValidationMessagesDialog from './ValidationMessagesDialog.vue'
import TagSelectionDialog from '@/components/tags/TagSelectionDialog.vue'
import { EntityAccessDialog } from '@/components/access'
import type { Tag } from '@/models/cohort.types'

interface Props {
  id?: string
  /**
   * Suppresses the inner CohortBreadcrumb. The view above can render
   * its own hero header (eyebrow + title) and emit changes back into
   * here via `meta-change`, avoiding duplicate page chrome.
   */
  hideInternalBreadcrumb?: boolean
  /**
   * Optional outside-controlled name. When provided, the view's
   * inline-edit hero title can write the cohort name back into the
   * builder's local state.
   */
  name?: string
  /**
   * Optional outside-controlled description. Same pattern as `name`
   * — lets the view render an inline-edit subtitle that two-way
   * binds with the builder's local state.
   */
  description?: string
  /**
   * Suppresses the inner toolbar (status icons + Cancel/Generate/
   * Save). The host view renders the toolbar itself in the
   * page-shell hero header so it shares the title row. The builder
   * still owns the underlying state — see defineExpose at the
   * bottom of this script.
   */
  hideInternalToolbar?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:name': [name: string]
  'update:description': [description: string]
}>()

const router = useRouter()
const route = useRoute()
const cohortStore = useCohortStore()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()
const { t, tv } = useI18n()

// ── Core expression state (Phase 4) ──────────────────────────────────────────
// Single reactive CohortExpression replaces 10+ individual refs.
// Deep-cloned so the shared circe-types default is never mutated by an editing session.
function defaultExpression(): CohortExpression { return JSON.parse(JSON.stringify(blankExpression)) }
const expression = ref<CohortExpression>(defaultExpression())
const expressionRevision = ref(0)
const usedConceptSetsRevision = ref(0)

function markExpressionRevision() {
  expressionRevision.value++
}

function markUsedConceptSetsDirty() {
  usedConceptSetsRevision.value++
}

// The store hands out `currentCohort.expression` as the object itself, not this
// ref, so every wholesale swap (load, new-cohort signal, apply-JSON) has to
// refill the existing object rather than assign a new one to the ref.
function replaceExpression(next: CohortExpression) {
  const target = expression.value as Record<string, unknown>
  // The store hands definitions to the editor by installing them into this very
  // object, so `next` is regularly the document itself; clearing it first would
  // then delete the definition we were asked to install.
  if (toRaw(next) === toRaw(expression.value)) return
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, next)
  markExpressionRevision()
  markUsedConceptSetsDirty()
}

// The store holds a reference to this object for as long as the editor is
// mounted, so agent proposals and user edits meet in one document.
cohortStore.attachExpression(expression)
onBeforeUnmount(() => cohortStore.detachExpression(expression))

/** Map a Circe concept set item (nested UPPERCASE concept) → flat camelCase ConceptSetItem for the UI. */
function convertCirceItemToAtlas(item: CirceConceptSetItem): ConceptSetItem {
  const c = item.concept
  return {
    conceptId: c?.CONCEPT_ID ?? 0,
    conceptName: c?.CONCEPT_NAME ?? '',
    conceptCode: c?.CONCEPT_CODE ?? '',
    domainId: c?.DOMAIN_ID ?? '',
    vocabularyId: c?.VOCABULARY_ID ?? '',
    conceptClassId: c?.CONCEPT_CLASS_ID ?? '',
    standardConcept: c?.STANDARD_CONCEPT ?? null,
    invalidReason: normalizeInvalidReason(c?.INVALID_REASON),
    isExcluded: item.isExcluded ?? false,
    includeDescendants: item.includeDescendants ?? false,
    includeMapped: item.includeMapped ?? false,
  }
}

/** expressionConceptSets as ConceptSetReference[] for dialogs that need id+name+items */
const expressionConceptSets = computed<ConceptSetReference[]>(() =>
  (expression.value.ConceptSets ?? [])
    .filter(cs => cs.id !== undefined)
    .map(cs => ({
      id: cs.id!,
      name: cs.name ?? '',
      items: (cs.expression?.items ?? []).map(convertCirceItemToAtlas),
    }))
)

const {
    dialogOpen: isConceptSetDialogOpen,
    conceptSetOptions,
    onSelectConceptSet,
    onLocalConceptSetSelected,
    onConceptSetSelected,
    hideSelectionDialog,
    resolveSelection,
    cancelSelection,
  } = useCirceConceptSetPicker({
    getConceptSets: () => expression.value.ConceptSets ?? [],
    onConceptSetChanged: markUsedConceptSetsDirty,
    addConceptSet: (cs) => {
      if (!expression.value.ConceptSets) expression.value.ConceptSets = []
      expression.value.ConceptSets.push(cs)
    },
  })

// Core metadata state
const cohortName = ref('')
const cohortDescription = ref('')

// UI state
const showValidationDialog = ref(false)
const showConceptSetsDialog = ref(false)
const showVersionsDialog = ref(false)
const showTagsDialog = ref(false)
const showAccessDialog = ref(false)
const showJsonDialog = ref(false)
// Snapshot of the expression taken when the JSON dialog opens, so the
// editor is not re-seeded under the user while they type.
const jsonDialogSource = ref('')
const showUnsavedDialog = ref(false)
let pendingNavigation: (() => void) | null = null

// If we have an ID prop, start with loading=true to prevent UI from rendering before data loads
const isLoadingCohort = ref(!!props.id)
// Set when a fetch for props.id fails; the definition surface is replaced by
// the failure rather than by the last cohort that loaded successfully.
const loadError = ref<string | null>(null)
// Set to the id we just saved, so the props.id watcher can tell our own route
// adoption apart from a real navigation to another cohort.
const adoptedSavedId = ref<string | null>(null)
const isConceptSearchDialogOpen = ref(false)
const selectedConceptDomainFilter = ref<string | undefined>(undefined)
// ── Criteria selection service ────────────────────────────────────────────────
// ConceptArray.vue components at any depth request concepts through this
// service. Concept-set selection flows through useCirceConceptSetPicker so the
// dialog/request lifecycle stays centralized.
const pendingConceptsCallback = ref<((concepts: CirceConcept[]) => void) | null>(null)

// Named so it can be part of the defineExpose contract below: descendant
// components reach it via inject (useCriteriaSelection), but nothing in this
// shallow-mounted tree does, so tests exercise it through the same named
// object rather than reaching into Vue's private instance-provides field.
const criteriaSelectionService: CriteriaSelectionService = {
  requestConceptSet() {
    // not used by CohortExpressionEditor — concept-set events flow through the
    // centralized useCirceConceptSetPicker request lifecycle.
  },
  requestConcepts(domainFilter: string | undefined, onSelect: (concepts: CirceConcept[]) => void) {
    pendingConceptsCallback.value = onSelect
    selectedConceptDomainFilter.value = domainFilter
    isConceptSearchDialogOpen.value = true
  },
  editConceptSet(conceptSet: { id: number | string; name: string; items?: unknown[] }) {
    handleEditConceptSet(conceptSet)
  },
}
provideCriteriaSelection(criteriaSelectionService)

const showError = ref(false)
const errorMessage = ref('')
const showSuccess = ref(false)
const successMessage = ref('')
const isConfirmingNavigation = ref(false) // Flag to prevent double confirmation

// Snapshot of the loaded/saved state for change detection
const loadedSnapshot = ref<string | null>(null)

const cohortId = computed(() => (props.id ? Number(props.id) : null))

// Two-way sync with the parent's inline-edit name + description
// inputs. The check `incoming !== cohortName.value` is what
// prevents an infinite loop between props ↔ local state when
// both ends agree on the new value.
watch(
  () => props.name,
  incoming => {
    if (incoming !== undefined && incoming !== cohortName.value) {
      cohortName.value = incoming
    }
  }
)
watch(cohortName, val => {
  if (props.name !== undefined && val !== props.name) {
    emit('update:name', val)
  }
})
watch(
  () => props.description,
  incoming => {
    if (incoming !== undefined && incoming !== cohortDescription.value) {
      cohortDescription.value = incoming
    }
  }
)
watch(cohortDescription, val => {
  if (props.description !== undefined && val !== props.description) {
    emit('update:description', val)
  }
})

// Validation composable - handles validation state, warnings, and auto-validation
const {
  validationWarnings,
  isValidating,
  validationStatus,
  highestSeverityColor,
  groupedWarningsBySeverity,
  usedConceptSets,
  cancelValidation,
  resetValidation,
} = useCohortValidation({
  expression,
  expressionRevision,
  cohortName,
  cohortDescription,
  cohortId,
  usedConceptSetsRevision,
})

const criticalValidationCount = computed(() => groupedWarningsBySeverity.value.CRITICAL.length)

// Permission gating for save: a *new* cohort needs `create:cohort-definition`,
// editing an existing one needs write access on that specific entity (which
// canWrite already considers global write perms + ownership + per-entity
// grant). Save is hidden in version preview separately via isPreviewingVersion.
const { hasPermission } = usePermissions()
const { canWrite: canWriteCohort } = useEntityAccess('cohortDefinition', cohortId)
const canSavePermission = computed(() =>
  cohortId.value === null ? hasPermission('create:cohort-definition') : canWriteCohort.value
)

// Save is a *draft* save: a named cohort is savable even when its design is
// still incomplete (no entry events yet). Requiring an entry event here made
// the editor contradict itself — the dirty dot (hasUnsavedChanges) lights up
// as soon as the cohort has a name, while Save stayed disabled, so the user
// was told they had unsaved work with no way to save it (issue #262).
// Design completeness is not this gate's job: WebAPI validation surfaces it
// as warnings, and generation refuses an unsaved/invalid design on its own.
const canSave = computed(() => {
  return cohortName.value.trim().length > 0 && canSavePermission.value
})

// Preview mode state. A preview installed for another cohort survives until
// this editor loads its own definition, and the first render happens before
// that; without the id check the editor would flash read-only preview chrome —
// a blank cohort under "Previewing version 1" with Save disabled. Adopt a
// preview only when it belongs to the open cohort, the same check
// syncToStoreDefinition applies before it renders one.
const isPreviewingVersion = computed(() => {
  if (!cohortStore.previewVersion) return false
  return cohortId.value !== null && cohortStore.currentCohort?.id === cohortId.value
})

/**
 * Navigate back to the current version from a preview
 */
async function handleBackToCurrent(): Promise<void> {
  if (!cohortId.value) return

  // Vue Router does not re-run beforeEnter when only :version changes, so the
  // route's guard never sees this transition — clear the preview here instead.
  await cohortStore.clearPreviewVersion()

  await router.push({
    path: `/cohortdefinition/${cohortId.value}/version/current`,
  })
}

/**
 * Create a snapshot of the current cohort state for change detection
 */
// Reads the reactive `expression`, not toRaw(expression): stringifying the proxy
// walks every nested property and so registers a deep dependency. Without it the
// hasUnsavedChanges computed below caches forever and the navigation guards that
// depend on it never fire after an in-place criteria edit.
function createStateSnapshot(): string {
  return JSON.stringify({
    name: cohortName.value,
    description: cohortDescription.value,
    tags: cohortTags.value,
    expression: expression.value,
  })
}

const hasUnsavedChanges = computed(() => {
  if (!loadedSnapshot.value) {
    return cohortName.value.trim().length > 0 || (expression.value.PrimaryCriteria?.CriteriaList?.length ?? 0) > 0
  }
  return createStateSnapshot() !== loadedSnapshot.value
})

/** Pre-populated concept list for the concept search dialog (no-op in new flow) */
const currentlySelectedConcepts = computed(() => [])

// Versions configuration
const versionsConfig = computed<VersionsConfig>(() => {
  return {
    assetType: 'cohortdefinition',
    assetId: cohortId.value ?? 0,
    currentVersion: () => {
      const cohort = cohortStore.currentCohort
      if (!cohort) {
        return {
          version: -1,
          displayVersion: 'Current',
          assetId: 0,
          createdBy: { id: 0, name: 'Unknown' },
          createdDate: new Date().toISOString(),
          comment: null,
          archived: false,
          isCurrent: true,
          isPreviewing: false,
          formattedDate: '',
        }
      }

      const dateStr = cohort.modifiedDate || cohort.createdDate
      // Handle createdBy/modifiedBy which may be null or have different structure
      const userInfo = cohort.modifiedBy || cohort.createdBy
      const createdBy: User =
        userInfo && typeof userInfo === 'object' && 'name' in userInfo
          ? (userInfo as User)
          : { id: 0, name: 'Unknown' }

      return {
        version: -1,
        displayVersion: 'Current',
        assetId: cohort.id ?? 0,
        createdBy,
        createdDate:
          typeof dateStr === 'number'
            ? new Date(dateStr).toISOString()
            : dateStr || new Date().toISOString(),
        comment: null,
        archived: false,
        isCurrent: true,
        isPreviewing: false,
        formattedDate: dateStr
          ? format(typeof dateStr === 'number' ? new Date(dateStr) : parseISO(dateStr), 'PPpp')
          : '',
      }
    },
    previewVersion: toRef(cohortStore, 'previewVersion'),
    canEdit: computed(() => true), // TODO: Add actual permission check
    isDirty: toRef(cohortStore, 'isDirty'),
    clearPreview: () => cohortStore.clearPreviewVersion(),
  }
})

// Version count for badge display
const versionCount = ref(0)

// Load version count when cohort is loaded
watch(
  cohortId,
  async id => {
    if (id) {
      try {
        logger.debug('CohortBuilder', 'Fetching versions for cohort ID', id)
        const versions = await cohortDefinitionVersionsService.getVersions(id)
        logger.debug('CohortBuilder', 'Retrieved versions', versions)
        versionCount.value = versions.length
        logger.debug('CohortBuilder', 'Version count set to', versionCount.value)
      } catch (err) {
        logger.error('CohortBuilder', 'Failed to load version count', err)
        versionCount.value = 0
      }
    } else {
      versionCount.value = 0
    }
  },
  { immediate: true }
)

// The host bridge asks the mounted editor to run its full WebAPI save flow.
// Always answer the signal — handleSave no-ops when nothing is savable — so the
// bridge's awaited requestSave() resolves either way.
watch(
  () => cohortStore.saveRequest,
  async () => {
    const opts = cohortStore.saveOptions
    if (opts?.name) cohortName.value = opts.name
    if (opts?.description) cohortDescription.value = opts.description
    let saved: { id?: number; name?: string } = {}
    try {
      saved = (await handleSave()) ?? {}
    } finally {
      cohortStore.notifySaved(saved)
    }
  }
)

// Reset to a blank cohort in place when the new-cohort signal fires. The
// expression is already blank: createNewCohort clears the attached document
// synchronously, before any proposal the caller applies after requesting it.
watch(
  () => cohortStore.newCohortSignal,
  () => {
    cancelValidation()
    cohortName.value = ''
    cohortDescription.value = ''
    loadedTags.value = []
    loadedSnapshot.value = null
  }
)

// Tags
const cohortTags = computed(() => cohortStore.currentCohort?.tags || [])
const tagCount = computed(() => cohortTags.value.length)
const loadedTags = ref<Tag[]>([])

function handleTagsUpdate(newTags: Tag[]) {
  if (cohortStore.currentCohort) {
    cohortStore.currentCohort.tags = newTags
    cohortStore.markDirty()
  }
}

onMounted(async () => {
  // Start loading cohort definition immediately (don't await)
  if (props.id) {
    // A bookmarked version URL previews before we mount: the store already holds
    // the historical definition, and fetching the current one would clobber it.
    syncToStoreDefinition()
  } else {
    const restored = cohortStore.restoreFromDraft()
    if (!restored) {
      // If pythia (or any other code path) has already populated
      // currentCohort with actual content right before navigating us to
      // /cohorts/new, don't clobber it. Only initialise a fresh blank
      // cohort when there's truly nothing to preserve. Content means an
      // expression: a leftover name is not content, it is the previous
      // editing session's metadata, which detachExpression deliberately
      // leaves behind for pythiaBridge to navigate back by id.
      const existing = cohortStore.currentCohort
      const hasContent =
        existing != null &&
        ((existing.expression?.PrimaryCriteria?.CriteriaList?.length ?? 0) > 0 ||
          (existing.expression?.InclusionRules?.length ?? 0) > 0 ||
          (existing.expression?.ConceptSets?.length ?? 0) > 0)
      if (hasContent) {
        // The content is new but the identity is not. Left in place, the
        // previous cohort's name and tags render over a blank editor and
        // handleSave assigns every one of those tags to the cohort it
        // creates, because loadedTags starts empty.
        existing.id = undefined
        existing.name = 'New Cohort'
        existing.description = ''
        existing.tags = []
      } else {
        cohortStore.createNewCohort()
      }
    }
    loadedTags.value = []
    // Set name from query param if provided (from New Cohort dialog)
    if (route.query.name && typeof route.query.name === 'string') {
      cohortName.value = route.query.name
    }
    markExpressionRevision()
  }

  // Load resources in parallel in the background (don't block rendering)
  Promise.all([
    // Load all concept sets from the API so user can select any system concept set
    conceptSetsStore.fetchAll(),
    // Load CDM sources for generation
    webapiStore.fetchSources(),
  ])

  // Add beforeunload handler to warn when closing tab/window with unsaved changes
  window.addEventListener('beforeunload', handleBeforeUnload)

  cohortStore.startAutoSave()
})

// Navigation guard to prevent losing unsaved changes. The confirm
// step opens a styled v-dialog instead of the native window.confirm.
// We can't keep `next` around and call it after the user confirms —
// `next(false)` permanently aborts the original navigation. Instead we
// remember the target route and re-push it via router.push once
// confirmLeaveUnsaved fires.
let navigationConfirmed = false
onBeforeRouteLeave((to, _from, next) => {
  if (!hasUnsavedChanges.value || navigationConfirmed) {
    navigationConfirmed = false
    next()
    return
  }

  if (isConfirmingNavigation.value) {
    next(false)
    return
  }

  isConfirmingNavigation.value = true
  pendingNavigation = () => {
    navigationConfirmed = true
    isConfirmingNavigation.value = false
    router.push(to.fullPath)
  }
  showUnsavedDialog.value = true
  next(false)
})

function confirmLeaveUnsaved() {
  showUnsavedDialog.value = false
  const resume = pendingNavigation
  pendingNavigation = null
  if (resume) resume()
}

function cancelLeaveUnsaved() {
  showUnsavedDialog.value = false
  pendingNavigation = null
  isConfirmingNavigation.value = false
}

// Browser beforeunload handler to warn when closing tab/window with unsaved changes
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    // Modern browsers require returnValue to be set
    event.returnValue = ''
    return ''
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  // Stop timers to prevent memory leaks
  cohortStore.stopAutoSave()
  cohortStore.cancelRetry()
})

// Adopting the id of the cohort we just saved must not re-run loadCohort. That
// fetch is async, so anything added while it was in flight (an accepted agent
// proposal, the user's next edit) is silently overwritten when it resolves, and
// the next save then persists the stale definition. That cost a full phenotype
// once — observation window and four inclusion rules accepted on screen, none of
// them in the saved cohort.
watch(
  () => props.id,
  newId => {
    if (!newId) return
    if (adoptedSavedId.value !== null && adoptedSavedId.value === String(newId)) {
      adoptedSavedId.value = null
      return
    }
    isLoadingCohort.value = true
    syncToStoreDefinition()
  }
)

// Watch for changes to cohort definition and rebuild expression with concept set items
// (removed in Phase 4 — useCohortValidation now watches expression directly)

// A failed load must take the previous cohort's definition off screen with it:
// the header already names the cohort we failed to fetch, so leaving the last
// one rendered attributes its criteria to a cohort that never had them.
function failLoad(message: string) {
  resetValidation()
  loadError.value = message
  errorMessage.value = message
  showError.value = true
  replaceExpression(defaultExpression())
  cohortName.value = ''
  cohortDescription.value = ''
  loadedTags.value = []
  loadedSnapshot.value = null
  cohortStore.clearCohort()
  isLoadingCohort.value = false
}

function retryLoad() {
  syncToStoreDefinition()
}

// Loads are async and un-awaited by their callers, so responses can land out of
// order. Since a failure now blanks the editor, a superseded one arriving last
// would erase a cohort that loaded fine — a slow 404 followed by a route change,
// or a second Retry click. Only the newest request may write.
let latestLoadToken = 0

async function loadCohort(id: string) {
  const loadToken = ++latestLoadToken
  isLoadingCohort.value = true
  loadError.value = null
  try {
    const numericId = parseInt(id, 10)
    const atlasCohortResult = await getCohortDefinition(numericId)
    if (loadToken !== latestLoadToken) return

    if (!atlasCohortResult.success) {
      logger.error('CohortBuilder', `Failed to load cohort ${id}`, atlasCohortResult.error)
      failLoad(
        atlasCohortResult.error.status === 422
          ? tv('components.cohortBuilder.parseError', 'Failed to parse cohort definition')
          : tv('components.cohortBuilder.loadError', 'Failed to load cohort')
      )
      return
    }

    const atlasCohort = atlasCohortResult.data
    if (atlasCohort.expressionType && atlasCohort.expressionType !== 'SIMPLE_EXPRESSION') {
      logger.error('CohortBuilder', `Unsupported expression type: ${atlasCohort.expressionType}`)
      failLoad(tv('components.cohortBuilder.loadError', 'Failed to load cohort'))
      return
    }

    // The service already parsed and validated the expression at the API boundary.
    // Minimal store update — include expression so pythiaBridge and agent proposals
    // can read structure (entryEventCount, inclusionRuleCount, etc.) without re-parsing.
    const cohortDef: CohortDefinition = {
      id: atlasCohort.id,
      name: atlasCohort.name ?? '',
      description: atlasCohort.description || '',
      tags: atlasCohort.tags || [],
      expression: atlasCohort.expression,
    }
    cohortStore.setCohort(cohortDef)
    cohortStore.markClean()

    applyDefinition(cohortDef)
  } catch (error) {
    logger.error('CohortBuilder', `Error loading cohort ${id}`, error)
    if (loadToken !== latestLoadToken) return
    failLoad(tv('components.cohortBuilder.loadError', 'Failed to load cohort'))
  }
}

// The one place a whole definition reaches the editor, whether it came from the
// current-version fetch above or from a version preview the store already holds.
function applyDefinition(def: CohortDocument) {
  resetValidation()
  loadError.value = null
  replaceExpression(def.expression ?? defaultExpression())
  cohortName.value = def.name ?? ''
  cohortDescription.value = def.description || ''
  loadedTags.value = [...(def.tags || [])]
  loadedSnapshot.value = createStateSnapshot()
  markExpressionRevision()
  isLoadingCohort.value = false
}

// A preview keeps the same :id, so neither onMounted nor the props.id watcher
// re-runs; reloadRequest is the store's signal that the definition changed
// underneath us — entering a preview, or leaving one for the current version.
// A preview may belong to a cohort other than the one we are editing; adopt it
// only when the ids agree, and end it otherwise. Ending it here rather than on
// unmount is what the sibling stores do (pathway.loadPathway,
// incidenceRate.createNewIR) and is the only safe moment: the version route's
// beforeEnter installs the preview *before* the outgoing editor unmounts, so an
// unmount hook would throw away the preview the guard had just loaded.
function syncToStoreDefinition() {
  if (!props.id) return

  const previewed = cohortStore.currentCohort
  if (cohortStore.previewVersion && previewed?.id === Number(props.id)) {
    latestLoadToken++
    applyDefinition(previewed)
  } else {
    cohortStore.discardPreview()
    loadCohort(props.id)
  }
}

watch(() => cohortStore.reloadRequest, syncToStoreDefinition)

function handleConceptsSelected(
  concepts: SearchConcept[]
) {
  if (concepts.length === 0 || !pendingConceptsCallback.value) {
    isConceptSearchDialogOpen.value = false
    pendingConceptsCallback.value = null
    return
  }

  // Convert camelCase concepts to UPPERCASE Circe format
  const convertedConcepts: CirceConcept[] = concepts.map(c => ({
    CONCEPT_ID: c.conceptId,
    CONCEPT_NAME: c.conceptName,
    STANDARD_CONCEPT_CAPTION: c.standardConcept === 'S' ? 'Standard' : c.standardConcept === 'C' ? 'Classification' : '',
    INVALID_REASON_CAPTION: c.invalidReason ?? '',
    CONCEPT_CODE: c.conceptCode,
    DOMAIN_ID: c.domainId,
    VOCABULARY_ID: c.vocabularyId,
    CONCEPT_CLASS_ID: c.conceptClassId,
    VALID_START_DATE: '',
    VALID_END_DATE: '',
    STANDARD_CONCEPT: c.standardConcept,
    INVALID_REASON: c.invalidReason,
  }))

  const callback = pendingConceptsCallback.value
  pendingConceptsCallback.value = null
  callback(convertedConcepts)
  isConceptSearchDialogOpen.value = false
}
/**
 * Called when user clicks "Edit" on a concept set (from chip or dialog)
 */
async function handleEditConceptSet(conceptSet: {
  id: number | string
  name: string
  items?: unknown[]
}) {
  hideSelectionDialog()
  conceptSetsStore.openEmbeddedEditor({
    id: conceptSet.id,
    name: conceptSet.name,
    items: (conceptSet.items || []) as ConceptSetItem[],
  })
}

/**
 * Open concept set editor from the concept sets dialog
 */
function handleViewConceptSet(conceptSet: {
  id: number | string
  name: string
  items?: unknown[]
}) {
  showConceptSetsDialog.value = false
  handleEditConceptSet(conceptSet)
}

// Deleting a concept set clears every CodesetId pointing at it, and a criterion
// with no CodesetId matches its whole domain rather than nothing — so a delete
// can quietly widen the cohort instead of narrowing it. It can also leave
// EndStrategy.CustomEra with no DrugCodesetId at all. The dialog emitted delete
// straight through, so neither consequence was ever shown. Anything still
// referencing the set now has to be confirmed first.
const conceptSetPendingDelete = ref<ConceptSetReference | null>(null)
const conceptSetPendingDeleteUsage = ref(0)
const showDeleteConceptSetDialog = ref(false)

function handleDeleteConceptSet(conceptSet: ConceptSetReference) {
  if (conceptSet.id === undefined || conceptSet.id === null) return

  const usage = countConceptSetReferences(conceptSet.id as number)
  if (usage === 0) {
    deleteConceptSet(conceptSet)
    return
  }

  conceptSetPendingDelete.value = conceptSet
  conceptSetPendingDeleteUsage.value = usage
  showDeleteConceptSetDialog.value = true
}

/** How many criteria fields currently point at this concept set. */
function countConceptSetReferences(conceptSetId: number): number {
  let count = 0
  walkConceptSetReferences(expression.value, {
    raw: (container, key) => {
      if (container[key] === conceptSetId) count++
    },
    wrapped: selection => {
      if (selection.CodesetId === conceptSetId) count++
    },
  })
  return count
}

function confirmDeleteConceptSet() {
  const conceptSet = conceptSetPendingDelete.value
  showDeleteConceptSetDialog.value = false
  conceptSetPendingDelete.value = null
  if (conceptSet) deleteConceptSet(conceptSet)
}

function cancelDeleteConceptSet() {
  showDeleteConceptSetDialog.value = false
  conceptSetPendingDelete.value = null
}

// Names the consequence rather than asking "are you sure": an unconstrained
// criterion matches everything in its domain, which is the opposite of what
// deleting a concept set looks like it should do.
const deleteConceptSetWarning = computed(() => {
  const name = conceptSetPendingDelete.value?.name ?? ''
  const count = conceptSetPendingDeleteUsage.value
  const usage =
    count === 1
      ? t('components.cohortBuilder.deleteConceptSetUsageOne', '1 criterion still uses it').value
      : t('components.cohortBuilder.deleteConceptSetUsageMany', '{count} criteria still use it', {
          count,
        }).value

  return t(
    'components.cohortBuilder.deleteConceptSetWarning',
    'Deleting "{name}" will clear it from those criteria, and a criterion with no concept set matches its entire domain. {usage}.',
    { name, usage }
  ).value
})

/**
 * Delete a concept set from the cohort expression
 */
function deleteConceptSet(conceptSet: ConceptSetReference) {
  const idx = (expression.value.ConceptSets ?? []).findIndex(cs => cs.id === conceptSet.id)
  if (idx !== -1) {
    expression.value.ConceptSets!.splice(idx, 1)
  }
  unassignConceptSetId(expression.value, conceptSet.id as number)
  markUsedConceptSetsDirty()
}

function handleClearConceptSet() {
  cancelSelection()
  markUsedConceptSetsDirty()
}

/**
 * Called when user clicks "Create New" in the dialog
 */
function handleCreateNewConceptSet() {
  hideSelectionDialog()
  conceptSetsStore.openCreateEditor()
}

/**
 * Called when the embedded editor applies its changes. Upserts the concept set
 * into expression.ConceptSets and resolves the active selection request when
 * the editor was opened from a concept-set selection flow.
 */
function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const items = JSON.parse(JSON.stringify(set.items ?? [])) as ConceptSetItem[]

  const finalId = set.id === undefined || set.id === null
    ? nextConceptSetId((expression.value.ConceptSets ?? []).filter(cs => cs.id !== undefined) as Pick<ConceptSetReference, 'id'>[])
    : (set.id as number)

  // Upserts unconditionally, including on a pure rename with no active
  // selection context. That is what develop's #212 fix restored on the legacy
  // model by calling upsertConceptSetInCohort outside the context check; here
  // the expression's ConceptSets array is the single canonical list, so
  // replacing the entry in place covers the same case.
  if (!expression.value.ConceptSets) expression.value.ConceptSets = []
  const existingIdx = expression.value.ConceptSets.findIndex(cs => cs.id === finalId)
  const circeItems = items.map(convertAtlasItemToCirce)
  if (existingIdx !== -1) {
    expression.value.ConceptSets[existingIdx] = { id: finalId, name: set.name, expression: { items: circeItems } }
  } else {
    expression.value.ConceptSets.push({ id: finalId, name: set.name, expression: { items: circeItems } })
  }

  markUsedConceptSetsDirty()

  resolveSelection(finalId)
}

async function handleSave(): Promise<{ id?: number; name?: string }> {
  if (!canSave.value) return {}

  const { saveCohortDefinition, assignTagToCohort, unassignTagFromCohort } = await import(
    '@/services/cohort-definition.service'
  )

  // Deep copy plus the circe fields the sparse editor document leaves unset
  // (group Type/Count, a range operator alongside a bound). Live state is not
  // mutated, so the editor stays sparse and the cohort stays undirtied.
  const expressionForSave = normalizeForCirce(toRaw(expression.value))

  // Hydrate concept set items from API for any sets that lack them
  if (expressionForSave.ConceptSets) {
    expressionForSave.ConceptSets = await Promise.all(
      expressionForSave.ConceptSets.map(async cs => {
        if (cs.expression?.items) return cs
        if (typeof cs.id === 'number') {
          const fullCs = await getConceptSetById(cs.id)
          if (fullCs?.items) {
            return { ...cs, expression: { items: fullCs.items.map(convertAtlasItemToCirce) } }
          }
        }
        return cs
      })
    )
  }

  const atlasDefinition = {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    expressionType: 'SIMPLE_EXPRESSION',
    expression: expressionForSave,
  }

  try {
    const savedCohortResult = await saveCohortDefinition(atlasDefinition)

    if (!savedCohortResult.success) {
      errorMessage.value = tv('components.cohortBuilder.saveToServerError', 'Failed to save cohort to server')
      showError.value = true
      return {}
    }

    const savedCohort = savedCohortResult.data
    const savedId = savedCohort.id

    if (savedId === undefined) {
      errorMessage.value = tv('components.cohortBuilder.saveToServerError', 'Failed to save cohort to server')
      showError.value = true
      return {}
    }

    // Sync tags via separate API calls
    const currentTags = cohortTags.value
    const previousTags = loadedTags.value
    const tagsToAdd = currentTags.filter(cur => !previousTags.some(p => p.id === cur.id))
    const tagsToRemove = previousTags.filter(p => !currentTags.some(cur => cur.id === p.id))
    const tagFailures: string[] = []

    // The tag calls are independent of each other, so they go out together:
    // awaiting them one at a time cost a round-trip per changed tag.
    const tagSyncs = [
      ...tagsToAdd.map(tag => ({ tag, action: 'assign' as const })),
      ...tagsToRemove.map(tag => ({ tag, action: 'unassign' as const })),
    ].filter(sync => sync.tag.id !== undefined)

    const outcomes = await Promise.allSettled(
      tagSyncs.map(async ({ tag, action }) => ({
        tag,
        action,
        result:
          action === 'assign'
            ? await assignTagToCohort(savedId, tag.id!)
            : await unassignTagFromCohort(savedId, tag.id!),
      }))
    )

    for (const outcome of outcomes) {
      // A rejection is a transport failure, not a per-tag one: rethrow so the
      // save's own catch reports it, as it did when these were awaited inline.
      if (outcome.status === 'rejected') throw outcome.reason
      const { tag, action, result } = outcome.value
      if (result.success) continue
      logger.warn('CohortBuilder', `Failed to ${action} tag ${tag.id}`, result.error)
      tagFailures.push(result.error.message || `Failed to ${action} tag "${tag.name}"`)
    }

    if (tagFailures.length > 0) {
      errorMessage.value = tagFailures.join('; ')
      showError.value = true
    }

    loadedTags.value = [...currentTags]

    // No expression: the store already references the live document, and
    // handing it the save-time clone would replace what the user sees with a
    // snapshot taken before the request went out.
    cohortStore.setCohort({
      id: savedCohort.id,
      name: cohortName.value,
      description: cohortDescription.value || '',
      tags: cohortTags.value,
    })
    cohortStore.markClean()
    cohortStore.clearDraft()
    loadedSnapshot.value = createStateSnapshot()
    markExpressionRevision()

    successMessage.value = tv('components.cohortBuilder.saveSuccess', 'Cohort saved successfully')
    showSuccess.value = true

    // Adopt the new id in the route. `cohortId` is derived from props.id, so a
    // cohort saved from /cohorts/new stayed id-less in the editor: the
    // Generation panel kept offering "Save cohort to generate", the versions
    // panel stayed disabled, and a second Save created a duplicate cohort.
    // Navigation must never fail the save — the cohort is already persisted.
    if (!props.id) {
      adoptedSavedId.value = String(savedId)
      try {
        await router.replace(`/cohorts/${savedId}`)
      } catch (navErr) {
        adoptedSavedId.value = null
        logger.warn('CohortBuilder', 'Saved, but could not open the saved cohort', navErr)
      }
    }
    return { id: savedCohort.id, name: cohortName.value }
  } catch (error) {
    logger.error('CohortBuilder', 'Failed to save cohort', error)
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.cohortBuilder.saveError', 'Failed to save cohort')
    showError.value = true
    return {}
  }
}

function handleCancel() {
  cohortStore.clearDraft()
  router.push('/cohorts')
}

// Atlas JSON Import/Export

/**
 * Apply JSON edited in the JSON dialog.
 */
async function handleApplyJson(json: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    errorMessage.value = tv('components.cohortBuilder.jsonInvalidExpression', 'Not a valid Atlas cohort expression')
    showError.value = true
    return
  }

  const result = CohortExpressionSchema.safeParse(parsed)
  if (!result.success) {
    errorMessage.value = tv('components.cohortBuilder.jsonImportFailed', 'Import failed: {error}', {
      error: result.error.issues[0]?.message ?? 'Invalid expression',
    })
    showError.value = true
    return
  }

  cancelValidation()
  replaceExpression(result.data)

  showJsonDialog.value = false
  successMessage.value = tv(
    'components.cohortBuilder.jsonApplied',
    'Cohort JSON applied — review the builder, then save'
  )
  showSuccess.value = true
}

function exportFilename(): string {
  const slug = cohortName.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cohort'
  return `${slug}_cohort.json`
}

// Export goes through the same normalization as save: what the user copies,
// downloads or reads in the JSON dialog is what would reach the server, rather
// than the sparser in-editor form that circe-be would reject.
function exportableExpression(): string {
  return JSON.stringify(normalizeForCirce(toRaw(expression.value)), null, 2)
}

/**
 * Open the JSON dialog seeded with the current expression.
 */
function openJsonDialog() {
  jsonDialogSource.value = exportableExpression()
  showJsonDialog.value = true
}

function handleExportDownload() {
  const json = exportableExpression()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFilename()
  a.click()
  URL.revokeObjectURL(url)
  successMessage.value = tv('components.cohortBuilder.exportDownloaded', 'Cohort JSON downloaded')
  showSuccess.value = true
}

async function handleExportCopy() {
  const json = exportableExpression()
  try {
    await navigator.clipboard.writeText(json)
    successMessage.value = tv(
      'components.cohortBuilder.copiedToClipboard',
      'Cohort JSON copied to clipboard'
    )
    showSuccess.value = true
  } catch (err) {
    logger.error('CohortBuilder', 'Clipboard copy failed', err)
    errorMessage.value = tv('components.cohortBuilder.copyFailed', 'Could not copy to clipboard')
    showError.value = true
  }
}

// Helper for planned generation feature, not yet wired into the template,
// but exposed below so the contract that will drive it can be verified now.
function _getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETE':
      return 'success'
    case 'FAILED':
      return 'error'
    case 'RUNNING':
      return 'primary'
    case 'PENDING':
      return 'warning'
    default:
      return 'grey'
  }
}

// Helper for planned generation feature, not yet wired into the template,
// but exposed below so the contract that will drive it can be verified now.
function _getStatusIcon(status: string): string {
  switch (status) {
    case 'COMPLETE':
      return 'mdi-check-circle'
    case 'FAILED':
      return 'mdi-alert-circle'
    case 'RUNNING':
      return 'mdi-loading mdi-spin'
    case 'PENDING':
      return 'mdi-clock-outline'
    default:
      return 'mdi-help-circle'
  }
}

// Helper for planned generation feature, not yet wired into the template,
// but exposed below so the contract that will drive it can be verified now.
function _getStatusText(status: string): string {
  switch (status) {
    case 'COMPLETE':
      return 'Complete'
    case 'FAILED':
      return 'Failed'
    case 'RUNNING':
      return 'Generating...'
    case 'PENDING':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

// Expose state + actions so the host view can render its own
// toolbar in the hero header (with hide-internal-toolbar). The
// proxy returned by defineExpose auto-unwraps refs at access
// time, so a parent reading `builderRef.canSave` gets a number.
defineExpose({
  // Status state
  totalConceptSets: computed(() => expression.value.ConceptSets?.length || 0),
  unusedConceptSetCount: computed(() => (expression.value.ConceptSets?.length || 0) - usedConceptSets.value.length),
  validationCount: computed(() => validationWarnings.value.length),
  validationColor: computed(() => highestSeverityColor.value),
  isValidating,
  versionCount,
  tagCount,
  cohortId,
  isPreviewingVersion,
  // Actions state
  canSave,
  hasUnsavedChanges,
  // Methods invoked by toolbar buttons
  openConceptSetsDialog: () => {
    showConceptSetsDialog.value = true
  },
  openValidationDialog: () => {
    showValidationDialog.value = true
  },
  openVersionsDialog: () => {
    showVersionsDialog.value = true
  },
  openTagsDialog: () => {
    showTagsDialog.value = true
  },
  openAccessDialog: () => {
    showAccessDialog.value = true
  },
  handleCancel,
  handleSave,
  handleExportDownload,
  handleExportCopy,
  openJsonDialog,
  // Test-support contract: routing/UI state and pure helpers that have no
  // child component to observe or drive them through. Named here instead of
  // reached via Vue's private `$.setupState`/`$.provides`, so a rename shows
  // up as a compile error in this file rather than a silent test break.
  cohortName,
  cohortDescription,
  pendingConceptsCallback,
  loadedTags,
  loadedSnapshot,
  isConfirmingNavigation,
  showUnsavedDialog,
  errorMessage,
  successMessage,
  showError,
  showSuccess,
  criteriaSelectionService,
  exportFilename,
  createStateSnapshot,
  confirmLeaveUnsaved,
  cancelLeaveUnsaved,
  handleBackToCurrent,
  versionsConfig,
  _getStatusColor,
  _getStatusIcon,
  _getStatusText,
  // Existing expose (criteria editor / inclusion panel) is
  // re-declared here because defineExpose may only be called
  // once per component.
})
</script>

<style scoped>
.cohort-builder {
  max-width: 1400px;
  margin: 0 auto;
}

/* Breadcrumb Navigation */
.cohort-builder__breadcrumb {
  padding: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.cohort-builder__breadcrumb-item {
  color: #666;
}

.cohort-builder__breadcrumb-item--link {
  cursor: pointer;
  transition: color 0.2s;
}

.cohort-builder__breadcrumb-item--link:hover {
  color: #1f425a;
  text-decoration: underline;
}

.cohort-builder__breadcrumb-item--active {
  color: #1f425a;
  font-weight: 500;
}

.cohort-builder__breadcrumb-separator {
  margin: 0 8px;
  color: #999;
}

.cohort-builder__breadcrumb-edit-icon {
  margin-left: 8px;
  color: #666;
  cursor: pointer;
  transition:
    color 0.2s,
    transform 0.2s;
  opacity: 0.7;
}

.cohort-builder__breadcrumb-edit-icon:hover {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  transform: scale(1.1);
}

/* Cohort top toolbar lives on a flush page row. Push the action-toolbar
 * (status + divider + buttons) to the right; the page itself owns the
 * outer alignment, not the toolbar component. */
.cohort-builder__toolbar-row {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 8px;
}

.cohort-builder__cohort-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cohort-builder__cohort-name,
.cohort-builder__cohort-description {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.cohort-builder__label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.cohort-builder__name-display {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.cohort-builder__name-input,
.cohort-builder__description-input {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  border: 1px solid #e0e0e0;
  background: white;
  padding: 6px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  min-width: 250px;
  flex: 1;
}

.cohort-builder__name-input:focus-visible,
.cohort-builder__description-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.cohort-builder__description-input {
  font-weight: 400;
  font-size: 14px;
}

.cohort-builder__name-input:hover,
.cohort-builder__description-input:hover {
  border-color: #1f425a;
}

.cohort-builder__name-input:focus,
.cohort-builder__description-input:focus {
  border-color: #1f425a;
  box-shadow: 0 0 0 2px rgba(31, 66, 90, 0.1);
}

.cohort-builder__patient-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cohort-builder__count {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.gap-3 {
  gap: 12px;
}

.gap-2 {
  gap: 8px;
}

/* Section Layout — uses the SurfaceCard "elevated" pattern: white
 * surface, 12px radius, soft two-pass shadow. Replaces the bespoke
 * border + heavier drop shadow. */
.section-wrapper {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.08),
    0 8px 24px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px 6px;
  min-height: 44px;
  /* Lighter chrome — drop the explicit bottom border. The card's
   * own elevation already separates header from body. */
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.01em;
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.section-controls__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.section-controls__help {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.6;
  cursor: help;
}
.section-controls__help:hover {
  opacity: 1;
}

/* ============================================================
 * Step rail — connects the four sections as a logical pipeline
 * (entry → inclusion → exit → era). Each step is a flex row with
 * a numbered badge on the left and the section card on the right.
 * The badges live OUTSIDE the section card (which has overflow:
 * hidden for its rounded corners) so they aren't clipped.
 * ============================================================ */
.cohort-builder__steps {
  position: relative;
}

/* The vertical rail runs through the centres of the badges. */
.cohort-builder__steps::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 20px;
  bottom: 20px;
  width: 2px;
  background: rgb(var(--v-theme-outline-variant, 224, 224, 224));
  border-radius: 1px;
  pointer-events: none;
}

.section-step {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
}

.section-wrapper--step {
  flex: 1;
  min-width: 0;
}

/* Numbered step circle — anchors on the rail at the left, sits
 * level with the section header. */
.section-step-badge {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.section-subheader {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0 4px;
  padding: 0 16px;
}
.section-subheader__rule {
  flex: 1;
  height: 1px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}

/* ============================================================
 * Section state chip — small pill in the header showing
 * Required / Optional / Done / count.
 * ============================================================ */
.section-state-chip {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.section-state-chip--primary {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.section-state-chip--success {
  background: rgba(var(--v-theme-success, 76, 175, 80), 0.14);
  color: rgb(var(--v-theme-success, 56, 142, 60));
}

.section-state-chip--warning {
  background: rgba(var(--v-theme-warning, 255, 152, 0), 0.16);
  color: rgb(var(--v-theme-warning, 230, 124, 0));
}

.section-state-chip--muted {
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
}

/* ============================================================
 * Lighter v-btn-toggle styling — drop the heavy outlined frame
 * and use a tonal pill treatment for the active state.
 * ============================================================ */
.section-controls :deep(.v-btn-toggle) {
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-variant));
  padding: 2px;
  height: 30px;
  overflow: hidden;
}

.section-controls :deep(.v-btn-toggle .v-btn) {
  border-radius: 999px !important;
  border: 0 !important;
  min-width: 0;
  padding: 0 12px;
  height: 26px !important;
  background: transparent !important;
  color: rgb(var(--v-theme-on-surface-variant));
  font-weight: 500;
  letter-spacing: 0.02em;
}

.section-controls :deep(.v-btn-toggle .v-btn:hover:not(.v-btn--active)) {
  color: rgb(var(--v-theme-on-surface));
}

.section-controls :deep(.v-btn-toggle .v-btn--active) {
  background: rgb(var(--v-theme-surface)) !important;
  color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.section-obs-period {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 12px;
  padding-left: 32px;
}

.obs-period-label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
  margin-right: 12px;
}

.obs-period-text {
  font-size: 12px;
  color: #666;
}

/* Validation Badge and Tooltip */
.cohort-builder__validation-badge {
  margin-left: 12px;
}

.validation-tooltip {
  padding: 8px 0;
}

.validation-severity-group {
  margin-bottom: 12px;
}

.validation-severity-group:last-child {
  margin-bottom: 0;
}

.validation-severity-header {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
  padding: 0 8px;
  color: white;
}

.validation-warnings-list {
  list-style: none;
  padding: 0 8px;
  margin: 0;
}

.validation-warning-item {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;
  color: rgba(255, 255, 255, 0.95);
}

.validation-warning-item::before {
  content: '•';
  position: absolute;
  left: 4px;
  color: rgba(255, 255, 255, 0.7);
}

.validation-warning-item:last-child {
  margin-bottom: 0;
}

/* Additional-criteria connector — pills + soft surface, replaces
 * the bare "WITH" block-letter label. The pill carries the same
 * tonal treatment as the toolbar chips so the relation reads as
 * a labelled join, not a heading. */
.cohort-builder__additional-criteria {
  margin-top: 8px;
  padding: 8px 16px 12px;
  border-top: 1px dashed rgb(var(--v-theme-outline-variant, 224, 224, 224));
}
.cohort-builder__additional-criteria-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

/* "Add inclusion criteria" button row when no additional criteria
 * yet — quieter, no centering, no extra margin. */
.cohort-builder__add-additional {
  display: flex;
  justify-content: flex-start;
  padding: 8px 16px 12px;
}

.cohort-builder__connector-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Tabs */
.cohort-builder__tabs {
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.cohort-builder__tabs-window {
  margin-top: 0;
}

/* Preview mode indicators */
.cohort-builder__preview-indicator {
  color: rgb(var(--v-theme-warning));
  font-weight: normal;
  font-size: 0.9em;
  margin-left: 4px;
}

.cohort-builder__load-error {
  margin: 8px 0 16px;
}

.cohort-builder__preview-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-variant));
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.cohort-builder__preview-banner-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.8;
}

</style>
