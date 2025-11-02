/**
 * Atlas Converter Composable
 * Provides methods for importing/exporting cohort definitions in Atlas JSON format
 */

import { ref } from 'vue'
import type { CohortDefinition } from '@/models/cohort.types'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'

export function useAtlasConverter() {
  const isConverting = ref(false)
  const conversionError = ref<string>('')

  /**
   * Import cohort from Atlas JSON file
   */
  async function importFromAtlas(jsonString: string): Promise<Partial<CohortDefinition> | null> {
    isConverting.value = true
    conversionError.value = ''

    try {
      const atlasJSON = JSON.parse(jsonString)
      const cohort = convertAtlasToInternal(atlasJSON)
      return cohort
    } catch (error) {
      conversionError.value = error instanceof Error ? error.message : 'Invalid Atlas JSON'
      return null
    } finally {
      isConverting.value = false
    }
  }

  /**
   * Export cohort to Atlas JSON format
   */
  function exportToAtlas(cohort: CohortDefinition): string {
    isConverting.value = true
    conversionError.value = ''

    try {
      const atlasJSON = convertInternalToAtlas(cohort)
      return JSON.stringify(atlasJSON, null, 2)
    } catch (error) {
      conversionError.value = error instanceof Error ? error.message : 'Export failed'
      return ''
    } finally {
      isConverting.value = false
    }
  }

  /**
   * Download Atlas JSON as file
   */
  function downloadAtlasJSON(cohort: CohortDefinition, filename: string = 'cohort.json') {
    const json = exportToAtlas(cohort)
    if (!json) return

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Read file and import
   */
  async function importFromFile(file: File): Promise<Partial<CohortDefinition> | null> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target?.result as string
        const cohort = await importFromAtlas(text)
        resolve(cohort)
      }
      reader.onerror = () => {
        conversionError.value = 'Failed to read file'
        resolve(null)
      }
      reader.readAsText(file)
    })
  }

  return {
    isConverting,
    conversionError,
    importFromAtlas,
    exportToAtlas,
    downloadAtlasJSON,
    importFromFile,
  }
}
