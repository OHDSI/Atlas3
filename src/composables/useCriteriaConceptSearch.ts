import { ref } from 'vue'
import type { Concept as CirceConcept } from '@/models/circe-types'
import type { Concept as SearchConcept } from '@/models/concept-set.types'
import { provideCriteriaSelection, type CriteriaSelectionService } from '@/composables/useCriteriaSelection'

/** Converts concept-search results (camelCase) to Circe-format (UPPERCASE) concepts. */
export function toCirceConcepts(concepts: SearchConcept[]): CirceConcept[] {
  return concepts.map(c => ({
    CONCEPT_ID: c.conceptId,
    CONCEPT_NAME: c.conceptName,
    STANDARD_CONCEPT_CAPTION: c.standardConcept === 'S' ? 'Standard' : c.standardConcept === 'C' ? 'Classification' : '',
    INVALID_REASON_CAPTION: c.invalidReason ?? '',
    CONCEPT_CODE: c.conceptCode,
    DOMAIN_ID: c.domainId,
    VOCABULARY_ID: c.vocabularyId,
    CONCEPT_CLASS_ID: c.conceptClassId,
    VALID_START_DATE: '',
    VALID_END_DATE: '',
    STANDARD_CONCEPT: c.standardConcept,
    INVALID_REASON: c.invalidReason,
  }))
}

/**
 * Wires concept search (vocabulary lookup for ConceptArray attributes such as
 * Gender/Race) for any host of a criteria editor. Must be called from the
 * setup of an ancestor of the criteria editor; the host renders
 * ConceptSearchDialog bound to the returned state:
 *
 *   <ConceptSearchDialog
 *     v-model="conceptSearchOpen"
 *     :domain-filter="conceptSearchDomainFilter"
 *     @concepts-selected="onConceptsSelected"
 *   />
 *
 * This is unrelated to concept *set* selection, which flows through
 * useCirceConceptSetPicker and the criteria components' concept-set emits.
 */
export function useCriteriaConceptSearch() {
  const conceptSearchOpen = ref(false)
  const conceptSearchDomainFilter = ref<string | undefined>(undefined)
  let pendingCallback: ((concepts: CirceConcept[]) => void) | null = null

  const service: CriteriaSelectionService = {
    requestConcepts(domainFilter, onSelect) {
      pendingCallback = onSelect
      conceptSearchDomainFilter.value = domainFilter
      conceptSearchOpen.value = true
    },
  }
  provideCriteriaSelection(service)

  function onConceptsSelected(concepts: SearchConcept[]) {
    const callback = pendingCallback
    pendingCallback = null
    conceptSearchOpen.value = false
    if (callback && concepts.length > 0) {
      callback(toCirceConcepts(concepts))
    }
  }

  return { conceptSearchOpen, conceptSearchDomainFilter, onConceptsSelected, service }
}
