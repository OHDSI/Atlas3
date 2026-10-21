import { inject, provide, type InjectionKey } from 'vue'
import type { Concept } from '@/models/circe-types'

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
 *
 * Scope: this service only covers concept *search* (vocabulary lookup used by
 * ConceptArray attributes such as Gender/Race). Concept *set* selection and
 * editing are separate: they flow through the criteria components'
 * `select-concept-set` / `edit-concept-set` emits and useCirceConceptSetPicker.
 */
export interface CriteriaSelectionService {
  /**
   * Open the concept search dialog (e.g. gender/race attributes).
   * `onSelect` receives Circe-format (UPPERCASE) concepts.
   */
  requestConcepts(
    domainFilter: string | undefined,
    onSelect: (concepts: Concept[]) => void
  ): void
}

export const CriteriaSelectionKey: InjectionKey<CriteriaSelectionService> = Symbol(
  'criteria-selection'
)

export function provideCriteriaSelection(service: CriteriaSelectionService): void {
  provide(CriteriaSelectionKey, service)
}

/**
 * Returns the selection service, or null when no ancestor provides one.
 * Every host that renders a criteria editor must call
 * useCriteriaConceptSearch() (which provides this service) or concept
 * search for attributes such as gender/race will do nothing.
 */
export function useCriteriaSelection(): CriteriaSelectionService | null {
  return inject(CriteriaSelectionKey, null)
}
