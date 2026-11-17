import { describe, it, expect } from 'vitest'
import { formatConceptSetsAsText } from '@/utils/concept-set-text'
import type { ConceptSetReference } from '@/models/cohort.types'

const HEADER = 'Concept Id\tConcept Name\tDomain\tVocabulary\tExcluded\tDescendants\tMapped'

describe('formatConceptSetsAsText', () => {
  it('returns an empty string when there are no concept sets', () => {
    expect(formatConceptSetsAsText([])).toBe('')
  })

  it('lists each concept set with a header and one tab-separated row per concept', () => {
    const sets: ConceptSetReference[] = [
      {
        id: 0,
        name: 'Type 2 diabetes',
        items: [
          {
            conceptId: 201826,
            conceptName: 'Type 2 diabetes mellitus',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
          {
            conceptId: 4058243,
            conceptName: 'Diabetic renal disease',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            isExcluded: true,
            includeDescendants: false,
            includeMapped: true,
          },
        ],
      },
      {
        id: 1,
        name: 'Metformin',
        items: [
          {
            conceptId: 1503297,
            conceptName: 'metformin',
            domainId: 'Drug',
            vocabularyId: 'RxNorm',
            isExcluded: false,
            includeDescendants: true,
            includeMapped: true,
          },
        ],
      },
    ]

    expect(formatConceptSetsAsText(sets)).toBe(
      [
        'Type 2 diabetes',
        HEADER,
        '201826\tType 2 diabetes mellitus\tCondition\tSNOMED\tNO\tYES\tNO',
        '4058243\tDiabetic renal disease\tCondition\tSNOMED\tYES\tNO\tYES',
        '',
        'Metformin',
        HEADER,
        '1503297\tmetformin\tDrug\tRxNorm\tNO\tYES\tYES',
        '',
      ].join('\n')
    )
  })

  it('writes the header for a concept set without concepts', () => {
    expect(formatConceptSetsAsText([{ id: 2, name: 'Empty' }])).toBe(`Empty\n${HEADER}\n`)
  })

  it('replaces tabs and newlines inside values so columns stay aligned', () => {
    const text = formatConceptSetsAsText([
      {
        id: 3,
        name: 'Line\nbreak',
        items: [{ conceptId: 1, conceptName: 'a\tb', domainId: 'Drug', vocabularyId: 'RxNorm' }],
      },
    ])

    expect(text.split('\n')).toEqual(['Line break', HEADER, '1\ta b\tDrug\tRxNorm\tNO\tNO\tNO', ''])
  })

  it('uses the given labels for headers and flags', () => {
    const text = formatConceptSetsAsText(
      [
        {
          id: 4,
          name: 'Set',
          items: [{ conceptId: 9, conceptName: 'x', domainId: 'Drug', vocabularyId: 'RxNorm', isExcluded: true }],
        },
      ],
      {
        conceptId: 'ID',
        conceptName: 'Name',
        domain: 'Dom',
        vocabulary: 'Voc',
        excluded: 'Exc',
        descendants: 'Desc',
        mapped: 'Map',
        yes: 'Y',
        no: 'N',
      }
    )

    expect(text).toBe('Set\nID\tName\tDom\tVoc\tExc\tDesc\tMap\n9\tx\tDrug\tRxNorm\tY\tN\tN\n')
  })
})
