<template>
  <div class="versions-tab-content">
    <VersionsTable
      :config="config"
      :filtered-versions="versionManager.filteredVersions.value"
      :loading="versionManager.loading.value"
      :error="versionManager.error.value"
      :available-authors="versionManager.availableAuthors.value"
      @preview="handlePreview"
      @edit-comment="handleEditComment"
      @copy="handleCopy"
      @clear-filters="versionManager.clearFilters"
      @author-filter="versionManager.setAuthorFilter"
    />

    <!-- Comment Dialog (Phase 5) -->
    <VersionCommentDialog
      v-model="commentDialogOpen"
      :version="selectedVersion"
      :asset-type="config.assetType"
      :asset-id="config.assetId"
      @saved="handleCommentSaved"
    />

    <!-- Success/Error Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>

    <!-- Save Preview as Current Confirmation Dialog (T064) -->
    <v-dialog
      v-model="saveConfirmDialogOpen"
      max-width="500px"
      persistent
    >
      <v-card>
        <v-card-title>{{ t('versions.confirmSaveAsCurrent') }}</v-card-title>
        <v-card-text>
          {{ t('versions.confirmSaveAsCurrentMessage') }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="saveConfirmDialogOpen = false">
            {{ t('versions.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="savingPreview"
            @click="handleSavePreviewAsCurrent"
          >
            {{ t('versions.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import VersionsTable from './VersionsTable.vue'
import VersionCommentDialog from './VersionCommentDialog.vue'
import { useVersions } from '@/composables/useVersions'
import { copyVersion as copyCohortVersion } from '@/services/cohort-definition-versions.service'
import { copyVersion as copyConceptSetVersion } from '@/services/concept-set-versions.service'
import type { VersionsConfig, VersionsTableItem, Version } from './types'

// Props
const props = defineProps<{
  config: VersionsConfig
}>()

// Composables
const router = useRouter()
const { t, tv } = useI18n()
const versionManager = useVersions(props.config)

// Local state
const commentDialogOpen = ref(false)
const selectedVersion = ref<Version | null>(null)
const saveConfirmDialogOpen = ref(false)
const savingPreview = ref(false)
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

// Get appropriate API service for copy
const copyVersionAPI = props.config.assetType === 'cohortdefinition'
  ? copyCohortVersion
  : copyConceptSetVersion

// Load versions on mount
onMounted(async () => {
  await versionManager.loadVersions()
})

// Event handlers

/**
 * Handle preview action - navigate to version route
 * User Story 2 implementation (T035)
 */
function handlePreview(versionNumber: number): void {
  // Check for unsaved changes (T044)
  if (props.config.isDirty.value) {
    const confirmed = confirm(tv('versions.unsavedChanges'))
    if (!confirmed) return
  }

  // Navigate to version preview route (T036)
  router.push({
    path: `/${props.config.assetType}/${props.config.assetId}/version/${versionNumber}`,
  })
}

/**
 * Handle edit comment action
 * User Story 3 implementation (T049)
 */
function handleEditComment(item: VersionsTableItem): void {
  selectedVersion.value = item as Version
  commentDialogOpen.value = true
}

/**
 * Handle comment saved
 * T050: Optimistic update implementation
 */
async function handleCommentSaved(updatedVersion: Version): Promise<void> {
  // Optimistically update the version in the list
  const versionIndex = versionManager.versions.value.findIndex(
    v => v.version === updatedVersion.version
  )

  if (versionIndex !== -1) {
    const existing = versionManager.versions.value[versionIndex]
    if (existing) {
      existing.comment = updatedVersion.comment ?? null
    }
  }

  // Show success message
  showSnackbar(tv('versions.commentSaved'), 'success')
}

/**
 * Handle copy version action
 * User Story 4 implementation (T057, T059)
 */
async function handleCopy(versionNumber: number): Promise<void> {
  // Check for unsaved changes (T060)
  if (props.config.isDirty.value) {
    const confirmed = confirm(tv('versions.unsavedChanges'))
    if (!confirmed) return
  }

  try {
    // Call copy API (T057)
    const newAsset = await copyVersionAPI(props.config.assetId, versionNumber)

    // Show success message
    showSnackbar(tv('versions.copySuccess'), 'success')

    // T059: Clear preview state before navigation
    if (props.config.previewVersion.value) {
      // We're copying while in preview mode - clear the preview state
      if (props.config.clearPreview) {
        props.config.clearPreview()
      } else {
        // Fallback to direct mutation if callback not provided
        // eslint-disable-next-line vue/no-mutating-props
        props.config.previewVersion.value = null
      }
    }

    // Navigate to new asset (T058)
    setTimeout(() => {
      router.push({
        path: `/${props.config.assetType}/${newAsset.id}`,
      })
    }, 1000)
  } catch (error) {
    logger.error('VersionsTabContent', 'Failed to copy version', error)
    showSnackbar(tv('versions.copyError'), 'error')
  }
}

/**
 * Handle save preview as current
 * User Story 5 implementation (T065-T067)
 */
async function handleSavePreviewAsCurrent(): Promise<void> {
  saveConfirmDialogOpen.value = false
  savingPreview.value = true

  try {
    // T065: Call the appropriate store action to save preview as current
    // This will save the current preview state as the new current version
    const success = await savePreviewAsCurrent()

    if (success) {
      // T066: Clear preview state after successful save
      // eslint-disable-next-line vue/no-mutating-props
      props.config.previewVersion.value = null

      // Show success message
      showSnackbar(tv('versions.saveSuccess'), 'success')

      // T067: Refresh the versions list to show the new version
      await versionManager.loadVersions()
    } else {
      showSnackbar(tv('versions.saveError'), 'error')
    }
  } catch (error) {
    logger.error('VersionsTabContent', 'Failed to save preview as current', error)
    showSnackbar(tv('versions.saveError'), 'error')
  } finally {
    savingPreview.value = false
  }
}

/**
 * Get the appropriate save function based on asset type
 */
async function savePreviewAsCurrent(): Promise<boolean> {
  // Use dynamic imports to avoid circular dependencies
  if (props.config.assetType === 'cohortdefinition') {
    const { useCohortStore } = await import('@/stores/cohort')
    const cohortStore = useCohortStore()
    return cohortStore.savePreviewAsCurrent()
  } else {
    const { useConceptSetsStore } = await import('@/stores/concept-sets')
    const conceptSetStore = useConceptSetsStore()
    return conceptSetStore.savePreviewAsCurrent()
  }
}

/**
 * Show snackbar message
 */
function showSnackbar(message: string, color: 'success' | 'error'): void {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}
</script>

<style scoped>
.versions-tab-content {
  padding: 1rem;
}
</style>
