import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCharacterizationResults } from '@/composables/useCharacterizationResults'

vi.mock('@/services/characterization.service', () => ({
  getCharacterizationExecution: vi.fn(),
  getCharacterizationResultCount: vi.fn(),
  getCharacterizationResults: vi.fn(),
}))

import {
  getCharacterizationExecution,
  getCharacterizationResultCount,
  getCharacterizationResults,
} from '@/services/characterization.service'

const mockExec = vi.mocked(getCharacterizationExecution)
const mockCount = vi.mocked(getCharacterizationResultCount)
const mockResults = vi.mocked(getCharacterizationResults)

describe('useCharacterizationResults', () => {
  beforeEach(() => {
    mockExec.mockReset()
    mockCount.mockReset()
    mockResults.mockReset()
  })

  it('starts empty', () => {
    const { execution, prevalence, distribution, loading, error } = useCharacterizationResults()
    expect(execution.value).toBeNull()
    expect(prevalence.value).toEqual([])
    expect(distribution.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('loads execution + result count + mapped results', async () => {
    mockExec.mockResolvedValue({
      id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0,
    } as any)
    mockCount.mockResolvedValue(123)
    mockResults.mockResolvedValue([
      { analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
        conceptId: 0, cohortId: 1, cohortName: 'C', count: 10, pct: 5,
        resultType: 'PREVALENCE' },
    ])
    const r = useCharacterizationResults()
    const ok = await r.load(7)
    expect(ok).toBe(true)
    expect(r.execution.value!.id).toBe(7)
    expect(r.resultCount.value).toBe(123)
    expect(r.prevalence.value).toHaveLength(1)
    expect(r.error.value).toBeNull()
  })

  it('clears stale results when load is called for a new id', async () => {
    mockExec.mockResolvedValueOnce({ id: 7, sourceKey: 'A', status: 'COMPLETED', startTime: 0, executionDuration: 0 } as any)
    mockCount.mockResolvedValueOnce(1)
    mockResults.mockResolvedValueOnce([
      { analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X', conceptId: 0,
        cohortId: 1, cohortName: 'C', count: 10, pct: 5, resultType: 'PREVALENCE' },
    ])
    const r = useCharacterizationResults()
    await r.load(7)
    expect(r.prevalence.value).toHaveLength(1)
    mockExec.mockImplementationOnce(() => new Promise(() => {})) // never resolves
    const p = r.load(8)
    expect(r.prevalence.value).toEqual([])
    expect(r.loading.value).toBe(true)
    void p
  })

  it('records error on failure', async () => {
    mockExec.mockRejectedValue(new Error('boom'))
    mockCount.mockResolvedValue(0)
    mockResults.mockResolvedValue([])
    const r = useCharacterizationResults()
    const ok = await r.load(9)
    expect(ok).toBe(false)
    expect(r.error.value).toBe('boom')
  })
})
