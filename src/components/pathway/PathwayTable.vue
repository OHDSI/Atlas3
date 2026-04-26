<template>
  <v-table density="compact">
    <thead>
      <tr><th>ID</th><th>Name</th><th>Author</th><th>Modified</th><th /></tr>
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
          >Delete</v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { Pathway } from '@/models/pathway.types'

defineProps<{ pathways: Pathway[] }>()
const emit = defineEmits<{ open: [id: number]; remove: [id: number] }>()
</script>

<style scoped>
.row { cursor: pointer; }
</style>
