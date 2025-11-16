import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { NestedCriteria, CohortEvent, LogicType, CriteriaType } from '@/models/cohort.types'

/**
 * Composable for managing nested criteria groups
 * Provides methods for adding/removing events, updating logic types,
 * validating depth, and detecting circular references
 */
export function useNestedCriteria(initial?: NestedCriteria) {
  const nested = ref<NestedCriteria>(initial || {
    id: uuidv4(),
    logicType: 'ALL',
    events: []
  })

  const hasEvents = computed(() => nested.value.events.length > 0)
  const eventCount = computed(() => nested.value.events.length)

  /**
   * Add a new event to the nested criteria
   */
  function addEvent(criteriaType: CriteriaType, conceptSet?: { id: number; name: string }): CohortEvent {
    const newEvent: CohortEvent = {
      id: uuidv4(),
      criteriaType,
      conceptSet: conceptSet || { id: 0, name: 'Select concept set...' },
      attributes: []
    }
    nested.value.events.push(newEvent)
    return newEvent
  }

  /**
   * Remove an event from the nested criteria by ID
   */
  function removeEvent(eventId: string): boolean {
    const index = nested.value.events.findIndex(e => e.id === eventId)
    if (index !== -1) {
      nested.value.events.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Update the logic type and count for the nested criteria
   */
  function updateLogicType(logicType: LogicType, count?: number): void {
    nested.value.logicType = logicType
    if (logicType === 'AT_LEAST' || logicType === 'AT_MOST') {
      nested.value.count = count || 1
    } else {
      delete nested.value.count
    }
  }

  /**
   * Calculate the depth of nested criteria from a given event
   * Returns the maximum depth of nesting
   */
  function calculateDepth(event: CohortEvent, currentDepth = 0): number {
    if (!event.nestedCriteria || event.nestedCriteria.events.length === 0) {
      return currentDepth
    }

    let maxDepth = currentDepth

    for (const childEvent of event.nestedCriteria.events) {
      const childDepth = calculateDepth(childEvent, currentDepth + 1)
      if (childDepth > maxDepth) {
        maxDepth = childDepth
      }
    }

    return maxDepth
  }

  /**
   * Validate if the nesting depth is acceptable
   * Returns true if depth is <= 10 (warning threshold)
   */
  function validateDepth(currentDepth: number): boolean {
    return currentDepth <= 10
  }

  /**
   * Check if adding a nested criteria would create a circular reference
   * Tracks ancestor event IDs to detect cycles
   */
  function hasCircularReference(event: CohortEvent, ancestors: Set<string> = new Set()): boolean {
    // Check if this event is already in the ancestor chain
    if (ancestors.has(event.id)) {
      return true
    }

    // If no nested criteria, no circular reference possible
    if (!event.nestedCriteria) {
      return false
    }

    // Add current event to ancestors and check children
    const newAncestors = new Set(ancestors).add(event.id)

    return event.nestedCriteria.events.some(childEvent =>
      hasCircularReference(childEvent, newAncestors)
    )
  }

  /**
   * Get all event IDs in the nested criteria tree
   * Useful for preventing circular references when selecting events
   */
  function getAllEventIds(events: CohortEvent[] = nested.value.events): Set<string> {
    const ids = new Set<string>()

    function collectIds(evts: CohortEvent[]) {
      for (const event of evts) {
        ids.add(event.id)
        if (event.nestedCriteria) {
          collectIds(event.nestedCriteria.events)
        }
      }
    }

    collectIds(events)
    return ids
  }

  /**
   * Get display text for the logic type
   */
  function getLogicTypeDisplay(): string {
    const { logicType, count } = nested.value
    switch (logicType) {
      case 'AT_LEAST':
        return `At least ${count || 1}`
      case 'AT_MOST':
        return `At most ${count || 1}`
      case 'ALL':
        return 'ALL of the following'
      case 'ANY':
        return 'ANY of the following'
      default:
        return logicType
    }
  }

  /**
   * Get available count options based on number of events
   * For AT_LEAST/AT_MOST logic types
   */
  function getAvailableCountOptions(): number[] {
    const count = nested.value.events.length
    if (count === 0) return [1]
    return Array.from({ length: count }, (_, i) => i + 1)
  }

  return {
    nested,
    hasEvents,
    eventCount,
    addEvent,
    removeEvent,
    updateLogicType,
    calculateDepth,
    validateDepth,
    hasCircularReference,
    getAllEventIds,
    getLogicTypeDisplay,
    getAvailableCountOptions
  }
}
