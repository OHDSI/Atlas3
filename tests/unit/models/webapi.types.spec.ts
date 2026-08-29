import { describe, it, expect } from 'vitest'
import { CohortGenerationInfoSchema, toGenerationStatus } from '@/models/webapi.types'

describe('webapi generation status mapping', () => {
  it('maps backend ERROR to terminal FAILED', () => {
    expect(toGenerationStatus('ERROR')).toBe('FAILED')
  })

  it('parses cohort generation info ERROR as FAILED', () => {
    const result = CohortGenerationInfoSchema.safeParse({
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

    expect(result.success).toBe(true)
    expect(result.success && result.data.status).toBe('FAILED')
  })
})
