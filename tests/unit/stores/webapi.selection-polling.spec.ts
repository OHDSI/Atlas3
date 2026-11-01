import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import type { CDMSource, CohortGenerationInfo, GenerationJob } from '@/models/webapi.types'
import { success } from '@/types/api'
import { useWebAPIStore } from '@/stores/webapi'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import { getAuthConfig, setAuthConfig } from '@/config/auth.config'
import * as cohortDefService from '@/services/cohort-definition.service'
import * as sourceService from '@/services/source.service'
import { logger } from '@/utils/logger'

vi.mock('@/services/cohort-definition.service', () => ({
  cancelCohortGeneration: vi.fn(),
  generateCohort: vi.fn(),
  getCohortGenerationInfo: vi.fn(),
}))

vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function src(id: number, key: string, daimons: Array<[string, number?]>): CDMSource {
  return {
    sourceId: id,
    sourceKey: key,
    sourceName: key,
    sourceDialect: 'postgresql',
    daimons: daimons.map(([daimonType, priority], i) => ({
      sourceDaimonId: id * 10 + i,
      daimonType,
      tableQualifier: key,
      priority,
    })),
  }
}

const bare = (id: number, key: string) =>
  ({ sourceId: id, sourceKey: key, sourceName: key, sourceDialect: 'x' }) as unknown as CDMSource

const job = (overrides: Partial<GenerationJob> = {}): GenerationJob => ({
  id: 5,
  cohortDefinitionId: 123,
  sourceKey: 'A',
  status: 'RUNNING',
  ...overrides,
})

const info = (sourceId: number, overrides: Partial<CohortGenerationInfo> = {}): CohortGenerationInfo => ({
  id: { cohortDefinitionId: 123, sourceId },
  status: 'RUNNING',
  ...overrides,
})

const infoCalls = () => vi.mocked(cohortDefService.getCohortGenerationInfo).mock.calls.length

describe('WebAPI store source selection and generation polling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('registers under the "webapi" store id', () => {
    expect(useWebAPIStore().$id).toBe('webapi')
  })

  describe('daimon-filtered source lists', () => {
    it('lists a source under every daimon type it carries', () => {
      const store = useWebAPIStore()
      store.setSources([
        src(1, 'BOTH', [['Vocabulary', 1], ['Results', 1]]),
        src(2, 'VOCAB', [['Vocabulary', 1]]),
        src(3, 'RES', [['Results', 1]]),
        src(4, 'CDM', [['CDM', 1]]),
        bare(5, 'BARE'),
      ])

      expect(store.vocabularySources.map(s => s.sourceKey)).toEqual(['BOTH', 'VOCAB'])
      expect(store.resultsSources.map(s => s.sourceKey)).toEqual(['BOTH', 'RES'])
    })
  })

  describe('getValidVocabularySource', () => {
    const sources = () => [src(1, 'HIGH', [['Vocabulary', 5]]), src(2, 'LOW', [['Vocabulary', 1]])]

    it('honours a stored vocabulary that is not the priority default', () => {
      const store = useWebAPIStore()
      store.setSources(sources())
      localStorage.setItem('selectedVocabulary', 'LOW')

      expect(store.getValidVocabularySource()).toBe('LOW')
      expect(localStorage.getItem('selectedVocabulary')).toBe('LOW')
    })

    it('falls back to the priority default and persists it when nothing is stored', () => {
      const store = useWebAPIStore()
      store.setSources(sources())

      expect(store.getValidVocabularySource()).toBe('HIGH')
      expect(localStorage.getItem('selectedVocabulary')).toBe('HIGH')
    })

    it.each(['', '   ', 'null', 'undefined'])(
      'treats the stored placeholder %j as no selection',
      (stored) => {
        const store = useWebAPIStore()
        store.setSources(sources())
        localStorage.setItem('selectedVocabulary', stored)

        expect(store.getValidVocabularySource()).toBe('HIGH')
        expect(logger.warn).not.toHaveBeenCalled()
      }
    )

    it('warns and replaces a stored key that names no vocabulary source', () => {
      const store = useWebAPIStore()
      store.setSources([...sources(), src(3, 'RES', [['Results', 1]])])
      localStorage.setItem('selectedVocabulary', 'RES')

      expect(store.getValidVocabularySource()).toBe('HIGH')
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('selectedVocabulary')).toBe('HIGH')
    })
  })

  describe('priority defaults', () => {
    it('ranks a source by its best daimon of the requested type only', () => {
      const store = useWebAPIStore()
      store.setSources([
        src(1, 'VOCABHEAVY', [['Vocabulary', 9], ['Results', 0]]),
        src(2, 'MULTI', [['Results', 0], ['Results', 5]]),
        src(3, 'MID', [['Results', 3]]),
      ])

      expect(store.getValidResultsSource()).toBe('MULTI')
      expect(store.selectedSource).toBe('MULTI')
    })

    it('keeps list order on equal priority', () => {
      const store = useWebAPIStore()
      store.setSources([src(1, 'FIRST', [['Results', 2]]), src(2, 'SECOND', [['Results', 2]])])

      expect(store.getValidResultsSource()).toBe('FIRST')
      expect(store.getValidVocabularySource()).toBeNull()
    })
  })

  describe('reconciling stored selections by daimon type', () => {
    it('drops a stored selection whose source lacks the matching daimon', () => {
      localStorage.setItem('selectedVocabulary', 'RES')
      localStorage.setItem('selectedEvidence', 'RES')
      localStorage.setItem('selectedResults', 'VOCAB')
      const store = useWebAPIStore()

      store.setSources([src(1, 'RES', [['Results', 1]]), src(2, 'VOCAB', [['Vocabulary', 1]])])

      expect(localStorage.getItem('selectedVocabulary')).toBeNull()
      expect(localStorage.getItem('selectedEvidence')).toBeNull()
      expect(localStorage.getItem('selectedResults')).toBeNull()
    })

    it('keeps stored selections whose source carries the matching daimon', () => {
      localStorage.setItem('selectedVocabulary', 'ALL')
      localStorage.setItem('selectedEvidence', 'ALL')
      localStorage.setItem('selectedResults', 'ALL')
      const store = useWebAPIStore()

      store.setSources([src(1, 'ALL', [['Vocabulary', 1], ['CEM', 1], ['Results', 1]])])

      expect(localStorage.getItem('selectedVocabulary')).toBe('ALL')
      expect(localStorage.getItem('selectedEvidence')).toBe('ALL')
      expect(localStorage.getItem('selectedResults')).toBe('ALL')
    })

    it('drops a stored selection pointing at a source without daimon details', () => {
      localStorage.setItem('selectedVocabulary', 'BARE')
      const store = useWebAPIStore()

      store.setSources([bare(1, 'BARE'), src(2, 'RES', [['Results', 1]])])

      expect(localStorage.getItem('selectedVocabulary')).toBeNull()
    })
  })

  describe('fetchSources', () => {
    it('clears the loaded sources when the request throws', async () => {
      const store = useWebAPIStore()
      store.setSources([src(1, 'A', [['Results', 1]])])
      vi.mocked(sourceService.fetchCDMSources).mockRejectedValue(new Error('down'))

      await store.fetchSources()

      expect(store.sources).toEqual([])
      expect(store.isLoadingSources).toBe(false)
    })
  })

  describe('refetching sources when access changes', () => {
    const HIGH = src(1, 'HIGH', [['Vocabulary', 1], ['CEM', 1], ['Results', 1]])
    const LOW = src(2, 'LOW', [['Vocabulary', 0], ['CEM', 0], ['Results', 0]])
    let prevAuthEnabled: boolean

    beforeEach(() => {
      prevAuthEnabled = getAuthConfig().userAuthenticationEnabled
      setAuthConfig({ userAuthenticationEnabled: true })
      vi.mocked(sourceService.fetchCDMSources).mockResolvedValue(success([HIGH, LOW]))
    })

    afterEach(() => {
      setAuthConfig({ userAuthenticationEnabled: prevAuthEnabled })
    })

    async function ready(storageKey: string | null, grants: Record<string, string[]>) {
      useAuthStore().setUser({
        login: 'u',
        displayName: 'u',
        permissionIdx: {},
        entityAccess: { ...emptyEntityAccess(), source: grants },
      })
      const store = useWebAPIStore()
      store.setSources([HIGH, LOW])
      store.setSelectedSource('LOW')
      if (storageKey) localStorage.setItem(storageKey, 'HIGH')
      await nextTick()
      vi.mocked(sourceService.fetchCDMSources).mockClear()
      return store
    }

    it.each(['selectedVocabulary', 'selectedEvidence', 'selectedResults'])(
      'refetches when the source stored under %s loses read access',
      async (storageKey) => {
        await ready(storageKey, { '1': ['READ'], '2': ['READ'] })

        useAuthStore().entityAccess = { ...emptyEntityAccess(), source: { '2': ['READ'] } }
        await nextTick()

        expect(sourceService.fetchCDMSources).toHaveBeenCalledTimes(1)
      }
    )

    it('refetches when only the permission index changes and access is lost', async () => {
      useAuthStore().setUser({
        login: 'u',
        displayName: 'u',
        permissionIdx: { read: ['read:source'] },
        entityAccess: emptyEntityAccess(),
      })
      const store = useWebAPIStore()
      store.setSources([HIGH, LOW])
      store.setSelectedSource('HIGH')
      await nextTick()
      vi.mocked(sourceService.fetchCDMSources).mockClear()

      useAuthStore().permissions = {}
      await nextTick()

      expect(sourceService.fetchCDMSources).toHaveBeenCalledTimes(1)
    })
  })

  describe('generateCohort job bookkeeping', () => {
    beforeEach(() => {
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success([]))
    })

    afterEach(() => {
      useWebAPIStore().stopAllPolling()
    })

    it('shows the job as PENDING under the source id while the request is in flight', async () => {
      const store = useWebAPIStore()
      store.setSources([src(5, 'A', [['Results', 1]]), src(6, 'B', [['Results', 1]])])
      let resolve!: (v: Awaited<ReturnType<typeof cohortDefService.generateCohort>>) => void
      vi.mocked(cohortDefService.generateCohort).mockImplementation(
        () => new Promise(r => { resolve = r })
      )

      const pending = store.generateCohort(123, 'B')

      expect(store.getJobById(6)).toMatchObject({
        id: 6,
        cohortDefinitionId: 123,
        sourceKey: 'B',
        status: 'PENDING',
      })
      expect(store.getJobById(6)?.startTime).toEqual(expect.any(String))
      expect(store.getJobById(5)).toBeUndefined()

      resolve(success(job({ id: 999, sourceKey: 'B', status: 'RUNNING' })))
      await pending
      expect(store.getJobById(6)).toMatchObject({ id: 6, sourceKey: 'B', status: 'RUNNING' })
    })

    it('keeps the earlier start time of an existing job while restarting it', () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ id: 7, sourceKey: 'A', status: 'COMPLETE', startTime: '2020-01-01T00:00:00.000Z' }))
      vi.mocked(cohortDefService.generateCohort).mockImplementation(() => new Promise(() => {}))

      void store.generateCohort(123, 'A')

      expect(store.getJobById(7)).toMatchObject({ status: 'PENDING', startTime: '2020-01-01T00:00:00.000Z' })
    })

    it('does not reuse the job of another source of the same cohort', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ id: 7, sourceKey: 'A', status: 'COMPLETE' }))
      vi.mocked(cohortDefService.generateCohort).mockResolvedValue(
        success(job({ id: 42, sourceKey: 'B', status: 'PENDING' }))
      )

      await store.generateCohort(123, 'B')

      expect(store.getJobById(7)?.status).toBe('COMPLETE')
      expect(store.getJobById(42)).toMatchObject({ sourceKey: 'B', cohortDefinitionId: 123 })
    })
  })

  describe('polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-06-01T00:00:00.000Z'))
    })

    afterEach(() => {
      useWebAPIStore().stopAllPolling()
      vi.useRealTimers()
    })

    const respond = (...list: CohortGenerationInfo[]) =>
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success(list))

    it('ignores info entries without a job, or with a job of another cohort', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ id: 5 }))
      store.addGenerationJob(job({ id: 6, cohortDefinitionId: 999, status: 'RUNNING' }))
      respond(info(5, { status: 'COMPLETE' }), info(6, { status: 'COMPLETE' }), info(8, { status: 'COMPLETE' }))

      await store.pollGenerationStatus(123)

      expect(store.getJobById(5)?.status).toBe('COMPLETE')
      expect(store.getJobById(6)).toMatchObject({ cohortDefinitionId: 999, status: 'RUNNING' })
      expect(store.getJobById(8)).toBeUndefined()
    })

    it('resolves the source key from the source with the matching id', async () => {
      const store = useWebAPIStore()
      store.setSources([src(5, 'A', [['Results', 1]]), src(6, 'B', [['Results', 1]])])
      store.addGenerationJob(job({ id: 6, sourceKey: 'stale' }))
      respond(info(6, { status: 'COMPLETE', personCount: 10, recordCount: 42 }))

      await store.pollGenerationStatus(123)

      expect(store.getJobById(6)).toMatchObject({ sourceKey: 'B', personCount: 10, recordCount: 42 })
    })

    it('stamps the current time as end time when only a duration is known', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      respond(info(5, { status: 'COMPLETE', executionDuration: 500 }))

      await store.pollGenerationStatus(123)

      expect(store.getJobById(5)?.endTime).toBe('2024-06-01T00:00:00.000Z')
    })

    it('applies a COMPLETE-but-invalid result when no cancellation was requested', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      respond(info(5, { status: 'COMPLETE', isValid: false, isCanceled: false }))

      await store.pollGenerationStatus(123)

      expect(store.getJobById(5)?.status).toBe('COMPLETE')
    })

    describe('after a cancellation request', () => {
      async function cancel(store: ReturnType<typeof useWebAPIStore>, sourceKey: string) {
        vi.mocked(cohortDefService.cancelCohortGeneration).mockResolvedValue(success(undefined))
        await store.cancelCohortGeneration(123, sourceKey)
        await vi.advanceTimersByTimeAsync(0)
      }

      it('holds back the provisional state only for the canceled source', async () => {
        const store = useWebAPIStore()
        store.addGenerationJob(job({ id: 5, sourceKey: 'A' }))
        store.addGenerationJob(job({ id: 6, sourceKey: 'B' }))
        respond(
          info(5, { status: 'COMPLETE', isValid: false, isCanceled: false }),
          info(6, { status: 'COMPLETE', isValid: false, isCanceled: false })
        )

        await cancel(store, 'B')

        expect(store.getJobById(5)?.status).toBe('COMPLETE')
        expect(store.getJobById(6)?.status).toBe('RUNNING')
      })

      it('applies a FAILED result immediately', async () => {
        const store = useWebAPIStore()
        store.addGenerationJob(job())
        respond(info(5, { status: 'FAILED', isValid: false, isCanceled: false }))

        await cancel(store, 'A')

        expect(store.getJobById(5)?.status).toBe('FAILED')
      })

      it('applies a valid COMPLETE result immediately', async () => {
        const store = useWebAPIStore()
        store.addGenerationJob(job())
        respond(info(5, { status: 'COMPLETE', isValid: true, isCanceled: false }))

        await cancel(store, 'A')

        expect(store.getJobById(5)?.status).toBe('COMPLETE')
      })

      it('keeps holding back the provisional state across active polls', async () => {
        const store = useWebAPIStore()
        store.addGenerationJob(job())
        respond(info(5, { status: 'RUNNING' }))
        await cancel(store, 'A')

        respond(info(5, { status: 'COMPLETE', isValid: false, isCanceled: false }))
        await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS)

        expect(store.getJobById(5)?.status).toBe('RUNNING')
      })

      it('forgets the request once the generation reaches a terminal state', async () => {
        const store = useWebAPIStore()
        store.addGenerationJob(job())
        respond(info(5, { status: 'COMPLETE', isCanceled: true }))
        await cancel(store, 'A')
        expect(store.getJobById(5)?.status).toBe('CANCELED')

        respond(info(5, { status: 'COMPLETE', isValid: false, isCanceled: false }))
        await store.pollGenerationStatus(123)

        expect(store.getJobById(5)?.status).toBe('COMPLETE')
      })
    })

    it('keeps polling while any job of the cohort is still active', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ id: 5 }))
      store.addGenerationJob(job({ id: 6 }))
      respond(info(5, { status: 'COMPLETE' }), info(6, { status: 'RUNNING' }))

      await store.pollGenerationStatus(123)
      expect(infoCalls()).toBe(1)

      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS)
      expect(infoCalls()).toBe(2)
    })

    it('stops polling once every job of the cohort is terminal', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      respond(info(5, { status: 'COMPLETE' }))

      await store.pollGenerationStatus(123)
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS * 3)

      expect(infoCalls()).toBe(1)
    })

    it('stops polling after the timeout instead of continuing forever', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      respond(info(5, { status: 'RUNNING' }))

      await store.pollGenerationStatus(123)
      await vi.advanceTimersByTimeAsync(store.POLL_TIMEOUT_MS + store.POLL_INTERVAL_MS)
      const callsAtTimeout = infoCalls()
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS * 5)

      expect(callsAtTimeout).toBeGreaterThan(100)
      expect(infoCalls()).toBe(callsAtTimeout)
    })

    it('replaces an earlier poller for the same cohort', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      respond(info(5, { status: 'RUNNING' }))

      await store.pollGenerationStatus(123)
      await store.pollGenerationStatus(123)
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS)

      expect(infoCalls()).toBe(3)
    })

    it('stopPolling halts the poller for that cohort', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      respond(info(5, { status: 'RUNNING' }))

      await store.pollGenerationStatus(123)
      store.stopPolling(123)
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS * 3)

      expect(infoCalls()).toBe(1)
    })

    it.each(['stopAllPolling', 'dispose'] as const)('%s halts every poller', async (method) => {
      const store = useWebAPIStore()
      store.addGenerationJob(job())
      store.addGenerationJob(job({ id: 6, cohortDefinitionId: 456 }))
      respond(info(5), { ...info(6), id: { cohortDefinitionId: 456, sourceId: 6 } })

      await store.pollGenerationStatus(123)
      await store.pollGenerationStatus(456)
      store[method]()
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS * 3)

      expect(infoCalls()).toBe(2)
    })
  })

  describe('fetchCohortGenerationInfo', () => {
    const SOURCES = [src(5, 'A', [['Results', 1]]), src(6, 'B', [['Results', 1]])]

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      useWebAPIStore().stopAllPolling()
      vi.useRealTimers()
    })

    it('converts every info entry whose source is known, skipping unknown ones', async () => {
      const store = useWebAPIStore()
      store.setSources(SOURCES)
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(
        success([
          info(77, { status: 'COMPLETE' }),
          info(6, {
            status: 'COMPLETE',
            isCanceled: true,
            startTime: 1000,
            executionDuration: 500,
            personCount: 3,
            recordCount: 4,
            failMessage: 'stopped',
          }),
        ])
      )

      await store.fetchCohortGenerationInfo(123)

      expect(store.getJobById(77)).toBeUndefined()
      expect(store.getJobById(6)).toEqual({
        id: 6,
        cohortDefinitionId: 123,
        sourceKey: 'B',
        status: 'CANCELED',
        startTime: new Date(1000).toISOString(),
        endTime: new Date(1500).toISOString(),
        personCount: 3,
        recordCount: 4,
        failMessage: 'stopped',
      })
    })

    it('does not start polling when the server returns no entries', async () => {
      const store = useWebAPIStore()
      store.setSources(SOURCES)
      store.addGenerationJob(job())
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success([]))

      await store.fetchCohortGenerationInfo(123)
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS * 2)

      expect(infoCalls()).toBe(1)
    })

    it('does not start polling when every generation is finished', async () => {
      const store = useWebAPIStore()
      store.setSources(SOURCES)
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(
        success([info(5, { status: 'COMPLETE' })])
      )

      await store.fetchCohortGenerationInfo(123)
      await vi.advanceTimersByTimeAsync(store.POLL_INTERVAL_MS * 2)

      expect(infoCalls()).toBe(1)
    })

    it('starts polling when one of several generations is still active', async () => {
      const store = useWebAPIStore()
      store.setSources(SOURCES)
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(
        success([info(5, { status: 'COMPLETE' }), info(6, { status: 'RUNNING' })])
      )

      await store.fetchCohortGenerationInfo(123)
      await vi.advanceTimersByTimeAsync(0)

      expect(infoCalls()).toBe(2)
    })

    it('swallows a thrown request', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockRejectedValue(new Error('down'))

      await expect(store.fetchCohortGenerationInfo(123)).resolves.toBeUndefined()
      expect(logger.error).toHaveBeenCalledTimes(1)
    })
  })
})
