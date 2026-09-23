import type { CohortDefinitionSummary } from '@/models/webapi.types'
import { lastTouchedDate } from '@/utils/date-format'

export type CohortSortKey = 'id' | 'name' | 'createdBy' | 'createdDate' | 'modifiedDate'
export type CohortSortOrder = 'asc' | 'desc'

export function formatCohortSortUser(userValue: unknown): string {
  if (!userValue) return 'Unknown'
  if (typeof userValue === 'string') return userValue
  if (typeof userValue === 'object' && userValue !== null) {
    const user = userValue as Record<string, unknown>
    return (user.name || user.login || user.id || 'Unknown') as string
  }
  return 'Unknown'
}

function cohortSortValue(cohort: CohortDefinitionSummary, key: CohortSortKey): string | number {
  switch (key) {
    case 'id':
      return cohort.id ?? 0
    case 'name':
      return (cohort.name ?? '').toLowerCase()
    case 'createdBy':
      return formatCohortSortUser(cohort.createdBy).toLowerCase()
    case 'createdDate':
      return cohort.createdDate ? new Date(cohort.createdDate).getTime() : 0
    case 'modifiedDate': {
      const touched = lastTouchedDate(cohort)
      return touched ? new Date(touched).getTime() : 0
    }
  }
}

export function sortCohorts(
  cohorts: CohortDefinitionSummary[],
  key: CohortSortKey,
  order: CohortSortOrder
): CohortDefinitionSummary[] {
  const direction = order === 'asc' ? 1 : -1

  return [...cohorts].sort((leftCohort, rightCohort) => {
    const left = cohortSortValue(leftCohort, key)
    const right = cohortSortValue(rightCohort, key)

    if (left === right) return 0
    return left > right ? direction : -direction
  })
}