/**
 * Unit Tests: feature-analysis.types
 * Zod schema validation for FeatureAnalysis and friends.
 */

import { describe, it, expect } from 'vitest'

import {
  FeatureAnalysisTypeSchema,
  FeatureAnalysisAggregateSchema,
  FeatureAnalysisSchema,
  FeatureAnalysisListItemSchema,
} from '@/models/feature-analysis.types'

describe('FeatureAnalysisTypeSchema', () => {
  it('accepts the three known types', () => {
    expect(FeatureAnalysisTypeSchema.safeParse('PRESET').success).toBe(true)
    expect(FeatureAnalysisTypeSchema.safeParse('CRITERIA_SET').success).toBe(true)
    expect(FeatureAnalysisTypeSchema.safeParse('CUSTOM_FE').success).toBe(true)
  })

  it('rejects unknown types', () => {
    expect(FeatureAnalysisTypeSchema.safeParse('OTHER').success).toBe(false)
  })
})

describe('FeatureAnalysisAggregateSchema', () => {
  it('parses a realistic aggregate from /feature-analysis/aggregates', () => {
    const result = FeatureAnalysisAggregateSchema.safeParse({
      id: 1,
      name: 'Events count',
      domain: null,
      function: 'COUNT',
      expression: '*',
      additionalColumns: null,
      default: true,
      isDefault: true,
      missingMeansZero: true,
    })
    expect(result.success).toBe(true)
  })

  it('keeps unknown fields via passthrough', () => {
    const result = FeatureAnalysisAggregateSchema.safeParse({
      id: 1,
      name: 'Mean',
      futureField: 'kept',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // passthrough keeps extra fields so future API additions don't break us
      expect((result.data as Record<string, unknown>).futureField).toBe('kept')
    } else {
      expect.fail('expected safeParse to succeed')
    }
  })

  it('rejects when required field is missing', () => {
    expect(FeatureAnalysisAggregateSchema.safeParse({ name: 'Mean' }).success).toBe(false)
  })
})

describe('FeatureAnalysisSchema', () => {
  it('parses a PRESET feature analysis (design is opaque JSON)', () => {
    const fa = {
      id: 12,
      name: 'Demographics: Age',
      description: 'Standard age covariate',
      type: 'PRESET',
      domain: 'Demographics',
      statType: 'PREVALENCE',
      design: {
        DemographicsAge: true,
        DemographicsGender: false,
        temporal: false,
      },
      createdBy: { login: 'admin', name: 'Admin User' },
      createdDate: 1_700_000_000_000,
      modifiedDate: 1_700_000_500_000,
      tags: [{ id: 1, name: 'core' }],
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('parses a CRITERIA_SET feature analysis', () => {
    const fa = {
      name: 'My condition group',
      type: 'CRITERIA_SET',
      domain: 'Condition',
      design: {
        conceptSets: [{ id: 1, name: 'Diabetes' }],
        criteria: { logicType: 'ALL', events: [] },
      },
      conceptSets: [{ id: 1, name: 'Diabetes' }],
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('parses a CUSTOM_FE feature analysis (design is SQL string)', () => {
    const fa = {
      name: 'Custom drug-era covariate',
      type: 'CUSTOM_FE',
      design: 'SELECT 1 FROM @cdm.drug_era',
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('preserves unknown fields via passthrough WebAPI fields', () => {
    const result = FeatureAnalysisSchema.safeParse({
      name: 'X',
      type: 'PRESET',
      design: {},
      hasWriteAccess: true, // unknown extra field from WebAPI
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('hasWriteAccess')
    } else {
      expect.fail('expected safeParse to succeed')
    }
  })

  it('accepts createdBy as a plain login string', () => {
    const result = FeatureAnalysisSchema.safeParse({
      name: 'X',
      type: 'PRESET',
      design: {},
      createdBy: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('rejects when name is missing', () => {
    const result = FeatureAnalysisSchema.safeParse({
      type: 'PRESET',
      design: {},
    })
    expect(result.success).toBe(false)
  })

  it('rejects when type is missing', () => {
    const result = FeatureAnalysisSchema.safeParse({
      name: 'X',
      design: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('FeatureAnalysisListItemSchema', () => {
  it('parses a list-shape feature analysis', () => {
    const item = {
      id: 7,
      name: 'Demographics: Gender',
      description: 'Gender as covariate',
      type: 'PRESET',
      domain: 'Demographics',
      statType: 'PREVALENCE',
      createdBy: 'admin',
      createdDate: 1_700_000_000_000,
      modifiedDate: 1_700_000_500_000,
    }
    const result = FeatureAnalysisListItemSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it('preserves unknown fields via passthrough fields', () => {
    const result = FeatureAnalysisListItemSchema.safeParse({
      id: 1,
      name: 'X',
      type: 'PRESET',
      hasWriteAccess: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('hasWriteAccess')
    } else {
      expect.fail('expected safeParse to succeed')
    }
  })

  it('rejects when id is missing', () => {
    const result = FeatureAnalysisListItemSchema.safeParse({
      name: 'X',
      type: 'PRESET',
    })
    expect(result.success).toBe(false)
  })
})
