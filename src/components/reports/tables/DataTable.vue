<!--
  DataTable Component
  Feature: 005-cohort-reports
  Tasks: T052-T058, T125, T160

  Vuetify data table wrapper with pagination, sorting, search, export
  Includes debounced search for performance optimization
-->
<template>
  <div class="data-table-container">
    <!-- Toolbar -->
    <v-card-text class="d-flex align-center justify-space-between px-0 pb-2">
      <!-- Search -->
      <v-text-field
        v-if="searchable"
        v-model="searchQuery"
        density="compact"
        variant="outlined"
        label="Search table"
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        :style="{ maxWidth: '400px' }"
      />

      <v-spacer v-if="searchable" />

      <!-- Actions -->
      <div class="d-flex gap-2">
        <!-- Column visibility toggle -->
        <v-menu v-if="showColumnToggle" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="outlined"
              prepend-icon="mdi-view-column"
              size="small"
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
                <v-checkbox-btn
                  :model-value="!hiddenColumns.has(header.key)"
                  hide-details
                />
              </template>
              <v-list-item-title>{{ header.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <!-- T125: TableExport component integration -->
        <TableExport
          v-if="showCopyButton || showExportButton"
          :data="exportData"
          :headers="visibleHeaders"
          :filename="exportFilename"
        />
      </div>
    </v-card-text>

    <!-- Data table -->
    <v-data-table
      :headers="visibleHeaders"
      :items="filteredItems"
      :loading="loading"
      :items-per-page="itemsPerPage"
      :items-per-page-options="itemsPerPageOptions"
      :search="debouncedSearchQuery"
      :custom-filter="customFilter"
      density="comfortable"
      class="elevation-0"
    >
      <!-- Loading slot -->
      <template #loading>
        <v-skeleton-loader type="table-row@10" />
      </template>

      <!-- No data slot -->
      <template #no-data>
        <v-alert type="info" variant="tonal" class="ma-4">
          No data available
        </v-alert>
      </template>

      <!-- Custom cell formatting -->
      <template
        v-for="header in visibleHeaders"
        :key="header.key"
        #[`item.${header.key}`]="{ item }"
      >
        <slot :name="`item.${header.key}`" :item="item" :value="item[header.key]">
          {{ formatCell(item[header.key], header) }}
        </slot>
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { TableHeader, TableRow } from '@/models/report.types'
import TableExport from './TableExport.vue'

/**
 * Props
 */
const props = withDefaults(
  defineProps<{
    headers: TableHeader[]
    items: TableRow[]
    loading?: boolean
    searchable?: boolean
    showColumnToggle?: boolean
    showCopyButton?: boolean
    showExportButton?: boolean
    exportFilename?: string
  }>(),
  {
    loading: false,
    searchable: true,
    showColumnToggle: true,
    showCopyButton: true,
    showExportButton: true,
    exportFilename: 'data-export'
  }
)

/**
 * State
 */
const searchQuery = ref('')
const debouncedSearchQuery = ref('') // T160: Debounced search
const hiddenColumns = ref<Set<string>>(new Set())
const itemsPerPage = ref(25)

/**
 * T160: Debounce search input (300ms delay)
 * Reduces filtering operations while user is typing
 */
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (newValue) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = newValue
  }, 300)
})

/**
 * Items per page options (T053)
 */
const itemsPerPageOptions = [
  { value: 10, title: '10' },
  { value: 25, title: '25' },
  { value: 50, title: '50' },
  { value: 100, title: '100' },
  { value: -1, title: 'All' }
]

/**
 * Visible headers (excluding hidden columns)
 */
const visibleHeaders = computed(() => {
  return props.headers.filter(h => !hiddenColumns.value.has(h.key))
})

/**
 * Filtered items (T055, T160)
 * Uses debounced search query for performance
 */
const filteredItems = computed(() => {
  if (!debouncedSearchQuery.value) return props.items

  const query = debouncedSearchQuery.value.toLowerCase()
  return props.items.filter(item => {
    return visibleHeaders.value.some(header => {
      const value = item[header.key]
      if (value == null) return false
      return String(value).toLowerCase().includes(query)
    })
  })
})

/**
 * T125: Export data formatted for TableExport component
 */
const exportData = computed(() => {
  return filteredItems.value.map(item => {
    const row: Record<string, any> = {}
    visibleHeaders.value.forEach(header => {
      row[header.key] = item[header.key]
    })
    return row
  })
})

/**
 * Custom filter function for search
 */
function customFilter(value: any, query: string, item?: any) {
  if (!query) return true
  const searchLower = query.toLowerCase()

  return visibleHeaders.value.some(header => {
    const cellValue = item?.[header.key]
    if (cellValue == null) return false
    return String(cellValue).toLowerCase().includes(searchLower)
  })
}

/**
 * Toggle column visibility (T056)
 */
function toggleColumn(key: string) {
  if (hiddenColumns.value.has(key)) {
    hiddenColumns.value.delete(key)
  } else {
    hiddenColumns.value.add(key)
  }
  // Force reactivity
  hiddenColumns.value = new Set(hiddenColumns.value)
}

/**
 * Format cell value
 */
function formatCell(value: any, header: TableHeader) {
  if (value == null) return '-'

  // Format numbers with thousands separator
  if (typeof value === 'number' && !header.key.includes('id')) {
    if (header.key.includes('percent') || header.key.includes('prevalence')) {
      return `${value.toFixed(1)}%`
    }
    return value.toLocaleString()
  }

  return value
}
</script>

<style scoped>
.data-table-container {
  width: 100%;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
