<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          :color="severityColor"
          class="mr-2"
        >
          mdi-message-text
        </v-icon>
        {{ t('cc.viewEdit.tabs.messages') }}
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th
                class="text-left"
                style="width: 120px"
              >
                {{ t('columns.severity', 'Severity') }}
              </th>
              <th class="text-left">
                {{ t('columns.message', 'Message') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(warning, idx) in warnings"
              :key="idx"
              :class="{
                'bg-error-lighten-4': warning.severity === 'CRITICAL',
                'bg-warning-lighten-4': warning.severity === 'WARNING',
                'bg-info-lighten-4': warning.severity === 'INFO',
              }"
            >
              <td>
                <v-chip
                  :color="
                    warning.severity === 'CRITICAL'
                      ? 'error'
                      : warning.severity === 'WARNING'
                        ? 'warning'
                        : 'info'
                  "
                  size="small"
                  label
                >
                  {{ warning.severity }}
                </v-chip>
              </td>
              <td>{{ warning.message }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          @click="$emit('update:modelValue', false)"
        >
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { ValidationWarning } from '@/models/cohort-validation.types'

interface Props {
  modelValue: boolean
  warnings: ValidationWarning[]
  severityColor: string
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
</script>
