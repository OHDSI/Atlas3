import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

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

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('useIncidenceRateGeneration', () => {
  it('start triggers polling and stops on terminal status', async () => {
    const gen = useIncidenceRateGeneration(1)
    await gen.start('2')
    expect(gen.polling.value).toBe(true)
    await vi.advanceTimersByTimeAsync(5000)
    // After polling fetches COMPLETE, polling stops
    expect(gen.polling.value).toBe(false)
    const store = useIncidenceRateStore()
    expect(store.executionInfoBySourceKey['2'].executionInfo.status).toBe('COMPLETE')
  })
})
