<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th>{{ t('incidenceRate.cohort.id', 'ID') }}</th>
        <th>{{ t('incidenceRate.cohort.name', 'Name') }}</th>
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
          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            @click="emit('remove', c.id)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

defineProps<{
  cohorts: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  remove: [id: number]
}>()

const { t } = useI18n()
</script>
