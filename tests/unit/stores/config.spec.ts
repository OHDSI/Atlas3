/**
 * Configuration Store Tests
 * Tests for configuration state management (cache, vocabulary schema, tag groups)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfigStore } from '@/stores/config'
import type { TagGroup, Tag } from '@/models/config.types'
import * as configCache from '@/services/config-cache'
import * as tagGroupsAPI from '@/services/tag-groups'

// Mock the services
vi.mock('@/services/config-cache')
vi.mock('@/services/tag-groups')

describe('Config Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Cache Management (T093)', () => {
    it('should clear cache successfully', async () => {
      const store = useConfigStore()
      const mockClearCache = vi.mocked(configCache.clearConfigCache)
      mockClearCache.mockResolvedValueOnce(undefined)

      expect(store.isLoadingCacheOp).toBe(false)

      const promise = store.clearCache()
      expect(store.isLoadingCacheOp).toBe(true)

      await promise
      expect(mockClearCache).toHaveBeenCalled()
      expect(store.isLoadingCacheOp).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle cache clear errors', async () => {
      const store = useConfigStore()
      const mockClearCache = vi.mocked(configCache.clearConfigCache)
      const errorMessage = 'Failed to clear cache'
      mockClearCache.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.clearCache()).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.isLoadingCacheOp).toBe(false)
    })

    it('should get cache statistics', async () => {
      const store = useConfigStore()
      const mockStats = { itemCount: 10, estimatedSize: 1024 }
      const mockGetCacheStats = vi.mocked(configCache.getCacheStats)
      mockGetCacheStats.mockResolvedValueOnce(mockStats)

      const stats = await store.getCacheStats()
      expect(stats).toEqual(mockStats)
      expect(mockGetCacheStats).toHaveBeenCalled()
    })

    it('should handle cache stats errors', async () => {
      const store = useConfigStore()
      const mockGetCacheStats = vi.mocked(configCache.getCacheStats)
      const errorMessage = 'Failed to get stats'
      mockGetCacheStats.mockRejectedValueOnce(new Error(errorMessage))

      await expect(store.getCacheStats()).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
    })
  })

  describe('Vocabulary Schema (T094)', () => {
    it('should fetch vocabulary schema successfully', async () => {
      const store = useConfigStore()
      const mockSchema = 'custom_schema'
      const mockGetVocabularySchema = vi.mocked(configCache.getVocabularySchema)
      mockGetVocabularySchema.mockReturnValueOnce(mockSchema)

      expect(store.isLoadingVocabSchema).toBe(false)

      await store.fetchVocabularySchema()
      expect(store.vocabularySchema).toBe(mockSchema)
      expect(store.isLoadingVocabSchema).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should handle fetch vocabulary schema errors', async () => {
      const store = useConfigStore()
      const mockGetVocabularySchema = vi.mocked(configCache.getVocabularySchema)
      const errorMessage = 'Failed to fetch schema'
      mockGetVocabularySchema.mockImplementationOnce(() => {
        throw new Error(errorMessage)
      })

      await expect(store.fetchVocabularySchema()).rejects.toThrow(errorMessage)
      expect(store.error).toBe(errorMessage)
      expect(store.isLoadingVocabSchema).toBe(false)
    })

    it('should update vocabulary schema with optimistic update', async () => {
      const store = useConfigStore()
      const oldSchema = 'public'
      const newSchema = 'custom_schema'
      const mockSetVocabularySchema = vi.mocked(configCache.setVocabularySchema)
      mockSetVocabularySchema.mockReturnValueOnce(undefined)

      store.vocabularySchema = oldSchema

      await store.updateVocabularySchema(newSchema)

      expect(mockSetVocabularySchema).toHaveBeenCalledWith(newSchema)
      expect(store.vocabularySchema).toBe(newSchema)
      expect(store.isLoadingVocabSchema).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should rollback on update vocabulary schema error', async () => {
      const store = useConfigStore()
      const oldSchema = 'public'
      const newSchema = 'invalid_schema'
      const mockSetVocabularySchema = vi.mocked(configCache.setVocabularySchema)
      const errorMessage = 'Invalid schema name'
      mockSetVocabularySchema.mockImplementationOnce(() => {
        throw new Error(errorMessage)
      })

      store.vocabularySchema = oldSchema

      await expect(store.updateVocabularySchema(newSchema)).rejects.toThrow(errorMessage)

      // Should rollback to old value
      expect(store.vocabularySchema).toBe(oldSchema)
      expect(store.error).toBe(errorMessage)
      expect(store.isLoadingVocabSchema).toBe(false)
    })
  })

  describe('Tag Groups CRUD with Optimistic Updates (T095)', () => {
    const mockTagGroup: TagGroup = {
      id: 1,
      name: 'Test Group',
      color: '#FF0000',
      icon: 'mdi-tag',
      mandatory: false,
      showColumn: true,
      multiple: false,
      freeForm: false,
      description: 'Test description',
      created: '2025-01-15T10:00:00Z',
      author: 'test-user'
    }

    const mockTag: Tag = {
      id: 1,
      name: 'Test Tag',
      groups: [{ id: 1, name: 'Test Group' }]
    }

    describe('Fetch Tag Groups', () => {
      it('should fetch tag groups and tags successfully', async () => {
        const store = useConfigStore()
        const mockListTagGroups = vi.mocked(tagGroupsAPI.listTagGroups)
        const mockLoadAvailableTags = vi.mocked(tagGroupsAPI.loadAvailableTags)

        mockListTagGroups.mockResolvedValueOnce([mockTagGroup])
        mockLoadAvailableTags.mockResolvedValueOnce([mockTag])

        expect(store.isLoadingTagGroups).toBe(false)

        await store.fetchTagGroups()

        expect(store.tagGroups).toHaveLength(1)
        expect(store.tagGroups[0]).toEqual(mockTagGroup)
        expect(store.allTags).toHaveLength(1)
        expect(store.allTags[0]).toEqual(mockTag)
        expect(store.isLoadingTagGroups).toBe(false)
        expect(store.error).toBeNull()
      })

      it('should handle fetch tag groups errors', async () => {
        const store = useConfigStore()
        const mockLoadAvailableTags = vi.mocked(tagGroupsAPI.loadAvailableTags)
        const errorMessage = 'Network error'
        mockLoadAvailableTags.mockRejectedValueOnce(new Error(errorMessage))

        await expect(store.fetchTagGroups()).rejects.toThrow(errorMessage)
        expect(store.error).toBe(errorMessage)
        expect(store.isLoadingTagGroups).toBe(false)
      })
    })

    describe('Get Tags for Group', () => {
      it('should return tags for a specific group', () => {
        const store = useConfigStore()
        store.allTags = [
          { id: 1, name: 'Tag 1', groups: [{ id: 1, name: 'Group 1' }] },
          { id: 2, name: 'Tag 2', groups: [{ id: 2, name: 'Group 2' }] },
          { id: 3, name: 'Tag 3', groups: [{ id: 1, name: 'Group 1' }] }
        ]

        const tags = store.getTagsForGroup(1)
        expect(tags).toHaveLength(2)
        expect(tags[0].id).toBe(1)
        expect(tags[1].id).toBe(3)
      })

      it('should return empty array if no tags for group', () => {
        const store = useConfigStore()
        store.allTags = [
          { id: 1, name: 'Tag 1', groups: [{ id: 1, name: 'Group 1' }] }
        ]

        const tags = store.getTagsForGroup(999)
        expect(tags).toHaveLength(0)
      })
    })

    describe('Create Tag Group', () => {
      it('should create tag group with optimistic update', async () => {
        const store = useConfigStore()
        const newGroup: Omit<TagGroup, 'id'> = {
          name: 'New Group',
          color: '#00FF00',
          icon: 'mdi-folder',
          mandatory: true,
          showColumn: true,
          multiple: true,
          freeForm: false
        }
        const createdGroup: TagGroup = { ...newGroup, id: 2 }
        const mockCreateTagGroup = vi.mocked(tagGroupsAPI.createTagGroup)
        mockCreateTagGroup.mockResolvedValueOnce(createdGroup)

        const promise = store.createTagGroup(newGroup)

        // Optimistic update - should add immediately with temp ID
        expect(store.tagGroups).toHaveLength(1)
        expect(store.tagGroups[0].name).toBe('New Group')
        expect(store.tagGroups[0].id).toBeLessThan(0) // Temp ID is negative

        await promise

        // Should replace with real ID
        expect(store.tagGroups).toHaveLength(1)
        expect(store.tagGroups[0].id).toBe(2)
        expect(mockCreateTagGroup).toHaveBeenCalledWith(newGroup)
      })

      it('should rollback on create error', async () => {
        const store = useConfigStore()
        const newGroup: Omit<TagGroup, 'id'> = {
          name: 'Failed Group',
          mandatory: false,
          showColumn: true,
          multiple: false,
          freeForm: false
        }
        const mockCreateTagGroup = vi.mocked(tagGroupsAPI.createTagGroup)
        const errorMessage = 'Creation failed'
        mockCreateTagGroup.mockRejectedValueOnce(new Error(errorMessage))

        await expect(store.createTagGroup(newGroup)).rejects.toThrow(errorMessage)

        // Should rollback - no groups should exist
        expect(store.tagGroups).toHaveLength(0)
        expect(store.error).toBe(errorMessage)
      })
    })

    describe('Update Tag Group', () => {
      it('should update tag group with optimistic update', async () => {
        const store = useConfigStore()
        store.tagGroups = [{ ...mockTagGroup }]

        const updatedGroup: TagGroup = { ...mockTagGroup, name: 'Updated Group' }
        const mockUpdateTagGroup = vi.mocked(tagGroupsAPI.updateTagGroup)
        mockUpdateTagGroup.mockResolvedValueOnce(updatedGroup)

        const promise = store.updateTagGroup(updatedGroup)

        // Optimistic update - should change immediately
        expect(store.tagGroups[0].name).toBe('Updated Group')

        await promise
        expect(mockUpdateTagGroup).toHaveBeenCalledWith(updatedGroup)
        expect(store.tagGroups[0].name).toBe('Updated Group')
      })

      it('should rollback on update error', async () => {
        const store = useConfigStore()
        const original = { ...mockTagGroup, name: 'Original Name' }
        store.tagGroups = [original]

        const updatedGroup: TagGroup = { ...mockTagGroup, name: 'Failed Update' }
        const mockUpdateTagGroup = vi.mocked(tagGroupsAPI.updateTagGroup)
        const errorMessage = 'Update failed'
        mockUpdateTagGroup.mockRejectedValueOnce(new Error(errorMessage))

        await expect(store.updateTagGroup(updatedGroup)).rejects.toThrow(errorMessage)

        // Should rollback to original
        expect(store.tagGroups[0].name).toBe('Original Name')
        expect(store.error).toBe(errorMessage)
      })

      it('should throw error if tag group not found', async () => {
        const store = useConfigStore()
        const nonExistentGroup: TagGroup = { ...mockTagGroup, id: 999 }

        await expect(store.updateTagGroup(nonExistentGroup)).rejects.toThrow('Tag group not found')
      })
    })

    describe('Delete Tag Group', () => {
      it('should delete empty tag group with optimistic update', async () => {
        const store = useConfigStore()
        store.tagGroups = [{ ...mockTagGroup }]

        const mockGetTagGroupTags = vi.mocked(tagGroupsAPI.getTagGroupTags)
        const mockDeleteTagGroup = vi.mocked(tagGroupsAPI.deleteTagGroup)
        mockGetTagGroupTags.mockResolvedValueOnce([]) // Empty group
        mockDeleteTagGroup.mockResolvedValueOnce(undefined)

        const promise = store.deleteTagGroup(1)

        // Should wait for tags check before optimistic delete
        await promise

        expect(mockGetTagGroupTags).toHaveBeenCalledWith(1)
        expect(mockDeleteTagGroup).toHaveBeenCalledWith(1)
        expect(store.tagGroups).toHaveLength(0)
      })

      it('should prevent deleting non-empty tag group', async () => {
        const store = useConfigStore()
        store.tagGroups = [{ ...mockTagGroup }]

        const mockGetTagGroupTags = vi.mocked(tagGroupsAPI.getTagGroupTags)
        mockGetTagGroupTags.mockResolvedValueOnce([mockTag]) // Has tags

        await expect(store.deleteTagGroup(1)).rejects.toThrow('Cannot delete tag group: the group contains tags')

        // Should not delete
        expect(store.tagGroups).toHaveLength(1)
        expect(store.error).toContain('contains tags')
      })

      it('should rollback on delete error', async () => {
        const store = useConfigStore()
        store.tagGroups = [{ ...mockTagGroup }]

        const mockGetTagGroupTags = vi.mocked(tagGroupsAPI.getTagGroupTags)
        const mockDeleteTagGroup = vi.mocked(tagGroupsAPI.deleteTagGroup)
        mockGetTagGroupTags.mockResolvedValueOnce([]) // Empty group
        const errorMessage = 'Delete failed'
        mockDeleteTagGroup.mockRejectedValueOnce(new Error(errorMessage))

        await expect(store.deleteTagGroup(1)).rejects.toThrow(errorMessage)

        // Should rollback - group should still exist
        expect(store.tagGroups).toHaveLength(1)
        expect(store.tagGroups[0].id).toBe(1)
        expect(store.error).toBe(errorMessage)
      })

      it('should throw error if tag group not found', async () => {
        const store = useConfigStore()

        await expect(store.deleteTagGroup(999)).rejects.toThrow('Tag group not found')
      })
    })

    describe('Individual Tag Operations', () => {
      it('should create tag', async () => {
        const store = useConfigStore()
        const newTag: Omit<Tag, 'id'> = {
          name: 'New Tag',
          groups: [{ id: 1, name: 'Group 1' }]
        }
        const createdTag: Tag = { ...newTag, id: 2 }
        const mockCreateTag = vi.mocked(tagGroupsAPI.createTag)
        mockCreateTag.mockResolvedValueOnce(createdTag)

        const result = await store.createTag(newTag)

        expect(result).toEqual(createdTag)
        expect(store.allTags).toHaveLength(1)
        expect(store.allTags[0]).toEqual(createdTag)
        expect(mockCreateTag).toHaveBeenCalledWith(newTag)
      })

      it('should update tag with optimistic update', async () => {
        const store = useConfigStore()
        store.allTags = [{ ...mockTag }]

        const updatedTag: Tag = { ...mockTag, name: 'Updated Tag' }
        const mockUpdateTag = vi.mocked(tagGroupsAPI.updateTag)
        mockUpdateTag.mockResolvedValueOnce(updatedTag)

        const result = await store.updateTag(updatedTag)

        expect(result).toEqual(updatedTag)
        expect(store.allTags[0].name).toBe('Updated Tag')
      })

      it('should rollback on update tag error', async () => {
        const store = useConfigStore()
        const original = { ...mockTag, name: 'Original Tag' }
        store.allTags = [original]

        const updatedTag: Tag = { ...mockTag, name: 'Failed Tag' }
        const mockUpdateTag = vi.mocked(tagGroupsAPI.updateTag)
        mockUpdateTag.mockRejectedValueOnce(new Error('Update failed'))

        await expect(store.updateTag(updatedTag)).rejects.toThrow('Update failed')
        expect(store.allTags[0].name).toBe('Original Tag')
      })

      it('should delete tag with optimistic update', async () => {
        const store = useConfigStore()
        store.allTags = [{ ...mockTag }]

        const mockDeleteTag = vi.mocked(tagGroupsAPI.deleteTag)
        mockDeleteTag.mockResolvedValueOnce(undefined)

        await store.deleteTag(1)

        expect(store.allTags).toHaveLength(0)
        expect(mockDeleteTag).toHaveBeenCalledWith(1)
      })

      it('should rollback on delete tag error', async () => {
        const store = useConfigStore()
        store.allTags = [{ ...mockTag }]

        const mockDeleteTag = vi.mocked(tagGroupsAPI.deleteTag)
        mockDeleteTag.mockRejectedValueOnce(new Error('Delete failed'))

        await expect(store.deleteTag(1)).rejects.toThrow('Delete failed')
        expect(store.allTags).toHaveLength(1)
      })
    })
  })
})
