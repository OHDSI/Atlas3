import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useConceptFacets } from '@/composables/useConceptFacets'
import type { Concept } from '@/models/concept-set.types'

function concept(overrides: Partial<Concept>): Concept {
  return {
    conceptId: 1,
    conceptName: 'Concept',
    conceptCode: '000',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    ...overrides,
  }
}

const rows = [
  concept({ conceptId: 201826, conceptName: 'Type 2 diabetes mellitus', conceptCode: '44054006' }),
  concept({ conceptId: 4193704, conceptName: 'Type 1 diabetes mellitus', conceptCode: '46635009' }),
  concept({
    conceptId: 320128,
    conceptName: 'Essential hypertension',
    conceptCode: '59621000',
    vocabularyId: 'ICD10CM',
  }),
]

/**
 * ATLAS 2.x narrows the rows already returned with a "Filter:" box over the
 * results table (OHDSI/Atlas3#227).
 */
describe('free-text filter over search results', () => {
  it('returns everything when the filter is empty or whitespace', () => {
    const f = useConceptFacets(ref(rows))
    expect(f.filteredConcepts.value).toHaveLength(3)

    f.setTextFilter('   ')
    expect(f.filteredConcepts.value).toHaveLength(3)
  })

  it('matches concept name case-insensitively', () => {
    const f = useConceptFacets(ref(rows))
    f.setTextFilter('DIABETES')

    expect(f.filteredConcepts.value.map(c => c.conceptId)).toEqual([201826, 4193704])
  })

  it('matches concept id and concept code too', () => {
    const f = useConceptFacets(ref(rows))

    f.setTextFilter('320128')
    expect(f.filteredConcepts.value.map(c => c.conceptName)).toEqual(['Essential hypertension'])

    f.setTextFilter('46635009')
    expect(f.filteredConcepts.value.map(c => c.conceptId)).toEqual([4193704])
  })

  it('matches vocabulary and domain', () => {
    const f = useConceptFacets(ref(rows))
    f.setTextFilter('icd10')

    expect(f.filteredConcepts.value.map(c => c.conceptId)).toEqual([320128])
  })

  it('combines with facet selections rather than replacing them', () => {
    const f = useConceptFacets(ref(rows))
    f.setFacet('vocabularyId', ['SNOMED'])
    f.setTextFilter('type 1')

    expect(f.filteredConcepts.value.map(c => c.conceptId)).toEqual([4193704])
  })

  it('narrows the facet option counts to the rows still on screen', () => {
    const f = useConceptFacets(ref(rows))
    f.setTextFilter('diabetes')

    const vocab = f.facetOptions.value.vocabularyId
    expect(vocab).toEqual([{ value: 'SNOMED', label: 'SNOMED (2)', count: 2 }])
  })

  it('counts as an active filter and is cleared with the others', () => {
    const f = useConceptFacets(ref(rows))
    expect(f.activeFilterCount.value).toBe(0)

    f.setTextFilter('diabetes')
    expect(f.activeFilterCount.value).toBe(1)

    f.setFacet('vocabularyId', ['SNOMED'])
    expect(f.activeFilterCount.value).toBe(2)

    f.clearFilters()
    expect(f.activeFilterCount.value).toBe(0)
    expect(f.textFilter.value).toBe('')
    expect(f.filteredConcepts.value).toHaveLength(3)
  })

  it('yields nothing when the filter matches no row', () => {
    const f = useConceptFacets(ref(rows))
    f.setTextFilter('no such concept')

    expect(f.filteredConcepts.value).toEqual([])
  })
})
