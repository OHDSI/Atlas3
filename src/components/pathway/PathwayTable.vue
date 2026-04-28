<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th>{{ t('columns.id', 'ID') }}</th>
        <th>{{ t('columns.name', 'Name') }}</th>
        <th>{{ t('columns.author', 'Author') }}</th>
        <th>Modified</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="p in pathways"
        :key="p.id"
        class="row"
        @click="emit('open', p.id ?? 0)"
      >
        <td>{{ p.id }}</td>
        <td>{{ p.name }}</td>
        <td>{{ p.createdBy?.name ?? '' }}</td>
        <td>{{ p.modifiedDate ?? '' }}</td>
        <td>
          <v-btn
            size="x-small"
            color="error"
            variant="text"
            @click.stop="emit('remove', p.id ?? 0)"
          >
            {{ t('common.delete', 'Delete pathway') }}
          </v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { Pathway } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'

defineProps<{ pathways: Pathway[] }>()
const emit = defineEmits<{ open: [id: number]; remove: [id: number] }>()
const { t } = useI18n()
</script>

<style scoped>
.row { cursor: pointer; }
</style>
