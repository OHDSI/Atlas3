import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataSourcesStore } from '@/stores/datasources'

beforeAll(() => { vi.useFakeTimers() })
afterAll(() => { vi.useRealTimers() })

vi.mock('@/services/incidence-rate.service', () => ({
  generateIncidenceRate: vi.fn().mockResolvedValue({
    success: true,
    data: { id: { analysisId: 1, sourceId: 2 }, status: 'PENDING' },
  }),
  cancelIncidenceRateGeneration: vi.fn().mockResolvedValue(true),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'COMPLETE' }, summaryList: [] },
    ],
  }),
}))

import { useIncidenceRateGeneration } from '@/composables/useIncidenceRateGeneration'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import {
  generateIncidenceRate,
  cancelIncidenceRateGeneration,
  listIncidenceRateInfo,
} from '@/services/incidence-rate.service'

const mockGenerate = vi.mocked(generateIncidenceRate)
const mockCancel = vi.mocked(cancelIncidenceRateGeneration)
const mockListInfo = vi.mocked(listIncidenceRateInfo)

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useIncidenceRateGeneration', () => {
  it('start triggers polling and keeps polling until terminal status arrives', async () => {
    const store = useIncidenceRateStore()
    const ds = useDataSourcesStore()
    ds.sources = [{ sourceId: 2, sourceKey: 'CCAE' }] as never
    mockListInfo
      .mockResolvedValueOnce({
        success: true,
        data: [
          { executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'RUNNING' }, summaryList: [] },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        data: [
          { executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'COMPLETE' }, summaryList: [] },
        ],
      })

    const gen = useIncidenceRateGeneration(1)
    await gen.start('CCAE')

    expect(mockGenerate).toHaveBeenCalledWith(1, 'CCAE')
    expect(gen.polling.value).toBe(true)
    await vi.advanceTimersByTimeAsync(5000)
    expect(gen.polling.value).toBe(false)
    expect(store.executionInfoBySourceKey.CCAE.executionInfo.status).toBe('COMPLETE')
  })

  it('pollOnce retries data-source loading and maps source ids to keys', async () => {
    const store = useIncidenceRateStore()
    const ds = useDataSourcesStore()
    ds.sources = [] as never
    const fetchSpy = vi.spyOn(ds, 'fetchDataSources').mockImplementationOnce(async () => {
      ds.sources = [] as never
    }).mockImplementationOnce(async () => {
      ds.sources = [{ sourceId: 9, sourceKey: 'SRC9' }] as never
    })
    mockListInfo.mockResolvedValue({
      success: true,
      data: [
        { executionInfo: { id: { analysisId: 1, sourceId: 9 }, status: 'COMPLETE' }, summaryList: [] },
      ],
    })

    const gen = useIncidenceRateGeneration(1)
    await gen.pollOnce()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(store.executionInfoBySourceKey.SRC9.executionInfo.id.sourceId).toBe(9)
  })

  it('surfaces a poll failure and stops the active poller', async () => {
    mockListInfo.mockResolvedValue({
      success: false,
      error: { message: 'boom' },
    } as never)

    const gen = useIncidenceRateGeneration(1)
    await gen.pollOnce()

    expect(gen.error.value).toBe('boom')
  })

  it('returns false when generation start fails', async () => {
    mockGenerate.mockResolvedValueOnce({
      success: false,
      error: { message: 'cannot start' },
    } as never)

    const gen = useIncidenceRateGeneration(1)
    const ok = await gen.start('CCAE')

    expect(ok).toBe(false)
    expect(gen.error.value).toBe('cannot start')
  })

  it('returns false when cancel fails', async () => {
    mockCancel.mockResolvedValueOnce({
      success: false,
      error: { message: 'cannot cancel' },
    } as never)

    const gen = useIncidenceRateGeneration(1)
    const ok = await gen.cancel('CCAE')

    expect(ok).toBe(false)
    expect(gen.error.value).toBe('cannot cancel')
  })
})
