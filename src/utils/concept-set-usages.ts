import type {
  CohortEvent,
  CriteriaGroup,
  ConceptSetReference,
  ExitCriteria,
  InclusionRule,
} from '@/models/cohort.types'

interface ConceptSetUsageHost {
  entryEvents: CohortEvent[]
  additionalCriteria?: CriteriaGroup
  inclusionRules: InclusionRule[]
  exitCriteria?: ExitCriteria
  censoringCriteria?: CohortEvent[]
}

export function updateConceptSetUsages(
  cohort: ConceptSetUsageHost,
  updated: ConceptSetReference
): number {
  let count = 0

  function updateEvent(event: CohortEvent) {
    if (event.conceptSet?.id === updated.id) {
      event.conceptSet = { ...updated }
      count++
    }
    for (const attribute of event.attributes ?? []) {
      if (attribute.type === 'conceptSet' && attribute.conceptSet.id === updated.id) {
        attribute.conceptSet = { ...attribute.conceptSet, name: updated.name }
        count++
      }
    }
    if (event.nestedCriteria) {
      updateGroup(event.nestedCriteria)
    }
  }

  function updateGroup(group: CriteriaGroup) {
    group.events.forEach(updateEvent)
    group.nestedGroups?.forEach(updateGroup)
  }

  cohort.entryEvents.forEach(updateEvent)
  if (cohort.additionalCriteria) {
    updateGroup(cohort.additionalCriteria)
  }
  for (const rule of cohort.inclusionRules) {
    rule.criteriaGroups.forEach(updateGroup)
  }
  if (cohort.exitCriteria) {
    if (cohort.exitCriteria.conceptSet?.id === updated.id) {
      cohort.exitCriteria.conceptSet = { ...updated }
      count++
    }
    cohort.exitCriteria.censoringEvents?.forEach(updateEvent)
  }
  cohort.censoringCriteria?.forEach(updateEvent)

  return count
}
