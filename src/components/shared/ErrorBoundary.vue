<template>
  <div
    v-if="hasError"
    class="error-boundary"
    role="alert"
    aria-live="assertive"
  >
    <AtlasContainer>
      <AtlasRow justify="center">
        <AtlasCol
          cols="12"
          md="8"
          lg="6"
        >
          <v-card
            color="error"
            variant="tonal"
          >
            <v-card-title class="d-flex align-center">
              <AtlasIcon
                icon="mdi-alert-circle"
                class="mr-2"
              />
              {{ t('configuration.viewEdit.source.alerts.save.error', 'Something Went Wrong') }}
            </v-card-title>
            <v-card-text>
              <p class="mb-4">
                {{
                  t(
                    'commonErrors.unexpectedError',
                    'An unexpected error occurred. This has been logged for investigation.'
                  ).value
                }}
              </p>

              <v-expansion-panels
                v-if="errorDetails"
                variant="accordion"
              >
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <AtlasIcon
                      icon="mdi-information-outline"
                      class="mr-2"
                    />
                    {{ t('commonErrors.errorDetails', 'Error Details') }}
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <pre class="error-details">{{ errorDetails }}</pre>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
            <v-card-actions>
              <AtlasButton
                ref="reloadButtonRef"
                variant="secondary"
                icon="mdi-refresh"
                @click="handleReset"
              >
                {{ t('common.refresh', 'Reload Page') }}
              </AtlasButton>
              <AtlasButton
                variant="ghost"
                icon="mdi-arrow-left"
                @click="handleGoBack"
              >
                {{ t('common.goBack', 'Go Back') }}
              </AtlasButton>
            </v-card-actions>
          </v-card>
        </AtlasCol>
      </AtlasRow>
    </AtlasContainer>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { AtlasButton, AtlasCol, AtlasContainer, AtlasIcon, AtlasRow } from '@/components/ui'
import { ref, onErrorCaptured, nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'

const router = useRouter()
const { t } = useI18n()

const hasError = ref(false)
const errorDetails = ref<string | null>(null)
const reloadButtonRef = ref<ComponentPublicInstance | null>(null)

onErrorCaptured((err: Error, instance, info) => {
  hasError.value = true

  void nextTick(() => {
    const el = reloadButtonRef.value?.$el as HTMLElement | undefined
    const focusTarget = el?.matches?.('button') ? el : el?.querySelector?.('button')
    if (focusTarget instanceof HTMLElement) {
      try {
        focusTarget.focus()
      } catch {
        void 0
      }
    }
  })

  // Build error details
  errorDetails.value = [
    `Error: ${err.message}`,
    `Component: ${instance?.$options.name || 'Unknown'}`,
    `Info: ${info}`,
    err.stack ? `\nStack Trace:\n${err.stack}` : '',
  ].join('\n')

  // Log error for debugging
  logger.error('ErrorBoundary', 'Captured error', {
    error: err,
    component: instance,
    info,
  })

  // Prevent error from propagating
  return false
})

function handleReset() {
  hasError.value = false
  errorDetails.value = null
  window.location.reload()
}

function handleGoBack() {
  hasError.value = false
  errorDetails.value = null
  router.back()
}
</script>

<style scoped>
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
}

.v-theme--dark .error-boundary {
  background: rgba(255, 255, 255, 0.05);
}

.error-details {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.v-theme--dark .error-details {
  background: rgba(255, 255, 255, 0.05);
}
</style>
