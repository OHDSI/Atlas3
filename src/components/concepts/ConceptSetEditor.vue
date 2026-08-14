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
              v-model="formValid"
              @submit.prevent
            >
              <input
                :value="form.name"
                type="text"
                class="cs-editor__title-input"
                :placeholder="
                  t('cs.manager.pleaseProvideNameMessage', 'Untitled concept set').value
                "
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
            <AtlasTooltip
              v-if="!embedded"
              :text="t('common.tags', 'Tags').value"
              location="bottom"
            >
              <template #activator="{ props: tooltipProps }">
                <AtlasBadge
                  v-bind="tooltipProps"
                  :content="selectedTags.length"
                  :model-value="selectedTags.length > 0"
                  color="primary"
                  offset-x="6"
                  offset-y="6"
                >
                  <AtlasIconButton
                    icon="mdi-tag-multiple"
                    data-testid="cs-editor-tags-btn"
                    v-bind="{ ariaLabel: t('common.tags', 'Tags').value }"
                    variant="text"
                    size="sm"
                    :disabled="loading || !!store.previewVersion"
                    @click="showTagsDialog = true"
                  />
                </AtlasBadge>
              </template>
            </AtlasTooltip>

            <AtlasTooltip
              v-if="!embedded && isEditMode && props.conceptSet?.id"
              :text="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
              location="bottom"
            >
              <template #activator="{ props: tooltipProps }">
                <AtlasBadge
                  v-bind="tooltipProps"
                  :content="versionCount"
                  :model-value="versionCount > 0"
                  color="primary"
                  offset-x="6"
                  offset-y="6"
                >
                  <AtlasIconButton
                    icon="mdi-history"
                    v-bind="{ ariaLabel: 'Version history' }"
                    variant="text"
                    size="sm"
                    @click="showVersionsDialog = true"
                  />
                </AtlasBadge>
              </template>
            </AtlasTooltip>

            <AtlasButton
              v-if="!embedded && isEditMode"
              variant="ghost"
              tone="danger"
              :disabled="loading || !canDelete"
              data-testid="conceptset-delete"
              @click="onDelete"
            >
              {{ t('common.delete', 'Delete') }}
            </AtlasButton>

            <AtlasButton
              v-if="embedded"
              variant="ghost"
              data-testid="cs-editor-cancel-btn"
              @click="onClose"
            >
              {{ t('common.cancel', 'Cancel') }}
            </AtlasButton>

            <AtlasButton
              :disabled="!formValid || loading || !canSubmit"
              :loading="loading"
              data-testid="cs-editor-primary-btn"
              @click="embedded ? onApply() : onSave()"
            >
              {{
                embedded
                  ? t('common.apply', 'Apply')
                  : isEditMode
                    ? t('common.save', 'Save')
                    : t('common.create', 'Create')
              }}
            </AtlasButton>

            <AtlasIconButton
              icon="mdi-close"
              v-bind="{ ariaLabel: t('common.close', 'Close').value }"
              variant="text"
              size="sm"
              @click="onClose"
            />
          </div>
        </header>

        <div class="cs-editor__main">
          <!-- Tabs rail: same shared treatment as the outer page tabs. -->
          <nav class="page-tabs-rail cs-editor__tabs-rail">
            <AtlasTabs
              v-model="activeTab"
              align-tabs="start"
              density="comfortable"
              color="primary"
              slider-color="primary"
              bg-color="transparent"
              class="page-tabs"
            >
              <AtlasTab value="selected">
                <AtlasIcon
                  start
                  icon="mdi-checkbox-marked-circle-outline"
                />
                {{ t('cs.manager.tabs.selected', 'Selected') }}
                <AtlasChip
                  size="sm"
                  tone="primary"
                  class="cs-editor__tab-count"
                >
                  {{ itemCount }}
                </AtlasChip>
              </AtlasTab>
              <AtlasTab value="included">
                <AtlasIcon
                  start
                  icon="mdi-family-tree"
                />
                {{ t('cs.manager.tabs.included', 'Included') }}
                <AtlasChip
                  size="sm"
                  tone="primary"
                  class="cs-editor__tab-count"
                >
                  {{ store.includedLoading ? '…' : store.includedItems.length }}
                </AtlasChip>
              </AtlasTab>
              <AtlasTab value="source-codes">
                <AtlasIcon
                  start
                  icon="mdi-barcode-scan"
                />
                {{ t('cs.manager.tabs.sourceCodes', 'Source Codes') }}
                <AtlasChip
                  size="sm"
                  tone="primary"
                  class="cs-editor__tab-count"
                >
                  {{ store.sourceCodeLoading ? '…' : store.sourceCodeItems.length }}
                </AtlasChip>
              </AtlasTab>
              <AtlasTab value="search">
                <AtlasIcon
                  start
                  icon="mdi-magnify"
                />
                {{ t('search.tabs.search', 'Search') }}
              </AtlasTab>
              <AtlasTab value="recommend">
                <AtlasIcon
                  start
                  icon="mdi-lightbulb-on-outline"
                />
                {{ t('cs.manager.tabs.recommend', 'Recommend') }}
              </AtlasTab>
              <AtlasTab value="compare">
                <AtlasIcon
                  start
                  icon="mdi-compare"
                />
                {{ t('cs.browser.compare.compare', 'Compare') }}
              </AtlasTab>
            </AtlasTabs>

            <AtlasSpacer />

            <AtlasButton
              variant="ghost"
              size="sm"
              icon="mdi-clipboard-text-outline"
              class="cs-editor__paste-btn"
              @click="showPasteDialog = true"
            >
              {{ t('cs.manager.pasteIds', 'Paste IDs') }}
            </AtlasButton>

            <AtlasButton
              variant="ghost"
              size="sm"
              icon="mdi-barcode-scan"
              class="cs-editor__paste-btn"
              @click="showSourceCodeDialog = true"
            >
              {{ t('cs.manager.importSourceCodesButton', 'Import by source code') }}
            </AtlasButton>

            <AtlasButton
              variant="ghost"
              size="sm"
              icon="mdi-code-json"
              class="cs-editor__paste-btn"
              @click="showJsonDialog = true"
            >
              {{ t('cs.manager.importJson', 'Import JSON') }}
            </AtlasButton>
          </nav>

          <div class="cs-editor__body">
            <v-window v-model="activeTab">
              <!-- Selected Concepts Tab -->
              <v-window-item value="selected">
                <ConceptSetTable
                  :items="store.currentSet?.items || []"
                  :loading="false"
                  :source-key="sourceKey"
                  @toggle:descendants="onToggleDescendants"
                  @toggle:mapped="onToggleMapped"
                  @toggle:exclude="onToggleExclude"
                  @remove="onRemoveFromSet"
                  @view-concept="onViewConcept"
                />
              </v-window-item>

              <!-- Included Concepts Tab -->
              <v-window-item value="included">
                <IncludedConceptsTable
                  :items="store.includedItems"
                  :loading="store.includedLoading"
                  :error="store.includedError"
                  :manual-count="store.currentSet?.items?.length ?? 0"
                  :source-key="sourceKey"
                  @view-concept="onViewConcept"
                  @retry="store.resolveIncluded(sourceKey)"
                />
              </v-window-item>

              <!-- Source Codes Tab -->
              <v-window-item value="source-codes">
                <IncludedSourceCodesTable
                  :active="activeTab === 'source-codes'"
                  :source-key="sourceKey"
                  @view-concept="onViewConcept"
                />
              </v-window-item>

              <!-- Search Tab -->
              <v-window-item value="search">
                <ConceptSearchInline
                  @add-concept="onAddConcept"
                  @add-concepts="onAddConcepts"
                  @remove-concept="onRemoveConcept"
                  @view-concept="onViewConcept"
                />
              </v-window-item>

              <!-- Recommend Tab -->
              <v-window-item value="recommend">
                <RecommendTab
                  :active="activeTab === 'recommend'"
                  @concepts-added="onRecommendedConceptsAdded"
                />
              </v-window-item>

              <v-window-item value="compare">
                <CompareTab :active="activeTab === 'compare'" />
              </v-window-item>
            </v-window>
          </div>

          <!-- Concept detail overlays the tabs menu + body (header stays
             visible) when a concept is opened from any table. The back
             arrow inside the detail clears it. -->
          <div
            v-if="viewingConcept"
            class="cs-editor__detail-overlay"
            data-testid="concept-set-editor-inline-detail"
          >
            <ConceptDetailContent
              :source-key="viewingConcept.sourceKey"
              :concept-id="viewingConcept.conceptId"
              :on-back="() => (viewingConcept = null)"
            />
          </div>
        </div>
      </div>

      <!-- Versions Dialog -->
      <AtlasDialog
        v-model="showVersionsDialog"
        :eyebrow="t('common.history', 'History').value"
        :title="t('cohortDefinitions.cohortDefinitionManager.tabs.versions', 'Versions').value"
        :close-label="t('common.close', 'Close').value"
        max-width="1200"
        @close="showVersionsDialog = false"
      >
        <VersionsTabContent
          v-if="showVersionsDialog && props.conceptSet?.id"
          :config="versionsConfig"
        />
      </AtlasDialog>
    </v-navigation-drawer>
  </Teleport>

  <!-- Tag selection dialog. -->
  <TagSelectionDialog
    v-model="showTagsDialog"
    :selected-tags="selectedTags"
    @update:selected-tags="selectedTags = $event"
  />

  <!-- Confirmation dialogs — kept outside the drawer Teleport so they
       remain in the component's normal render tree but are themselves
       v-dialogs (which Vuetify already teleports to body). -->
  <AtlasDialog
    v-model="showCloseConfirm"
    :eyebrow="t('common.confirm', 'Confirm').value"
    :title="t('common.unsavedChanges', 'Unsaved changes').value"
    max-width="440"
    @close="showCloseConfirm = false"
  >
    {{
      t(
        'common.unsavedChangesMessage',
        'You have unsaved changes. Are you sure you want to close?'
      ).value
    }}
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="showCloseConfirm = false"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        @click="confirmClose"
      >
        {{ t('common.discard', 'Discard changes').value }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <!-- Bulk paste IDs dialog. Resolves IDs against the vocabulary
       and shows a matched / unmatched summary before adding to the
       set. -->
  <AtlasDialog
    v-model="showPasteDialog"
    :eyebrow="t('cs.manager.pasteIds', 'Paste IDs').value"
    :title="t('cs.manager.pasteIdsTitle', 'Paste concept IDs').value"
    max-width="640"
    @close="closePasteDialog"
  >
    <p class="cs-paste__hint">
      {{
        t(
          'cs.manager.pasteIdsHint',
          'Separate IDs with spaces, commas, semicolons, or newlines. We resolve each ID against the vocabulary before adding.'
        ).value
      }}
    </p>
    <AtlasTextField
      v-model="pasteInput"
      :placeholder="'201826\n313217, 4329847\n443238'"
      :disabled="pasteResolving"
      :rows="6"
      multiline
      variant="outlined"
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
        <AtlasIcon
          icon="mdi-check-circle-outline"
          size="18"
        />
        <span>{{ t('cs.manager.pasteIdsResolved', 'Resolved').value }}:
          {{ pasteResolved.length }}</span>
      </div>
      <div
        v-if="pasteUnresolved.length"
        class="cs-paste__summary-row cs-paste__summary-row--err"
      >
        <AtlasIcon
          icon="mdi-alert-circle-outline"
          size="18"
        />
        <span>{{ t('cs.manager.pasteIdsUnresolved', 'Not found').value }}:
          {{ pasteUnresolved.join(', ') }}</span>
      </div>
    </div>

    <template #actions>
      <AtlasButton
        variant="ghost"
        :disabled="pasteResolving"
        @click="closePasteDialog"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        v-if="!pasteResolved.length && !pasteUnresolved.length"
        :loading="pasteResolving"
        :disabled="!pasteInput.trim()"
        @click="resolvePastedIds"
      >
        {{ t('cs.manager.pasteIdsResolveBtn', 'Resolve').value }}
      </AtlasButton>
      <AtlasButton
        v-else
        :disabled="!pasteResolved.length"
        @click="applyPastedConcepts"
      >
        {{ t('cs.manager.pasteIdsAddBtn', 'Add').value }} {{ pasteResolved.length || '' }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <!-- Import by source code dialog. Resolves source codes (alphanumeric, e.g.
       ICD10 codes) against the vocabulary and shows a matched / unmatched
       summary before adding to the set. -->
  <AtlasDialog
    v-model="showSourceCodeDialog"
    :eyebrow="t('cs.manager.importSourceCodes', 'Import codes').value"
    :title="t('cs.manager.importSourceCodesTitle', 'Import by source code').value"
    max-width="640"
    @close="closeSourceCodeDialog"
  >
    <p class="cs-paste__hint">
      {{
        t(
          'cs.manager.importSourceCodesHint',
          'Separate source codes with commas, semicolons, or newlines. We resolve each code against the vocabulary before adding.'
        ).value
      }}
    </p>
    <AtlasTextField
      v-model="sourceCodeInput"
      :placeholder="'E11.9\n250.00, 44054006'"
      :disabled="sourceCodeResolving"
      :rows="6"
      multiline
      variant="outlined"
      hide-details
      class="cs-paste__textarea"
    />

    <div
      v-if="sourceCodeResolved.length || sourceCodeUnresolved.length"
      class="cs-paste__summary"
    >
      <div
        v-if="sourceCodeResolved.length"
        class="cs-paste__summary-row cs-paste__summary-row--ok"
      >
        <AtlasIcon
          icon="mdi-check-circle-outline"
          size="18"
        />
        <span>{{ t('cs.manager.pasteIdsResolved', 'Resolved').value }}:
          {{ sourceCodeResolved.length }}</span>
      </div>
      <div
        v-if="sourceCodeUnresolved.length"
        class="cs-paste__summary-row cs-paste__summary-row--err"
      >
        <AtlasIcon
          icon="mdi-alert-circle-outline"
          size="18"
        />
        <span>{{ t('cs.manager.pasteIdsUnresolved', 'Not found').value }}:
          {{ sourceCodeUnresolved.join(', ') }}</span>
      </div>
    </div>

    <template #actions>
      <AtlasButton
        variant="ghost"
        :disabled="sourceCodeResolving"
        @click="closeSourceCodeDialog"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        v-if="!sourceCodeResolved.length && !sourceCodeUnresolved.length"
        :loading="sourceCodeResolving"
        :disabled="!sourceCodeInput.trim()"
        @click="resolvePastedSourceCodes"
      >
        {{ t('cs.manager.pasteIdsResolveBtn', 'Resolve').value }}
      </AtlasButton>
      <AtlasButton
        v-else
        :disabled="!sourceCodeResolved.length"
        @click="applySourceCodeConcepts"
      >
        {{ t('cs.manager.pasteIdsAddBtn', 'Add').value }} {{ sourceCodeResolved.length || '' }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <!-- Import by JSON dialog. Accepts a pasted concept set expression
       ({ items: [...] }) and adds the resolved items to the set. -->
  <AtlasDialog
    v-model="showJsonDialog"
    :eyebrow="t('cs.manager.importJson', 'Import JSON').value"
    :title="t('cs.manager.importJsonTitle', 'Import concept set JSON').value"
    max-width="640"
    @close="closeJsonDialog"
  >
    <p class="cs-paste__hint">
      {{
        t(
          'cs.manager.importJsonHint',
          'Paste a concept set expression JSON ({ "items": [ ... ] }). Each item\'s concept and its flags will be added to the set.'
        ).value
      }}
    </p>
    <AtlasTextField
      v-model="jsonInput"
      :placeholder="'{ &quot;items&quot;: [ { &quot;concept&quot;: { &quot;CONCEPT_ID&quot;: 201826, ... }, &quot;isExcluded&quot;: false, &quot;includeDescendants&quot;: true, &quot;includeMapped&quot;: false } ] }'"
      :rows="8"
      multiline
      variant="outlined"
      hide-details
      class="cs-paste__textarea"
    />

    <div
      v-if="jsonParsed && jsonItems.length"
      class="cs-paste__summary"
    >
      <div class="cs-paste__summary-row cs-paste__summary-row--ok">
        <AtlasIcon
          icon="mdi-check-circle-outline"
          size="18"
        />
        <span>{{ t('cs.manager.pasteIdsResolved', 'Resolved').value }}:
          {{ jsonItems.length }}</span>
      </div>
    </div>
    <div
      v-if="jsonError"
      class="cs-paste__summary"
    >
      <div class="cs-paste__summary-row cs-paste__summary-row--err">
        <AtlasIcon
          icon="mdi-alert-circle-outline"
          size="18"
        />
        <span>{{ jsonError }}</span>
      </div>
    </div>

    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="closeJsonDialog"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        v-if="!jsonParsed || !jsonItems.length"
        :disabled="!jsonInput.trim()"
        @click="parseJsonImport"
      >
        {{ t('cs.manager.importJsonParseBtn', 'Parse').value }}
      </AtlasButton>
      <AtlasButton
        v-else
        :disabled="!jsonItems.length"
        @click="applyJsonItems"
      >
        {{ t('cs.manager.pasteIdsAddBtn', 'Add').value }} {{ jsonItems.length || '' }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <AtlasDialog
    v-model="showDeleteConfirm"
    :eyebrow="t('common.confirm', 'Confirm').value"
    :title="`${t('common.delete', 'Delete').value} ${t('common.conceptSet', 'Concept Set').value}`"
    max-width="440"
    @close="showDeleteConfirm = false"
  >
    {{
      t('reusables.manager.messages.deleteConfirmation', 'Are you sure you want to delete')
        .value
    }}
    "{{ props.conceptSet?.name }}"?
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="showDeleteConfirm = false"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        @click="confirmDelete"
      >
        {{ t('common.delete', 'Delete').value }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, inject, watch, toRef, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import type { ConceptSet, Concept, ConceptSetItem, ConceptAddFlags } from '@/models/concept-set.types'
import type { VersionsConfig, VersionsTableItem, User } from '@/components/versions/types'
import TagSelectionDialog from '@/components/tags/TagSelectionDialog.vue'
import type { Tag } from '@/models/cohort.types'
import ConceptSearchInline from './ConceptSearchInline.vue'
import ConceptSetTable from './ConceptSetTable.vue'
import IncludedConceptsTable from './IncludedConceptsTable.vue'
import IncludedSourceCodesTable from './IncludedSourceCodesTable.vue'
import RecommendTab from './RecommendTab.vue'
import CompareTab from './CompareTab.vue'
import ConceptDetailContent from './detail/ConceptDetailContent.vue'
import { AtlasButton, AtlasBadge, AtlasChip, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasSpacer, AtlasTab, AtlasTabs, AtlasTextField, AtlasTooltip } from '@/components/ui'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import { getVersions as getConceptSetVersions } from '@/services/concept-set-versions.service'
import { getConceptsByIds, getConceptsBySourceCodes } from '@/services/concept-search.service'
import { useWebAPIStore } from '@/stores/webapi'
import { getSourceKey as getDefaultSourceKey } from '@/config/webapi'
import {
  parsePastedIds,
  parsePastedSourceCodes,
  parseConceptSetJson,
} from './concept-set-import'

const { t, tv } = useI18n()
const webapiStore = useWebAPIStore()

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  modelValue: boolean
  conceptSet: ConceptSet | null
  embedded?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: []
  apply: [conceptSet: ConceptSet]
  delete: [id: number | string]
}>()

// ============================================================================
// Store
// ============================================================================

const store = useConceptSetsStore()
const notify = useNotifications()

// ============================================================================
// Local State
// ============================================================================

const formValid = ref(false)
const loading = ref(false)
const hasUnsavedChanges = ref(false)
const activeTab = ref<string>('selected') // Tab state for concept building - default to selected

// Inline concept detail view state. When set, the editor body swaps from the
// tabs to a ConceptDetailContent panel with a back button. Cleared on back
// or when the editor closes.
const viewingConcept = ref<{ sourceKey: string; conceptId: number } | null>(null)

function onViewConcept(payload: { conceptId: number; sourceKey: string }) {
  viewingConcept.value = { sourceKey: payload.sourceKey, conceptId: payload.conceptId }
}

// Reset the inline detail view when the editor closes so reopening starts on
// the tabs again, not on a stale concept page.
//
// Also lock body scroll while the drawer is open. The drawer is teleported to
// <body>, which means Vuetify's built-in overlay scroll-lock isn't engaged for
// it consistently across browsers — without this manual lock, wheel/touch
// scroll inside the panel falls through to the cohort builder page behind it.
watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      viewingConcept.value = null
      store.resetIncluded()
      document.body.style.overflow = ''
    } else {
      // New concept sets open on the Search tab so the user can start adding
      // concepts immediately; existing sets open on the Selected (expression)
      // tab as before. See OHDSI/Atlas3 discussion #97. Read props directly
      // rather than the `isEditMode` computed, which is declared later (this
      // immediate watcher runs during setup, before that binding exists).
      const isExisting = props.conceptSet?.id !== undefined && props.conceptSet?.id !== null
      activeTab.value = isExisting ? 'selected' : 'search'
      document.body.style.overflow = 'hidden'
    }
  },
  { immediate: true },
)

// Failsafe: never leak the body-overflow lock if the editor is unmounted
// while still open (e.g., route change with the drawer visible).
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

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

// Tag selection dialog state.
const showTagsDialog = ref(false)
const selectedTags = ref<Tag[]>([])
const loadedTags = ref<Tag[]>([])
// Bulk paste (IDs) dialog state.
const showPasteDialog = ref(false)
const pasteInput = ref('')
const pasteResolving = ref(false)
const pasteResolved = ref<Concept[]>([])
const pasteUnresolved = ref<number[]>([])

// Import by source code dialog state.
const showSourceCodeDialog = ref(false)
const sourceCodeInput = ref('')
const sourceCodeResolving = ref(false)
const sourceCodeResolved = ref<Concept[]>([])
const sourceCodeUnresolved = ref<string[]>([])

// Import by JSON dialog state.
const showJsonDialog = ref(false)
const jsonInput = ref('')
const jsonItems = ref<ConceptSetItem[]>([])
const jsonError = ref('')
const jsonParsed = ref(false)

// Source key for vocabulary lookups.
//
// When the editor is opened from ConceptsView, the page provides an injected
// 'sourceKey' which we honour as the highest-priority source. When opened from
// elsewhere (e.g. the cohort builder), nothing is provided, so we resolve the
// same way ConceptTable does: WebAPI store's valid vocabulary source, then the
// configured default. The previous hardcoded 'SYNPUF1K' default 404'd whenever
// that wasn't the configured source, breaking the Selected / Included tabs and
// the Paste IDs flow (#94 / #95).
const injectedSourceKey = inject<{ value: string }>('sourceKey', { value: '' })

const sourceKey = computed<string>(
  () =>
    injectedSourceKey.value ||
    webapiStore.getValidVocabularySource() ||
    getDefaultSourceKey() ||
    '',
)

// ============================================================================
// Computed
// ============================================================================

const isEditMode = computed(() => {
  return props.conceptSet?.id !== undefined && props.conceptSet?.id !== null
})

// Permission gating: a new concept set needs `create:conceptset`; editing
// or deleting an existing one needs write access on the specific entity.
const conceptSetId = computed<number | string | null>(() => props.conceptSet?.id ?? null)
const { hasPermission } = usePermissions()
const { canWrite, canDelete } = useEntityAccess('conceptSet', conceptSetId)
const canSubmit = computed<boolean>(() => {
  // Embedded sets carry cohort-local codeset ids; entity access on that id
  // would check an unrelated repository concept set. The cohort's own save
  // flow gates persistence instead.
  if (props.embedded) return true
  return isEditMode.value ? canWrite.value : hasPermission('create:conceptset')
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
    return t('commonErrors.nameRequired', 'Name is required').value
  }
  if (v.length > 255) {
    return t('commonErrors.lengthValidation', 'Name must be between 1 and 255 characters').value
  }
  return ''
})

// Drive the v-form's validity off our single field's error so the
// Save button stays disabled while the name is invalid.
watch(
  nameError,
  err => {
    formValid.value = !err
  },
  { immediate: true }
)

// Always fill the viewport minus a 100px gutter.
const drawerWidth = computed(() => window.innerWidth - 100)

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
  const createdDate =
    typeof dateValue === 'number'
      ? new Date(dateValue).toISOString()
      : dateValue || new Date().toISOString()

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
watch(
  () => props.conceptSet,
  newSet => {
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
  },
  { immediate: true }
)

// Seed tag state from the incoming concept set so the dialog opens
// pre-populated, and loadedTags tracks what was last saved.
watch(
  () => props.conceptSet,
  cs => {
    selectedTags.value = cs?.tags ? [...cs.tags] : []
    loadedTags.value = cs?.tags ? [...cs.tags] : []
  },
  { immediate: true }
)

// Unsaved-changes is driven by explicit user actions only — the
// previous deep watcher on `form` fired on the initial assignment
// when the editor opened, which marked a freshly-opened set as
// dirty before the user had touched anything.

// Load version count when concept set changes
watch(
  () => props.conceptSet?.id,
  async id => {
    // An embedded id is a cohort-local CodesetId — querying /conceptset/{id}/version
    // with it would fetch an unrelated repository set's history.
    if (props.embedded) {
      versionCount.value = 0
      return
    }
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
  },
  { immediate: true }
)

// ============================================================================
// Methods
// ============================================================================

async function onSave() {
  if (!formValid.value) return

  loading.value = true

  try {
    let result

    // Snapshot before the save: persisting mutates the store's concept set, which
    // re-runs the props.conceptSet watcher and resets both refs to the still
    // tag-less persisted value. Reading them after the await would diff nothing,
    // so a newly added tag would never be assigned.
    const tagsBeforeSave = [...loadedTags.value]
    const tagsToPersist = [...selectedTags.value]

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
      const savedId = result?.id
      if (savedId !== undefined && savedId !== null) {
        const tagResult = await store.syncTags(savedId, tagsBeforeSave, tagsToPersist)
        if (!tagResult.success) {
          notify.danger(tv('conceptSets.tagUpdateFailed', 'Failed to update tags'), {
            message: tagResult.error,
          })
        }
        loadedTags.value = [...tagsToPersist]
      }
      hasUnsavedChanges.value = false
      emit('save')
      emit('update:modelValue', false)
    }
  } finally {
    loading.value = false
  }
}

function onApply() {
  if (!formValid.value) return

  emit('apply', {
    id: props.conceptSet?.id,
    name: form.value.name,
    items: store.currentSet?.items ?? [],
  } as ConceptSet)
  hasUnsavedChanges.value = false
  emit('update:modelValue', false)
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

// A brand-new set opens on Search so users can add concepts right away, but a
// single add left the search view up with no visible confirmation that
// anything happened, since the added concept only shows on the Selected tab.
// Switch there after the FIRST concept lands in an empty set, not on every
// add, so search-then-add-several still works (#210).
function showResultAfterFirstAdd(wasEmpty: boolean) {
  if (wasEmpty && (store.currentSet?.items.length ?? 0) > 0) {
    activeTab.value = 'selected'
  }
}

function onAddConcept(concept: Concept, flags?: ConceptAddFlags) {
  const wasEmpty = (store.currentSet?.items.length ?? 0) === 0
  store.addConceptToSet(concept, flags)
  hasUnsavedChanges.value = true
  showResultAfterFirstAdd(wasEmpty)
}

function onAddConcepts(concepts: Concept[], flags?: ConceptAddFlags) {
  const wasEmpty = (store.currentSet?.items.length ?? 0) === 0
  for (const concept of concepts) {
    store.addConceptToSet(concept, flags)
  }
  hasUnsavedChanges.value = true
  showResultAfterFirstAdd(wasEmpty)
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

function onRecommendedConceptsAdded(count: number) {
  hasUnsavedChanges.value = true
  // Same rule as onAddConcept: only jump to Selected when this batch is
  // what populated a previously-empty set, not on every recommend-add (#210).
  if (count > 0 && store.currentSet?.items.length === count) {
    activeTab.value = 'selected'
  }
}

// ============================================================================
// Import helpers (shared)
// ============================================================================

// Add resolved Concept[] to the set and surface them on the Selected tab.
// `addConceptToSet` skips concepts already in the set, so re-pasting is safe.
function applyConceptsToSet(concepts: Concept[]) {
  for (const concept of concepts) {
    store.addConceptToSet(concept)
  }
  hasUnsavedChanges.value = true
  activeTab.value = 'selected'
}

// ============================================================================
// Bulk paste IDs
// ============================================================================

// Re-resolving is required after any edit, so reset the resolved/unresolved
// state when the textarea changes. Keeps the action button showing "Resolve"
// until the user re-validates the (possibly corrected) input.
watch(pasteInput, () => {
  if (pasteResolved.value.length || pasteUnresolved.value.length) {
    pasteResolved.value = []
    pasteUnresolved.value = []
  }
})

async function resolvePastedIds() {
  const ids = parsePastedIds(pasteInput.value)
  if (ids.length === 0) {
    pasteResolved.value = []
    pasteUnresolved.value = []
    return
  }

  pasteResolving.value = true
  try {
    // Resolve the whole batch in ONE request via the lookup/identifiers
    // endpoint rather than N individual GETs. The endpoint only returns rows
    // for IDs it can resolve, so anything missing from the response is
    // reported as unresolved.
    const concepts = await getConceptsByIds(sourceKey.value, ids)
    const found = new Set(concepts.map(c => c.conceptId))
    pasteResolved.value = concepts
    pasteUnresolved.value = ids.filter(id => !found.has(id))
  } catch (err) {
    logger.error('ConceptSetEditor', 'Failed to resolve pasted IDs', err)
    pasteResolved.value = []
    pasteUnresolved.value = ids
  } finally {
    pasteResolving.value = false
  }
}

function applyPastedConcepts() {
  applyConceptsToSet(pasteResolved.value)
  closePasteDialog()
}

function closePasteDialog() {
  showPasteDialog.value = false
  pasteInput.value = ''
  pasteResolved.value = []
  pasteUnresolved.value = []
  pasteResolving.value = false
}

// ============================================================================
// Import by source code
// ============================================================================

// Same reset as pasteInput above: a corrected code should re-enable resolving.
watch(sourceCodeInput, () => {
  if (sourceCodeResolved.value.length || sourceCodeUnresolved.value.length) {
    sourceCodeResolved.value = []
    sourceCodeUnresolved.value = []
  }
})

async function resolvePastedSourceCodes() {
  const codes = parsePastedSourceCodes(sourceCodeInput.value)
  if (codes.length === 0) {
    sourceCodeResolved.value = []
    sourceCodeUnresolved.value = []
    return
  }

  sourceCodeResolving.value = true
  try {
    const concepts = await getConceptsBySourceCodes(sourceKey.value, codes)
    // The vocabulary stores a canonical code that can differ from the typed one
    // only in case/whitespace (matching is commonly case-insensitive), so compare
    // normalized forms — otherwise a code that *did* resolve is wrongly flagged
    // as "Not found".
    const normalize = (code: string) => code.trim().toLowerCase()
    const found = new Set(concepts.map(c => normalize(c.conceptCode ?? '')))
    sourceCodeResolved.value = concepts
    sourceCodeUnresolved.value = codes.filter(code => !found.has(normalize(code)))
  } catch (err) {
    logger.error('ConceptSetEditor', 'Failed to resolve pasted source codes', err)
    sourceCodeResolved.value = []
    sourceCodeUnresolved.value = codes
  } finally {
    sourceCodeResolving.value = false
  }
}

function applySourceCodeConcepts() {
  applyConceptsToSet(sourceCodeResolved.value)
  closeSourceCodeDialog()
}

function closeSourceCodeDialog() {
  showSourceCodeDialog.value = false
  sourceCodeInput.value = ''
  sourceCodeResolved.value = []
  sourceCodeUnresolved.value = []
  sourceCodeResolving.value = false
}

// ============================================================================
// Import by JSON (concept set expression)
// ============================================================================

// Re-parsing is required after any edit, so reset the parsed state when the
// textarea changes. Keeps the action button showing "Parse" until the user
// re-validates the (possibly different) JSON.
watch(jsonInput, () => {
  if (jsonParsed.value) {
    jsonParsed.value = false
    jsonItems.value = []
    jsonError.value = ''
  }
})

function parseJsonImport() {
  const result = parseConceptSetJson(jsonInput.value)
  jsonParsed.value = true
  if (result.ok) {
    jsonItems.value = result.items
    jsonError.value = ''
  } else {
    jsonItems.value = []
    jsonError.value = result.error ?? 'Invalid concept set JSON.'
  }
}

function applyJsonItems() {
  // Add each concept then align its flags to the imported values. A new concept
  // is created with flags=false; an already-present concept is left in place
  // (`addConceptToSet` no-ops on duplicates). The store only exposes a *toggle*,
  // so we toggle only when the current value differs from the imported one —
  // setting flags absolutely. A blind `if (item.flag) toggle(...)` would instead
  // FLIP an existing concept's flags on re-import, silently destroying the
  // user's settings.
  for (const item of jsonItems.value) {
    store.addConceptToSet(item)
    const current = store.currentSet?.items.find(i => i.conceptId === item.conceptId)
    if (!current) continue
    if (current.isExcluded !== item.isExcluded) store.toggleConceptFlag(item.conceptId, 'isExcluded')
    if (current.includeDescendants !== item.includeDescendants)
      store.toggleConceptFlag(item.conceptId, 'includeDescendants')
    if (current.includeMapped !== item.includeMapped)
      store.toggleConceptFlag(item.conceptId, 'includeMapped')
  }
  hasUnsavedChanges.value = true
  activeTab.value = 'selected'
  closeJsonDialog()
}

function closeJsonDialog() {
  showJsonDialog.value = false
  jsonInput.value = ''
  jsonItems.value = []
  jsonError.value = ''
  jsonParsed.value = false
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
  transition: border-color 120ms ease;
}
.cs-editor__title-input::placeholder {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  font-weight: 400;
}
.cs-editor__title-input:hover {
  border-bottom-color: var(--atlas-color-outline);
}
.cs-editor__title-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
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

.cs-editor__main {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.cs-editor__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 28px 28px;
}

/* Concept detail overlays the tabs menu + body within cs-editor__main,
 * leaving the editor header (title / save / close) visible above it. */
.cs-editor__detail-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: rgb(var(--v-theme-surface));
  padding: 16px 28px 28px;
}
.cs-editor__inline-detail-toolbar {
  padding: 4px 0 12px;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  margin-bottom: 12px;
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
