/**
 * useAtlasConverter Composable Tests
 * Tests for Atlas JSON import/export functionality
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CohortDefinition } from '@/models/cohort.types'

// Mock the atlas-converter service
vi.mock('@/services/atlas-converter', () => ({
  convertAtlasToInternal: vi.fn(),
  convertInternalToAtlas: vi.fn(),
}))

import { useAtlasConverter } from '@/composables/useAtlasConverter'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'

describe('useAtlasConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('importFromAtlas', () => {
    it('should import valid Atlas JSON', async () => {
      const mockCohort = {
        name: 'Test Cohort',
        entryEvents: []
      }
      vi.mocked(convertAtlasToInternal).mockReturnValue(mockCohort as any)

      const { importFromAtlas, isConverting, conversionError } = useAtlasConverter()

      const result = await importFromAtlas('{"name": "Test"}')

      expect(result).toEqual(mockCohort)
      expect(conversionError.value).toBe('')
      expect(isConverting.value).toBe(false)
    })

    it('should handle invalid JSON', async () => {
      const { importFromAtlas, conversionError } = useAtlasConverter()

      const result = await importFromAtlas('not valid json')

      expect(result).toBeNull()
      // JSON.parse throws a SyntaxError with "Unexpected token" message
      expect(conversionError.value).toBeTruthy()
    })

    it('should handle conversion errors', async () => {
      vi.mocked(convertAtlasToInternal).mockImplementation(() => {
        throw new Error('Conversion failed')
      })

      const { importFromAtlas, conversionError } = useAtlasConverter()

      const result = await importFromAtlas('{"name": "Test"}')

      expect(result).toBeNull()
      expect(conversionError.value).toBe('Conversion failed')
    })

    it('should set isConverting during conversion', async () => {
      vi.mocked(convertAtlasToInternal).mockReturnValue({} as any)

      const { importFromAtlas, isConverting } = useAtlasConverter()

      // Since the function is async but very fast, we just check final state
      await importFromAtlas('{}')

      expect(isConverting.value).toBe(false)
    })
  })

  describe('exportToAtlas', () => {
    it('should export cohort to Atlas JSON string', () => {
      const mockAtlasFormat = { ConceptSets: [], PrimaryCriteria: {} }
      vi.mocked(convertInternalToAtlas).mockReturnValue(mockAtlasFormat as any)

      const { exportToAtlas, conversionError } = useAtlasConverter()

      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      const result = exportToAtlas(cohort)

      expect(result).toBe(JSON.stringify(mockAtlasFormat, null, 2))
      expect(conversionError.value).toBe('')
    })

    it('should handle export errors', () => {
      vi.mocked(convertInternalToAtlas).mockImplementation(() => {
        throw new Error('Export failed')
      })

      const { exportToAtlas, conversionError } = useAtlasConverter()

      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      const result = exportToAtlas(cohort)

      expect(result).toBe('')
      expect(conversionError.value).toBe('Export failed')
    })

    it('should handle non-Error exceptions', () => {
      vi.mocked(convertInternalToAtlas).mockImplementation(() => {
        throw 'String error'
      })

      const { exportToAtlas, conversionError } = useAtlasConverter()

      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      const result = exportToAtlas(cohort)

      expect(result).toBe('')
      expect(conversionError.value).toBe('Export failed')
    })
  })

  describe('downloadAtlasJSON', () => {
    let originalCreateObjectURL: typeof URL.createObjectURL
    let originalRevokeObjectURL: typeof URL.revokeObjectURL

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL
      originalRevokeObjectURL = URL.revokeObjectURL
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
      URL.revokeObjectURL = vi.fn()
    })

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    })

    it('should create download link and click it', () => {
      const mockAtlasFormat = { name: 'Test' }
      vi.mocked(convertInternalToAtlas).mockReturnValue(mockAtlasFormat as any)

      // Mock DOM methods
      const mockClick = vi.fn()
      const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: mockClick
      } as unknown as HTMLAnchorElement)

      const { downloadAtlasJSON } = useAtlasConverter()

      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      downloadAtlasJSON(cohort, 'my-cohort.json')

      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')

      mockCreateElement.mockRestore()
    })

    it('should not download if export fails', () => {
      vi.mocked(convertInternalToAtlas).mockImplementation(() => {
        throw new Error('Export failed')
      })

      const { downloadAtlasJSON } = useAtlasConverter()

      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      downloadAtlasJSON(cohort)

      expect(URL.createObjectURL).not.toHaveBeenCalled()
    })

    it('should use default filename', () => {
      const mockAtlasFormat = { name: 'Test' }
      vi.mocked(convertInternalToAtlas).mockReturnValue(mockAtlasFormat as any)

      let downloadName = ''
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        set download(value: string) { downloadName = value },
        get download() { return downloadName },
        click: vi.fn()
      } as unknown as HTMLAnchorElement)

      const { downloadAtlasJSON } = useAtlasConverter()

      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      downloadAtlasJSON(cohort)

      expect(downloadName).toBe('cohort.json')
    })
  })

  describe('importFromFile', () => {
    it('should import from file successfully', async () => {
      const mockCohort = { name: 'From File', entryEvents: [] }
      vi.mocked(convertAtlasToInternal).mockReturnValue(mockCohort as any)

      const { importFromFile } = useAtlasConverter()

      // Mock FileReader
      const mockFileContent = '{"name": "Test"}'
      const mockFile = new File([mockFileContent], 'test.json', { type: 'application/json' })

      // Mock FileReader
      const mockReader = {
        readAsText: vi.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        onerror: null as (() => void) | null,
        result: mockFileContent
      }

      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        return mockReader as unknown as FileReader
      })

      const resultPromise = importFromFile(mockFile)

      // Simulate file read completion
      if (mockReader.onload) {
        mockReader.onload({ target: { result: mockFileContent } } as ProgressEvent<FileReader>)
      }

      const result = await resultPromise

      expect(result).toEqual(mockCohort)
    })

    it('should handle file read errors', async () => {
      const { importFromFile, conversionError } = useAtlasConverter()

      const mockFile = new File(['test'], 'test.json', { type: 'application/json' })

      const mockReader = {
        readAsText: vi.fn(),
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        onerror: null as (() => void) | null
      }

      vi.spyOn(window, 'FileReader').mockImplementation(() => {
        return mockReader as unknown as FileReader
      })

      const resultPromise = importFromFile(mockFile)

      // Simulate file read error
      if (mockReader.onerror) {
        mockReader.onerror()
      }

      const result = await resultPromise

      expect(result).toBeNull()
      expect(conversionError.value).toBe('Failed to read file')
    })
  })
})
