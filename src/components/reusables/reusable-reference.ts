/**
 * reusable-reference.ts
 *
 * Looks up what an imported reusable needs from WebAPI: the reusable's
 * current version number, and its current design for updating to it.
 *
 * One reusable can be used in many places of one cohort, so lookups are
 * shared for a short while instead of each banner asking WebAPI on its own.
 */
import type { Reusable, ReusableDesign } from '@/models/reusable.types'
import { getReusable } from '@/services/reusable.service'
import { getReusableVersions } from '@/services/reusable-versions.service'
import { currentVersionNumber, parseReusableDesign } from './reusable-design'

const CACHE_MS = 60_000

/**
 * A reusable in the repository at one version. `Version` is counted the way
 * WebAPI numbers them: the saved versions plus one for the current state.
 */
export interface ReusableSource {
  Id: number
  Version?: number | null
  Name?: string | null
}

export interface CurrentReusable {
  reusable: Reusable
  design: ReusableDesign
  /** The reusable at its current version. */
  source: ReusableSource
}

const cache = new Map<number, { at: number; promise: Promise<CurrentReusable | null> }>()

async function fetchCurrent(id: number): Promise<CurrentReusable | null> {
  const [result, versions] = await Promise.all([
    getReusable(id),
    getReusableVersions(id).catch(() => null),
  ])
  if (!result.success) return null
  return {
    reusable: result.data,
    design: parseReusableDesign(result.data.data),
    source: {
      Id: id,
      Version: versions ? currentVersionNumber(versions) : null,
      Name: result.data.name,
    },
  }
}

/** The reusable as it is now, or null when it cannot be read (deleted, no access). */
export function getCurrentReusable(id: number): Promise<CurrentReusable | null> {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise
  const promise = fetchCurrent(id)
  cache.set(id, { at: Date.now(), promise })
  // A failed lookup should not stick for the whole cache period.
  promise.then(current => {
    if (!current) cache.delete(id)
  })
  return promise
}

/** The source of a reusable that is about to be imported. */
export async function sourceFor(reusable: Reusable): Promise<ReusableSource | undefined> {
  if (typeof reusable.id !== 'number') return undefined
  const versions = await getReusableVersions(reusable.id).catch(() => null)
  return {
    Id: reusable.id,
    Version: versions ? currentVersionNumber(versions) : null,
    Name: reusable.name,
  }
}

/** Forget cached lookups, e.g. after a reusable was saved. */
export function clearReusableReferenceCache(id?: number): void {
  if (id === undefined) cache.clear()
  else cache.delete(id)
}

/** Whether `current` is a newer version than `held`. */
export function hasNewerVersion(
  held: { Version?: number | null },
  current: { Version?: number | null }
): boolean {
  if (typeof current.Version !== 'number') return false
  if (typeof held.Version !== 'number') return true
  return current.Version > held.Version
}
