/**
 * Unit Tests: WebAPI Service
 * Tests for src/services/webapi.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('WebAPI Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let webapi: typeof import('@/services/webapi')

  beforeEach(async () => {
    vi.clearAllMocks()
    // Re-import to get fresh module
    vi.resetModules()

    // Set up mock AFTER resetModules to ensure it's not affected by module resets
    mockFetch = vi.fn()
    // Mock both global.fetch and window.fetch to ensure consistent behavior
    global.fetch = mockFetch
    window.fetch = mockFetch
    localStorage.clear()
    localStorage.setItem('locale', 'en')

    webapi = await import('@/services/webapi')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchCDMSources', () => {
    it('fetches and validates CDM sources', async () => {
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test Source',
          sourceKey: 'test',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      // Use mockResolvedValue instead of mockResolvedValueOnce to handle retries
      // webapi.ts uses response.text() then JSON.parse, so we need to provide text() method
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockSources)),
      })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/source/sources'),
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].sourceKey).toBe('test')
      }
    })

    it('returns error on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([{ invalid: 'data' }])),
      })

      const result = await webapi.fetchCDMSources()

      expect(result.success).toBe(false)
    })
  })

  describe('searchConcepts', () => {
    it('searches concepts with query', async () => {
      const mockConcepts = [
        {
          CONCEPT_ID: 1,
          CONCEPT_NAME: 'Test',
          CONCEPT_CODE: 'T001',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockConcepts)),
      })

      const result = await webapi.searchConcepts('SYNPUF1K', 'diabetes')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/search'),
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
      }
    })

    it('includes domain filter when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await webapi.searchConcepts('SYNPUF1K', 'test', 'Condition')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('domain=Condition'),
        expect.any(Object)
      )
    })

    it('returns error on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify('invalid')),
      })

      const result = await webapi.searchConcepts('SYNPUF1K', 'test')

      expect(result.success).toBe(false)
    })
  })

  describe('getCohortDefinition', () => {
    it('fetches cohort definition by ID', async () => {
      const mockCohort = {
        id: 123,
        name: 'Test Cohort',
        expression: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockCohort)),
      })

      const result = await webapi.getCohortDefinition(123)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123'),
        expect.any(Object)
      )
      expect(result?.id).toBe(123)
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCohortDefinition(123)

      expect(result).toBeNull()
    })
  })

  describe('saveCohortDefinition', () => {
    it('creates new cohort definition', async () => {
      const newCohort = {
        name: 'New Cohort',
        expression: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1, ...newCohort })),
      })

      const result = await webapi.saveCohortDefinition(newCohort as never)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result?.id).toBe(1)
    })

    it('updates existing cohort definition', async () => {
      const existingCohort = {
        id: 123,
        name: 'Updated Cohort',
        expression: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(existingCohort)),
      })

      await webapi.saveCohortDefinition(existingCohort as never)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123'),
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.saveCohortDefinition({ name: 'Test' } as never)

      expect(result).toBeNull()
    })
  })

  describe('deleteCohortDefinition', () => {
    it('deletes cohort definition', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.deleteCohortDefinition(123)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123'),
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result).toBe(true)
    })

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.deleteCohortDefinition(123)

      expect(result).toBe(false)
    })
  })

  describe('generateCohort', () => {
    it('generates cohort for source', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({
            status: 'STARTING',
            executionId: 456,
          })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123/generate/SYNPUF1K'),
        expect.any(Object)
      )
      expect(result?.cohortDefinitionId).toBe(123)
      expect(result?.sourceKey).toBe('SYNPUF1K')
    })

    it('maps status correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'COMPLETED' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('COMPLETE')
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getCohortGenerationInfo', () => {
    it('fetches generation info', async () => {
      const mockInfo = [
        {
          id: { cohortDefinitionId: 123, sourceId: 1 },
          status: 'COMPLETE',
          personCount: 1000,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockInfo)),
      })

      const result = await webapi.getCohortGenerationInfo(123)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123/info'),
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
      }
    })

    it('returns error on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCohortGenerationInfo(123)

      expect(result.success).toBe(false)
    })
  })

  describe('getConceptSet', () => {
    it('fetches concept set by ID', async () => {
      const mockSet = { id: 1, name: 'Test Set' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockSet)),
      })

      const result = await webapi.getConceptSet(1)

      expect(result?.id).toBe(1)
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getConceptSet(1)

      expect(result).toBeNull()
    })
  })

  describe('getAllConceptSets', () => {
    it('fetches all concept sets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([{ id: 1 }, { id: 2 }])),
      })

      const result = await webapi.getAllConceptSets()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('returns error on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getAllConceptSets()

      expect(result.success).toBe(false)
    })
  })

  describe('createConceptSet', () => {
    it('creates concept set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1, name: 'New Set' })),
      })

      const result = await webapi.createConceptSet({ name: 'New Set' } as never)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result?.id).toBe(1)
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.createConceptSet({ name: 'Test' } as never)

      expect(result).toBeNull()
    })
  })

  describe('updateConceptSet', () => {
    it('updates concept set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 1, name: 'Updated' })),
      })

      await webapi.updateConceptSet({ id: 1, name: 'Updated' } as never)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1'),
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.updateConceptSet({ id: 1 } as never)

      expect(result).toBeNull()
    })
  })

  describe('deleteConceptSet', () => {
    it('deletes concept set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.deleteConceptSet(1)

      expect(result).toBe(true)
    })

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.deleteConceptSet(1)

      expect(result).toBe(false)
    })
  })

  describe('getCohorts', () => {
    it('fetches all cohorts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify([
            { id: 1, name: 'Cohort 1' },
            { id: 2, name: 'Cohort 2' },
          ])),
      })

      const result = await webapi.getCohorts()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })
  })

  describe('deleteCohort', () => {
    it('deletes cohort', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.deleteCohort(123)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('validateCohortDefinition', () => {
    it('validates cohort and returns warnings', async () => {
      const mockResponse = {
        warnings: [{ message: 'Test warning' }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const result = await webapi.validateCohortDefinition('Test', {})

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/checkV2'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.warnings).toHaveLength(1)
    })

    it('returns error as warning on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.validateCohortDefinition('Test', {})

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].type).toBe('DefaultWarning')
      expect(result.warnings[0].severity).toBe('WARNING')
      expect(result.warnings[0].message).toContain('Network error')
    })
  })

  describe('getCohortReport', () => {
    it('fetches cohort report', async () => {
      const mockReport = {
        summary: {
          baseCount: 1000,
          finalCount: 800,
          personCount: 800,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockReport)),
      })

      await webapi.getCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123/report/SYNPUF1K'),
        expect.any(Object)
      )
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('Report Endpoints', () => {
    it('fetches person report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getPersonReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/person'),
        expect.any(Object)
      )
    })

    it('fetches condition eras report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getConditionErasReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/conditionera'),
        expect.any(Object)
      )
    })

    it('fetches condition report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getConditionReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/condition'),
        expect.any(Object)
      )
    })

    it('fetches drug eras report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getDrugErasReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/drugera'),
        expect.any(Object)
      )
    })

    it('fetches cohort specific report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getCohortSpecificReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/cohortspecific'),
        expect.any(Object)
      )
    })
  })

  describe('Analysis Triggers', () => {
    it('triggers full analysis', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.triggerFullAnalysis(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortanalysis'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toBe(true)
    })

    it('triggers quick analysis', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.triggerQuickAnalysis(123, 'SYNPUF1K')

      expect(result).toBe(true)
    })

    it('triggers utilization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.triggerUtilization(123, 'SYNPUF1K')

      expect(result).toBe(true)
    })
  })

  describe('Additional Report Endpoints', () => {
    it('fetches persons exposure baseline report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getPersonsExposureBaselineReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/observationperiod'),
        expect.any(Object)
      )
    })

    it('fetches completed analyses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([1, 2, 3])),
      })

      const result = await webapi.getCompletedAnalyses(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([1, 2, 3])
      }
    })

    it('returns error for completed analyses on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCompletedAnalyses(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Network error')
      }
    })

    it('fetches death report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getDeathReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/death'),
        expect.any(Object)
      )
    })

    it('fetches heracles heel report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      await webapi.getHeraclesHeelReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/heraclesheel'),
        expect.any(Object)
      )
    })
  })

  describe('getCohortPrintFriendly', () => {
    it('fetches print friendly HTML', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html>Report</html>'),
      })

      const result = await webapi.getCohortPrintFriendly({ expression: {} } as never)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/printfriendly/cohort'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result).toContain('Report')
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCohortPrintFriendly({} as never)

      expect(result).toBeNull()
    })
  })

  describe('Request Headers', () => {
    it('includes User-Language header', async () => {
      localStorage.setItem('locale', 'de')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Language': 'de',
          }),
        })
      )
    })

    it('defaults to en locale', async () => {
      localStorage.removeItem('locale')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Language': 'en',
          }),
        })
      )
    })
  })

  describe('getPersonsExposureCohortReport', () => {
    it('fetches persons exposure cohort report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getPersonsExposureCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/cohort'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getPersonsExposureCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getVisitsBaselineReport', () => {
    it('fetches visits baseline report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getVisitsBaselineReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/visitsbaseline'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getVisitsBaselineReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getVisitDatesBaselineReport', () => {
    it('fetches visit dates baseline report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getVisitDatesBaselineReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/visitdatesbaseline'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getVisitDatesBaselineReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getCareSiteVisitDatesBaselineReport', () => {
    it('fetches care site visit dates baseline report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getCareSiteVisitDatesBaselineReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/caresitevisitdatesbaseline'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCareSiteVisitDatesBaselineReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getVisitsCohortReport', () => {
    it('fetches visits cohort report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getVisitsCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/visitscohort'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getVisitsCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getVisitDatesCohortReport', () => {
    it('fetches visit dates cohort report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getVisitDatesCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/visitdatescohort'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getVisitDatesCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getCareSiteVisitDatesCohortReport', () => {
    it('fetches care site visit dates cohort report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getCareSiteVisitDatesCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/caresitevisitdatescohort'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getCareSiteVisitDatesCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getDrugUtilizationBaselineReport', () => {
    it('fetches drug utilization baseline report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getDrugUtilizationBaselineReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/drugutilizationbaseline'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getDrugUtilizationBaselineReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getDrugUtilizationCohortReport', () => {
    it('fetches drug utilization cohort report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getDrugUtilizationCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/drugutilizationcohort'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getDrugUtilizationCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getConditionsByIndexReport', () => {
    it('fetches conditions by index report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getConditionsByIndexReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/conditionsbyindex'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getConditionsByIndexReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getDrugExposureReport', () => {
    it('fetches drug exposure report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getDrugExposureReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/drugexposure'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getDrugExposureReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getDrugsByIndexReport', () => {
    it('fetches drugs by index report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getDrugsByIndexReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/drugsbyindex'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getDrugsByIndexReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getObservationPeriodsReport', () => {
    it('fetches observation periods report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getObservationPeriodsReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/observationperiod'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getObservationPeriodsReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getProcedureReport', () => {
    it('fetches procedure report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getProcedureReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/procedure'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getProcedureReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getProceduresByIndexReport', () => {
    it('fetches procedures by index report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getProceduresByIndexReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/proceduresbyindex'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getProceduresByIndexReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getDataCompletenessReport', () => {
    it('fetches data completeness report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getDataCompletenessReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/datacompleteness'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getDataCompletenessReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getEntropyReport', () => {
    it('fetches entropy report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getEntropyReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/entropy'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getEntropyReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe('getTornadoReport', () => {
    it('fetches tornado report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getTornadoReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortresults/SYNPUF1K/123/tornado'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.getTornadoReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })
  })

  describe.skip('Error Handling and Retry Logic', () => {
    it('retries on 5xx server errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([])
    })

    it('retries on 429 Too Many Requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it('retries on network errors (TypeError)', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it('fails after max retry attempts', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })

      await expect(webapi.searchConcepts('test', 'query')).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('does not retry on 4xx client errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(webapi.getCohortDefinition(999)).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('uses exponential backoff for retries', async () => {
      const startTime = Date.now()

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      await webapi.fetchCDMSources()

      const elapsed = Date.now() - startTime
      // First retry: 500ms, second retry: 1000ms = 1500ms total minimum
      // Allow some tolerance for execution time
      expect(elapsed).toBeGreaterThanOrEqual(1400)
    })

    it('handles string expression in getCohortPrintFriendly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html>Report</html>'),
      })

      const cohortDef = {
        id: 1,
        name: 'Test',
        expression: '{"ConceptSets": []}',
      }

      const result = await webapi.getCohortPrintFriendly(cohortDef as never)

      expect(result).toContain('Report')
    })

    it('handles expression wrapper in getCohortPrintFriendly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html>Report</html>'),
      })

      const cohortDef = {
        expression: {
          ConceptSets: [],
        },
      }

      const result = await webapi.getCohortPrintFriendly(cohortDef as never)

      expect(result).toContain('Report')
    })

    it('handles validation errors in getCohortReport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ invalid: 'data' })),
      })

      const result = await webapi.getCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })

    it('handles missing summary in getCohortReport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })

    it('handles status mapping in generateCohort - STARTING', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'STARTING' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('PENDING')
    })

    it('handles status mapping in generateCohort - STARTED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'STARTED' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('PENDING')
    })

    it('handles status mapping in generateCohort - RUNNING', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'RUNNING' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('RUNNING')
    })

    it('handles status mapping in generateCohort - COMPLETE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'COMPLETE' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('COMPLETE')
    })

    it('handles status mapping in generateCohort - FAILED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'FAILED' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('FAILED')
    })

    it('handles status mapping in generateCohort - unknown status defaults to PENDING', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'UNKNOWN' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('PENDING')
    })

    it('includes startDate and endDate in generateCohort response', async () => {
      const startDate = '2025-01-01T00:00:00.000Z'
      const endDate = '2025-01-01T01:00:00.000Z'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          status: 'COMPLETED',
          executionId: 789,
          startDate,
          endDate,
        })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.startTime).toBe(new Date(startDate).toISOString())
      expect(result?.endTime).toBe(new Date(endDate).toISOString())
    })

    it('handles analysis trigger failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.triggerFullAnalysis(123, 'SYNPUF1K')

      expect(result).toBe(false)
    })

    it('handles HTTP error response text in getCohortPrintFriendly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const result = await webapi.getCohortPrintFriendly({ expression: {} } as never)

      expect(result).toBeNull()
    })
  })
})
