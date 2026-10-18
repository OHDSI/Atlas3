import { describe, expect, it } from 'vitest'
import { assignedTags, displayTags, syncAssetTags, toggleTagFilter } from '@/utils/asset-tags'

describe('assignedTags', () => {
  it('excludes explicit root groups while retaining children and legacy tags', () => {
    const tags = [
      { id: 17, name: 'Group', groups: [] },
      { id: 18, name: 'Child', groups: [{ id: 17 }] },
      { id: 19, name: 'Legacy' },
    ]

    expect(assignedTags(tags).map(tag => tag.id)).toEqual([18, 19])
  })

  it('expands assigned children with their parent groups for display', () => {
    const group = { id: 17, name: 'Group', groups: [] as const }
    const child = { id: 18, name: 'Child', groups: [group] }

    expect(displayTags([child])).toEqual([group, child])
  })

  it('syncs only child assignments and returns display tags', async () => {
    const firstGroup = { id: 17, name: 'First group', groups: [] as const }
    const secondGroup = { id: 20, name: 'Second group', groups: [] as const }
    const firstChild = { id: 18, name: 'First child', groups: [firstGroup] }
    const secondChild = { id: 21, name: 'Second child', groups: [secondGroup] }
    const operations: string[] = []

    const result = await syncAssetTags(
      [firstGroup, firstChild],
      [secondChild],
      {
        assign: async tagId => {
          operations.push(`assign:${tagId}`)
          return true
        },
        unassign: async tagId => {
          operations.push(`unassign:${tagId}`)
          return true
        },
      }
    )

    expect(operations).toEqual(['unassign:18', 'assign:21'])
    expect(result.success).toBe(true)
    expect(result.tags).toEqual([secondGroup, secondChild])
  })

  it('toggles a tag filter without mutating the existing selection', () => {
    const selected = ['First']

    expect(toggleTagFilter(selected, 'Second')).toEqual(['First', 'Second'])
    expect(toggleTagFilter(selected, 'First')).toEqual([])
    expect(selected).toEqual(['First'])
  })
})