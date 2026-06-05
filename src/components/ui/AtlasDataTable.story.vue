<script setup lang="ts">
import { ref } from 'vue'
import AtlasDataTable from './AtlasDataTable.vue'
import AtlasChip from './AtlasChip.vue'

const headers = [
  { key: 'name', title: 'Cohort name' },
  { key: 'patients', title: 'Patients', align: 'end' },
  { key: 'status', title: 'Status' },
]

const items = [
  { name: 'Type 2 Diabetes', patients: 12_485, status: 'ready' },
  { name: 'Hypertension',    patients: 24_103, status: 'generating' },
  { name: 'COPD',            patients:  3_812, status: 'failed' },
  { name: 'Asthma',          patients:  9_476, status: 'ready' },
]

const sortBy = ref([{ key: 'patients', order: 'desc' as const }])
const page = ref(1)

const STATUS_TONE = {
  ready:      'success',
  generating: 'info',
  failed:     'danger',
} as const

const loading = ref(false)
void loading.value
</script>

<template>
  <Story
    title="AtlasDataTable"
    group="tier-b"
  >
    <Variant title="default">
      <AtlasDataTable
        :headers="headers"
        :items="items"
      />
    </Variant>

    <Variant title="custom cell rendering (#item.status)">
      <AtlasDataTable
        :headers="headers"
        :items="items"
      >
        <template #item.status="{ item }">
          <AtlasChip
            :tone="STATUS_TONE[item.status as keyof typeof STATUS_TONE]"
            size="sm"
          >
            {{ item.status }}
          </AtlasChip>
        </template>
      </AtlasDataTable>
    </Variant>

    <Variant title="loading state">
      <AtlasDataTable
        :headers="headers"
        :items="[]"
        loading
      />
    </Variant>

    <Variant title="sortable + paginated">
      <AtlasDataTable
        v-model:sort-by="sortBy"
        v-model:page="page"
        :headers="headers"
        :items="items"
        :items-per-page="2"
      />
    </Variant>
  </Story>
</template>
