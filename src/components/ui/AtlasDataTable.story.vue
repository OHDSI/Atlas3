<script setup lang="ts">
import { ref } from 'vue'
import AtlasDataTable from './AtlasDataTable.vue'
import AtlasChip from './AtlasChip.vue'
import AtlasStoryDocs from './_story/AtlasStoryDocs.vue'

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
    <Variant title="Overview">
      <AtlasStoryDocs
        name="AtlasDataTable"
        description="Data grid wrapping Vuetify's VDataTable with compact density, brand defaults and full slot forwarding for custom cells."
        :props="[
          { name: 'headers', type: 'Header[]', default: '(required)', description: 'Column definitions ({ key, title, value, sortable, align, width }).' },
          { name: 'items', type: 'unknown[]', default: '(required)', description: 'Row data.' },
          { name: 'loading', type: 'boolean', default: 'false', description: 'Shows the loading indicator.' },
          { name: 'itemsPerPage', type: 'number', default: '10', description: 'Page size.' },
          { name: 'page', type: 'number', default: '1', description: 'Current page (1-based). Use v-model:page.' },
          { name: 'sortBy', type: 'SortItem[]', default: '[]', description: 'Active sort. Use v-model:sort-by.' },
          { name: 'height', type: 'number | string', default: 'undefined', description: 'Fixed table height (enables internal scroll).' },
          { name: 'fixedHeader', type: 'boolean', default: 'false', description: 'Keeps the header visible while scrolling.' },
          { name: 'hideDefaultFooter', type: 'boolean', default: 'false', description: 'Hides the pagination footer.' },
          { name: 'noDataText', type: 'string', default: 'undefined', description: 'Text shown when there are no items.' },
          { name: 'loadingText', type: 'string', default: 'undefined', description: 'Text shown while loading.' },
          { name: 'caption', type: 'string', default: 'undefined', description: 'Accessible label (aria-label) for the table.' },
        ]"
        :events="[
          { name: 'update:page', payload: 'number', description: 'Emitted on page change.' },
          { name: 'update:itemsPerPage', payload: 'number', description: 'Emitted on page-size change.' },
          { name: 'update:sortBy', payload: 'SortItem[]', description: 'Emitted on sort change.' },
        ]"
        :slots="[{ name: '(all VDataTable slots)', description: 'Every slot is forwarded, e.g. #item.<key> for custom cell rendering.' }]"
        usage="<AtlasDataTable :headers=&quot;headers&quot; :items=&quot;items&quot;><template #item.status=&quot;{ item }&quot;>...</template></AtlasDataTable>"
      />
    </Variant>

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
