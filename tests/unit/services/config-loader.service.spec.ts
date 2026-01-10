/**
 * Config Loader Service Tests
 * Tests for configuration loading and validation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock config JSON
vi.mock('@/config/atlas-config.json', () => ({
  default: {
    criteriaTypes: {
      conditionOccurrence: {
        type: 'conditionOccurrence',
        label: 'Condition Occurrence',
        domain: 'condition',
      },
      drugExposure: {
        type: 'drugExposure',
        label: 'Drug Exposure',
        domain: 'drug',
        groupOnly: true,
      },
    },
    attributeMapping: {
      conditionOccurrence: [
        { id: 'startDate', type: 'date' },
        { id: 'endDate', type: 'date', excludeFromSections: ['initialEvents'] },
      ],
    },
    sections: [
      { id: 'initialEvents', label: 'Initial Events', excludeTypes: [] },
      { id: 'criteriaGroup', label: 'Criteria Group', includeAll: true },
    ],
  },
}))

// Mock validator
vi.mock('@/utils/config-validator', () => ({
  validateAtlasConfig: vi.fn((_config) => ({
    valid: true,
    errors: [],
    warnings: [],
    validFilterTypes: ['conditionOccurrence', 'drugExposure'],
    invalidFilterTypes: [],
    timestamp: new Date(),
  })),
  formatValidationSummary: vi.fn(() => 'Validation summary'),
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

import { ConfigLoaderService, configLoaderService } from '@/services/config-loader.service'
import { validateAtlasConfig } from '@/utils/config-validator'

describe('ConfigLoaderService', () => {
  let service: ConfigLoaderService

  beforeEach(() => {
    service = new ConfigLoaderService()
    vi.clearAllMocks()

    // Mock performance API
    if (!global.performance) {
      global.performance = {
        mark: vi.fn(),
        measure: vi.fn(),
      } as unknown as Performance
    } else {
      vi.spyOn(performance, 'mark').mockImplementation(() => undefined as unknown as PerformanceMark)
      vi.spyOn(performance, 'measure').mockImplementation(() => undefined as unknown as PerformanceMeasure)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadConfiguration', () => {
    it('should load and validate configuration', async () => {
      const result = await service.loadConfiguration()

      expect(validateAtlasConfig).toHaveBeenCalled()
      expect(result.valid).toBe(true)
      expect(result.validFilterTypes).toContain('conditionOccurrence')
    })

    it('should store config after loading', async () => {
      await service.loadConfiguration()

      const config = service.getFilterConfig('conditionOccurrence')
      expect(config).toBeDefined()
    })

    it('should record performance marks', async () => {
      await service.loadConfiguration()

      expect(performance.mark).toHaveBeenCalledWith('config-load-start')
      expect(performance.mark).toHaveBeenCalledWith('config-load-end')
      expect(performance.measure).toHaveBeenCalledWith(
        'config-load',
        'config-load-start',
        'config-load-end'
      )
    })

    it('should handle validation errors gracefully', async () => {
      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: false,
        errors: [{ message: 'Test error', code: 'TEST' }],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: ['invalid'],
        timestamp: new Date(),
      })

      const result = await service.loadConfiguration()

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('getFilterConfig', () => {
    it('should return undefined before loading', () => {
      expect(service.getFilterConfig('conditionOccurrence')).toBeUndefined()
    })

    it('should return filter config after loading', async () => {
      await service.loadConfiguration()

      const config = service.getFilterConfig('conditionOccurrence')
      expect(config).toBeDefined()
      expect(config?.type).toBe('conditionOccurrence')
    })

    it('should return undefined for invalid filter type', async () => {
      await service.loadConfiguration()

      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: [], // Empty valid types
        invalidFilterTypes: ['conditionOccurrence'],
        timestamp: new Date(),
      })

      await service.loadConfiguration()
      expect(service.getFilterConfig('conditionOccurrence')).toBeUndefined()
    })
  })

  describe('getValidFilterTypesForSection', () => {
    it('should return empty array before loading', () => {
      expect(service.getValidFilterTypesForSection('initialEvents')).toEqual([])
    })

    it('should return valid filter types for section', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypesForSection('initialEvents')
      expect(types).toContain('conditionOccurrence')
    })

    it('should exclude groupOnly filters from non-criteriaGroup sections', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypesForSection('initialEvents')
      expect(types).not.toContain('drugExposure')
    })

    it('should include groupOnly filters in criteriaGroup section', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypesForSection('criteriaGroup')
      expect(types).toContain('drugExposure')
    })

    it('should return empty array for unknown section', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypesForSection('unknownSection')
      expect(types).toEqual([])
    })
  })

  describe('getAttributesForFilter', () => {
    it('should return empty array before loading', () => {
      expect(service.getAttributesForFilter('conditionOccurrence', 'initialEvents')).toEqual([])
    })

    it('should return attributes for filter', async () => {
      await service.loadConfiguration()

      const attrs = service.getAttributesForFilter('conditionOccurrence', 'criteriaGroup')
      expect(attrs.length).toBeGreaterThan(0)
    })

    it('should filter attributes based on section exclusions', async () => {
      await service.loadConfiguration()

      const attrsInitial = service.getAttributesForFilter('conditionOccurrence', 'initialEvents')
      const attrsCriteria = service.getAttributesForFilter('conditionOccurrence', 'criteriaGroup')

      // endDate is excluded from initialEvents
      expect(attrsInitial.some(a => a.id === 'endDate')).toBe(false)
      expect(attrsCriteria.some(a => a.id === 'endDate')).toBe(true)
    })

    it('should return empty array for filter with no attributes', async () => {
      await service.loadConfiguration()

      const attrs = service.getAttributesForFilter('drugExposure', 'criteriaGroup')
      expect(attrs).toEqual([])
    })
  })

  describe('getSectionConfig', () => {
    it('should return undefined before loading', () => {
      expect(service.getSectionConfig('initialEvents')).toBeUndefined()
    })

    it('should return section config after loading', async () => {
      await service.loadConfiguration()

      const section = service.getSectionConfig('initialEvents')
      expect(section).toBeDefined()
      expect(section?.id).toBe('initialEvents')
    })

    it('should return undefined for unknown section', async () => {
      await service.loadConfiguration()

      expect(service.getSectionConfig('unknownSection')).toBeUndefined()
    })
  })

  describe('getAllSections', () => {
    it('should return empty array before loading', () => {
      expect(service.getAllSections()).toEqual([])
    })

    it('should return all sections after loading', async () => {
      await service.loadConfiguration()

      const sections = service.getAllSections()
      expect(sections.length).toBeGreaterThan(0)
    })
  })

  describe('getValidationResult', () => {
    it('should return null before loading', () => {
      expect(service.getValidationResult()).toBeNull()
    })

    it('should return validation result after loading', async () => {
      await service.loadConfiguration()

      const result = service.getValidationResult()
      expect(result).not.toBeNull()
      expect(result?.valid).toBe(true)
    })
  })

  describe('getValidFilterTypes', () => {
    it('should return empty array before loading', () => {
      expect(service.getValidFilterTypes()).toEqual([])
    })

    it('should return valid filter types after loading', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypes()
      expect(types).toContain('conditionOccurrence')
    })
  })

  describe('getInvalidFilterTypes', () => {
    it('should return empty array before loading', () => {
      expect(service.getInvalidFilterTypes()).toEqual([])
    })

    it('should return invalid filter types after loading', async () => {
      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: false,
        errors: [],
        warnings: [],
        validFilterTypes: ['conditionOccurrence'],
        invalidFilterTypes: ['invalidType'],
        timestamp: new Date(),
      })

      await service.loadConfiguration()

      const types = service.getInvalidFilterTypes()
      expect(types).toContain('invalidType')
    })
  })

  describe('isFilterTypeValid', () => {
    it('should return false before loading', () => {
      expect(service.isFilterTypeValid('conditionOccurrence')).toBe(false)
    })

    it('should return true for valid filter type', async () => {
      await service.loadConfiguration()

      expect(service.isFilterTypeValid('conditionOccurrence')).toBe(true)
    })

    it('should return false for invalid filter type', async () => {
      await service.loadConfiguration()

      expect(service.isFilterTypeValid('unknownType')).toBe(false)
    })
  })

  describe('reload', () => {
    it('should reload configuration', async () => {
      await service.loadConfiguration()

      const result = await service.reload()

      expect(validateAtlasConfig).toHaveBeenCalledTimes(2)
      expect(result).toBeDefined()
    })

    it('should accept custom config', async () => {
      const customConfig = {
        criteriaTypes: {
          custom: { type: 'custom' },
        },
      }

      await service.reload(customConfig)

      expect(validateAtlasConfig).toHaveBeenCalledWith(customConfig)
    })

    it('should notify subscribers on reload', async () => {
      await service.loadConfiguration()

      const callback = vi.fn()
      service.onConfigurationChange(callback)

      await service.reload()

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('onConfigurationChange', () => {
    it('should register callback', async () => {
      await service.loadConfiguration()

      const callback = vi.fn()
      service.onConfigurationChange(callback)

      await service.reload()

      expect(callback).toHaveBeenCalled()
    })

    it('should return unsubscribe function', async () => {
      await service.loadConfiguration()

      const callback = vi.fn()
      const unsubscribe = service.onConfigurationChange(callback)

      unsubscribe()
      await service.reload()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(configLoaderService).toBeInstanceOf(ConfigLoaderService)
    })
  })
})
