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
} from '@/utils/mappers'

describe('Operator Mappers', () => {
  describe('OPERATOR_TO_ATLAS', () => {
    it('should map GREATER_THAN to gt', () => {
      expect(OPERATOR_TO_ATLAS['GREATER_THAN']).toBe('gt')
    })

    it('should map LESS_THAN to lt', () => {
      expect(OPERATOR_TO_ATLAS['LESS_THAN']).toBe('lt')
    })

    it('should map EQUAL to eq', () => {
      expect(OPERATOR_TO_ATLAS['EQUAL']).toBe('eq')
    })

    it('should map NOT_EQUAL to !eq', () => {
      expect(OPERATOR_TO_ATLAS['NOT_EQUAL']).toBe('!eq')
    })

    it('should map BETWEEN to bt', () => {
      expect(OPERATOR_TO_ATLAS['BETWEEN']).toBe('bt')
    })
  })

  describe('ATLAS_TO_OPERATOR', () => {
    it('should map gt to GREATER_THAN', () => {
      expect(ATLAS_TO_OPERATOR['gt']).toBe('GREATER_THAN')
    })

    it('should map lt to LESS_THAN', () => {
      expect(ATLAS_TO_OPERATOR['lt']).toBe('LESS_THAN')
    })

    it('should map eq to EQUAL', () => {
      expect(ATLAS_TO_OPERATOR['eq']).toBe('EQUAL')
    })

    it('should map !eq to NOT_EQUAL', () => {
      expect(ATLAS_TO_OPERATOR['!eq']).toBe('NOT_EQUAL')
    })

    it('should map bt to BETWEEN', () => {
      expect(ATLAS_TO_OPERATOR['bt']).toBe('BETWEEN')
    })
  })
})

describe('Cardinality Mappers', () => {
  describe('CARDINALITY_TO_ATLAS', () => {
    it('should map AT_LEAST to 0', () => {
      expect(CARDINALITY_TO_ATLAS['AT_LEAST']).toBe(0)
    })

    it('should map AT_MOST to 1', () => {
      expect(CARDINALITY_TO_ATLAS['AT_MOST']).toBe(1)
    })

    it('should map EXACTLY to 2', () => {
      expect(CARDINALITY_TO_ATLAS['EXACTLY']).toBe(2)
    })
  })

  describe('ATLAS_TO_CARDINALITY', () => {
    it('should map 0 to AT_LEAST', () => {
      expect(ATLAS_TO_CARDINALITY[0]).toBe('AT_LEAST')
    })

    it('should map 1 to AT_MOST', () => {
      expect(ATLAS_TO_CARDINALITY[1]).toBe('AT_MOST')
    })

    it('should map 2 to EXACTLY', () => {
      expect(ATLAS_TO_CARDINALITY[2]).toBe('EXACTLY')
    })
  })
})

describe('Attribute Key Mappers', () => {
  describe('ATTRIBUTE_KEY_TO_ATLAS', () => {
    it('should map camelCase to PascalCase', () => {
      expect(ATTRIBUTE_KEY_TO_ATLAS['age']).toBe('Age')
      expect(ATTRIBUTE_KEY_TO_ATLAS['gender']).toBe('Gender')
      expect(ATTRIBUTE_KEY_TO_ATLAS['valueAsNumber']).toBe('ValueAsNumber')
    })
  })

  describe('ATLAS_TO_ATTRIBUTE_KEY', () => {
    it('should map PascalCase to camelCase', () => {
      expect(ATLAS_TO_ATTRIBUTE_KEY['Age']).toBe('age')
      expect(ATLAS_TO_ATTRIBUTE_KEY['Gender']).toBe('gender')
      expect(ATLAS_TO_ATTRIBUTE_KEY['ValueAsNumber']).toBe('valueAsNumber')
    })
  })

  describe('Bidirectional mapping consistency', () => {
    it('should have consistent bidirectional mappings for operators', () => {
      Object.entries(OPERATOR_TO_ATLAS).forEach(([internal, atlas]) => {
        expect(ATLAS_TO_OPERATOR[atlas]).toBe(internal)
      })
    })

    it('should have consistent bidirectional mappings for cardinality', () => {
      Object.entries(CARDINALITY_TO_ATLAS).forEach(([internal, atlas]) => {
        expect(ATLAS_TO_CARDINALITY[atlas]).toBe(internal)
      })
    })

    it('should have consistent bidirectional mappings for attribute keys', () => {
      Object.entries(ATTRIBUTE_KEY_TO_ATLAS).forEach(([internal, atlas]) => {
        expect(ATLAS_TO_ATTRIBUTE_KEY[atlas]).toBe(internal)
      })
    })
  })
})
