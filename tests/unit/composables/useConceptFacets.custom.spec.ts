import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useConceptFacets, type FacetDefinition } from '@/composables/useConceptFacets'

interface Row {
  id: number
  match: string
  vocabularyId: string
}

const rows: Row[] = [
  { id: 1, match: 'Both', vocabularyId: 'SNOMED' },
  { id: 2, match: 'CS1', vocabularyId: 'SNOMED' },
  { id: 3, match: 'CS2', vocabularyId: 'RxNorm' },
]

const DEFS: FacetDefinition<Row>[] = [
  { key: 'match', label: 'Match', display: r => r.match },
  { key: 'vocabularyId', label: 'Vocabulary', display: r => r.vocabularyId },
]

describe('useConceptFacets with custom definitions', () => {
  it('facets an arbitrary item type using the supplied definitions', () => {
    const { filteredConcepts, facetOptions } = useConceptFacets(ref(rows), DEFS)

    expect(filteredConcepts.value).toHaveLength(3)
    expect(facetOptions.value.match?.map(o => o.value)).toEqual(['Both', 'CS1', 'CS2'])
    expect(facetOptions.value.vocabularyId?.map(o => o.value)).toEqual(['RxNorm', 'SNOMED'])
  })

  it('filters on a custom facet key', () => {
    const { setFacet, filteredConcepts, activeFilterCount } = useConceptFacets(ref(rows), DEFS)

    setFacet('match', ['Both'])
    expect(filteredConcepts.value.map(r => r.id)).toEqual([1])
    expect(activeFilterCount.value).toBe(1)
  })

  it('only exposes the supplied facet keys', () => {
    const { facetOptions } = useConceptFacets(ref(rows), DEFS)
    expect(Object.keys(facetOptions.value).sort()).toEqual(['match', 'vocabularyId'])
  })

  it('re-derives facets when a reactive definition list changes', () => {
    const defs = ref<FacetDefinition<Row>[]>(DEFS)
    const { facetOptions } = useConceptFacets(ref(rows), defs)

    expect(facetOptions.value.match).toBeDefined()

    defs.value = [{ key: 'vocabularyId', label: 'Vocabulary', display: r => r.vocabularyId }]
    expect(facetOptions.value.match).toBeUndefined()
    expect(facetOptions.value.vocabularyId?.map(o => o.value)).toEqual(['RxNorm', 'SNOMED'])
  })

  it('keeps cross-facet counts scoped to the supplied definitions', () => {
    const { setFacet, facetOptions } = useConceptFacets(ref(rows), DEFS)

    setFacet('vocabularyId', ['SNOMED'])
    // match counts respect the vocabulary selection...
    expect(facetOptions.value.match?.map(o => o.value)).toEqual(['Both', 'CS1'])
    // ...while vocabulary options ignore their own selection
    expect(facetOptions.value.vocabularyId?.map(o => o.value)).toEqual(['RxNorm', 'SNOMED'])
  })
})
