import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { CDMSource } from '@/models/webapi.types'
import { useWebAPIStore } from '@/stores/webapi'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import { getAuthConfig, setAuthConfig } from '@/config/auth.config'
import * as sourceService from '@/services/source.service'

vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn(),
}))

vi.mock('@/services/cohort-definition.service', () => ({
  generateCohort: vi.fn(),
  getCohortGenerationInfo: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function source(id: number, key: string, priority: number): CDMSource {
  const daimon = (daimonType: string, n: number) => ({
    sourceDaimonId: id * 10 + n,
    daimonType,
    tableQualifier: key,
    priority,
  })
  return {
    sourceId: id,
    sourceKey: key,
    sourceName: key,
    sourceDialect: 'postgresql',
    daimons: [daimon('Vocabulary', 1), daimon('CEM', 2), daimon('Results', 3)],
  }
}

// HIGH outranks LOW on every daimon but is only readable when granted.
const HIGH = source(1, 'HIGH', 1)
const LOW = source(2, 'LOW', 0)

function setUser(opts: {
  login?: string
  permissionIdx?: Record<string, string[]>
  source?: Record<string, string[]>
}) {
  useAuthStore().setUser({
    login: opts.login ?? 'u',
    displayName: 'u',
    permissionIdx: opts.permissionIdx ?? {},
    entityAccess: { ...emptyEntityAccess(), source: opts.source ?? {} },
  })
}

describe('WebAPI store source access', () => {
  let prevAuthEnabled: boolean

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(sourceService.fetchCDMSources).mockResolvedValue({
      success: true,
      data: [HIGH, LOW],
    } as Awaited<ReturnType<typeof sourceService.fetchCDMSources>>)
    prevAuthEnabled = getAuthConfig().userAuthenticationEnabled
    setAuthConfig({ userAuthenticationEnabled: true })
  })

  afterEach(() => {
    setAuthConfig({ userAuthenticationEnabled: prevAuthEnabled })
    localStorage.clear()
  })

  describe('defaults from readable sources only', () => {
    it('skips a higher-priority source the user cannot read', () => {
      setUser({ source: { '2': ['READ'] } })
      const store = useWebAPIStore()

      store.setSources([HIGH, LOW])

      expect(store.getValidVocabularySource()).toBe('LOW')
      expect(store.selectedSource).toBe('LOW')
    })

    it('uses the highest priority when every source is readable', () => {
      setUser({ permissionIdx: { read: ['read:source'] } })
      const store = useWebAPIStore()

      store.setSources([LOW, HIGH])

      expect(store.getValidVocabularySource()).toBe('HIGH')
      expect(store.selectedSource).toBe('HIGH')
    })

    it('treats a WRITE grant as read access', () => {
      setUser({ source: { '1': ['WRITE'] } })
      const store = useWebAPIStore()

      store.setSources([HIGH, LOW])

      expect(store.getValidVocabularySource()).toBe('HIGH')
    })

    it('treats a parent write permission as read access', () => {
      setUser({ permissionIdx: { write: ['write'] } })
      const store = useWebAPIStore()

      store.setSources([LOW, HIGH])

      expect(store.getValidVocabularySource()).toBe('HIGH')
    })

    it('does not treat admin:source as read access', () => {
      setUser({ permissionIdx: { admin: ['admin:source'] } })
      const store = useWebAPIStore()

      store.setSources([HIGH, LOW])

      expect(store.getValidVocabularySource()).toBeNull()
      expect(store.selectedSource).toBeNull()
      expect(store.vocabularySources).toEqual([])
      expect(store.resultsSources).toEqual([])
    })

    it('replaces a stored vocabulary the user cannot read', () => {
      setUser({ source: { '2': ['READ'] } })
      localStorage.setItem('selectedVocabulary', 'HIGH')
      const store = useWebAPIStore()

      store.setSources([HIGH, LOW])

      expect(store.getValidVocabularySource()).toBe('LOW')
      expect(localStorage.getItem('selectedVocabulary')).toBe('LOW')
    })
  })

  describe('reconciling stored selections', () => {
    it('removes stored selections that are unreadable and keeps readable ones', () => {
      setUser({ source: { '2': ['READ'] } })
      localStorage.setItem('selectedVocabulary', 'HIGH')
      localStorage.setItem('selectedEvidence', 'LOW')
      localStorage.setItem('selectedResults', 'GONE')
      const store = useWebAPIStore()

      store.setSources([HIGH, LOW])

      expect(localStorage.getItem('selectedVocabulary')).toBeNull()
      expect(localStorage.getItem('selectedEvidence')).toBe('LOW')
      expect(localStorage.getItem('selectedResults')).toBeNull()
    })

    it('keeps the user choices when the fetched list is empty', () => {
      setUser({ source: { '2': ['READ'] } })
      localStorage.setItem('selectedVocabulary', 'LOW')
      const store = useWebAPIStore()
      store.setSources([HIGH, LOW])

      store.setSources([])

      expect(localStorage.getItem('selectedVocabulary')).toBe('LOW')
      expect(store.selectedSource).toBe('LOW')
    })

    it('re-selects when the selected source is no longer readable', () => {
      setUser({ permissionIdx: { read: ['read:source'] } })
      const store = useWebAPIStore()
      store.setSources([HIGH, LOW])
      expect(store.selectedSource).toBe('HIGH')

      setUser({ source: { '2': ['READ'] } })
      store.setSources([HIGH, LOW])

      expect(store.selectedSource).toBe('LOW')
    })
  })

  describe('refreshing sources when access changes', () => {
    async function readyStore() {
      setUser({ permissionIdx: { read: ['read:source'] } })
      const store = useWebAPIStore()
      store.setSources([HIGH, LOW])
      localStorage.setItem('selectedVocabulary', 'HIGH')
      await nextTick()
      vi.mocked(sourceService.fetchCDMSources).mockClear()
      return store
    }

    it('fetches again when a selected source loses read access', async () => {
      await readyStore()

      setUser({ source: { '2': ['READ'] } })
      await nextTick()

      expect(sourceService.fetchCDMSources).toHaveBeenCalledTimes(1)
    })

    it('does not fetch when the refreshed permissions keep read access', async () => {
      await readyStore()

      setUser({ permissionIdx: { read: ['read:source'] } })
      await nextTick()

      expect(sourceService.fetchCDMSources).not.toHaveBeenCalled()
    })

    it('does not fetch when only an unselected source loses access', async () => {
      setUser({ source: { '1': ['READ'], '2': ['READ'] } })
      const store = useWebAPIStore()
      store.setSources([HIGH, LOW])
      localStorage.setItem('selectedVocabulary', 'HIGH')
      await nextTick()
      vi.mocked(sourceService.fetchCDMSources).mockClear()

      setUser({ source: { '1': ['READ'] } })
      await nextTick()

      expect(sourceService.fetchCDMSources).not.toHaveBeenCalled()
    })

    it('fetches again when the login changes, even with the same access', async () => {
      await readyStore()

      setUser({ login: 'other', permissionIdx: { read: ['read:source'] } })
      await nextTick()

      expect(sourceService.fetchCDMSources).toHaveBeenCalledTimes(1)
    })

    it('re-selects from the refetched list once access is lost', async () => {
      const store = await readyStore()
      expect(store.selectedSource).toBe('HIGH')

      setUser({ source: { '2': ['READ'] } })
      await nextTick()
      await vi.waitFor(() => expect(store.selectedSource).toBe('LOW'))

      expect(localStorage.getItem('selectedVocabulary')).toBeNull()
      expect(store.getValidVocabularySource()).toBe('LOW')
    })
  })
})
