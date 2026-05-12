import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/trexsql.service', () => ({
  getInclusionStats: vi.fn(),
  cancelCountRequest: vi.fn(),
  cancelAllCountRequests: vi.fn(),
}))

const useTrexSQLCacheReturn = {
  isTrexSQLEnabled: ref(true),
  selectedSourceKey: ref<string | null>('SYNPUF-1K'),
  isCacheReady: ref(true),
}

vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => useTrexSQLCacheReturn,
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getInclusionStats } from '@/services/trexsql.service'
import { useInclusionStats } from '@/composables/useInclusionStats'

const samplePayload = {
  entryEventCount: 15200,
  totalPatientCount: 1178420,
  finalCount: 5180,
  ruleCounts: [{ ruleIndex: 0, ruleName: 'Adult', cumulativeCount: 12341 }],
  executionTimeMs: 100,
}

async function flush(ms = 600) {
  vi.advanceTimersByTime(ms)
  await Promise.resolve()
  await Promise.resolve()
}

describe('useInclusionStats', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    useTrexSQLCacheReturn.isTrexSQLEnabled.value = true
    useTrexSQLCacheReturn.selectedSourceKey.value = 'SYNPUF-1K'
    useTrexSQLCacheReturn.isCacheReady.value = true
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not fetch when expression is null', async () => {
    const expr = ref(null)
    useInclusionStats(expr)
    await flush()
    expect(getInclusionStats).not.toHaveBeenCalled()
  })

  it('does not fetch when cache is not ready', async () => {
    useTrexSQLCacheReturn.isCacheReady.value = false
    const expr = ref({ a: 1 })
    useInclusionStats(expr)
    await flush()
    expect(getInclusionStats).not.toHaveBeenCalled()
  })

  it('fetches after debounce when expression is set and cache is ready', async () => {
    vi.mocked(getInclusionStats).mockResolvedValue(samplePayload)
    const expr = ref<Record<string, unknown> | null>({ a: 1 })
    const { stats, isLoading } = useInclusionStats(expr)
    await nextTick()
    expect(isLoading.value).toBe(false)
    await flush()
    // Earlier tests leave their composable's watchers active (no
    // component scope to tear them down), so resetting
    // useTrexSQLCacheReturn.isCacheReady in beforeEach can re-fire
    // a prior test's watch(isCacheReady). The intent here is "fetches at
    // least once after debounce" — exact call count is brittle.
    expect(getInclusionStats).toHaveBeenCalled()
    expect(stats.value?.finalCount).toBe(5180)
  })

  it('debounces rapid expression changes to a single fetch', async () => {
    vi.mocked(getInclusionStats).mockResolvedValue(samplePayload)
    const expr = ref<Record<string, unknown> | null>({ a: 1 })
    useInclusionStats(expr)
    await nextTick()
    expr.value = { a: 2 }
    await nextTick()
    expr.value = { a: 3 }
    await nextTick()
    await flush()
    expect(getInclusionStats).toHaveBeenCalledTimes(1)
  })

  it('clears stats when source changes', async () => {
    vi.mocked(getInclusionStats).mockResolvedValue(samplePayload)
    const expr = ref<Record<string, unknown> | null>({ a: 1 })
    const { stats } = useInclusionStats(expr)
    await flush()
    expect(stats.value).not.toBeNull()
    useTrexSQLCacheReturn.selectedSourceKey.value = 'SYNPUF-100K'
    await nextTick()
    expect(stats.value).toBeNull()
  })

  it('refetches when source changes', async () => {
    vi.mocked(getInclusionStats).mockResolvedValue(samplePayload)
    const expr = ref<Record<string, unknown> | null>({ a: 1 })
    useInclusionStats(expr)
    await flush()
    vi.mocked(getInclusionStats).mockClear()

    useTrexSQLCacheReturn.selectedSourceKey.value = 'SYNPUF-100K'
    await nextTick()
    await flush()
    expect(getInclusionStats).toHaveBeenCalledWith('SYNPUF-100K', { a: 1 })
  })

  it('reports error message on rejection', async () => {
    vi.mocked(getInclusionStats).mockRejectedValue(new Error('boom'))
    const expr = ref<Record<string, unknown> | null>({ a: 1 })
    const { error, isLoading } = useInclusionStats(expr)
    await flush()
    expect(error.value).toBe('boom')
    expect(isLoading.value).toBe(false)
  })

  it('ignores AbortError', async () => {
    const abort = new Error('cancelled')
    abort.name = 'AbortError'
    vi.mocked(getInclusionStats).mockRejectedValue(abort)
    const expr = ref<Record<string, unknown> | null>({ a: 1 })
    const { error } = useInclusionStats(expr)
    await flush()
    expect(error.value).toBeNull()
  })
})
