/**
 * useConceptFacets Composable
 * Derives per-column facets (distinct values + counts) from a list of
 * concepts and filters that list. AND across facets, OR within a facet.
 * Counts for each facet reflect the selections of all OTHER facets
 * (faceted-search behavior). Reusable across any concept table.
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { Concept } from '@/models/concept-set.types'

export type FacetKey =
  | 'vocabularyId'
  | 'domainId'
  | 'standardConcept'
  | 'conceptClassId'
  | 'invalidReason'

export interface FacetDefinition {
  key: FacetKey
  /** English default label; UI translates via i18n. */
  label: string
  /** Map a concept to its display value for this facet. */
  display: (concept: Concept) => string
}

export interface FacetOption {
  value: string
  label: string
  count: number
}

export const CONCEPT_FACETS: FacetDefinition[] = [
  { key: 'vocabularyId', label: 'Vocabulary', display: c => c.vocabularyId || '' },
  { key: 'domainId', label: 'Domain', display: c => c.domainId || '' },
  {
    key: 'standardConcept',
    label: 'Standard',
    display: c =>
      c.standardConcept === 'S'
        ? 'Standard'
        : c.standardConcept === 'C'
          ? 'Classification'
          : 'Non-Standard',
  },
  { key: 'conceptClassId', label: 'Class', display: c => c.conceptClassId || '' },
  { key: 'invalidReason', label: 'Validity', display: c => (c.invalidReason ? 'Invalid' : 'Valid') },
]

function emptySelection(): Record<FacetKey, string[]> {
  return {
    vocabularyId: [],
    domainId: [],
    standardConcept: [],
    conceptClassId: [],
    invalidReason: [],
  }
}

export function useConceptFacets(concepts: Ref<Concept[]>) {
  const selected = ref<Record<FacetKey, string[]>>(emptySelection())

  /** Does a concept pass every facet's selection except the excluded one? */
  function matchesExcept(concept: Concept, exceptKey: FacetKey | null): boolean {
    for (const facet of CONCEPT_FACETS) {
      if (facet.key === exceptKey) continue
      const chosen = selected.value[facet.key]
      if (chosen.length === 0) continue
      if (!chosen.includes(facet.display(concept))) return false
    }
    return true
  }

  const filteredConcepts = computed(() => concepts.value.filter(c => matchesExcept(c, null)))

  const facetOptions = computed<Record<FacetKey, FacetOption[]>>(() => {
    const result = {} as Record<FacetKey, FacetOption[]>
    for (const facet of CONCEPT_FACETS) {
      const counts = new Map<string, number>()
      for (const c of concepts.value) {
        if (!matchesExcept(c, facet.key)) continue
        const value = facet.display(c)
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
      result[facet.key] = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: `${value} (${count})`, count }))
    }
    return result
  })

  const activeFilterCount = computed(() =>
    CONCEPT_FACETS.reduce((n, f) => n + (selected.value[f.key].length > 0 ? 1 : 0), 0)
  )

  function setFacet(key: FacetKey, values: string[]) {
    selected.value = { ...selected.value, [key]: values }
  }

  function clearFilters() {
    selected.value = emptySelection()
  }

  return { selected, facetOptions, filteredConcepts, activeFilterCount, setFacet, clearFilters }
}
