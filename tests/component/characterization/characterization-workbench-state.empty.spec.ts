/**
 * resolveEmptyVariant — a run that completes but whose results cannot be
 * fetched. Before #291 this returned null, so the workbench fell through to
 * the result views and rendered them empty off the unpopulated arrays: the
 * server error never reached the screen and the run still looked healthy.
 */
import { describe, it, expect } from 'vitest'
import { resolveEmptyVariant } from '@/components/characterization/characterization-workbench-state'

const base = {
  characterizationId: 15,
  executionCount: 1,
  selectedExecutionId: 42,
}

describe('resolveEmptyVariant results-error (#291)', () => {
  it('reports a completed run whose results failed to load', () => {
    expect(
      resolveEmptyVariant({
        ...base,
        executionStatus: 'COMPLETED',
        resultsError: 'An exception occurred: java.lang.IllegalArgumentException',
      })
    ).toBe('results-error')
  })

  it('stays out of the way when a completed run loaded cleanly', () => {
    expect(
      resolveEmptyVariant({ ...base, executionStatus: 'COMPLETED', resultsError: null })
    ).toBeNull()
    expect(resolveEmptyVariant({ ...base, executionStatus: 'COMPLETED' })).toBeNull()
  })

  it('still calls a failed run failed, not a results error', () => {
    expect(
      resolveEmptyVariant({ ...base, executionStatus: 'FAILED', resultsError: 'boom' })
    ).toBe('run-failed')
  })

  it('still reports a run in progress ahead of any results error', () => {
    expect(
      resolveEmptyVariant({ ...base, executionStatus: 'RUNNING', resultsError: 'boom' })
    ).toBe('run-pending')
  })
})
