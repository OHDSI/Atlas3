/**
 * useAttributeConfig Composable Tests
 * Tests for attribute configuration with i18n integration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Mock configLoaderService
vi.mock('@/services/config-loader.service', () => ({
  configLoaderService: {
    getAttributesForFilter: vi.fn(),
  },
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: vi.fn(() => ({
    tv: vi.fn((key, fallback) => fallback || key),
  })),
}))

import { useAttributeConfig } from '@/composables/useAttributeConfig'
import { configLoaderService } from '@/services/config-loader.service'

describe('useAttributeConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Default mock implementation
    vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])
  })

  describe('attributes', () => {
    it('should return empty array when no attributes configured', () => {
      const filterType = ref('conditionOccurrence')

      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value).toEqual([])
    })

    it('should return configured attributes', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        {
          id: 'age',
          type: 'numericRange',
          nameKey: 'attributes.age.name',
        },
        {
          id: 'occurrenceCount',
          type: 'numericRange',
          name: 'Occurrence Count', // Plain text
        },
      ] as any)

      const filterType = ref('conditionOccurrence')

      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value).toHaveLength(2)
      expect(attributes.value[0].key).toBe('age')
      expect(attributes.value[0].type).toBe('numericRange')
    })

    it('should use section parameter', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('conditionOccurrence')
      const section = ref('initialEvents')

      const { attributes } = useAttributeConfig(filterType, section)
      // Access the computed to trigger evaluation
      void attributes.value

      expect(configLoaderService.getAttributesForFilter).toHaveBeenCalledWith(
        'conditionOccurrence',
        'initialEvents'
      )
    })

    it('should default section to criteriaGroup', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('conditionOccurrence')

      const { attributes } = useAttributeConfig(filterType)
      // Access the computed to trigger evaluation
      void attributes.value

      expect(configLoaderService.getAttributesForFilter).toHaveBeenCalledWith(
        'conditionOccurrence',
        'criteriaGroup'
      )
    })
  })

  describe('getAttribute', () => {
    it('should return attribute config by key', () => {
      const mockAttr = {
        id: 'age',
        type: 'numericRange',
        nameKey: 'attributes.age.name',
      }

      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([mockAttr] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttribute } = useAttributeConfig(filterType)

      const result = getAttribute('age')

      expect(result).toEqual(mockAttr)
    })

    it('should return undefined for unknown attribute', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange' }
      ] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttribute } = useAttributeConfig(filterType)

      const result = getAttribute('unknownAttribute')

      expect(result).toBeUndefined()
    })
  })

  describe('getAttributeLabel', () => {
    it('should return humanized key when attribute not found', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('conditionOccurrence')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      const result = getAttributeLabel('valueAsNumber')

      expect(result).toBe('Value As Number')
    })

    it('should use nameKey for i18n translation', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        {
          id: 'age',
          type: 'numericRange',
          nameKey: 'attributes.age.name',
        }
      ] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      const result = getAttributeLabel('age')

      // Falls back to humanized key since tv mock returns fallback
      expect(result).toBe('Age')
    })

    it('should use plain text name when available', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        {
          id: 'age',
          type: 'numericRange',
          name: 'Patient Age',
        }
      ] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      const result = getAttributeLabel('age')

      expect(result).toBe('Patient Age')
    })

    it('should humanize camelCase keys correctly', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('conditionOccurrence')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      expect(getAttributeLabel('conditionType')).toBe('Condition Type')
      expect(getAttributeLabel('age')).toBe('Age')
      expect(getAttributeLabel('observationPeriodDays')).toBe('Observation Period Days')
    })
  })

  describe('getAttributeDescription', () => {
    it('should return empty string when attribute not found', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('conditionOccurrence')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      const result = getAttributeDescription('unknownAttribute')

      expect(result).toBe('')
    })

    it('should use descriptionKey for i18n translation', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        {
          id: 'age',
          type: 'numericRange',
          descriptionKey: 'attributes.age.description',
        }
      ] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      const result = getAttributeDescription('age')

      // tv mock returns key when fallback is empty string
      expect(result).toBe('attributes.age.description')
    })

    it('should use plain text description when available', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        {
          id: 'age',
          type: 'numericRange',
          description: 'Patient age at diagnosis',
        }
      ] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      const result = getAttributeDescription('age')

      expect(result).toBe('Patient age at diagnosis')
    })

    it('should return empty string when no description configured', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        {
          id: 'age',
          type: 'numericRange',
        }
      ] as any)

      const filterType = ref('conditionOccurrence')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      const result = getAttributeDescription('age')

      expect(result).toBe('')
    })
  })

  describe('reactivity', () => {
    it('should update attributes when filterType changes', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockImplementation((filterType) => {
        if (filterType === 'conditionOccurrence') {
          return [{ id: 'conditionAttr', type: 'text' }] as any
        }
        if (filterType === 'drugExposure') {
          return [{ id: 'drugAttr', type: 'text' }] as any
        }
        return []
      })

      const filterType = ref('conditionOccurrence')
      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value[0]?.key).toBe('conditionAttr')

      filterType.value = 'drugExposure'

      expect(attributes.value[0]?.key).toBe('drugAttr')
    })
  })
})
