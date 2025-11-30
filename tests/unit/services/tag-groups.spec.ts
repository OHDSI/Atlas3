/**
 * Tag Groups API Service Tests (T097)
 * Tests for tag groups WebAPI integration with mocked fetch
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as tagGroupsAPI from '@/services/tag-groups'
import type { Tag, TagGroup } from '@/models/config.types'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Tag Groups API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockTagGroup: TagGroup = {
    id: 1,
    name: 'Test Group',
    color: '#FF0000',
    icon: 'mdi-tag',
    mandatory: false,
    showColumn: true,
    multiple: false,
    freeForm: false,
    groups: []
  }

  const mockTag: Tag = {
    id: 2,
    name: 'Test Tag',
    groups: [{ id: 1, name: 'Test Group' }]
  }

  describe('loadAvailableTags', () => {
    it('should fetch all tags successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTagGroup, mockTag]
      })

      const tags = await tagGroupsAPI.loadAvailableTags()

      expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/')
      expect(tags).toHaveLength(2)
      expect(tags[0]).toEqual(mockTagGroup)
      expect(tags[1]).toEqual(mockTag)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('Failed to fetch tags: Internal Server Error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('Network error')
    })
  })

  describe('listTagGroups', () => {
    it('should filter and return only tag groups (empty groups array)', async () => {
      const allTags = [
        { id: 1, name: 'Group 1', groups: [] },
        { id: 2, name: 'Tag 1', groups: [{ id: 1, name: 'Group 1' }] },
        { id: 3, name: 'Group 2', groups: [] },
        { id: 4, name: 'Tag 2', groups: [{ id: 3, name: 'Group 2' }] }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allTags
      })

      const tagGroups = await tagGroupsAPI.listTagGroups()

      expect(tagGroups).toHaveLength(2)
      expect(tagGroups[0].id).toBe(1)
      expect(tagGroups[1].id).toBe(3)
    })

    it('should return empty array when no tag groups exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, name: 'Tag 1', groups: [{ id: 2, name: 'Group' }] }
        ]
      })

      const tagGroups = await tagGroupsAPI.listTagGroups()

      expect(tagGroups).toHaveLength(0)
    })

    it('should handle tags with no groups property', async () => {
      const allTags = [
        { id: 1, name: 'Tag without groups' },
        { id: 2, name: 'Tag with groups', groups: [{ id: 1, name: 'Group' }] }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allTags
      })

      const tagGroups = await tagGroupsAPI.listTagGroups()

      // Tag without groups property is treated as a tag group
      expect(tagGroups).toHaveLength(1)
      expect(tagGroups[0].id).toBe(1)
    })
  })

  describe('createTagGroup', () => {
    it('should create tag group successfully', async () => {
      const newGroup = {
        name: 'New Group',
        color: '#00FF00',
        mandatory: true,
        showColumn: true,
        multiple: false,
        freeForm: false
      }
      const createdGroup = { ...newGroup, id: 5, groups: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdGroup
      })

      const result = await tagGroupsAPI.createTagGroup(newGroup)

      expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newGroup, groups: [] })
      })
      expect(result).toEqual(createdGroup)
    })

    it('should throw error on creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Validation failed'
      })

      await expect(tagGroupsAPI.createTagGroup({
        name: 'Invalid',
        mandatory: false,
        showColumn: true,
        multiple: false,
        freeForm: false
      })).rejects.toThrow('Failed to create tag group: Validation failed')
    })
  })

  describe('updateTagGroup', () => {
    it('should update tag group successfully', async () => {
      const updatedGroup = { ...mockTagGroup, name: 'Updated Group' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedGroup
      })

      const result = await tagGroupsAPI.updateTagGroup(updatedGroup)

      expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGroup)
      })
      expect(result).toEqual(updatedGroup)
    })

    it('should throw error when ID is missing', async () => {
      const invalidGroup = { ...mockTagGroup, id: undefined } as unknown

      await expect(tagGroupsAPI.updateTagGroup(invalidGroup)).rejects.toThrow('Tag ID is required for update')
    })

    it('should handle update failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Tag not found'
      })

      await expect(tagGroupsAPI.updateTagGroup(mockTagGroup)).rejects.toThrow('Failed to update tag group: Tag not found')
    })

    it('should ensure groups array exists when updating', async () => {
      const groupWithoutGroupsArray = { ...mockTagGroup, groups: undefined } as unknown

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...groupWithoutGroupsArray, groups: [] })
      })

      await tagGroupsAPI.updateTagGroup(groupWithoutGroupsArray)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.groups).toEqual([])
    })
  })

  describe('deleteTagGroup', () => {
    it('should delete tag group successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      })

      await tagGroupsAPI.deleteTagGroup(1)

      expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/1', {
        method: 'DELETE'
      })
    })

    it('should throw error on deletion failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Cannot delete: group contains tags'
      })

      await expect(tagGroupsAPI.deleteTagGroup(1)).rejects.toThrow('Failed to delete tag: Cannot delete: group contains tags')
    })
  })

  describe('getTagGroupTags', () => {
    it('should return tags belonging to a specific group', async () => {
      const allTags = [
        { id: 1, name: 'Group 1', groups: [] },
        { id: 2, name: 'Tag 1', groups: [{ id: 1, name: 'Group 1' }] },
        { id: 3, name: 'Tag 2', groups: [{ id: 1, name: 'Group 1' }] },
        { id: 4, name: 'Tag 3', groups: [{ id: 2, name: 'Group 2' }] }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allTags
      })

      const tags = await tagGroupsAPI.getTagGroupTags(1)

      expect(tags).toHaveLength(2)
      expect(tags[0].id).toBe(2)
      expect(tags[1].id).toBe(3)
    })

    it('should return empty array if group has no tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 1, name: 'Empty Group', groups: [] }
        ]
      })

      const tags = await tagGroupsAPI.getTagGroupTags(1)

      expect(tags).toHaveLength(0)
    })

    it('should handle tags with multiple groups', async () => {
      const allTags = [
        {
          id: 1,
          name: 'Multi-group Tag',
          groups: [
            { id: 1, name: 'Group 1' },
            { id: 2, name: 'Group 2' }
          ]
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => allTags
      })

      const tags = await tagGroupsAPI.getTagGroupTags(1)

      expect(tags).toHaveLength(1)
      expect(tags[0].id).toBe(1)
    })
  })

  describe('searchTags', () => {
    it('should search tags by name', async () => {
      const searchResults = [
        { id: 1, name: 'Test Tag 1' },
        { id: 2, name: 'Test Tag 2' }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => searchResults
      })

      const results = await tagGroupsAPI.searchTags('test')

      expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/search?namePart=test')
      expect(results).toEqual(searchResults)
    })

    it('should encode special characters in search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      await tagGroupsAPI.searchTags('test & special')

      expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/search?namePart=test%20%26%20special')
    })

    it('should throw error on search failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      })

      await expect(tagGroupsAPI.searchTags('test')).rejects.toThrow('Failed to search tags: Bad Request')
    })
  })

  describe('Individual Tag Operations', () => {
    describe('createTag', () => {
      it('should create tag successfully', async () => {
        const newTag = {
          name: 'New Tag',
          groups: [{ id: 1, name: 'Group 1' }]
        }
        const createdTag = { ...newTag, id: 10 }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createdTag
        })

        const result = await tagGroupsAPI.createTag(newTag)

        expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTag)
        })
        expect(result).toEqual(createdTag)
      })

      it('should throw error on creation failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: async () => 'Tag name required'
        })

        await expect(tagGroupsAPI.createTag({
          name: '',
          groups: []
        })).rejects.toThrow('Failed to create tag: Tag name required')
      })
    })

    describe('updateTag', () => {
      it('should update tag successfully', async () => {
        const updatedTag = { ...mockTag, name: 'Updated Tag' }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedTag
        })

        const result = await tagGroupsAPI.updateTag(updatedTag)

        expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/2', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTag)
        })
        expect(result).toEqual(updatedTag)
      })

      it('should throw error when ID is missing', async () => {
        const invalidTag = { ...mockTag, id: undefined } as unknown

        await expect(tagGroupsAPI.updateTag(invalidTag)).rejects.toThrow('Tag ID is required for update')
      })

      it('should handle update failures', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: async () => 'Conflict'
        })

        await expect(tagGroupsAPI.updateTag(mockTag)).rejects.toThrow('Failed to update tag: Conflict')
      })
    })

    describe('deleteTag', () => {
      it('should delete tag successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true
        })

        await tagGroupsAPI.deleteTag(2)

        expect(mockFetch).toHaveBeenCalledWith('/WebAPI/tag/2', {
          method: 'DELETE'
        })
      })

      it('should throw error on deletion failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          text: async () => 'Tag not found'
        })

        await expect(tagGroupsAPI.deleteTag(999)).rejects.toThrow('Failed to delete tag: Tag not found')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('Invalid JSON')
    })

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('Request timeout')
    })
  })
})
