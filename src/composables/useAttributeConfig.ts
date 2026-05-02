/**
 * useAttributeConfig Composable
 *
 * Provides reactive access to attribute configuration for specific filter types.
 * Integrates with ConfigLoaderService to fetch attributes and i18n for localization.
 *
 * Features:
 * - Filter-type-specific attribute queries
 * - i18n locale key resolution for labels and descriptions
 * - Section-aware attribute filtering (optional)
 * - Attribute metadata queries (type, operators, etc.)
 */

import { computed, type Ref, type ComputedRef } from 'vue'
import { configLoaderService } from '@/services/config-loader.service'
import { useI18n } from '@/composables/useI18n'
import type { AttributeConfig, AttributeType } from '@/models/config.types'

export interface AttributeInfo {
  /** Attribute key/id (e.g., 'age', 'valueAsNumber') */
  key: string

  /** Translated attribute name/label */
  label: string

  /** Translated attribute description */
  description: string

  /** Attribute type (e.g., 'numericRange', 'conceptSet') */
  type: AttributeType

  /** Raw configuration */
  config: AttributeConfig
}

export interface UseAttributeConfigReturn {
  /** Available attributes for current filter type */
  attributes: ComputedRef<AttributeInfo[]>

  /** Get single attribute configuration by key */
  getAttribute: (attributeKey: string) => AttributeConfig | undefined

  /** Get translated label for attribute */
  getAttributeLabel: (attributeKey: string) => string

  /** Get translated description for attribute */
  getAttributeDescription: (attributeKey: string) => string
}

/**
 * Use attribute configuration composable
 *
 * @param filterType - Filter type key ref (e.g., 'conditionOccurrence', 'measurement')
 * @param section - Optional section key ref for section-aware filtering
 * @returns Attribute configuration interface with reactive properties
 */
export function useAttributeConfig(
  filterType: Ref<string>,
  section?: Ref<string>
): UseAttributeConfigReturn {
  const { tv } = useI18n()

  /**
   * Get available attributes for current filter type with translated metadata.
   * Attributes are returned in the order defined in configuration's attributeMapping array.
   */
  const attributes = computed<AttributeInfo[]>(() => {
    const sectionValue = section?.value || 'criteriaGroup'
    const attrs = configLoaderService.getAttributesForFilter(filterType.value, sectionValue)

    return attrs
      .map(config => {
        // Resolve locale keys to translated strings (use id not key)
        const label = getAttributeLabel(config.id)
        const description = getAttributeDescription(config.id)

        return {
          key: config.id, // Map config.id to key for consistency
          label,
          description,
          type: config.type,
          config,
        }
      })
      .filter((attr): attr is AttributeInfo => attr !== null)
    // Note: Order is preserved from ConfigLoaderService which maintains array order
  })

  /**
   * Get single attribute configuration by key.
   *
   * @param attributeKey - Attribute key to look up
   * @returns Attribute configuration or undefined if not found
   */
  function getAttribute(attributeKey: string): AttributeConfig | undefined {
    const sectionValue = section?.value || 'criteriaGroup'
    const attrs = configLoaderService.getAttributesForFilter(filterType.value, sectionValue)
    return attrs.find(attr => attr.id === attributeKey)
  }

  /**
   * Get translated label for an attribute.
   * Resolution order:
   * 1. nameKey from attribute configuration
   * 2. Fallback to humanized key name
   *
   * @param attributeKey - Attribute key
   * @returns Translated label
   */
  function getAttributeLabel(attributeKey: string): string {
    const config = getAttribute(attributeKey)
    if (!config) {
      // Humanize the key as fallback (e.g., 'valueAsNumber' -> 'Value As Number')
      return humanizeKey(attributeKey)
    }

    // Support both i18n (nameKey) and plain text (name) formats
    if (config.nameKey) {
      return tv(config.nameKey, humanizeKey(attributeKey))
    } else if (config.name) {
      return config.name
    }

    return humanizeKey(attributeKey)
  }

  /**
   * Get translated description for an attribute.
   * Resolution order:
   * 1. descriptionKey from attribute configuration
   * 2. Empty string if no description configured
   *
   * @param attributeKey - Attribute key
   * @returns Translated description
   */
  function getAttributeDescription(attributeKey: string): string {
    const config = getAttribute(attributeKey)
    if (!config) {
      return ''
    }

    // Support both i18n (descriptionKey) and plain text (description) formats
    if (config.descriptionKey) {
      return tv(config.descriptionKey, '')
    } else if (config.description) {
      return config.description
    }

    return ''
  }

  /**
   * Humanize a camelCase key into a readable label.
   * Examples:
   *   'valueAsNumber' -> 'Value As Number'
   *   'age' -> 'Age'
   *   'conditionType' -> 'Condition Type'
   *
   * @param key - Attribute key in camelCase
   * @returns Humanized label
   */
  function humanizeKey(key: string): string {
    return (
      key
        // Insert space before capital letters
        .replace(/([A-Z])/g, ' $1')
        // Capitalize first letter
        .replace(/^./, str => str.toUpperCase())
        // Trim any leading space
        .trim()
    )
  }

  return {
    attributes,
    getAttribute,
    getAttributeLabel,
    getAttributeDescription,
  }
}
