<template>
  <v-navigation-drawer
    :model-value="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      flat
      class="h-100 d-flex flex-column"
    >
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 border-b">
        <v-icon
          class="mr-2"
          color="primary"
        >
          mdi-shape
        </v-icon>
        <span class="text-h6">{{ isEditMode ? t('common.edit', 'Edit').value : t('common.create', 'New').value }} {{ t('common.conceptSet', 'Concept Set').value }}</span>
        <v-spacer />

        <!-- Versions Icon with Badge (only in edit mode) -->
        <v-tooltip
          v-if="isEditMode && props.conceptSet?.id"
          :text="t('versions.tab', 'Versions').value"
          location="bottom"
        >
          <template #activator="{ props: tooltipProps }">
            <v-badge
              v-bind="tooltipProps"
              :content="versionCount"
              color="primary"
              class="mr-4"
            >
              <v-icon
                color="primary"
                icon="mdi-history"
                size="small"
                @click="showVersionsDialog = true"
              />
            </v-badge>
          </template>
        </v-tooltip>

        <!-- Action Buttons -->
        <v-btn
          v-if="isEditMode"
          color="error"
          variant="outlined"
          :disabled="loading"
          class="mr-2"
          @click="onDelete"
        >
          {{ t('common.delete', 'Delete') }}
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :disabled="!formValid || loading"
          :loading="loading"
          class="mr-2"
          @click="onSave"
        >
          {{ isEditMode ? t('common.save', 'Save') : t('common.create', 'Create') }}
        </v-btn>

        <v-btn
          icon="mdi-close"
          variant="text"
          @click="onClose"
        />
      </v-card-title>

      <!-- Form Fields -->
      <v-card-text class="flex-grow-1 overflow-y-auto pa-6">
        <v-form
          ref="formRef"
          v-model="formValid"
        >
          <v-text-field
            v-model="form.name"
            :label="t('columns.name', 'Name').value"
            :placeholder="t('cs.manager.pleaseProvideNameMessage', 'Enter concept set name').value"
            variant="outlined"
            :rules="nameRules"
            :disabled="loading"
            class="mb-4"
          />

          <v-divider class="my-4" />

          <!-- Tabs for concept building -->
          <v-tabs
            v-model="activeTab"
            bg-color="grey-lighten-3"
            class="mb-4"
          >
            <v-tab value="search">
              <v-icon start>
                mdi-magnify
              </v-icon>
              {{ t('search.tabs.search', 'Search') }}
            </v-tab>
            <v-tab value="selected">
              <v-icon start>
                mdi-checkbox-marked-circle
              </v-icon>
              {{ t('cs.manager.selectedConcepts', 'Selected concepts') }} ({{ itemCount }})
            </v-tab>
          </v-tabs>

          <v-window
            v-model="activeTab"
            class="mt-4"
          >
            <!-- Search Tab -->
            <v-window-item value="search">
              <ConceptSearchInline
                @add-concept="onAddConcept"
                @remove-concept="onRemoveConcept"
              />
            </v-window-item>

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
          </v-window>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Versions Dialog -->
    <v-dialog
      v-model="showVersionsDialog"
      max-width="1200px"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ t('versions.tab', 'Versions').value }}</span>
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
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, watch, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import type { VersionsConfig, VersionsTableItem, User } from '@/components/versions/types'
import ConceptSearchInline from './ConceptSearchInline.vue'
import ConceptSetTable from './ConceptSetTable.vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import { getVersions as getConceptSetVersions } from '@/services/concept-set-versions.service'

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

// ============================================================================
// Computed
// ============================================================================

const isEditMode = computed(() => {
  return props.conceptSet?.id !== undefined && props.conceptSet?.id !== null
})

const itemCount = computed(() => {
  return store.currentSet?.items?.length || 0
})

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

const nameRules = [
  (v: string) => !!v || t('commonErrors.required', 'Name is required').value,
  (v: string) => (v && v.length >= 1 && v.length <= 255) || t('commonErrors.lengthValidation', 'Name must be between 1 and 255 characters').value,
]

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

// Track unsaved changes
watch(form, () => {
  if (props.modelValue) {
    hasUnsavedChanges.value = true
  }
}, { deep: true })

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

function onClose() {
  if (hasUnsavedChanges.value) {
    const confirmed = confirm('You have unsaved changes. Are you sure you want to close?')
    if (!confirmed) return
  }

  hasUnsavedChanges.value = false
  emit('update:modelValue', false)
}

function onDelete() {
  if (!props.conceptSet?.id) return

  const confirmed = confirm(`Are you sure you want to delete "${props.conceptSet.name}"?`)
  if (!confirmed) return

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
</script>

<style scoped>
.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
