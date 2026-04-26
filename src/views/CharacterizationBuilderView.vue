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
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="char-builder"
      >
        <!-- Toolbar -->
        <div class="char-builder__toolbar">
          <div class="char-builder__toolbar-left">
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-testid="char-builder-back"
              @click="handleBack"
            >
              {{ t('characterizations.editor.actions.back', 'Back') }}
            </v-btn>
            <h1 class="char-builder__title">
              {{ titleText }}
            </h1>
          </div>
          <div class="char-builder__toolbar-right">
            <v-tooltip
              location="top"
              :text="runDisabledReason"
              :disabled="!runDisabledReason"
            >
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    prepend-icon="mdi-play"
                    :disabled="!canRun"
                    data-testid="char-builder-run"
                    @click="handleRunClick"
                  >
                    {{ t('characterizations.editor.actions.run', 'Run') }}
                  </v-btn>
                </div>
              </template>
            </v-tooltip>
            <v-btn
              v-if="isEditing"
              variant="outlined"
              color="primary"
              prepend-icon="mdi-content-copy"
              :disabled="loading"
              data-testid="char-builder-copy"
              @click="handleSaveCopy"
            >
              {{ t('characterizations.editor.actions.saveCopy', 'Save as Copy') }}
            </v-btn>
            <v-btn
              v-if="isEditing"
              variant="outlined"
              color="error"
              prepend-icon="mdi-delete"
              :disabled="loading"
              data-testid="char-builder-delete"
              @click="handleDeleteClick"
            >
              {{ t('characterizations.editor.actions.delete', 'Delete') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-content-save"
              :disabled="!canSave"
              :loading="saving"
              data-testid="char-builder-save"
              @click="handleSave"
            >
              {{ t('characterizations.editor.actions.save', 'Save') }}
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
          data-testid="char-builder-error"
          @click:close="store.clearError()"
        >
          {{ storeError }}
        </v-alert>

        <!-- Tabs -->
        <v-card class="char-builder__card">
          <v-tabs
            v-model="activeTab"
            color="primary"
            data-testid="char-builder-tabs"
          >
            <v-tab
              value="design"
              data-testid="char-builder-tab-design"
            >
              {{ t('characterizations.editor.tabs.design', 'Design') }}
            </v-tab>
            <v-tab
              value="conceptSets"
              data-testid="char-builder-tab-conceptSets"
            >
              {{ t('characterizations.editor.tabs.conceptSets', 'Concept Sets') }}
            </v-tab>
            <v-tab
              value="executions"
              data-testid="char-builder-tab-executions"
            >
              {{ t('characterizations.editor.tabs.executions', 'Executions') }}
            </v-tab>
            <v-tab
              value="versions"
              data-testid="char-builder-tab-versions"
            >
              {{ t('characterizations.editor.tabs.versions', 'Versions') }}
            </v-tab>
          </v-tabs>

          <v-card-text>
            <v-tabs-window v-model="activeTab">
              <v-tabs-window-item value="design">
                <CharacterizationDesignTab
                  :model-value="draft"
                  :available-cohorts="availableCohorts"
                  :available-feature-analyses="availableFeatureAnalyses"
                  data-testid="char-builder-design-tab"
                  @update:model-value="onDraftChange"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="conceptSets">
                <CharacterizationConceptSetsTab
                  :characterization="draft"
                  data-testid="char-builder-conceptsets-tab"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="executions">
                <ExecutionsPanel
                  :characterization-id="draftId"
                  data-testid="char-builder-executions-tab"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="versions">
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
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>

        <!-- Delete confirmation dialog -->
        <v-dialog
          v-model="showDeleteDialog"
          max-width="500"
        >
          <v-card>
            <v-card-title class="text-h5">
              {{ t('characterizations.editor.actions.delete', 'Delete') }}
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
                data-testid="char-builder-delete-confirm"
                @click="confirmDelete"
              >
                {{ t('characterizations.editor.actions.delete', 'Delete') }}
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
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizationStore } from '@/stores/characterization'
import { getCohorts } from '@/services/webapi'
import { listFeatureAnalyses } from '@/services/feature-analysis.service'
import { logger } from '@/utils/logger'
import CharacterizationDesignTab from '@/components/characterization/CharacterizationDesignTab.vue'
import CharacterizationConceptSetsTab from '@/components/characterization/CharacterizationConceptSetsTab.vue'
import ExecutionsPanel from '@/components/characterization/ExecutionsPanel.vue'
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
const activeTab = ref<'design' | 'conceptSets' | 'executions' | 'versions'>('design')
const saving = ref<boolean>(false)
const showDeleteDialog = ref<boolean>(false)

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
    ? t('characterizations.editor.title.edit', 'Edit Characterization').value
    : t('characterizations.editor.title.new', 'New Characterization').value
})

const storeError = computed<string | null>(() => store.error)
const loading = computed<boolean>(() => store.loading)

const canSave = computed<boolean>(() => {
  if (saving.value || loading.value) return false
  return draft.value.name.trim().length > 0
})

const draftId = computed<number | null>(() => draft.value.id ?? null)

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
      'characterizations.editor.executions.runDisabledDirty',
      'Save your changes before running.'
    ).value
  }
  return ''
})

function handleRunClick() {
  if (!canRun.value) return
  activeTab.value = 'executions'
}

const deleteMessage = computed<string>(() => {
  return t(
    'characterizations.editor.deleteConfirm',
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
      t('characterizations.editor.nameRequired', 'Name is required').value,
      'error'
    )
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
          t('characterizations.editor.saveError', 'Failed to save characterization').value,
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
          t('characterizations.editor.saveError', 'Failed to save characterization').value,
          'error'
        )
      }
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Save failed', err)
    showSnackbar(
      t('characterizations.editor.saveError', 'Failed to save characterization').value,
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
        t('characterizations.editor.saveError', 'Failed to save characterization').value,
        'error'
      )
    }
  } catch (err) {
    logger.error('CharacterizationBuilder', 'Save Copy failed', err)
    showSnackbar(
      t('characterizations.editor.saveError', 'Failed to save characterization').value,
      'error'
    )
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
    store.markClean()
    showDeleteDialog.value = false
    await router.push('/characterizations')
  } else {
    showSnackbar(
      t('characterizations.editor.saveError', 'Failed to save characterization').value,
      'error'
    )
  }
}

function handleBack() {
  if (store.isDirty) {
    const confirmed = window.confirm(
      t('characterizations.editor.leaveConfirm', 'You have unsaved changes. Leave anyway?').value
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
    t('characterizations.editor.leaveConfirm', 'You have unsaved changes. Leave anyway?').value
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

.char-builder {
  padding: 0;
}

.char-builder__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.char-builder__toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.char-builder__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.char-builder__title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0;
}

.char-builder__card {
  padding: 8px;
}

.char-builder__versions-stub {
  padding: 24px;
  color: #666;
  font-style: italic;
}
</style>
