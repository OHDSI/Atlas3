<template>
  <div class="incidence-rate-pagination">
    <v-btn
      :disabled="page <= 0"
      @click="emit('update:page', page - 1)"
    >
      Prev
    </v-btn>
    <span>Page {{ page + 1 }} / {{ totalPages }}</span>
    <v-btn
      :disabled="page >= totalPages - 1"
      @click="emit('update:page', page + 1)"
    >
      Next
    </v-btn>
    <v-select
      :model-value="itemsPerPage"
      :items="[10, 25, 50, 100]"
      density="compact"
      hide-details
      style="max-width: 100px"
      @update:model-value="(v: number | null) => v !== null && emit('update:itemsPerPage', v)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  page: number
  totalPages: number
  itemsPerPage: number
}>()
const emit = defineEmits<{
  'update:page': [n: number]
  'update:itemsPerPage': [n: number]
}>()
</script>

<style scoped>
.incidence-rate-pagination { display: flex; align-items: center; gap: 12px; }
</style>
