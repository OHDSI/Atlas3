<!--
  TableExport Component - Export functionality for data tables (CSV export and clipboard copy)
-->
<template>
  <div class="table-export-controls">
    <v-btn-group
      variant="outlined"
      density="compact"
    >
      <AtlasButton
        size="sm"
        variant="secondary"
        icon="mdi-content-copy"
        :loading="copying"
        :disabled="!data || data.length === 0 || copying || exporting"
        @click="handleCopy"
      >
        {{ t('datatable.language.buttons.copy', 'Copy').value }}
      </AtlasButton>
      <AtlasButton
        size="sm"
        variant="secondary"
        icon="mdi-file-delimited"
        :loading="exporting"
        :disabled="!data || data.length === 0 || copying || exporting"
        @click="handleExportCSV"
      >
        CSV
      </AtlasButton>
    </v-btn-group>

    <AtlasSnackbar
      v-model="showToast"
      :severity="toastSeverity"
      :text="toastMessage"
      :timeout="toastTimeout"
      location="top"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AtlasButton, AtlasSnackbar } from '@/components/ui'
import type { AtlasSnackbarSeverity } from '@/components/ui'
import * as Papa from 'papaparse'
import { logger } from '@/utils/logger'
import { useI18n } from '@/composables/useI18n'

const { t, tv } = useI18n()

/**
 * Props
 */
const props = defineProps<{
  data: Array<Record<string, unknown>>
  headers: Array<{ key: string; title: string }>
  filename?: string
}>()

/**
 * Export state
 */
const copying = ref(false)
const exporting = ref(false)

/**
 * Toast notification state
 */
const showToast = ref(false)
const toastMessage = ref('')
const toastSeverity = ref<AtlasSnackbarSeverity>('info')
const toastTimeout = ref(3000)

/**
 * Show toast notification
 */
function showToastNotification(
  message: string,
  color: 'success' | 'error' | 'info' = 'info',
  timeout = 3000
) {
  toastMessage.value = message
  toastSeverity.value = color === 'error' ? 'danger' : color
  toastTimeout.value = timeout
  showToast.value = true
}

/**
 * Copy table data to clipboard
 */
async function handleCopy() {
  if (!props.data || props.data.length === 0) return

  copying.value = true

  try {
    // Format data as tab-separated values (TSV) for better spreadsheet compatibility
    const headerRow = props.headers.map(h => h.title).join('\t')
    const dataRows = props.data.map(row => {
      return props.headers
        .map(h => {
          const value = row[h.key]
          // Handle null/undefined
          if (value == null) return ''
          // Handle objects/arrays
          if (typeof value === 'object') return JSON.stringify(value)
          // Convert to string
          return String(value)
        })
        .join('\t')
    })

    const tsvContent = [headerRow, ...dataRows].join('\n')

    // Try modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvContent)
      showToastNotification(
        tv('components.tableExport.copiedRows', 'Copied {count} rows to clipboard', {
          count: props.data.length,
        }),
        'success'
      )
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
          showToastNotification(
            tv('components.tableExport.copiedRows', 'Copied {count} rows to clipboard', {
              count: props.data.length,
            }),
            'success'
          )
        } else {
          throw new Error('Copy command failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    }
  } catch (error) {
    logger.error('TableExport', 'Copy failed', error)
    showToastNotification(
      tv('components.tableExport.copyFailed', 'Failed to copy data to clipboard'),
      'error',
      5000
    )
  } finally {
    copying.value = false
  }
}

/**
 * Export table data as CSV
 */
async function handleExportCSV() {
  if (!props.data || props.data.length === 0) return

  exporting.value = true

  try {
    // Prepare data for CSV export
    const csvData = props.data.map(row => {
      const csvRow: Record<string, unknown> = {}
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
      skipEmptyLines: true,
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

    showToastNotification(
      tv('components.tableExport.exportedRows', 'Exported {count} rows to {filename}.csv', {
        count: props.data.length,
        filename,
      }),
      'success',
      4000
    )
  } catch (error) {
    logger.error('TableExport', 'CSV export failed', error)
    showToastNotification(
      tv('components.tableExport.exportFailed', 'Failed to export CSV file'),
      'error',
      5000
    )
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
