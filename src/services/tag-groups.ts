/**
 * Tags API Service (Atlas-compatible)
 *
 * Provides functions for CRUD operations on tags and tag groups via WebAPI.
 * In Atlas, tag groups are tags with empty groups array.
 */

import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import type { Tag, TagGroup } from '@/models/config.types'

/**
 * Lists all tags (both tags and tag groups)
 * Tag groups are tags with empty groups array
 *
 * @returns Promise resolving to array of all tags
 * @throws Error if API request fails
 */
export async function loadAvailableTags(): Promise<Tag[]> {
  return httpGet<Tag[]>('/tag/')
}

/**
 * Lists all tag groups (tags with empty groups array)
 *
 * @returns Promise resolving to array of tag groups
 * @throws Error if API request fails
 */
export async function listTagGroups(): Promise<TagGroup[]> {
  const allTags = await loadAvailableTags()
  // Tag groups are tags with empty or no groups array
  return allTags.filter(t => !t.groups || t.groups.length === 0)
}

/**
 * Creates a new tag or tag group
 *
 * @param tag - The tag/group data to create
 * @returns Promise resolving to the created tag (with assigned ID)
 * @throws Error if API request fails or validation fails
 */
export async function createTagGroup(tag: Omit<TagGroup, 'id'>): Promise<TagGroup> {
  return httpPost<TagGroup>('/tag/', {
    ...tag,
    groups: [], // Tag groups have empty groups array
  })
}

/**
 * Updates an existing tag or tag group
 *
 * @param tag - The tag/group data to update (must include id)
 * @returns Promise resolving to the updated tag
 * @throws Error if API request fails or tag not found
 */
export async function updateTagGroup(tag: TagGroup): Promise<TagGroup> {
  if (!tag.id) {
    throw new Error('Tag ID is required for update')
  }

  return httpPut<TagGroup>(`/tag/${tag.id}`, {
    ...tag,
    groups: tag.groups || [], // Ensure groups array exists
  })
}

/**
 * Deletes a tag or tag group by ID
 *
 * @param id - The tag/group ID to delete
 * @throws Error if API request fails or tag group contains tags
 */
export async function deleteTagGroup(id: number): Promise<void> {
  await httpDelete(`/tag/${id}`)
}

/**
 * Gets all tags in a specific tag group
 *
 * @param tagGroupId - The tag group ID
 * @returns Promise resolving to array of tags in the group
 * @throws Error if API request fails
 */
export async function getTagGroupTags(tagGroupId: number): Promise<Tag[]> {
  const allTags = await loadAvailableTags()
  // Find tags that have this group in their groups array
  return allTags.filter(
    t => t.groups && t.groups.length > 0 && t.groups.some(g => g.id === tagGroupId)
  )
}

/**
 * Searches for tags by name
 *
 * @param namePart - Partial name to search for
 * @returns Promise resolving to matching tags
 * @throws Error if API request fails
 */
export async function searchTags(namePart: string): Promise<Tag[]> {
  return httpGet<Tag[]>(`/tag/search?namePart=${encodeURIComponent(namePart)}`)
}

/**
 * Creates a new tag (with parent group)
 *
 * @param tag - The tag data to create
 * @returns Promise resolving to the created tag (with assigned ID)
 * @throws Error if API request fails or validation fails
 */
export async function createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
  return httpPost<Tag>('/tag/', tag)
}

/**
 * Updates an existing tag
 *
 * @param tag - The tag data to update (must include id)
 * @returns Promise resolving to the updated tag
 * @throws Error if API request fails or tag not found
 */
export async function updateTag(tag: Tag): Promise<Tag> {
  if (!tag.id) {
    throw new Error('Tag ID is required for update')
  }

  return httpPut<Tag>(`/tag/${tag.id}`, tag)
}

/**
 * Deletes a tag by ID
 *
 * @param id - The tag ID to delete
 * @throws Error if API request fails
 */
export async function deleteTag(id: number): Promise<void> {
  await httpDelete(`/tag/${id}`)
}
