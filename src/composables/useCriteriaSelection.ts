import { inject, provide, type InjectionKey } from 'vue'
import type { Concept } from '@/models/event.types'
import type { ConceptSetReference } from '@/models/cohort.types'

/**
 * Criteria selection service (issue #112).
 *
 * Concept-set and concept pickers used to be requested by bubbling
 * index-context events (`select-concept-set`, `select-concept`, …) through
 * every layer between a criteria card and the dialogs owned by the cohort
 * builder, and results were routed back down with sentinel indexes
 * (ruleIndex -1/-2/-3, nestedEventIndex, template-ref method calls). Each
 * nesting level had to forward both directions by hand, so any level that
 * forgot (nested criteria, recursive groups) silently broke its selectors —
 * the "works here, dead there" branching called out in #112.
 *
 * This service inverts the flow: the owner of the dialogs provides it once,
 * and any criteria component — at any nesting depth — requests a selection
 * and applies the result itself through its ordinary `update` emit, which
 * already propagates correctly at every depth. No index bookkeeping.
 */
export interface CriteriaSelectionService {
  /**
   * Open the concept-set picker. The service owner performs its central
   * bookkeeping (fetching the full set, unique-id assignment) before
   * invoking `onSelect` with the final reference to embed.
   */
  requestConceptSet(onSelect: (conceptSet: ConceptSetReference) => void): void
  /**
   * Open the concept search picker (e.g. gender/race attributes).
   * `onSelect` receives Atlas-format (UPPERCASE) concepts.
   */
  requestConcepts(
    domainFilter: string | undefined,
    onSelect: (concepts: Concept[]) => void
  ): void
  /** Open the concept-set editor for an embedded set. */
  editConceptSet(conceptSet: { id: number | string; name: string; items?: unknown[] }): void
}

const CriteriaSelectionKey: InjectionKey<CriteriaSelectionService> = Symbol('criteria-selection')

export function provideCriteriaSelection(service: CriteriaSelectionService): void {
  provide(CriteriaSelectionKey, service)
}

/**
 * Returns the selection service, or null when no ancestor provides one.
 * Callers fall back to the legacy emit chain in that case (hosts outside
 * the cohort builder that still wire selection by hand).
 */
export function useCriteriaSelection(): CriteriaSelectionService | null {
  return inject(CriteriaSelectionKey, null)
}
