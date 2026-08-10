import type { CohortDefinition } from '@/models/cohort.types'

const CACHE_PREFIX = 'atlas3_cohort_cache'

function buildCacheKey(cohortId: number | string, scope = 'local'): string {
  return `${CACHE_PREFIX}:${scope}:${cohortId}`
}

function buildDraftKey(scope = 'local'): string {
  return `${CACHE_PREFIX}:${scope}:draft`
}

export async function saveCohortToCache(
  cohort: CohortDefinition,
  scope = 'local'
): Promise<void> {
  const payload = JSON.stringify(cohort)
  if (cohort.id !== undefined && cohort.id !== null) {
    localStorage.setItem(buildCacheKey(cohort.id, scope), payload)
  }
  localStorage.setItem(buildDraftKey(scope), payload)
}

export async function getCohortFromCache(
  cohortId: number | string,
  scope = 'local'
): Promise<CohortDefinition | null> {
  const cached = localStorage.getItem(buildCacheKey(cohortId, scope)) ?? localStorage.getItem(buildDraftKey(scope))
  if (!cached) return null

  try {
    return JSON.parse(cached) as CohortDefinition
  } catch {
    return null
  }
}

export async function deleteCohortFromCache(cohortId: number | string, scope = 'local'): Promise<void> {
  localStorage.removeItem(buildCacheKey(cohortId, scope))
  const draftKey = buildDraftKey(scope)
  const draft = localStorage.getItem(draftKey)
  if (draft) {
    try {
      const parsed = JSON.parse(draft) as CohortDefinition
      if (parsed.id === cohortId || String(parsed.id) === String(cohortId)) {
        localStorage.removeItem(draftKey)
      }
    } catch {
      localStorage.removeItem(draftKey)
    }
  }
}