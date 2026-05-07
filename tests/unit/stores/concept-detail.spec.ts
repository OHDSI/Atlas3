// tests/unit/stores/concept-detail.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/concept-search.service', () => ({
  getConceptById: vi.fn(),
  getConceptRecordCounts: vi.fn(),
}))

vi.mock('@/services/concept-detail.service', () => ({
  getConceptRelated: vi.fn(),
  getConceptAncestorAndDescendant: vi.fn(),
  getConceptDrilldown: vi.fn(),
}))

vi.mock('@/services/datasource.service', () => ({}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: vi.fn(() => ({
    sources: { value: [{ sourceId: 1, sourceKey: 'SYNPUF1K', sourceName: 'Synpuf 1k' }] },
  })),
}))

import { useConceptDetailStore } from '@/stores/concept-detail'
import { getConceptById, getConceptRecordCounts } from '@/services/concept-search.service'
import {
  getConceptRelated,
  getConceptAncestorAndDescendant,
} from '@/services/concept-detail.service'
import type { Mock } from 'vitest'

describe('concept-detail store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loadConcept fans out four parallel calls and populates state', async () => {
    ;(getConceptById as Mock).mockResolvedValue({
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      conceptCode: '44054006',
      invalidReason: null,
    })
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(
      new Map([
        [201826, { recordCount: 12345, descendantRecordCount: 45678, personCount: 8200, descendantPersonCount: 28300 }],
      ])
    )

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 201826)

    expect(getConceptById).toHaveBeenCalledWith('SYNPUF1K', 201826)
    expect(getConceptRelated).toHaveBeenCalledWith('SYNPUF1K', 201826)
    expect(getConceptAncestorAndDescendant).toHaveBeenCalledWith('SYNPUF1K', 201826)
    expect(getConceptRecordCounts).toHaveBeenCalledWith('SYNPUF1K', [201826])
    expect(store.concept?.conceptName).toBe('Type 2 diabetes mellitus')
    expect(store.recordCountsBySource.get('SYNPUF1K')?.recordCount).toBe(12345)
    expect(store.isLoading).toBe(false)
  })

  it('caches concept loads within 5-minute TTL', async () => {
    ;(getConceptById as Mock).mockResolvedValue({
      conceptId: 1,
      conceptName: 'X',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      conceptCode: 'x',
      invalidReason: null,
    })
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 1)
    await store.loadConcept('SYNPUF1K', 1)

    expect(getConceptById).toHaveBeenCalledTimes(1)
  })

  it('partitions hierarchy into parents and children using RELATIONSHIP_NAME', async () => {
    ;(getConceptById as Mock).mockResolvedValue({
      conceptId: 201826,
      conceptName: 'T2DM',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      conceptCode: '44054006',
      invalidReason: null,
    })
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([
      {
        conceptId: 73211009,
        conceptName: 'Diabetes mellitus',
        conceptCode: '73211009',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        relationships: [{ relationshipName: 'Has ancestor of', relationshipDistance: 1 }],
      },
      {
        conceptId: 421326000,
        conceptName: 'T2DM with renal complications',
        conceptCode: '421326000',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        relationships: [{ relationshipName: 'Has descendant of', relationshipDistance: 1 }],
      },
    ])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 201826)

    expect(store.parents.map((c) => c.conceptId)).toEqual([73211009])
    expect(store.children.map((c) => c.conceptId)).toEqual([421326000])
  })
})
