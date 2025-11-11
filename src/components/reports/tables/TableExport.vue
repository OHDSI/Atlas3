<!--
  TableExport Component
  Feature: 005-cohort-reports
  Tasks: T121-T124

  Provides export functionality for data tables
  Supports CSV export and clipboard copy with toast notifications
-->
<template>
  <div class="table-export-controls">
    <v-btn-group
      variant="outlined"
      density="compact"
    >
      <v-btn
        size="small"
        prepend-icon="mdi-content-copy"
        :loading="copying"
        :disabled="!data || data.length === 0 || copying || exporting"
        @click="handleCopy"
      >
        Copy
      </v-btn>
      <v-btn
        size="small"
        prepend-icon="mdi-file-delimited"
        :loading="exporting"
        :disabled="!data || data.length === 0 || copying || exporting"
        @click="handleExportCSV"
      >
        CSV
      </v-btn>
    </v-btn-group>

    <!-- T124: Toast notifications -->
    <v-snackbar
      v-model="showToast"
      :timeout="toastTimeout"
      :color="toastColor"
      location="top right"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          size="small"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as Papa from 'papaparse'

/**
 * Props
 */
const props = defineProps<{
  data: any[]
  headers: Array<{ key: string; title: string }>
  filename?: string
}>()

/**
 * Export state
 */
const copying = ref(false)
const exporting = ref(false)

/**
 * T124: Toast notification state
 */
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'error' | 'info'>('info')
const toastTimeout = ref(3000)

/**
 * Show toast notification
 */
function showToastNotification(message: string, color: 'success' | 'error' | 'info' = 'info', timeout = 3000) {
  toastMessage.value = message
  toastColor.value = color
  toastTimeout.value = timeout
  showToast.value = true
}

/**
 * T123: Copy table data to clipboard
 * Uses Clipboard API with fallback
 */
async function handleCopy() {
  if (!props.data || props.data.length === 0) return

  copying.value = true

  try {
    // Format data as tab-separated values (TSV) for better spreadsheet compatibility
    const headerRow = props.headers.map(h => h.title).join('\t')
    const dataRows = props.data.map(row => {
      return props.headers.map(h => {
        const value = row[h.key]
        // Handle null/undefined
        if (value == null) return ''
        // Handle objects/arrays
        if (typeof value === 'object') return JSON.stringify(value)
        // Convert to string
        return String(value)
      }).join('\t')
    })

    const tsvContent = [headerRow, ...dataRows].join('\n')

    // Try modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvContent)
      showToastNotification(`Copied ${props.data.length} rows to clipboard`, 'success')
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = tsvContent
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        const successful = document.execCommand('copy')
        if (successful) {
          showToastNotification(`Copied ${props.data.length} rows to clipboard`, 'success')
        } else {
          throw new Error('Copy command failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    }
  } catch (error) {
    console.error('[TableExport] Copy failed:', error)
    showToastNotification('Failed to copy data to clipboard', 'error', 5000)
  } finally {
    copying.value = false
  }
}

/**
 * T122: Export table data as CSV
 * Uses papaparse for robust CSV generation
 */
async function handleExportCSV() {
  if (!props.data || props.data.length === 0) return

  exporting.value = true

  try {
    // Prepare data for CSV export
    const csvData = props.data.map(row => {
      const csvRow: Record<string, any> = {}
      props.headers.forEach(header => {
        const value = row[header.key]
        // Use header title as column name in CSV
        csvRow[header.title] = value == null ? '' : value
      })
      return csvRow
    })

    // Generate CSV using papaparse
    const csv = Papa.unparse(csvData, {
      quotes: true, // Quote all fields
      header: true, // Include header row
      skipEmptyLines: true
    })

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const filename = props.filename || `table-export-${Date.now()}`
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    showToastNotification(`Exported ${props.data.length} rows to ${filename}.csv`, 'success', 4000)
  } catch (error) {
    console.error('[TableExport] CSV export failed:', error)
    showToastNotification('Failed to export CSV file', 'error', 5000)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.table-export-controls {
  display: inline-flex;
  align-items: center;
}
</style>
