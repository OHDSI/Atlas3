/**
 * Unit tests for useVersionPreview composable
 * T032: Test preview navigation, state management, unsaved changes check
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useVersionPreview } from '@/composables/useVersionPreview'
import type { VersionPreviewConfig } from '@/composables/useVersionPreview'

// Mock vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock window.confirm
global.confirm = vi.fn()

describe('useVersionPreview', () => {
  const mockConfig: VersionPreviewConfig = {
    assetType: 'cohortdefinition',
    assetId: 123,
    previewVersion: ref(null),
    isDirty: ref(false),
    clearPreviewVersion: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isPreviewing', () => {
    it('should return false when previewVersion is null', () => {
      const config = { ...mockConfig, previewVersion: ref(null) }
      const { isPreviewing } = useVersionPreview(config)

      expect(isPreviewing.value).toBe(false)
    })

    it('should return true when previewVersion is set', () => {
      const config = {
        ...mockConfig,
        previewVersion: ref({
          version: 5,
          assetId: 123,
          createdBy: { id: 1, name: 'Test', email: 'test@test.com' },
          createdDate: '2024-01-01T00:00:00Z',
          comment: null,
          archived: false,
        }),
      }
      const { isPreviewing } = useVersionPreview(config)

      expect(isPreviewing.value).toBe(true)
    })
  })

  describe('navigateToPreview', () => {
    it('should navigate to version route when no unsaved changes', async () => {
      const config = { ...mockConfig, isDirty: ref(false) }
      const { navigateToPreview } = useVersionPreview(config)

      const result = await navigateToPreview(5)

      expect(result).toBe(true)
      expect(mockPush).toHaveBeenCalledWith({
        path: '/cohortdefinition/123/version/5',
      })
    })

    it('should show confirmation when there are unsaved changes', async () => {
      const config = { ...mockConfig, isDirty: ref(true) }
      const { navigateToPreview } = useVersionPreview(config)

      vi.mocked(global.confirm).mockReturnValue(true)

      const result = await navigateToPreview(5)

      expect(global.confirm).toHaveBeenCalled()
      expect(result).toBe(true)
      expect(mockPush).toHaveBeenCalled()
    })

    it('should not navigate if user cancels confirmation', async () => {
      const config = { ...mockConfig, isDirty: ref(true) }
      const { navigateToPreview } = useVersionPreview(config)

      vi.mocked(global.confirm).mockReturnValue(false)

      const result = await navigateToPreview(5)

      expect(result).toBe(false)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should use concept set route for concept sets', async () => {
      const config = {
        ...mockConfig,
        assetType: 'conceptset' as const,
        isDirty: ref(false),
      }
      const { navigateToPreview } = useVersionPreview(config)

      await navigateToPreview(5)

      expect(mockPush).toHaveBeenCalledWith({
        path: '/conceptset/123/version/5',
      })
    })
  })

  describe('navigateToCurrent', () => {
    it('should navigate to current version route', async () => {
      const { navigateToCurrent } = useVersionPreview(mockConfig)

      await navigateToCurrent()

      expect(mockPush).toHaveBeenCalledWith({
        path: '/cohortdefinition/123/version/current',
      })
    })
  })

  describe('handleBackToCurrent', () => {
    it('should call navigateToCurrent', async () => {
      const { handleBackToCurrent } = useVersionPreview(mockConfig)

      await handleBackToCurrent()

      expect(mockPush).toHaveBeenCalledWith({
        path: '/cohortdefinition/123/version/current',
      })
    })
  })

  describe('handlePreviewClick', () => {
    it('should navigate to the given version number', async () => {
      const config = { ...mockConfig, isDirty: ref(false) }
      const { handlePreviewClick } = useVersionPreview(config)

      await handlePreviewClick(3)

      expect(mockPush).toHaveBeenCalledWith({ path: '/cohortdefinition/123/version/3' })
    })
  })

  describe('previewVersionNumber', () => {
    it('should return null when not previewing', () => {
      const config = { ...mockConfig, previewVersion: ref(null) }
      const { previewVersionNumber } = useVersionPreview(config)

      expect(previewVersionNumber.value).toBe(null)
    })

    it('should return version number when previewing', () => {
      const config = {
        ...mockConfig,
        previewVersion: ref({
          version: 7,
          assetId: 123,
          createdBy: { id: 1, name: 'Test', email: 'test@test.com' },
          createdDate: '2024-01-01T00:00:00Z',
          comment: null,
          archived: false,
        }),
      }
      const { previewVersionNumber } = useVersionPreview(config)

      expect(previewVersionNumber.value).toBe(7)
    })
  })
})
