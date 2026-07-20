/**
 * Atlas Converter Composable
 * Provides methods for importing/exporting cohort definitions in Atlas JSON format
 */

import { ref } from 'vue'
import type { CohortDefinition } from '@/models/cohort.types'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.json']

interface FileValidationResult {
  valid: boolean
  error?: string
}

export function useAtlasConverter() {
  const isConverting = ref(false)
  const conversionError = ref<string>('')

  /**
   * Validate file before processing
   */
  function validateFile(file: File): FileValidationResult {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      }
    }

    // Check file extension
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!hasValidExtension) {
      return { valid: false, error: 'File must be JSON format (.json)' }
    }

    return { valid: true }
  }

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
   * Read a file's raw text after validating it. Returns null (and sets
   * conversionError) if the file is rejected or unreadable. Callers that
   * want the parsed cohort should use importFromFile; callers that want to
   * show the JSON to the user first (the JSON editor) use this.
   */
  async function readFileText(file: File): Promise<string | null> {
    const validation = validateFile(file)
    if (!validation.valid) {
      conversionError.value = validation.error || 'Invalid file'
      return null
    }

    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => {
        resolve((e.target?.result as string) ?? '')
      }
      reader.onerror = () => {
        conversionError.value = 'Failed to read file'
        resolve(null)
      }
      reader.readAsText(file)
    })
  }

  /**
   * Read file and import
   */
  async function importFromFile(file: File): Promise<Partial<CohortDefinition> | null> {
    conversionError.value = ''

    const text = await readFileText(file)
    if (text === null) return null

    return importFromAtlas(text)
  }

  return {
    isConverting,
    conversionError,
    importFromAtlas,
    exportToAtlas,
    downloadAtlasJSON,
    importFromFile,
    readFileText,
  }
}
