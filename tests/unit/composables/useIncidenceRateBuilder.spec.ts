import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ApiError } from '@/services/api-error'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/services/incidence-rate.service', () => ({
  createIncidenceRate: vi.fn(),
  saveIncidenceRate: vi.fn(),
  copyIncidenceRate: vi.fn(),
  deleteIncidenceRate: vi.fn(),
  existsIncidenceRate: vi.fn(),
  getIncidenceRate: vi.fn(),
  assignIncidenceRateTag: vi.fn(),
  unassignIncidenceRateTag: vi.fn(),
}))

vi.mock('@/services/incidence-rate-versions.service', () => ({
  getIncidenceRateVersion: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

let webapi: typeof import('@/services/incidence-rate.service')
let useIncidenceRateBuilder: typeof import('@/composables/useIncidenceRateBuilder').useIncidenceRateBuilder
let useIncidenceRateStore: typeof import('@/stores/incidence-rate').useIncidenceRateStore

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/incidence-rate.service')
  ;({ useIncidenceRateBuilder } = await import('@/composables/useIncidenceRateBuilder'))
  ;({ useIncidenceRateStore } = await import('@/stores/incidence-rate'))
})

import type { IncidenceRate } from '@/models/incidence-rate.types'

function makeValidIR(overrides: Partial<IncidenceRate> = {}): IncidenceRate {
  return {
    name: 'Test IR',
    description: 'Test description',
    expression: {
      ConceptSets: [],
      targetIds: [1],
      outcomeIds: [2],
      timeAtRisk: {
        start: { DateField: 'StartDate', Offset: 0 },
        end: { DateField: 'EndDate', Offset: 0 },
      },
      strata: [],
    },
    tags: [],
    ...overrides,
  }
}

describe('useIncidenceRateBuilder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pushMock.mockClear()
    vi.clearAllMocks()
  })

  describe('save', () => {
    it('returns false when there is no current IR', async () => {
      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()
      expect(ok).toBe(false)
      expect(feedback.value).toBeNull()
    })

    it('returns false and notifies error when validation fails', async () => {
      const store = useIncidenceRateStore()
      store.setIR({
        name: '',
        description: '',
        expression: {
          ConceptSets: [],
          targetIds: [],
          outcomeIds: [],
          timeAtRisk: {
            start: { DateField: 'StartDate', Offset: 0 },
            end: { DateField: 'EndDate', Offset: 0 },
          },
          strata: [],
        },
        tags: [],
      })

      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(false)
      expect(feedback.value?.color).toBe('error')
      expect(feedback.value?.message).toMatch(/^Cannot save/)
    })

    it('returns false and notifies if name is taken', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue({ success: true, data: 1 })

      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(false)
      expect(feedback.value).toMatchObject({ color: 'error' })
      expect(webapi.existsIncidenceRate).toHaveBeenCalledWith('Test IR', 0)
    })

    it('still saves when the uniqueness check itself fails', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue({
        success: false,
        error: new ApiError('Server error', 500, null),
      })
      vi.mocked(webapi.createIncidenceRate).mockResolvedValue({
        success: true,
        data: { ...makeValidIR(), id: 99 },
      })

      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(true)
      expect(feedback.value?.color).toBe('success')
      expect(webapi.createIncidenceRate).toHaveBeenCalled()
    })

    it('creates a new IR when no id is set', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue({ success: true, data: 0 })
      vi.mocked(webapi.createIncidenceRate).mockResolvedValue({
        success: true,
        data: { ...makeValidIR(), id: 99 },
      })

      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(true)
      expect(webapi.createIncidenceRate).toHaveBeenCalled()
      expect(webapi.saveIncidenceRate).not.toHaveBeenCalled()
      expect(store.currentIR?.id).toBe(99)
      expect(pushMock).toHaveBeenCalledWith('/incidence-rates/99')
      expect(feedback.value).toEqual({ message: 'Saved', color: 'success' })
    })

    it('updates existing IR when id is set and does not navigate when id unchanged', async () => {
      const store = useIncidenceRateStore()
      const ir = makeValidIR({ id: 5 })
      store.setIR(ir)

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue({ success: true, data: 0 })
      vi.mocked(webapi.saveIncidenceRate).mockResolvedValue({
        success: true,
        data: { ...ir },
      })

      const { save } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(true)
      expect(webapi.saveIncidenceRate).toHaveBeenCalledWith(5, expect.any(Object))
      expect(webapi.createIncidenceRate).not.toHaveBeenCalled()
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('returns false and surfaces error when save fails', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue({ success: true, data: 0 })
      vi.mocked(webapi.saveIncidenceRate).mockResolvedValue({
        success: false,
        error: new ApiError('Server error', 0, null),
      })

      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(false)
      expect(feedback.value).toEqual({ message: 'Server error', color: 'error' })
    })
  })

  describe('copy', () => {
    it('returns false when there is no current IR', async () => {
      const { copy } = useIncidenceRateBuilder()
      expect(await copy()).toBe(false)
    })

    it('returns false when current IR has no id', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())
      const { copy } = useIncidenceRateBuilder()
      expect(await copy()).toBe(false)
    })

    it('returns false and notifies when copy fails', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))
      vi.mocked(webapi.copyIncidenceRate).mockResolvedValue({
        success: false,
        error: new ApiError('Bad copy', 0, null),
      })

      const { copy, feedback } = useIncidenceRateBuilder()
      const ok = await copy()

      expect(ok).toBe(false)
      expect(feedback.value).toEqual({ message: 'Bad copy', color: 'error' })
    })

    it('copies and navigates to new IR id', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))
      vi.mocked(webapi.copyIncidenceRate).mockResolvedValue({
        success: true,
        data: makeValidIR({ id: 12 }),
      })

      const { copy, feedback } = useIncidenceRateBuilder()
      const ok = await copy()

      expect(ok).toBe(true)
      expect(webapi.copyIncidenceRate).toHaveBeenCalledWith(5)
      expect(pushMock).toHaveBeenCalledWith('/incidence-rates/12')
      expect(feedback.value).toEqual({ message: 'Copied', color: 'success' })
    })

    it('does not carry the source design\'s execution info into the copy (#293)', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))
      store.setExecutionInfo('SynPUF5', {
        executionInfo: {
          id: { sourceId: 1, analysisId: 5 },
          status: 'COMPLETE',
          startTime: Date.now(),
        },
      } as never)
      store.setSelectedTargetOutcome(1, 2)
      expect(store.executions.length).toBe(1)

      vi.mocked(webapi.copyIncidenceRate).mockResolvedValue({
        success: true,
        data: makeValidIR({ id: 12 }),
      })

      const { copy } = useIncidenceRateBuilder()
      await copy()

      expect(store.executions).toEqual([])
      expect(store.selectedTargetId).toBeNull()
      expect(store.selectedOutcomeId).toBeNull()
    })
  })

  describe('remove', () => {
    it('returns false when there is no current IR', async () => {
      const { remove } = useIncidenceRateBuilder()
      expect(await remove()).toBe(false)
    })

    it('returns false when current IR has no id', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())
      const { remove } = useIncidenceRateBuilder()
      expect(await remove()).toBe(false)
    })

    it('returns false and notifies when delete fails', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))
      vi.mocked(webapi.deleteIncidenceRate).mockResolvedValue({
        success: false,
        error: new ApiError('conflict', 409, null),
      })

      const { remove, feedback } = useIncidenceRateBuilder()
      const ok = await remove()

      expect(ok).toBe(false)
      expect(feedback.value).toEqual({ message: 'Delete failed: conflict', color: 'error' })
    })

    it('deletes and navigates to listing on success', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))
      vi.mocked(webapi.deleteIncidenceRate).mockResolvedValue({ success: true, data: undefined })

      const { remove, feedback } = useIncidenceRateBuilder()
      const ok = await remove()

      expect(ok).toBe(true)
      expect(webapi.deleteIncidenceRate).toHaveBeenCalledWith(5)
      expect(pushMock).toHaveBeenCalledWith('/incidence-rates')
      expect(feedback.value).toEqual({ message: 'Deleted', color: 'success' })
    })
  })
})
