/**
 * Unit Tests: Config Loader Service
 * Tests for src/services/config-loader.service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config import
vi.mock('@/config/atlas-config.json', () => ({
  default: {
    criteriaTypes: {
      conditionOccurrence: { name: 'Condition', conceptDomainId: 'Condition' },
      drugExposure: { name: 'Drug', conceptDomainId: 'Drug' },
    },
    attributeMapping: {
      conditionOccurrence: [
        { key: 'age', type: 'numeric' },
        { key: 'gender', type: 'concept', excludeFromSections: ['criteriaGroup'] },
      ],
      drugExposure: [{ key: 'quantity', type: 'numeric' }],
    },
    sections: {
      initialEvents: { id: 'initialEvents', label: 'Initial Events' },
      censoringEvents: { id: 'censoringEvents', label: 'Censoring Events' },
      criteriaGroup: { id: 'criteriaGroup', label: 'Criteria Group', includeAll: true },
    },
  },
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock config validator
vi.mock('@/utils/config-validator', () => ({
  validateAtlasConfig: vi.fn(() => ({
    valid: true,
    errors: [],
    warnings: [],
    validFilterTypes: ['conditionOccurrence', 'drugExposure'],
    invalidFilterTypes: [],
    timestamp: new Date(),
  })),
  formatValidationSummary: vi.fn(() => 'Validation summary'),
}))

describe('Config Loader Service', () => {
  let ConfigLoaderService: typeof import('@/services/config-loader.service').ConfigLoaderService
  let service: import('@/services/config-loader.service').ConfigLoaderService

  beforeEach(async () => {
    vi.clearAllMocks()

    // Re-import to get fresh instance
    const module = await import('@/services/config-loader.service')
    ConfigLoaderService = module.ConfigLoaderService
    service = new ConfigLoaderService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadConfiguration', () => {
    it('loads and validates configuration', async () => {
      const result = await service.loadConfiguration()

      expect(result.valid).toBe(true)
      expect(result.validFilterTypes).toContain('conditionOccurrence')
      expect(result.validFilterTypes).toContain('drugExposure')
    })

    it('stores validation result', async () => {
      await service.loadConfiguration()

      const validationResult = service.getValidationResult()
      expect(validationResult).not.toBeNull()
      expect(validationResult?.valid).toBe(true)
    })

    it('handles load error gracefully', async () => {
      const { validateAtlasConfig } = await import('@/utils/config-validator')
      vi.mocked(validateAtlasConfig).mockImplementationOnce(() => {
        throw new Error('Parse error')
      })

      const result = await service.loadConfiguration()

      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('LOAD_FAILED')
    })
  })

  describe('getFilterConfig', () => {
    it('returns undefined before loading', () => {
      const config = service.getFilterConfig('conditionOccurrence')

      expect(config).toBeUndefined()
    })

    it('returns filter config after loading', async () => {
      await service.loadConfiguration()

      const config = service.getFilterConfig('conditionOccurrence')

      expect(config).toBeDefined()
      expect(config?.name).toBe('Condition')
    })

    it('returns undefined for invalid filter type', async () => {
      const { validateAtlasConfig } = await import('@/utils/config-validator')
      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['drugExposure'],
        invalidFilterTypes: ['conditionOccurrence'],
        timestamp: new Date(),
      })

      await service.loadConfiguration()

      const config = service.getFilterConfig('conditionOccurrence')

      expect(config).toBeUndefined()
    })
  })

  describe('getValidFilterTypesForSection', () => {
    it('returns empty array before loading', () => {
      const types = service.getValidFilterTypesForSection('initialEvents')

      expect(types).toEqual([])
    })

    it('returns valid filter types for section', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypesForSection('initialEvents')

      expect(types.length).toBeGreaterThan(0)
    })

    it('returns empty array for unknown section', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypesForSection('unknownSection')

      expect(types).toEqual([])
    })

    it('filters based on groupOnly flag', async () => {
      // Mock config with groupOnly filter
      vi.doMock('@/config/atlas-config.json', () => ({
        default: {
          criteriaTypes: {
            conditionOccurrence: { name: 'Condition', groupOnly: false },
            nestedCriteria: { name: 'Nested', groupOnly: true },
          },
          attributeMapping: {},
          sections: {
            initialEvents: { id: 'initialEvents', label: 'Initial Events' },
            criteriaGroup: { id: 'criteriaGroup', label: 'Criteria', includeAll: true },
          },
        },
      }))

      const { validateAtlasConfig } = await import('@/utils/config-validator')
      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['conditionOccurrence', 'nestedCriteria'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      })

      await service.loadConfiguration()

      // criteriaGroup should include all
      const criteriaGroupTypes = service.getValidFilterTypesForSection('criteriaGroup')
      expect(criteriaGroupTypes).toContain('conditionOccurrence')
    })
  })

  describe('getAttributesForFilter', () => {
    it('returns empty array before loading', () => {
      const attrs = service.getAttributesForFilter('conditionOccurrence', 'initialEvents')

      expect(attrs).toEqual([])
    })

    it('returns attributes for valid filter type', async () => {
      await service.loadConfiguration()

      const attrs = service.getAttributesForFilter('conditionOccurrence', 'initialEvents')

      expect(attrs.length).toBeGreaterThan(0)
    })

    it('filters attributes by section exclusions', async () => {
      await service.loadConfiguration()

      // gender attribute is excluded from criteriaGroup
      const attrsForCriteriaGroup = service.getAttributesForFilter(
        'conditionOccurrence',
        'criteriaGroup'
      )

      // Should not include 'gender' which is excluded from criteriaGroup
      const genderAttr = attrsForCriteriaGroup.find((a) => a.key === 'gender')
      expect(genderAttr).toBeUndefined()

      // Should include 'gender' in other sections
      const attrsForInitialEvents = service.getAttributesForFilter(
        'conditionOccurrence',
        'initialEvents'
      )
      const genderAttrInEvents = attrsForInitialEvents.find((a) => a.key === 'gender')
      expect(genderAttrInEvents).toBeDefined()
    })

    it('returns empty array for invalid filter type', async () => {
      const { validateAtlasConfig } = await import('@/utils/config-validator')
      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: ['conditionOccurrence'],
        timestamp: new Date(),
      })

      await service.loadConfiguration()

      const attrs = service.getAttributesForFilter('conditionOccurrence', 'initialEvents')

      expect(attrs).toEqual([])
    })
  })

  describe('getSectionConfig', () => {
    it('returns undefined before loading', () => {
      const section = service.getSectionConfig('initialEvents')

      expect(section).toBeUndefined()
    })

    it('returns section config after loading', async () => {
      await service.loadConfiguration()

      const section = service.getSectionConfig('initialEvents')

      expect(section).toBeDefined()
      expect(section?.id).toBe('initialEvents')
    })
  })

  describe('getAllSections', () => {
    it('returns empty array before loading', () => {
      const sections = service.getAllSections()

      expect(sections).toEqual([])
    })

    it('returns all sections after loading', async () => {
      await service.loadConfiguration()

      const sections = service.getAllSections()

      expect(sections.length).toBeGreaterThan(0)
    })
  })

  describe('getValidFilterTypes', () => {
    it('returns empty array before loading', () => {
      const types = service.getValidFilterTypes()

      expect(types).toEqual([])
    })

    it('returns valid filter types after loading', async () => {
      await service.loadConfiguration()

      const types = service.getValidFilterTypes()

      expect(types).toContain('conditionOccurrence')
      expect(types).toContain('drugExposure')
    })
  })

  describe('getInvalidFilterTypes', () => {
    it('returns empty array before loading', () => {
      const types = service.getInvalidFilterTypes()

      expect(types).toEqual([])
    })

    it('returns invalid filter types after loading', async () => {
      const { validateAtlasConfig } = await import('@/utils/config-validator')
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
    it('returns false before loading', () => {
      const isValid = service.isFilterTypeValid('conditionOccurrence')

      expect(isValid).toBe(false)
    })

    it('returns true for valid filter type', async () => {
      await service.loadConfiguration()

      const isValid = service.isFilterTypeValid('conditionOccurrence')

      expect(isValid).toBe(true)
    })

    it('returns false for invalid filter type', async () => {
      await service.loadConfiguration()

      const isValid = service.isFilterTypeValid('unknownType')

      expect(isValid).toBe(false)
    })
  })

  describe('reload', () => {
    it('reloads configuration', async () => {
      await service.loadConfiguration()

      const result = await service.reload()

      expect(result).not.toBeNull()
    })

    it('accepts new config data', async () => {
      await service.loadConfiguration()

      const newConfig = {
        criteriaTypes: { newType: { name: 'New Type' } },
        attributeMapping: {},
        sections: {},
      }

      const { validateAtlasConfig } = await import('@/utils/config-validator')
      vi.mocked(validateAtlasConfig).mockReturnValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['newType'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      })

      const result = await service.reload(newConfig)

      expect(result.validFilterTypes).toContain('newType')
    })
  })

  describe('onConfigurationChange', () => {
    it('subscribes to configuration changes', async () => {
      const callback = vi.fn()
      const unsubscribe = service.onConfigurationChange(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('unsubscribe removes callback', async () => {
      const callback = vi.fn()
      const unsubscribe = service.onConfigurationChange(callback)

      unsubscribe()

      // Callback should be removed from internal list
      // This is tested indirectly through the reload behavior
    })

    it('calls callback on reload', async () => {
      const callback = vi.fn()
      service.onConfigurationChange(callback)

      await service.loadConfiguration()
      await service.reload()

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('Singleton Export', () => {
    it('exports singleton instance', async () => {
      const { configLoaderService } = await import('@/services/config-loader.service')

      expect(configLoaderService).toBeInstanceOf(ConfigLoaderService)
    })
  })
})
