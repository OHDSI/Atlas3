import { describe, it, expect } from 'vitest'
import {
  validateSampleParameters,
  SAMPLE_SIZE_MAX,
  SAMPLE_AGE_MAX,
} from '@/models/cohort-sample.types'

describe('validateSampleParameters', () => {
  it('accepts a minimal valid payload', () => {
    expect(validateSampleParameters({ name: 'demo', size: 1 })).toEqual([])
    expect(validateSampleParameters({ name: 'big', size: SAMPLE_SIZE_MAX })).toEqual([])
  })

  it('rejects empty name and out-of-range size', () => {
    expect(validateSampleParameters({ name: '', size: 100 })).toContain('Sample must have a name.')
    expect(validateSampleParameters({ name: 'x', size: 0 })).toContain(
      `Sample size must be an integer between 1 and ${SAMPLE_SIZE_MAX}.`
    )
    expect(validateSampleParameters({ name: 'x', size: SAMPLE_SIZE_MAX + 1 })).toContain(
      `Sample size must be an integer between 1 and ${SAMPLE_SIZE_MAX}.`
    )
  })

  it('requires a value for single-comparison age modes', () => {
    const errs = validateSampleParameters({
      name: 'x',
      size: 1,
      age: { mode: 'lessThan' },
    })
    expect(errs).toContain('Age value is required for this comparison mode.')
  })

  it('forbids range fields on single-comparison modes', () => {
    const errs = validateSampleParameters({
      name: 'x',
      size: 1,
      age: { mode: 'equalTo', value: 50, min: 30 },
    })
    expect(errs).toContain('Age range cannot be used with a single-value comparison mode.')
  })

  it('requires both bounds for between/notBetween', () => {
    const errs = validateSampleParameters({
      name: 'x',
      size: 1,
      age: { mode: 'between', min: 18 },
    })
    expect(errs).toContain('Both minimum and maximum age are required for between/notBetween.')
  })

  it('rejects min > max and max above the AGE_MAX cap', () => {
    expect(
      validateSampleParameters({ name: 'x', size: 1, age: { mode: 'between', min: 80, max: 30 } })
    ).toContain('Minimum age may not exceed maximum age.')
    expect(
      validateSampleParameters({
        name: 'x',
        size: 1,
        age: { mode: 'between', min: 0, max: SAMPLE_AGE_MAX },
      })
    ).toContain(`Maximum age must be smaller than ${SAMPLE_AGE_MAX}.`)
  })

  it('requires at least one gender concept or non-binary when gender is set', () => {
    expect(
      validateSampleParameters({
        name: 'x',
        size: 1,
        gender: { conceptIds: [], otherNonBinary: false },
      })
    ).toContain('Select at least one gender or non-binary.')
  })

  it('accepts gender with only non-binary selected', () => {
    expect(
      validateSampleParameters({
        name: 'x',
        size: 1,
        gender: { conceptIds: [], otherNonBinary: true },
      })
    ).toEqual([])
  })
})
