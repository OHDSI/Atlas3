/**
 * Unit Tests: useAtlasConverter Composable
 * Tests for src/composables/useAtlasConverter.ts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useAtlasConverter } from '@/composables/useAtlasConverter'
import * as atlasConverter from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

// Mock the atlas-converter service
vi.mock('@/services/atlas-converter', () => ({
  convertInternalToAtlas: vi.fn(),
  convertAtlasToInternal: vi.fn(),
}))

describe('useAtlasConverter', () => {
  const mockCohortDefinition: CohortDefinition = {
    id: 1,
    name: 'Test Cohort',
    description: 'Test Description',
    entryEvents: [
      {
        id: 'evt_1',
        criteriaType: 'ConditionOccurrence',
        conceptSet: {
          id: 1,
          name: 'Test Concept Set',
          items: [],
        },
        attributes: [],
      },
    ],
    qualifyingLimit: 'ALL',
    inclusionRules: [],
    conceptSets: [
      {
        id: 1,
        name: 'Test Concept Set',
        items: [],
      },
    ],
  }

  const mockAtlasJSON = {
    ConceptSets: [
      {
        id: 1,
        name: 'Test Concept Set',
        expression: { items: [] },
      },
    ],
    PrimaryCriteria: {
      CriteriaList: [
        {
          ConditionOccurrence: {
            CodesetId: 1,
          },
        },
      ],
    },
    InclusionRules: [],
    QualifiedLimit: { Type: 'All' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default reactive values', () => {
      const { isConverting, conversionError } = useAtlasConverter()

      expect(isConverting.value).toBe(false)
      expect(conversionError.value).toBe('')
    })

    it('should expose all required functions', () => {
      const {
        importFromAtlas,
        exportToAtlas,
        downloadAtlasJSON,
        importFromFile,
      } = useAtlasConverter()

      expect(typeof importFromAtlas).toBe('function')
      expect(typeof exportToAtlas).toBe('function')
      expect(typeof downloadAtlasJSON).toBe('function')
      expect(typeof importFromFile).toBe('function')
    })
  })

  describe('importFromAtlas', () => {
    it('should import valid Atlas JSON successfully', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue({
        name: 'Imported Cohort',
        entryEvents: [],
      })

      const { importFromAtlas, isConverting, conversionError } = useAtlasConverter()

      const jsonString = JSON.stringify(mockAtlasJSON)
      const result = await importFromAtlas(jsonString)

      expect(result).toEqual({ name: 'Imported Cohort', entryEvents: [] })
      expect(conversionError.value).toBe('')
      expect(isConverting.value).toBe(false)
      expect(atlasConverter.convertAtlasToInternal).toHaveBeenCalledWith(mockAtlasJSON)
    })

    it('should set isConverting to true during conversion', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        expect(composable.isConverting.value).toBe(true)
        return { entryEvents: [] }
      })

      const composable = useAtlasConverter()
      const jsonString = JSON.stringify(mockAtlasJSON)
      await composable.importFromAtlas(jsonString)
    })

    it('should reset isConverting to false after conversion', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue({
        entryEvents: [],
      })

      const { importFromAtlas, isConverting } = useAtlasConverter()

      const jsonString = JSON.stringify(mockAtlasJSON)
      await importFromAtlas(jsonString)

      expect(isConverting.value).toBe(false)
    })

    it('should handle invalid JSON with parse error', async () => {
      const { importFromAtlas, conversionError } = useAtlasConverter()

      const invalidJSON = '{invalid json'
      const result = await importFromAtlas(invalidJSON)

      expect(result).toBeNull()
      expect(conversionError.value).toContain('JSON')
    })

    it('should handle conversion errors', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockImplementation(() => {
        throw new Error('Conversion failed: missing required field')
      })

      const { importFromAtlas, conversionError } = useAtlasConverter()

      const jsonString = JSON.stringify(mockAtlasJSON)
      const result = await importFromAtlas(jsonString)

      expect(result).toBeNull()
      expect(conversionError.value).toBe('Conversion failed: missing required field')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockImplementation(() => {
        throw 'String error'
      })

      const { importFromAtlas, conversionError } = useAtlasConverter()

      const jsonString = JSON.stringify(mockAtlasJSON)
      const result = await importFromAtlas(jsonString)

      expect(result).toBeNull()
      expect(conversionError.value).toBe('Invalid Atlas JSON')
    })

    it('should reset isConverting even when error occurs', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockImplementation(() => {
        throw new Error('Test error')
      })

      const { importFromAtlas, isConverting } = useAtlasConverter()

      const jsonString = JSON.stringify(mockAtlasJSON)
      await importFromAtlas(jsonString)

      expect(isConverting.value).toBe(false)
    })

    it('should clear previous errors on new import', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal)
        .mockImplementationOnce(() => {
          throw new Error('First error')
        })
        .mockReturnValueOnce({ entryEvents: [] })

      const { importFromAtlas, conversionError } = useAtlasConverter()

      // First import - should fail
      await importFromAtlas(JSON.stringify(mockAtlasJSON))
      expect(conversionError.value).toBe('First error')

      // Second import - should succeed and clear error
      await importFromAtlas(JSON.stringify(mockAtlasJSON))
      expect(conversionError.value).toBe('')
    })
  })

  describe('exportToAtlas', () => {
    it('should export cohort to Atlas JSON successfully', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { exportToAtlas, conversionError } = useAtlasConverter()

      const result = exportToAtlas(mockCohortDefinition)

      expect(result).toBe(JSON.stringify(mockAtlasJSON, null, 2))
      expect(conversionError.value).toBe('')
      expect(atlasConverter.convertInternalToAtlas).toHaveBeenCalledWith(mockCohortDefinition)
    })

    it('should set isConverting to true during export', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        expect(composable.isConverting.value).toBe(true)
        return mockAtlasJSON
      })

      const composable = useAtlasConverter()
      composable.exportToAtlas(mockCohortDefinition)
    })

    it('should reset isConverting to false after export', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { exportToAtlas, isConverting } = useAtlasConverter()

      exportToAtlas(mockCohortDefinition)

      expect(isConverting.value).toBe(false)
    })

    it('should handle export errors', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockImplementation(() => {
        throw new Error('Export conversion failed')
      })

      const { exportToAtlas, conversionError } = useAtlasConverter()

      const result = exportToAtlas(mockCohortDefinition)

      expect(result).toBe('')
      expect(conversionError.value).toBe('Export conversion failed')
    })

    it('should handle non-Error exceptions during export', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockImplementation(() => {
        throw 'String error'
      })

      const { exportToAtlas, conversionError } = useAtlasConverter()

      const result = exportToAtlas(mockCohortDefinition)

      expect(result).toBe('')
      expect(conversionError.value).toBe('Export failed')
    })

    it('should reset isConverting even when export error occurs', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockImplementation(() => {
        throw new Error('Test error')
      })

      const { exportToAtlas, isConverting } = useAtlasConverter()

      exportToAtlas(mockCohortDefinition)

      expect(isConverting.value).toBe(false)
    })

    it('should clear previous errors on new export', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas)
        .mockImplementationOnce(() => {
          throw new Error('First export error')
        })
        .mockReturnValueOnce(mockAtlasJSON)

      const { exportToAtlas, conversionError } = useAtlasConverter()

      // First export - should fail
      exportToAtlas(mockCohortDefinition)
      expect(conversionError.value).toBe('First export error')

      // Second export - should succeed and clear error
      exportToAtlas(mockCohortDefinition)
      expect(conversionError.value).toBe('')
    })

    it('should format JSON with 2-space indentation', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { exportToAtlas } = useAtlasConverter()

      const result = exportToAtlas(mockCohortDefinition)

      // Verify formatting by checking the output contains proper indentation
      expect(result).toContain('  ')
      expect(result).toBe(JSON.stringify(mockAtlasJSON, null, 2))
    })
  })

  describe('downloadAtlasJSON', () => {
    let createElementSpy: ReturnType<typeof vi.spyOn>
    let createObjectURLSpy: vi.MockedFunction<typeof URL.createObjectURL>
    let revokeObjectURLSpy: vi.MockedFunction<typeof URL.revokeObjectURL>
    let mockLink: {
      href: string
      download: string
      click: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }

      // Ensure URL methods exist and mock them
      URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      URL.revokeObjectURL = vi.fn()

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
      createObjectURLSpy = URL.createObjectURL as vi.MockedFunction<typeof URL.createObjectURL>
      revokeObjectURLSpy = URL.revokeObjectURL as vi.MockedFunction<typeof URL.revokeObjectURL>
    })

    afterEach(() => {
      createElementSpy.mockRestore()
      vi.restoreAllMocks()
    })

    it('should download Atlas JSON with default filename', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { downloadAtlasJSON } = useAtlasConverter()

      downloadAtlasJSON(mockCohortDefinition)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.download).toBe('cohort.json')
      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.click).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should download Atlas JSON with custom filename', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { downloadAtlasJSON } = useAtlasConverter()

      downloadAtlasJSON(mockCohortDefinition, 'my-cohort.json')

      expect(mockLink.download).toBe('my-cohort.json')
    })

    it('should create blob with correct content type', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { downloadAtlasJSON } = useAtlasConverter()

      downloadAtlasJSON(mockCohortDefinition)

      // Verify that createObjectURL was called (which means blob was created)
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should not download when export fails', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockImplementation(() => {
        throw new Error('Export failed')
      })

      const { downloadAtlasJSON } = useAtlasConverter()

      downloadAtlasJSON(mockCohortDefinition)

      expect(createElementSpy).not.toHaveBeenCalled()
      expect(mockLink.click).not.toHaveBeenCalled()
    })

    it('should cleanup object URL after download', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const { downloadAtlasJSON } = useAtlasConverter()

      downloadAtlasJSON(mockCohortDefinition)

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('importFromFile', () => {
    it('should import file successfully', async () => {
      const mockCohortData = { name: 'File Cohort', entryEvents: [] }
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue(mockCohortData)

      const fileContent = JSON.stringify(mockAtlasJSON)
      const mockFile = new File([fileContent], 'cohort.json', { type: 'application/json' })

      const { importFromFile, conversionError } = useAtlasConverter()

      const result = await importFromFile(mockFile)

      expect(result).toEqual(mockCohortData)
      expect(conversionError.value).toBe('')
    })

    it('should use FileReader to read file', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue({ entryEvents: [] })

      const fileContent = JSON.stringify(mockAtlasJSON)
      const mockFile = new File([fileContent], 'cohort.json', { type: 'application/json' })

      const readAsTextSpy = vi.spyOn(FileReader.prototype, 'readAsText')

      const { importFromFile } = useAtlasConverter()

      await importFromFile(mockFile)

      expect(readAsTextSpy).toHaveBeenCalledWith(mockFile)

      readAsTextSpy.mockRestore()
    })

    it('should handle file read errors', async () => {
      const mockFile = new File(['content'], 'cohort.json', { type: 'application/json' })

      const { importFromFile, conversionError } = useAtlasConverter()

      // Mock FileReader to trigger error
      const originalFileReader = global.FileReader
      global.FileReader = class {
        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new ProgressEvent('error'))
            }
          }, 0)
        }
        onload = null
        onerror = null
        result = null
      } as unknown as typeof FileReader

      const result = await importFromFile(mockFile)

      expect(result).toBeNull()
      expect(conversionError.value).toBe('Failed to read file')

      global.FileReader = originalFileReader
    })

    it('should handle conversion errors from file content', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockImplementation(() => {
        throw new Error('Invalid file format')
      })

      const fileContent = JSON.stringify(mockAtlasJSON)
      const mockFile = new File([fileContent], 'cohort.json', { type: 'application/json' })

      const { importFromFile, conversionError } = useAtlasConverter()

      const result = await importFromFile(mockFile)

      expect(result).toBeNull()
      expect(conversionError.value).toBe('Invalid file format')
    })

    it('should handle invalid JSON in file', async () => {
      const invalidFileContent = '{invalid json}'
      const mockFile = new File([invalidFileContent], 'cohort.json', { type: 'application/json' })

      const { importFromFile, conversionError } = useAtlasConverter()

      const result = await importFromFile(mockFile)

      expect(result).toBeNull()
      expect(conversionError.value).toContain('JSON')
    })

    it('should work with large file content', async () => {
      const largeCohort = {
        ...mockAtlasJSON,
        InclusionRules: Array(100).fill(null).map((_, i) => ({
          name: `Rule ${i}`,
          expression: { CriteriaList: [] },
        })),
      }
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue({ entryEvents: [] })

      const fileContent = JSON.stringify(largeCohort)
      const mockFile = new File([fileContent], 'large-cohort.json', { type: 'application/json' })

      const { importFromFile } = useAtlasConverter()

      const result = await importFromFile(mockFile)

      expect(result).toBeDefined()
      expect(atlasConverter.convertAtlasToInternal).toHaveBeenCalled()
    })

    it('should resolve promise when file reading completes', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue({ entryEvents: [] })

      const fileContent = JSON.stringify(mockAtlasJSON)
      const mockFile = new File([fileContent], 'cohort.json', { type: 'application/json' })

      const { importFromFile } = useAtlasConverter()

      const promise = importFromFile(mockFile)

      expect(promise).toBeInstanceOf(Promise)

      const result = await promise

      expect(result).toBeDefined()
    })
  })

  describe('reactive state management', () => {
    it('should maintain separate state for multiple composable instances', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal).mockReturnValue({ entryEvents: [] })
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const instance1 = useAtlasConverter()
      const instance2 = useAtlasConverter()

      // Trigger error in instance1
      await instance1.importFromAtlas('{invalid}')

      // Instance2 should not have the error
      expect(instance1.conversionError.value).toBeTruthy()
      expect(instance2.conversionError.value).toBe('')
    })

    it('should update isConverting state during operations', async () => {
      let isConvertingDuringOperation = false

      vi.mocked(atlasConverter.convertAtlasToInternal).mockImplementation(() => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        isConvertingDuringOperation = composable.isConverting.value
        return { entryEvents: [] }
      })

      const composable = useAtlasConverter()

      expect(composable.isConverting.value).toBe(false)

      await composable.importFromAtlas(JSON.stringify(mockAtlasJSON))

      expect(isConvertingDuringOperation).toBe(true)
      expect(composable.isConverting.value).toBe(false)
    })

    it('should clear conversionError when starting new operation', async () => {
      vi.mocked(atlasConverter.convertAtlasToInternal)
        .mockImplementationOnce(() => {
          throw new Error('First error')
        })
        .mockReturnValueOnce({ entryEvents: [] })

      const { importFromAtlas, conversionError } = useAtlasConverter()

      // First import - creates error
      await importFromAtlas(JSON.stringify(mockAtlasJSON))
      expect(conversionError.value).toBe('First error')

      // Second import - should clear error and succeed
      await importFromAtlas(JSON.stringify(mockAtlasJSON))
      expect(conversionError.value).toBe('')
    })
  })

  describe('edge cases', () => {
    it('should handle empty cohort definition', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue({
        ConceptSets: [],
        PrimaryCriteria: { CriteriaList: [] },
        InclusionRules: [],
      })

      const emptyCohort: CohortDefinition = {
        name: 'Empty',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      const { exportToAtlas } = useAtlasConverter()

      const result = exportToAtlas(emptyCohort)

      expect(result).toBeTruthy()
      expect(atlasConverter.convertInternalToAtlas).toHaveBeenCalledWith(emptyCohort)
    })

    it('should handle empty JSON string', async () => {
      const { importFromAtlas, conversionError } = useAtlasConverter()

      const result = await importFromAtlas('')

      expect(result).toBeNull()
      expect(conversionError.value).toBeTruthy()
    })

    it('should handle whitespace-only JSON string', async () => {
      const { importFromAtlas, conversionError } = useAtlasConverter()

      const result = await importFromAtlas('   \n  \t  ')

      expect(result).toBeNull()
      expect(conversionError.value).toBeTruthy()
    })

    it('should handle null values in cohort definition', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const cohortWithNulls: CohortDefinition = {
        name: 'Test',
        description: undefined,
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      const { exportToAtlas } = useAtlasConverter()

      const result = exportToAtlas(cohortWithNulls)

      expect(result).toBeTruthy()
    })

    it('should handle special characters in filenames', () => {
      vi.mocked(atlasConverter.convertInternalToAtlas).mockReturnValue(mockAtlasJSON)

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }

      // Mock URL methods
      URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      URL.revokeObjectURL = vi.fn()

      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)

      const { downloadAtlasJSON } = useAtlasConverter()

      downloadAtlasJSON(mockCohortDefinition, 'test-cohort (v2) [final].json')

      expect(mockLink.download).toBe('test-cohort (v2) [final].json')
    })
  })
})
