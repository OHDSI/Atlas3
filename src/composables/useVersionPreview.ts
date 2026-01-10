/**
 * useVersionPreview Composable
 * Business logic for version preview state management
 * T034: Core composable for preview functionality
 */
import { computed, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Version } from '@/components/versions/types'

export interface VersionPreviewConfig {
  assetType: 'cohortdefinition' | 'conceptset'
  assetId: number
  previewVersion: Ref<Version | null>
  isDirty: Ref<boolean>
  clearPreviewVersion: () => Promise<void>
}

export function useVersionPreview(config: VersionPreviewConfig) {
  const router = useRouter()

  /**
   * Check if currently in preview mode
   */
  const isPreviewing = computed(() => config.previewVersion.value !== null)

  /**
   * Get preview version number
   */
  const previewVersionNumber = computed(() => config.previewVersion.value?.version ?? null)

  /**
   * Navigate to preview a specific version
   * Checks for unsaved changes before navigating
   * T034: Handles preview navigation with unsaved changes check
   */
  async function navigateToPreview(versionNumber: number): Promise<boolean> {
    // Check for unsaved changes (T044)
    if (config.isDirty.value) {
      const confirmed = confirm('You have unsaved changes. Proceeding will discard them. Continue?')
      if (!confirmed) return false
    }

    // Navigate to version preview route
    await router.push({
      path: `/${config.assetType}/${config.assetId}/version/${versionNumber}`,
    })

    return true
  }

  /**
   * Navigate back to current version
   * Clears preview state and reloads current
   * T034: Back to current navigation
   */
  async function navigateToCurrent(): Promise<void> {
    await router.push({
      path: `/${config.assetType}/${config.assetId}/version/current`,
    })
  }

  /**
   * Handle preview link click
   * T035: Preview link handler for VersionsTable
   */
  async function handlePreviewClick(versionNumber: number): Promise<void> {
    await navigateToPreview(versionNumber)
  }

  /**
   * Handle back to current button click
   * T038/T039: Back to Current Version button handler
   */
  async function handleBackToCurrent(): Promise<void> {
    await navigateToCurrent()
  }

  return {
    // Computed
    isPreviewing,
    previewVersionNumber,

    // Actions
    navigateToPreview,
    navigateToCurrent,
    handlePreviewClick,
    handleBackToCurrent,
  }
}
