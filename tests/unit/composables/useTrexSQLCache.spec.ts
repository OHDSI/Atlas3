/**
 * Unit tests for useTrexSQLCache composable
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/trexsql.service', () => ({
  getPatientCount: vi.fn(),
  getCacheStatus: vi.fn(),
  cancelCountRequest: vi.fn(),
  cancelAllCountRequests: vi.fn(),
}))

vi.mock('@/services/datasource.service', () => ({
  listDataSources: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import { useAuthStore } from '@/stores/auth'
import {
  getPatientCount,
  getCacheStatus,
  cancelCountRequest,
  cancelAllCountRequests,
} from '@/services/trexsql.service'
import { listDataSources } from '@/services/datasource.service'
import { TREXSQL_SELECTED_SOURCE_KEY } from '@/models/trexsql.types'
import type { TrexSQLCacheStatus } from '@/models/trexsql.types'

function readyStatus(sourceKey: string): TrexSQLCacheStatus {
  return {
    sourceKey,
    status: 'ready',
    totalPatientCount: 100,
    lastBuiltAt: '2024-01-01T00:00:00.000Z',
    sizeBytes: 1024,
    errorMessage: null,
  }
}

function notBuiltStatus(sourceKey: string): TrexSQLCacheStatus {
  return {
    sourceKey,
    status: 'not_built',
    totalPatientCount: null,
    lastBuiltAt: null,
    sizeBytes: null,
    errorMessage: null,
  }
}

/**
 * Mount the composable inside a host component so onUnmounted runs naturally.
 */
function mountComposable() {
  let api!: ReturnType<typeof useTrexSQLCache>
  const TestComponent = defineComponent({
    setup() {
      api = useTrexSQLCache()
      return () => h('div')
    },
  })
  const wrapper = mount(TestComponent)
  return { api, wrapper }
}

describe('useTrexSQLCache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isTrexSQLEnabled', () => {
    it('reflects auth store user setting when explicit', () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never
      const { api, wrapper } = mountComposable()
      expect(api.isTrexSQLEnabled.value).toBe(true)
      wrapper.unmount()
    })

    it('returns false by default when not detected and no user', () => {
      const { api, wrapper } = mountComposable()
      expect(api.isTrexSQLEnabled.value).toBe(false)
      wrapper.unmount()
    })

    it('returns false when user explicitly disables', () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: false,
      } as never
      const { api, wrapper } = mountComposable()
      expect(api.isTrexSQLEnabled.value).toBe(false)
      wrapper.unmount()
    })
  })

  describe('formatted/computed views', () => {
    it('returns em-dash placeholders when no result', () => {
      const { api, wrapper } = mountComposable()
      expect(api.cohortPatientCountFormatted.value).toBe('—')
      expect(api.totalPatientCountFormatted.value).toBe('—')
      expect(api.cohortPercentage.value).toBe(0)
      expect(api.patientCount.value).toBeNull()
      wrapper.unmount()
    })

    it('formats counts and computes percentage when result is set', () => {
      const { api, wrapper } = mountComposable()
      api.countState.value.result = {
        cohortPatientCount: 250,
        totalPatientCount: 1000,
        executionTimeMs: 5,
      }
      expect(api.cohortPatientCountFormatted.value).toBe('250')
      expect(api.totalPatientCountFormatted.value).toBe('1,000')
      expect(api.cohortPercentage.value).toBe(25)
      wrapper.unmount()
    })

    it('cohortPercentage is 0 when totalPatientCount is 0', () => {
      const { api, wrapper } = mountComposable()
      api.countState.value.result = {
        cohortPatientCount: 0,
        totalPatientCount: 0,
        executionTimeMs: 0,
      }
      expect(api.cohortPercentage.value).toBe(0)
      wrapper.unmount()
    })
  })

  describe('selectedCacheStatus & messages', () => {
    it('returns null status with default message when nothing selected', () => {
      const { api, wrapper } = mountComposable()
      expect(api.selectedCacheStatus.value).toBeNull()
      expect(api.cacheStatusMessage.value).toBe('No data source selected')
      expect(api.isCacheReady.value).toBe(false)
      wrapper.unmount()
    })

    it.each([
      ['ready' as const, 'Cache ready'],
      ['building' as const, 'Cache is building...'],
      ['not_built' as const, 'Cache not built. Build the cache to enable patient counting.'],
      ['stale' as const, 'Cache is stale. Consider rebuilding for accurate counts.'],
    ])('reports message for status %s', (status, expected) => {
      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: { ...readyStatus('A'), status } },
      ]
      api.selectedSourceKey.value = 'A'
      expect(api.cacheStatusMessage.value).toBe(expected)
      wrapper.unmount()
    })

    it('reports error message from status when error', () => {
      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        {
          sourceKey: 'A',
          sourceName: 'A',
          cacheStatus: { ...readyStatus('A'), status: 'error', errorMessage: 'boom' },
        },
      ]
      api.selectedSourceKey.value = 'A'
      expect(api.cacheStatusMessage.value).toBe('boom')
      wrapper.unmount()
    })

    it('falls back to generic error message when no errorMessage', () => {
      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        {
          sourceKey: 'A',
          sourceName: 'A',
          cacheStatus: { ...readyStatus('A'), status: 'error', errorMessage: null },
        },
      ]
      api.selectedSourceKey.value = 'A'
      expect(api.cacheStatusMessage.value).toBe('Cache error')
      wrapper.unmount()
    })

    it('isCacheReady is true when status is ready', () => {
      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'
      expect(api.isCacheReady.value).toBe(true)
      wrapper.unmount()
    })
  })

  describe('localStorage selection (initialize)', () => {
    it('loads previously stored source key on initialize', async () => {
      localStorage.setItem(TREXSQL_SELECTED_SOURCE_KEY, 'STORED')

      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: false, // skip fetchDataSourcesWithCacheStatus side effects
      } as never

      const { api, wrapper } = mountComposable()
      await api.initialize()

      expect(api.selectedSourceKey.value).toBe('STORED')
      wrapper.unmount()
    })

    it('persists selection changes to localStorage', async () => {
      const { api, wrapper } = mountComposable()
      api.selectedSourceKey.value = 'NEW'
      // wait for watcher to flush
      await Promise.resolve()
      expect(localStorage.getItem(TREXSQL_SELECTED_SOURCE_KEY)).toBe('NEW')

      api.selectedSourceKey.value = null
      await Promise.resolve()
      expect(localStorage.getItem(TREXSQL_SELECTED_SOURCE_KEY)).toBeNull()
      wrapper.unmount()
    })

    it('tolerates localStorage.getItem throwing on initialize', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: false,
      } as never

      const original = Storage.prototype.getItem
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('boom')
      })

      try {
        const { api, wrapper } = mountComposable()
        await api.initialize()
        // Should not throw and selection remains null
        expect(api.selectedSourceKey.value).toBeNull()
        wrapper.unmount()
      } finally {
        Storage.prototype.getItem = original
      }
    })

    it('tolerates localStorage.setItem throwing when persisting', async () => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('quota')
      })

      try {
        const { api, wrapper } = mountComposable()
        // Should not throw when watcher fires
        api.selectedSourceKey.value = 'ANY'
        await Promise.resolve()
        expect(api.selectedSourceKey.value).toBe('ANY')
        wrapper.unmount()
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('fetchDataSourcesWithCacheStatus', () => {
    it('does nothing when TrexSQL is disabled', async () => {
      const { api, wrapper } = mountComposable()
      // Default: no auth user, trexSQLDetected null → disabled
      await api.fetchDataSourcesWithCacheStatus()
      expect(listDataSources).not.toHaveBeenCalled()
      expect(api.dataSources.value).toEqual([])
      wrapper.unmount()
    })

    it('fetches sources and selects first ready source by default', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'A', sourceName: 'A' },
        { sourceKey: 'B', sourceName: 'B' },
      ] as never)
      vi.mocked(getCacheStatus)
        .mockResolvedValueOnce(notBuiltStatus('A'))
        .mockResolvedValueOnce(readyStatus('B'))

      const { api, wrapper } = mountComposable()
      await api.fetchDataSourcesWithCacheStatus()

      expect(api.dataSources.value).toHaveLength(2)
      expect(api.selectedSourceKey.value).toBe('B') // ready one preferred
      wrapper.unmount()
    })

    it('falls back to first source if no ready source', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'A', sourceName: 'A' },
      ] as never)
      vi.mocked(getCacheStatus).mockResolvedValueOnce(notBuiltStatus('A'))

      const { api, wrapper } = mountComposable()
      await api.fetchDataSourcesWithCacheStatus()

      expect(api.selectedSourceKey.value).toBe('A')
      wrapper.unmount()
    })

    it('returns null cacheStatus when getCacheStatus throws for a source', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'A', sourceName: 'A' },
      ] as never)
      vi.mocked(getCacheStatus).mockRejectedValue(new Error('nope'))

      const { api, wrapper } = mountComposable()
      await api.fetchDataSourcesWithCacheStatus()

      expect(api.dataSources.value[0]?.cacheStatus).toBeNull()
      wrapper.unmount()
    })

    it('clears data sources when listDataSources fails', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(listDataSources).mockRejectedValue(new Error('boom'))

      const { api, wrapper } = mountComposable()
      await api.fetchDataSourcesWithCacheStatus()
      expect(api.dataSources.value).toEqual([])
      wrapper.unmount()
    })
  })

  describe('selectDataSource', () => {
    it('cancels in-flight count and resets state', () => {
      const { api, wrapper } = mountComposable()
      api.selectedSourceKey.value = 'OLD'
      api.dataSources.value = [
        { sourceKey: 'NEW', sourceName: 'NEW', cacheStatus: readyStatus('NEW') },
      ]
      api.selectDataSource('NEW')
      expect(cancelCountRequest).toHaveBeenCalledWith('OLD')
      expect(api.selectedSourceKey.value).toBe('NEW')
      expect(api.countState.value.result).toBeNull()
      wrapper.unmount()
    })

    it('is a no-op when source is already selected', () => {
      const { api, wrapper } = mountComposable()
      api.selectedSourceKey.value = 'A'
      api.selectDataSource('A')
      expect(cancelCountRequest).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })

  describe('getPatientCount / getPatientCountImmediate', () => {
    it('errors when no source is selected', () => {
      const { api, wrapper } = mountComposable()
      api.getPatientCount({})
      expect(api.countError.value).toBe('Please select a data source')
      wrapper.unmount()
    })

    it('errors on immediate when no source is selected', async () => {
      const { api, wrapper } = mountComposable()
      await api.getPatientCountImmediate({})
      expect(api.countError.value).toBe('Please select a data source')
      wrapper.unmount()
    })

    it('errors when cache is not ready', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: notBuiltStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      await api.getPatientCountImmediate({})
      expect(api.countError.value).toBe('Cache not ready. Please build the cache first.')
      expect(getPatientCount).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('fetches and stores result on success', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(getPatientCount).mockResolvedValue({
        cohortPatientCount: 10,
        totalPatientCount: 100,
        executionTimeMs: 7,
      })

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      await api.getPatientCountImmediate({ foo: 'bar' })
      expect(getPatientCount).toHaveBeenCalledWith('A', { foo: 'bar' })
      expect(api.countState.value.result?.cohortPatientCount).toBe(10)
      expect(api.isCountLoading.value).toBe(false)
      wrapper.unmount()
    })

    it('captures non-abort errors and exposes them via countError', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(getPatientCount).mockRejectedValue(new Error('Server down'))

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      await api.getPatientCountImmediate({})
      expect(api.countError.value).toBe('Server down')
      expect(api.countState.value.error).toBe('Server down')
      wrapper.unmount()
    })

    it('falls back to generic message when error is not an Error instance', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(getPatientCount).mockRejectedValue('weird')

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      await api.getPatientCountImmediate({})
      expect(api.countError.value).toBe('Failed to get patient count')
      wrapper.unmount()
    })

    it('silently aborts when error is AbortError', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      const abortErr = new Error('aborted')
      abortErr.name = 'AbortError'
      vi.mocked(getPatientCount).mockRejectedValue(abortErr)

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      await api.getPatientCountImmediate({})
      // AbortError should not surface as a user-visible error
      expect(api.countError.value).toBeNull()
      wrapper.unmount()
    })

    it('debounced getPatientCount triggers after wait', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(getPatientCount).mockResolvedValue({
        cohortPatientCount: 1,
        totalPatientCount: 1,
        executionTimeMs: 1,
      })

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      api.getPatientCount({ q: 1 })
      expect(getPatientCount).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(600)
      expect(getPatientCount).toHaveBeenCalled()
      wrapper.unmount()
    })

    it('isCountSlow flips on after 5s of loading', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      let resolveCount: (value: { cohortPatientCount: number; totalPatientCount: number; executionTimeMs: number }) => void = () => {}
      vi.mocked(getPatientCount).mockImplementation(
        () =>
          new Promise(res => {
            resolveCount = res
          })
      )

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'

      const promise = api.getPatientCountImmediate({})
      // advance the slow-count timer
      await vi.advanceTimersByTimeAsync(5500)
      expect(api.isCountSlow.value).toBe(true)

      resolveCount({ cohortPatientCount: 1, totalPatientCount: 1, executionTimeMs: 1 })
      await promise
      expect(api.isCountSlow.value).toBe(false)
      wrapper.unmount()
    })
  })

  describe('cancel/clear/retry', () => {
    it('cancelCount cancels in-flight requests for selected source', () => {
      const { api, wrapper } = mountComposable()
      api.selectedSourceKey.value = 'A'
      api.cancelCount()
      expect(cancelCountRequest).toHaveBeenCalledWith('A')
      expect(api.isCountLoading.value).toBe(false)
      wrapper.unmount()
    })

    it('cancelCount with no selected source still resets loading flags', () => {
      const { api, wrapper } = mountComposable()
      api.cancelCount()
      expect(api.isCountLoading.value).toBe(false)
      wrapper.unmount()
    })

    it('clearCount resets result and error', () => {
      const { api, wrapper } = mountComposable()
      api.countState.value.result = {
        cohortPatientCount: 1,
        totalPatientCount: 1,
        executionTimeMs: 1,
      }
      api.countError.value = 'some error'
      api.clearCount()
      expect(api.countState.value.result).toBeNull()
      expect(api.countError.value).toBeNull()
      wrapper.unmount()
    })

    it('retryCount clears error and re-issues', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: true,
      } as never

      vi.mocked(getPatientCount).mockResolvedValue({
        cohortPatientCount: 1,
        totalPatientCount: 1,
        executionTimeMs: 1,
      })

      const { api, wrapper } = mountComposable()
      api.dataSources.value = [
        { sourceKey: 'A', sourceName: 'A', cacheStatus: readyStatus('A') },
      ]
      api.selectedSourceKey.value = 'A'
      api.countError.value = 'previous'

      api.retryCount({})
      expect(api.countError.value).toBeNull()
      await vi.advanceTimersByTimeAsync(600)
      expect(getPatientCount).toHaveBeenCalled()
      wrapper.unmount()
    })
  })

  describe('initialize / detectTrexSQLAvailability', () => {
    it('detects TrexSQL availability from first source', async () => {
      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'A', sourceName: 'A' },
      ] as never)
      vi.mocked(getCacheStatus).mockResolvedValue(readyStatus('A'))

      const { api, wrapper } = mountComposable()
      await api.initialize()
      expect(api.isTrexSQLEnabled.value).toBe(true)
      wrapper.unmount()
    })

    it('marks unavailable when getCacheStatus throws', async () => {
      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'A', sourceName: 'A' },
      ] as never)
      vi.mocked(getCacheStatus).mockRejectedValue(new Error('fail'))

      const { api, wrapper } = mountComposable()
      await api.initialize()
      expect(api.isTrexSQLEnabled.value).toBe(false)
      wrapper.unmount()
    })

    it('marks unavailable when no data sources are returned', async () => {
      vi.mocked(listDataSources).mockResolvedValue([] as never)

      const { api, wrapper } = mountComposable()
      await api.initialize()
      expect(api.isTrexSQLEnabled.value).toBe(false)
      wrapper.unmount()
    })

    it('marks unavailable when listDataSources throws', async () => {
      vi.mocked(listDataSources).mockRejectedValue(new Error('boom'))

      const { api, wrapper } = mountComposable()
      await api.initialize()
      expect(api.isTrexSQLEnabled.value).toBe(false)
      wrapper.unmount()
    })

    it('skips detection when user has explicit setting', async () => {
      const auth = useAuthStore()
      auth.user = {
        login: 'a',
        displayName: 'A',
        permissionIdx: {},
        trexsqlCacheEnabled: false,
      } as never

      const { api, wrapper } = mountComposable()
      await api.initialize()
      expect(listDataSources).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })

  describe('cleanup on unmount', () => {
    it('cancels all count requests on unmount', () => {
      const { wrapper } = mountComposable()
      wrapper.unmount()
      expect(cancelAllCountRequests).toHaveBeenCalled()
    })
  })
})
