import { describe, it, expect } from 'vitest'
import { parseJobType, JOB_TYPE_LABELS, JOB_TYPE_ICONS } from '@/models/jobs.types'

describe('parseJobType', () => {
  // The name comes from jobInstance.name, i.e. the Spring Batch job name.
  it('recognises the cacheGeneration executions trexsql writes', () => {
    expect(parseJobType('cacheGeneration')).toBe('cacheGeneration')
  })

  it('gives cacheGeneration a label and an icon', () => {
    expect(JOB_TYPE_LABELS.cacheGeneration).toBeTruthy()
    expect(JOB_TYPE_ICONS.cacheGeneration).toBeTruthy()
  })

  it('does not steal names belonging to other job types', () => {
    expect(parseJobType('generateCohort')).toBe('generateCohort')
    expect(parseJobType('generatePathwayAnalysis')).toBe('generatePathwayAnalysis')
  })

  it('maps the remaining Spring Batch job names the overview shows', () => {
    expect(parseJobType('irAnalysis')).toBe('irAnalysis')
    // Contains "generatecohort", so order decides whether this is right.
    expect(parseJobType('generateCohortCharacterization')).toBe('generateCohortCharacterization')
  })

  it('falls back to UNKNOWN for unrecognised and empty names', () => {
    expect(parseJobType('something else entirely')).toBe('UNKNOWN')
    expect(parseJobType('')).toBe('UNKNOWN')
    expect(parseJobType(null)).toBe('UNKNOWN')
    expect(parseJobType(undefined)).toBe('UNKNOWN')
  })
})
