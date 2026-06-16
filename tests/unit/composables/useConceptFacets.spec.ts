import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { Concept } from '@/models/concept-set.types'
import { useConceptFacets } from '@/composables/useConceptFacets'

function concept(p: Partial<Concept>): Concept {
  return {
    conceptId: 1,
    conceptName: 'X',
    conceptCode: 'C',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    ...p,
  }
}

const data: Concept[] = [
  concept({ conceptId: 1, vocabularyId: 'SNOMED', domainId: 'Condition', standardConcept: 'S', invalidReason: null }),
  concept({ conceptId: 2, vocabularyId: 'SNOMED', domainId: 'Drug', standardConcept: null, invalidReason: 'D' }),
  concept({ conceptId: 3, vocabularyId: 'RxNorm', domainId: 'Drug', standardConcept: 'C', invalidReason: null }),
]

describe('useConceptFacets', () => {
  it('starts with no selection and returns all concepts', () => {
    const { filteredConcepts, activeFilterCount } = useConceptFacets(ref(data))
    expect(filteredConcepts.value).toHaveLength(3)
    expect(activeFilterCount.value).toBe(0)
  })

  it('derives distinct values with counts and display labels', () => {
    const { facetOptions } = useConceptFacets(ref(data))
    expect(facetOptions.value.vocabularyId).toEqual([
      { value: 'RxNorm', label: 'RxNorm (1)', count: 1 },
      { value: 'SNOMED', label: 'SNOMED (2)', count: 2 },
    ])
  })

  it('maps standardConcept and invalidReason to display strings', () => {
    const { facetOptions } = useConceptFacets(ref(data))
    const std = facetOptions.value.standardConcept.map(o => o.value)
    expect(std).toEqual(['Classification', 'Non-Standard', 'Standard'])
    const validity = facetOptions.value.invalidReason.map(o => o.value).sort()
    expect(validity).toEqual(['Invalid', 'Valid'])
  })

  it('filters by a single facet (OR within is trivial here)', () => {
    const { setFacet, filteredConcepts, activeFilterCount } = useConceptFacets(ref(data))
    setFacet('vocabularyId', ['SNOMED'])
    expect(filteredConcepts.value.map(c => c.conceptId)).toEqual([1, 2])
    expect(activeFilterCount.value).toBe(1)
  })

  it('ANDs across facets', () => {
    const { setFacet, filteredConcepts } = useConceptFacets(ref(data))
    setFacet('vocabularyId', ['SNOMED'])
    setFacet('domainId', ['Drug'])
    expect(filteredConcepts.value.map(c => c.conceptId)).toEqual([2])
  })

  it('ORs multiple values within one facet', () => {
    const { setFacet, filteredConcepts } = useConceptFacets(ref(data))
    setFacet('domainId', ['Condition', 'Drug'])
    expect(filteredConcepts.value).toHaveLength(3)
  })

  it('counts reflect selections in OTHER facets', () => {
    const { setFacet, facetOptions } = useConceptFacets(ref(data))
    setFacet('domainId', ['Drug'])
    // Within Drug: SNOMED x1, RxNorm x1
    expect(facetOptions.value.vocabularyId).toEqual([
      { value: 'RxNorm', label: 'RxNorm (1)', count: 1 },
      { value: 'SNOMED', label: 'SNOMED (1)', count: 1 },
    ])
  })

  it('keeps a facet\'s own selection from constraining its own counts', () => {
    const { setFacet, facetOptions } = useConceptFacets(ref(data))
    setFacet('vocabularyId', ['SNOMED'])
    // vocabularyId options ignore the vocabularyId selection itself
    expect(facetOptions.value.vocabularyId.map(o => o.value)).toEqual(['RxNorm', 'SNOMED'])
  })

  it('clearFilters resets all selections', () => {
    const { setFacet, clearFilters, activeFilterCount, filteredConcepts } = useConceptFacets(ref(data))
    setFacet('vocabularyId', ['SNOMED'])
    clearFilters()
    expect(activeFilterCount.value).toBe(0)
    expect(filteredConcepts.value).toHaveLength(3)
  })
})
