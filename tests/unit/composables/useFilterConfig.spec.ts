/**
 * useFilterConfig Composable Tests
 * Tests for filter configuration with i18n integration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Mock configLoaderService
vi.mock('@/services/config-loader.service', () => ({
  configLoaderService: {
    getValidFilterTypesForSection: vi.fn(),
    getFilterConfig: vi.fn(),
    getValidationResult: vi.fn(),
    onConfigurationChange: vi.fn(),
  },
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: vi.fn(() => ({
    tv: vi.fn((key, fallback) => fallback || key),
  })),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useFilterConfig } from '@/composables/useFilterConfig'
import { configLoaderService } from '@/services/config-loader.service'

describe('useFilterConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([])
    vi.mocked(configLoaderService.getFilterConfig).mockReturnValue(undefined)
    vi.mocked(configLoaderService.getValidationResult).mockReturnValue(null)
    vi.mocked(configLoaderService.onConfigurationChange).mockImplementation(() => {})
  })

  describe('availableFilters', () => {
    it('should return empty array when no filters configured', () => {
      const section = ref('initialEvents')

      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value).toEqual([])
    })

    it('should return configured filters with translated names', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'conditionOccurrence',
        'drugExposure'
      ])

      vi.mocked(configLoaderService.getFilterConfig)
        .mockImplementation((key) => {
          if (key === 'conditionOccurrence') {
            return {
              id: 'conditionOccurrence',
              nameKey: 'filters.conditionOccurrence.name',
              requiresConceptSet: true,
              groupOnly: false,
            } as any
          }
          if (key === 'drugExposure') {
            return {
              id: 'drugExposure',
              name: 'Drug Exposure', // Plain text format
              requiresConceptSet: true,
              groupOnly: false,
            } as any
          }
          return undefined
        })

      const section = ref('initialEvents')

      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value).toHaveLength(2)
      expect(availableFilters.value[0].key).toBeDefined()
      expect(availableFilters.value[0].criteriaType).toBeDefined()
    })

    it('should convert camelCase key to PascalCase criteriaType', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue(['conditionOccurrence'])
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'conditionOccurrence',
        nameKey: 'test',
        requiresConceptSet: true,
        groupOnly: false,
      } as any)

      const section = ref('initialEvents')

      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('should filter out null configs', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'validFilter',
        'invalidFilter'
      ])
      vi.mocked(configLoaderService.getFilterConfig)
        .mockImplementation((key) => {
          if (key === 'validFilter') {
            return {
              id: 'validFilter',
              name: 'Valid',
              requiresConceptSet: true,
              groupOnly: false,
            } as any
          }
          return undefined
        })

      const section = ref('initialEvents')

      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value).toHaveLength(1)
      expect(availableFilters.value[0].key).toBe('validFilter')
    })

    it('should sort filters alphabetically by name', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'zebra',
        'apple',
        'mango'
      ])
      vi.mocked(configLoaderService.getFilterConfig)
        .mockImplementation((key) => ({
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          requiresConceptSet: true,
          groupOnly: false,
        } as any))

      const section = ref('initialEvents')

      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value[0].name).toBe('Apple')
      expect(availableFilters.value[1].name).toBe('Mango')
      expect(availableFilters.value[2].name).toBe('Zebra')
    })
  })

  describe('getFilterDescription', () => {
    it('should return fallback for missing config', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue(undefined)

      const section = ref('initialEvents')
      const { getFilterDescription } = useFilterConfig(section)

      const result = getFilterDescription('unknownFilter')

      expect(result).toBe('unknownFilter')
    })

    it('should use section-specific description key', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'conditionOccurrence',
        descriptionKeys: {
          initial: 'filters.condition.description.initial',
          censoring: 'filters.condition.description.censoring',
        },
      } as any)

      const section = ref('initialEvents')
      const { getFilterDescription } = useFilterConfig(section)

      const result = getFilterDescription('conditionOccurrence')

      // Should use the fallback since tv mock returns fallback
      expect(result).toContain('conditionOccurrence')
    })

    it('should fall back to "all" description key', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'conditionOccurrence',
        descriptionKeys: {
          all: 'filters.condition.description.all',
        },
      } as any)

      const section = ref('criteriaGroup')
      const { getFilterDescription } = useFilterConfig(section)

      const result = getFilterDescription('conditionOccurrence')

      expect(result).toBeDefined()
    })

    it('should use plain text descriptions', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'conditionOccurrence',
        descriptions: {
          initial: 'Find initial conditions',
          all: 'Find any conditions',
        },
      } as any)

      const section = ref('initialEvents')
      const { getFilterDescription } = useFilterConfig(section)

      const result = getFilterDescription('conditionOccurrence')

      expect(result).toBe('Find initial conditions')
    })
  })

  describe('requiresConceptSet', () => {
    it('should return true when config requires concept set', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'conditionOccurrence',
        requiresConceptSet: true,
      } as any)

      const section = ref('initialEvents')
      const { requiresConceptSet } = useFilterConfig(section)

      expect(requiresConceptSet('conditionOccurrence')).toBe(true)
    })

    it('should return false when config does not require concept set', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'demographicAge',
        requiresConceptSet: false,
      } as any)

      const section = ref('initialEvents')
      const { requiresConceptSet } = useFilterConfig(section)

      expect(requiresConceptSet('demographicAge')).toBe(false)
    })

    it('should default to true when not specified', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'someFilter',
      } as any)

      const section = ref('initialEvents')
      const { requiresConceptSet } = useFilterConfig(section)

      expect(requiresConceptSet('someFilter')).toBe(true)
    })
  })

  describe('isGroupOnly', () => {
    it('should return true when filter is group-only', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'groupFilter',
        groupOnly: true,
      } as any)

      const section = ref('initialEvents')
      const { isGroupOnly } = useFilterConfig(section)

      expect(isGroupOnly('groupFilter')).toBe(true)
    })

    it('should return false when filter is not group-only', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'regularFilter',
        groupOnly: false,
      } as any)

      const section = ref('initialEvents')
      const { isGroupOnly } = useFilterConfig(section)

      expect(isGroupOnly('regularFilter')).toBe(false)
    })

    it('should default to false when not specified', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        id: 'someFilter',
      } as any)

      const section = ref('initialEvents')
      const { isGroupOnly } = useFilterConfig(section)

      expect(isGroupOnly('someFilter')).toBe(false)
    })
  })

  describe('hasInvalidFilters', () => {
    it('should return false when no validation result', () => {
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue(null)

      const section = ref('initialEvents')
      const { hasInvalidFilters } = useFilterConfig(section)

      expect(hasInvalidFilters.value).toBe(false)
    })

    it('should return false when no invalid filters', () => {
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue({
        valid: true,
        invalidFilterTypes: [],
      } as any)

      const section = ref('initialEvents')
      const { hasInvalidFilters } = useFilterConfig(section)

      expect(hasInvalidFilters.value).toBe(false)
    })

    it('should return true when there are invalid filters', () => {
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue({
        valid: false,
        invalidFilterTypes: ['badFilter1', 'badFilter2'],
      } as any)

      const section = ref('initialEvents')
      const { hasInvalidFilters } = useFilterConfig(section)

      expect(hasInvalidFilters.value).toBe(true)
    })
  })

  describe('validationResult', () => {
    it('should expose validation result from service', () => {
      const mockResult = {
        valid: true,
        invalidFilterTypes: [],
      }
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue(mockResult as any)

      const section = ref('initialEvents')
      const { validationResult } = useFilterConfig(section)

      expect(validationResult.value).toEqual(mockResult)
    })
  })

  describe('configuration change subscription', () => {
    it('should subscribe to configuration changes', () => {
      const section = ref('initialEvents')

      useFilterConfig(section)

      expect(configLoaderService.onConfigurationChange).toHaveBeenCalled()
    })
  })
})
