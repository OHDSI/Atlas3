/**
 * Configuration Loader Service
 *
 * Central service for loading, validating, and providing access to atlas-config.json.
 * Implements singleton pattern for application-wide configuration access.
 *
 * Features:
 * - Eager loading at application startup
 * - Partial validation support - valid filters load even with errors
 * - Hot-reload in development mode
 * - i18n locale key resolution
 * - Context-aware filter and attribute queries
 */

import atlasConfigJson from '@/config/atlas-config.json'
import { validateAtlasConfig, formatValidationSummary } from '@/utils/config-validator'
import { logger } from '@/utils/logger'
import type {
  AtlasConfig,
  FilterTypeConfig,
  AttributeConfig,
  SectionConfig,
  ValidationResult,
} from '@/models/config.types'

type ConfigChangeCallback = (config: AtlasConfig) => void

/**
 * Configuration Loader Service (Singleton)
 *
 * Responsible for:
 * - Loading configuration from JSON file
 * - Validating configuration with partial validation
 * - Providing query methods for filters and attributes
 * - Managing configuration reload (hot-reload in dev mode)
 */
export class ConfigLoaderService {
  private config: AtlasConfig | null = null
  private validationResult: ValidationResult | null = null
  private changeCallbacks: ConfigChangeCallback[] = []
  private sections: SectionConfig[] = []

  /**
   * Load and validate configuration.
   * Called once at application startup.
   *
   * @returns ValidationResult with partial validation support
   * @throws ConfigurationError if file cannot be loaded or is completely malformed
   */
  async loadConfiguration(): Promise<ValidationResult> {
    try {
      // Performance mark for monitoring
      performance.mark('config-load-start')

      // Load configuration from JSON file
      const rawConfig = atlasConfigJson as unknown

      // Validate with partial validation support
      this.validationResult = validateAtlasConfig(rawConfig)

      // Store config even if invalid (for partial validation)
      if (this.validationResult.validFilterTypes.length > 0) {
        this.config = rawConfig as AtlasConfig

        // Convert sections to array if needed
        if (this.config.sections) {
          if (Array.isArray(this.config.sections)) {
            this.sections = this.config.sections
          } else {
            // Convert record to array and add id field from key
            this.sections = Object.entries(this.config.sections).map(([id, section]) => ({
              ...section,
              id,
            }))
          }
        }
      }

      // Performance mark for monitoring
      performance.mark('config-load-end')
      performance.measure('config-load', 'config-load-start', 'config-load-end')

      // Log validation results
      this.logValidationResults()

      return this.validationResult
    } catch (error) {
      // Critical error - configuration cannot be loaded at all
      const errorResult: ValidationResult = {
        valid: false,
        errors: [
          {
            message: `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
            code: 'LOAD_FAILED',
            details: error,
          },
        ],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }

      this.validationResult = errorResult
      logger.error('ConfigLoader', 'Configuration loading failed', error)

      return errorResult
    }
  }

  /**
   * Get configuration for a specific filter type.
   *
   * @param filterType - Filter type key (e.g., 'conditionOccurrence')
   * @returns Filter configuration or undefined if invalid/missing
   */
  getFilterConfig(filterType: string): FilterTypeConfig | undefined {
    if (!this.config) {
      logger.warn('ConfigLoader', 'Configuration not loaded. Call loadConfiguration() first.')
      return undefined
    }

    // Only return config if filter type is valid
    if (!this.validationResult?.validFilterTypes.includes(filterType)) {
      if (import.meta.env.DEV) {
        logger.warn(
          'ConfigLoader',
          `Filter type '${filterType}' is invalid or not in valid filters list`
        )
      }
      return undefined
    }

    return this.config.criteriaTypes[filterType]
  }

  /**
   * Get all valid filter types for a specific section.
   *
   * Filters are excluded if:
   * - Filter type is invalid (failed validation)
   * - Filter is groupOnly and section is not 'criteriaGroup'
   * - Filter is in section's excludeTypes list
   *
   * @param section - Section key ('initialEvents', 'censoringEvents', 'criteriaGroup')
   * @returns Array of valid filter type keys for the section
   */
  getValidFilterTypesForSection(section: string): string[] {
    if (!this.config || !this.validationResult) {
      logger.warn('ConfigLoader', 'Configuration not loaded')
      return []
    }

    if (import.meta.env.DEV) {
      logger.debug('ConfigLoader', `Looking for section: ${section}`)
      logger.debug(
        'ConfigLoader',
        'Available sections',
        this.sections.map(s => s.id)
      )
    }

    const sectionConfig = this.getSectionConfig(section)
    if (!sectionConfig) {
      logger.warn('ConfigLoader', `Section '${section}' not found in configuration`)
      logger.warn('ConfigLoader', 'Available sections', this.sections)
      return []
    }

    // Get all valid filter types
    const validTypes = this.validationResult.validFilterTypes

    if (import.meta.env.DEV) {
      logger.debug('ConfigLoader', `Valid filter types (${validTypes.length})`, validTypes)
      logger.debug('ConfigLoader', 'Section config', sectionConfig)
    }

    // Filter based on section rules
    const result = validTypes.filter(filterType => {
      const filterConfig = this.config!.criteriaTypes[filterType]

      // Check if filter is excluded from this section
      if (sectionConfig.excludeTypes && sectionConfig.excludeTypes.includes(filterType)) {
        return false
      }

      // Check if filter is groupOnly
      if (filterConfig?.groupOnly && section !== 'criteriaGroup' && !sectionConfig.includeAll) {
        return false
      }

      return true
    })

    if (import.meta.env.DEV) {
      logger.debug('ConfigLoader', `Filtered results for ${section} (${result.length})`, result)
    }

    return result
  }

  /**
   * Get attributes for a filter type in a specific section.
   *
   * Attributes are excluded if:
   * - Section is in attribute's excludeFromSections array
   *
   * @param filterType - Filter type key
   * @param section - Section key
   * @returns Array of attribute configurations (filtered by section context)
   */
  getAttributesForFilter(filterType: string, section: string): AttributeConfig[] {
    if (!this.config) {
      logger.warn('ConfigLoader', 'Configuration not loaded')
      return []
    }

    // Only return attributes if filter type is valid
    if (!this.validationResult?.validFilterTypes.includes(filterType)) {
      if (import.meta.env.DEV) {
        logger.warn('ConfigLoader', `Filter type '${filterType}' is not valid`)
      }
      return []
    }

    const attributes = this.config.attributeMapping[filterType]
    if (!attributes) {
      return []
    }

    // Filter attributes based on section exclusions
    return attributes.filter(attr => {
      if (!attr.excludeFromSections) {
        return true
      }
      return !attr.excludeFromSections.includes(section)
    })
  }

  /**
   * Get section configuration by section ID.
   *
   * @param sectionId - Section key
   * @returns Section configuration or undefined if not found
   */
  getSectionConfig(sectionId: string): SectionConfig | undefined {
    return this.sections.find(s => s.id === sectionId)
  }

  /**
   * Get all section configurations.
   *
   * @returns Array of section configurations
   */
  getAllSections(): SectionConfig[] {
    return this.sections
  }

  /**
   * Get validation result from last configuration load.
   *
   * @returns Validation result or null if not loaded
   */
  getValidationResult(): ValidationResult | null {
    return this.validationResult
  }

  /**
   * Get list of all valid filter types.
   *
   * @returns Array of valid filter type keys
   */
  getValidFilterTypes(): string[] {
    return this.validationResult?.validFilterTypes ?? []
  }

  /**
   * Get list of all invalid filter types.
   *
   * @returns Array of invalid filter type keys
   */
  getInvalidFilterTypes(): string[] {
    return this.validationResult?.invalidFilterTypes ?? []
  }

  /**
   * Check if a filter type is valid.
   *
   * @param filterType - Filter type key
   * @returns True if filter type passed validation
   */
  isFilterTypeValid(filterType: string): boolean {
    return this.validationResult?.validFilterTypes.includes(filterType) ?? false
  }

  /**
   * Reload configuration (for hot-reload support).
   * Called automatically by Vite HMR in development mode.
   *
   * @param newConfig - New configuration data (optional, defaults to re-importing)
   */
  async reload(newConfig?: unknown): Promise<ValidationResult> {
    logger.info('ConfigLoader', 'Reloading configuration...')

    const configToValidate = newConfig ?? atlasConfigJson

    // Validate new configuration
    this.validationResult = validateAtlasConfig(configToValidate)

    if (this.validationResult.validFilterTypes.length > 0) {
      this.config = configToValidate as AtlasConfig

      // Update sections
      if (this.config.sections) {
        if (Array.isArray(this.config.sections)) {
          this.sections = this.config.sections
        } else {
          // Convert record to array and add id field from key
          this.sections = Object.entries(this.config.sections).map(([id, section]) => ({
            ...section,
            id,
          }))
        }
      }

      // Notify subscribers
      this.notifyConfigurationChange()

      logger.info('ConfigLoader', 'Configuration reloaded successfully')
    } else {
      logger.error('ConfigLoader', 'Configuration reload failed - no valid filters')
    }

    this.logValidationResults()

    return this.validationResult
  }

  /**
   * Subscribe to configuration changes (hot-reload).
   *
   * @param callback - Function called when configuration reloaded
   * @returns Unsubscribe function
   */
  onConfigurationChange(callback: ConfigChangeCallback): () => void {
    this.changeCallbacks.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.changeCallbacks.indexOf(callback)
      if (index > -1) {
        this.changeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify all subscribers of configuration change.
   */
  private notifyConfigurationChange(): void {
    if (this.config) {
      this.changeCallbacks.forEach(callback => {
        try {
          callback(this.config!)
        } catch (error) {
          logger.error('ConfigLoader', 'Error in configuration change callback', error)
        }
      })
    }
  }

  /**
   * Log validation results to console.
   */
  private logValidationResults(): void {
    if (!this.validationResult) {
      return
    }

    if (import.meta.env.DEV) {
      // Detailed logging in development mode
      logger.info('ConfigLoader', formatValidationSummary(this.validationResult))

      if (this.validationResult.validFilterTypes.length > 0) {
        logger.info(
          'ConfigLoader',
          `Valid filter types: ${this.validationResult.validFilterTypes.join(', ')}`
        )
      }

      if (this.validationResult.invalidFilterTypes.length > 0) {
        logger.warn(
          'ConfigLoader',
          `Invalid filter types: ${this.validationResult.invalidFilterTypes.join(', ')}`
        )
      }
    } else {
      // Minimal logging in production
      if (!this.validationResult.valid) {
        logger.warn(
          'ConfigLoader',
          `Configuration validation: ${this.validationResult.errors.length} errors, ${this.validationResult.validFilterTypes.length} valid filters`
        )
      }
    }
  }
}

// Export singleton instance
export const configLoaderService = new ConfigLoaderService()

// Hot-reload support - development mode only
if (import.meta.hot) {
  import.meta.hot.accept('@/config/atlas-config.json', newModule => {
    if (newModule) {
      logger.info('ConfigLoader', 'Hot-reloading configuration...')
      configLoaderService.reload(newModule.default)
    }
  })
}
