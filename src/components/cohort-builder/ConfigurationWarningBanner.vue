<template>
  <AtlasAlert
    v-if="validationResult && validationResult.invalidFilterTypes.length > 0"
    severity="warning"
    :title="t('components.configurationWarningBanner.title', 'Configuration Validation Warnings').value"
    :closable="true"
    class="configuration-warning-banner"
  >
    <div class="mt-2">
      <p class="mb-2">
        {{
          t(
            'components.configurationWarningBanner.description',
            'Some filter types in the configuration are invalid or misconfigured. These filters will not be available in the UI:'
          ).value
        }}
      </p>

      <!-- Expandable details section -->
      <v-expansion-panels variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <span class="font-weight-medium">
              {{ t('components.configurationWarningBanner.invalidFilterTypes', 'Invalid Filter Types').value }}
              ({{ validationResult.invalidFilterTypes.length }})
            </span>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <AtlasList dense>
              <AtlasListItem
                v-for="filterType in validationResult.invalidFilterTypes"
                :key="filterType"
              >
                <template #prepend>
                  <AtlasIcon size="small">
                    mdi-close-circle
                  </AtlasIcon>
                </template>
                <v-list-item-title>
                  {{ filterType }}
                </v-list-item-title>
              </AtlasListItem>
            </AtlasList>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <p class="mt-3 text-caption">
        {{
          t(
            'components.configurationWarningBanner.contactAdmin',
            'Contact your administrator to update the configuration file (atlas-config.json).'
          ).value
        }}
      </p>
    </div>
  </AtlasAlert>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasIcon, AtlasList, AtlasListItem } from '@/components/ui'
/**
 * ConfigurationWarningBanner Component
 *
 * Displays validation errors from configuration loading.
 * Shows when invalid filter types are detected in atlas-config.json.
 */

import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { configLoaderService } from '@/services/config-loader.service'
import type { ValidationResult } from '@/models/config.types'

const { t } = useI18n()

const validationResult = ref<ValidationResult | null>(null)

onMounted(() => {
  // Get validation result from config loader service
  validationResult.value = configLoaderService.getValidationResult()

  // Subscribe to configuration changes (for hot-reload)
  configLoaderService.onConfigurationChange(() => {
    validationResult.value = configLoaderService.getValidationResult()
  })
})
</script>

<style scoped>
.configuration-warning-banner {
  margin-bottom: 16px;
}

/* Ensure expansion panel text is properly styled */
:deep(.v-expansion-panel-text__wrapper) {
  padding: 12px 16px;
}
</style>
