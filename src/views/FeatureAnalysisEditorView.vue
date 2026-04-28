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
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="feature-analysis-editor"
      >
        <!-- Toolbar -->
        <div class="feature-analysis-editor__toolbar">
          <div class="feature-analysis-editor__toolbar-left">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-testid="feature-analysis-editor-back"
              @click="handleBack"
            >
              {{ t('featureAnalyses.editor.actions.back', 'Back') }}
            </v-btn>
            <h1 class="feature-analysis-editor__title">
              {{ titleText }}
            </h1>
          </div>
          <div class="feature-analysis-editor__toolbar-right">
            <v-btn
              v-if="isEditing"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-content-copy"
              :disabled="loading"
              data-testid="feature-analysis-editor-copy"
              @click="handleSaveCopy"
            >
              {{ t('common.createACopy', 'Save as Copy') }}
            </v-btn>
            <v-btn
              v-if="isEditing"
              variant="outlined"
              color="error"
              prepend-icon="mdi-delete"
              :disabled="loading"
              data-testid="feature-analysis-editor-delete"
              @click="handleDeleteClick"
            >
              {{ t('common.delete', 'Delete') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-content-save"
              :disabled="!canSave"
              :loading="saving"
              data-testid="feature-analysis-editor-save"
              @click="handleSave"
            >
              {{ t('common.save', 'Save') }}
            </v-btn>
          </div>
        </div>

        <!-- Error from store -->
        <v-alert
          v-if="storeError"
          type="error"
          variant="tonal"
          closable
          class="mb-4"
          data-testid="feature-analysis-editor-error"
          @click:close="store.clearError()"
        >
          {{ storeError }}
        </v-alert>

        <!-- Main editor card -->
        <v-card class="feature-analysis-editor__card">
          <v-card-text>
            <!-- Common section -->
            <div class="feature-analysis-editor__section">
              <h2 class="feature-analysis-editor__section-title">
                {{ t('columns.name', 'Name') }}
              </h2>
              <v-text-field
                v-model="draft.name"
                :label="t('columns.name', 'Name').value"
                :error-messages="nameError"
                density="comfortable"
                variant="outlined"
                required
                data-testid="feature-analysis-editor-name"
              />

              <v-textarea
                v-model="draft.description"
                :label="t('columns.description', 'Description').value"
                density="comfortable"
                variant="outlined"
                rows="2"
                auto-grow
                data-testid="feature-analysis-editor-description"
              />

              <v-row>
                <v-col
                  cols="12"
                  md="4"
                >
                  <v-select
                    v-model="draft.type"
                    :label="t('cc.fa.analysisType', 'Type').value"
                    :items="typeOptions"
                    item-title="label"
                    item-value="value"
                    :disabled="isEditing"
                    density="comfortable"
                    variant="outlined"
                    data-testid="feature-analysis-editor-type"
                  />
                </v-col>
                <v-col
                  cols="12"
                  md="4"
                >
                  <v-select
                    v-model="draft.domain"
                    :label="t('cc.fa.domain', 'Domain').value"
                    :items="domainOptions"
                    clearable
                    density="comfortable"
                    variant="outlined"
                    data-testid="feature-analysis-editor-domain"
                  />
                </v-col>
                <v-col
                  cols="12"
                  md="4"
                >
                  <v-select
                    v-model="draft.statType"
                    :label="t('cc.fa.analysisType', 'Stat Type').value"
                    :items="statTypeOptions"
                    clearable
                    density="comfortable"
                    variant="outlined"
                    data-testid="feature-analysis-editor-statType"
                  />
                </v-col>
              </v-row>
            </div>

            <!-- PRESET design -->
            <div
              v-if="draft.type === 'PRESET'"
              class="feature-analysis-editor__section"
              data-testid="feature-analysis-editor-design-preset"
            >
              <h2 class="feature-analysis-editor__section-title">
                {{ t('cc.fa.design', 'Covariate settings (JSON)') }}
              </h2>
              <div class="feature-analysis-editor__preset-actions">
                <v-btn
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-download"
                  :loading="loadingDefaults"
                  data-testid="feature-analysis-editor-preset-default"
                  @click="loadDefaultCovariateSettings(false)"
                >
                  {{ t('featureAnalyses.editor.preset.loadDefault', 'Load default covariate settings') }}
                </v-btn>
                <v-btn
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-clock-outline"
                  :loading="loadingDefaults"
                  data-testid="feature-analysis-editor-preset-default-temporal"
                  @click="loadDefaultCovariateSettings(true)"
                >
                  {{ t('featureAnalyses.editor.preset.loadDefaultTemporal', 'Load default temporal covariate settings') }}
                </v-btn>
                <v-chip
                  v-if="presetJsonError"
                  color="error"
                  size="small"
                  variant="tonal"
                  data-testid="feature-analysis-editor-preset-invalid"
                >
                  {{ t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON') }}
                </v-chip>
              </div>
              <v-textarea
                v-model="presetDesignJson"
                :label="t('cc.fa.design', 'Covariate settings (JSON)').value"
                density="comfortable"
                variant="outlined"
                rows="14"
                auto-grow
                class="feature-analysis-editor__json"
                data-testid="feature-analysis-editor-preset-json"
                @blur="validatePresetJson"
              />
            </div>

            <!-- CRITERIA_SET design -->
            <div
              v-else-if="draft.type === 'CRITERIA_SET'"
              class="feature-analysis-editor__section"
              data-testid="feature-analysis-editor-design-criteria"
            >
              <h2 class="feature-analysis-editor__section-title">
                {{ t('cc.fa.criteria', 'Criteria Set') }}
              </h2>
              <p class="text-body-2 text-grey mb-2">
                {{ t('featureAnalyses.editor.criteriaSet.explainer', 'Criteria builder integration ships in Phase 3. For now, edit JSON directly.') }}
              </p>
              <v-textarea
                v-model="criteriaConceptSetsJson"
                :label="t('cc.fa.tabs.conceptSets', 'Concept sets (JSON array)').value"
                :error-messages="criteriaConceptSetsError"
                density="comfortable"
                variant="outlined"
                rows="6"
                auto-grow
                class="feature-analysis-editor__json"
                data-testid="feature-analysis-editor-criteria-conceptsets-json"
                @blur="validateCriteriaConceptSetsJson"
              />
              <v-textarea
                v-model="criteriaCriteriaJson"
                :label="t('cc.fa.criteria', 'Criteria group (JSON)').value"
                :error-messages="criteriaCriteriaError"
                density="comfortable"
                variant="outlined"
                rows="10"
                auto-grow
                class="feature-analysis-editor__json"
                data-testid="feature-analysis-editor-criteria-criteria-json"
                @blur="validateCriteriaCriteriaJson"
              />
            </div>

            <!-- CUSTOM_FE design -->
            <div
              v-else-if="draft.type === 'CUSTOM_FE'"
              class="feature-analysis-editor__section"
              data-testid="feature-analysis-editor-design-custom"
            >
              <h2 class="feature-analysis-editor__section-title">
                {{ t('cc.fa.analysisSql', 'Custom SQL') }}
              </h2>
              <v-textarea
                v-model="customFeSql"
                :label="t('cc.fa.analysisSql', 'Custom SQL').value"
                density="comfortable"
                variant="outlined"
                rows="14"
                auto-grow
                class="feature-analysis-editor__json feature-analysis-editor__sql"
                data-testid="feature-analysis-editor-custom-sql"
              />
            </div>
          </v-card-text>
        </v-card>

        <!-- Delete confirmation dialog -->
        <v-dialog
          v-model="showDeleteDialog"
          max-width="500"
        >
          <v-card>
            <v-card-title class="text-h5">
              {{ t('common.delete', 'Delete') }}
            </v-card-title>
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
                variant="elevated"
                :loading="loading"
                data-testid="feature-analysis-editor-delete-confirm"
                @click="confirmDelete"
              >
                {{ t('common.delete', 'Delete') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Error snackbar -->
        <v-snackbar
          v-model="snackbar.show"
          :color="snackbar.color"
          :timeout="snackbar.timeout"
          data-testid="feature-analysis-editor-snackbar"
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
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { getDefaultCovariateSettings } from '@/services/feature-analysis.service'
import { logger } from '@/utils/logger'
import type {
  FeatureAnalysis,
  FeatureAnalysisType,
  CovariateSetting,
  FeatureAnalysisCriteriaSetDesign,
} from '@/models/feature-analysis.types'
import type { ConceptSetReference } from '@/models/concept-set.types'

const props = defineProps<{
  id?: string
}>()

const router = useRouter()
const { t } = useI18n()
const store = useFeatureAnalysesStore()

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

function makeEmptyDraft(): FeatureAnalysis {
  return {
    name: '',
    description: '',
    type: 'PRESET',
    domain: undefined,
    statType: undefined,
    design: {} as CovariateSetting,
  }
}

const draft = ref<FeatureAnalysis>(makeEmptyDraft())

// JSON textarea mirrors of the typed `draft.design` payload, kept as strings
// because users will paste raw JSON. We sync them into `draft.design` only on
// blur or save (never on every keystroke).
const presetDesignJson = ref<string>('{}')
const presetJsonError = ref<string | null>(null)

const criteriaConceptSetsJson = ref<string>('[]')
const criteriaCriteriaJson = ref<string>('{}')
const criteriaConceptSetsError = ref<string | null>(null)
const criteriaCriteriaError = ref<string | null>(null)

const customFeSql = ref<string>('')

const saving = ref<boolean>(false)
const loadingDefaults = ref<boolean>(false)
const showDeleteDialog = ref<boolean>(false)
const nameError = ref<string | null>(null)
const dirty = ref<boolean>(false)

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

const typeOptions = computed(() => [
  {
    value: 'PRESET' as FeatureAnalysisType,
    label: t('cc.fa.preset', 'Preset (FeatureExtraction settings)').value,
  },
  {
    value: 'CRITERIA_SET' as FeatureAnalysisType,
    label: t('cc.fa.criteria', 'Criteria Set').value,
  },
  {
    value: 'CUSTOM_FE' as FeatureAnalysisType,
    label: t('cc.fa.custom', 'Custom SQL').value,
  },
])

const statTypeOptions = ['PREVALENCE', 'DISTRIBUTION']

const domainOptions = computed<string[]>(() => store.domains)

const storeError = computed<string | null>(() => store.error)
const loading = computed<boolean>(() => store.loading)

// ---------------------------------------------------------------------------
// Save guard
// ---------------------------------------------------------------------------

const canSave = computed<boolean>(() => {
  if (saving.value || loading.value) return false
  return draft.value.name.trim().length > 0
})

const deleteMessage = computed<string>(() => {
  return t(
    'featureAnalyses.editor.deleteConfirm',
    `Delete feature analysis '${draft.value.name}'?`,
    { name: draft.value.name }
  ).value
})

// ---------------------------------------------------------------------------
// Hydration: when the store's currentFA changes, copy it into the local draft.
// We always make a shallow clone so editing never mutates the store.
// ---------------------------------------------------------------------------

function hydrateDraftFrom(fa: FeatureAnalysis | null) {
  if (!fa) {
    draft.value = makeEmptyDraft()
    presetDesignJson.value = '{}'
    criteriaConceptSetsJson.value = '[]'
    criteriaCriteriaJson.value = '{}'
    customFeSql.value = ''
    presetJsonError.value = null
    criteriaConceptSetsError.value = null
    criteriaCriteriaError.value = null
    dirty.value = false
    return
  }

  draft.value = {
    ...fa,
    description: fa.description ?? '',
  }

  // Mirror design into the textarea(s) appropriate to the type.
  if (fa.type === 'PRESET') {
    const designObj = (fa.design as CovariateSetting) ?? {}
    presetDesignJson.value = JSON.stringify(designObj, null, 2)
    criteriaConceptSetsJson.value = '[]'
    criteriaCriteriaJson.value = '{}'
    customFeSql.value = ''
  } else if (fa.type === 'CRITERIA_SET') {
    const designObj = fa.design as Partial<FeatureAnalysisCriteriaSetDesign> | undefined
    criteriaConceptSetsJson.value = JSON.stringify(designObj?.conceptSets ?? [], null, 2)
    criteriaCriteriaJson.value = JSON.stringify(designObj?.criteria ?? {}, null, 2)
    presetDesignJson.value = '{}'
    customFeSql.value = ''
  } else if (fa.type === 'CUSTOM_FE') {
    customFeSql.value = typeof fa.design === 'string' ? fa.design : ''
    presetDesignJson.value = '{}'
    criteriaConceptSetsJson.value = '[]'
    criteriaCriteriaJson.value = '{}'
  }

  presetJsonError.value = null
  criteriaConceptSetsError.value = null
  criteriaCriteriaError.value = null
  dirty.value = false
}

watch(
  () => store.currentFA,
  (fa) => {
    hydrateDraftFrom(fa)
  },
  { immediate: false }
)

// Track dirty state on any user-driven change.
watch(
  [
    () => draft.value.name,
    () => draft.value.description,
    () => draft.value.type,
    () => draft.value.domain,
    () => draft.value.statType,
    presetDesignJson,
    criteriaConceptSetsJson,
    criteriaCriteriaJson,
    customFeSql,
  ],
  () => {
    dirty.value = true
    if (nameError.value && draft.value.name.trim().length > 0) {
      nameError.value = null
    }
  }
)

// ---------------------------------------------------------------------------
// JSON validators
// ---------------------------------------------------------------------------

function validatePresetJson(): boolean {
  try {
    const parsed = JSON.parse(presetDesignJson.value || '{}')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      presetJsonError.value = t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value
      return false
    }
    presetJsonError.value = null
    return true
  } catch {
    presetJsonError.value = t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value
    return false
  }
}

function validateCriteriaConceptSetsJson(): boolean {
  try {
    const parsed = JSON.parse(criteriaConceptSetsJson.value || '[]')
    if (!Array.isArray(parsed)) {
      criteriaConceptSetsError.value = t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value
      return false
    }
    criteriaConceptSetsError.value = null
    return true
  } catch {
    criteriaConceptSetsError.value = t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value
    return false
  }
}

function validateCriteriaCriteriaJson(): boolean {
  try {
    JSON.parse(criteriaCriteriaJson.value || '{}')
    criteriaCriteriaError.value = null
    return true
  } catch {
    criteriaCriteriaError.value = t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value
    return false
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function loadDefaultCovariateSettings(temporal: boolean) {
  loadingDefaults.value = true
  try {
    const defaults = await getDefaultCovariateSettings(temporal)
    presetDesignJson.value = JSON.stringify(defaults, null, 2)
    presetJsonError.value = null
    dirty.value = true
  } catch (err) {
    logger.error('FeatureAnalysisEditor', 'Failed to load default covariate settings', err)
    showSnackbar(
      t('cc.fa.saveError', 'Failed to save feature analysis').value,
      'error'
    )
  } finally {
    loadingDefaults.value = false
  }
}

/**
 * Build the design payload appropriate for the current type.
 * Returns null on validation failure (and surfaces the error to the user).
 */
function buildDesign(): CovariateSetting | FeatureAnalysisCriteriaSetDesign | string | null {
  if (draft.value.type === 'PRESET') {
    if (!validatePresetJson()) {
      showSnackbar(
        t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value,
        'error'
      )
      return null
    }
    try {
      return JSON.parse(presetDesignJson.value || '{}') as CovariateSetting
    } catch {
      return null
    }
  }

  if (draft.value.type === 'CRITERIA_SET') {
    const conceptSetsOk = validateCriteriaConceptSetsJson()
    const criteriaOk = validateCriteriaCriteriaJson()
    if (!conceptSetsOk || !criteriaOk) {
      showSnackbar(
        t('featureAnalyses.editor.preset.invalidJson', 'Invalid JSON').value,
        'error'
      )
      return null
    }
    try {
      const conceptSets = JSON.parse(criteriaConceptSetsJson.value || '[]') as ConceptSetReference[]
      const criteria = JSON.parse(criteriaCriteriaJson.value || '{}')
      return { conceptSets, criteria }
    } catch {
      return null
    }
  }

  // CUSTOM_FE
  return customFeSql.value
}

async function handleSave() {
  if (draft.value.name.trim().length === 0) {
    nameError.value = t('cc.fa.designOrNameAreEmpty', 'Name is required').value
    return
  }

  const design = buildDesign()
  if (design === null) return

  saving.value = true
  try {
    const payload: FeatureAnalysis = {
      ...draft.value,
      design,
    }

    if (isEditing.value) {
      const updated = await store.update(payload)
      if (updated) {
        showSnackbar(t('featureAnalyses.editor.saveSuccess', 'Feature analysis saved').value, 'success')
        dirty.value = false
      } else {
        showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
      }
    } else {
      const created = await store.create(payload)
      if (created?.id) {
        showSnackbar(t('featureAnalyses.editor.saveSuccess', 'Feature analysis saved').value, 'success')
        dirty.value = false
        await router.push(`/feature-analyses/${created.id}`)
      } else {
        showSnackbar(t('cc.fa.saveError', 'Failed to save feature analysis').value, 'error')
      }
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
  if (dirty.value) {
    const confirmed = window.confirm(
      t('cc.fa.unsavedConfirmation', 'You have unsaved changes. Leave anyway?').value
    )
    if (!confirmed) return
  }
  router.push('/feature-analyses')
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  // Always make sure the lookup data is loaded — the editor needs domain/aggregate options.
  store.loadDomains().catch((err) => {
    logger.error('FeatureAnalysisEditor', 'Failed to load domains', err)
  })
  store.loadAggregates().catch((err) => {
    logger.error('FeatureAnalysisEditor', 'Failed to load aggregates', err)
  })

  if (props.id) {
    const numericId = Number(props.id)
    if (Number.isNaN(numericId)) {
      router.push('/feature-analyses')
      return
    }
    await store.fetchOne(numericId)
    hydrateDraftFrom(store.currentFA)
  } else {
    store.clearCurrent()
    hydrateDraftFrom(null)
  }
})

onBeforeRouteLeave((_to, _from, next) => {
  if (!dirty.value) {
    next()
    return
  }
  const confirmed = window.confirm(
    t('cc.fa.unsavedConfirmation', 'You have unsaved changes. Leave anyway?').value
  )
  next(confirmed)
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

.feature-analysis-editor {
  padding: 0;
}

.feature-analysis-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.feature-analysis-editor__toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-analysis-editor__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.feature-analysis-editor__title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
}

.feature-analysis-editor__card {
  padding: 8px;
}

.feature-analysis-editor__section {
  margin-bottom: 16px;
}

.feature-analysis-editor__section-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 8px 0 12px 0;
}

.feature-analysis-editor__preset-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.feature-analysis-editor__json :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
}

.feature-analysis-editor__sql :deep(textarea) {
  white-space: pre;
}
</style>
