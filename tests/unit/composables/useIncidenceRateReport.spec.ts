import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'

vi.mock('@/services/webapi', () => ({
  getIncidenceRateReport: vi.fn().mockResolvedValue({
    success: true,
    data: {
      summary: { targetId: 1, outcomeId: 2, totalPersons: 0, cases: 0, timeAtRisk: 0, proportion: 0, rate: 0 },
      stratifyStats: [], treemapData: '{}',
    },
  }),
}))

import { useIncidenceRateReport } from '@/composables/useIncidenceRateReport'
import * as webapi from '@/services/webapi'

beforeEach(() => vi.clearAllMocks())

describe('useIncidenceRateReport', () => {
  it('does not fetch when any input is null', async () => {
    const irId = ref<number | null>(null)
    const sk = ref<string | null>('CCAE')
    const t = ref<number | null>(1)
    const o = ref<number | null>(2)
    useIncidenceRateReport(irId, sk, t, o)
    await nextTick()
    expect(webapi.getIncidenceRateReport).not.toHaveBeenCalled()
  })

  it('fetches when all inputs provided and refetches on change', async () => {
    const irId = ref<number | null>(7)
    const sk = ref<string | null>('CCAE')
    const t = ref<number | null>(1)
    const o = ref<number | null>(2)
    const r = useIncidenceRateReport(irId, sk, t, o)
    await nextTick()
    await Promise.resolve(); await Promise.resolve()
    expect(r.report.value).not.toBeNull()
    o.value = 3
    await nextTick()
    await Promise.resolve(); await Promise.resolve()
    expect(webapi.getIncidenceRateReport).toHaveBeenCalledTimes(2)
  })
})
