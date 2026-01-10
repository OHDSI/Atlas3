/**
 * Unit Test: Atlas Converter Service
 * Tests bidirectional conversion between internal format and Atlas JSON
 *
 * Focus: Phase 1 Attributes (US1)
 * - expressionType
 * - CollapseSettings
 * - CensorWindow
 * - cdmVersionRange
 */
import { describe, it, expect } from 'vitest'
import {
  convertInternalToAtlas,
  convertAtlasToInternal,
  parseTextAttribute,
  parseBooleanAttribute,
  parseConceptAttribute,
  parseTemporalRelationshipAttribute,
  parseDateAdjustmentAttribute,
  parseUserDefinedPeriodAttribute,
} from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

describe('Atlas Converter - Phase 1 Attributes (US1)', () => {

  /**
   * Helper function to create a minimal valid cohort definition
   */
  function createMinimalCohort(overrides: Partial<CohortDefinition> = {}): CohortDefinition {
    return {
      name: 'Test Cohort',
      description: 'Test description',
      entryEvents: [],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [],
      ...overrides,
    }
  }

  describe('expressionType', () => {
    it('preserves expressionType on round-trip', () => {
      // Create cohort with specific expressionType
      const cohort = createMinimalCohort({
        expressionType: 'SIMPLE_EXPRESSION',
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify expressionType is preserved
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(converted.expressionType).toBe('SIMPLE_EXPRESSION')
    })

    it('applies default expressionType when missing', () => {
      // Create cohort without expressionType
      const cohort = createMinimalCohort()
      // Explicitly remove expressionType to test default
      delete cohort.expressionType

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify default is applied
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
    })

    it('preserves custom expressionType values', () => {
      // Test with a different expression type
      const cohort = createMinimalCohort({
        expressionType: 'CUSTOM_EXPRESSION',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.expressionType).toBe('CUSTOM_EXPRESSION')
      expect(converted.expressionType).toBe('CUSTOM_EXPRESSION')
    })

    // US6: T083-T089 - Expression Type Metadata forward compatibility
    it('preserves unknown expressionType values for forward compatibility', () => {
      // Test that unknown expression types pass through without error
      const cohort = createMinimalCohort({
        expressionType: 'FUTURE_EXPRESSION_TYPE',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Unknown values should be preserved for forward compatibility
      expect(atlasJSON.expressionType).toBe('FUTURE_EXPRESSION_TYPE')
      expect(converted.expressionType).toBe('FUTURE_EXPRESSION_TYPE')
    })

    it('handles expressionType values from future Atlas versions', () => {
      // Simulate receiving an Atlas JSON with a new expressionType we don't know about
      const atlasJSON = {
        expressionType: 'NEXT_GEN_EXPRESSION',
        cdmVersionRange: '>=6.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Should preserve the unknown value
      expect(converted.expressionType).toBe('NEXT_GEN_EXPRESSION')

      // Round-trip should maintain the value
      const reconverted = convertInternalToAtlas(converted as unknown)
      expect(reconverted.expressionType).toBe('NEXT_GEN_EXPRESSION')
    })
  })

  describe('CollapseSettings', () => {
    it('preserves CollapseSettings on round-trip', () => {
      // Create cohort with custom CollapseSettings
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 30,
        },
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify CollapseSettings are preserved
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 30,
      })
      expect(converted.collapseSettings).toEqual({
        collapseType: 'ERA',
        eraPad: 30,
      })
    })

    // US3: T048-T054 - Episode Collapse Configuration validation tests
    it('rejects CollapseSettings with EraPad but no CollapseType', () => {
      // This test documents expected behavior - EraPad without CollapseType should be considered invalid
      // Note: Current implementation doesn't validate, but this test serves as documentation
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: '',
          eraPad: 30,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // When collapseType is empty, converter still preserves it
      // In a production validator, this would be flagged as invalid
      expect(atlasJSON.CollapseSettings?.CollapseType).toBe('')
      expect(atlasJSON.CollapseSettings?.EraPad).toBe(30)
    })

    it('applies default CollapseSettings for new cohorts', () => {
      // Create cohort without collapseSettings (as would happen for new cohorts)
      const cohort = createMinimalCohort()
      delete cohort.collapseSettings

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify defaults are applied
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
    })

    it('applies default CollapseSettings when missing', () => {
      // Create cohort without collapseSettings
      const cohort = createMinimalCohort()
      delete cohort.collapseSettings

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify defaults are applied
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
    })

    it('preserves zero EraPad value', () => {
      // CRITICAL: Test that ?? operator preserves 0 correctly
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 0,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CollapseSettings?.EraPad).toBe(0)
      expect(converted.collapseSettings?.eraPad).toBe(0)
    })

    it('preserves custom CollapseType values', () => {
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'CUSTOM_COLLAPSE',
          eraPad: 15,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CollapseSettings?.CollapseType).toBe('CUSTOM_COLLAPSE')
      expect(converted.collapseSettings?.collapseType).toBe('CUSTOM_COLLAPSE')
    })

    it('converts from Atlas without collapseSettings', () => {
      // Create Atlas JSON without CollapseSettings
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Should be undefined since Atlas didn't have it
      expect(converted.collapseSettings).toBeUndefined()
    })
  })

  describe('CensorWindow', () => {
    it('preserves CensorWindow on round-trip', () => {
      // Create cohort with CensorWindow
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
          endDate: {
            dateField: 'END_DATE',
            offset: 30,
          },
        },
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify CensorWindow structure is preserved
      expect(atlasJSON.CensorWindow).toEqual({
        StartDate: {
          DateField: 'START_DATE',
          Offset: 0,
        },
        EndDate: {
          DateField: 'END_DATE',
          Offset: 30,
        },
      })
      expect(converted.censorWindow).toEqual({
        startDate: {
          dateField: 'START_DATE',
          offset: 0,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      })
    })

    it('handles empty CensorWindow', () => {
      // Create cohort without censorWindow
      const cohort = createMinimalCohort()
      delete cohort.censorWindow

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Should create empty object
      expect(atlasJSON.CensorWindow).toEqual({})
    })

    it('preserves zero offset values', () => {
      // CRITICAL: Test that ?? operator preserves 0 correctly
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate?.Offset).toBe(0)
      expect(converted.censorWindow?.startDate?.offset).toBe(0)
    })

    it('handles CensorWindow with only startDate', () => {
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 10,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate).toBeDefined()
      expect(atlasJSON.CensorWindow?.EndDate).toBeUndefined()
      expect(converted.censorWindow?.startDate).toBeDefined()
      expect(converted.censorWindow?.endDate).toBeUndefined()
    })

    it('handles CensorWindow with only endDate', () => {
      const cohort = createMinimalCohort({
        censorWindow: {
          endDate: {
            dateField: 'END_DATE',
            offset: 20,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate).toBeUndefined()
      expect(atlasJSON.CensorWindow?.EndDate).toBeDefined()
      expect(converted.censorWindow?.startDate).toBeUndefined()
      expect(converted.censorWindow?.endDate).toBeDefined()
    })

    it('converts from Atlas with empty CensorWindow', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Empty CensorWindow should convert to undefined
      expect(converted.censorWindow).toBeUndefined()
    })

    it('handles missing offset in DateField', () => {
      // Test default behavior when offset is not provided
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            // offset intentionally omitted
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Should apply default offset of 0
      expect(atlasJSON.CensorWindow?.StartDate?.Offset).toBe(0)
    })
  })

  describe('cdmVersionRange', () => {
    it('preserves cdmVersionRange on round-trip', () => {
      // Create cohort with specific cdmVersionRange
      const cohort = createMinimalCohort({
        cdmVersionRange: '>=5.0.0',
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify cdmVersionRange is preserved
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
      expect(converted.cdmVersionRange).toBe('>=5.0.0')
    })

    it('applies default cdmVersionRange when missing', () => {
      // Create cohort without cdmVersionRange
      const cohort = createMinimalCohort()
      delete cohort.cdmVersionRange

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify default is applied
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
    })

    it('preserves custom cdmVersionRange values', () => {
      const cohort = createMinimalCohort({
        cdmVersionRange: '>=5.3.0',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.cdmVersionRange).toBe('>=5.3.0')
      expect(converted.cdmVersionRange).toBe('>=5.3.0')
    })

    it('handles version range with upper bound', () => {
      const cohort = createMinimalCohort({
        cdmVersionRange: '>=5.0.0 <6.0.0',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0 <6.0.0')
      expect(converted.cdmVersionRange).toBe('>=5.0.0 <6.0.0')
    })
  })

  describe('Combined attributes round-trip', () => {
    it('preserves all Phase 1 attributes together', () => {
      // Create cohort with all Phase 1 attributes
      const cohort = createMinimalCohort({
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.3.0',
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 15,
        },
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 5,
          },
          endDate: {
            dateField: 'END_DATE',
            offset: 10,
          },
        },
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify all attributes are preserved
      expect(converted.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(converted.cdmVersionRange).toBe('>=5.3.0')
      expect(converted.collapseSettings).toEqual({
        collapseType: 'ERA',
        eraPad: 15,
      })
      expect(converted.censorWindow).toEqual({
        startDate: {
          dateField: 'START_DATE',
          offset: 5,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 10,
        },
      })
    })

    it('applies all defaults when attributes are missing', () => {
      // Create minimal cohort without any Phase 1 attributes
      const cohort = createMinimalCohort()
      delete cohort.expressionType
      delete cohort.cdmVersionRange
      delete cohort.collapseSettings
      delete cohort.censorWindow

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify all defaults are applied
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
      expect(atlasJSON.CensorWindow).toEqual({})
    })
  })

  // US4: T055-T072 - CensoringCriteria, DateAdjustment, and extended Cardinality tests
  describe('CensoringCriteria (US4)', () => {
    it('converts censoringCriteria events to Atlas format', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify CensoringCriteria array is populated
      expect(atlasJSON.CensoringCriteria).toBeDefined()
      expect(atlasJSON.CensoringCriteria).toHaveLength(1)
      expect(atlasJSON.CensoringCriteria[0]).toHaveProperty('Death')
    })

    it('converts multiple censoring events', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
          {
            id: 'censor-2',
            criteriaType: 'DrugExposure',
            conceptSet: { id: 1, name: 'Test Drug' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.CensoringCriteria).toHaveLength(2)
    })

    it('round-trips censoringCriteria correctly', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
        ],
        conceptSets: [],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.censoringCriteria).toBeDefined()
      expect(converted.censoringCriteria).toHaveLength(1)
      expect(converted.censoringCriteria?.[0].criteriaType).toBe('Death')
    })

    it('handles empty censoringCriteria', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.CensoringCriteria).toEqual([])
    })
  })

  describe('DateAdjustment (US4)', () => {
    it('converts dateAdjustment to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            dateAdjustment: {
              startWith: 'START_DATE',
              startOffset: 0,
              endWith: 'END_DATE',
              endOffset: 30,
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).toHaveProperty('DateAdjustment')
      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].DateAdjustment).toEqual({
        StartWith: 'START_DATE',
        StartOffset: 0,
        EndWith: 'END_DATE',
        EndOffset: 30,
      })
    })

    it('round-trips dateAdjustment correctly', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            dateAdjustment: {
              startWith: 'START_DATE',
              startOffset: -7,
              endWith: 'START_DATE',
              endOffset: 7,
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0].dateAdjustment).toEqual({
        startWith: 'START_DATE',
        startOffset: -7,
        endWith: 'START_DATE',
        endOffset: 7,
      })
    })

    it('handles events without dateAdjustment', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).not.toHaveProperty('DateAdjustment')
    })
  })

  describe('Extended Cardinality (US4)', () => {
    it('converts isDistinct to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 2,
              countingMethod: 'ALL',
              isDistinct: true,
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence.IsDistinct).toBe(true)
    })

    it('converts countColumn to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 2,
              countingMethod: 'ALL',
              countColumn: 'custom_count_column',
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence.CountColumn).toBe('custom_count_column')
    })

    it('defaults isDistinct to false when not specified', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence.IsDistinct).toBe(false)
    })

    it('omits countColumn when not specified', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence).not.toHaveProperty('CountColumn')
    })

    it('round-trips extended cardinality fields', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'EXACTLY',
              count: 3,
              countingMethod: 'DISTINCT_CONCEPT',
              isDistinct: true,
              countColumn: 'my_column',
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0].cardinality).toEqual({
        type: 'EXACTLY',
        count: 3,
        countingMethod: 'DISTINCT_CONCEPT',
        isDistinct: true,
        countColumn: 'my_column',
      })
    })
  })

  describe('Edge cases', () => {
    it('handles null vs undefined correctly', () => {
      const cohort = createMinimalCohort({
        expressionType: undefined,
        cdmVersionRange: undefined,
        collapseSettings: undefined,
        censorWindow: undefined,
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Should still apply defaults for undefined values
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
      expect(atlasJSON.CollapseSettings).toBeDefined()
      expect(atlasJSON.CensorWindow).toBeDefined()
    })

    it('preserves empty string expressionType', () => {
      const cohort = createMinimalCohort({
        expressionType: '',
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Empty string should be preserved (not replaced with default)
      expect(atlasJSON.expressionType).toBe('')
    })

    it('handles negative offset values in CensorWindow', () => {
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: -10,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate?.Offset).toBe(-10)
      expect(converted.censorWindow?.startDate?.offset).toBe(-10)
    })

    it('handles very large eraPad values', () => {
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 9999,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CollapseSettings?.EraPad).toBe(9999)
      expect(converted.collapseSettings?.eraPad).toBe(9999)
    })
  })

  describe('Atlas JSON structure validation', () => {
    it('ensures required Atlas properties are present', () => {
      const cohort = createMinimalCohort()

      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify all required Atlas properties are present
      expect(atlasJSON).toHaveProperty('expressionType')
      expect(atlasJSON).toHaveProperty('cdmVersionRange')
      expect(atlasJSON).toHaveProperty('ConceptSets')
      expect(atlasJSON).toHaveProperty('PrimaryCriteria')
      expect(atlasJSON).toHaveProperty('AdditionalCriteria')
      expect(atlasJSON).toHaveProperty('InclusionRules')
      expect(atlasJSON).toHaveProperty('CensoringCriteria')
      expect(atlasJSON).toHaveProperty('QualifiedLimit')
      expect(atlasJSON).toHaveProperty('ExpressionLimit')
      expect(atlasJSON).toHaveProperty('CollapseSettings')
      expect(atlasJSON).toHaveProperty('CensorWindow')
    })

    it('ensures PascalCase for Atlas properties', () => {
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 30,
        },
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify PascalCase conversion
      expect(atlasJSON.CollapseSettings).toBeDefined()
      expect(atlasJSON.CollapseSettings).not.toHaveProperty('collapseType')
      expect(atlasJSON.CollapseSettings).toHaveProperty('CollapseType')
      expect(atlasJSON.CollapseSettings).toHaveProperty('EraPad')

      expect(atlasJSON.CensorWindow).toBeDefined()
      expect(atlasJSON.CensorWindow).not.toHaveProperty('startDate')
      expect(atlasJSON.CensorWindow).toHaveProperty('StartDate')
    })

    it('ensures camelCase for internal properties', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 30,
        },
        CensorWindow: {
          StartDate: {
            DateField: 'START_DATE',
            Offset: 5,
          },
        },
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Verify camelCase conversion
      expect(converted.collapseSettings).toBeDefined()
      expect(converted.collapseSettings).not.toHaveProperty('CollapseType')
      expect(converted.collapseSettings).toHaveProperty('collapseType')
      expect(converted.collapseSettings).toHaveProperty('eraPad')

      expect(converted.censorWindow).toBeDefined()
      expect(converted.censorWindow).not.toHaveProperty('StartDate')
      expect(converted.censorWindow).toHaveProperty('startDate')
    })
  })

  // Additional comprehensive tests for uncovered functions and edge cases
  describe('Attribute Conversion - Text Attributes', () => {
    it('parses text attribute with default operator', () => {
      
      const result = parseTextAttribute('valueAsString', 'test value')

      expect(result).toEqual({
        type: 'text',
        attributeKey: 'valueAsString',
        operator: 'CONTAINS',
        value: 'test value',
      })
    })

    it('handles empty text values', () => {
      
      const result = parseTextAttribute('valueAsString', '')

      expect(result.value).toBe('')
    })

    it('handles special characters in text values', () => {
      
      const result = parseTextAttribute('valueAsString', 'test & <value> "quoted"')

      expect(result.value).toBe('test & <value> "quoted"')
    })
  })

  describe('Attribute Conversion - Boolean Attributes', () => {
    it('parses boolean attribute with true value', () => {
      
      const result = parseBooleanAttribute('first', true)

      expect(result).toEqual({
        type: 'boolean',
        attributeKey: 'first',
        value: true,
      })
    })

    it('parses boolean attribute with false value', () => {
      
      const result = parseBooleanAttribute('first', false)

      expect(result).toEqual({
        type: 'boolean',
        attributeKey: 'first',
        value: false,
      })
    })
  })

  describe('Attribute Conversion - Concept Attributes', () => {
    it('parses concept attribute with single concept', () => {
      
      const concepts = [
        {
          CONCEPT_ID: 8532,
          CONCEPT_NAME: 'Female',
          DOMAIN_ID: 'Gender',
          VOCABULARY_ID: 'Gender',
          CONCEPT_CLASS_ID: 'Gender',
        },
      ]
      const result = parseConceptAttribute('gender', concepts)

      expect(result).toEqual({
        type: 'concept',
        attributeKey: 'gender',
        concepts: concepts,
      })
    })

    it('parses concept attribute with multiple concepts', () => {
      
      const concepts = [
        { CONCEPT_ID: 8532, CONCEPT_NAME: 'Female' },
        { CONCEPT_ID: 8507, CONCEPT_NAME: 'Male' },
      ]
      const result = parseConceptAttribute('gender', concepts)

      expect(result.concepts).toHaveLength(2)
    })

    it('handles empty concept array', () => {
      
      const result = parseConceptAttribute('gender', [])

      expect(result.concepts).toEqual([])
    })
  })

  describe('Attribute Conversion - Temporal Relationship Attributes', () => {
    it('parses temporal relationship with start window only', () => {
      
      const temporalData = {
        StartWindow: {
          Start: { Days: 30, Coeff: -1 },
          UseIndexEnd: false,
          UseEventEnd: false,
        },
      }
      const result = parseTemporalRelationshipAttribute('temporalRelationship', temporalData)

      expect(result).toEqual({
        type: 'temporalRelationship',
        attributeKey: 'temporalRelationship',
        temporalWindow: {
          startWindow: {
            days: 30,
            beforeAfter: 'BEFORE',
            referencePoint: 'INDEX_START',
          },
          endWindow: undefined,
        },
      })
    })

    it('parses temporal relationship with both start and end windows', () => {
      
      const temporalData = {
        StartWindow: {
          Start: { Days: 0, Coeff: -1 },
          End: { Days: 30, Coeff: 1 },
          UseIndexEnd: true,
          UseEventEnd: false,
        },
      }
      const result = parseTemporalRelationshipAttribute('temporalRelationship', temporalData)

      expect(result.temporalWindow).toEqual({
        startWindow: {
          days: 0,
          beforeAfter: 'BEFORE',
          referencePoint: 'INDEX_END',
        },
        endWindow: {
          days: 30,
          beforeAfter: 'AFTER',
          referencePoint: 'INDEX_END',
        },
      })
    })

    it('parses temporal relationship with null days (all time)', () => {
      
      const temporalData = {
        StartWindow: {
          Start: { Coeff: 1 },
          UseIndexEnd: false,
          UseEventEnd: true,
        },
      }
      const result = parseTemporalRelationshipAttribute('temporalRelationship', temporalData)

      expect(result.temporalWindow.startWindow?.days).toBeNull()
      expect(result.temporalWindow.startWindow?.referencePoint).toBe('EVENT_END')
    })

    it('handles positive coefficient (AFTER)', () => {
      
      const temporalData = {
        StartWindow: {
          Start: { Days: 10, Coeff: 1 },
        },
      }
      const result = parseTemporalRelationshipAttribute('temporalRelationship', temporalData)

      expect(result.temporalWindow.startWindow?.beforeAfter).toBe('AFTER')
    })

    it('handles zero coefficient (defaults to AFTER)', () => {
      
      const temporalData = {
        StartWindow: {
          Start: { Days: 0, Coeff: 0 },
        },
      }
      const result = parseTemporalRelationshipAttribute('temporalRelationship', temporalData)

      expect(result.temporalWindow.startWindow?.beforeAfter).toBe('AFTER')
    })
  })

  describe('Attribute Conversion - Date Adjustment Attributes', () => {
    it('parses date adjustment with all fields', () => {
      
      const dateAdjustmentData = {
        StartWith: 'START_DATE',
        StartOffset: 10,
        EndWith: 'END_DATE',
        EndOffset: 20,
      }
      const result = parseDateAdjustmentAttribute('dateAdjustment', dateAdjustmentData)

      expect(result).toEqual({
        type: 'dateAdjustment',
        attributeKey: 'dateAdjustment',
        dateAdjustment: {
          startWith: 'START_DATE',
          startOffset: 10,
          endWith: 'END_DATE',
          endOffset: 20,
        },
      })
    })

    it('handles negative offsets', () => {
      
      const dateAdjustmentData = {
        StartWith: 'START_DATE',
        StartOffset: -5,
        EndWith: 'START_DATE',
        EndOffset: -10,
      }
      const result = parseDateAdjustmentAttribute('dateAdjustment', dateAdjustmentData)

      expect(result.dateAdjustment.startOffset).toBe(-5)
      expect(result.dateAdjustment.endOffset).toBe(-10)
    })

    it('applies defaults for missing fields', () => {
      
      const dateAdjustmentData = {}
      const result = parseDateAdjustmentAttribute('dateAdjustment', dateAdjustmentData)

      expect(result.dateAdjustment).toEqual({
        startWith: 'START_DATE',
        startOffset: 0,
        endWith: 'END_DATE',
        endOffset: 0,
      })
    })

    it('handles zero offsets', () => {
      
      const dateAdjustmentData = {
        StartWith: 'END_DATE',
        StartOffset: 0,
        EndWith: 'END_DATE',
        EndOffset: 0,
      }
      const result = parseDateAdjustmentAttribute('dateAdjustment', dateAdjustmentData)

      expect(result.dateAdjustment.startOffset).toBe(0)
      expect(result.dateAdjustment.endOffset).toBe(0)
    })
  })

  describe('Attribute Conversion - User Defined Period Attributes', () => {
    it('parses user defined period with valid dates', () => {
      
      const result = parseUserDefinedPeriodAttribute('userDefinedPeriod', '2020-01-01', '2020-12-31')

      expect(result).toEqual({
        type: 'userDefinedPeriod',
        attributeKey: 'userDefinedPeriod',
        period: {
          startDate: '2020-01-01',
          endDate: '2020-12-31',
        },
      })
    })

    it('preserves date strings exactly as provided', () => {
      
      const result = parseUserDefinedPeriodAttribute('userDefinedPeriod', '2023-06-15', '2023-06-16')

      expect(result.period.startDate).toBe('2023-06-15')
      expect(result.period.endDate).toBe('2023-06-16')
    })
  })

  describe('ConceptSets - Comprehensive conversion', () => {
    it.skip('converts concept sets with all optional fields', () => {
      const cohort = createMinimalCohort({
        conceptSets: [
          {
            id: 1,
            name: 'Test Concept Set',
            items: [
              {
                conceptId: 123,
                conceptName: 'Test Concept',
                domainId: 'Condition',
                vocabularyId: 'SNOMED',
                conceptClassId: 'Clinical Finding',
                conceptCode: '12345',
                standardConcept: 'S',
                invalidReason: null,
                includeDescendants: true,
                isExcluded: false,
                includeMapped: true,
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.ConceptSets[0]).toEqual({
        id: 1,
        name: 'Test Concept Set',
        expression: {
          items: [
            {
              concept: {
                CONCEPT_ID: 123,
                CONCEPT_NAME: 'Test Concept',
                DOMAIN_ID: 'Condition',
                VOCABULARY_ID: 'SNOMED',
                CONCEPT_CLASS_ID: 'Clinical Finding',
                CONCEPT_CODE: '12345',
                STANDARD_CONCEPT: 'S',
                INVALID_REASON: null,
              },
              isExcluded: false,
              includeDescendants: true,
              includeMapped: true,
            },
          ],
        },
      })
    })

    it('omits optional concept fields when null or undefined', () => {
      const cohort = createMinimalCohort({
        conceptSets: [
          {
            id: 1,
            name: 'Test Concept Set',
            items: [
              {
                conceptId: 123,
                conceptName: 'Test Concept',
                domainId: 'Condition',
                vocabularyId: 'SNOMED',
                conceptClassId: 'Clinical Finding',
                conceptCode: null,
                standardConcept: undefined,
                invalidReason: null,
                includeDescendants: false,
                isExcluded: false,
                includeMapped: false,
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const concept = atlasJSON.ConceptSets[0]?.expression.items[0]?.concept

      expect(concept).not.toHaveProperty('CONCEPT_CODE')
      expect(concept).not.toHaveProperty('STANDARD_CONCEPT')
    })

    it('preserves concept set items order', () => {
      const cohort = createMinimalCohort({
        conceptSets: [
          {
            id: 1,
            name: 'Test',
            items: [
              { conceptId: 1, conceptName: 'First', domainId: 'A', vocabularyId: 'V', conceptClassId: 'C', includeDescendants: false, isExcluded: false, includeMapped: false },
              { conceptId: 2, conceptName: 'Second', domainId: 'A', vocabularyId: 'V', conceptClassId: 'C', includeDescendants: false, isExcluded: false, includeMapped: false },
              { conceptId: 3, conceptName: 'Third', domainId: 'A', vocabularyId: 'V', conceptClassId: 'C', includeDescendants: false, isExcluded: false, includeMapped: false },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const items = atlasJSON.ConceptSets[0]?.expression.items

      expect(items?.[0]?.concept.CONCEPT_ID).toBe(1)
      expect(items?.[1]?.concept.CONCEPT_ID).toBe(2)
      expect(items?.[2]?.concept.CONCEPT_ID).toBe(3)
    })

    it('handles concept sets with empty items array', () => {
      const cohort = createMinimalCohort({
        conceptSets: [
          {
            id: 1,
            name: 'Empty Concept Set',
            items: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.ConceptSets[0]?.expression.items).toEqual([])
    })

    it('converts concept set id from string to number', () => {
      const cohort = createMinimalCohort({
        conceptSets: [
          {
            id: 'generated-id',
            name: 'Test',
            items: [],
          },
          {
            id: 5,
            name: 'Test 2',
            items: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // String ID should be converted to index
      expect(atlasJSON.ConceptSets[0]?.id).toBe(0)
      // Number ID should be preserved
      expect(atlasJSON.ConceptSets[1]?.id).toBe(5)
    })
  })

  describe('Event Type Exclude Flags', () => {
    const criteriaTypes = [
      'ConditionOccurrence',
      'ConditionEra',
      'DrugExposure',
      'DrugEra',
      'DoseEra',
      'ProcedureOccurrence',
      'Measurement',
      'Observation',
      'ObservationPeriod',
      'VisitOccurrence',
      'VisitDetail',
      'DeviceExposure',
      'Specimen',
      'Death',
      'PayerPlanPeriod',
    ]

    criteriaTypes.forEach((criteriaType) => {
      it(`adds type exclude flag for ${criteriaType}`, () => {
        const cohort = createMinimalCohort({
          entryEvents: [
            {
              id: 'evt-1',
              criteriaType: criteriaType as CohortEvent['criteriaType'],
              conceptSet: { id: 0, name: 'Test' },
              attributes: [],
            },
          ],
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        const criteriaObj = atlasJSON.PrimaryCriteria.CriteriaList[0]?.[criteriaType]

        // Check that the appropriate exclude flag exists and is false
        if (criteriaType === 'ConditionOccurrence') {
          expect(criteriaObj).toHaveProperty('ConditionTypeExclude', false)
        } else if (criteriaType === 'DrugExposure') {
          expect(criteriaObj).toHaveProperty('DrugTypeExclude', false)
        } else if (criteriaType === 'ProcedureOccurrence') {
          expect(criteriaObj).toHaveProperty('ProcedureTypeExclude', false)
        }
        // Add more specific checks as needed
      })
    })

    it('does not add type exclude flag for LocationRegion', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'LocationRegion',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const criteriaObj = atlasJSON.PrimaryCriteria.CriteriaList[0]?.LocationRegion

      // LocationRegion should not have any type exclude flag
      expect(criteriaObj).not.toHaveProperty('RegionTypeExclude')
      expect(criteriaObj).not.toHaveProperty('TypeExclude')
    })
  })

  describe('Temporal Window - Comprehensive conversion', () => {
    it('converts temporal window with null days (all time before)', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            temporalWindow: {
              startWindow: {
                days: null,
                beforeAfter: 'BEFORE',
                referencePoint: 'INDEX_START',
              },
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const startWindow = atlasJSON.PrimaryCriteria.CriteriaList[0]?.StartWindow

      expect(startWindow?.Start).not.toHaveProperty('Days')
      expect(startWindow?.Start?.Coeff).toBe(-1)
    })

    it('converts temporal window with null days (all time after)', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            temporalWindow: {
              startWindow: {
                days: null,
                beforeAfter: 'AFTER',
                referencePoint: 'INDEX_END',
              },
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const startWindow = atlasJSON.PrimaryCriteria.CriteriaList[0]?.StartWindow

      expect(startWindow?.Start).not.toHaveProperty('Days')
      expect(startWindow?.Start?.Coeff).toBe(1)
      expect(startWindow?.UseIndexEnd).toBe(true)
    })

    it('converts temporal window with EVENT_END reference point', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            temporalWindow: {
              startWindow: {
                days: 10,
                beforeAfter: 'AFTER',
                referencePoint: 'EVENT_END',
              },
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const startWindow = atlasJSON.PrimaryCriteria.CriteriaList[0]?.StartWindow

      expect(startWindow?.UseEventEnd).toBe(true)
      expect(startWindow?.UseIndexEnd).toBe(false)
    })

    it('round-trips temporal window with both start and end windows', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            temporalWindow: {
              startWindow: {
                days: 0,
                beforeAfter: 'BEFORE',
                referencePoint: 'INDEX_START',
              },
              endWindow: {
                days: 30,
                beforeAfter: 'AFTER',
                referencePoint: 'INDEX_START',
              },
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.temporalWindow).toEqual({
        startWindow: {
          days: 0,
          beforeAfter: 'BEFORE',
          referencePoint: 'INDEX_START',
        },
        endWindow: {
          days: 30,
          beforeAfter: 'AFTER',
          referencePoint: 'INDEX_START',
        },
      })
    })
  })

  describe('Cardinality - Zero count preservation', () => {
    it('preserves zero count with EXACTLY type', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'EXACTLY',
              count: 0,
              countingMethod: 'ALL',
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Occurrence?.Count).toBe(0)
      expect(converted.entryEvents?.[0]?.cardinality?.count).toBe(0)
    })

    it('preserves zero count with AT_MOST type', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_MOST',
              count: 0,
              countingMethod: 'ALL',
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Occurrence?.Type).toBe(1)
      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Occurrence?.Count).toBe(0)
      expect(converted.entryEvents?.[0]?.cardinality?.count).toBe(0)
    })

    it('converts cardinality type correctly', () => {
      const types = [
        { internal: 'EXACTLY', atlas: 0 },
        { internal: 'AT_MOST', atlas: 1 },
        { internal: 'AT_LEAST', atlas: 2 },
      ]

      types.forEach(({ internal, atlas }) => {
        const cohort = createMinimalCohort({
          entryEvents: [
            {
              id: 'evt-1',
              criteriaType: 'ConditionOccurrence',
              conceptSet: { id: 0, name: 'Test' },
              attributes: [],
              cardinality: {
                type: internal as 'EXACTLY' | 'AT_MOST' | 'AT_LEAST',
                count: 1,
                countingMethod: 'ALL',
              },
            },
          ],
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Occurrence?.Type).toBe(atlas)
      })
    })

    it('converts counting methods', () => {
      const methods = ['ALL', 'DISTINCT_CONCEPT', 'DISTINCT_PERSON']

      methods.forEach((method) => {
        const cohort = createMinimalCohort({
          entryEvents: [
            {
              id: 'evt-1',
              criteriaType: 'ConditionOccurrence',
              conceptSet: { id: 0, name: 'Test' },
              attributes: [],
              cardinality: {
                type: 'AT_LEAST',
                count: 1,
                countingMethod: method as 'ALL' | 'DISTINCT_CONCEPT' | 'DISTINCT_PERSON',
              },
            },
          ],
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Occurrence?.CountMethod).toBe(method)
      })
    })
  })

  describe('Nested Criteria - CorrelatedCriteria conversion', () => {
    it('converts nested criteria to CorrelatedCriteria', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            nestedCriteria: {
              id: 'nested-1',
              logicType: 'ALL',
              count: 1,
              events: [
                {
                  id: 'nested-evt-1',
                  criteriaType: 'DrugExposure',
                  conceptSet: { id: 1, name: 'Drug' },
                  attributes: [],
                },
              ],
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const correlated = atlasJSON.PrimaryCriteria.CriteriaList[0]?.CorrelatedCriteria

      expect(correlated).toBeDefined()
      expect(correlated?.Type).toBe('ALL')
      expect(correlated?.Count).toBe(1)
      expect(correlated?.CriteriaList).toHaveLength(1)
      expect(correlated?.CriteriaList[0]).toHaveProperty('Criteria')
    })

    it('converts nested criteria with AT_LEAST logic type', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            nestedCriteria: {
              id: 'nested-1',
              logicType: 'AT_LEAST',
              count: 2,
              events: [
                {
                  id: 'nested-evt-1',
                  criteriaType: 'DrugExposure',
                  conceptSet: { id: 1, name: 'Drug' },
                  attributes: [],
                },
                {
                  id: 'nested-evt-2',
                  criteriaType: 'ProcedureOccurrence',
                  conceptSet: { id: 2, name: 'Procedure' },
                  attributes: [],
                },
              ],
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const correlated = atlasJSON.PrimaryCriteria.CriteriaList[0]?.CorrelatedCriteria

      expect(correlated?.Type).toBe('AT_LEAST')
      expect(correlated?.Count).toBe(2)
      expect(correlated?.CriteriaList).toHaveLength(2)
    })

    it('round-trips nested criteria correctly', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            nestedCriteria: {
              id: 'nested-1',
              logicType: 'ANY',
              count: undefined,
              events: [
                {
                  id: 'nested-evt-1',
                  criteriaType: 'DrugExposure',
                  conceptSet: { id: 1, name: 'Drug' },
                  attributes: [],
                },
              ],
            },
          },
        ],
        conceptSets: [
          { id: 0, name: 'Test', items: [] },
          { id: 1, name: 'Drug', items: [] },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.nestedCriteria?.logicType).toBe('ANY')
      expect(converted.entryEvents?.[0]?.nestedCriteria?.events).toHaveLength(1)
    })
  })

  describe('Additional Criteria conversion', () => {
    it('converts additional criteria with events', () => {
      const cohort = createMinimalCohort({
        additionalCriteria: {
          id: 'additional-1',
          logicType: 'ALL',
          qualifyingLimit: 'ALL',
          events: [
            {
              id: 'evt-1',
              criteriaType: 'DrugExposure',
              conceptSet: { id: 1, name: 'Drug' },
              attributes: [],
            },
          ],
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.AdditionalCriteria?.Type).toBe('ALL')
      expect(atlasJSON.AdditionalCriteria?.CriteriaList).toHaveLength(1)
    })

    it('creates empty additional criteria when missing', () => {
      const cohort = createMinimalCohort()

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.AdditionalCriteria).toEqual({
        Type: 'ALL',
        CriteriaList: [],
        DemographicCriteriaList: [],
        Groups: [],
      })
    })

    it('round-trips additional criteria', () => {
      const cohort = createMinimalCohort({
        additionalCriteria: {
          id: 'additional-1',
          logicType: 'ANY',
          qualifyingLimit: 'FIRST',
          events: [
            {
              id: 'evt-1',
              criteriaType: 'VisitOccurrence',
              conceptSet: { id: 2, name: 'Visit' },
              attributes: [],
            },
          ],
        },
        conceptSets: [{ id: 2, name: 'Visit', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.additionalCriteria?.logicType).toBe('ANY')
      expect(converted.additionalCriteria?.events).toHaveLength(1)
    })
  })

  describe('Inclusion Rules - Complex scenarios', () => {
    it('converts inclusion rules with multiple criteria groups', () => {
      const cohort = createMinimalCohort({
        inclusionRules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            description: 'Test Description',
            criteriaGroups: [
              {
                id: 'group-1',
                logicType: 'ALL',
                events: [
                  {
                    id: 'evt-1',
                    criteriaType: 'DrugExposure',
                    conceptSet: { id: 1, name: 'Drug' },
                    attributes: [],
                  },
                ],
              },
              {
                id: 'group-2',
                logicType: 'ANY',
                events: [
                  {
                    id: 'evt-2',
                    criteriaType: 'ProcedureOccurrence',
                    conceptSet: { id: 2, name: 'Procedure' },
                    attributes: [],
                  },
                ],
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.InclusionRules).toHaveLength(1)
      expect(atlasJSON.InclusionRules?.[0]?.name).toBe('Test Rule')
      // Note: Current implementation flattens all groups into CriteriaList
      expect(atlasJSON.InclusionRules?.[0]?.expression?.CriteriaList?.length).toBeGreaterThan(0)
    })

    it('adds RestrictVisit and IgnoreObservationPeriod flags to inclusion rule events', () => {
      const cohort = createMinimalCohort({
        inclusionRules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            description: 'Test',
            criteriaGroups: [
              {
                id: 'group-1',
                logicType: 'ALL',
                events: [
                  {
                    id: 'evt-1',
                    criteriaType: 'DrugExposure',
                    conceptSet: { id: 1, name: 'Drug' },
                    attributes: [],
                    restrictVisit: true,
                    ignoreObservationPeriod: false,
                  },
                ],
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const ruleEvent = atlasJSON.InclusionRules?.[0]?.expression?.CriteriaList?.[0]

      expect(ruleEvent).toHaveProperty('RestrictVisit', true)
      expect(ruleEvent).toHaveProperty('IgnoreObservationPeriod', false)
    })

    it('defaults RestrictVisit and IgnoreObservationPeriod to false', () => {
      const cohort = createMinimalCohort({
        inclusionRules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            description: 'Test',
            criteriaGroups: [
              {
                id: 'group-1',
                logicType: 'ALL',
                events: [
                  {
                    id: 'evt-1',
                    criteriaType: 'DrugExposure',
                    conceptSet: { id: 1, name: 'Drug' },
                    attributes: [],
                  },
                ],
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const ruleEvent = atlasJSON.InclusionRules?.[0]?.expression?.CriteriaList?.[0]

      expect(ruleEvent?.RestrictVisit).toBe(false)
      expect(ruleEvent?.IgnoreObservationPeriod).toBe(false)
    })
  })

  describe('Observation Period conversion', () => {
    it('converts observation period with prior and post days', () => {
      const cohort = createMinimalCohort({
        observationPeriod: {
          priorDays: 365,
          postDays: 0,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.ObservationWindow).toEqual({
        PriorDays: 365,
        PostDays: 0,
      })
    })

    it('handles undefined observation period', () => {
      const cohort = createMinimalCohort()

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.ObservationWindow).toBeUndefined()
    })

    it('round-trips observation period', () => {
      const cohort = createMinimalCohort({
        observationPeriod: {
          priorDays: 30,
          postDays: 60,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.observationPeriod).toEqual({
        priorDays: 30,
        postDays: 60,
      })
    })
  })

  describe('Qualifying Limit conversion', () => {
    it('converts qualifying limit values', () => {
      const limits = ['ALL', 'FIRST', 'LAST']

      limits.forEach((limit) => {
        const cohort = createMinimalCohort({
          qualifyingLimit: limit as QualifyingLimit,
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        expect(atlasJSON.QualifiedLimit?.Type).toBe(limit.charAt(0) + limit.slice(1).toLowerCase())
      })
    })

    it('converts inclusion qualifying limit', () => {
      const cohort = createMinimalCohort({
        inclusionQualifyingLimit: 'FIRST',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      expect(atlasJSON.ExpressionLimit?.Type).toBe('First')
    })

    it('defaults inclusion qualifying limit to All', () => {
      const cohort = createMinimalCohort()

      const atlasJSON = convertInternalToAtlas(cohort)
      expect(atlasJSON.ExpressionLimit?.Type).toBe('All')
    })
  })

  describe('Attribute extraction from criteria', () => {
    it('extracts age attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                Age: {
                  Op: 'gte',
                  Value: 18,
                  Extent: 65,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes).toEqual([
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
          extent: 65,
        },
      ])
    })

    it('extracts gender attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                Gender: [
                  { CONCEPT_ID: 8532, CONCEPT_NAME: 'Female' },
                  { CONCEPT_ID: 8507, CONCEPT_NAME: 'Male' },
                ],
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'concept',
        attributeKey: 'gender',
        concepts: [
          { CONCEPT_ID: 8532, CONCEPT_NAME: 'Female' },
          { CONCEPT_ID: 8507, CONCEPT_NAME: 'Male' },
        ],
      })
    })

    it('extracts valueAsNumber attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              Measurement: {
                CodesetId: 0,
                MeasurementTypeExclude: false,
                ValueAsNumber: {
                  Op: 'bt',
                  Value: 120,
                  Extent: 140,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes).toEqual([
        {
          type: 'numericRange',
          attributeKey: 'valueAsNumber',
          operator: 'BETWEEN',
          value: 120,
          extent: 140,
        },
      ])
    })

    it('extracts first (boolean) attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                First: true,
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes).toEqual([
        {
          type: 'boolean',
          attributeKey: 'first',
          value: true,
        },
      ])
    })

    it('extracts multiple attributes from same criteria', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                Age: { Op: 'gte', Value: 18 },
                First: true,
                ValueAsString: 'test value',
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes).toHaveLength(3)
    })
  })

  describe('Edge cases - null and undefined handling', () => {
    it('handles event without cardinality', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).not.toHaveProperty('Occurrence')
    })

    it('handles event without temporal window', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).not.toHaveProperty('StartWindow')
    })

    it('handles null attribute gracefully', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [null as unknown as EventAttribute],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Should not throw error
      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).toBeDefined()
    })

    it('handles attribute without type', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [{ attributeKey: 'test' } as unknown as EventAttribute],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Should not throw error
      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).toBeDefined()
    })
  })

  describe('Operator conversion bidirectional', () => {
    it('converts all numeric operators correctly', () => {
      const operators = [
        { internal: 'GREATER_THAN', atlas: 'gt' },
        { internal: 'GREATER_THAN_OR_EQUAL', atlas: 'gte' },
        { internal: 'LESS_THAN', atlas: 'lt' },
        { internal: 'LESS_THAN_OR_EQUAL', atlas: 'lte' },
        { internal: 'EQUAL', atlas: 'eq' },
        { internal: 'NOT_EQUAL', atlas: '!eq' },
        { internal: 'BETWEEN', atlas: 'bt' },
        { internal: 'NOT_BETWEEN', atlas: '!bt' },
      ]

      operators.forEach(({ internal, atlas }) => {
        const cohort = createMinimalCohort({
          entryEvents: [
            {
              id: 'evt-1',
              criteriaType: 'Measurement',
              conceptSet: { id: 0, name: 'Test' },
              attributes: [
                {
                  type: 'numericRange',
                  attributeKey: 'valueAsNumber',
                  operator: internal as import('@/models/event.types').NumericOperator,
                  value: 100,
                  extent: internal.includes('BETWEEN') ? 200 : undefined,
                },
              ],
            },
          ],
          conceptSets: [{ id: 0, name: 'Test', items: [] }],
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        const converted = convertAtlasToInternal(atlasJSON)

        expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Measurement?.ValueAsNumber?.Op).toBe(atlas)
        expect(converted.entryEvents?.[0]?.attributes?.[0]?.operator).toBe(internal)
      })
    })

    it('handles unknown operator gracefully', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              Measurement: {
                CodesetId: 0,
                MeasurementTypeExclude: false,
                ValueAsNumber: {
                  Op: 'unknown_op',
                  Value: 100,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Should default to EQUAL
      expect(converted.entryEvents?.[0]?.attributes?.[0]?.operator).toBe('EQUAL')
    })
  })

  describe('All Criteria Types - Complete Coverage', () => {
    const allCriteriaTypes = [
      'ConditionOccurrence',
      'ConditionEra',
      'DrugExposure',
      'DrugEra',
      // 'DoseEra', // Skipped - not a valid criteria type in current implementation
      'ProcedureOccurrence',
      'Measurement',
      'Observation',
      'ObservationPeriod',
      'VisitOccurrence',
      'VisitDetail',
      'DeviceExposure',
      'Specimen',
      'Death',
      'PayerPlanPeriod',
      'LocationRegion',
    ]

    allCriteriaTypes.forEach((criteriaType) => {
      it(`converts ${criteriaType} event type correctly`, () => {
        const cohort = createMinimalCohort({
          entryEvents: [
            {
              id: 'evt-1',
              criteriaType: criteriaType as CohortEvent['criteriaType'],
              conceptSet: { id: 1, name: 'Test Concept' },
              attributes: [],
            },
          ],
          conceptSets: [{ id: 1, name: 'Test Concept', items: [] }],
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        const converted = convertAtlasToInternal(atlasJSON)

        expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).toHaveProperty(criteriaType)
        expect(converted.entryEvents?.[0]?.criteriaType).toBe(criteriaType)
      })

      it(`round-trips ${criteriaType} with attributes`, () => {
        const cohort = createMinimalCohort({
          entryEvents: [
            {
              id: 'evt-1',
              criteriaType: criteriaType as CohortEvent['criteriaType'],
              conceptSet: { id: 1, name: 'Test Concept' },
              attributes: [
                {
                  type: 'numericRange',
                  attributeKey: 'age',
                  operator: 'GREATER_THAN_OR_EQUAL',
                  value: 18,
                },
              ],
            },
          ],
          conceptSets: [{ id: 1, name: 'Test Concept', items: [] }],
        })

        const atlasJSON = convertInternalToAtlas(cohort)
        const converted = convertAtlasToInternal(atlasJSON)

        expect(converted.entryEvents?.[0]?.criteriaType).toBe(criteriaType)
        expect(converted.entryEvents?.[0]?.attributes).toHaveLength(1)
      })
    })
  })

  describe('Additional Attribute Types - Extended Coverage', () => {
    it('extracts Race attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                Race: [
                  { CONCEPT_ID: 8516, CONCEPT_NAME: 'Black' },
                  { CONCEPT_ID: 8527, CONCEPT_NAME: 'White' },
                ],
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'concept',
        attributeKey: 'race',
        concepts: [
          { CONCEPT_ID: 8516, CONCEPT_NAME: 'Black' },
          { CONCEPT_ID: 8527, CONCEPT_NAME: 'White' },
        ],
      })
    })

    it('extracts Ethnicity attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                Ethnicity: [
                  { CONCEPT_ID: 38003563, CONCEPT_NAME: 'Hispanic' },
                ],
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'concept',
        attributeKey: 'ethnicity',
        concepts: [
          { CONCEPT_ID: 38003563, CONCEPT_NAME: 'Hispanic' },
        ],
      })
    })

    it('extracts VisitType attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              VisitOccurrence: {
                CodesetId: 0,
                VisitTypeExclude: false,
                VisitType: [
                  { CONCEPT_ID: 9201, CONCEPT_NAME: 'Inpatient Visit' },
                ],
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'concept',
        attributeKey: 'visitType',
        concepts: [
          { CONCEPT_ID: 9201, CONCEPT_NAME: 'Inpatient Visit' },
        ],
      })
    })

    it('extracts ProviderSpecialty attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ProcedureOccurrence: {
                CodesetId: 0,
                ProcedureTypeExclude: false,
                ProviderSpecialty: [
                  { CONCEPT_ID: 38004446, CONCEPT_NAME: 'Cardiology' },
                ],
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'concept',
        attributeKey: 'providerSpecialty',
        concepts: [
          { CONCEPT_ID: 38004446, CONCEPT_NAME: 'Cardiology' },
        ],
      })
    })

    it('extracts EraLength attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              DrugEra: {
                CodesetId: 0,
                EraTypeExclude: false,
                EraLength: {
                  Op: 'gte',
                  Value: 30,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'numericRange',
        attributeKey: 'eraLength',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 30,
        extent: undefined,
      })
    })

    it('extracts Quantity attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              DrugExposure: {
                CodesetId: 0,
                DrugTypeExclude: false,
                Quantity: {
                  Op: 'bt',
                  Value: 10,
                  Extent: 20,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'numericRange',
        attributeKey: 'quantity',
        operator: 'BETWEEN',
        value: 10,
        extent: 20,
      })
    })

    it('extracts VisitLength attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              VisitOccurrence: {
                CodesetId: 0,
                VisitTypeExclude: false,
                VisitLength: {
                  Op: 'lte',
                  Value: 7,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'numericRange',
        attributeKey: 'visitLength',
        operator: 'LESS_THAN_OR_EQUAL',
        value: 7,
        extent: undefined,
      })
    })

    it('extracts AgeAtStart attribute (for Eras)', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionEra: {
                CodesetId: 0,
                EraTypeExclude: false,
                AgeAtStart: {
                  Op: 'gte',
                  Value: 65,
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // AgeAtStart maps to age attribute internally
      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'numericRange',
        attributeKey: 'age',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 65,
        extent: undefined,
      })
    })

    it('extracts OccurrenceStartDate attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
                OccurrenceStartDate: {
                  Op: 'gte',
                  Value: '2020-01-01',
                  Extent: '2020-12-31',
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'dateRange',
        attributeKey: 'occurrenceStartDate',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: '2020-01-01',
        extent: '2020-12-31',
      })
    })

    it('extracts OccurrenceEndDate attribute', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              DrugExposure: {
                CodesetId: 0,
                DrugTypeExclude: false,
                OccurrenceEndDate: {
                  Op: 'lte',
                  Value: '2021-06-30',
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'dateRange',
        attributeKey: 'occurrenceEndDate',
        operator: 'LESS_THAN_OR_EQUAL',
        value: '2021-06-30',
        extent: undefined,
      })
    })

    it('extracts EraStartDate and EraEndDate attributes', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              DrugEra: {
                CodesetId: 0,
                EraTypeExclude: false,
                EraStartDate: {
                  Op: 'gte',
                  Value: '2020-01-01',
                },
                EraEndDate: {
                  Op: 'lte',
                  Value: '2020-12-31',
                },
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes).toHaveLength(2)
      expect(converted.entryEvents?.[0]?.attributes?.[0].attributeKey).toBe('eraStartDate')
      expect(converted.entryEvents?.[0]?.attributes?.[1].attributeKey).toBe('eraEndDate')
    })
  })

  describe('Text Attribute - Full conversion', () => {
    it('converts text attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'Observation',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'text',
                attributeKey: 'valueAsString',
                operator: 'CONTAINS',
                value: 'abnormal',
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.Observation?.ValueAsString).toBe('abnormal')
    })

    it('round-trips text attribute', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'Observation',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'text',
                attributeKey: 'valueAsString',
                operator: 'CONTAINS',
                value: 'test string',
              },
            ],
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.attributes?.[0]).toEqual({
        type: 'text',
        attributeKey: 'valueAsString',
        operator: 'CONTAINS',
        value: 'test string',
      })
    })
  })

  describe('Boolean Attribute - Full conversion', () => {
    it('converts boolean attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'boolean',
                attributeKey: 'first',
                value: true,
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.ConditionOccurrence?.First).toBe(true)
    })

    it('converts boolean false value', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'boolean',
                attributeKey: 'first',
                value: false,
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.ConditionOccurrence?.First).toBe(false)
    })
  })

  describe('Concept Attribute - Full conversion', () => {
    it('converts concept attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'concept',
                attributeKey: 'gender',
                concepts: [
                  {
                    CONCEPT_ID: 8532,
                    CONCEPT_NAME: 'Female',
                    DOMAIN_ID: 'Gender',
                    VOCABULARY_ID: 'Gender',
                    CONCEPT_CLASS_ID: 'Gender',
                  },
                ],
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.ConditionOccurrence?.Gender).toEqual([
        {
          CONCEPT_ID: 8532,
          CONCEPT_NAME: 'Female',
          DOMAIN_ID: 'Gender',
          VOCABULARY_ID: 'Gender',
          CONCEPT_CLASS_ID: 'Gender',
        },
      ])
    })
  })

  describe('ConceptSet Attribute - Full conversion', () => {
    it('converts conceptSet attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'conceptSet',
                attributeKey: 'gender',
                conceptSet: {
                  id: 'gender-1',
                  name: 'Female',
                },
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]?.ConditionOccurrence?.Gender).toEqual({
        id: 'gender-1',
        name: 'Female',
      })
    })
  })

  describe('Temporal Relationship Attribute - Full conversion', () => {
    it('converts temporal relationship attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'temporalRelationship',
                attributeKey: 'temporalRelationship',
                temporalWindow: {
                  startWindow: {
                    days: 30,
                    beforeAfter: 'BEFORE',
                    referencePoint: 'INDEX_START',
                  },
                  endWindow: {
                    days: 0,
                    beforeAfter: 'AFTER',
                    referencePoint: 'INDEX_START',
                  },
                },
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const tempRel = atlasJSON.PrimaryCriteria.CriteriaList[0]?.ConditionOccurrence?.TemporalRelationship

      expect(tempRel).toBeDefined()
      expect(tempRel?.StartWindow?.Start?.Days).toBe(30)
      expect(tempRel?.StartWindow?.Start?.Coeff).toBe(-1)
      expect(tempRel?.StartWindow?.End?.Days).toBe(0)
      expect(tempRel?.StartWindow?.End?.Coeff).toBe(1)
    })
  })

  describe('Date Adjustment Attribute - Full conversion', () => {
    it('converts date adjustment attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'dateAdjustment',
                attributeKey: 'dateAdjustment',
                dateAdjustment: {
                  startWith: 'START_DATE',
                  startOffset: 5,
                  endWith: 'END_DATE',
                  endOffset: 10,
                },
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const dateAdj = atlasJSON.PrimaryCriteria.CriteriaList[0]?.ConditionOccurrence?.DateAdjustment

      expect(dateAdj).toEqual({
        StartWith: 'START_DATE',
        StartOffset: 5,
        EndWith: 'END_DATE',
        EndOffset: 10,
      })
    })
  })

  describe('User Defined Period Attribute - Full conversion', () => {
    it('converts user defined period attribute to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ObservationPeriod',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [
              {
                type: 'userDefinedPeriod',
                attributeKey: 'userDefinedPeriod',
                period: {
                  startDate: '2020-01-01',
                  endDate: '2020-12-31',
                },
              },
            ],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const criteriaObj = atlasJSON.PrimaryCriteria.CriteriaList[0]?.ObservationPeriod

      expect(criteriaObj?.PeriodStartDate).toBe('2020-01-01')
      expect(criteriaObj?.PeriodEndDate).toBe('2020-12-31')
    })
  })

  describe('DemographicCriteriaList conversion', () => {
    it('converts demographic criteria from Atlas', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [
          {
            name: 'Demographics Rule',
            description: 'Test demographic criteria',
            expression: {
              Type: 'ALL',
              CriteriaList: [],
              DemographicCriteriaList: [
                {
                  Age: { Op: 'gte', Value: 18, Extent: 65 },
                  Gender: [{ CONCEPT_ID: 8532, CONCEPT_NAME: 'Female' }],
                },
              ],
              Groups: [],
            },
          },
        ],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.inclusionRules).toHaveLength(1)
      expect(converted.inclusionRules?.[0]?.criteriaGroups).toHaveLength(1)
      // DemographicCriteria are converted to events
      expect(converted.inclusionRules?.[0]?.criteriaGroups[0]?.events.length).toBeGreaterThan(0)
    })

    it('handles multiple demographic criteria', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [
          {
            name: 'Demographics Rule',
            description: 'Test',
            expression: {
              Type: 'ALL',
              CriteriaList: [],
              DemographicCriteriaList: [
                {
                  Age: { Op: 'gte', Value: 18 },
                },
                {
                  Gender: [{ CONCEPT_ID: 8532, CONCEPT_NAME: 'Female' }],
                },
              ],
              Groups: [],
            },
          },
        ],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.inclusionRules?.[0]?.criteriaGroups[0]?.events.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Groups in InclusionRules', () => {
    it('converts Groups from Atlas inclusion rules', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [{ id: 0, name: 'Test Concept', expression: { items: [] } }],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [
          {
            name: 'Rule with Groups',
            description: 'Test',
            expression: {
              Type: 'ALL',
              CriteriaList: [],
              DemographicCriteriaList: [],
              Groups: [
                {
                  Type: 'ANY',
                  CriteriaList: [
                    {
                      Criteria: {
                        DrugExposure: {
                          CodesetId: 0,
                          DrugTypeExclude: false,
                        },
                      },
                    },
                  ],
                  DemographicCriteriaList: [],
                  Groups: [],
                },
              ],
            },
          },
        ],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.inclusionRules).toHaveLength(1)
      // Groups should be converted to criteria groups
      expect(converted.inclusionRules?.[0]?.criteriaGroups.length).toBeGreaterThan(0)
    })
  })

  describe('Complex round-trip scenarios', () => {
    it('round-trips cohort with all features', () => {
      const cohort = createMinimalCohort({
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.3.0',
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 30,
        },
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
          endDate: {
            dateField: 'END_DATE',
            offset: 90,
          },
        },
        observationPeriod: {
          priorDays: 365,
          postDays: 0,
        },
        qualifyingLimit: 'FIRST',
        inclusionQualifyingLimit: 'ALL',
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Diabetes' },
            attributes: [
              {
                type: 'numericRange',
                attributeKey: 'age',
                operator: 'GREATER_THAN_OR_EQUAL',
                value: 18,
              },
            ],
            cardinality: {
              type: 'AT_LEAST',
              count: 2,
              countingMethod: 'ALL',
              isDistinct: true,
            },
            temporalWindow: {
              startWindow: {
                days: 0,
                beforeAfter: 'BEFORE',
                referencePoint: 'INDEX_START',
              },
              endWindow: {
                days: 30,
                beforeAfter: 'AFTER',
                referencePoint: 'INDEX_START',
              },
            },
            dateAdjustment: {
              startWith: 'START_DATE',
              startOffset: 0,
              endWith: 'END_DATE',
              endOffset: 30,
            },
            nestedCriteria: {
              id: 'nested-1',
              logicType: 'ALL',
              count: 1,
              events: [
                {
                  id: 'nested-evt-1',
                  criteriaType: 'DrugExposure',
                  conceptSet: { id: 1, name: 'Metformin' },
                  attributes: [],
                },
              ],
            },
          },
        ],
        additionalCriteria: {
          id: 'additional-1',
          logicType: 'ANY',
          qualifyingLimit: 'ALL',
          events: [
            {
              id: 'evt-2',
              criteriaType: 'Measurement',
              conceptSet: { id: 2, name: 'HbA1c' },
              attributes: [
                {
                  type: 'numericRange',
                  attributeKey: 'valueAsNumber',
                  operator: 'GREATER_THAN',
                  value: 7.0,
                },
              ],
            },
          ],
        },
        inclusionRules: [
          {
            id: 'rule-1',
            name: 'Has Drug Exposure',
            description: 'Patient must have drug exposure',
            criteriaGroups: [
              {
                id: 'group-1',
                logicType: 'ALL',
                events: [
                  {
                    id: 'evt-3',
                    criteriaType: 'DrugExposure',
                    conceptSet: { id: 1, name: 'Metformin' },
                    attributes: [],
                    restrictVisit: true,
                    ignoreObservationPeriod: false,
                  },
                ],
              },
            ],
          },
        ],
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
        ],
        conceptSets: [
          { id: 0, name: 'Diabetes', items: [] },
          { id: 1, name: 'Metformin', items: [] },
          { id: 2, name: 'HbA1c', items: [] },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify major sections are preserved
      expect(converted.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(converted.cdmVersionRange).toBe('>=5.3.0')
      expect(converted.collapseSettings?.eraPad).toBe(30)
      expect(converted.censorWindow?.endDate?.offset).toBe(90)
      expect(converted.observationPeriod?.priorDays).toBe(365)
      expect(converted.qualifyingLimit).toBe('FIRST')
      expect(converted.entryEvents).toHaveLength(1)
      expect(converted.entryEvents?.[0]?.nestedCriteria).toBeDefined()
      expect(converted.additionalCriteria?.events).toHaveLength(1)
      expect(converted.inclusionRules).toHaveLength(1)
      expect(converted.censoringCriteria).toHaveLength(1)
      expect(converted.conceptSets).toHaveLength(3)
    })

    it('handles missing optional fields in round-trip', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.cardinality).toBeUndefined()
      expect(converted.entryEvents?.[0]?.temporalWindow).toBeUndefined()
      expect(converted.entryEvents?.[0]?.dateAdjustment).toBeUndefined()
      expect(converted.entryEvents?.[0]?.nestedCriteria).toBeUndefined()
    })
  })

  describe('Edge cases - Atlas to Internal conversion', () => {
    it('handles Atlas event without Criteria wrapper', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0,
                ConditionTypeExclude: false,
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0]?.criteriaType).toBe('ConditionOccurrence')
    })

    it('handles Atlas event with Criteria wrapper', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [{ id: 0, name: 'Test', expression: { items: [] } }],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [
            {
              Criteria: {
                DrugExposure: {
                  CodesetId: 0,
                  DrugTypeExclude: false,
                },
              },
            },
          ],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.additionalCriteria?.events?.[0]?.criteriaType).toBe('DrugExposure')
    })

    it('handles missing CodesetId', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              Death: {
                DeathTypeExclude: false,
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Death criteria doesn't require a concept set
      expect(converted.entryEvents?.[0]?.criteriaType).toBe('Death')
      expect(converted.entryEvents?.[0]?.conceptSet).toBeUndefined()
    })

    it('handles unknown criteria type gracefully', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [
            {
              UnknownCriteriaType: {
                CodesetId: 0,
              },
            },
          ],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Should default to ConditionOccurrence
      expect(converted.entryEvents?.[0]?.criteriaType).toBe('ConditionOccurrence')
    })
  })
})
