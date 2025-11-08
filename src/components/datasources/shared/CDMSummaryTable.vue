<template>
  <v-card class="cdm-summary-table" variant="outlined">
    <v-card-title class="text-h6 bg-grey-lighten-4">
      CDM Summary
    </v-card-title>
    <v-card-text>
      <v-table density="comfortable">
        <tbody>
          <tr>
            <td class="font-weight-medium">Source Name</td>
            <td>{{ data.sourceName }}</td>
          </tr>
          <tr>
            <td class="font-weight-medium">Total Persons</td>
            <td>{{ formatNumber(data.personCount) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { formatNumber } from '@/utils/datasource-formatters'

interface Props {
  data: {
    sourceName: string
    personCount: number
  }
}

defineProps<Props>()
</script>

<style scoped>
.cdm-summary-table :deep(td) {
  padding: 12px !important;
}

.cdm-summary-table :deep(td:first-child) {
  width: 40%;
}
</style>
