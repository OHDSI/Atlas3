/**
 * reusable-reference.ts
 *
 * Looks up what a reference needs from WebAPI: a reusable's current version
 * number, and its current design for updating a reference to it.
 *
 * Many references to the same reusable can sit in one cohort, so lookups are
 * shared for a short while instead of each banner asking WebAPI on its own.
 */
import type { ReusableRef } from '@/models/circe-types'
import type { Reusable, ReusableDesign } from '@/models/reusable.types'
import { getReusable } from '@/services/reusable.service'
import { getReusableVersions } from '@/services/reusable-versions.service'
import { currentVersionNumber, parseReusableDesign } from './reusable-design'

const CACHE_MS = 60_000

export interface CurrentReusable {
  reusable: Reusable
  design: ReusableDesign
  /** The reference the current state would carry if inserted now. */
  reference: ReusableRef
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
    reference: {
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

/** The reference for a reusable that is about to be inserted. */
export async function referenceFor(reusable: Reusable): Promise<ReusableRef | undefined> {
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

/** Whether `current` is a newer version than the one `ref` was inserted at. */
export function hasNewerVersion(ref: ReusableRef, current: ReusableRef): boolean {
  if (typeof current.Version !== 'number') return false
  if (typeof ref.Version !== 'number') return true
  return current.Version > ref.Version
}
