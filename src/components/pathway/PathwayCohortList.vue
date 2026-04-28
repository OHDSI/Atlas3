<template>
  <v-table density="compact">
    <thead>
      <tr><th>{{ t('columns.id', 'ID') }}</th><th>{{ t('columns.name', 'Display name') }}</th><th /></tr>
    </thead>
    <tbody>
      <tr
        v-for="c in cohorts"
        :key="c.id"
      >
        <td>{{ c.id }}</td>
        <td>
          <v-text-field
            :model-value="c.name"
            density="compact"
            hide-details
            :readonly="readonly"
            @update:model-value="(v: string) => emit('rename', c.id, v)"
          />
        </td>
        <td>
          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            :disabled="readonly"
            @click="emit('remove', c.id)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { PathwayCohortRef } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  cohorts: PathwayCohortRef[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  rename: [id: number, name: string]
  remove: [id: number]
}>()

const { t } = useI18n()
</script>
