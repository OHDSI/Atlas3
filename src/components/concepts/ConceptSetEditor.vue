<template>
  <!-- Teleport to body so the drawer + scrim render outside the
       page-shell layout. Inline rendering causes the scrim to be
       constrained to the table region instead of covering the
       whole viewport. -->
  <Teleport to="body">
    <v-navigation-drawer
      :model-value="modelValue"
      location="right"
      temporary
      :width="drawerWidth"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <div class="cs-editor h-100 d-flex flex-column">
        <!-- Modern editor header: eyebrow + accent rule + inline-edit
           title (replaces the legacy v-card-title with grey border).
           Actions are pushed to a single action row aligned with the
           title block. -->
        <header class="cs-editor__header">
          <div class="cs-editor__title-block">
            <div class="cs-editor__eyebrow-row">
              <span class="text-eyebrow">{{ eyebrowText }}</span>
              <span class="cs-editor__accent-rule" />
            </div>
            <v-form
              ref="formRef"
              v-model="formValid"
              @submit.prevent
            >
              <input
                :value="form.name"
                type="text"
                class="cs-editor__title-input"
                :placeholder="t('cs.manager.pleaseProvideNameMessage', 'Untitled concept set').value"
                :disabled="loading"
                :aria-label="t('columns.name', 'Name').value"
                @input="onTitleInput"
              >
              <p
                v-if="nameError"
                class="cs-editor__title-error"
              >
                {{ nameError }}
              </p>
            </v-form>
          </div>

          <div class="cs-editor__actions">
            <v-tooltip
              v-if="isEditMode && props.conceptSet?.id"
              :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
              location="bottom"
            >
              <template #activator="{ props: tooltipProps }">
                <v-badge
                  v-bind="tooltipProps"
                  :content="versionCount"
                  :model-value="versionCount > 0"
                  color="primary"
                  offset-x="6"
                  offset-y="6"
                >
                  <v-btn
                    icon="mdi-history"
                    size="small"
                    variant="text"
                    @click="showVersionsDialog = true"
                  />
                </v-badge>
              </template>
            </v-tooltip>

            <v-btn
              v-if="isEditMode"
              color="error"
              variant="text"
              :disabled="loading"
              @click="onDelete"
            >
              {{ t('common.delete', 'Delete') }}
            </v-btn>

            <v-btn
              color="primary"
              variant="flat"
              :disabled="!formValid || loading"
              :loading="loading"
              @click="onSave"
            >
              {{ isEditMode ? t('common.save', 'Save') : t('common.create', 'Create') }}
            </v-btn>

            <v-btn
              icon="mdi-close"
              variant="text"
              :aria-label="t('common.close', 'Close').value"
              @click="onClose"
            />
          </div>
        </header>

        <!-- Tabs rail: same shared treatment as the outer page tabs. -->
        <nav class="page-tabs-rail cs-editor__tabs-rail">
          <v-tabs
            v-model="activeTab"
            align-tabs="start"
            density="comfortable"
            color="primary"
            slider-color="primary"
            bg-color="transparent"
            class="page-tabs"
          >
            <v-tab value="selected">
              <v-icon
                start
                icon="mdi-checkbox-marked-circle-outline"
              />
              {{ t('cs.manager.tabs.includedConcepts', 'Selected') }}
              <v-chip
                size="x-small"
                variant="tonal"
                color="primary"
                class="cs-editor__tab-count"
              >
                {{ itemCount }}
              </v-chip>
            </v-tab>
            <v-tab value="search">
              <v-icon
                start
                icon="mdi-magnify"
              />
              {{ t('search.tabs.search', 'Search') }}
            </v-tab>
          </v-tabs>

          <v-spacer />

          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-clipboard-text-outline"
            class="cs-editor__paste-btn"
            @click="showPasteDialog = true"
          >
            {{ t('cs.manager.pasteIds', 'Paste IDs') }}
          </v-btn>
        </nav>

        <div class="cs-editor__body">
          <v-window v-model="activeTab">
            <!-- Selected Concepts Tab -->
            <v-window-item value="selected">
              <ConceptSetTable
                :items="store.currentSet?.items || []"
                :loading="false"
                @toggle:descendants="onToggleDescendants"
                @toggle:mapped="onToggleMapped"
                @toggle:exclude="onToggleExclude"
                @remove="onRemoveFromSet"
              />
            </v-window-item>

            <!-- Search Tab -->
            <v-window-item value="search">
              <ConceptSearchInline
                @add-concept="onAddConcept"
                @remove-concept="onRemoveConcept"
              />
            </v-window-item>
          </v-window>
        </div>
      </div>

      <!-- Versions Dialog -->
      <v-dialog
        v-model="showVersionsDialog"
        max-width="1200px"
        scrollable
      >
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>{{ t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value }}</span>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="showVersionsDialog = false"
            />
          </v-card-title>
          <v-card-text class="pa-0">
            <VersionsTabContent
              v-if="showVersionsDialog && props.conceptSet?.id"
              :config="versionsConfig"
            />
          </v-card-text>
        </v-card>
      </v-dialog>
    </v-navigation-drawer>
  </Teleport>

  <!-- Confirmation dialogs — kept outside the drawer Teleport so they
       remain in the component's normal render tree but are themselves
       v-dialogs (which Vuetify already teleports to body). -->
  <v-dialog
    v-model="showCloseConfirm"
    max-width="440"
  >
    <v-card>
      <v-card-title class="text-h6">
        {{ t('common.unsavedChanges', 'Unsaved changes').value }}
      </v-card-title>
      <v-card-text>
        {{ t('common.unsavedChangesMessage', 'You have unsaved changes. Are you sure you want to close?').value }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="showCloseConfirm = false"
        >
          {{ t('common.cancel', 'Cancel').value }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="confirmClose"
        >
          {{ t('common.discard', 'Discard changes').value }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Bulk paste IDs dialog. Resolves IDs against the vocabulary
       and shows a matched / unmatched summary before adding to the
       set. -->
  <v-dialog
    v-model="showPasteDialog"
    max-width="640"
  >
    <v-card>
      <v-card-title class="text-h6">
        {{ t('cs.manager.pasteIdsTitle', 'Paste concept IDs').value }}
      </v-card-title>
      <v-card-text>
        <p class="cs-paste__hint">
          {{ t('cs.manager.pasteIdsHint', 'Separate IDs with spaces, commas, semicolons, or newlines. We resolve each ID against the vocabulary before adding.').value }}
        </p>
        <v-textarea
          v-model="pasteInput"
          :placeholder="'201826\n313217, 4329847\n443238'"
          :disabled="pasteResolving"
          rows="6"
          variant="outlined"
          density="comfortable"
          hide-details
          class="cs-paste__textarea"
        />

        <div
          v-if="pasteResolved.length || pasteUnresolved.length"
          class="cs-paste__summary"
        >
          <div
            v-if="pasteResolved.length"
            class="cs-paste__summary-row cs-paste__summary-row--ok"
          >
            <v-icon
              icon="mdi-check-circle-outline"
              size="18"
            />
            <span>{{ t('cs.manager.pasteIdsResolved', 'Resolved').value }}: {{ pasteResolved.length }}</span>
          </div>
          <div
            v-if="pasteUnresolved.length"
            class="cs-paste__summary-row cs-paste__summary-row--err"
          >
            <v-icon
              icon="mdi-alert-circle-outline"
              size="18"
            />
            <span>{{ t('cs.manager.pasteIdsUnresolved', 'Not found').value }}: {{ pasteUnresolved.join(', ') }}</span>
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn
          variant="text"
          :disabled="pasteResolving"
          @click="closePasteDialog"
        >
          {{ t('common.cancel', 'Cancel').value }}
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="!pasteResolved.length && !pasteUnresolved.length"
          color="primary"
          variant="flat"
          :loading="pasteResolving"
          :disabled="!pasteInput.trim()"
          @click="resolvePastedIds"
        >
          {{ t('cs.manager.pasteIdsResolveBtn', 'Resolve').value }}
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="flat"
          :disabled="!pasteResolved.length"
          @click="applyPastedConcepts"
        >
          {{ t('cs.manager.pasteIdsAddBtn', 'Add').value }} {{ pasteResolved.length || '' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="showDeleteConfirm"
    max-width="440"
  >
    <v-card>
      <v-card-title class="text-h6">
        {{ t('common.delete', 'Delete').value }} {{ t('common.conceptSet', 'Concept Set').value }}
      </v-card-title>
      <v-card-text>
        {{ t('reusables.manager.messages.deleteConfirmation', 'Are you sure you want to delete').value }} "{{ props.conceptSet?.name }}"?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="showDeleteConfirm = false"
        >
          {{ t('common.cancel', 'Cancel').value }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="confirmDelete"
        >
          {{ t('common.delete', 'Delete').value }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, inject, watch, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import type { VersionsConfig, VersionsTableItem, User } from '@/components/versions/types'
import ConceptSearchInline from './ConceptSearchInline.vue'
import ConceptSetTable from './ConceptSetTable.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import { getVersions as getConceptSetVersions } from '@/services/concept-set-versions.service'
import { getConceptById } from '@/services/concept-search.service'

const { t } = useI18n()

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  conceptSet: ConceptSet | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': []
  'delete': [id: number | string]
}>()

// ============================================================================
// Store
// ============================================================================

const store = useConceptSetsStore()

// ============================================================================
// Local State
// ============================================================================

const formRef = ref()
const formValid = ref(false)
const loading = ref(false)
const hasUnsavedChanges = ref(false)
const activeTab = ref<string>('selected')  // Tab state for concept building - default to selected

interface FormData {
  name: string
}

const form = ref<FormData>({
  name: '',
})

// Version management state
const showVersionsDialog = ref(false)
const versionCount = ref(0)

// Confirmation dialog state — replaces native window.confirm calls
// so close + delete confirmations match the rest of the app.
const showCloseConfirm = ref(false)
const showDeleteConfirm = ref(false)
// Bulk paste dialog state.
const showPasteDialog = ref(false)
const pasteInput = ref('')
const pasteResolving = ref(false)
const pasteResolved = ref<Concept[]>([])
const pasteUnresolved = ref<number[]>([])

// Source key for vocabulary lookups — falls back to SYNPUF1K, the
// same default used by the surrounding page.
const sourceKey = inject<{ value: string }>('sourceKey', { value: 'SYNPUF1K' })

// ============================================================================
// Computed
// ============================================================================

const isEditMode = computed(() => {
  return props.conceptSet?.id !== undefined && props.conceptSet?.id !== null
})

const itemCount = computed(() => {
  return store.currentSet?.items?.length || 0
})

const eyebrowText = computed(() => {
  if (isEditMode.value && props.conceptSet?.id !== undefined) {
    return `${t('common.conceptSet', 'Concept set').value} · #${props.conceptSet.id}`
  }
  return t('common.conceptSet', 'Concept set').value
})

// Lightweight name validation surfaced under the inline title input
// (replaces the v-text-field error-messages slot — the inline title
// can't host the v-form rules system).
const nameError = computed(() => {
  const v = form.value.name
  if (!v || v.trim().length === 0) {
    return t('commonErrors.required', 'Name is required').value
  }
  if (v.length > 255) {
    return t('commonErrors.lengthValidation', 'Name must be between 1 and 255 characters').value
  }
  return ''
})

// Drive the v-form's validity off our single field's error so the
// Save button stays disabled while the name is invalid.
watch(nameError, (err) => {
  formValid.value = !err
}, { immediate: true })

// Fixed width to ensure consistent 85% across all tabs
const drawerWidth = computed(() => {
  // Use fixed pixel width based on 85% of typical viewport
  // This prevents v-window from causing layout shifts
  return Math.min(window.innerWidth * 0.85, 1400)
})

// Versions configuration
const versionsConfig = computed<VersionsConfig>(() => {
  const conceptSetId = props.conceptSet?.id
  const assetId = typeof conceptSetId === 'number' ? conceptSetId : 0

  return {
    assetType: 'conceptset',
    assetId,
    currentVersion: () => getCurrentVersionRow(),
    previewVersion: toRef(store, 'previewVersion'),
    canEdit: computed(() => !store.previewVersion),
    isDirty: toRef(() => hasUnsavedChanges.value),
    clearPreview: () => store.clearPreviewVersion(),
  }
})

// Get current version row for versions table
function getCurrentVersionRow(): VersionsTableItem {
  const conceptSet = props.conceptSet
  if (!conceptSet) {
    return {
      version: 0,
      assetId: 0,
      createdBy: { id: 0, name: 'Unknown' },
      createdDate: new Date().toISOString(),
      comment: null,
      archived: false,
      displayVersion: 'Current',
      isCurrent: true,
      isPreviewing: false,
      formattedDate: 'Current',
    }
  }

  // ConceptSet has createdBy/modifiedBy as strings (username), not User objects
  const username = conceptSet.modifiedBy || conceptSet.createdBy || 'Unknown'
  const createdBy: User = { id: 0, name: username }

  // Handle createdDate/modifiedDate which can be string or number
  const dateValue = conceptSet.modifiedDate || conceptSet.createdDate
  const createdDate = typeof dateValue === 'number'
    ? new Date(dateValue).toISOString()
    : (dateValue || new Date().toISOString())

  return {
    version: 0,
    assetId: typeof conceptSet.id === 'number' ? conceptSet.id : 0,
    createdBy,
    createdDate,
    comment: null,
    archived: false,
    displayVersion: 'Current',
    isCurrent: true,
    isPreviewing: false,
    formattedDate: 'Current',
  }
}

// ============================================================================
// Validation Rules
// ============================================================================

// Validation now lives in the nameError computed above so the inline
// title input can surface its own error message without depending on
// v-text-field's rules slot.

// ============================================================================
// Watchers
// ============================================================================

// Load concept set data when editor opens
watch(() => props.conceptSet, (newSet) => {
  if (newSet) {
    form.value = {
      name: newSet.name || '',
    }
    hasUnsavedChanges.value = false
  } else {
    // Reset form for new concept set
    form.value = {
      name: '',
    }
    hasUnsavedChanges.value = false
  }
}, { immediate: true })

// Unsaved-changes is driven by explicit user actions only — the
// previous deep watcher on `form` fired on the initial assignment
// when the editor opened, which marked a freshly-opened set as
// dirty before the user had touched anything.

// Load version count when concept set changes
watch(() => props.conceptSet?.id, async (id) => {
  if (id && typeof id === 'number') {
    try {
      const versions = await getConceptSetVersions(id)
      versionCount.value = versions.length
    } catch (err) {
      logger.error('ConceptSetEditor', 'Failed to load version count', err)
      versionCount.value = 0
    }
  } else {
    versionCount.value = 0
  }
}, { immediate: true })

// ============================================================================
// Methods
// ============================================================================

async function onSave() {
  if (!formValid.value) return

  loading.value = true

  try {
    let result

    if (isEditMode.value && props.conceptSet?.id) {
      result = await store.update({
        ...props.conceptSet,
        name: form.value.name,
        items: store.currentSet?.items || [],
      })
    } else {
      result = await store.create({
        name: form.value.name,
        items: store.currentSet?.items || [],
      })
    }

    if (result) {
      hasUnsavedChanges.value = false
      emit('save')
      emit('update:modelValue', false)
    }
  } finally {
    loading.value = false
  }
}

function onTitleInput(event: Event) {
  const target = event.target as HTMLInputElement
  form.value.name = target.value
  hasUnsavedChanges.value = true
}

function onClose() {
  if (hasUnsavedChanges.value) {
    showCloseConfirm.value = true
    return
  }

  hasUnsavedChanges.value = false
  emit('update:modelValue', false)
}

function confirmClose() {
  showCloseConfirm.value = false
  hasUnsavedChanges.value = false
  emit('update:modelValue', false)
}

function onDelete() {
  if (!props.conceptSet?.id) return
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (!props.conceptSet?.id) return
  showDeleteConfirm.value = false
  emit('delete', props.conceptSet.id)
  emit('update:modelValue', false)
}

// ============================================================================
// Concept Building Methods
// ============================================================================

function onAddConcept(concept: Concept) {
  store.addConceptToSet(concept)
  hasUnsavedChanges.value = true
}

function onRemoveConcept(concept: Concept) {
  store.removeConceptFromSet(concept.conceptId)
  hasUnsavedChanges.value = true
}

function onRemoveFromSet(conceptId: number) {
  store.removeConceptFromSet(conceptId)
  hasUnsavedChanges.value = true
}

function onToggleDescendants(conceptId: number) {
  store.toggleConceptFlag(conceptId, 'includeDescendants')
  hasUnsavedChanges.value = true
}

function onToggleMapped(conceptId: number) {
  store.toggleConceptFlag(conceptId, 'includeMapped')
  hasUnsavedChanges.value = true
}

function onToggleExclude(conceptId: number) {
  store.toggleConceptFlag(conceptId, 'isExcluded')
  hasUnsavedChanges.value = true
}

// ============================================================================
// Bulk paste IDs
// ============================================================================

// Parse pasted text into a list of unique numeric concept IDs.
// Accepts whitespace, commas, semicolons, tabs, or newlines as
// separators; ignores empty tokens.
function parsePastedIds(input: string): number[] {
  const seen = new Set<number>()
  const tokens = input.split(/[\s,;]+/).filter(Boolean)
  for (const tok of tokens) {
    const n = Number.parseInt(tok, 10)
    if (Number.isFinite(n) && n > 0) {
      seen.add(n)
    }
  }
  return [...seen]
}

async function resolvePastedIds() {
  const ids = parsePastedIds(pasteInput.value)
  if (ids.length === 0) {
    pasteResolved.value = []
    pasteUnresolved.value = []
    return
  }

  pasteResolving.value = true
  try {
    // Concurrently fetch each ID. WebAPI doesn't expose a batch
    // lookup endpoint here, so Promise.all over individual GETs
    // is the simplest reliable path.
    const results = await Promise.all(
      ids.map(async (id): Promise<{ id: number; concept: Concept | null }> => {
        try {
          const concept = await getConceptById(sourceKey.value, id)
          return { id, concept }
        } catch (err) {
          logger.error('ConceptSetEditor', `Failed to resolve concept ${id}`, err)
          return { id, concept: null }
        }
      })
    )

    pasteResolved.value = results
      .map(r => r.concept)
      .filter((c): c is Concept => c !== null)
    pasteUnresolved.value = results
      .filter(r => r.concept === null)
      .map(r => r.id)
  } finally {
    pasteResolving.value = false
  }
}

function applyPastedConcepts() {
  for (const concept of pasteResolved.value) {
    store.addConceptToSet(concept)
  }
  hasUnsavedChanges.value = true
  closePasteDialog()
  // Switch to the Selected tab so the user can see what landed.
  activeTab.value = 'selected'
}

function closePasteDialog() {
  showPasteDialog.value = false
  pasteInput.value = ''
  pasteResolved.value = []
  pasteUnresolved.value = []
  pasteResolving.value = false
}
</script>

<style scoped>
.cs-editor {
  background: rgb(var(--v-theme-surface));
}

/* Header: eyebrow + accent rule + inline-edit title + action row.
 * Matches the page-shell hero header styling so the drawer feels
 * like a continuation of the workspace, not a different surface. */
.cs-editor__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 28px 16px;
}

.cs-editor__title-block {
  flex: 1;
  min-width: 0;
}

.cs-editor__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.cs-editor__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

/* Inline-edit title: looks like an h2 but is editable. Border lights
 * up on hover/focus so the affordance is discoverable without
 * shouting. */
.cs-editor__title-input {
  width: 100%;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  color: rgb(var(--v-theme-primary));
  background: transparent;
  border: 0;
  border-bottom: 1px solid transparent;
  padding: 2px 0 4px;
  outline: none;
  transition: border-color 120ms ease;
}
.cs-editor__title-input::placeholder {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  font-weight: 400;
}
.cs-editor__title-input:hover {
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
.cs-editor__title-input:focus {
  border-bottom-color: rgb(var(--v-theme-primary));
}
.cs-editor__title-input:disabled {
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: not-allowed;
}

.cs-editor__title-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgb(var(--v-theme-error));
}

.cs-editor__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 4px;
}

/* Tabs rail nests against the page-shell visuals; pull the rail
 * across the full drawer width (cancel header padding) and keep
 * the same border-bottom treatment used in the outer page tabs. */
.cs-editor__tabs-rail {
  display: flex;
  align-items: center;
  padding-inline: 28px;
}

.cs-editor__tab-count {
  margin-inline-start: 8px;
  height: 18px !important;
  font-size: 11px !important;
  letter-spacing: 0.02em;
}

.cs-editor__paste-btn {
  margin-right: 4px;
}

.cs-editor__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 28px 28px;
}

/* Paste IDs dialog */
.cs-paste__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.cs-paste__textarea :deep(textarea) {
  font-family: var(--v-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 13px;
}
.cs-paste__summary {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cs-paste__summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.cs-paste__summary-row--ok {
  color: rgb(var(--v-theme-success, 76, 175, 80));
}
.cs-paste__summary-row--err {
  color: rgb(var(--v-theme-error));
  word-break: break-word;
}
</style>
