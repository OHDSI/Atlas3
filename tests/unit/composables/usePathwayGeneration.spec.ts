import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi')

let webapi: typeof import('@/services/webapi')
let usePathwayGeneration: typeof import('@/composables/usePathwayGeneration').usePathwayGeneration

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/webapi')
  ;({ usePathwayGeneration } = await import('@/composables/usePathwayGeneration'))
})

describe('usePathwayGeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('start triggers POST and begins polling', async () => {
    vi.mocked(webapi.generatePathway).mockResolvedValue({
      success: true, data: { id: 1, status: 'STARTING', sourceKey: 'cdm' },
    })
    vi.mocked(webapi.getPathwayExecution).mockResolvedValue({
      success: true, data: { id: 1, status: 'STARTED', sourceKey: 'cdm' },
    })
    const gen = usePathwayGeneration(10)
    await gen.start('cdm')
    expect(webapi.generatePathway).toHaveBeenCalledWith(10, 'cdm')
    await vi.advanceTimersByTimeAsync(5000)
    expect(webapi.getPathwayExecution).toHaveBeenCalled()
  })

  it('stops polling when terminal status reached', async () => {
    vi.mocked(webapi.generatePathway).mockResolvedValue({
      success: true, data: { id: 7, status: 'STARTING', sourceKey: 'cdm' },
    })
    vi.mocked(webapi.getPathwayExecution).mockResolvedValue({
      success: true, data: { id: 7, status: 'COMPLETED', sourceKey: 'cdm' },
    })
    const gen = usePathwayGeneration(10)
    await gen.start('cdm')
    await vi.advanceTimersByTimeAsync(5000)
    const callsBefore = vi.mocked(webapi.getPathwayExecution).mock.calls.length
    await vi.advanceTimersByTimeAsync(15000)
    const callsAfter = vi.mocked(webapi.getPathwayExecution).mock.calls.length
    expect(callsAfter).toBe(callsBefore)
    expect(gen.execution.value?.status).toBe('COMPLETED')
  })

  it('cancel calls cancelPathwayGeneration and stops polling', async () => {
    vi.mocked(webapi.cancelPathwayGeneration).mockResolvedValue({ success: true, data: undefined })
    const gen = usePathwayGeneration(10)
    const ok = await gen.cancel('cdm')
    expect(webapi.cancelPathwayGeneration).toHaveBeenCalledWith(10, 'cdm')
    expect(ok).toBe(true)
  })

  it('cancel surfaces the failure reason instead of a bare false', async () => {
    vi.mocked(webapi.cancelPathwayGeneration).mockResolvedValue({
      success: false,
      error: { message: 'generation already finished' } as never,
    })
    const gen = usePathwayGeneration(10)
    const ok = await gen.cancel('cdm')
    expect(ok).toBe(false)
    expect(gen.error.value).toBe('generation already finished')
  })
})
