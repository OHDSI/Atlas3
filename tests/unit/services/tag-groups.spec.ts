/**
 * Tag Groups API Service Tests (T097)
 * Tests for tag groups WebAPI integration with mocked http-client
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Tag, TagGroup } from '@/models/config.types'

// Mock http-client module
const mockHttpGet = vi.fn()
const mockHttpPost = vi.fn()
const mockHttpPut = vi.fn()
const mockHttpDelete = vi.fn()

vi.mock('@/services/http-client', () => ({
  httpGet: (url: string) => mockHttpGet(url),
  httpPost: (url: string, body?: unknown) => mockHttpPost(url, body),
  httpPut: (url: string, body?: unknown) => mockHttpPut(url, body),
  httpDelete: (url: string) => mockHttpDelete(url),
}))

// Import after mocking
import * as tagGroupsAPI from '@/services/tag-groups'

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
      mockHttpGet.mockResolvedValueOnce([mockTagGroup, mockTag])

      const tags = await tagGroupsAPI.loadAvailableTags()

      expect(tags).toHaveLength(2)
      expect(tags[0]).toEqual(mockTagGroup)
      expect(tags[1]).toEqual(mockTag)
    })

    it('should throw error on failed request', async () => {
      mockHttpGet.mockRejectedValueOnce(new Error('HTTP 500: Internal Server Error'))

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('HTTP 500: Internal Server Error')
    })

    it('should handle network errors', async () => {
      mockHttpGet.mockRejectedValueOnce(new Error('Network error'))

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

      mockHttpGet.mockResolvedValueOnce(allTags)

      const tagGroups = await tagGroupsAPI.listTagGroups()

      expect(tagGroups).toHaveLength(2)
      expect(tagGroups[0].id).toBe(1)
      expect(tagGroups[1].id).toBe(3)
    })

    it('should return empty array when no tag groups exist', async () => {
      mockHttpGet.mockResolvedValueOnce([
        { id: 1, name: 'Tag 1', groups: [{ id: 2, name: 'Group' }] }
      ])

      const tagGroups = await tagGroupsAPI.listTagGroups()

      expect(tagGroups).toHaveLength(0)
    })

    it('should handle tags with no groups property', async () => {
      const allTags = [
        { id: 1, name: 'Tag without groups' },
        { id: 2, name: 'Tag with groups', groups: [{ id: 1, name: 'Group' }] }
      ]

      mockHttpGet.mockResolvedValueOnce(allTags)

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

      mockHttpPost.mockResolvedValueOnce(createdGroup)

      const result = await tagGroupsAPI.createTagGroup(newGroup)

      expect(result).toEqual(createdGroup)
      expect(mockHttpPost).toHaveBeenCalledWith('/tag/', { ...newGroup, groups: [] })
    })

    it('should throw error on creation failure', async () => {
      mockHttpPost.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(tagGroupsAPI.createTagGroup({
        name: 'Invalid',
        mandatory: false,
        showColumn: true,
        multiple: false,
        freeForm: false
      })).rejects.toThrow('HTTP 400: Bad Request')
    })
  })

  describe('updateTagGroup', () => {
    it('should update tag group successfully', async () => {
      const updatedGroup = { ...mockTagGroup, name: 'Updated Group' }

      mockHttpPut.mockResolvedValueOnce(updatedGroup)

      const result = await tagGroupsAPI.updateTagGroup(updatedGroup)

      expect(result).toEqual(updatedGroup)
    })

    it('should throw error when ID is missing', async () => {
      const invalidGroup = { ...mockTagGroup, id: undefined } as unknown

      await expect(tagGroupsAPI.updateTagGroup(invalidGroup)).rejects.toThrow('Tag ID is required for update')
    })

    it('should handle update failures', async () => {
      mockHttpPut.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      await expect(tagGroupsAPI.updateTagGroup(mockTagGroup)).rejects.toThrow('HTTP 404: Not Found')
    })

    it('should ensure groups array exists when updating', async () => {
      const groupWithoutGroupsArray = { ...mockTagGroup, groups: undefined } as unknown

      mockHttpPut.mockResolvedValueOnce({ ...groupWithoutGroupsArray, groups: [] })

      await tagGroupsAPI.updateTagGroup(groupWithoutGroupsArray)

      expect(mockHttpPut).toHaveBeenCalledWith(`/tag/${mockTagGroup.id}`, expect.objectContaining({ groups: [] }))
    })
  })

  describe('deleteTagGroup', () => {
    it('should delete tag group successfully', async () => {
      mockHttpDelete.mockResolvedValueOnce(undefined)

      await tagGroupsAPI.deleteTagGroup(1)

      expect(mockHttpDelete).toHaveBeenCalledWith('/tag/1')
    })

    it('should throw error on deletion failure', async () => {
      mockHttpDelete.mockRejectedValueOnce(new Error('HTTP 409: Conflict'))

      await expect(tagGroupsAPI.deleteTagGroup(1)).rejects.toThrow('HTTP 409: Conflict')
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

      mockHttpGet.mockResolvedValueOnce(allTags)

      const tags = await tagGroupsAPI.getTagGroupTags(1)

      expect(tags).toHaveLength(2)
      expect(tags[0].id).toBe(2)
      expect(tags[1].id).toBe(3)
    })

    it('should return empty array if group has no tags', async () => {
      mockHttpGet.mockResolvedValueOnce([
        { id: 1, name: 'Empty Group', groups: [] }
      ])

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

      mockHttpGet.mockResolvedValueOnce(allTags)

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

      mockHttpGet.mockResolvedValueOnce(searchResults)

      const results = await tagGroupsAPI.searchTags('test')

      expect(results).toEqual(searchResults)
      expect(mockHttpGet).toHaveBeenCalledWith('/tag/search?namePart=test')
    })

    it('should encode special characters in search query', async () => {
      mockHttpGet.mockResolvedValueOnce([])

      await tagGroupsAPI.searchTags('test & special')

      expect(mockHttpGet).toHaveBeenCalledWith('/tag/search?namePart=test%20%26%20special')
    })

    it('should throw error on search failure', async () => {
      mockHttpGet.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(tagGroupsAPI.searchTags('test')).rejects.toThrow('HTTP 400: Bad Request')
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

        mockHttpPost.mockResolvedValueOnce(createdTag)

        const result = await tagGroupsAPI.createTag(newTag)

        expect(result).toEqual(createdTag)
      })

      it('should throw error on creation failure', async () => {
        mockHttpPost.mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

        await expect(tagGroupsAPI.createTag({
          name: '',
          groups: []
        })).rejects.toThrow('HTTP 400: Bad Request')
      })
    })

    describe('updateTag', () => {
      it('should update tag successfully', async () => {
        const updatedTag = { ...mockTag, name: 'Updated Tag' }

        mockHttpPut.mockResolvedValueOnce(updatedTag)

        const result = await tagGroupsAPI.updateTag(updatedTag)

        expect(result).toEqual(updatedTag)
      })

      it('should throw error when ID is missing', async () => {
        const invalidTag = { ...mockTag, id: undefined } as unknown

        await expect(tagGroupsAPI.updateTag(invalidTag)).rejects.toThrow('Tag ID is required for update')
      })

      it('should handle update failures', async () => {
        mockHttpPut.mockRejectedValueOnce(new Error('HTTP 409: Conflict'))

        await expect(tagGroupsAPI.updateTag(mockTag)).rejects.toThrow('HTTP 409: Conflict')
      })
    })

    describe('deleteTag', () => {
      it('should delete tag successfully', async () => {
        mockHttpDelete.mockResolvedValueOnce(undefined)

        await tagGroupsAPI.deleteTag(2)

        expect(mockHttpDelete).toHaveBeenCalledWith('/tag/2')
      })

      it('should throw error on deletion failure', async () => {
        mockHttpDelete.mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

        await expect(tagGroupsAPI.deleteTag(999)).rejects.toThrow('HTTP 404: Not Found')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      mockHttpGet.mockRejectedValueOnce(new Error('Invalid response format'))

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('Invalid response format')
    })

    it('should handle network timeout', async () => {
      mockHttpGet.mockRejectedValueOnce(new Error('Network error: Request timeout'))

      await expect(tagGroupsAPI.loadAvailableTags()).rejects.toThrow('Network error: Request timeout')
    })
  })
})
