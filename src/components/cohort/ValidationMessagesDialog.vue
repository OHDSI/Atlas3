<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="VALIDATION"
    :title="t('cc.viewEdit.tabs.messages').value"
    max-width="800"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('update:modelValue', false)"
  >
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
            <AtlasChip
              :tone="
                warning.severity === 'CRITICAL'
                  ? 'danger'
                  : warning.severity === 'WARNING'
                    ? 'warning'
                    : 'info'
              "
              size="sm"
              label
            >
              {{ warning.severity }}
            </AtlasChip>
          </td>
          <td>{{ warning.message }}</td>
        </tr>
      </tbody>
    </v-table>
    <template #actions>
      <AtlasButton
        @click="$emit('update:modelValue', false)"
      >
        {{ t('common.close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasDialog } from '@/components/ui'
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
