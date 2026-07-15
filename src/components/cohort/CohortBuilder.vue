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

    <CohortGenerationSection :cohort-id="cohortId" />

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
            :concept-set-count="usedConceptSets.length"
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
          />
        </template>
      </AtlasActionToolbar>
    </div>

    <concept-sets-list-dialog
      v-model="showConceptSetsDialog"
      :concept-sets="usedConceptSets"
      @view="handleViewConceptSet"
    />

    <validation-messages-dialog
      v-model="showValidationDialog"
      :warnings="validationWarnings"
      :severity-color="highestSeverityColor"
    />

    <!-- Step rail: groups the four sections as numbered steps so
         the page reads as a logical pipeline (entry → inclusion
         → exit → era), not a stack of independent forms. -->
    <div class="cohort-builder__steps">
      <!-- Cohort Entry Events — Step 1 -->
      <div
        class="section-step mb-3"
        data-step="1"
      >
        <span class="section-step-badge">1</span>
        <div class="section-wrapper section-wrapper--step">
          <div class="section-header">
            <h3 class="section-title">
              {{ t('components.cohortExpressionEditor.cohortEntryEvents') }}
            </h3>
            <span :class="['section-state-chip', `section-state-chip--${entryEventsState.tone}`]">
              {{ entryEventsState.label }}
            </span>
            <AtlasSpacer />
            <div class="section-controls">
              <span class="section-controls__label">
                {{
                  t(
                    'components.cohortExpressionEditor.entryQualifyingLimitLabel',
                    'Cohort entry on'
                  ).value
                }}
                <AtlasTooltip
                  location="top"
                  max-width="320"
                >
                  <template #activator="{ props: tooltipProps }">
                    <AtlasIcon
                      v-bind="tooltipProps"
                      icon="mdi-help-circle-outline"
                      size="14"
                      class="section-controls__help"
                    />
                  </template>
                  <span>{{
                    t(
                      'components.cohortExpressionEditor.entryQualifyingLimitHelp',
                      'Which qualifying event marks a person’s cohort entry: their first, every occurrence, or their last.'
                    ).value
                  }}</span>
                </AtlasTooltip>
              </span>
              <v-btn-toggle
                v-model="qualifyingLimit"
                mandatory
                density="compact"
                variant="outlined"
                divided
              >
                <AtlasButton
                  toggle
                  value="FIRST"
                  size="sm"
                >
                  {{ t('options.earliestEvents', 'First') }}
                </AtlasButton>
                <AtlasButton
                  toggle
                  value="ALL"
                  size="sm"
                >
                  {{ t('options.all') }}
                </AtlasButton>
                <AtlasButton
                  toggle
                  value="LAST"
                  size="sm"
                >
                  {{ t('options.latestEvents', 'Latest') }}
                </AtlasButton>
              </v-btn-toggle>
            </div>
          </div>

          <entry-events-list
            :events="entryEvents"
            :observation-period="observationPeriod"
            @update:events="entryEvents = $event"
            @update:observation-period="observationPeriod = $event"
            @select-concept-set="handleSelectConceptSet"
            @select-concept-set-nested="handleSelectConceptSetForEntryNested"
            @select-concept-for-attribute="handleSelectConceptForEntryEvent"
            @edit-concept-set="handleEditConceptSet"
          />

          <!-- Additional Criteria (restricts entry events). The "with"
           connector is now a soft pill, not block-letter "WITH". -->
          <div
            v-if="additionalCriteria"
            class="cohort-builder__additional-criteria"
          >
            <div class="cohort-builder__additional-criteria-header">
              <span class="cohort-builder__connector-pill">
                {{ t('components.cohortExpressionEditor.withQualifyingLimit', 'with').value }}
              </span>
              <v-btn-toggle
                v-model="additionalCriteria.qualifyingLimit"
                mandatory
                density="compact"
                variant="outlined"
                divided
              >
                <AtlasButton
                  toggle
                  value="FIRST"
                  size="sm"
                >
                  {{ t('options.earliestEvents', 'First') }}
                </AtlasButton>
                <AtlasButton
                  toggle
                  value="ALL"
                  size="sm"
                >
                  {{ t('options.all') }}
                </AtlasButton>
                <AtlasButton
                  toggle
                  value="LAST"
                  size="sm"
                >
                  {{ t('options.latestEvents', 'Latest') }}
                </AtlasButton>
              </v-btn-toggle>
              <AtlasSpacer />
              <AtlasIconButton
                icon="mdi-close"
                v-bind="{ ariaLabel: t('common.remove', 'Remove').value }"
                variant="text"
                tone="danger"
                size="sm"
                @click="removeAdditionalCriteria"
              />
            </div>
            <criteria-group-editor
              ref="additionalCriteriaRef"
              v-model="additionalCriteria"
              @select-concept-set="handleSelectConceptSetForAdditionalCriteria"
              @select-concept="handleSelectConceptForAdditionalCriteria"
              @edit-concept-set="handleEditConceptSet"
              @remove="removeAdditionalCriteria"
            />
          </div>
          <div
            v-else
            class="cohort-builder__add-additional"
          >
            <AtlasButton
              variant="ghost"
              icon="mdi-filter-plus"
              size="sm"
              @click="addAdditionalCriteria"
            >
              {{
                t(
                  'components.cohortExpressionEditor.restrictInitialEventsButton',
                  'Restrict initial events'
                ).value
              }}
            </AtlasButton>
          </div>
        </div>
        <!-- /.section-wrapper -->
      </div>
      <!-- /.section-step (1) -->

      <!-- Inclusion Criteria — Step 2 -->
      <div
        class="section-step mb-3"
        data-step="2"
      >
        <span class="section-step-badge">2</span>
        <div class="section-wrapper section-wrapper--step">
          <div class="section-header">
            <h3 class="section-title">
              {{ t('components.cohortExpressionEditor.inclusionCriteriaTitle') }}
            </h3>
            <span
              :class="['section-state-chip', `section-state-chip--${inclusionRulesState.tone}`]"
            >
              {{ inclusionRulesState.label }}
            </span>
            <AtlasSpacer />
            <div class="section-controls">
              <span class="section-controls__label">
                {{
                  t(
                    'components.cohortExpressionEditor.inclusionQualifyingLimitLabel',
                    'Apply rules to'
                  ).value
                }}
                <AtlasTooltip
                  location="top"
                  max-width="320"
                >
                  <template #activator="{ props: tooltipProps }">
                    <AtlasIcon
                      v-bind="tooltipProps"
                      icon="mdi-help-circle-outline"
                      size="14"
                      class="section-controls__help"
                    />
                  </template>
                  <span>{{
                    t(
                      'components.cohortExpressionEditor.inclusionQualifyingLimitHelp',
                      'Which qualifying event each rule is evaluated against: a person’s first, every, or their last.'
                    ).value
                  }}</span>
                </AtlasTooltip>
              </span>
              <v-btn-toggle
                v-model="inclusionQualifyingLimit"
                mandatory
                density="compact"
                variant="outlined"
                divided
              >
                <AtlasButton
                  toggle
                  value="FIRST"
                  size="sm"
                >
                  {{ t('options.earliestEvents', 'First') }}
                </AtlasButton>
                <AtlasButton
                  toggle
                  value="ALL"
                  size="sm"
                >
                  {{ t('options.all') }}
                </AtlasButton>
                <AtlasButton
                  toggle
                  value="LAST"
                  size="sm"
                >
                  {{ t('options.latestEvents', 'Latest') }}
                </AtlasButton>
              </v-btn-toggle>
            </div>
          </div>
          <inclusion-criteria-panel
            v-model="inclusionRules"
            :expression="cohortExpression"
            :qualifying-limit="inclusionQualifyingLimit"
            @update:qualifying-limit="inclusionQualifyingLimit = $event"
            @select-concept-set="handleSelectConceptSetForCriteria"
            @select-concept="handleSelectConceptForCriteria"
            @edit-concept-set="handleEditConceptSet"
          />
        </div>
        <!-- /.section-wrapper -->
      </div>
      <!-- /.section-step (2) -->

      <!-- Exit & Eras — Step 3 -->
      <div
        class="section-step mb-3"
        data-step="3"
      >
        <span class="section-step-badge">3</span>
        <div class="section-wrapper section-wrapper--step">
          <div class="section-header">
            <h3 class="section-title">
              {{ t('components.cohortExpressionEditor.exitAndErasTitle', 'Cohort Exit & Eras') }}
            </h3>
            <span
              v-if="exitCriteriaState.tone !== 'muted'"
              :class="['section-state-chip', `section-state-chip--${exitCriteriaState.tone}`]"
            >
              {{ exitCriteriaState.label }}
            </span>
            <AtlasSpacer />
            <div class="section-controls">
              <span class="section-controls__label">{{
                t('components.cohortExpressionEditor.exitStrategyLabel', 'Strategy').value
              }}</span>
              <v-btn-toggle
                v-model="exitCriteria.strategy"
                mandatory
                density="compact"
                variant="outlined"
                divided
              >
                <AtlasTooltip
                  :text="
                    t('options.endOfContinuousObservation', 'End of continuous observation period')
                      .value
                  "
                  location="top"
                >
                  <template #activator="{ props: tooltipProps }">
                    <AtlasButton
                      v-bind="tooltipProps"
                      toggle
                      value="CONTINUOUS_OBSERVATION"
                      size="sm"
                    >
                      {{ t('options.endOfContinuousObservationShort', 'Observation').value }}
                    </AtlasButton>
                  </template>
                </AtlasTooltip>
                <AtlasTooltip
                  :text="
                    t(
                      'options.fixedDurationRelativeToInitialEvent',
                      'Fixed duration relative to initial event'
                    ).value
                  "
                  location="top"
                >
                  <template #activator="{ props: tooltipProps }">
                    <AtlasButton
                      v-bind="tooltipProps"
                      toggle
                      value="FIXED_DURATION"
                      size="sm"
                    >
                      {{ t('options.fixedDurationShort', 'Fixed duration').value }}
                    </AtlasButton>
                  </template>
                </AtlasTooltip>
                <AtlasTooltip
                  :text="
                    t('options.endOfContinuousDrugExposure', 'End of continuous drug exposure')
                      .value
                  "
                  location="top"
                >
                  <template #activator="{ props: tooltipProps }">
                    <AtlasButton
                      v-bind="tooltipProps"
                      toggle
                      value="CONTINUOUS_DRUG"
                      size="sm"
                    >
                      {{ t('options.endOfContinuousDrugExposureShort', 'Drug exposure').value }}
                    </AtlasButton>
                  </template>
                </AtlasTooltip>
              </v-btn-toggle>
            </div>
          </div>
          <exit-criteria-panel
            v-model="exitCriteria"
            :censoring-criteria="censoringCriteria"
            :concept-sets="usedConceptSets"
            @update:censoring-criteria="censoringCriteria = $event"
            @select-drug-concept-set="handleSelectDrugConceptSet"
            @select-censoring-concept-set="handleSelectCensoringConceptSet"
          />

          <div class="section-subheader">
            <span class="text-eyebrow">{{
              t('components.cohortExpressionEditor.cohortErasTitle', 'Cohort Eras').value
            }}</span>
            <span class="section-subheader__rule" />
          </div>
          <censor-window-editor
            :censor-window="censorWindow"
            :collapse-settings="collapseSettings"
            @update:censor-window="onCensorWindowUpdate"
            @update:collapse-settings="collapseSettings = $event"
            @validation-error="handleCensorWindowValidation"
          />
        </div>
        <!-- /.section-wrapper -->
      </div>
      <!-- /.section-step (3) -->
    </div>
    <!-- /.cohort-builder__steps -->

    <!-- Concept Set Selection Dialog: in-definition (local) sets to reuse, plus
         the repository to import a copy from (#111). -->
    <concept-set-selection-dialog
      v-model="isConceptSetDialogOpen"
      :local-concept-sets="usedConceptSets"
      @local-concept-set-selected="handleLocalConceptSetSelected"
      @concept-set-selected="handleConceptSetSelected"
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
          if (!value) conceptSetsStore.closeEditor()
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

    <!-- Tags Dialog -->
    <tag-selection-dialog
      v-model="showTagsDialog"
      :selected-tags="cohortTags"
      @update:selected-tags="handleTagsUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasProgressCircular, AtlasSnackbar, AtlasSpacer, AtlasTooltip } from '@/components/ui'
import { ref, computed, onMounted, onBeforeUnmount, watch, toRef } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { logger } from '@/utils/logger'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { useAtlasConverter } from '@/composables/useAtlasConverter'
import { provideCriteriaSelection } from '@/composables/useCriteriaSelection'
import { useI18n } from '@/composables/useI18n'
import { useCohortValidation } from '@/composables/useCohortValidation'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { getCohortDefinition } from '@/services/webapi'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import { getConceptSetById } from '@/services/concept-set.service'
import { isAtlasCohortDefinitionWrapper } from '@/models/atlas.types'
import type {
  CohortDefinition,
  CohortEvent,
  ConceptSetReference,
  InclusionRule,
  ExitCriteria,
  CensorWindow,
  CollapseSettings,
  ObservationPeriod,
  QualifyingLimit,
  CriteriaGroup,
} from '@/models/cohort.types'
// ValidationSeverity type is provided by useCohortValidation composable
import type { EventAttribute } from '@/models/event.types'
import type { Concept } from '@/models/event.types'
import type { ConceptSetItem } from '@/models/concept-set.types'
import EntryEventsList from './EntryEventsList.vue'
import ConceptSetSelectionDialog from './ConceptSetSelectionDialog.vue'
import ConceptSearchDialog from './ConceptSearchDialog.vue'
import ConceptSetEditor from '../concepts/ConceptSetEditor.vue'
import InclusionCriteriaPanel from '../cohort-builder/InclusionCriteriaPanel.vue'
import ExitCriteriaPanel from '../cohort-builder/ExitCriteriaPanel.vue'
import CensorWindowEditor from '../cohort-builder/CensorWindowEditor.vue'
import GroupCriteriaUI from '../cohort-builder/GroupCriteriaUI.vue'
import CohortGenerationSection from './CohortGenerationSection.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import type { VersionsConfig, User } from '@/components/versions/types'
import { format, parseISO } from 'date-fns'
import * as cohortDefinitionVersionsService from '@/services/cohort-definition-versions.service'
import CohortBreadcrumb from './CohortBreadcrumb.vue'
import CohortToolbarActions from './CohortToolbarActions.vue'
import CohortToolbarStatus from './CohortToolbarStatus.vue'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'
import { ensureUniqueConceptSetId, hasNumericConceptSetId } from '@/utils/concept-set-id'
import { updateConceptSetUsages } from '@/utils/concept-set-usages'
import { resolveCriteriaTargetEvent } from '@/utils/criteria-target'
import ConceptSetsListDialog from './ConceptSetsListDialog.vue'
import ValidationMessagesDialog from './ValidationMessagesDialog.vue'
import TagSelectionDialog from '@/components/tags/TagSelectionDialog.vue'
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
const { importFromFile, downloadAtlasJSON, exportToAtlas, conversionError } = useAtlasConverter()
const { t, tv } = useI18n()

// Core cohort state
const cohortName = ref('')
const cohortDescription = ref('')
const entryEvents = ref<CohortEvent[]>([])
const additionalCriteria = ref<CriteriaGroup | undefined>(undefined)
const inclusionRules = ref<InclusionRule[]>([])
const exitCriteria = ref<ExitCriteria>({ strategy: 'CONTINUOUS_OBSERVATION' })
const censorWindow = ref<CensorWindow | null>(null)
const collapseSettings = ref<CollapseSettings>({ collapseType: 'ERA', eraPad: 0 })
const censoringCriteria = ref<CohortEvent[]>([])
const observationPeriod = ref<ObservationPeriod>({ priorDays: 0, postDays: 0 })
const qualifyingLimit = ref<QualifyingLimit>('ALL') // For entry events
const primaryCriteriaLimit = ref<QualifyingLimit | undefined>(undefined)
const inclusionQualifyingLimit = ref<QualifyingLimit>('ALL') // For inclusion criteria

// UI state
const showValidationDialog = ref(false)
const showConceptSetsDialog = ref(false)
const showVersionsDialog = ref(false)
const showTagsDialog = ref(false)
const showUnsavedDialog = ref(false)
let pendingNavigation: (() => void) | null = null

// UI state
// If we have an ID prop, start with loading=true to prevent UI from rendering before data loads
const isLoadingCohort = ref(!!props.id)
const isConceptSetDialogOpen = ref(false)
const isConceptSearchDialogOpen = ref(false)
const selectedConceptDomainFilter = ref<string | undefined>(undefined)
const selectedCriteriaContext = ref<{
  eventId?: string | null
  ruleIndex: number
  groupIndex: number
  eventIndex: number
  attributeIndex?: number
  // When set, the selection targets the nested-criteria child at this index
  // inside the resolved parent event (issue #93). Without this, a nested
  // child's concept set was written onto its parent event.
  nestedEventIndex?: number
} | null>(null)

// ── Criteria selection service (issue #112) ────────────────────────────────
// Descendant criteria components at ANY nesting depth request the pickers
// through this service and apply the result themselves via their normal
// `update` emit. This replaces the fragile index-context relay for the
// migrated components; the context/sentinel paths below remain for the
// not-yet-migrated callers (entry-event concept set, exit criteria).
const pendingConceptSetCallback = ref<((cs: ConceptSetReference) => void) | null>(null)
const pendingConceptsCallback = ref<((concepts: Concept[]) => void) | null>(null)

function clearPendingSelectionCallbacks() {
  pendingConceptSetCallback.value = null
  pendingConceptsCallback.value = null
}

// A legacy opener setting an index context supersedes any service request
// still pending from a cancelled dialog — otherwise the stale callback would
// swallow the next selection.
watch(selectedCriteriaContext, context => {
  if (context) clearPendingSelectionCallbacks()
})

provideCriteriaSelection({
  requestConceptSet(onSelect) {
    clearPendingSelectionCallbacks()
    selectedCriteriaContext.value = null
    pendingConceptSetCallback.value = onSelect
    isConceptSetDialogOpen.value = true
  },
  requestConcepts(domainFilter, onSelect) {
    clearPendingSelectionCallbacks()
    selectedCriteriaContext.value = null
    pendingConceptsCallback.value = onSelect
    selectedConceptDomainFilter.value = domainFilter
    isConceptSearchDialogOpen.value = true
  },
  editConceptSet(conceptSet) {
    handleEditConceptSet(conceptSet)
  },
})
const showError = ref(false)
const errorMessage = ref('')
const showSuccess = ref(false)
const successMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const isConfirmingNavigation = ref(false) // Flag to prevent double confirmation

// Snapshot of the loaded/saved state for change detection
const loadedSnapshot = ref<string | null>(null)

// Component refs
const additionalCriteriaRef = ref<InstanceType<typeof GroupCriteriaUI> | null>(null)

// Generation state
const selectedSourceKey = ref<string | null>(null)
const generationError = ref<string | null>(null)

const cohortId = computed(() => (props.id ? Number(props.id) : null))

// ============================================================================
// Section-state chips
// ============================================================================
//
// Each section header shows a small pill conveying status at a
// glance. The shape is: { label, tone } where tone is "primary"
// (populated), "warning" (incomplete-required), "muted"
// (optional/empty), or "success" (complete).

interface SectionState {
  label: string
  tone: 'primary' | 'warning' | 'muted' | 'success'
}

const entryEventsState = computed<SectionState>(() => {
  const events = entryEvents.value
  if (events.length === 0) {
    return { label: tv('components.cohortBuilder.stateRequired', 'Required'), tone: 'warning' }
  }
  const allHaveConceptSet = events.every(e => !!e.conceptSet)
  const count =
    events.length === 1
      ? tv('components.cohortBuilder.eventCountOne', '1 event')
      : tv('components.cohortBuilder.eventCountOther', '{count} events', { count: events.length })
  return allHaveConceptSet ? { label: count, tone: 'success' } : { label: count, tone: 'warning' }
})

const inclusionRulesState = computed<SectionState>(() => {
  const rules = inclusionRules.value
  if (rules.length === 0) {
    return { label: tv('components.cohortBuilder.stateOptional', 'Optional'), tone: 'muted' }
  }
  const label =
    rules.length === 1
      ? tv('components.cohortBuilder.ruleCountOne', '1 rule')
      : tv('components.cohortBuilder.ruleCountOther', '{count} rules', { count: rules.length })
  return { label, tone: 'primary' }
})

const exitCriteriaState = computed<SectionState>(() => {
  const ec = exitCriteria.value
  const censoringCount = censoringCriteria.value.length
  // Continuous observation (default) is always valid on its own.
  if (ec.strategy === 'CONTINUOUS_OBSERVATION') {
    return censoringCount > 0
      ? {
          label: tv('components.cohortBuilder.stateCensoringCount', '+{count} censoring', {
            count: censoringCount,
          }),
          tone: 'primary',
        }
      : {
          label: tv('components.cohortBuilder.stateEndOfObservation', 'End of observation'),
          tone: 'muted',
        }
  }
  if (ec.strategy === 'FIXED_DURATION') {
    if (ec.offset === undefined || ec.offset === null) {
      return { label: tv('components.cohortBuilder.stateNeedsOffset', 'Needs offset'), tone: 'warning' }
    }
    return {
      label: tv('components.cohortBuilder.stateOffsetDays', '+{count} days', { count: ec.offset }),
      tone: 'success',
    }
  }
  if (ec.strategy === 'CONTINUOUS_DRUG') {
    if (!ec.conceptSet) {
      return { label: tv('components.cohortBuilder.stateNeedsDrugSet', 'Needs drug set'), tone: 'warning' }
    }
    return { label: tv('components.cohortBuilder.stateDrugExposure', 'Drug exposure'), tone: 'success' }
  }
  return { label: tv('components.cohortBuilder.stateConfigured', 'Configured'), tone: 'muted' }
})

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
  highestSeverityColor,
  usedConceptSets,
  triggerValidation,
  cancelValidation,
} = useCohortValidation({
  cohortName,
  cohortDescription,
  cohortId,
  entryEvents,
  additionalCriteria,
  inclusionRules,
  exitCriteria,
  censoringCriteria,
  observationPeriod,
  qualifyingLimit,
  primaryCriteriaLimit,
  inclusionQualifyingLimit,
})

// Permission gating for save: a *new* cohort needs `create:cohort-definition`,
// editing an existing one needs write access on that specific entity (which
// canWrite already considers global write perms + ownership + per-entity
// grant). Save is hidden in version preview separately via isPreviewingVersion.
const { hasPermission } = usePermissions()
const { canWrite: canWriteCohort } = useEntityAccess('cohortDefinition', cohortId)
const canSavePermission = computed(() =>
  cohortId.value === null ? hasPermission('create:cohort-definition') : canWriteCohort.value
)

const canSave = computed(() => {
  return (
    cohortName.value.trim().length > 0 && entryEvents.value.length > 0 && canSavePermission.value
  )
})

// Preview mode state
const isPreviewingVersion = computed(() => {
  return !!cohortStore.previewVersion
})

/**
 * Navigate back to the current version from a preview
 */
async function handleBackToCurrent(): Promise<void> {
  if (!cohortId.value) return

  await router.push({
    path: `/cohortdefinition/${cohortId.value}/version/current`,
  })
}

/**
 * Cohort expression for patient count API
 * Holds the current Atlas format expression with concept set items populated
 */
const cohortExpression = ref<ReturnType<typeof convertInternalToAtlas> | Record<string, never>>({})

/**
 * Build cohort expression with full concept set items fetched from API
 * Called whenever cohort state changes
 */
async function buildCohortExpression() {
  // Only create expression if we have entry events
  if (entryEvents.value.length === 0) {
    cohortExpression.value = {}
    return
  }

  try {
    // Fetch full concept set items for all used concept sets
    const conceptSetsWithItems: ConceptSetReference[] = await Promise.all(
      usedConceptSets.value.map(async ref => {
        // Skip if items are already populated
        if (ref.items && ref.items.length > 0) {
          return ref
        }

        // Fetch full concept set from API
        if (ref.id) {
          const fullConceptSet = await getConceptSetById(ref.id)
          if (fullConceptSet && fullConceptSet.items) {
            return {
              ...ref,
              items: fullConceptSet.items as ConceptSetItem[],
            }
          }
        }

        // Return reference as-is if fetching failed
        return ref
      })
    )

    // Strip in-progress criteria from inclusion rules before building the
    // live-preview expression. A criterion that was just added but has no
    // valid concept set assigned (id === 0 placeholder, or a concept set
    // whose items array is empty) makes circe NPE in
    // CohortExpressionQueryBuilder.getCorelatedlCriteriaQuery — it expects
    // every correlated criterion to have a populated codeset and a
    // StartWindow. Rather than failing the entire preview, we exclude
    // those criteria so the user still sees counts from the completed
    // rules; the inclusion rule banner separately tells them their
    // newest criterion is incomplete.
    const sanitizedInclusionRules = inclusionRules.value.map(rule => ({
      ...rule,
      criteriaGroups: rule.criteriaGroups.map(group => ({
        ...group,
        events: group.events.filter(e => {
          if (e.criteriaType === 'Demographic') return true
          const cs = e.conceptSet
          if (!cs) return false
          if (cs.id === 0) return false
          return Array.isArray(cs.items) && cs.items.length > 0
        }),
      })),
    }))

    // Build cohort definition with all fields (same as validation)
    const cohortDef: CohortDefinition = {
      name: cohortName.value || 'Untitled Cohort',
      description: cohortDescription.value,
      tags: cohortTags.value,
      entryEvents: entryEvents.value,
      additionalCriteria: additionalCriteria.value,
      inclusionRules: sanitizedInclusionRules,
      exitCriteria: exitCriteria.value,
      censorWindow: censorWindow.value || undefined,
      collapseSettings: collapseSettings.value,
      censoringCriteria: censoringCriteria.value,
      observationPeriod: observationPeriod.value,
      qualifyingLimit: qualifyingLimit.value,
      primaryCriteriaLimit: primaryCriteriaLimit.value,
      inclusionQualifyingLimit: inclusionQualifyingLimit.value,
      conceptSets: conceptSetsWithItems.filter(cs => cs.id !== 0),
    }

    // Convert to Atlas format (same as checkV2 validation)
    cohortExpression.value = convertInternalToAtlas(cohortDef)
  } catch (error) {
    logger.error('CohortBuilder', 'Failed to build cohort expression', error)
    cohortExpression.value = {}
  }
}

/**
 * Create a snapshot of the current cohort state for change detection
 */
function createStateSnapshot(): string {
  return JSON.stringify({
    name: cohortName.value,
    description: cohortDescription.value,
    tags: cohortTags.value,
    entryEvents: entryEvents.value,
    additionalCriteria: additionalCriteria.value,
    inclusionRules: inclusionRules.value,
    exitCriteria: exitCriteria.value,
    censorWindow: censorWindow.value,
    collapseSettings: collapseSettings.value,
    censoringCriteria: censoringCriteria.value,
    observationPeriod: observationPeriod.value,
    qualifyingLimit: qualifyingLimit.value,
    primaryCriteriaLimit: primaryCriteriaLimit.value,
    inclusionQualifyingLimit: inclusionQualifyingLimit.value,
  })
}

/**
 * Computed property that detects if there are unsaved changes
 * by comparing current state with the loaded snapshot
 */
const hasUnsavedChanges = computed(() => {
  if (!loadedSnapshot.value) {
    // No snapshot means we're in a new cohort, check if there's any content
    return cohortName.value.trim().length > 0 || entryEvents.value.length > 0
  }

  // Compare current state with loaded snapshot
  const currentSnapshot = createStateSnapshot()
  return currentSnapshot !== loadedSnapshot.value
})

/**
 * Get the currently selected concepts for the attribute being edited
 */
const currentlySelectedConcepts = computed(() => {
  if (
    !selectedCriteriaContext.value ||
    selectedCriteriaContext.value.attributeIndex === undefined
  ) {
    return []
  }

  const context = selectedCriteriaContext.value
  let attribute: EventAttribute | null = null

  // Handle entry events
  if (context.ruleIndex === -1 && context.eventId && context.attributeIndex !== undefined) {
    const event = entryEvents.value.find(e => e.id === context.eventId)
    if (event && event.attributes && event.attributes[context.attributeIndex]) {
      attribute = event.attributes[context.attributeIndex] ?? null
    }
  }
  // Handle inclusion criteria
  else if (
    context.ruleIndex >= 0 &&
    context.groupIndex >= 0 &&
    context.eventIndex !== undefined &&
    context.attributeIndex !== undefined
  ) {
    const rule = inclusionRules.value[context.ruleIndex]
    if (rule && rule.criteriaGroups) {
      const group = rule.criteriaGroups[context.groupIndex]
      if (group && group.events) {
        const event = group.events[context.eventIndex]
        if (event && event.attributes && event.attributes[context.attributeIndex]) {
          attribute = event.attributes[context.attributeIndex] ?? null
        }
      }
    }
  }
  // Handle additional criteria
  else if (
    context.ruleIndex === -2 &&
    additionalCriteria.value &&
    context.eventIndex !== undefined &&
    context.attributeIndex !== undefined
  ) {
    const event = additionalCriteria.value.events[context.eventIndex]
    if (event && event.attributes && event.attributes[context.attributeIndex]) {
      attribute = event.attributes[context.attributeIndex] ?? null
    }
  }

  // Return concepts if this is a concept attribute
  if (attribute && attribute.type === 'concept') {
    const concepts = attribute.concepts || []
    // Convert UPPERCASE concepts to camelCase for the dialog
    return concepts.map((c: Concept) => ({
      conceptId: c.CONCEPT_ID,
      conceptName: c.CONCEPT_NAME,
      conceptCode: c.CONCEPT_CODE ?? '',
      domainId: c.DOMAIN_ID ?? '',
      vocabularyId: c.VOCABULARY_ID ?? '',
      conceptClassId: c.CONCEPT_CLASS_ID ?? '',
      standardConcept: c.STANDARD_CONCEPT ?? null,
      invalidReason: c.INVALID_REASON ?? null,
    }))
  }

  return []
})

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

// Re-sync local refs from the store when the cohort agent applies a proposal.
// Local refs (entryEvents, inclusionRules, observationPeriod, …) are
// initialized once at load (~1317) and shared by reference for arrays. Object
// replacements (observationPeriod, exitCriteria) and freshly-created arrays
// (censoringCriteria starting from undefined) lose that link, so we explicitly
// re-bind them here. Only fires on agent-driven mutations — user edits use the
// local refs directly without bumping `agentRevision`, so no feedback loop.
watch(
  () => cohortStore.agentRevision,
  () => {
    const c = cohortStore.currentCohort
    if (!c) return
    entryEvents.value = c.entryEvents
    inclusionRules.value = c.inclusionRules
    observationPeriod.value = c.observationPeriod || { priorDays: 0, postDays: 0 }
    exitCriteria.value = c.exitCriteria ?? { strategy: 'CONTINUOUS_OBSERVATION' }
    censoringCriteria.value = c.censoringCriteria ?? []
  }
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

// Reset to a blank cohort in place. Navigating cohort-new → cohort-new is a
// same-route no-op, so onMounted never re-runs; without this the previous
// cohort's criteria would linger and the next cohort's proposals would pile
// onto it.
watch(
  () => cohortStore.newCohortSignal,
  () => {
    const c = cohortStore.currentCohort
    if (!c) return
    cancelValidation()
    cohortName.value = c.name
    cohortDescription.value = c.description ?? ''
    entryEvents.value = c.entryEvents
    additionalCriteria.value = c.additionalCriteria
    inclusionRules.value = c.inclusionRules
    exitCriteria.value = c.exitCriteria ?? { strategy: 'CONTINUOUS_OBSERVATION' }
    censorWindow.value = c.censorWindow ?? null
    censoringCriteria.value = c.censoringCriteria ?? []
    observationPeriod.value = c.observationPeriod || { priorDays: 0, postDays: 0 }
    qualifyingLimit.value = c.qualifyingLimit
    primaryCriteriaLimit.value = c.primaryCriteriaLimit
    inclusionQualifyingLimit.value = c.inclusionQualifyingLimit ?? 'ALL'
    loadedTags.value = []
    loadedSnapshot.value = createStateSnapshot()
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
    loadCohort(props.id)
  } else {
    const restored = cohortStore.restoreFromDraft()
    if (!restored) {
      // If pythia (or any other code path) has already populated
      // currentCohort with actual content right before navigating us to
      // /cohorts/new, don't clobber it. Only initialise a fresh blank
      // cohort when there's truly nothing to preserve.
      const existing = cohortStore.currentCohort
      const hasContent =
        existing != null &&
        ((existing.entryEvents?.length ?? 0) > 0 ||
          (existing.inclusionRules?.length ?? 0) > 0 ||
          (existing.conceptSets?.length ?? 0) > 0 ||
          (typeof existing.name === 'string' &&
            existing.name.trim().length > 0 &&
            existing.name !== 'New Cohort'))
      if (!hasContent) {
        cohortStore.createNewCohort()
      }
    }
    loadedTags.value = []
    // Set name from query param if provided (from New Cohort dialog)
    if (route.query.name && typeof route.query.name === 'string') {
      cohortName.value = route.query.name
    }
    // Trigger validation for new/restored cohorts
    triggerValidation()
    // Build cohort expression with concept set items for patient count
    buildCohortExpression()
  }

  // Load resources in parallel in the background (don't block rendering)
  Promise.all([
    // Load all concept sets from the API so user can select any system concept set
    conceptSetsStore.fetchAll(),
    // Load CDM sources for generation
    webapiStore.fetchSources().then(() => {
      // Auto-select first source if available
      if (webapiStore.sourcesList.length > 0 && !selectedSourceKey.value) {
        selectedSourceKey.value = webapiStore.sourcesList[0]?.sourceKey || null
      }
    }),
  ])

  // Add beforeunload handler to warn when closing tab/window with unsaved changes
  window.addEventListener('beforeunload', handleBeforeUnload)
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

watch(
  () => props.id,
  newId => {
    if (newId) {
      isLoadingCohort.value = true
      loadCohort(newId)
    }
  }
)

// Watch for changes to cohort definition and rebuild expression with concept set items
watch(
  [
    entryEvents,
    additionalCriteria,
    inclusionRules,
    exitCriteria,
    censoringCriteria,
    observationPeriod,
    qualifyingLimit,
    primaryCriteriaLimit,
    inclusionQualifyingLimit,
  ],
  () => {
    buildCohortExpression()
  },
  { deep: true }
)

async function loadCohort(id: string) {
  isLoadingCohort.value = true
  try {
    // Fetch cohort definition from WebAPI
    const cohortId = parseInt(id, 10)
    const atlasCohort = await getCohortDefinition(cohortId)

    if (!atlasCohort) {
      logger.error('CohortBuilder', `Failed to load cohort ${id}`)
      isLoadingCohort.value = false
      return
    }

    // Parse expression if it's a string (stored as JSON in WebAPI)
    let expression
    if (isAtlasCohortDefinitionWrapper(atlasCohort)) {
      const exprValue = atlasCohort.expression
      expression = typeof exprValue === 'string' ? JSON.parse(exprValue) : exprValue
    } else {
      expression = atlasCohort
    }

    // Convert Atlas JSON to internal format
    const converted = convertAtlasToInternal(expression)

    // Create cohort definition with converted data
    const cohortDef: CohortDefinition = {
      id: atlasCohort.id,
      name: atlasCohort.name,
      description: atlasCohort.description || '',
      tags: atlasCohort.tags || [],
      entryEvents: converted.entryEvents || [],
      inclusionRules: converted.inclusionRules || [],
      exitCriteria: converted.exitCriteria || { strategy: 'CONTINUOUS_OBSERVATION' },
      observationPeriod: converted.observationPeriod || { priorDays: 0, postDays: 0 },
      qualifyingLimit: converted.qualifyingLimit || 'ALL',
      primaryCriteriaLimit: converted.primaryCriteriaLimit,
      inclusionQualifyingLimit: converted.inclusionQualifyingLimit || 'ALL',
      additionalCriteria: converted.additionalCriteria,
      conceptSets: converted.conceptSets || [],
    }

    // Update store with loaded cohort
    cohortStore.setCohort(cohortDef)
    cohortStore.markClean()

    // Cancel any pending validation during batch state update
    cancelValidation()

    // Update local state
    cohortName.value = cohortDef.name
    cohortDescription.value = cohortDef.description ?? ''
    entryEvents.value = cohortDef.entryEvents
    additionalCriteria.value = cohortDef.additionalCriteria
    inclusionRules.value = cohortDef.inclusionRules
    exitCriteria.value = cohortDef.exitCriteria ?? { strategy: 'CONTINUOUS_OBSERVATION' }
    censorWindow.value = cohortDef.censorWindow ?? null
    collapseSettings.value = cohortDef.collapseSettings ?? { collapseType: 'ERA', eraPad: 0 }
    censoringCriteria.value = cohortDef.censoringCriteria ?? []
    observationPeriod.value = cohortDef.observationPeriod || { priorDays: 0, postDays: 0 }
    qualifyingLimit.value = cohortDef.qualifyingLimit
    primaryCriteriaLimit.value = cohortDef.primaryCriteriaLimit
    inclusionQualifyingLimit.value = cohortDef.inclusionQualifyingLimit ?? 'ALL'

    loadedTags.value = [...(cohortDef.tags || [])]
    loadedSnapshot.value = createStateSnapshot()

    // Hide loading overlay immediately - cohort is now visible
    isLoadingCohort.value = false

    // Trigger validation in the background (composable handles debouncing)
    triggerValidation()

    // Build cohort expression with concept set items for patient count
    buildCohortExpression()
  } catch (error) {
    logger.error('CohortBuilder', `Error loading cohort ${id}`, error)
    isLoadingCohort.value = false
  }
}

function handleSelectConceptSet(eventId: string) {
  selectedCriteriaContext.value = { eventId, ruleIndex: -1, groupIndex: -1, eventIndex: -1 }
  isConceptSetDialogOpen.value = true
}

// A nested-criteria child of an *entry event* requested a concept set. Keep the
// parent entry event id, but mark the nested child index so assignment lands on
// `parentEvent.nestedCriteria.events[nestedEventIndex]` rather than the parent.
function handleSelectConceptSetForEntryNested(eventId: string, nestedEventIndex: number) {
  selectedCriteriaContext.value = {
    eventId,
    ruleIndex: -1,
    groupIndex: -1,
    eventIndex: -1,
    nestedEventIndex,
  }
  isConceptSetDialogOpen.value = true
}

function handleSelectConceptSetForCriteria(context: {
  ruleIndex: number
  groupIndex: number
  eventIndex: number
  nestedEventIndex?: number
}) {
  selectedCriteriaContext.value = { ...context, eventId: null }
  isConceptSetDialogOpen.value = true
}

function handleSelectConceptSetForAdditionalCriteria(
  eventIndexOrContext:
    | number
    | { eventIndex: number; eventId?: string; nestedEventIndex?: number }
) {
  const eventIndex =
    typeof eventIndexOrContext === 'number' ? eventIndexOrContext : eventIndexOrContext.eventIndex
  const nestedEventIndex =
    typeof eventIndexOrContext === 'number' ? undefined : eventIndexOrContext.nestedEventIndex
  selectedCriteriaContext.value = {
    eventId: null,
    ruleIndex: -2,
    groupIndex: 0,
    eventIndex,
    nestedEventIndex,
  }
  isConceptSetDialogOpen.value = true
}

// Track which part of exit criteria needs the concept set
const exitCriteriaSelectionType = ref<'DRUG_EXPOSURE' | 'CENSORING_EVENT' | null>(null)

function handleSelectDrugConceptSet() {
  exitCriteriaSelectionType.value = 'DRUG_EXPOSURE'
  selectedCriteriaContext.value = { eventId: null, ruleIndex: -3, groupIndex: 0, eventIndex: 0 }
  isConceptSetDialogOpen.value = true
}

function handleSelectCensoringConceptSet() {
  exitCriteriaSelectionType.value = 'CENSORING_EVENT'
  selectedCriteriaContext.value = { eventId: null, ruleIndex: -3, groupIndex: 0, eventIndex: 0 }
  isConceptSetDialogOpen.value = true
}

// Concept attribute selection handlers
function handleSelectConceptForEntryEvent(
  eventId: string,
  attributeIndex: number,
  domainFilter: string | undefined
) {
  selectedCriteriaContext.value = {
    eventId,
    ruleIndex: -1, // Entry events
    groupIndex: 0,
    eventIndex: 0,
    attributeIndex,
  }
  selectedConceptDomainFilter.value = domainFilter
  isConceptSearchDialogOpen.value = true
}

function handleSelectConceptForAdditionalCriteria(context: {
  eventIndex: number
  domainFilter: string | undefined
}) {
  selectedCriteriaContext.value = {
    eventId: null,
    ruleIndex: -2,
    groupIndex: 0,
    eventIndex: context.eventIndex,
    attributeIndex: -1, // Will be set by GroupCriteriaUI
  }
  selectedConceptDomainFilter.value = context.domainFilter
  isConceptSearchDialogOpen.value = true
}

function handleSelectConceptForCriteria(context: {
  ruleIndex: number
  groupIndex: number
  eventIndex: number
  attributeIndex: number
  domainFilter: string | undefined
}) {
  selectedCriteriaContext.value = {
    ...context,
    eventId: null,
  }
  selectedConceptDomainFilter.value = context.domainFilter
  isConceptSearchDialogOpen.value = true
}

function handleConceptsSelected(
  concepts: Array<{
    conceptId: number
    conceptName: string
    conceptCode: string
    domainId: string
    vocabularyId: string
    conceptClassId: string
    standardConcept: string | null
    invalidReason: string | null
  }>
) {
  if (concepts.length === 0 || (!selectedCriteriaContext.value && !pendingConceptsCallback.value)) {
    isConceptSearchDialogOpen.value = false
    clearPendingSelectionCallbacks()
    return
  }

  // Convert camelCase concepts to UPPERCASE Atlas format
  const convertedConcepts = concepts.map(c => ({
    CONCEPT_ID: c.conceptId,
    CONCEPT_NAME: c.conceptName,
    CONCEPT_CODE: c.conceptCode,
    DOMAIN_ID: c.domainId,
    VOCABULARY_ID: c.vocabularyId,
    CONCEPT_CLASS_ID: c.conceptClassId,
    STANDARD_CONCEPT: c.standardConcept,
    INVALID_REASON: c.invalidReason,
  }))

  // Service path (issue #112): deliver to the requesting component, which
  // applies the concepts itself at whatever nesting depth it lives.
  if (pendingConceptsCallback.value) {
    const callback = pendingConceptsCallback.value
    clearPendingSelectionCallbacks()
    callback(convertedConcepts)
    isConceptSearchDialogOpen.value = false
    return
  }

  // Concept attributes (Gender, Race, etc.) accept a list of concepts
  // but a duplicate concept_id has no semantic meaning — circe treats
  // `Gender IN (8507, 8507)` identically to `Gender IN (8507)` and the
  // chip UI just renders two identical pills. Dedupe by CONCEPT_ID
  // when merging the existing list with the user's new selection.
  const mergeConcepts = <T extends { CONCEPT_ID: number }>(existing: T[], incoming: T[]): T[] => {
    const seen = new Set(existing.map(c => c.CONCEPT_ID))
    const merged = [...existing]
    for (const c of incoming) {
      if (!seen.has(c.CONCEPT_ID)) {
        merged.push(c)
        seen.add(c.CONCEPT_ID)
      }
    }
    return merged
  }

  const context = selectedCriteriaContext.value
  if (!context) {
    isConceptSearchDialogOpen.value = false
    return
  }

  // Handle entry events
  if (context.ruleIndex === -1 && context.eventId && context.attributeIndex !== undefined) {
    const event = entryEvents.value.find(e => e.id === context.eventId)
    if (event && event.attributes && event.attributes[context.attributeIndex]) {
      const attr = event.attributes[context.attributeIndex]
      if (attr && attr.type === 'concept') {
        // Add selected concepts to the existing array (support multi-select)
        const existingConcepts = attr.concepts || []
        const newConcepts = mergeConcepts(existingConcepts, convertedConcepts)
        event.attributes[context.attributeIndex] = {
          ...attr,
          concepts: newConcepts,
        }
      }
    }
  }
  // Handle additional criteria
  else if (context.ruleIndex === -2 && additionalCriteriaRef.value) {
    // Update for multi-select
    additionalCriteriaRef.value.updateConceptAttribute(context.eventIndex, convertedConcepts)
  }
  // Handle inclusion criteria
  else if (
    context.ruleIndex >= 0 &&
    context.groupIndex >= 0 &&
    context.eventIndex !== undefined &&
    context.attributeIndex !== undefined
  ) {
    // Update the inclusion criteria data directly
    const rule = inclusionRules.value[context.ruleIndex]
    if (rule && rule.criteriaGroups) {
      const group = rule.criteriaGroups[context.groupIndex]
      if (group && group.events) {
        const event = group.events[context.eventIndex]
        if (event && event.attributes && event.attributes[context.attributeIndex]) {
          const attr = event.attributes[context.attributeIndex]
          if (attr && attr.type === 'concept') {
            // Add selected concepts to the existing array (support multi-select)
            const existingConcepts = attr.concepts || []
            const newConcepts = [...existingConcepts, ...convertedConcepts]
            event.attributes[context.attributeIndex] = {
              ...attr,
              concepts: newConcepts,
            }
          }
        }
      }
    }
  }

  isConceptSearchDialogOpen.value = false
}

function handleCensorWindowValidation() {
  // Handle censor window validation errors
  // Currently just logging for now, could be used for aggregated validation display
}

function onCensorWindowUpdate(value: CensorWindow | undefined) {
  censorWindow.value = value ?? null
}

function addAdditionalCriteria() {
  additionalCriteria.value = {
    id: `criteria_group_${Date.now()}`,
    logicType: 'ALL',
    qualifyingLimit: 'ALL',
    events: [],
  }
}

function removeAdditionalCriteria() {
  additionalCriteria.value = undefined
}

/**
 * Called when user selects an existing concept set from the dialog
 */
async function handleConceptSetSelected(conceptSet: {
  id: number | string
  name: string
  items?: unknown[]
}) {
  if (!conceptSet || (!selectedCriteriaContext.value && !pendingConceptSetCallback.value)) return

  // Fetch the full concept set with items if we only have a reference
  let fullConceptSet: { id: number | string; name: string; items?: unknown[] } = conceptSet
  if (conceptSet.id && (!conceptSet.items || conceptSet.items.length === 0)) {
    await conceptSetsStore.fetchOne(conceptSet.id)
    if (conceptSetsStore.currentSet && conceptSetsStore.currentSet.id !== undefined) {
      fullConceptSet = {
        id: conceptSetsStore.currentSet.id,
        name: conceptSetsStore.currentSet.name,
        items: conceptSetsStore.currentSet.items,
      }
    }
  }

  // Copy the entire concept set including items into the cohort definition
  const conceptSetRef: ConceptSetReference = {
    id: fullConceptSet.id,
    name: fullConceptSet.name,
    items: fullConceptSet.items || [],
  }

  assignConceptSetToContext(conceptSetRef)
  isConceptSetDialogOpen.value = false
}

/**
 * Called when the user picks a concept set that's already embedded in the
 * definition (#111). Unlike the repository path, this reuses the existing
 * local set in place: its id already matches an entry in `usedConceptSets`, so
 * `assignConceptSetToContext` (via `ensureUniqueConceptSetId`) keeps that id and
 * the cohort dedupes to a single CodesetId rather than minting a copy.
 */
function handleLocalConceptSetSelected(conceptSet: ConceptSetReference) {
  // Guard the reuse invariant: only a set with a numeric id can be reused in
  // place. id 0 is allowed — legacy/imported cohorts start CodesetIds at 0
  // and those sets are real, already-embedded members of this cohort. The
  // dialog already filters id-less placeholders out; this keeps it impossible
  // for one to slip through and get minted as a new empty set.
  if (
    !conceptSet ||
    !hasNumericConceptSetId(conceptSet) ||
    (!selectedCriteriaContext.value && !pendingConceptSetCallback.value)
  )
    return
  assignConceptSetToContext({ ...conceptSet })
  isConceptSetDialogOpen.value = false
}

/**
 * Called when user clicks "Edit" on a concept set (from chip or dialog)
 */
async function handleEditConceptSet(conceptSet: {
  id: number | string
  name: string
  items?: unknown[]
}) {
  // Close dialog if it's open
  isConceptSetDialogOpen.value = false

  // Use the embedded concept set items directly (don't fetch from API)
  // The concept set is embedded in the cohort definition with all its items
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
  // Close the concept sets dialog
  showConceptSetsDialog.value = false

  // Open the concept set editor
  handleEditConceptSet(conceptSet)
}

/**
 * Called when user clicks "Create New" in the dialog
 */
function handleCreateNewConceptSet() {
  // Close dialog and open editor in create mode
  isConceptSetDialogOpen.value = false
  conceptSetsStore.openCreateEditor()
}

/**
 * Called when the embedded editor applies its changes. The editor worked on a
 * disposable clone, so nothing reached the cohort yet — write the result into
 * every usage of the concept set id, which flips the unsaved-changes snapshot.
 */
function handleConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const items = JSON.parse(JSON.stringify(set.items ?? [])) as ConceptSetItem[]

  if (set.id !== undefined && set.id !== null) {
    const updated: ConceptSetReference = { id: set.id, name: set.name, items }
    updateConceptSetUsages(
      {
        entryEvents: entryEvents.value,
        additionalCriteria: additionalCriteria.value,
        inclusionRules: inclusionRules.value,
        exitCriteria: exitCriteria.value,
        censoringCriteria: censoringCriteria.value,
      },
      updated
    )
    entryEvents.value = [...entryEvents.value]
    inclusionRules.value = [...inclusionRules.value]
    if (additionalCriteria.value) additionalCriteria.value = { ...additionalCriteria.value }
    exitCriteria.value = { ...exitCriteria.value }
    censoringCriteria.value = [...censoringCriteria.value]
  }

  if (selectedCriteriaContext.value || pendingConceptSetCallback.value) {
    assignConceptSetToContext({ id: set.id ?? 0, name: set.name, items })
  }
}

/**
 * Helper to assign a concept set to the current context (entry event or criteria)
 */
function assignConceptSetToContext(conceptSetRef: ConceptSetReference) {
  if (!selectedCriteriaContext.value && !pendingConceptSetCallback.value) return

  // A concept set's id is its identity in the cohort — the Atlas CodesetId every
  // criterion references and the key the cohort dedupes on. A freshly created set
  // arrives without a real id (the new-set path yields id 0), so two new sets both
  // carry id 0 and collapse onto each other: adding the second overrides the first.
  // Give any id-less set a unique numeric id before it enters the cohort.
  conceptSetRef = ensureUniqueConceptSetId(conceptSetRef, usedConceptSets.value)

  // Service path (issue #112): deliver to the requesting component, which
  // embeds the reference itself at whatever nesting depth it lives.
  if (pendingConceptSetCallback.value) {
    const callback = pendingConceptSetCallback.value
    clearPendingSelectionCallbacks()
    callback(conceptSetRef)
    return
  }

  const context = selectedCriteriaContext.value
  if (!context) return
  const isNested = context.nestedEventIndex !== undefined && context.nestedEventIndex !== null

  // Handle entry event selection
  if (context.eventId) {
    const eventIndex = entryEvents.value.findIndex(e => e.id === context.eventId)
    if (eventIndex === -1) return

    const currentEvent = entryEvents.value[eventIndex]
    if (!currentEvent) return

    if (isNested) {
      // Assign to the nested child rather than the parent entry event (#93).
      const target = resolveCriteriaTargetEvent(context, {
        entryEvents: entryEvents.value,
        additionalCriteria: additionalCriteria.value,
        inclusionRules: inclusionRules.value,
      })
      if (!target) return
      target.conceptSet = conceptSetRef
      // Reassign the entry event ref so Vue picks up the nested mutation.
      entryEvents.value[eventIndex] = { ...currentEvent }
    } else {
      // Update the event directly - Vue 3 ref reactivity will detect this
      entryEvents.value[eventIndex] = {
        ...currentEvent,
        conceptSet: conceptSetRef,
      }
    }
  }
  // Handle additional criteria event selection
  else if (context.ruleIndex === -2) {
    if (!additionalCriteria.value) return

    const target = resolveCriteriaTargetEvent(context, {
      entryEvents: entryEvents.value,
      additionalCriteria: additionalCriteria.value,
      inclusionRules: inclusionRules.value,
    })
    if (!target) return

    // Update the (parent or nested) event's concept set
    target.conceptSet = conceptSetRef

    // Trigger reactivity
    additionalCriteria.value = { ...additionalCriteria.value }
  }
  // Handle criteria group event selection
  else if (context.ruleIndex >= 0) {
    const target = resolveCriteriaTargetEvent(context, {
      entryEvents: entryEvents.value,
      additionalCriteria: additionalCriteria.value,
      inclusionRules: inclusionRules.value,
    })
    if (!target) return

    // Update the (parent or nested) event's concept set
    target.conceptSet = conceptSetRef

    // Trigger reactivity
    inclusionRules.value = [...inclusionRules.value]
  }
  // Handle exit criteria concept set selection
  else if (context.ruleIndex === -3) {
    if (exitCriteriaSelectionType.value === 'DRUG_EXPOSURE') {
      // Set concept set for drug exposure strategy
      exitCriteria.value = {
        ...exitCriteria.value,
        conceptSet: conceptSetRef,
      }
    } else if (exitCriteriaSelectionType.value === 'CENSORING_EVENT') {
      // Create new censoring event with this concept set
      const newEvent: CohortEvent = {
        id: `censoring_${Date.now()}`,
        criteriaType: 'DrugExposure', // Default, user might need to change
        attributes: [],
        conceptSet: conceptSetRef,
      }
      censoringCriteria.value = [...censoringCriteria.value, newEvent]
    }
    exitCriteriaSelectionType.value = null
  }

  selectedCriteriaContext.value = null
}

async function handleSave(): Promise<{ id?: number; name?: string }> {
  if (!canSave.value) return {}

  // Collect every concept set the cohort references (entry, additional,
  // inclusion rules, exit, censoring) and hydrate items from the API for any
  // that aren't already populated. Saving with just `gatherConceptSets()`
  // (entry-only) drops inclusion-rule concept sets — the saved Atlas
  // expression then references CodesetIds that don't exist, and the WebAPI
  // generator returns 0 patients on the next run.
  const conceptSetsForSave: ConceptSetReference[] = await Promise.all(
    usedConceptSets.value.map(async ref => {
      if (ref.items && ref.items.length > 0) {
        return ref
      }
      if (ref.id) {
        const fullConceptSet = await getConceptSetById(ref.id)
        if (fullConceptSet?.items) {
          return { ...ref, items: fullConceptSet.items as ConceptSetItem[] }
        }
      }
      return ref
    })
  )

  const cohortDefinition: CohortDefinition = {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    tags: cohortTags.value,
    entryEvents: entryEvents.value,
    qualifyingLimit: qualifyingLimit.value,
    primaryCriteriaLimit: primaryCriteriaLimit.value,
    inclusionQualifyingLimit: inclusionQualifyingLimit.value,
    additionalCriteria: additionalCriteria.value,
    inclusionRules: inclusionRules.value,
    conceptSets: conceptSetsForSave,
    exitCriteria: exitCriteria.value,
    observationPeriod: observationPeriod.value,
  }

  // Convert to Atlas format and save to WebAPI
  const { convertInternalToAtlas } = await import('@/services/atlas-converter')
  const { saveCohortDefinition, assignTagToCohort, unassignTagFromCohort } = await import(
    '@/services/webapi'
  )

  const atlasExpression = convertInternalToAtlas(cohortDefinition)
  const atlasDefinition = {
    id: cohortDefinition.id,
    name: cohortDefinition.name,
    description: cohortDefinition.description,
    expressionType: 'SIMPLE_EXPRESSION',
    expression: atlasExpression,
  }

  try {
    const savedCohort = await saveCohortDefinition(atlasDefinition)

    if (!savedCohort || !savedCohort.id) {
      errorMessage.value = tv('components.cohortBuilder.saveToServerError', 'Failed to save cohort to server')
      showError.value = true
      return {}
    }

    // Sync tags via separate API calls
    const cohortId = savedCohort.id
    const currentTags = cohortTags.value
    const previousTags = loadedTags.value

    const tagsToAdd = currentTags.filter(
      current => !previousTags.some(prev => prev.id === current.id)
    )
    const tagsToRemove = previousTags.filter(
      prev => !currentTags.some(current => current.id === prev.id)
    )

    const tagFailures: string[] = []

    for (const tag of tagsToAdd) {
      if (tag.id) {
        const result = await assignTagToCohort(cohortId, tag.id)
        if (!result.success) {
          logger.warn('CohortBuilder', `Failed to assign tag ${tag.id}`, result.error)
          tagFailures.push(result.error ?? `Failed to assign tag "${tag.name}"`)
        }
      }
    }

    for (const tag of tagsToRemove) {
      if (tag.id) {
        const result = await unassignTagFromCohort(cohortId, tag.id)
        if (!result.success) {
          logger.warn('CohortBuilder', `Failed to unassign tag ${tag.id}`, result.error)
          tagFailures.push(result.error ?? `Failed to unassign tag "${tag.name}"`)
        }
      }
    }

    if (tagFailures.length > 0) {
      errorMessage.value = tagFailures.join('; ')
      showError.value = true
    }

    loadedTags.value = [...currentTags]

    cohortStore.setCohort(cohortDefinition)
    cohortStore.markClean()
    cohortStore.clearDraft()
    loadedSnapshot.value = createStateSnapshot()

    successMessage.value = tv('components.cohortBuilder.saveSuccess', 'Cohort saved successfully')
    showSuccess.value = true
    return { id: savedCohort.id, name: cohortDefinition.name }
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

function gatherConceptSets(): ConceptSetReference[] {
  const conceptSetRefs = new Map<number | string, ConceptSetReference>()

  for (const event of entryEvents.value) {
    if (event.conceptSet) {
      conceptSetRefs.set(event.conceptSet.id, event.conceptSet)
    }
  }

  return Array.from(conceptSetRefs.values())
}

// Atlas JSON Import/Export
// @ts-expect-error - Planned feature, not yet implemented in UI
async function _handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const importedCohort = await importFromFile(file)

  if (conversionError.value) {
    errorMessage.value = `Import failed: ${conversionError.value}`
    showError.value = true
    return
  }

  if (importedCohort) {
    // Cancel any pending validation during batch state update
    cancelValidation()

    // Load imported data into state
    cohortName.value = importedCohort.name || ''
    cohortDescription.value = importedCohort.description || ''
    entryEvents.value = importedCohort.entryEvents || []
    additionalCriteria.value = importedCohort.additionalCriteria
    inclusionRules.value = importedCohort.inclusionRules || []
    exitCriteria.value = importedCohort.exitCriteria ?? { strategy: 'CONTINUOUS_OBSERVATION' }
    censorWindow.value = importedCohort.censorWindow ?? null
    collapseSettings.value = importedCohort.collapseSettings ?? { collapseType: 'ERA', eraPad: 0 }
    censoringCriteria.value = importedCohort.censoringCriteria ?? []
    observationPeriod.value = importedCohort.observationPeriod ?? { priorDays: 0, postDays: 0 }
    qualifyingLimit.value = importedCohort.qualifyingLimit || 'ALL'
    primaryCriteriaLimit.value = importedCohort.primaryCriteriaLimit
    inclusionQualifyingLimit.value = importedCohort.inclusionQualifyingLimit || 'ALL'

    // Trigger validation (composable handles debouncing)
    triggerValidation()

    successMessage.value = 'Atlas JSON imported successfully'
    showSuccess.value = true
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function buildExportCohort(): CohortDefinition {
  return {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    entryEvents: entryEvents.value,
    qualifyingLimit: qualifyingLimit.value,
    primaryCriteriaLimit: primaryCriteriaLimit.value,
    inclusionQualifyingLimit: inclusionQualifyingLimit.value,
    additionalCriteria: additionalCriteria.value,
    inclusionRules: inclusionRules.value,
    conceptSets: gatherConceptSets(),
    exitCriteria: exitCriteria.value,
    observationPeriod: observationPeriod.value,
  }
}

function exportFilename(): string {
  const slug = cohortName.value.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cohort'
  return `${slug}_cohort.json`
}

function handleExportDownload() {
  downloadAtlasJSON(buildExportCohort(), exportFilename())
  if (conversionError.value) {
    errorMessage.value = tv('components.cohortBuilder.exportFailed', 'Export failed: {error}', {
      error: conversionError.value,
    })
    showError.value = true
  } else {
    successMessage.value = tv('components.cohortBuilder.exportDownloaded', 'Cohort JSON downloaded')
    showSuccess.value = true
  }
}

async function handleExportCopy() {
  const json = exportToAtlas(buildExportCohort())
  if (!json || conversionError.value) {
    errorMessage.value = tv('components.cohortBuilder.exportFailed', 'Export failed: {error}', {
      error: conversionError.value || tv('components.cohortBuilder.emptyCohort', 'Empty cohort'),
    })
    showError.value = true
    return
  }
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

// Generation functions
// @ts-expect-error - Planned feature, not yet implemented in UI
async function _handleGenerate() {
  if (!cohortId.value || !selectedSourceKey.value) {
    generationError.value = 'Please save the cohort and select a data source first'
    return
  }

  try {
    generationError.value = null

    // Start generation
    const job = await webapiStore.generateCohort(cohortId.value, selectedSourceKey.value)

    if (!job) {
      generationError.value = 'Failed to start cohort generation'
      return
    }

    successMessage.value = 'Cohort generation started'
    showSuccess.value = true
  } catch (error) {
    generationError.value = error instanceof Error ? error.message : 'Generation failed'
    logger.error('CohortBuilder', 'Generation error', error)
  }
}

// @ts-expect-error - Helper for planned generation feature
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

// @ts-expect-error - Helper for planned generation feature
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

// @ts-expect-error - Helper for planned generation feature
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
  conceptSetCount: computed(() => usedConceptSets.value.length),
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
  handleCancel,
  handleSave,
  handleExportDownload,
  handleExportCopy,
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
