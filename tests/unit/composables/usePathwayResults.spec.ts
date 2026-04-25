import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePathwayResults } from '@/composables/usePathwayResults'
import * as webapi from '@/services/webapi'

vi.mock('@/services/webapi')

describe('usePathwayResults', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('load fetches design + execution + results in parallel', async () => {
    vi.mocked(webapi.getPathwayExecution).mockResolvedValue({
      success: true, data: { id: 99, status: 'COMPLETED', sourceKey: 'cdm' },
    })
    vi.mocked(webapi.getPathwayDesignByGeneration).mockResolvedValue({
      success: true, data: {
        name: 'X', tags: [],
        design: {
          targetCohorts: [{ id: 1, name: 'T' }],
          eventCohorts: [{ id: 2, name: 'E' }],
          combinationWindow: 30, minCellCount: 5, maxDepth: 3, allowRepeats: false,
        },
      },
    })
    vi.mocked(webapi.getPathwayResults).mockResolvedValue({
      success: true, data: {
        pathwayGroups: [{
          targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 50,
          pathways: [{ path: '1-2', personCount: 10 }],
        }],
        eventCodes: [{ code: 1, name: 'A', isCombo: false }],
      },
    })
    const r = usePathwayResults()
    await r.load(99)
    expect(r.execution.value?.id).toBe(99)
    expect(r.design.value?.name).toBe('X')
    expect(r.results.value?.pathwayGroups).toHaveLength(1)
  })

  it('error sets error ref and leaves data null', async () => {
    vi.mocked(webapi.getPathwayExecution).mockResolvedValue({
      success: false, error: 'boom',
    })
    vi.mocked(webapi.getPathwayDesignByGeneration).mockResolvedValue({
      success: false, error: 'boom',
    })
    vi.mocked(webapi.getPathwayResults).mockResolvedValue({
      success: false, error: 'boom',
    })
    const r = usePathwayResults()
    await r.load(99)
    expect(r.error.value).not.toBeNull()
    expect(r.results.value).toBeNull()
  })
})
