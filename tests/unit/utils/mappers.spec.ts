/**
 * Mappers Tests
 * Tests for operator, cardinality, and attribute key mappings
 */
import { describe, it, expect } from 'vitest'
import {
  OPERATOR_TO_ATLAS,
  ATLAS_TO_OPERATOR,
  CARDINALITY_TO_ATLAS,
  ATLAS_TO_CARDINALITY,
  ATTRIBUTE_KEY_TO_ATLAS,
  ATLAS_TO_ATTRIBUTE_KEY,
  operatorToAtlas,
  atlasToOperator,
  cardinalityToAtlas,
  atlasToCardinality,
  attributeKeyToAtlas,
  atlasToAttributeKey,
} from '@/utils/mappers'
import type { CardinalityType, NumericOperator, DateOperator } from '@/models/event.types'

describe('Operator Mappers', () => {
  describe('OPERATOR_TO_ATLAS', () => {
    it('should map all numeric operators to Atlas format', () => {
      expect(OPERATOR_TO_ATLAS['GREATER_THAN']).toBe('gt')
      expect(OPERATOR_TO_ATLAS['LESS_THAN']).toBe('lt')
      expect(OPERATOR_TO_ATLAS['EQUAL']).toBe('eq')
      expect(OPERATOR_TO_ATLAS['NOT_EQUAL']).toBe('!eq')
      expect(OPERATOR_TO_ATLAS['BETWEEN']).toBe('bt')
      expect(OPERATOR_TO_ATLAS['NOT_BETWEEN']).toBe('!bt')
      expect(OPERATOR_TO_ATLAS['GREATER_THAN_OR_EQUAL']).toBe('gte')
      expect(OPERATOR_TO_ATLAS['LESS_THAN_OR_EQUAL']).toBe('lte')
    })

    it('should contain exactly 8 operator mappings', () => {
      expect(Object.keys(OPERATOR_TO_ATLAS)).toHaveLength(8)
    })
  })

  describe('ATLAS_TO_OPERATOR', () => {
    it('should map all Atlas operators to internal format', () => {
      expect(ATLAS_TO_OPERATOR['gt']).toBe('GREATER_THAN')
      expect(ATLAS_TO_OPERATOR['lt']).toBe('LESS_THAN')
      expect(ATLAS_TO_OPERATOR['eq']).toBe('EQUAL')
      expect(ATLAS_TO_OPERATOR['!eq']).toBe('NOT_EQUAL')
      expect(ATLAS_TO_OPERATOR['bt']).toBe('BETWEEN')
      expect(ATLAS_TO_OPERATOR['!bt']).toBe('NOT_BETWEEN')
      expect(ATLAS_TO_OPERATOR['gte']).toBe('GREATER_THAN_OR_EQUAL')
      expect(ATLAS_TO_OPERATOR['lte']).toBe('LESS_THAN_OR_EQUAL')
    })

    it('should contain exactly 8 operator mappings', () => {
      expect(Object.keys(ATLAS_TO_OPERATOR)).toHaveLength(8)
    })
  })

  describe('operatorToAtlas', () => {
    it('should convert internal operators to Atlas format', () => {
      expect(operatorToAtlas('GREATER_THAN' as NumericOperator)).toBe('gt')
      expect(operatorToAtlas('LESS_THAN' as NumericOperator)).toBe('lt')
      expect(operatorToAtlas('EQUAL' as NumericOperator)).toBe('eq')
      expect(operatorToAtlas('NOT_EQUAL' as NumericOperator)).toBe('!eq')
      expect(operatorToAtlas('BETWEEN' as NumericOperator)).toBe('bt')
      expect(operatorToAtlas('NOT_BETWEEN' as NumericOperator)).toBe('!bt')
      expect(operatorToAtlas('GREATER_THAN_OR_EQUAL' as NumericOperator)).toBe('gte')
      expect(operatorToAtlas('LESS_THAN_OR_EQUAL' as NumericOperator)).toBe('lte')
    })

    it('should return original value if operator not found', () => {
      expect(operatorToAtlas('UNKNOWN_OPERATOR' as NumericOperator)).toBe('UNKNOWN_OPERATOR')
    })

    it('should handle date operators', () => {
      expect(operatorToAtlas('EQUAL' as DateOperator)).toBe('eq')
      expect(operatorToAtlas('BETWEEN' as DateOperator)).toBe('bt')
    })
  })

  describe('atlasToOperator', () => {
    it('should convert Atlas operators to internal format', () => {
      expect(atlasToOperator('gt')).toBe('GREATER_THAN')
      expect(atlasToOperator('lt')).toBe('LESS_THAN')
      expect(atlasToOperator('eq')).toBe('EQUAL')
      expect(atlasToOperator('!eq')).toBe('NOT_EQUAL')
      expect(atlasToOperator('bt')).toBe('BETWEEN')
      expect(atlasToOperator('!bt')).toBe('NOT_BETWEEN')
      expect(atlasToOperator('gte')).toBe('GREATER_THAN_OR_EQUAL')
      expect(atlasToOperator('lte')).toBe('LESS_THAN_OR_EQUAL')
    })

    it('should return original value if Atlas operator not found', () => {
      expect(atlasToOperator('unknown')).toBe('unknown')
    })
  })
})

describe('Cardinality Mappers', () => {
  describe('CARDINALITY_TO_ATLAS', () => {
    it('should map all cardinality types to Atlas format', () => {
      expect(CARDINALITY_TO_ATLAS['AT_LEAST']).toBe(0)
      expect(CARDINALITY_TO_ATLAS['AT_MOST']).toBe(1)
      expect(CARDINALITY_TO_ATLAS['EXACTLY']).toBe(2)
    })

    it('should contain exactly 3 cardinality mappings', () => {
      expect(Object.keys(CARDINALITY_TO_ATLAS)).toHaveLength(3)
    })
  })

  describe('ATLAS_TO_CARDINALITY', () => {
    it('should map all Atlas cardinality types to internal format', () => {
      expect(ATLAS_TO_CARDINALITY[0]).toBe('AT_LEAST')
      expect(ATLAS_TO_CARDINALITY[1]).toBe('AT_MOST')
      expect(ATLAS_TO_CARDINALITY[2]).toBe('EXACTLY')
    })

    it('should contain exactly 3 cardinality mappings', () => {
      expect(Object.keys(ATLAS_TO_CARDINALITY)).toHaveLength(3)
    })
  })

  describe('cardinalityToAtlas', () => {
    it('should convert internal cardinality types to Atlas format', () => {
      expect(cardinalityToAtlas('AT_LEAST' as CardinalityType)).toBe(0)
      expect(cardinalityToAtlas('AT_MOST' as CardinalityType)).toBe(1)
      expect(cardinalityToAtlas('EXACTLY' as CardinalityType)).toBe(2)
    })
  })

  describe('atlasToCardinality', () => {
    it('should convert Atlas cardinality types to internal format', () => {
      expect(atlasToCardinality(0)).toBe('AT_LEAST')
      expect(atlasToCardinality(1)).toBe('AT_MOST')
      expect(atlasToCardinality(2)).toBe('EXACTLY')
    })
  })
})

describe('Attribute Key Mappers', () => {
  describe('ATTRIBUTE_KEY_TO_ATLAS', () => {
    it('should map all attribute keys from camelCase to PascalCase', () => {
      expect(ATTRIBUTE_KEY_TO_ATLAS['age']).toBe('Age')
      expect(ATTRIBUTE_KEY_TO_ATLAS['gender']).toBe('Gender')
      expect(ATTRIBUTE_KEY_TO_ATLAS['valueAsNumber']).toBe('ValueAsNumber')
      expect(ATTRIBUTE_KEY_TO_ATLAS['valueAsString']).toBe('ValueAsString')
      expect(ATTRIBUTE_KEY_TO_ATLAS['occurrenceStartDate']).toBe('OccurrenceStartDate')
      expect(ATTRIBUTE_KEY_TO_ATLAS['occurrenceEndDate']).toBe('OccurrenceEndDate')
      expect(ATTRIBUTE_KEY_TO_ATLAS['visitLength']).toBe('VisitLength')
      expect(ATTRIBUTE_KEY_TO_ATLAS['eraLength']).toBe('EraLength')
      expect(ATTRIBUTE_KEY_TO_ATLAS['visitStartDate']).toBe('VisitStartDate')
      expect(ATTRIBUTE_KEY_TO_ATLAS['visitEndDate']).toBe('VisitEndDate')
      expect(ATTRIBUTE_KEY_TO_ATLAS['eraStartDate']).toBe('EraStartDate')
      expect(ATTRIBUTE_KEY_TO_ATLAS['eraEndDate']).toBe('EraEndDate')
      expect(ATTRIBUTE_KEY_TO_ATLAS['quantity']).toBe('Quantity')
      expect(ATTRIBUTE_KEY_TO_ATLAS['visitType']).toBe('VisitType')
      expect(ATTRIBUTE_KEY_TO_ATLAS['race']).toBe('Race')
      expect(ATTRIBUTE_KEY_TO_ATLAS['providerSpecialty']).toBe('ProviderSpecialty')
      expect(ATTRIBUTE_KEY_TO_ATLAS['sourceCode']).toBe('SourceCode')
      expect(ATTRIBUTE_KEY_TO_ATLAS['first']).toBe('First')
      expect(ATTRIBUTE_KEY_TO_ATLAS['primary']).toBe('Primary')
    })

    it('should contain exactly 19 attribute key mappings', () => {
      expect(Object.keys(ATTRIBUTE_KEY_TO_ATLAS)).toHaveLength(19)
    })
  })

  describe('ATLAS_TO_ATTRIBUTE_KEY', () => {
    it('should map all attribute keys from PascalCase to camelCase', () => {
      expect(ATLAS_TO_ATTRIBUTE_KEY['Age']).toBe('age')
      expect(ATLAS_TO_ATTRIBUTE_KEY['Gender']).toBe('gender')
      expect(ATLAS_TO_ATTRIBUTE_KEY['ValueAsNumber']).toBe('valueAsNumber')
      expect(ATLAS_TO_ATTRIBUTE_KEY['ValueAsString']).toBe('valueAsString')
      expect(ATLAS_TO_ATTRIBUTE_KEY['OccurrenceStartDate']).toBe('occurrenceStartDate')
      expect(ATLAS_TO_ATTRIBUTE_KEY['OccurrenceEndDate']).toBe('occurrenceEndDate')
      expect(ATLAS_TO_ATTRIBUTE_KEY['VisitLength']).toBe('visitLength')
      expect(ATLAS_TO_ATTRIBUTE_KEY['EraLength']).toBe('eraLength')
      expect(ATLAS_TO_ATTRIBUTE_KEY['VisitStartDate']).toBe('visitStartDate')
      expect(ATLAS_TO_ATTRIBUTE_KEY['VisitEndDate']).toBe('visitEndDate')
      expect(ATLAS_TO_ATTRIBUTE_KEY['EraStartDate']).toBe('eraStartDate')
      expect(ATLAS_TO_ATTRIBUTE_KEY['EraEndDate']).toBe('eraEndDate')
      expect(ATLAS_TO_ATTRIBUTE_KEY['Quantity']).toBe('quantity')
      expect(ATLAS_TO_ATTRIBUTE_KEY['VisitType']).toBe('visitType')
      expect(ATLAS_TO_ATTRIBUTE_KEY['Race']).toBe('race')
      expect(ATLAS_TO_ATTRIBUTE_KEY['ProviderSpecialty']).toBe('providerSpecialty')
      expect(ATLAS_TO_ATTRIBUTE_KEY['SourceCode']).toBe('sourceCode')
      expect(ATLAS_TO_ATTRIBUTE_KEY['First']).toBe('first')
      expect(ATLAS_TO_ATTRIBUTE_KEY['Primary']).toBe('primary')
    })

    it('should contain exactly 19 attribute key mappings', () => {
      expect(Object.keys(ATLAS_TO_ATTRIBUTE_KEY)).toHaveLength(19)
    })

    it('should be dynamically generated from ATTRIBUTE_KEY_TO_ATLAS', () => {
      Object.entries(ATTRIBUTE_KEY_TO_ATLAS).forEach(([camelCase, PascalCase]) => {
        expect(ATLAS_TO_ATTRIBUTE_KEY[PascalCase]).toBe(camelCase)
      })
    })
  })

  describe('attributeKeyToAtlas', () => {
    it('should convert camelCase attribute keys to PascalCase', () => {
      expect(attributeKeyToAtlas('age')).toBe('Age')
      expect(attributeKeyToAtlas('valueAsNumber')).toBe('ValueAsNumber')
      expect(attributeKeyToAtlas('occurrenceStartDate')).toBe('OccurrenceStartDate')
      expect(attributeKeyToAtlas('visitType')).toBe('VisitType')
    })

    it('should return original value if attribute key not found', () => {
      expect(attributeKeyToAtlas('unknownAttribute')).toBe('unknownAttribute')
    })
  })

  describe('atlasToAttributeKey', () => {
    it('should convert PascalCase attribute keys to camelCase', () => {
      expect(atlasToAttributeKey('Age')).toBe('age')
      expect(atlasToAttributeKey('ValueAsNumber')).toBe('valueAsNumber')
      expect(atlasToAttributeKey('OccurrenceStartDate')).toBe('occurrenceStartDate')
      expect(atlasToAttributeKey('VisitType')).toBe('visitType')
    })

    it('should return original value if Atlas attribute key not found', () => {
      expect(atlasToAttributeKey('UnknownAttribute')).toBe('UnknownAttribute')
    })
  })
})

describe('Bidirectional Mapping Consistency', () => {
  it('should have consistent bidirectional mappings for operators', () => {
    Object.entries(OPERATOR_TO_ATLAS).forEach(([internal, atlas]) => {
      expect(ATLAS_TO_OPERATOR[atlas]).toBe(internal)
      expect(operatorToAtlas(internal as NumericOperator)).toBe(atlas)
      expect(atlasToOperator(atlas)).toBe(internal)
    })
  })

  it('should have consistent bidirectional mappings for cardinality', () => {
    Object.entries(CARDINALITY_TO_ATLAS).forEach(([internal, atlas]) => {
      expect(ATLAS_TO_CARDINALITY[atlas]).toBe(internal)
      expect(cardinalityToAtlas(internal as CardinalityType)).toBe(atlas)
      expect(atlasToCardinality(atlas)).toBe(internal)
    })
  })

  it('should have consistent bidirectional mappings for attribute keys', () => {
    Object.entries(ATTRIBUTE_KEY_TO_ATLAS).forEach(([internal, atlas]) => {
      expect(ATLAS_TO_ATTRIBUTE_KEY[atlas]).toBe(internal)
      expect(attributeKeyToAtlas(internal)).toBe(atlas)
      expect(atlasToAttributeKey(atlas)).toBe(internal)
    })
  })

  it('should have equal number of mappings in both directions', () => {
    expect(Object.keys(OPERATOR_TO_ATLAS).length).toBe(Object.keys(ATLAS_TO_OPERATOR).length)
    expect(Object.keys(CARDINALITY_TO_ATLAS).length).toBe(Object.keys(ATLAS_TO_CARDINALITY).length)
    expect(Object.keys(ATTRIBUTE_KEY_TO_ATLAS).length).toBe(Object.keys(ATLAS_TO_ATTRIBUTE_KEY).length)
  })
})
