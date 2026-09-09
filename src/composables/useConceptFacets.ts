/**
 * useConceptFacets Composable
 * Derives per-column facets (distinct values + counts) from a list of
 * items and filters that list. AND across facets, OR within a facet.
 * Counts for each facet reflect the selections of all OTHER facets
 * (faceted-search behavior). Defaults to the standard concept columns but
 * accepts custom definitions for any row shape.
 */
import { ref, computed, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import type { Concept } from '@/models/concept-set.types'
import { matchesTerms } from '@/utils/list-filters'

export type FacetKey = string

export interface FacetDefinition<T = Concept> {
  key: FacetKey
  /** English default label; UI translates via i18n. */
  label: string
  /** Map an item to its display value for this facet. */
  display: (item: T) => string
}

export interface FacetOption {
  value: string
  label: string
  count: number
}

export const CONCEPT_FACETS: FacetDefinition<Concept>[] = [
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

/**
 * Fields a free-text filter matches against, mirroring the columns the results
 * table shows. ATLAS 2.x offers the same narrowing as a "Filter:" box over the
 * rows already returned.
 */
export function conceptSearchText(c: Concept): string {
  return [c.conceptName ?? '', c.domainId ?? '', c.vocabularyId ?? '', c.conceptClassId ?? ''].join(
    ' '
  )
}

/**
 * Concept id and code are matched as identifiers rather than as free text, so a
 * term only hits them whole or by prefix. Folded into the search text they
 * would match on any substring, and a query like "type 1" would return "Type 2
 * diabetes" because its concept id happens to contain a 1.
 */
export function conceptSearchIdentifiers(c: Concept): (string | number | null | undefined)[] {
  return [c.conceptId, c.conceptCode]
}

export function useConceptFacets<T = Concept>(
  concepts: Ref<T[]>,
  definitions: MaybeRefOrGetter<FacetDefinition<T>[]> = CONCEPT_FACETS as FacetDefinition<T>[],
  searchText: (item: T) => string = conceptSearchText as unknown as (item: T) => string,
  searchIdentifiers: (item: T) => (string | number | null | undefined)[] =
    conceptSearchIdentifiers as unknown as (item: T) => (string | number | null | undefined)[]
) {
  const selected = ref<Record<FacetKey, string[]>>({})
  const textFilter = ref<string>('')

  const facets = computed(() => toValue(definitions))
  const normalizedText = computed(() => textFilter.value.trim().toLowerCase())

  function selectionFor(key: FacetKey): string[] {
    return selected.value[key] ?? []
  }

  /**
   * Applied everywhere the facet selections are, so the option counts describe
   * the rows actually on screen rather than the whole result set.
   */
  function matchesText(item: T): boolean {
    if (!normalizedText.value) return true
    return matchesTerms([searchText(item)], normalizedText.value, {
      identifiers: searchIdentifiers(item),
    })
  }

  /** Does an item pass every facet's selection except the excluded one? */
  function matchesExcept(item: T, exceptKey: FacetKey | null): boolean {
    for (const facet of facets.value) {
      if (facet.key === exceptKey) continue
      const chosen = selectionFor(facet.key)
      if (chosen.length === 0) continue
      if (!chosen.includes(facet.display(item))) return false
    }
    return true
  }

  const filteredConcepts = computed(() =>
    concepts.value.filter(c => matchesText(c) && matchesExcept(c, null))
  )

  const facetOptions = computed<Record<FacetKey, FacetOption[]>>(() => {
    const result: Record<FacetKey, FacetOption[]> = {}
    for (const facet of facets.value) {
      const counts = new Map<string, number>()
      for (const c of concepts.value) {
        if (!matchesText(c) || !matchesExcept(c, facet.key)) continue
        const value = facet.display(c)
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
      result[facet.key] = Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: `${value} (${count})`, count }))
    }
    return result
  })

  const activeFilterCount = computed(
    () =>
      facets.value.reduce((n, f) => n + (selectionFor(f.key).length > 0 ? 1 : 0), 0) +
      (normalizedText.value ? 1 : 0)
  )

  function setFacet(key: FacetKey, values: string[]) {
    selected.value = { ...selected.value, [key]: values }
  }

  function setTextFilter(value: string) {
    textFilter.value = value
  }

  function clearFilters() {
    selected.value = {}
    textFilter.value = ''
  }

  return {
    selected,
    textFilter,
    facetOptions,
    filteredConcepts,
    activeFilterCount,
    setFacet,
    setTextFilter,
    clearFilters,
  }
}
