<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th>{{ t('columns.id', 'ID') }}</th>
        <th>{{ t('columns.name', 'Name') }}</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="c in cohorts"
        :key="c.id"
      >
        <td>{{ c.id }}</td>
        <td>{{ c.name }}</td>
        <td>
          <AtlasIconButton
            icon="mdi-close"
            size="sm"
            variant="text"
            v-bind="{ ariaLabel: t('components.incidenceRate.removeCohort', 'Remove cohort').value }"
            @click="emit('remove', c.id)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { AtlasIconButton } from '@/components/ui'

defineProps<{
  cohorts: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  remove: [id: number]
}>()

const { t } = useI18n()
</script>
