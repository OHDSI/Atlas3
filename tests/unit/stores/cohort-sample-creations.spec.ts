import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/services/api-error'
import { success, failure, type ApiResult } from '@/types/api'
import type { CohortSample } from '@/models/cohort-sample.types'

vi.mock('@/services/cohort-sample.service', () => ({
  createCohortSample: vi.fn(),
}))

import { createCohortSample } from '@/services/cohort-sample.service'
import { useCohortSampleCreationsStore } from '@/stores/cohort-sample-creations'
import { useNotifications } from '@/stores/notifications'

const created: CohortSample = { id: 5, name: 'demo', size: 10 } as CohortSample

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}

describe('cohort-sample-creations store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('tracks a create as pending for its cohort and source until it settles', async () => {
    const pending = deferred<ApiResult<CohortSample>>()
    vi.mocked(createCohortSample).mockReturnValueOnce(pending.promise)
    const store = useCohortSampleCreationsStore()

    const run = store.create(1, 'EUNOMIA', { name: 'demo', size: 10 })

    expect(store.isPending(1, 'EUNOMIA')).toBe(true)
    expect(store.isPending(1, 'OTHER')).toBe(false)
    expect(store.isPending(2, 'EUNOMIA')).toBe(false)
    expect(store.pendingFor(1, 'EUNOMIA')).toEqual([
      expect.objectContaining({ cohortId: 1, sourceKey: 'EUNOMIA', name: 'demo', size: 10 }),
    ])

    pending.resolve(success(created))
    const result = await run

    expect(result.success).toBe(true)
    expect(store.isPending(1, 'EUNOMIA')).toBe(false)
    const note = useNotifications().items[0]
    expect(note?.severity).toBe('success')
    expect(note?.title).toBe('Sample "demo" created')
  })

  it('clears the pending entry and pushes a danger notification on failure', async () => {
    vi.mocked(createCohortSample).mockResolvedValueOnce(
      failure(new ApiError('cohort not generated', 400, null))
    )
    const store = useCohortSampleCreationsStore()

    const result = await store.create(1, 'EUNOMIA', { name: 'demo', size: 10 })

    expect(result.success).toBe(false)
    expect(store.pending).toEqual([])
    const note = useNotifications().items[0]
    expect(note?.severity).toBe('danger')
    expect(note?.title).toBe('Failed to create sample')
    expect(note?.message).toBe('cohort not generated')
  })

  it('clears the pending entry when the request throws', async () => {
    vi.mocked(createCohortSample).mockRejectedValueOnce(new Error('boom'))
    const store = useCohortSampleCreationsStore()

    await expect(store.create(1, 'EUNOMIA', { name: 'demo', size: 10 })).rejects.toThrow('boom')
    expect(store.pending).toEqual([])
  })
})
