<template>
  <div class="domain-prevalence-table">
    <!-- Quiet hint row instead of a heavy v-alert. -->
    <div
      v-if="needsVirtualization"
      class="domain-prevalence-table__hint"
    >
      <v-icon
        icon="mdi-information-outline"
        size="16"
        class="domain-prevalence-table__hint-icon"
      />
      <span>
        Large dataset detected ({{ formatNumber(props.data.length) }} entries).
        Displaying top 1,000 entries by prevalence for performance —
        use search or export CSV for the full dataset.
      </span>
    </div>

    <div class="table-controls mb-4">
      <v-row>
        <v-col
          cols="12"
          md="6"
        >
          <v-text-field
            v-model="search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>
        <v-col
          cols="12"
          md="6"
          class="d-flex justify-end align-center gap-2"
        >
          <v-btn
            variant="outlined"
            prepend-icon="mdi-content-copy"
            @click="copyToClipboard"
          >
            Copy
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-download"
            @click="exportToCSV"
          >
            CSV
          </v-btn>
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn
                variant="outlined"
                prepend-icon="mdi-view-column"
                v-bind="menuProps"
              >
                Columns
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="header in headers"
                :key="header.key"
                @click="toggleColumn(header.key)"
              >
                <template #prepend>
                  <v-checkbox
                    :model-value="!header.hidden"
                    hide-details
                    density="compact"
                  />
                </template>
                <v-list-item-title>{{ header.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </v-col>
      </v-row>
    </div>

    <v-data-table
      v-model:page="currentPage"
      :headers="visibleHeaders"
      :items="filteredData"
      :search="search"
      :items-per-page="itemsPerPage"
      :items-per-page-options="[25, 50, 75, 100, { value: -1, title: 'All' }]"
      class="elevation-1"
      @update:items-per-page="handleItemsPerPageChange"
    >
      <template #item.conceptId="{ item }">
        {{ item.conceptId }}
      </template>
      <template #item.conceptName="{ item }">
        {{ item.conceptName }}
      </template>
      <template #item.personCount="{ item }">
        {{ formatNumber(item.personCount) }}
      </template>
      <template #item.prevalence="{ item }">
        {{ formatPercentage(item.prevalence) }}
      </template>
      <template #item.metric="{ item }">
        {{ item.metric.toFixed(2) }}
      </template>
      
      <!-- Table status text -->
      <template #bottom>
        <div class="table-status-footer pa-3 d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            {{ tableStatusText }}
          </div>
          <v-pagination
            v-if="totalPages > 1"
            v-model="currentPage"
            :length="totalPages"
            :total-visible="7"
            density="compact"
          />
        </div>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PrevalenceTableRow } from '@/models/datasource.types'
import { formatNumber, formatPercentage, exportTableToCSV } from '@/utils/datasource-formatters'
import { logger } from '@/utils/logger'

interface Props {
  data: PrevalenceTableRow[]
  metricLabel: string
}

const props = defineProps<Props>()

const search = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(50)

// Virtualization threshold
const VIRTUALIZATION_THRESHOLD = 10000

interface TableHeader {
  title: string
  key: string
  sortable: boolean
  hidden?: boolean
}

const headers = ref<TableHeader[]>([
  { title: 'Concept ID', key: 'conceptId', sortable: true },
  { title: 'Name', key: 'conceptName', sortable: true },
  { title: 'Person Count', key: 'personCount', sortable: true },
  { title: 'Prevalence (%)', key: 'prevalence', sortable: true },
  { title: props.metricLabel, key: 'metric', sortable: true }
])

const visibleHeaders = computed(() => {
  return headers.value.filter(h => !h.hidden)
})

// Check if dataset needs virtualization
const needsVirtualization = computed(() => {
  return props.data.length > VIRTUALIZATION_THRESHOLD
})

// Aggregate data for very large datasets
const aggregatedData = computed(() => {
  if (!needsVirtualization.value) return props.data

  // For datasets > 10k rows, show top 1000 by prevalence
  logger.info('DomainPrevalenceTable', 'Large dataset detected, showing top 1000 entries by prevalence')
  return [...props.data]
    .sort((a, b) => b.prevalence - a.prevalence)
    .slice(0, 1000)
})

// Filtered data based on search (uses aggregated data for large sets)
const filteredData = computed(() => {
  const dataToFilter = needsVirtualization.value ? aggregatedData.value : props.data
  
  if (!search.value) return dataToFilter
  
  const searchLower = search.value.toLowerCase()
  return dataToFilter.filter(row => 
    row.conceptName.toLowerCase().includes(searchLower) ||
    row.conceptId.toString().includes(searchLower)
  )
})

// Pagination calculations
const totalItems = computed(() => filteredData.value.length)

const totalPages = computed(() => {
  if (itemsPerPage.value === -1) return 1
  return Math.ceil(totalItems.value / itemsPerPage.value)
})

const startItem = computed(() => {
  if (totalItems.value === 0) return 0
  if (itemsPerPage.value === -1) return 1
  return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endItem = computed(() => {
  if (itemsPerPage.value === -1) return totalItems.value
  const end = currentPage.value * itemsPerPage.value
  return Math.min(end, totalItems.value)
})

// Table status text
const tableStatusText = computed(() => {
  if (totalItems.value === 0) {
    return 'No entries found'
  }
  
  if (itemsPerPage.value === -1) {
    return `Showing all ${formatNumber(totalItems.value)} entries`
  }
  
  return `Showing ${formatNumber(startItem.value)} to ${formatNumber(endItem.value)} of ${formatNumber(totalItems.value)} entries`
})

function handleItemsPerPageChange(value: number) {
  itemsPerPage.value = value
  currentPage.value = 1
}

function toggleColumn(key: string) {
  const header = headers.value.find(h => h.key === key)
  if (header) {
    header.hidden = !header.hidden
  }
}

function copyToClipboard() {
  const csv = exportTableToCSV(filteredData.value, props.metricLabel)
  navigator.clipboard.writeText(csv).then(() => {
    logger.debug('DomainPrevalenceTable', `Copied to clipboard: ${filteredData.value.length} rows`)
  })
}

function exportToCSV() {
  const csv = exportTableToCSV(filteredData.value, props.metricLabel)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prevalence-data.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.domain-prevalence-table {
  width: 100%;
}

.domain-prevalence-table__hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.domain-prevalence-table__hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
