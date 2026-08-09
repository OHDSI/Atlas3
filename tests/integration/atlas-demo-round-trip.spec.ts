/**
 * Integration Tests - Atlas Demo Compatibility Round-Trip
 *
 * Tests that real cohort definitions from atlas-demo.ohdsi.org convert through
 * the Atlas3 converter without data loss. This ensures format compatibility
 * between Atlas3 and the production Atlas instance.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

const DEMO_FIXTURES_DIR = join(__dirname, '..', 'e2e', 'fixtures', 'atlas-demo')

interface AtlasDemoTestCase {
  file: string
  name: string
  expectedConceptSets: number
  expectedEntryEventType: string
  expectedInclusionRules: number
  features: string[]
}

const testCases: AtlasDemoTestCase[] = [
  {
    file: 'cohort-measurement-value-age.json',
    name: 'Measurement with ValueAsNumber and Age',
    expectedConceptSets: 1,
    expectedEntryEventType: 'Measurement',
    expectedInclusionRules: 0,
    features: ['ValueAsNumber', 'Age'],
  },
  {
    file: 'cohort-condition-visittype-inclusionrules.json',
    name: 'ConditionOccurrence with VisitType filter',
    expectedConceptSets: 3,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 3,
    features: ['VisitType', 'InclusionRules', 'EndStrategy'],
  },
  {
    file: 'cohort-drug-first-multiconceptitems.json',
    name: 'DrugExposure with First flag',
    expectedConceptSets: 2,
    expectedEntryEventType: 'DrugExposure',
    expectedInclusionRules: 1,
    features: ['First', 'MultipleConceptItems'],
  },
  {
    file: 'cohort-drug-complex-age-date-censor.json',
    name: 'Complex DrugExposure with Age and date filter',
    expectedConceptSets: 13,
    expectedEntryEventType: 'DrugExposure',
    expectedInclusionRules: 8,
    features: ['Age', 'OccurrenceStartDate', 'CensorWindow', 'EndStrategy'],
  },
  {
    file: 'cohort-drug-additionalcriteria-temporal.json',
    name: 'DrugExposure with AdditionalCriteria',
    expectedConceptSets: 3,
    expectedEntryEventType: 'DrugExposure',
    expectedInclusionRules: 0,
    features: ['AdditionalCriteria', 'OccurrenceStartDate', 'Occurrence:EXACTLY_0'],
  },
  // ── New diverse criteria type fixtures ─────────────────────────
  {
    file: 'cohort-procedure-simple.json',
    name: 'ProcedureOccurrence (simple)',
    expectedConceptSets: 1,
    expectedEntryEventType: 'ProcedureOccurrence',
    expectedInclusionRules: 0,
    features: ['ProcedureOccurrence'],
  },
  {
    file: 'cohort-death-type-source.json',
    name: 'Death entry with concept set',
    expectedConceptSets: 1,
    expectedEntryEventType: 'Death',
    expectedInclusionRules: 0,
    features: ['Death'],
  },
  {
    file: 'cohort-specimen-simple.json',
    name: 'Specimen entry (simple)',
    expectedConceptSets: 1,
    expectedEntryEventType: 'Specimen',
    expectedInclusionRules: 0,
    features: ['Specimen'],
  },
  {
    file: 'cohort-visit-simple.json',
    name: 'VisitOccurrence entry (simple)',
    expectedConceptSets: 2,
    expectedEntryEventType: 'VisitOccurrence',
    expectedInclusionRules: 0,
    features: ['VisitOccurrence'],
  },
  {
    file: 'cohort-observationperiod-noconceptsets.json',
    name: 'ObservationPeriod (no concept sets)',
    expectedConceptSets: 0,
    expectedEntryEventType: 'ObservationPeriod',
    expectedInclusionRules: 0,
    features: ['ObservationPeriod', 'NoConceptSets'],
  },
  {
    file: 'cohort-measurement-simple.json',
    name: 'Measurement entry (simple)',
    expectedConceptSets: 1,
    expectedEntryEventType: 'Measurement',
    expectedInclusionRules: 0,
    features: ['Measurement'],
  },
  {
    file: 'cohort-device-procedure-drug-multi.json',
    name: 'DeviceExposure + Procedure + Drug multi-type',
    expectedConceptSets: 7,
    expectedEntryEventType: 'ProcedureOccurrence',
    expectedInclusionRules: 6,
    features: ['DeviceExposure', 'ProcedureOccurrence', 'DrugExposure'],
  },
  {
    file: 'cohort-conditionera-drugera.json',
    name: 'ConditionEra + DrugEra multi-type',
    expectedConceptSets: 1,
    expectedEntryEventType: 'ConditionEra',
    expectedInclusionRules: 0,
    features: ['ConditionEra', 'DrugEra'],
  },
  {
    file: 'cohort-procedure-condition-inclusionrule.json',
    name: 'ProcedureOccurrence with inclusion rule',
    expectedConceptSets: 4,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 1,
    features: ['ProcedureOccurrence', 'ConditionOccurrence', 'InclusionRules'],
  },
  {
    file: 'cohort-visit-inclusionrules.json',
    name: 'VisitOccurrence with inclusion rules',
    expectedConceptSets: 2,
    expectedEntryEventType: 'VisitOccurrence',
    expectedInclusionRules: 2,
    features: ['VisitOccurrence', 'InclusionRules'],
  },
  {
    file: 'cohort-visit-payer.json',
    name: 'VisitOccurrence with payer reference',
    expectedConceptSets: 1,
    expectedEntryEventType: 'VisitOccurrence',
    expectedInclusionRules: 0,
    features: ['VisitOccurrence'],
  },
  // ── Round 3: nested, correlated, VisitDetail, complex ────────
  {
    file: 'cohort-condition-additionalcriteria-nocs.json',
    name: 'ConditionOccurrence with AdditionalCriteria (no CS)',
    expectedConceptSets: 0,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 0,
    features: ['ConditionOccurrence', 'AdditionalCriteria'],
  },
  {
    file: 'cohort-nestedcriteria-additionalcriteria.json',
    name: 'Nested criteria with AdditionalCriteria',
    expectedConceptSets: 2,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 0,
    features: ['ConditionOccurrence', 'AdditionalCriteria'],
  },
  {
    file: 'cohort-death-condition-complex-21cs.json',
    name: 'Death + Condition complex (21 CS, 9 IR)',
    expectedConceptSets: 21,
    expectedEntryEventType: 'Death',
    expectedInclusionRules: 9,
    features: ['ConditionOccurrence', 'Death', 'AdditionalCriteria', 'InclusionRules'],
  },
  {
    file: 'cohort-observationperiod-inclusionrule.json',
    name: 'ObservationPeriod with inclusion rule',
    expectedConceptSets: 0,
    expectedEntryEventType: 'ObservationPeriod',
    expectedInclusionRules: 1,
    features: ['ObservationPeriod', 'InclusionRules'],
  },
  {
    file: 'cohort-visit-nestedgroups.json',
    name: 'VisitOccurrence with nested groups',
    expectedConceptSets: 3,
    expectedEntryEventType: 'VisitOccurrence',
    expectedInclusionRules: 0,
    features: ['VisitOccurrence'],
  },
  {
    file: 'cohort-condition-location.json',
    name: 'ConditionOccurrence with location',
    expectedConceptSets: 1,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 0,
    features: ['ConditionOccurrence'],
  },
  {
    file: 'cohort-multi-condition-measurement-observation.json',
    name: 'Multi-type: Condition + Measurement + Observation',
    expectedConceptSets: 3,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 0,
    features: ['ConditionOccurrence', 'Measurement', 'Observation'],
  },
  {
    file: 'cohort-visitdetail-simple.json',
    name: 'VisitDetail entry (simple)',
    expectedConceptSets: 0,
    expectedEntryEventType: 'VisitDetail',
    expectedInclusionRules: 0,
    features: ['VisitDetail'],
  },
  {
    file: 'cohort-condition-correlated.json',
    name: 'ConditionOccurrence with correlated criteria',
    expectedConceptSets: 2,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 0,
    features: ['ConditionOccurrence'],
  },
  {
    file: 'cohort-drug-censoring-endstrategy.json',
    name: 'DrugExposure with censoring and EndStrategy',
    expectedConceptSets: 12,
    expectedEntryEventType: 'DrugExposure',
    expectedInclusionRules: 4,
    features: ['DrugExposure', 'InclusionRules'],
  },
  {
    file: 'cohort-visitdetail-specialty.json',
    name: 'VisitDetail with specialty filter',
    expectedConceptSets: 1,
    expectedEntryEventType: 'VisitDetail',
    expectedInclusionRules: 0,
    features: ['VisitDetail'],
  },
  {
    file: 'cohort-condition-additionalcriteria-4cs.json',
    name: 'ConditionOccurrence with AdditionalCriteria (4 CS)',
    expectedConceptSets: 4,
    expectedEntryEventType: 'ConditionOccurrence',
    expectedInclusionRules: 0,
    features: ['ConditionOccurrence', 'AdditionalCriteria'],
  },
]

describe('Atlas Demo Round-Trip Tests', () => {
  testCases.forEach(tc => {
    describe(tc.name, () => {
      let atlasJson: Record<string, unknown>
      let internal: Partial<CohortDefinition>
      let roundTripped: Record<string, unknown>

      const loadFixture = () => {
        atlasJson = JSON.parse(readFileSync(join(DEMO_FIXTURES_DIR, tc.file), 'utf-8'))
        internal = convertAtlasToInternal(atlasJson as never)
        roundTripped = convertInternalToAtlas({
          ...internal,
          name: tc.name,
          entryEvents: internal.entryEvents || [],
          qualifyingLimit: internal.qualifyingLimit || 'ALL',
          inclusionRules: internal.inclusionRules || [],
          conceptSets: internal.conceptSets || [],
        } as CohortDefinition)
      }

      it('converts from Atlas format without errors', () => {
        expect(() => loadFixture()).not.toThrow()
        loadFixture()
      })

      it('preserves concept sets', () => {
        loadFixture()
        expect(internal.conceptSets?.length).toBe(tc.expectedConceptSets)
      })

      it('preserves entry events with correct criteria type', () => {
        loadFixture()
        expect(internal.entryEvents?.length).toBeGreaterThan(0)
        expect(internal.entryEvents?.[0].criteriaType).toBe(tc.expectedEntryEventType)
      })

      it('preserves inclusion rules', () => {
        loadFixture()
        expect(internal.inclusionRules?.length).toBe(tc.expectedInclusionRules)
      })

      it('round-trip preserves cdmVersionRange', () => {
        loadFixture()
        expect(roundTripped.cdmVersionRange).toBe(atlasJson.cdmVersionRange)
      })

      it('round-trip preserves CollapseSettings', () => {
        loadFixture()
        expect(roundTripped.CollapseSettings).toEqual(atlasJson.CollapseSettings)
      })

      it('round-trip preserves QualifiedLimit', () => {
        loadFixture()
        expect(roundTripped.QualifiedLimit).toEqual(atlasJson.QualifiedLimit)
      })

      it('round-trip preserves ExpressionLimit', () => {
        loadFixture()
        expect(roundTripped.ExpressionLimit).toEqual(atlasJson.ExpressionLimit)
      })

      it('round-trip preserves number of concept sets', () => {
        loadFixture()
        const rtConceptSets = (roundTripped as { ConceptSets?: unknown[] }).ConceptSets
        expect(rtConceptSets?.length).toBe(tc.expectedConceptSets)
      })

      it('round-trip preserves concept set names', () => {
        loadFixture()
        const original = (atlasJson as { ConceptSets?: { name: string }[] }).ConceptSets || []
        const rt = (roundTripped as { ConceptSets?: { name: string }[] }).ConceptSets || []
        for (let i = 0; i < original.length; i++) {
          expect(rt[i]?.name).toBe(original[i].name)
        }
      })

      it('round-trip preserves concept set items count', () => {
        loadFixture()
        const original = (atlasJson as {
          ConceptSets?: { expression: { items: unknown[] } }[]
        }).ConceptSets || []
        const rt = (roundTripped as {
          ConceptSets?: { expression: { items: unknown[] } }[]
        }).ConceptSets || []
        for (let i = 0; i < original.length; i++) {
          expect(rt[i]?.expression?.items?.length).toBe(
            original[i]?.expression?.items?.length
          )
        }
      })

      it('round-trip preserves number of primary criteria', () => {
        loadFixture()
        const originalPC = (atlasJson as {
          PrimaryCriteria?: { CriteriaList?: unknown[] }
        }).PrimaryCriteria?.CriteriaList
        const rtPC = (roundTripped as {
          PrimaryCriteria?: { CriteriaList?: unknown[] }
        }).PrimaryCriteria?.CriteriaList
        expect(rtPC?.length).toBe(originalPC?.length)
      })

      it('round-trip preserves ObservationWindow', () => {
        loadFixture()
        const originalOW = (atlasJson as {
          PrimaryCriteria?: { ObservationWindow?: Record<string, unknown> }
        }).PrimaryCriteria?.ObservationWindow
        const rtOW = (roundTripped as {
          PrimaryCriteria?: { ObservationWindow?: Record<string, unknown> }
        }).PrimaryCriteria?.ObservationWindow
        expect(rtOW).toEqual(originalOW)
      })

      it('round-trip preserves number of inclusion rules', () => {
        loadFixture()
        const originalIR = (atlasJson as {
          InclusionRules?: unknown[]
        }).InclusionRules
        const rtIR = (roundTripped as {
          InclusionRules?: unknown[]
        }).InclusionRules
        expect(rtIR?.length).toBe(originalIR?.length)
      })
    })
  })
})

describe('Atlas Demo - Feature-Specific Compatibility', () => {
  it('Measurement ValueAsNumber attribute round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-measurement-value-age.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    const entry = internal.entryEvents?.[0]

    expect(entry?.criteriaType).toBe('Measurement')
    const valueAttr = entry?.attributes?.find(
      (a: Record<string, unknown>) => a.type === 'numericRange' && a.attributeKey === 'valueAsNumber'
    )
    expect(valueAttr).toBeDefined()
    expect((valueAttr as Record<string, unknown>).value).toBe(30)
    expect((valueAttr as Record<string, unknown>).operator).toBe('GREATER_THAN_OR_EQUAL')
  })

  it('Age attribute round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-measurement-value-age.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    const entry = internal.entryEvents?.[0]

    const ageAttr = entry?.attributes?.find(
      (a: Record<string, unknown>) => a.type === 'numericRange' && a.attributeKey === 'age'
    )
    expect(ageAttr).toBeDefined()
    expect((ageAttr as Record<string, unknown>).value).toBe(18)
    expect((ageAttr as Record<string, unknown>).operator).toBe('GREATER_THAN_OR_EQUAL')
  })

  it('VisitType concept array round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-condition-visittype-inclusionrules.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    const entry = internal.entryEvents?.[0]

    expect(entry?.criteriaType).toBe('ConditionOccurrence')
    const visitTypeAttr = entry?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'visitType'
    )
    expect(visitTypeAttr).toBeDefined()
    expect((visitTypeAttr as Record<string, unknown>).type).toBe('concept')
    const concepts = (visitTypeAttr as Record<string, unknown>).concepts as Record<string, unknown>[]
    expect(concepts?.length).toBe(2)
    const conceptIds = concepts?.map(c => c.CONCEPT_ID || c.conceptId)
    expect(conceptIds).toContain(9203) // Emergency Room
    expect(conceptIds).toContain(9201) // Inpatient
  })

  it('Inclusion rule temporal windows round-trip correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-condition-visittype-inclusionrules.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)

    expect(internal.inclusionRules?.length).toBe(3)
    const firstRule = internal.inclusionRules?.[0]
    expect(firstRule?.name).toBe('has no prior febrile seizure diagnoses in prior 42 days')

    // Verify round-trip
    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)

    const rtRules = (rt as { InclusionRules?: { name: string }[] }).InclusionRules
    expect(rtRules?.length).toBe(3)
    expect(rtRules?.[0].name).toBe('has no prior febrile seizure diagnoses in prior 42 days')
  })

  it('DrugExposure First flag round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-drug-first-multiconceptitems.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    const entry = internal.entryEvents?.[0]

    expect(entry?.criteriaType).toBe('DrugExposure')

    // Round-trip should preserve First flag
    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)

    const rtCriteria = (rt as {
      PrimaryCriteria?: { CriteriaList?: { DrugExposure?: { First?: boolean } }[] }
    }).PrimaryCriteria?.CriteriaList?.[0]
    expect(rtCriteria?.DrugExposure?.First).toBe(true)
  })

  it('OccurrenceStartDate with date filter round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-drug-complex-age-date-censor.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    const entry = internal.entryEvents?.[0]

    expect(entry?.criteriaType).toBe('DrugExposure')
    const dateAttr = entry?.attributes?.find(
      (a: Record<string, unknown>) => a.type === 'dateRange' && a.attributeKey === 'occurrenceStartDate'
    )
    expect(dateAttr).toBeDefined()
    expect((dateAttr as Record<string, unknown>).value).toBe('2010-10-19')
    expect((dateAttr as Record<string, unknown>).operator).toBe('GREATER_THAN_OR_EQUAL')
  })

  it('AdditionalCriteria with EXACTLY_0 occurrence round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-drug-additionalcriteria-temporal.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)

    expect(internal.additionalCriteria).toBeDefined()
    expect(internal.additionalCriteria!.events?.length).toBeGreaterThan(0)

    // Find the zero-occurrence criterion (no prior antihypertensive exposure)
    const zeroCriterion = internal.additionalCriteria!.events?.find(
      e => e.cardinality?.type === 'EXACTLY' && e.cardinality?.count === 0
    )
    expect(zeroCriterion).toBeDefined()
  })

  it('CensorWindow with date offsets round-trips correctly', () => {
    // cohort-drug-complex-age-date-censor.json's CensorWindow is actually {}
    // (empty), so this test never exercised the field it's named after. Use
    // the fixture that genuinely carries CensorWindow StartDate/EndDate.
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-drug-censoring-endstrategy.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)

    // Round-trip should preserve CensorWindow
    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)

    expect(atlas.CensorWindow && Object.keys(atlas.CensorWindow).length > 0).toBe(true)
    expect(rt.CensorWindow).toEqual(atlas.CensorWindow)
  })

  it('ProcedureOccurrence entry event round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-procedure-simple.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    expect(internal.entryEvents?.[0]?.criteriaType).toBe('ProcedureOccurrence')

    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)
    const rtCriteria = (rt as { PrimaryCriteria?: { CriteriaList?: Record<string, unknown>[] } })
      .PrimaryCriteria?.CriteriaList?.[0]
    expect(rtCriteria).toHaveProperty('ProcedureOccurrence')
  })

  it('Death entry event round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-death-type-source.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    expect(internal.entryEvents?.[0]?.criteriaType).toBe('Death')

    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)
    const rtCriteria = (rt as { PrimaryCriteria?: { CriteriaList?: Record<string, unknown>[] } })
      .PrimaryCriteria?.CriteriaList?.[0]
    expect(rtCriteria).toHaveProperty('Death')
  })

  it('Specimen entry event round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-specimen-simple.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    expect(internal.entryEvents?.[0]?.criteriaType).toBe('Specimen')

    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)
    const rtCriteria = (rt as { PrimaryCriteria?: { CriteriaList?: Record<string, unknown>[] } })
      .PrimaryCriteria?.CriteriaList?.[0]
    expect(rtCriteria).toHaveProperty('Specimen')
  })

  it('VisitOccurrence entry event round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-visit-simple.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    expect(internal.entryEvents?.[0]?.criteriaType).toBe('VisitOccurrence')

    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)
    const rtCriteria = (rt as { PrimaryCriteria?: { CriteriaList?: Record<string, unknown>[] } })
      .PrimaryCriteria?.CriteriaList?.[0]
    expect(rtCriteria).toHaveProperty('VisitOccurrence')
  })

  it('ObservationPeriod entry (no concept sets) round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-observationperiod-noconceptsets.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    expect(internal.entryEvents?.[0]?.criteriaType).toBe('ObservationPeriod')
    expect(internal.conceptSets?.length).toBe(0)
  })

  it('DeviceExposure with multiple entry types round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-device-procedure-drug-multi.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    // Should have entries of multiple types
    const types = new Set(internal.entryEvents?.map(e => e.criteriaType))
    expect(types.has('DeviceExposure')).toBe(true)
    expect(internal.entryEvents?.length).toBeGreaterThan(1)
    expect(internal.inclusionRules?.length).toBe(6)
  })

  it('ConditionEra + DrugEra multi-type entry round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-conditionera-drugera.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)
    const types = new Set(internal.entryEvents?.map(e => e.criteriaType))
    expect(types.has('ConditionEra') || types.has('DrugEra')).toBe(true)
    expect(internal.entryEvents?.length).toBeGreaterThanOrEqual(2)
  })

  it('Demographic criteria in inclusion rules round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-demographic-age-gender-race.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)

    expect(internal.inclusionRules?.length).toBe(1)

    const rt = convertInternalToAtlas({
      ...internal,
      name: 'test',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    } as CohortDefinition)

    const rtRules = (rt as { InclusionRules?: unknown[] }).InclusionRules
    expect(rtRules?.length).toBe(1)
  })

  it('Concept set with isExcluded items round-trips correctly', () => {
    const atlas = JSON.parse(
      readFileSync(join(DEMO_FIXTURES_DIR, 'cohort-condition-visittype-inclusionrules.json'), 'utf-8')
    )
    const internal = convertAtlasToInternal(atlas as never)

    // First concept set has an excluded concept (Posttraumatic seizure)
    const seizureSet = internal.conceptSets?.find(cs => cs.name === 'febrile seizure')
    expect(seizureSet).toBeDefined()
    // Internal format stores items directly on the concept set (not under .expression.items)
    expect(seizureSet?.items?.length).toBe(2)

    const excludedItem = seizureSet?.items?.find(
      (item: Record<string, unknown>) => item.isExcluded === true
    )
    expect(excludedItem).toBeDefined()
  })
})

describe('Atlas Demo - All Fixtures Process Without Errors', () => {
  const fixtureFiles = [
    'cohort-measurement-value-age.json',
    'cohort-condition-visittype-inclusionrules.json',
    'cohort-drug-first-multiconceptitems.json',
    'cohort-drug-complex-age-date-censor.json',
    'cohort-drug-additionalcriteria-temporal.json',
    'cohort-procedure-simple.json',
    'cohort-death-type-source.json',
    'cohort-specimen-simple.json',
    'cohort-visit-simple.json',
    'cohort-observationperiod-noconceptsets.json',
    'cohort-measurement-simple.json',
    'cohort-device-procedure-drug-multi.json',
    'cohort-conditionera-drugera.json',
    'cohort-procedure-condition-inclusionrule.json',
    'cohort-visit-inclusionrules.json',
    'cohort-visit-payer.json',
    'cohort-demographic-age-gender-race.json',
    'cohort-demographic-gender-conceptset.json',
    'cohort-condition-additionalcriteria-nocs.json',
    'cohort-nestedcriteria-additionalcriteria.json',
    'cohort-death-condition-complex-21cs.json',
    'cohort-observationperiod-inclusionrule.json',
    'cohort-visit-nestedgroups.json',
    'cohort-condition-location.json',
    'cohort-multi-condition-measurement-observation.json',
    'cohort-visitdetail-simple.json',
    'cohort-condition-correlated.json',
    'cohort-drug-censoring-endstrategy.json',
    'cohort-visitdetail-specialty.json',
    'cohort-condition-additionalcriteria-4cs.json',
    'cohort-nestedcriteria-noentry.json',
  ]

  fixtureFiles.forEach(file => {
    it(`processes ${file} through full round-trip without throwing`, () => {
      const atlas = JSON.parse(readFileSync(join(DEMO_FIXTURES_DIR, file), 'utf-8'))

      // Atlas → Internal
      const internal = convertAtlasToInternal(atlas as never)
      expect(internal).toBeDefined()

      // Demographic-only cohorts may have no entry events
      const isDemographic = (atlas.PrimaryCriteria?.CriteriaList?.length ?? 0) === 0
      if (!isDemographic) {
        expect(internal.entryEvents?.length).toBeGreaterThan(0)
      } else {
        expect(internal.entryEvents?.length ?? 0).toBe(0)
      }

      // Internal → Atlas
      const rt = convertInternalToAtlas({
        ...internal,
        name: 'Round-trip test',
        entryEvents: internal.entryEvents || [],
        qualifyingLimit: internal.qualifyingLimit || 'ALL',
        inclusionRules: internal.inclusionRules || [],
        conceptSets: internal.conceptSets || [],
      } as CohortDefinition)

      expect(rt).toBeDefined()
      expect(rt.ConceptSets?.length).toBe(atlas.ConceptSets?.length)

      if (!isDemographic) {
        expect(rt.PrimaryCriteria?.CriteriaList?.length).toBeGreaterThan(0)
      } else {
        expect(rt.PrimaryCriteria?.CriteriaList?.length ?? 0).toBe(0)
      }

      // Atlas → Internal → Atlas → Internal (double round-trip)
      const internal2 = convertAtlasToInternal(rt as never)
      expect(internal2.entryEvents?.length).toBe(internal.entryEvents?.length)
      expect(internal2.conceptSets?.length).toBe(internal.conceptSets?.length)
      expect(internal2.inclusionRules?.length).toBe(internal.inclusionRules?.length)
    })
  })
})
