import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { usePersonProfile } from '@/composables/usePersonProfile'

vi.mock('@/services/profile.service', () => ({
  getPerson: vi.fn().mockResolvedValue({ success: true, data: {
    gender: 'MALE', yearOfBirth: 1970, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 50, recordCount: 0,
    records: [], cohorts: [], observationPeriods: [],
  }}),
  getCohortConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('usePersonProfile', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('loads when route has source+personId', async () => {
    const params = ref<{ sourceKey?: string; personId?: string; cohortId?: string }>({
      sourceKey: 'SYNPUF', personId: '7',
    })
    usePersonProfile(params)
    await new Promise(r => setTimeout(r, 0))
    const { getPerson } = await import('@/services/profile.service')
    expect(getPerson).toHaveBeenCalledWith('SYNPUF', 7, undefined)
  })

  it('does not load when personId missing', async () => {
    const params = ref<{ sourceKey?: string; personId?: string; cohortId?: string }>({ sourceKey: 'SYNPUF' })
    usePersonProfile(params)
    await new Promise(r => setTimeout(r, 0))
    const { getPerson } = await import('@/services/profile.service')
    expect(getPerson).not.toHaveBeenCalled()
  })
})
