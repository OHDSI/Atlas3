/**
 * Tags API Service (Atlas-compatible)
 *
 * Provides functions for CRUD operations on tags and tag groups via WebAPI.
 * In Atlas, tag groups are tags with empty groups array.
 */

import type { Tag, TagGroup } from '@/models/config.types'

const API_BASE = '/WebAPI'

/**
 * Lists all tags (both tags and tag groups)
 * Tag groups are tags with empty groups array
 *
 * @returns Promise resolving to array of all tags
 * @throws Error if API request fails
 */
export async function loadAvailableTags(): Promise<Tag[]> {
  const response = await fetch(`${API_BASE}/tag/`)

  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.statusText}`)
  }

  return response.json()
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
  const response = await fetch(`${API_BASE}/tag/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...tag,
      groups: [] // Tag groups have empty groups array
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create tag group: ${error}`)
  }

  return response.json()
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

  const response = await fetch(`${API_BASE}/tag/${tag.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...tag,
      groups: tag.groups || [] // Ensure groups array exists
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update tag group: ${error}`)
  }

  return response.json()
}

/**
 * Deletes a tag or tag group by ID
 *
 * @param id - The tag/group ID to delete
 * @throws Error if API request fails or tag group contains tags
 */
export async function deleteTagGroup(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tag/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete tag: ${error}`)
  }
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
  return allTags.filter(t =>
    t.groups &&
    t.groups.length > 0 &&
    t.groups.some(g => g.id === tagGroupId)
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
  const response = await fetch(`${API_BASE}/tag/search?namePart=${encodeURIComponent(namePart)}`)

  if (!response.ok) {
    throw new Error(`Failed to search tags: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Creates a new tag (with parent group)
 *
 * @param tag - The tag data to create
 * @returns Promise resolving to the created tag (with assigned ID)
 * @throws Error if API request fails or validation fails
 */
export async function createTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
  const response = await fetch(`${API_BASE}/tag/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tag)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create tag: ${error}`)
  }

  return response.json()
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

  const response = await fetch(`${API_BASE}/tag/${tag.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tag)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update tag: ${error}`)
  }

  return response.json()
}

/**
 * Deletes a tag by ID
 *
 * @param id - The tag ID to delete
 * @throws Error if API request fails
 */
export async function deleteTag(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/tag/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete tag: ${error}`)
  }
}
