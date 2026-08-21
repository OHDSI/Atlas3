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
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'

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
    mockExec.mockResolvedValue(success({
      id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0,
    } as any))
    mockCount.mockResolvedValue(success(123))
    mockResults.mockResolvedValue(success([
      { analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
        conceptId: 0, cohortId: 1, cohortName: 'C', count: 10, pct: 5,
        resultType: 'PREVALENCE' },
    ]))
    const r = useCharacterizationResults()
    const ok = await r.load(7)
    expect(ok).toBe(true)
    expect(r.execution.value!.id).toBe(7)
    expect(r.resultCount.value).toBe(123)
    expect(r.prevalence.value).toHaveLength(1)
    expect(r.error.value).toBeNull()
  })

  it('clears stale results when load is called for a new id', async () => {
    mockExec.mockResolvedValueOnce(success({ id: 7, sourceKey: 'A', status: 'COMPLETED', startTime: 0, executionDuration: 0 } as any))
    mockCount.mockResolvedValueOnce(success(1))
    mockResults.mockResolvedValueOnce(success([
      { analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X', conceptId: 0,
        cohortId: 1, cohortName: 'C', count: 10, pct: 5, resultType: 'PREVALENCE' },
    ]))
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
    mockExec.mockResolvedValue(failure(new ApiError('boom', 0, null)))
    mockCount.mockResolvedValue(success(0))
    mockResults.mockResolvedValue(success([]))
    const r = useCharacterizationResults()
    const ok = await r.load(9)
    expect(ok).toBe(false)
    expect(r.error.value).toBe('boom')
  })

  /**
   * Regression: OHDSI/Atlas3#276. A failed run has no results, so the count
   * and result queries fail too. Discarding the execution alongside them threw
   * away the only object saying the generation failed, and the workbench fell
   * back to "no runs".
   */
  describe('failed generations (Atlas3#276)', () => {
    const failedExec = {
      id: 92,
      sourceKey: 'SYNPUF5PCT',
      status: 'FAILED',
      startTime: 0,
      executionDuration: 0,
      exitMessage: 'permission denied for schema synpuf5pct_results_v3',
    }

    beforeEach(() => {
      mockExec.mockResolvedValue(success(failedExec as any))
      mockCount.mockResolvedValue(failure(new ApiError('no results', 500, null)))
      mockResults.mockResolvedValue(failure(new ApiError('no results', 500, null)))
    })

    it('keeps the execution even though the result queries failed', async () => {
      const r = useCharacterizationResults()
      const ok = await r.load(92)

      expect(ok).toBe(false)
      expect(r.execution.value).not.toBeNull()
      expect(r.execution.value!.status).toBe('FAILED')
      expect(r.execution.value!.id).toBe(92)
    })

    it('surfaces the reason the job gave', async () => {
      const r = useCharacterizationResults()
      await r.load(92)
      expect(r.error.value).toBe('permission denied for schema synpuf5pct_results_v3')
    })

    it('falls back to a generic reason when the job gave none', async () => {
      mockExec.mockResolvedValue(success({ ...failedExec, exitMessage: undefined } as any))
      const r = useCharacterizationResults()
      await r.load(92)
      expect(r.error.value).toBe('Generation failed')
    })

    it('still reports a genuine fetch failure on a run that did not fail', async () => {
      mockExec.mockResolvedValue(success({ ...failedExec, status: 'COMPLETED' } as any))
      const r = useCharacterizationResults()
      const ok = await r.load(92)
      expect(ok).toBe(false)
      expect(r.error.value).toBe('no results')
    })
  })
})
