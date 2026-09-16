<!--
  Feature Analysis Editor

  Working editor for all three Feature Analysis design types:
    - PRESET        (FeatureExtraction CovariateSetting JSON)
    - CRITERIA_SET  (concept sets + criteria group JSON; full criteria
                    builder integration ships in Phase 3)
    - CUSTOM_FE     (raw SQL template)

  Save / Save Copy / Delete are wired to the existing feature-analyses
  Pinia store. JSON design payloads are parsed on save with user-visible
  error reporting via the local v-snackbar.
-->
<template>
  <AnalysisBuilderShell
    :title="titleText"
    :error="storeError"
    :authorship="store.currentFA"
    :show-back="false"
    testid="feature-analysis-editor"
    @back="handleBack"
    @clear-error="store.clearError()"
  >
    <template #actions>
      <AtlasActionToolbar>
        <template #status>
          <AtlasTooltip
            v-if="isCriteriaSet"
            :text="t('cc.fa.tabs.conceptSets', 'Concept Sets').value"
            location="bottom"
          >
            <template #activator="{ props: tooltipProps }">
              <AtlasBadge
                v-bind="tooltipProps"
                :content="conceptSetCount"
                :model-value="conceptSetCount > 0"
                color="primary"
                offset-x="6"
                offset-y="6"
              >
                <AtlasIconButton
                  v-bind="{ ariaLabel: t('cc.fa.tabs.conceptSets', 'Concept Sets').value }"
                  icon="mdi-shape"
                  variant="text"
                  size="sm"
                  data-testid="feature-analysis-editor-conceptsets-icon"
                  @click="showConceptSetsDialog = true"
                />
              </AtlasBadge>
            </template>
          </AtlasTooltip>

          <AtlasTooltip
            :text="t('components.access.configureAccess', 'Configure access').value"
            location="bottom"
          >
            <template #activator="{ props: tipProps }">
              <EntityAccessLockButton
                v-bind="{ ...tipProps, ariaLabel: t('components.access.configureAccess', 'Configure access').value }"
                :disabled="!isEditing || !canWrite"
                :loading="loading"
                data-testid="feature-analysis-editor-access-icon"
                @click="showAccessDialog = true"
              />
            </template>
          </AtlasTooltip>
        </template>
        <template #actions>
          <AtlasButton
            variant="ghost"
            size="sm"
            data-testid="feature-analysis-editor-cancel"
            @click="handleBack"
          >
            <AtlasIcon class="d-md-none">
              mdi-close
            </AtlasIcon>
            <span class="d-none d-md-inline">{{ t('common.cancel', 'Cancel').value }}</span>
          </AtlasButton>
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
                data-testid="feature-analysis-editor-copy"
                @click="handleSaveCopy"
              />
            </template>
          </AtlasTooltip>
          <AtlasButton
            variant="ghost"
            tone="danger"
            icon="mdi-delete-outline"
            :disabled="!isEditing || loading || !canDelete"
            data-testid="feature-analysis-editor-delete"
            @click="handleDeleteClick"
          >
            {{ t('common.delete', 'Delete') }}
          </AtlasButton>
          <DisabledReasonTooltip :reason="saveDisabledReason">
            <AtlasButton
              variant="primary"
              :disabled="!canSave"
              :loading="saving"
              data-testid="feature-analysis-editor-save"
              @click="handleSave"
            >
              {{ t('common.save', 'Save') }}
            </AtlasButton>
          </DisabledReasonTooltip>
        </template>
      </AtlasActionToolbar>
    </template>

    <!-- Main editor card -->
    <v-card class="feature-analysis-editor__card">
      <v-card-text>
        <div class="feature-analysis-editor__type-banner">
          <AtlasChip
            variant="tonal"
            data-testid="feature-analysis-editor-type-chip"
          >
            {{ typeLabel }}
          </AtlasChip>
        </div>

        <!-- Common section -->
        <div class="feature-analysis-editor__section">
          <h2 class="feature-analysis-editor__section-title">
            {{ t('columns.name', 'Name') }}
          </h2>
          <AtlasTextField
            v-model="draft.name"
            :label="t('columns.name', 'Name').value"
            :error="nameError ?? undefined"
            variant="outlined"
            required
            data-testid="feature-analysis-editor-name"
          />

          <AtlasTextField
            v-model="draft.description"
            :label="t('columns.description', 'Description').value"
            variant="outlined"
            :rows="2"
            multiline
            auto-grow
            data-testid="feature-analysis-editor-description"
          />

          <AtlasRow>
            <AtlasCol
              cols="12"
              md="4"
            >
              <AtlasSelect
                v-model="draft.domain"
                :label="t('cc.fa.domain', 'Domain').value"
                :items="domainOptions"
                clearable
                variant="outlined"
                data-testid="feature-analysis-editor-domain"
              />
            </AtlasCol>
          </AtlasRow>
        </div>

        <!-- PRESET design -->
        <div
          v-if="isPresetDraft"
          class="feature-analysis-editor__section"
          data-testid="feature-analysis-editor-design-preset"
        >
          <h2 class="feature-analysis-editor__section-title">
            {{ t('cc.fa.featureExtractionPresetName', 'FeatureExtraction preset name') }}
          </h2>
          <AtlasTextField
            v-model="presetDesign"
            :label="t('cc.fa.featureExtractionPresetName', 'FeatureExtraction preset name').value"
            variant="outlined"
            data-testid="feature-analysis-editor-preset-name"
          />
        </div>

        <!-- CRITERIA_SET / PREVALENCE design -->
        <div
          v-else-if="isPrevalenceDraft"
          class="feature-analysis-editor__section"
          data-testid="feature-analysis-editor-design-criteria"
        >
          <FeatureAnalysisPrevalenceEditor
            :design="prevalenceDraftDesign"
            :concept-sets="prevalenceDraftConceptSets"
            :aggregates="store.aggregates"
          />
        </div>

        <!-- CRITERIA_SET / DISTRIBUTION design -->
        <div
          v-else-if="isCriteriaSetDraft"
          class="feature-analysis-editor__section"
          data-testid="feature-analysis-editor-design-criteria"
        >
          <FeatureAnalysisPrevalenceEditor
            v-if="isPrevalenceDraft"
            :design="prevalenceDraftDesign"
            :concept-sets="prevalenceDraftConceptSets"
            :aggregates="store.aggregates"
          />
          <FeatureAnalysisDistributionEditor
            v-else
            :design="distributionDraftDesign"
            :concept-sets="distributionDraftConceptSets"
            :aggregates="store.aggregates"
          />
        </div>

        <!-- CUSTOM_FE design -->
        <div
          v-else-if="draft.type === 'CUSTOM_FE'"
          class="feature-analysis-editor__section"
          data-testid="feature-analysis-editor-design-custom"
        >
          <div class="feature-analysis-editor__sql-header">
            <h2 class="feature-analysis-editor__section-title feature-analysis-editor__sql-title">
              {{ t('cc.fa.analysisSql', 'Custom SQL') }}
            </h2>

            <AtlasButton
              variant="secondary"
              size="sm"
              data-testid="feature-analysis-editor-custom-sql-sample"
              @click="fillCustomSqlSample"
            >
              {{ t('cc.fa.populateSampleSql', 'Populate Sample SQL').value }}
            </AtlasButton>

            <AtlasButton
              variant="secondary"
              size="sm"
              data-testid="feature-analysis-editor-custom-sql-copy"
              @click="copyCustomSqlTemplate"
            >
              {{ t('cc.fa.copySqlToClipboard', 'Copy Analysis SQL Template To Clipboard').value }}
            </AtlasButton>
          </div>
          <div class="feature-analysis-editor__sql-wrapper-start">
            SELECT covariate_id, covariate_name, concept_id, sum_value, average_value FROM (
          </div>
          <AtlasTextField
            v-model="customFeSql"
            :label="t('cc.fa.analysisSql', 'Custom SQL').value"
            variant="outlined"
            :rows="14"
            multiline
            auto-grow
            persistent-placeholder
            class="feature-analysis-editor__json feature-analysis-editor__sql"
            :placeholder="customSqlTemplate"
            data-testid="feature-analysis-editor-custom-sql"
          />
          <div class="feature-analysis-editor__sql-footer">
            <div class="feature-analysis-editor__sql-wrapper-end">
              )
            </div>

            <div class="feature-analysis-editor__sql-variables">
              <div class="feature-analysis-editor__sql-variables-title">
                {{ t('cc.fa.availableVariables', 'Available variables:').value }}
              </div>
              <ul>
                <li>@cdm_database_schema</li>
                <li>@cohort_table</li>
                <li>@cohort_id</li>
                <li>@analysis_id</li>
                <li>{{ t('cc.fa.availableVariablesNote', 'all variables specified in Cohort Characterization parameters').value }}</li>
              </ul>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <AtlasDialog
      v-model="showDeleteDialog"
      :eyebrow="t('views.featureAnalysisEditor.deleteEyebrow', 'CONFIRM').value"
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
          data-testid="feature-analysis-editor-delete-confirm"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <ConceptSetsListDialog
      v-model="showConceptSetsDialog"
      :concept-sets="featureAnalysisConceptSets"
      :show-delete-action="false"
      @view="handleEditConceptSet"
    >
      <template #actions>
        <AtlasButton
          variant="secondary"
          icon="mdi-plus"
          data-testid="feature-analysis-editor-conceptset-create"
          @click="createConceptSet()"
        >
          {{ t('components.conceptSetBuilder.newConceptSet', 'New concept set').value }}
        </AtlasButton>
      </template>
    </ConceptSetsListDialog>

    <EntityAccessDialog
      v-model="showAccessDialog"
      entity-type="FE_ANALYSIS"
      :entity-id="draftId"
      :title="t('components.access.configureAccess', 'Configure access').value"
      :subtitle="draft.name || undefined"
      :can-revoke-role="role => !role.name.toLowerCase().includes('admin')"
      @close="showAccessDialog = false"
    />

    <!-- Unsaved-changes confirmation dialog (same pattern as CohortBuilder.vue) -->
    <AtlasDialog
      v-model="showUnsavedDialog"
      eyebrow="ANALYSIS"
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
          data-testid="feature-analysis-editor-discard-changes"
          @click="confirmLeaveUnsaved"
        >
          {{ t('common.discard', 'Discard changes').value }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <AtlasSnackbar
      v-model="snackbar.show"
      :severity="snackbar.severity"
      :text="snackbar.message"
      :timeout="snackbar.timeout"
      data-testid="feature-analysis-editor-snackbar"
    />

    <ConceptSetEditor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="
        value => {
          if (!value) {
            conceptSetsStore.closeEditor()
          }
        }
      "
      @apply="handleConceptSetApplied"
    />
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { AtlasBadge, AtlasButton, AtlasChip, AtlasCol, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasRow, AtlasSelect, AtlasSnackbar, AtlasTextField, AtlasTooltip } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { logger } from '@/utils/logger'
import type {
  FeatureAnalysis,
  FeatureAnalysisDomain,
  FeatureAnalysisAggregate,
  FeatureAnalysisCriteriaGroupItem,
  FeatureAnalysisDistributionItem,
} from '@/models/feature-analysis.types'
import type { ConceptSet as CirceConceptSet, ConceptSetItem as CirceConceptSetItem } from '@/models/circe-types'
import type { ConceptSet as AtlasConceptSet, ConceptSetItem as AtlasConceptSetItem } from '@/models/concept-set.types'
import type { ConceptSetReference } from '@/models/cohort.types'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import FeatureAnalysisPrevalenceEditor from '@/components/feature-analyses/FeatureAnalysisPrevalenceEditor.vue'
import FeatureAnalysisDistributionEditor from '@/components/feature-analysis/FeatureAnalysisDistributionEditor.vue'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'
import { EntityAccessDialog, EntityAccessLockButton } from '@/components/access'
import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'
import { resolveSaveDisabledReason } from '@/utils/save-disabled-reason'
import { nextConceptSetId } from '@/utils/concept-set-id'
import { convertAtlasItemToCirce } from '@/components/cohort-editor/atlas-concept-set'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import ConceptSetsListDialog from '@/components/cohort/ConceptSetsListDialog.vue'

const props = defineProps<{
  id?: string
}>()

const router = useRouter()
const route = useRoute()
const { t, tv } = useI18n()
const store = useFeatureAnalysesStore()
const conceptSetsStore = useConceptSetsStore()

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

/**
 * The type/statType are chosen once, up front, via the list page's create
 * menu (Prevalence Criteria / Distribution Criteria / Custom SQL) and passed
 * as route query params - there is no in-editor type switcher. Returns null
 * when the query is missing or invalid (e.g. direct navigation to `/new`).
 */
function parseCreateQuery():
  | { type: 'CRITERIA_SET'; statType: 'PREVALENCE' }
  | { type: 'CRITERIA_SET'; statType: 'DISTRIBUTION' }
  | { type: 'CUSTOM_FE' }
  | null {
  const type = route.query.type
  const statType = route.query.statType
  if (type === 'CUSTOM_FE') return { type: 'CUSTOM_FE' }
  if (type === 'CRITERIA_SET' && statType === 'PREVALENCE') {
    return { type: 'CRITERIA_SET', statType: 'PREVALENCE' }
  }
  if (type === 'CRITERIA_SET' && statType === 'DISTRIBUTION') {
    return { type: 'CRITERIA_SET', statType: 'DISTRIBUTION' }
  }
  return null
}

function getDefaultAggregate(): FeatureAnalysisAggregate | null {
  return store.aggregates.find(aggregate => aggregate.isDefault) ?? null
}

function createEmptyPrevalenceCriteriaGroup(): FeatureAnalysisCriteriaGroupItem {
  const aggregate = getDefaultAggregate()
  return {
    name: '',
    criteriaType: 'CriteriaGroup',
    aggregate: aggregate ? { ...aggregate } : undefined,
    expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] },
  }
}

function makeEmptyDraft(): FeatureAnalysisDraft {
  const hint = parseCreateQuery()
  if (hint?.type === 'CRITERIA_SET') {
    if (hint.statType === 'PREVALENCE') {
      return {
        name: '',
        description: '',
        type: 'CRITERIA_SET',
        statType: 'PREVALENCE',
        domain: 'CONDITION',
        design: [createEmptyPrevalenceCriteriaGroup()],
        conceptSets: [],
      }
    }

    return {
      name: '',
      description: '',
      type: 'CRITERIA_SET',
      statType: 'DISTRIBUTION',
      domain: 'CONDITION',
      design: [],
      conceptSets: [],
    }
  }
  return { name: '', description: '', type: 'CUSTOM_FE', domain: 'CONDITION', design: '' }
}

const draft = ref<FeatureAnalysisDraft>(makeEmptyDraft())

// Plain-text mirror of PRESET's `design` (a FeatureExtraction preset name,
// not JSON - see FeAnalysisDeserializer.java: design.textValue()).
const presetDesign = ref<string>('')

// JSON textarea mirrors of the CRITERIA_SET `design`/`conceptSets` payload,
// kept as strings because users will paste raw JSON until the criteria
// builder UI lands. Synced into `draft.value` only on blur or save.
const criteriaConceptSetsJson = ref<string>('[]')
const criteriaDesignJson = ref<string>('[]')
const criteriaConceptSetsError = ref<string | null>(null)
const criteriaDesignError = ref<string | null>(null)

const customFeSql = ref<string>('')
const customSqlTemplate = `-- Custom analysis producing same results as Feature Extraction's "One covariate per drug in the drug_era table overlapping with any time prior to index."
SELECT
  CAST(drug_concept_id AS BIGINT) * 1000 + @analysis_id AS covariate_id,
  c.concept_name                                                                  AS covariate_name,
  drug_concept_id                                                                 AS concept_id,
  COUNT(*)                                                                        AS sum_value,
  COUNT(*) * 1.0 / stat.total_cnt * 1.0                                           AS average_value
FROM (
       SELECT DISTINCT
         drug_concept_id,
         cohort.subject_id,
         cohort.cohort_start_date
       FROM @cohort_table cohort
         INNER JOIN @cdm_database_schema.drug_era ON cohort.subject_id = drug_era.person_id
       WHERE drug_era_start_date <= cohort.cohort_start_date
             AND drug_concept_id != 0
             AND cohort.cohort_definition_id = @cohort_id
     ) drug_entries
  JOIN @cdm_database_schema.concept c ON drug_entries.drug_concept_id = c.concept_id
  CROSS JOIN (SELECT COUNT(*) total_cnt
              FROM @cohort_table
              WHERE cohort_definition_id = @cohort_id) stat
GROUP BY drug_concept_id, c.concept_name, stat.total_cnt`

const saving = ref<boolean>(false)
const showDeleteDialog = ref<boolean>(false)
const showConceptSetsDialog = ref<boolean>(false)
const showAccessDialog = ref<boolean>(false)
const showUnsavedDialog = ref<boolean>(false)
const nameError = ref<string | null>(null)
const dirty = ref<boolean>(false)
// Unsaved-changes navigation guard state (mirrors CohortBuilder.vue) - see
// the onBeforeRouteLeave comment near the bottom of this file for why a
// plain confirmed-flag + re-push is needed instead of holding onto `next`.
let pendingNavigation: (() => void) | null = null
const isConfirmingNavigation = ref(false)

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

function convertCirceItemToAtlas(item: CirceConceptSetItem): AtlasConceptSetItem {
  const concept = item.concept
  return {
    conceptId: concept?.CONCEPT_ID ?? 0,
    conceptName: concept?.CONCEPT_NAME ?? '',
    conceptCode: concept?.CONCEPT_CODE ?? '',
    domainId: concept?.DOMAIN_ID ?? '',
    vocabularyId: concept?.VOCABULARY_ID ?? '',
    conceptClassId: concept?.CONCEPT_CLASS_ID ?? '',
    standardConcept: concept?.STANDARD_CONCEPT ?? null,
    invalidReason: concept?.INVALID_REASON ?? null,
    isExcluded: item.isExcluded ?? false,
    includeDescendants: item.includeDescendants ?? false,
    includeMapped: item.includeMapped ?? false,
  }
}

function createConceptSet() {
  showConceptSetsDialog.value = false
  conceptSetsStore.openCreateEditor()
}

function handleEditConceptSet(set: ConceptSetReference) {
  showConceptSetsDialog.value = false
  conceptSetsStore.openEmbeddedEditor({
    id: set.id ?? nextConceptSetId(featureAnalysisConceptSets.value),
    name: set.name,
    items: [...(set.items ?? [])] as AtlasConceptSetItem[],
  })
}

function handleConceptSetApplied(set: AtlasConceptSet) {
  if (!isCriteriaSet.value) return

  const items = (set.items ?? []).map(convertAtlasItemToCirce)
  const finalId = typeof set.id === 'number'
    ? set.id
    : nextConceptSetId(featureAnalysisConceptSets.value)

  const current = draft.value
  if (current.type !== 'CRITERIA_SET') return

  const existingIndex = current.conceptSets.findIndex((existing: CirceConceptSet) => existing.id === finalId)
  const nextConceptSet = {
    id: finalId,
    name: set.name,
    expression: { items },
  }

  if (existingIndex >= 0) {
    current.conceptSets[existingIndex] = nextConceptSet
  } else {
    current.conceptSets.push(nextConceptSet)
  }

  showConceptSetsDialog.value = true
}

// ---------------------------------------------------------------------------
// Routing helpers
// ---------------------------------------------------------------------------

const isEditing = computed<boolean>(() => Boolean(props.id))

const titleText = computed(() => {
  return isEditing.value
    ? t('featureAnalyses.editor.title.edit', 'Edit Feature Analysis').value
    : t('cc.new', 'New Feature Analysis').value
})

// ---------------------------------------------------------------------------
// Static select options
// ---------------------------------------------------------------------------

const typeLabel = computed<string>(() => {
  const current = draft.value
  if (current.type !== 'CRITERIA_SET') {
    return current.type === 'PRESET'
      ? t('cc.fa.preset', 'Preset').value
      : t('cc.fa.custom', 'Custom SQL').value
  }
  return current.statType === 'DISTRIBUTION'
    ? t('featureAnalyses.create.distribution', 'Distribution Criteria').value
    : t('featureAnalyses.create.prevalence', 'Prevalence Criteria').value
})

const domainOptions = computed<string[]>(() => store.domains)
const defaultAggregate = computed<FeatureAnalysisAggregate | null>(() => getDefaultAggregate())
const isCriteriaSet = computed(() => draft.value.type === 'CRITERIA_SET')
const conceptSetCount = computed(() => {
  const current = draft.value
  return current.type === 'CRITERIA_SET' ? current.conceptSets.length : 0
})
const featureAnalysisConceptSets = computed<ConceptSetReference[]>(() => {
  const current = draft.value
  if (current.type !== 'CRITERIA_SET') return []
  return current.conceptSets.map((set: CirceConceptSet, index: number) => ({
    id: set.id ?? index,
    name: set.name ?? '',
    items: ((set.expression?.items ?? []) as CirceConceptSetItem[]).map(convertCirceItemToAtlas),
  }))
})

const storeError = computed<string | null>(() => store.error)
const loading = computed<boolean>(() => store.loading)

const isPresetDraft = computed(() => draft.value.type === 'PRESET')
const isCriteriaSetDraft = computed(() => draft.value.type === 'CRITERIA_SET')
const isPrevalenceDraft = computed(() => {
  const current = draft.value
  return current.type === 'CRITERIA_SET' && current.statType === 'PREVALENCE'
})

const prevalenceDraftDesign = computed<FeatureAnalysisCriteriaGroupItem[]>(() =>
  (() => {
    const current = draft.value
    return current.type === 'CRITERIA_SET' && current.statType === 'PREVALENCE'
      ? current.design
      : []
  })()
)

const prevalenceDraftConceptSets = computed<CirceConceptSet[]>(() =>
  (() => {
    const current = draft.value
    return current.type === 'CRITERIA_SET' && current.statType === 'PREVALENCE'
      ? current.conceptSets
      : []
  })()
)

const distributionDraftDesign = computed<FeatureAnalysisDistributionItem[]>(() =>
  (() => {
    const current = draft.value
    return current.type === 'CRITERIA_SET' && current.statType === 'DISTRIBUTION'
      ? current.design
      : []
  })()
)

const distributionDraftConceptSets = computed<CirceConceptSet[]>(() =>
  (() => {
    const current = draft.value
    return current.type === 'CRITERIA_SET' && current.statType === 'DISTRIBUTION'
      ? current.conceptSets
      : []
  })()
)

// ---------------------------------------------------------------------------
// Save guard
// ---------------------------------------------------------------------------

// Permission gating: new FAs need create:feature-analysis; existing ones
// need write access on the specific entity (ownership counts).
const draftId = computed<number | null>(() => {
  const current = draft.value
  return typeof current.id === 'number' ? current.id : null
})
const { hasPermission } = usePermissions()
const { canWrite, canDelete } = useEntityAccess('feAnalysis', draftId)
const canCopy = computed<boolean>(() => hasPermission('create:feature-analysis'))

const canSave = computed<boolean>(() => {
  if (saving.value || loading.value) return false
  if (draft.value.name.trim().length === 0) return false
  return isEditing.value ? canWrite.value : hasPermission('create:feature-analysis')
})

const saveDisabledReason = computed<string>(() =>
  resolveSaveDisabledReason({
    entity: tv('const.entityName.featureAnalysis', 'feature analysis'),
    isNew: !isEditing.value,
    hasName: draft.value.name.trim().length > 0,
    hasPermission: isEditing.value ? canWrite.value : hasPermission('create:feature-analysis'),
    isSaving: saving.value || loading.value,
    translate: tv,
  })
)

const deleteMessage = computed<string>(() => {
  return t(
    'featureAnalyses.editor.deleteConfirm',
    `Delete feature analysis '${draft.value.name}'?`,
    { name: draft.value.name }
  ).value
})

type FeatureAnalysisDraftBase = {
  id?: number
  name: string
  description: string
  domain?: string
}

type FeatureAnalysisDraft =
  | (FeatureAnalysisDraftBase & {
      type: 'PRESET' | 'CUSTOM_FE'
      design: string
    })
  | (FeatureAnalysisDraftBase & {
      type: 'CRITERIA_SET'
      statType: 'PREVALENCE'
      design: FeatureAnalysisCriteriaGroupItem[]
      conceptSets: CirceConceptSet[]
    })
  | (FeatureAnalysisDraftBase & {
      type: 'CRITERIA_SET'
      statType: 'DISTRIBUTION'
      design: FeatureAnalysisDistributionItem[]
      conceptSets: CirceConceptSet[]
    })

// ---------------------------------------------------------------------------
// Hydration: when the store's currentFA changes, copy it into the local draft.
// We always make a shallow clone so editing never mutates the store.
// ---------------------------------------------------------------------------

function hydrateDraftFrom(fa: FeatureAnalysis | null) {
  suppressDirtyTracking = true
  if (!fa) {
    draft.value = makeEmptyDraft()
    presetDesign.value = ''
    criteriaConceptSetsJson.value = '[]'
    criteriaDesignJson.value = '[]'
    customFeSql.value = ''
    criteriaConceptSetsError.value = null
    criteriaDesignError.value = null
    dirty.value = false
    nextTick(() => {
      suppressDirtyTracking = false
    })
    return
  }

  draft.value = {
    ...fa,
    description: fa.description ?? '',
  }

  // Mirror design into the textarea(s) appropriate to the type.
  presetDesign.value = ''
  criteriaConceptSetsJson.value = '[]'
  criteriaDesignJson.value = '[]'
  customFeSql.value = ''

  if (fa.type === 'PRESET') {
    presetDesign.value = fa.design
  } else if (fa.type === 'CUSTOM_FE') {
    customFeSql.value = fa.design
  } else if (fa.type === 'CRITERIA_SET' && fa.statType === 'DISTRIBUTION') {
    // PREVALENCE rows are edited directly via FeatureAnalysisPrevalenceEditor,
    // which mutates draft.value.design/conceptSets in place - no JSON mirror needed.
    criteriaConceptSetsJson.value = JSON.stringify(fa.conceptSets ?? [], null, 2)
    criteriaDesignJson.value = JSON.stringify(fa.design ?? [], null, 2)
  }

  criteriaConceptSetsError.value = null
  criteriaDesignError.value = null
  suppressDirtyTracking = true
  dirty.value = false
  nextTick(() => {
    suppressDirtyTracking = false
  })
}

watch(
  () => store.currentFA,
  fa => {
    hydrateDraftFrom(fa)
  },
  { immediate: false }
)

// Track dirty state on any user-driven change. Type/statType are fixed at
// creation (chosen via the list page's create menu) and never change again,
// so they aren't watched here. Guarded by `suppressDirtyTracking` so
// hydrateDraftFrom's own assignment doesn't immediately re-mark the form dirty.
let suppressDirtyTracking = false

watch(
  [
    () => draft.value.name,
    () => draft.value.description,
    () => draft.value.domain,
    presetDesign,
    criteriaConceptSetsJson,
    criteriaDesignJson,
    customFeSql,
  ],
  () => {
    if (suppressDirtyTracking) return
    dirty.value = true
    if (nameError.value && draft.value.name.trim().length > 0) {
      nameError.value = null
    }
  }
)

// FeatureAnalysisPrevalenceEditor mutates draft.value.design/conceptSets in
// place (same convention CriteriaGroup.vue uses for its own `group` prop),
// so a deep watch is the only way to catch those edits for dirty-tracking.
watch(
  () => draft.value,
  () => {
    if (suppressDirtyTracking) return
    dirty.value = true
  },
  { deep: true }
)

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Build the full save payload for the current type. Constructs one of the
 * discriminated `FeatureAnalysis` variants directly (rather than merging
 * fields into a generic shape) so the result always matches a valid wire
 * shape. Returns null on validation failure (and surfaces the error to the user).
 */
function buildPayload(): FeatureAnalysis | null {
  const current = draft.value
  const base = {
    id: current.id,
    name: current.name.trim(),
    description: current.description,
    domain: current.domain as FeatureAnalysisDomain | undefined,
  }

  if (current.type === 'PRESET') {
    return { ...base, type: 'PRESET', design: presetDesign.value }
  }

  if (current.type !== 'CRITERIA_SET') {
    return { ...base, type: 'CUSTOM_FE', design: customFeSql.value }
  }

  if (current.statType === 'PREVALENCE') {
    const aggregate = defaultAggregate.value
    if (!aggregate) {
      showSnackbar(
        t('featureAnalyses.editor.aggregatesUnavailable', 'Unable to load the default aggregate').value,
        'error'
      )
      return null
    }
    // Edited directly via FeatureAnalysisPrevalenceEditor - draft.value.design/
    // conceptSets are already up to date, no JSON parsing needed.
    return {
      ...base,
      type: 'CRITERIA_SET',
      statType: 'PREVALENCE',
      design: current.design.map((row: FeatureAnalysisCriteriaGroupItem) =>
        row.aggregate ? row : { ...row, aggregate: { ...aggregate } }
      ),
      conceptSets: current.conceptSets,
    }
  }

  return {
    ...base,
    type: 'CRITERIA_SET',
    statType: 'DISTRIBUTION',
    design: current.design,
    conceptSets: current.conceptSets,
  }
}

async function handleSave() {
  const payload = buildPayload()
  if (!payload) return

  saving.value = true
  try {
    const saved = isEditing.value
      ? await store.update(payload)
      : await store.create(payload)

    if (saved?.id !== undefined) {
      dirty.value = false
      await router.push(`/feature-analyses/${saved.id}`)
    } else if (!store.error) {
      showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
    }
  } catch (err) {
    logger.error('FeatureAnalysisEditor', 'Save failed', err)
    showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
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
      dirty.value = false
      await router.push(`/feature-analyses/${copied.id}`)
    } else {
      showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
    }
  } catch (err) {
    logger.error('FeatureAnalysisEditor', 'Save Copy failed', err)
    showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
  } finally {
    saving.value = false
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
    dirty.value = false
    showDeleteDialog.value = false
    await router.push('/feature-analyses')
  } else {
    showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
  }
}

function handleBack() {
  // onBeforeRouteLeave is the single gatekeeper for the unsaved-changes
  // prompt; confirming here too would show the dialog twice for one click.
  router.push('/feature-analyses')
}

function fillCustomSqlSample() {
  customFeSql.value = customSqlTemplate
}

async function copyCustomSqlTemplate() {
  try {
    await navigator.clipboard.writeText(customSqlTemplate)
    showSnackbar(t('cc.fa.copiedToClipboard', 'Copied To Clipboard!').value, 'success')
  } catch (error) {
    logger.error('FeatureAnalysisEditor', 'Failed to copy custom SQL template', error)
    showSnackbar('Failed to copy SQL template', 'error')
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  // Domain applies to every type (top-level selector). Criteria-set analyses
  // also need aggregate metadata so prevalence rows can default to the first
  // server-provided aggregate.
  store.loadDomains().catch(err => {
    logger.error('FeatureAnalysisEditor', 'Failed to load domains', err)
  })

  if (props.id) {
    const numericId = Number(props.id)
    if (Number.isNaN(numericId)) {
      router.push('/feature-analyses')
      return
    }
    await store.fetchOne(numericId)
    if (store.currentFA?.type === 'CRITERIA_SET') {
      await store.loadAggregates().catch(err => {
        logger.error('FeatureAnalysisEditor', 'Failed to load aggregates', err)
      })
    }
    hydrateDraftFrom(store.currentFA)
  } else {
    // The list page's create menu always supplies a type (and statType, for
    // Criteria Set) via the route query; direct navigation without one has
    // nowhere valid to land, so send it back to the list.
    const hint = parseCreateQuery()
    if (!hint) {
      await router.replace('/feature-analyses')
      return
    }
    if (hint.type === 'CRITERIA_SET') {
      await store.loadAggregates().catch(err => {
        logger.error('FeatureAnalysisEditor', 'Failed to load aggregates', err)
      })
    }
    store.clearCurrent()
    hydrateDraftFrom(null)
  }
})

// The confirm step opens a styled AtlasDialog instead of the native
// window.confirm. We can't hold onto `next` and call it after the user
// confirms - `next(false)` permanently aborts the original navigation.
// Instead we remember the target route and re-push it via router.push once
// confirmLeaveUnsaved fires (same pattern as CohortBuilder.vue).
let navigationConfirmed = false
onBeforeRouteLeave((to, _from, next) => {
  if (!dirty.value || navigationConfirmed) {
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
</script>


<style scoped>
.feature-analysis-editor__card {
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: none !important;
}

.feature-analysis-editor__section {
  margin-bottom: 16px;
}

.feature-analysis-editor__section-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 8px 0 12px 0;
}

.feature-analysis-editor__type-banner {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.feature-analysis-editor__preset-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.feature-analysis-editor__sql-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.feature-analysis-editor__sql-title {
  margin-right: auto;
}

.feature-analysis-editor__sql-wrapper-start {
  margin-bottom: 8px;
}

.feature-analysis-editor__sql-wrapper-end {
  margin-top: 4px;
  margin-bottom: 8px;
}

.feature-analysis-editor__sql-variables {
  margin-top: 8px;
}

.feature-analysis-editor__sql-variables-title {
  margin-bottom: 6px;
}

.feature-analysis-editor__json :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
}

.feature-analysis-editor__sql :deep(textarea) {
  white-space: pre;
}

</style>
