/**
 * Integration Tests - Atlas Attribute Extraction Coverage
 *
 * Tests that the atlas-converter correctly handles all attribute types
 * that Atlas 2.x can produce, including text filters (TextFilter objects),
 * boolean flags, and rare attributes like StopReason, Sig, LotNumber, etc.
 */

import { describe, it, expect } from 'vitest'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

function roundTrip(atlas: Record<string, unknown>) {
  const internal = convertAtlasToInternal(atlas as never)
  const rt = convertInternalToAtlas({
    ...internal,
    name: 'test',
    entryEvents: internal.entryEvents || [],
    qualifyingLimit: internal.qualifyingLimit || 'ALL',
    inclusionRules: internal.inclusionRules || [],
    conceptSets: internal.conceptSets || [],
  } as CohortDefinition)
  return { internal, rt }
}

function makeAtlasCohort(criteriaType: string, criteriaFields: Record<string, unknown>) {
  return {
    cdmVersionRange: '>=5.0.0',
    PrimaryCriteria: {
      CriteriaList: [{ [criteriaType]: { CodesetId: 0, ...criteriaFields } }],
      ObservationWindow: { PriorDays: 0, PostDays: 0 },
      PrimaryCriteriaLimit: { Type: 'All' },
    },
    ConceptSets: [{
      id: 0,
      name: 'Test',
      expression: { items: [{ concept: { CONCEPT_ID: 1, CONCEPT_NAME: 'Test', DOMAIN_ID: 'Condition', VOCABULARY_ID: 'SNOMED', STANDARD_CONCEPT: 'S' }, isExcluded: false, includeDescendants: false, includeMapped: false }] },
    }],
    QualifiedLimit: { Type: 'All' },
    ExpressionLimit: { Type: 'All' },
    InclusionRules: [],
    CensoringCriteria: [],
    CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
    CensorWindow: {},
  }
}

// ─── TextFilter Attributes ───────────────────────────────────────────────────

describe('TextFilter Attribute Round-Trip', () => {
  it('ValueAsString as TextFilter object round-trips', () => {
    const atlas = makeAtlasCohort('Observation', {
      ValueAsString: { Text: 'abnormal finding', Op: 'contains' },
      ObservationTypeExclude: false,
    })
    const { internal, rt } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'valueAsString'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('abnormal finding')
    expect(attr.operator).toBe('CONTAINS')

    const rtVas = (rt.PrimaryCriteria?.CriteriaList?.[0] as Record<string, unknown>)
      ?.Observation as Record<string, unknown>
    expect(rtVas?.ValueAsString).toEqual({ Text: 'abnormal finding', Op: 'contains' })
  })

  it('ValueAsString as plain string round-trips (backwards compat)', () => {
    const atlas = makeAtlasCohort('Observation', {
      ValueAsString: 'test value',
      ObservationTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'valueAsString'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('test value')
    expect(attr.operator).toBe('CONTAINS')
  })

  it('ValueAsString with equals operator round-trips', () => {
    const atlas = makeAtlasCohort('Observation', {
      ValueAsString: { Text: 'exact match', Op: 'eq' },
      ObservationTypeExclude: false,
    })
    const { internal, rt } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'valueAsString'
    ) as Record<string, unknown>
    expect(attr.operator).toBe('EQUALS')

    const rtVas = (rt.PrimaryCriteria?.CriteriaList?.[0] as Record<string, unknown>)
      ?.Observation as Record<string, unknown>
    expect(rtVas?.ValueAsString).toEqual({ Text: 'exact match', Op: 'eq' })
  })

  it('ValueAsString with startsWith operator round-trips', () => {
    const atlas = makeAtlasCohort('Observation', {
      ValueAsString: { Text: 'prefix', Op: 'startsWith' },
      ObservationTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'valueAsString'
    ) as Record<string, unknown>
    expect(attr.operator).toBe('STARTS_WITH')
  })
})

// ─── New Text Attributes (Previously Missing) ───────────────────────────────

describe('StopReason Attribute', () => {
  it('extracts StopReason from DrugExposure', () => {
    const atlas = makeAtlasCohort('DrugExposure', {
      StopReason: { Text: 'adverse event', Op: 'contains' },
      DrugTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'stopReason'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('adverse event')
    expect(attr.operator).toBe('CONTAINS')
  })

  it('round-trips StopReason through converter', () => {
    const atlas = makeAtlasCohort('DrugExposure', {
      StopReason: { Text: 'completed', Op: 'eq' },
      DrugTypeExclude: false,
    })
    const { rt } = roundTrip(atlas)
    const rtDrug = (rt.PrimaryCriteria?.CriteriaList?.[0] as Record<string, unknown>)
      ?.DrugExposure as Record<string, unknown>
    expect(rtDrug?.StopReason).toEqual({ Text: 'completed', Op: 'eq' })
  })
})

describe('Sig Attribute', () => {
  it('extracts Sig from DrugExposure', () => {
    const atlas = makeAtlasCohort('DrugExposure', {
      Sig: { Text: 'take twice daily', Op: 'contains' },
      DrugTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'sig'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('take twice daily')
  })
})

describe('SourceCode Attribute', () => {
  it('extracts SourceCode from ConditionOccurrence', () => {
    const atlas = makeAtlasCohort('ConditionOccurrence', {
      SourceCode: { Text: 'J06.9', Op: 'eq' },
      ConditionTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'sourceCode'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('J06.9')
    expect(attr.operator).toBe('EQUALS')
  })
})

describe('LotNumber Attribute', () => {
  it('extracts LotNumber from Specimen', () => {
    const atlas = makeAtlasCohort('Specimen', {
      LotNumber: { Text: 'LOT123', Op: 'contains' },
      SpecimenTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'lotNumber'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('LOT123')
  })
})

describe('UniqueDeviceId Attribute', () => {
  it('extracts UniqueDeviceId from DeviceExposure', () => {
    const atlas = makeAtlasCohort('DeviceExposure', {
      UniqueDeviceId: { Text: 'DEV-456', Op: 'contains' },
      DeviceTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'deviceId'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe('DEV-456')
  })
})

// ─── New Boolean Attributes (Previously Missing) ────────────────────────────

describe('Primary Attribute', () => {
  it('extracts Primary boolean from VisitOccurrence', () => {
    const atlas = makeAtlasCohort('VisitOccurrence', {
      Primary: true,
      VisitTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'primary'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe(true)
    expect(attr.type).toBe('boolean')
  })

  it('round-trips Primary boolean', () => {
    const atlas = makeAtlasCohort('VisitOccurrence', {
      Primary: true,
      VisitTypeExclude: false,
    })
    const { rt } = roundTrip(atlas)
    const rtVisit = (rt.PrimaryCriteria?.CriteriaList?.[0] as Record<string, unknown>)
      ?.VisitOccurrence as Record<string, unknown>
    expect(rtVisit?.Primary).toBe(true)
  })
})

describe('Abnormal Attribute', () => {
  it('extracts Abnormal boolean from Measurement', () => {
    const atlas = makeAtlasCohort('Measurement', {
      Abnormal: true,
      MeasurementTypeExclude: false,
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'abnormal'
    ) as Record<string, unknown>
    expect(attr).toBeDefined()
    expect(attr.value).toBe(true)
    expect(attr.type).toBe('boolean')
  })
})

// ─── Schema Passthrough Tests ────────────────────────────────────────────────

describe('Schema Passthrough Preserves Unknown Fields', () => {
  it('CharacterizationDefinitionSchema preserves unknown fields', async () => {
    const { CharacterizationDefinitionSchema } = await import('@/models/characterization.types')
    const input = {
      id: 1,
      name: 'test',
      cohorts: [],
      featureAnalyses: [],
      stratas: [],
      unknownWebAPIField: 'should-be-preserved',
      hashCode: 12345,
    }
    const result = CharacterizationDefinitionSchema.safeParse(input)
    if (!result.success) {
      expect.fail(`expected schema to parse but got: ${JSON.stringify(result.error.issues)}`)
    }
    expect((result.data as Record<string, unknown>).unknownWebAPIField).toBe('should-be-preserved')
    expect((result.data as Record<string, unknown>).hashCode).toBe(12345)
  })

  it('LinkedCohortSchema preserves hasWriteAccess from WebAPI', async () => {
    const { LinkedCohortSchema } = await import('@/models/characterization.types')
    const input = { id: 1, name: 'test', hasWriteAccess: true, expressionType: 'SIMPLE_EXPRESSION' }
    const result = LinkedCohortSchema.safeParse(input)
    if (!result.success) {
      expect.fail(`expected schema to parse but got: ${JSON.stringify(result.error.issues)}`)
    }
    expect((result.data as Record<string, unknown>).hasWriteAccess).toBe(true)
  })

  it('FeatureAnalysisSchema preserves unknown fields', async () => {
    const { FeatureAnalysisSchema } = await import('@/models/feature-analysis.types')
    const input = {
      id: 1,
      name: 'test',
      type: 'PRESET',
      design: 'ConditionEraShortTerm',
      hasWriteAccess: true,
      hashCode: 999,
    }
    const result = FeatureAnalysisSchema.safeParse(input)
    if (!result.success) {
      expect.fail(`expected schema to parse but got: ${JSON.stringify(result.error.issues)}`)
    }
    expect((result.data as Record<string, unknown>).hasWriteAccess).toBe(true)
    expect((result.data as Record<string, unknown>).hashCode).toBe(999)
  })
})
