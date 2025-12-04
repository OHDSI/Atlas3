/**
 * Unit Tests: useAttributeConfig Composable
 * Tests for src/composables/useAttributeConfig.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Mock config loader service
vi.mock('@/services/config-loader.service', () => ({
  configLoaderService: {
    getAttributesForFilter: vi.fn(),
  },
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    tv: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}))

import { useAttributeConfig } from '@/composables/useAttributeConfig'
import { configLoaderService } from '@/services/config-loader.service'

describe('useAttributeConfig', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('attributes', () => {
    it('returns attributes for filter type', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange', name: 'Age' },
        { id: 'gender', type: 'concept', name: 'Gender' },
      ])

      const filterType = ref('conditionOccurrence')
      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value).toHaveLength(2)
      expect(attributes.value[0].key).toBe('age')
      expect(attributes.value[0].type).toBe('numericRange')
      expect(attributes.value[1].key).toBe('gender')
    })

    it('maps config.id to attribute key', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'valueAsNumber', type: 'numericRange' },
      ])

      const filterType = ref('measurement')
      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value[0].key).toBe('valueAsNumber')
    })

    it('resolves plain text name to label', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange', name: 'Patient Age' },
      ])

      const filterType = ref('conditionOccurrence')
      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value[0].label).toBe('Patient Age')
    })

    it('humanizes key when no name provided', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'valueAsNumber', type: 'numericRange' },
      ])

      const filterType = ref('measurement')
      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value[0].label).toBe('Value As Number')
    })

    it('uses section parameter when provided', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('condition')
      const section = ref('initialEvents')
      const { attributes } = useAttributeConfig(filterType, section)

      // Access computed to trigger call
      expect(attributes.value).toHaveLength(0)
      expect(configLoaderService.getAttributesForFilter).toHaveBeenCalledWith(
        'condition',
        'initialEvents'
      )
    })

    it('defaults section to criteriaGroup', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('condition')
      const { attributes } = useAttributeConfig(filterType)

      // Access computed to trigger call
      expect(attributes.value).toHaveLength(0)
      expect(configLoaderService.getAttributesForFilter).toHaveBeenCalledWith(
        'condition',
        'criteriaGroup'
      )
    })

    it('updates when filter type changes', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockImplementation(
        (filter: string) => {
          if (filter === 'condition') {
            return [{ id: 'conditionAttr', type: 'boolean' }]
          }
          if (filter === 'drug') {
            return [{ id: 'drugAttr', type: 'numericRange' }]
          }
          return []
        }
      )

      const filterType = ref('condition')
      const { attributes } = useAttributeConfig(filterType)

      expect(attributes.value[0].key).toBe('conditionAttr')

      filterType.value = 'drug'
      expect(attributes.value[0].key).toBe('drugAttr')
    })

    it('preserves order from configuration', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'third', type: 'boolean', name: 'AAA Third' },
        { id: 'first', type: 'numericRange', name: 'ZZZ First' },
        { id: 'second', type: 'text', name: 'MMM Second' },
      ])

      const filterType = ref('test')
      const { attributes } = useAttributeConfig(filterType)

      // Should preserve array order, not sort alphabetically
      expect(attributes.value[0].key).toBe('third')
      expect(attributes.value[1].key).toBe('first')
      expect(attributes.value[2].key).toBe('second')
    })
  })

  describe('getAttribute', () => {
    it('returns attribute config by key', () => {
      const mockConfig = { id: 'age', type: 'numericRange', name: 'Age' }
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        mockConfig,
        { id: 'gender', type: 'concept' },
      ])

      const filterType = ref('condition')
      const { getAttribute } = useAttributeConfig(filterType)

      const result = getAttribute('age')

      expect(result).toEqual(mockConfig)
    })

    it('returns undefined for unknown attribute', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange' },
      ])

      const filterType = ref('condition')
      const { getAttribute } = useAttributeConfig(filterType)

      const result = getAttribute('unknown')

      expect(result).toBeUndefined()
    })
  })

  describe('getAttributeLabel', () => {
    it('returns plain text name', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange', name: 'Patient Age' },
      ])

      const filterType = ref('condition')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      expect(getAttributeLabel('age')).toBe('Patient Age')
    })

    it('returns humanized key when no name', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'valueAsNumber', type: 'numericRange' },
      ])

      const filterType = ref('measurement')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      expect(getAttributeLabel('valueAsNumber')).toBe('Value As Number')
    })

    it('humanizes simple key', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange' },
      ])

      const filterType = ref('condition')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      expect(getAttributeLabel('age')).toBe('Age')
    })

    it('returns humanized key for unknown attribute', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('condition')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      expect(getAttributeLabel('unknownAttribute')).toBe('Unknown Attribute')
    })
  })

  describe('getAttributeDescription', () => {
    it('returns plain text description', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange', description: 'Patient age in years' },
      ])

      const filterType = ref('condition')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      expect(getAttributeDescription('age')).toBe('Patient age in years')
    })

    it('returns empty string when no description', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([
        { id: 'age', type: 'numericRange' },
      ])

      const filterType = ref('condition')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      expect(getAttributeDescription('age')).toBe('')
    })

    it('returns empty string for unknown attribute', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('condition')
      const { getAttributeDescription } = useAttributeConfig(filterType)

      expect(getAttributeDescription('unknown')).toBe('')
    })
  })

  describe('humanizeKey', () => {
    it('handles camelCase keys', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('test')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      // Testing humanization through getAttributeLabel with unknown key
      expect(getAttributeLabel('valueAsNumber')).toBe('Value As Number')
      expect(getAttributeLabel('conditionType')).toBe('Condition Type')
      expect(getAttributeLabel('firstName')).toBe('First Name')
    })

    it('handles single word keys', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('test')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      expect(getAttributeLabel('age')).toBe('Age')
      expect(getAttributeLabel('name')).toBe('Name')
    })

    it('handles already capitalized keys', () => {
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([])

      const filterType = ref('test')
      const { getAttributeLabel } = useAttributeConfig(filterType)

      // Humanization adds space before each capital, then trims
      expect(getAttributeLabel('ID')).toBe('I D')
    })
  })

  describe('attribute info structure', () => {
    it('includes all expected properties', () => {
      const mockConfig = {
        id: 'testAttr',
        type: 'numericRange',
        name: 'Test Attribute',
        description: 'Test description',
      }
      vi.mocked(configLoaderService.getAttributesForFilter).mockReturnValue([mockConfig])

      const filterType = ref('test')
      const { attributes } = useAttributeConfig(filterType)

      const attr = attributes.value[0]

      expect(attr).toHaveProperty('key', 'testAttr')
      expect(attr).toHaveProperty('label', 'Test Attribute')
      expect(attr).toHaveProperty('description', 'Test description')
      expect(attr).toHaveProperty('type', 'numericRange')
      expect(attr).toHaveProperty('config', mockConfig)
    })
  })
})
