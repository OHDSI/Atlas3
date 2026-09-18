import { describe, expect, it } from 'vitest'
import type { ConceptSet, ConceptSetItem as CirceConceptSetItem } from '@/models/circe-types'
import {
  circeConceptSetFromAtlas,
  convertAtlasItemToCirce,
  convertCirceItemToAtlas,
  nextConceptSetId,
  type AtlasConceptSetItem,
} from '@/components/cohort-editor/atlas-concept-set'

const atlasItem: AtlasConceptSetItem = {
  conceptId: 101,
  conceptName: 'Atlas concept',
  conceptCode: 'A101',
  standardConcept: 'S',
  invalidReason: null,
  standardConceptCaption: 'Standard',
  invalidReasonCaption: 'Valid',
  validStartDate: 0,
  validEndDate: 0,
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  isExcluded: true,
  includeDescendants: true,
  includeMapped: false,
}

const circeItem: CirceConceptSetItem = {
  concept: {
    CONCEPT_ID: 202,
    CONCEPT_NAME: 'Circe concept',
    STANDARD_CONCEPT: 'S',
    STANDARD_CONCEPT_CAPTION: 'Standard',
    INVALID_REASON: null,
    INVALID_REASON_CAPTION: 'Valid',
    CONCEPT_CODE: 'C202',
    DOMAIN_ID: 'Drug',
    VOCABULARY_ID: 'RxNorm',
    CONCEPT_CLASS_ID: 'Ingredient',
  },
  isExcluded: false,
  includeDescendants: true,
  includeMapped: true,
}

describe('atlas-concept-set', () => {
  it('converts Atlas items into circe items and preserves flags', () => {
    expect(convertAtlasItemToCirce(atlasItem)).toEqual({
      concept: {
        CONCEPT_ID: 101,
        CONCEPT_NAME: 'Atlas concept',
        STANDARD_CONCEPT_CAPTION: 'Standard',
        INVALID_REASON_CAPTION: 'Valid',
        CONCEPT_CODE: 'A101',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: null,
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'SNOMED',
        CONCEPT_CLASS_ID: 'Clinical Finding',
      },
      isExcluded: true,
      includeDescendants: true,
      includeMapped: false,
    })
  })

  it('returns circe items unchanged when they are already nested', () => {
    expect(convertAtlasItemToCirce(circeItem)).toBe(circeItem)
  })

  it('converts circe items back into Atlas items with safe defaults', () => {
    expect(convertCirceItemToAtlas({
      concept: undefined,
      isExcluded: undefined,
      includeDescendants: undefined,
      includeMapped: undefined,
    })).toEqual({
      conceptId: 0,
      conceptName: '',
      conceptCode: '',
      domainId: '',
      vocabularyId: '',
      conceptClassId: '',
      standardConcept: null,
      invalidReason: null,
      standardConceptCaption: '',
      invalidReasonCaption: '',
      validStartDate: 0,
      validEndDate: 0,
      isExcluded: false,
      includeDescendants: false,
      includeMapped: false,
    })
  })

  it('returns undefined for a non-numeric id when no existing sets are available', () => {
    expect(circeConceptSetFromAtlas({ id: 'client-id', name: 'Draft', items: [] })).toBeUndefined()
  })

  it('allocates the next numeric id for a non-numeric id when existing sets are provided', () => {
    const existing: ConceptSet[] = [
      { id: 0, name: 'Local A', expression: { items: [] } },
      { id: 3, name: 'Local B', expression: { items: [] } },
    ]

    expect(circeConceptSetFromAtlas({ id: 'client-id', name: 'Draft', items: [atlasItem] }, existing)).toEqual({
      id: 4,
      name: 'Draft',
      expression: { items: [convertAtlasItemToCirce(atlasItem)] },
    })
  })

  it('keeps a numeric id when there is no collision or when the colliding set has the same name', () => {
    const existing: ConceptSet[] = [
      { id: 2, name: 'Same name', expression: { items: [] } },
      { id: 7, name: 'Other', expression: { items: [] } },
    ]

    expect(circeConceptSetFromAtlas({ id: 2, name: 'Same name', items: [] }, existing)).toEqual({
      id: 2,
      name: 'Same name',
      expression: { items: [] },
    })
    expect(circeConceptSetFromAtlas({ id: 7, name: 'Renamed', items: [] }, existing)).toEqual({
      id: 8,
      name: 'Renamed',
      expression: { items: [] },
    })
  })

  it('returns the next unused numeric id even when the existing set list contains gaps', () => {
    expect(nextConceptSetId([{ id: 0 }, { id: 4 }, { id: Number.NaN }, { id: 2 }])).toBe(5)
  })
})