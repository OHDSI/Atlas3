/**
 * useFilterConfig Composable
 *
 * Provides reactive access to filter type configuration with i18n locale resolution.
 * Used by UI components to query available filters and their metadata based on section context.
 *
 * Features:
 * - Section-aware filter queries
 * - i18n locale key resolution for filter names and descriptions
 * - Context-specific description display
 * - Filter metadata queries (requiresConceptSet, groupOnly flags)
 * - Validation result exposure
 */

import { computed, ref, type Ref, type ComputedRef } from 'vue'
import { configLoaderService } from '@/services/config-loader.service'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import type { FilterTypeConfig, ValidationResult } from '@/models/config.types'

export interface FilterInfo {
  /** Filter type key in camelCase (e.g., 'conditionOccurrence') - matches config file */
  key: string

  /** Filter type in PascalCase (e.g., 'ConditionOccurrence') - matches CriteriaType */
  criteriaType: string

  /** Translated filter name */
  name: string

  /** Context-specific translated description */
  description: string

  /** Whether filter requires concept set selector */
  requiresConceptSet: boolean

  /** Whether filter is only available in criteria groups */
  groupOnly: boolean

  /** Raw configuration */
  config: FilterTypeConfig
}

export interface UseFilterConfigReturn {
  /** Available filters for current section (with translated names/descriptions) */
  availableFilters: ComputedRef<FilterInfo[]>

  /** Get translated description for filter in current section context */
  getFilterDescription: (filterType: string) => string

  /** Check if filter requires concept set */
  requiresConceptSet: (filterType: string) => boolean

  /** Check if filter is group-only */
  isGroupOnly: (filterType: string) => boolean

  /** Validation result from configuration loading */
  validationResult: Ref<ValidationResult | null>

  /** Whether configuration has any invalid filters */
  hasInvalidFilters: ComputedRef<boolean>
}

/**
 * Convert camelCase to PascalCase (e.g., 'conditionOccurrence' -> 'ConditionOccurrence')
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Use filter configuration composable
 *
 * @param section - Section key ref ('initialEvents', 'censoringEvents', 'criteriaGroup')
 * @returns Filter configuration interface with reactive properties
 */
export function useFilterConfig(section: Ref<string>): UseFilterConfigReturn {
  const { tv } = useI18n()

  // Get validation result (reactive)
  const validationResult = ref<ValidationResult | null>(configLoaderService.getValidationResult())

  /**
   * Get available filters for current section with translated metadata.
   * Filters configuration based on:
   * - Section's excludeTypes
   * - Filter's groupOnly flag
   * - Filter validation status
   */
  const availableFilters = computed<FilterInfo[]>(() => {
    const filterKeys = configLoaderService.getValidFilterTypesForSection(section.value)

    logger.debug('useFilterConfig', `Section: ${section.value}, Filter keys`, filterKeys)

    return filterKeys
      .map(key => {
        const config = configLoaderService.getFilterConfig(key)
        if (!config) {
          logger.warn('useFilterConfig', `No config found for filter: ${key}`)
          return null
        }

        // Resolve locale keys to translated strings or use plain text
        // Support both i18n (nameKey) and plain text (name) formats
        const name = config.nameKey ? tv(config.nameKey, key) : config.name || key
        const description = getFilterDescription(key)

        return {
          key, // camelCase (e.g., 'conditionOccurrence')
          criteriaType: toPascalCase(key), // PascalCase (e.g., 'ConditionOccurrence')
          name,
          description,
          requiresConceptSet: config.requiresConceptSet ?? true,
          groupOnly: config.groupOnly ?? false,
          config,
        }
      })
      .filter((filter): filter is FilterInfo => filter !== null)
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
  })

  /**
   * Get context-specific description for a filter type.
   * Resolution order:
   * 1. Section-specific key (e.g., "initial", "censoring", "group")
   * 2. "all" key (applies to all contexts)
   * 3. Filter type key as fallback
   *
   * @param filterType - Filter type key
   * @returns Translated description
   */
  function getFilterDescription(filterType: string): string {
    const config = configLoaderService.getFilterConfig(filterType)
    if (!config) {
      return filterType
    }

    // Support both i18n (descriptionKeys) and plain text (descriptions) formats
    const descriptionKeys = config.descriptionKeys
    const descriptions = config.descriptions

    // Try section-specific description first
    const sectionKey = section.value
    let descriptionKey: string | undefined
    let description: string | undefined

    // Map section IDs to description context keys
    const contextMap: Record<string, string> = {
      initialEvents: 'initial',
      censoringEvents: 'censoring',
      criteriaGroup: 'group',
    }

    const context = contextMap[sectionKey]

    // Try i18n keys first if available
    if (descriptionKeys) {
      if (context && descriptionKeys[context]) {
        descriptionKey = descriptionKeys[context]
      } else if (descriptionKeys.all) {
        descriptionKey = descriptionKeys.all
      }

      if (descriptionKey) {
        return tv(descriptionKey, `Find patients with ${filterType}`)
      }
    }

    // Fall back to plain text descriptions
    if (descriptions) {
      if (context && descriptions[context]) {
        description = descriptions[context]
      } else if (descriptions.all) {
        description = descriptions.all
      }

      if (description) {
        return description
      }
    }

    return `Find patients with ${filterType}` // Ultimate fallback
  }

  /**
   * Check if filter requires concept set selector.
   *
   * @param filterType - Filter type key
   * @returns True if concept set selector should be shown
   */
  function requiresConceptSet(filterType: string): boolean {
    const config = configLoaderService.getFilterConfig(filterType)
    return config?.requiresConceptSet ?? true
  }

  /**
   * Check if filter is group-only.
   *
   * @param filterType - Filter type key
   * @returns True if filter only available in criteria groups
   */
  function isGroupOnly(filterType: string): boolean {
    const config = configLoaderService.getFilterConfig(filterType)
    return config?.groupOnly ?? false
  }

  /**
   * Check if configuration has any invalid filters.
   */
  const hasInvalidFilters = computed<boolean>(() => {
    return (validationResult.value?.invalidFilterTypes.length ?? 0) > 0
  })

  // Subscribe to configuration changes (hot-reload support)
  configLoaderService.onConfigurationChange(() => {
    validationResult.value = configLoaderService.getValidationResult()
  })

  return {
    availableFilters,
    getFilterDescription,
    requiresConceptSet,
    isGroupOnly,
    validationResult,
    hasInvalidFilters,
  }
}
