<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th>{{ t('incidenceRate.cohort.id', 'ID') }}</th>
        <th>{{ t('incidenceRate.name', 'Name') }}</th>
        <th>{{ t('incidenceRate.author', 'Author') }}</th>
        <th>Modified</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="ir in incidenceRates"
        :key="ir.id"
        class="row"
        @click="emit('open', ir.id ?? 0)"
      >
        <td>{{ ir.id }}</td>
        <td>{{ ir.name }}</td>
        <td>{{ ir.createdBy?.name ?? '' }}</td>
        <td>{{ ir.modifiedDate ?? '' }}</td>
        <td>
          <v-btn
            size="x-small"
            color="error"
            variant="text"
            @click.stop="emit('remove', ir.id ?? 0)"
          >
            {{ t('incidenceRateAnalysis.delete', 'Delete incidence rate') }}
          </v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { IncidenceRate } from '@/models/incidence-rate.types'
import { useI18n } from '@/composables/useI18n'

defineProps<{ incidenceRates: IncidenceRate[] }>()
const emit = defineEmits<{ open: [id: number]; remove: [id: number] }>()
const { t } = useI18n()
</script>

<style scoped>
.row { cursor: pointer; }
</style>
