import { describe, it, expect } from 'vitest'
import { CohortGenerationInfoSchema, isGenerationActive, toGenerationStatus } from '@/models/webapi.types'

describe('webapi generation status mapping', () => {
  it('maps backend ERROR to terminal FAILED', () => {
    expect(toGenerationStatus('ERROR')).toBe('FAILED')
  })

  it('identifies only pending and running jobs as active', () => {
    expect(isGenerationActive('PENDING')).toBe(true)
    expect(isGenerationActive('RUNNING')).toBe(true)
    expect(isGenerationActive('COMPLETE')).toBe(false)
    expect(isGenerationActive('FAILED')).toBe(false)
    expect(isGenerationActive('CANCELED')).toBe(false)
  })

  it('parses cohort generation info ERROR as FAILED', () => {
    const parsed = CohortGenerationInfoSchema.parse({
      id: { cohortDefinitionId: 54, sourceId: 1 },
      startTime: 1787855182500,
      executionDuration: 661,
      status: 'ERROR',
      isValid: false,
      isCanceled: false,
      failMessage: 'java.lang.NullPointerException',
      personCount: null,
      recordCount: null,
      createdBy: {
        id: 1008,
        login: 'jack_murphy@epam.com',
        name: 'Jack Murphy',
      },
      ccGenerateId: 138,
      isDemographic: false,
    })

    expect(parsed.status).toBe('FAILED')
  })
})
