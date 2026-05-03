<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th>{{ t('columns.id', 'ID') }}</th>
        <th>{{ t('columns.name', 'Display name') }}</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="c in cohorts"
        :key="c.id"
      >
        <td>{{ c.id }}</td>
        <td>
          <AtlasTextField
            :model-value="c.name"
            hide-details
            :readonly="readonly"
            @update:model-value="(v) => emit('rename', c.id, String(v))"
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
import { AtlasTextField } from '@/components/ui'
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
