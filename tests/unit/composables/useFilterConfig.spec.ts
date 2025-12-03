/**
 * Unit Tests: useFilterConfig Composable
 * Tests for src/composables/useFilterConfig.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Mock config loader service
vi.mock('@/services/config-loader.service', () => ({
  configLoaderService: {
    getValidationResult: vi.fn(),
    getValidFilterTypesForSection: vi.fn(),
    getFilterConfig: vi.fn(),
    onConfigurationChange: vi.fn(),
  },
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    tv: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { useFilterConfig } from '@/composables/useFilterConfig'
import { configLoaderService } from '@/services/config-loader.service'

describe('useFilterConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Default mock setup
    vi.mocked(configLoaderService.getValidationResult).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
      validFilterTypes: ['conditionOccurrence', 'drugExposure'],
      invalidFilterTypes: [],
      timestamp: new Date(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('availableFilters', () => {
    it('returns filters for current section', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'conditionOccurrence',
        'drugExposure',
      ])
      vi.mocked(configLoaderService.getFilterConfig).mockImplementation((key: string) => {
        const configs: Record<string, unknown> = {
          conditionOccurrence: {
            name: 'Condition Occurrence',
            descriptions: { all: 'Find patients with conditions' },
            requiresConceptSet: true,
            groupOnly: false,
          },
          drugExposure: {
            name: 'Drug Exposure',
            descriptions: { all: 'Find patients with drug exposures' },
            requiresConceptSet: true,
            groupOnly: false,
          },
        }
        return configs[key] as ReturnType<typeof configLoaderService.getFilterConfig>
      })

      const section = ref('initialEvents')
      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value).toHaveLength(2)
      expect(availableFilters.value[0].key).toBe('conditionOccurrence')
      expect(availableFilters.value[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('converts camelCase to PascalCase for criteriaType', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'procedureOccurrence',
      ])
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Procedure',
        descriptions: { all: 'Procedures' },
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value[0].criteriaType).toBe('ProcedureOccurrence')
    })

    it('resolves i18n keys for name', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue(['measurement'])
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        nameKey: 'criteria.measurement.name',
        descriptions: { all: 'Measurements' },
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { availableFilters } = useFilterConfig(section)

      // With mock tv returning key, should return 'measurement' as fallback
      expect(availableFilters.value[0].name).toBe('measurement')
    })

    it('excludes filters with no config', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'validFilter',
        'invalidFilter',
      ])
      vi.mocked(configLoaderService.getFilterConfig).mockImplementation((key: string) => {
        if (key === 'validFilter') {
          return { name: 'Valid', descriptions: { all: 'Valid desc' } } as ReturnType<
            typeof configLoaderService.getFilterConfig
          >
        }
        return undefined
      })

      const section = ref('initialEvents')
      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value).toHaveLength(1)
      expect(availableFilters.value[0].key).toBe('validFilter')
    })

    it('sorts filters alphabetically by name', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([
        'measurement',
        'condition',
        'drug',
      ])
      vi.mocked(configLoaderService.getFilterConfig).mockImplementation((key: string) => {
        const configs: Record<string, unknown> = {
          measurement: { name: 'Zebra Measurement', descriptions: { all: 'Measurements' } },
          condition: { name: 'Alpha Condition', descriptions: { all: 'Conditions' } },
          drug: { name: 'Beta Drug', descriptions: { all: 'Drugs' } },
        }
        return configs[key] as ReturnType<typeof configLoaderService.getFilterConfig>
      })

      const section = ref('initialEvents')
      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value[0].name).toBe('Alpha Condition')
      expect(availableFilters.value[1].name).toBe('Beta Drug')
      expect(availableFilters.value[2].name).toBe('Zebra Measurement')
    })

    it('updates when section changes', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockImplementation(
        (section: string) => {
          if (section === 'initialEvents') return ['filter1']
          if (section === 'censoringEvents') return ['filter2']
          return []
        }
      )
      vi.mocked(configLoaderService.getFilterConfig).mockImplementation((key: string) => ({
        name: key,
        descriptions: { all: key },
      })) as ReturnType<typeof configLoaderService.getFilterConfig>

      const section = ref('initialEvents')
      const { availableFilters } = useFilterConfig(section)

      expect(availableFilters.value[0].key).toBe('filter1')

      section.value = 'censoringEvents'
      expect(availableFilters.value[0].key).toBe('filter2')
    })
  })

  describe('getFilterDescription', () => {
    it('returns context-specific description', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue(['testFilter'])
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: {
          initial: 'Initial events description',
          censoring: 'Censoring events description',
          group: 'Group description',
          all: 'Default description',
        },
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { getFilterDescription } = useFilterConfig(section)

      expect(getFilterDescription('testFilter')).toBe('Initial events description')

      section.value = 'censoringEvents'
      expect(getFilterDescription('testFilter')).toBe('Censoring events description')
    })

    it('falls back to "all" description', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue(['testFilter'])
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: {
          all: 'All sections description',
        },
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { getFilterDescription } = useFilterConfig(section)

      expect(getFilterDescription('testFilter')).toBe('All sections description')
    })

    it('returns fallback for unknown filter', () => {
      vi.mocked(configLoaderService.getValidFilterTypesForSection).mockReturnValue([])
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue(undefined)

      const section = ref('initialEvents')
      const { getFilterDescription } = useFilterConfig(section)

      expect(getFilterDescription('unknown')).toBe('unknown')
    })
  })

  describe('requiresConceptSet', () => {
    it('returns true when filter requires concept set', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: { all: 'Test' },
        requiresConceptSet: true,
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { requiresConceptSet } = useFilterConfig(section)

      expect(requiresConceptSet('test')).toBe(true)
    })

    it('returns false when filter does not require concept set', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: { all: 'Test' },
        requiresConceptSet: false,
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { requiresConceptSet } = useFilterConfig(section)

      expect(requiresConceptSet('test')).toBe(false)
    })

    it('defaults to true when not specified', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: { all: 'Test' },
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { requiresConceptSet } = useFilterConfig(section)

      expect(requiresConceptSet('test')).toBe(true)
    })
  })

  describe('isGroupOnly', () => {
    it('returns true when filter is group-only', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: { all: 'Test' },
        groupOnly: true,
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { isGroupOnly } = useFilterConfig(section)

      expect(isGroupOnly('test')).toBe(true)
    })

    it('returns false when filter is not group-only', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: { all: 'Test' },
        groupOnly: false,
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { isGroupOnly } = useFilterConfig(section)

      expect(isGroupOnly('test')).toBe(false)
    })

    it('defaults to false when not specified', () => {
      vi.mocked(configLoaderService.getFilterConfig).mockReturnValue({
        name: 'Test',
        descriptions: { all: 'Test' },
      } as ReturnType<typeof configLoaderService.getFilterConfig>)

      const section = ref('initialEvents')
      const { isGroupOnly } = useFilterConfig(section)

      expect(isGroupOnly('test')).toBe(false)
    })
  })

  describe('validationResult', () => {
    it('exposes validation result from service', () => {
      const mockResult = {
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['filter1'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue(mockResult)

      const section = ref('initialEvents')
      const { validationResult } = useFilterConfig(section)

      expect(validationResult.value).toEqual(mockResult)
    })
  })

  describe('hasInvalidFilters', () => {
    it('returns true when there are invalid filters', () => {
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue({
        valid: false,
        errors: [],
        warnings: [],
        validFilterTypes: ['filter1'],
        invalidFilterTypes: ['filter2'],
        timestamp: new Date(),
      })

      const section = ref('initialEvents')
      const { hasInvalidFilters } = useFilterConfig(section)

      expect(hasInvalidFilters.value).toBe(true)
    })

    it('returns false when all filters are valid', () => {
      vi.mocked(configLoaderService.getValidationResult).mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['filter1', 'filter2'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      })

      const section = ref('initialEvents')
      const { hasInvalidFilters } = useFilterConfig(section)

      expect(hasInvalidFilters.value).toBe(false)
    })
  })

  describe('configuration change subscription', () => {
    it('registers callback with configLoaderService', () => {
      const section = ref('initialEvents')
      useFilterConfig(section)

      expect(configLoaderService.onConfigurationChange).toHaveBeenCalled()
    })
  })
})
