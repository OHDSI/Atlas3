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
  getConceptDrilldown,
} from '@/services/concept-detail.service'
import type { Mock } from 'vitest'

describe('concept-detail store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loadConcept fans out four parallel calls and populates state', async () => {
    (getConceptById as Mock).mockResolvedValue({
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
    (getConceptById as Mock).mockResolvedValue({
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
    (getConceptById as Mock).mockResolvedValue({
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

  it('sets error="Concept not found" when getConceptById returns null', async () => {
    (getConceptById as Mock).mockResolvedValue(null)
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 999)

    expect(store.error).toBe('Concept not found')
    expect(store.concept).toBeNull()
    expect(store.related).toEqual([])
    expect(store.hierarchy).toEqual([])
    expect(store.recordCountsBySource.size).toBe(0)
    expect(store.isLoading).toBe(false)
  })

  it('sets error="Failed to load concept" when a service rejects', async () => {
    (getConceptById as Mock).mockRejectedValue(new Error('boom'))
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 1)

    expect(store.error).toBe('Failed to load concept')
    expect(store.isLoading).toBe(false)
  })

  it('force=true bypasses TTL cache', async () => {
    (getConceptById as Mock).mockResolvedValue({
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
    await store.loadConcept('SYNPUF1K', 1, true)

    expect(getConceptById).toHaveBeenCalledTimes(2)
  })

  it('loadRecordCountsForSources fetches missing sources and skips already-loaded ones', async () => {
    (getConceptById as Mock).mockResolvedValue({
      conceptId: 5,
      conceptName: 'Y',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      conceptCode: 'y',
      invalidReason: null,
    })
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(
      new Map([[5, { recordCount: 1, descendantRecordCount: 2, personCount: 3, descendantPersonCount: 4 }]])
    )

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 5)
    expect(store.recordCountsBySource.has('SYNPUF1K')).toBe(true)

    ;(getConceptRecordCounts as Mock).mockClear()
    ;(getConceptRecordCounts as Mock).mockResolvedValue(
      new Map([[5, { recordCount: 10, descendantRecordCount: 20, personCount: 30, descendantPersonCount: 40 }]])
    )

    await store.loadRecordCountsForSources(['SYNPUF1K', 'OTHER_SRC'], 5)

    // Already-loaded SYNPUF1K is skipped; only OTHER_SRC triggers a fetch
    expect(getConceptRecordCounts).toHaveBeenCalledTimes(1)
    expect(getConceptRecordCounts).toHaveBeenCalledWith('OTHER_SRC', [5])
    expect(store.recordCountsBySource.get('OTHER_SRC')?.recordCount).toBe(10)
  })

  it('loadRecordCountsForSources skips when source returns no counts for concept', async () => {
    (getConceptById as Mock).mockResolvedValue({
      conceptId: 5,
      conceptName: 'Y',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      conceptCode: 'y',
      invalidReason: null,
    })
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 5)

    ;(getConceptRecordCounts as Mock).mockResolvedValueOnce(new Map())
    await store.loadRecordCountsForSources(['OTHER_SRC'], 5)
    expect(store.recordCountsBySource.has('OTHER_SRC')).toBe(false)
  })

  it('loadDrilldown short-circuits when no concept is loaded', async () => {
    const store = useConceptDetailStore()
    await store.loadDrilldown('SYNPUF1K')
    expect(getConceptDrilldown).not.toHaveBeenCalled()
    expect(store.isDrilldownLoading).toBe(false)
  })

  it('loadDrilldown fetches the report and caches by source', async () => {
    (getConceptById as Mock).mockResolvedValue({
      conceptId: 10,
      conceptName: 'D',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      conceptCode: '10',
      invalidReason: null,
    })
    ;(getConceptRelated as Mock).mockResolvedValue([])
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())
    ;(getConceptDrilldown as Mock).mockResolvedValue({ report: { foo: 1 } })

    const store = useConceptDetailStore()
    await store.loadConcept('SYNPUF1K', 10)
    await store.loadDrilldown('SYNPUF1K')

    expect(getConceptDrilldown).toHaveBeenCalledWith('SYNPUF1K', 'Condition', 10)
    expect(store.drilldownBySource.get('SYNPUF1K')).toEqual({ report: { foo: 1 } })
    expect(store.isDrilldownLoading).toBe(false)

    // Second invocation should short-circuit on the cached entry
    await store.loadDrilldown('SYNPUF1K')
    expect(getConceptDrilldown).toHaveBeenCalledTimes(1)
  })

  it('reset clears all state', async () => {
    (getConceptById as Mock).mockResolvedValue({
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
    store.reset()

    expect(store.concept).toBeNull()
    expect(store.related).toEqual([])
    expect(store.hierarchy).toEqual([])
    expect(store.recordCountsBySource.size).toBe(0)
    expect(store.drilldownBySource.size).toBe(0)
    expect(store.isLoading).toBe(false)
    expect(store.isDrilldownLoading).toBe(false)
    expect(store.error).toBeNull()
  })
})
