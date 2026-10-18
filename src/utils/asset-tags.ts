export interface AssetTag {
  id?: number
  name: string
  color?: string | null
  groups?: readonly AssetTag[]
}

/**
 * WebAPI expands an asset's tags with group roots for display and filtering.
 * Only children with an explicit parent group are assignable in Atlas3's tag
 * management flows. Preserve tags without group metadata for legacy payloads.
 */
export function assignedTags<T extends AssetTag>(tags: readonly T[] | null | undefined): T[] {
  return (tags ?? []).filter(tag => tag.groups === undefined || tag.groups.length > 0)
}

/**
 * Rebuild the display/filter representation from direct assignments. Children
 * remain visible alongside their parent group roots, matching WebAPI's
 * expanded asset-tag response.
 */
export function displayTags<T extends AssetTag>(
  tags: readonly T[] | null | undefined
): T[] {
  const display: T[] = []

  function append(tag: T) {
    if (!display.some(existing => existing.id === tag.id && existing.name === tag.name)) {
      display.push(tag)
    }
  }

  for (const tag of tags ?? []) {
    tag.groups?.forEach(group => append(group as T))
    append(tag)
  }

  return display
}

/** Toggle a tag name in a list filter without mutating the caller's state. */
export function toggleTagFilter(selectedTags: readonly string[], tagName: string): string[] {
  return selectedTags.includes(tagName)
    ? selectedTags.filter(selected => selected !== tagName)
    : [...selectedTags, tagName]
}

export interface TagSyncFailure<T extends AssetTag> {
  action: 'assign' | 'unassign'
  tag: T
  error?: string
}

export interface TagSyncResult<T extends AssetTag> {
  success: boolean
  tags: T[]
  failures: TagSyncFailure<T>[]
}

/**
 * Persist the direct tag assignments, then return the expanded display payload
 * expected by asset lists. Removals happen before additions to satisfy
 * single-selection group constraints; calls within a phase remain concurrent.
 */
export async function syncAssetTags<T extends AssetTag>(
  currentTags: readonly T[] | null | undefined,
  selectedTags: readonly T[] | null | undefined,
  operations: {
    assign: (tagId: number) => Promise<boolean | { success: boolean; error?: unknown }>
    unassign: (tagId: number) => Promise<boolean | { success: boolean; error?: unknown }>
  }
): Promise<TagSyncResult<T>> {
  const persisted = [...assignedTags(currentTags)]
  const selected = assignedTags(selectedTags)
  const toRemove = persisted.filter(tag => !selected.some(next => next.id === tag.id))
  const toAdd = selected.filter(tag => !persisted.some(previous => previous.id === tag.id))
  const failures: TagSyncFailure<T>[] = []

  async function apply(tags: T[], action: TagSyncFailure<T>['action']) {
    const outcomes = await Promise.all(
      tags.map(async tag => {
        if (tag.id === undefined) return { tag, success: false, error: 'Tag has no id' }
        const operation = action === 'assign' ? operations.assign : operations.unassign
        try {
          const result = await operation(tag.id)
          if (typeof result === 'boolean') return { tag, success: result }
          return {
            tag,
            success: result.success,
            error: errorMessage(result.error),
          }
        } catch (error) {
          return { tag, success: false, error: errorMessage(error) }
        }
      })
    )

    for (const { tag, success, error } of outcomes) {
      if (!success) {
        failures.push({ action, tag, error })
        continue
      }

      if (action === 'assign') {
        persisted.push(tag)
      } else {
        const index = persisted.findIndex(existing => existing.id === tag.id)
        if (index >= 0) persisted.splice(index, 1)
      }
    }
  }

  await apply(toRemove, 'unassign')
  await apply(toAdd, 'assign')

  return {
    success: failures.length === 0,
    tags: displayTags(persisted),
    failures,
  }
}

function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : undefined
}