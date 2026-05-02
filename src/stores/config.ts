/**
 * Configuration Store
 *
 * Manages configuration data including tag groups, vocabulary schema, and cache operations.
 * Implements optimistic updates for better UX.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag, TagGroup } from '@/models/config.types'
import * as configCache from '@/services/config-cache'
import * as tagGroupsAPI from '@/services/tag-groups'

export const useConfigStore = defineStore('config', () => {
  // State
  const allTags = ref<Tag[]>([]) // All tags (groups and individual tags)
  const tagGroups = ref<TagGroup[]>([])
  const vocabularySchema = ref<string>('public')
  const isLoadingTagGroups = ref(false)
  const isLoadingCacheOp = ref(false)
  const isLoadingVocabSchema = ref(false)
  const error = ref<string | null>(null)

  // Tag Groups Actions
  /**
   * Fetches all tags (including tag groups) from the API
   */
  async function fetchTagGroups(): Promise<void> {
    isLoadingTagGroups.value = true
    error.value = null

    try {
      // Fetch all tags
      allTags.value = await tagGroupsAPI.loadAvailableTags()
      // Filter to get just tag groups (empty groups array)
      tagGroups.value = await tagGroupsAPI.listTagGroups()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoadingTagGroups.value = false
    }
  }

  /**
   * Gets tags for a specific tag group
   */
  function getTagsForGroup(groupId: number): Tag[] {
    return allTags.value.filter(
      t => t.groups && t.groups.length > 0 && t.groups.some(g => g.id === groupId)
    )
  }

  /**
   * Creates a new tag group with optimistic update
   */
  async function createTagGroup(tagGroup: Omit<TagGroup, 'id'>): Promise<TagGroup> {
    // Optimistic update - add with temporary ID
    const tempId = -Date.now() // Negative ID to distinguish from real IDs
    const optimistic: TagGroup = {
      ...tagGroup,
      id: tempId,
    }
    tagGroups.value.push(optimistic)

    try {
      const created = await tagGroupsAPI.createTagGroup(tagGroup)

      // Replace optimistic entry with real one
      const index = tagGroups.value.findIndex(t => t.id === tempId)
      if (index !== -1) {
        tagGroups.value[index] = created
      }

      return created
    } catch (err) {
      // Rollback on error
      tagGroups.value = tagGroups.value.filter(t => t.id !== tempId)
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /**
   * Updates an existing tag group with optimistic update
   */
  async function updateTagGroup(tagGroup: TagGroup): Promise<TagGroup> {
    const index = tagGroups.value.findIndex(t => t.id === tagGroup.id)
    if (index === -1) {
      throw new Error('Tag group not found')
    }

    // Store previous value for rollback (using JSON for deep clone)
    const previous: TagGroup = JSON.parse(JSON.stringify(tagGroups.value[index]))

    // Optimistic update
    tagGroups.value[index] = tagGroup

    try {
      const updated = await tagGroupsAPI.updateTagGroup(tagGroup)
      tagGroups.value[index] = updated
      return updated
    } catch (err) {
      // Rollback on error
      tagGroups.value[index] = previous
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /**
   * Deletes a tag group with optimistic update
   * Validates that the group is empty before deletion
   */
  async function deleteTagGroup(id: number): Promise<void> {
    const index = tagGroups.value.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error('Tag group not found')
    }

    // Store for rollback (using JSON for deep clone)
    const previous: TagGroup = JSON.parse(JSON.stringify(tagGroups.value[index]))

    // Check if group has tags
    try {
      const tags = await tagGroupsAPI.getTagGroupTags(id)
      if (tags.length > 0) {
        throw new Error('Cannot delete tag group: the group contains tags')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }

    // Optimistic delete
    tagGroups.value.splice(index, 1)

    try {
      await tagGroupsAPI.deleteTagGroup(id)
    } catch (err) {
      // Rollback on error
      tagGroups.value.splice(index, 0, previous)
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  // Cache Management Actions
  /**
   * Clears the configuration cache
   */
  async function clearCache(): Promise<void> {
    isLoadingCacheOp.value = true
    error.value = null

    try {
      await configCache.clearConfigCache()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoadingCacheOp.value = false
    }
  }

  /**
   * Gets cache statistics
   */
  async function getCacheStats() {
    try {
      return await configCache.getCacheStats()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  // Vocabulary Schema Actions
  /**
   * Fetches the vocabulary schema setting
   */
  async function fetchVocabularySchema(): Promise<void> {
    isLoadingVocabSchema.value = true
    error.value = null

    try {
      vocabularySchema.value = configCache.getVocabularySchema()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoadingVocabSchema.value = false
    }
  }

  /**
   * Updates the vocabulary schema setting
   */
  async function updateVocabularySchema(schema: string): Promise<void> {
    isLoadingVocabSchema.value = true
    error.value = null

    // Store previous value for rollback
    const previous = vocabularySchema.value

    // Optimistic update
    vocabularySchema.value = schema

    try {
      configCache.setVocabularySchema(schema)
    } catch (err) {
      // Rollback on error
      vocabularySchema.value = previous
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isLoadingVocabSchema.value = false
    }
  }

  // Individual Tag Actions
  /**
   * Creates a new tag within a group
   */
  async function createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
    const created = await tagGroupsAPI.createTag(tag)
    allTags.value.push(created)
    return created
  }

  /**
   * Updates an existing tag
   */
  async function updateTag(tag: Tag): Promise<Tag> {
    const index = allTags.value.findIndex(t => t.id === tag.id)
    if (index === -1) {
      throw new Error('Tag not found')
    }

    const previous: Tag = JSON.parse(JSON.stringify(allTags.value[index]))

    // Optimistic update
    allTags.value[index] = tag

    try {
      const updated = await tagGroupsAPI.updateTag(tag)
      allTags.value[index] = updated
      return updated
    } catch (err) {
      // Rollback on error
      allTags.value[index] = previous
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /**
   * Deletes a tag
   */
  async function deleteTag(id: number): Promise<void> {
    const index = allTags.value.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error('Tag not found')
    }

    const previous: Tag = JSON.parse(JSON.stringify(allTags.value[index]))

    // Optimistic delete
    allTags.value.splice(index, 1)

    try {
      await tagGroupsAPI.deleteTag(id)
    } catch (err) {
      // Rollback on error
      allTags.value.splice(index, 0, previous)
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  return {
    // State
    allTags,
    tagGroups,
    vocabularySchema,
    isLoadingTagGroups,
    isLoadingCacheOp,
    isLoadingVocabSchema,
    error,

    // Actions
    fetchTagGroups,
    getTagsForGroup,
    createTagGroup,
    updateTagGroup,
    deleteTagGroup,
    createTag,
    updateTag,
    deleteTag,
    clearCache,
    getCacheStats,
    fetchVocabularySchema,
    updateVocabularySchema,
  }
})
