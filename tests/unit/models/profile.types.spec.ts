import { describe, it, expect } from 'vitest'
import {
  PersonProfileSchema,
  PersonRecordSchema,
  ObservationPeriodSchema,
} from '@/models/profile.types'

describe('PersonRecordSchema', () => {
  it('parses a valid record', () => {
    const valid = {
      conceptId: 1234,
      conceptName: 'Lisinopril',
      domain: 'Drug',
      startDate: 1577836800000,
      endDate: 1580515200000,
      startDay: -45,
      endDay: 0,
    }
    expect(PersonRecordSchema.parse(valid)).toEqual(valid)
  })

  it('accepts null endDate and endDay', () => {
    const point = {
      conceptId: 1, conceptName: 'X', domain: 'Condition',
      startDate: 1, endDate: null, startDay: 0, endDay: null,
    }
    expect(() => PersonRecordSchema.parse(point)).not.toThrow()
  })
})

describe('ObservationPeriodSchema', () => {
  it('parses a valid period', () => {
    const valid = { startDate: 1, endDate: 2, startDays: -10, endDays: 100 }
    expect(ObservationPeriodSchema.parse(valid)).toEqual(valid)
  })
})

describe('PersonProfileSchema', () => {
  it('parses a minimal profile', () => {
    const profile = {
      gender: 'FEMALE',
      yearOfBirth: 1972, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 52, recordCount: 0,
      records: [], cohorts: [], observationPeriods: [],
    }
    expect(() => PersonProfileSchema.parse(profile)).not.toThrow()
  })

  it('rejects when records array is missing', () => {
    const bad = {
      gender: 'MALE', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 0, cohorts: [], observationPeriods: [],
    }
    expect(() => PersonProfileSchema.parse(bad)).toThrow()
  })
})
