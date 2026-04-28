/**
 * Unit tests for useIncidenceRateBuilder composable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/services/webapi', () => ({
  createIncidenceRate: vi.fn(),
  saveIncidenceRate: vi.fn(),
  copyIncidenceRate: vi.fn(),
  deleteIncidenceRate: vi.fn(),
  existsIncidenceRate: vi.fn(),
  // Also referenced indirectly by store imports
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

import { useIncidenceRateBuilder } from '@/composables/useIncidenceRateBuilder'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import * as webapi from '@/services/webapi'
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
      // IR missing name and target/outcome ids — will fail validation
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
      expect(feedback.value).toEqual({
        message: 'Cannot save — fix validation errors first',
        color: 'error',
      })
    })

    it('returns false and notifies if name is taken', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue(1)

      const { save, feedback } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(false)
      expect(feedback.value).toMatchObject({ color: 'error' })
      expect(webapi.existsIncidenceRate).toHaveBeenCalledWith('Test IR', 0)
    })

    it('creates a new IR when no id is set', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR())

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue(0)
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

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue(0)
      vi.mocked(webapi.saveIncidenceRate).mockResolvedValue({
        success: true,
        data: { ...ir },
      })

      const { save } = useIncidenceRateBuilder()
      const ok = await save()

      expect(ok).toBe(true)
      expect(webapi.saveIncidenceRate).toHaveBeenCalledWith(5, expect.any(Object))
      expect(webapi.createIncidenceRate).not.toHaveBeenCalled()
      // id unchanged → no router push
      expect(pushMock).not.toHaveBeenCalled()
    })

    it('returns false and surfaces error when save fails', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))

      vi.mocked(webapi.existsIncidenceRate).mockResolvedValue(0)
      vi.mocked(webapi.saveIncidenceRate).mockResolvedValue({
        success: false,
        error: 'Server error',
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
        error: 'Bad copy',
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
      vi.mocked(webapi.deleteIncidenceRate).mockResolvedValue(false)

      const { remove, feedback } = useIncidenceRateBuilder()
      const ok = await remove()

      expect(ok).toBe(false)
      expect(feedback.value).toEqual({ message: 'Delete failed', color: 'error' })
    })

    it('deletes and navigates to listing on success', async () => {
      const store = useIncidenceRateStore()
      store.setIR(makeValidIR({ id: 5 }))
      vi.mocked(webapi.deleteIncidenceRate).mockResolvedValue(true)

      const { remove, feedback } = useIncidenceRateBuilder()
      const ok = await remove()

      expect(ok).toBe(true)
      expect(webapi.deleteIncidenceRate).toHaveBeenCalledWith(5)
      expect(pushMock).toHaveBeenCalledWith('/incidence-rates')
      expect(feedback.value).toEqual({ message: 'Deleted', color: 'success' })
    })
  })
})
