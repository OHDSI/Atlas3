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

/**
 * Clear all references to a deleted concept set ID from the expression.
 * Sets the conceptSet property to undefined in all events that referenced it,
 * and removes concept set attributes that referenced the deleted ID.
 * Similar to legacy behavior where deleting a concept set resets all references to undefined.
 */
export function clearConceptSetUsages(
  cohort: ConceptSetUsageHost,
  deletedConceptSetId: number | string | undefined
): number {
  let count = 0

  function clearEvent(event: CohortEvent) {
    if (event.conceptSet?.id === deletedConceptSetId) {
      event.conceptSet = undefined
      count++
    }
    // Remove concept set attributes that referenced the deleted ID
    // (can't set conceptSet to undefined since it's required on ConceptSetAttribute)
    if (event.attributes) {
      event.attributes = event.attributes.filter(attribute => {
        if (attribute.type === 'conceptSet' && attribute.conceptSet?.id === deletedConceptSetId) {
          count++
          return false // Remove this attribute
        }
        return true
      })
    }
    if (event.nestedCriteria) {
      clearGroup(event.nestedCriteria)
    }
  }

  function clearGroup(group: CriteriaGroup) {
    group.events.forEach(clearEvent)
    group.nestedGroups?.forEach(clearGroup)
  }

  cohort.entryEvents.forEach(clearEvent)
  if (cohort.additionalCriteria) {
    clearGroup(cohort.additionalCriteria)
  }
  for (const rule of cohort.inclusionRules) {
    rule.criteriaGroups.forEach(clearGroup)
  }
  if (cohort.exitCriteria) {
    if (cohort.exitCriteria.conceptSet?.id === deletedConceptSetId) {
      cohort.exitCriteria.conceptSet = undefined
      count++
    }
    cohort.exitCriteria.censoringEvents?.forEach(clearEvent)
  }
  cohort.censoringCriteria?.forEach(clearEvent)

  return count
}
