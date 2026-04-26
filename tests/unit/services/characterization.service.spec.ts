/**
 * Unit Tests: Characterization Service
 *
 * Covers happy-path, network-error, and parse-failure flows for the thin
 * façade in `src/services/characterization.service.ts`. Validation lives
 * in `webapi.ts`; here we mock global `fetch` so the full WebAPI stack is
 * exercised end-to-end through the façade.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger so we can assert error logging
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock auth store (http-client imports it dynamically)
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: null })),
}))

import {
  listCharacterizations,
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  deleteCharacterization,
  copyCharacterization,
  characterizationNameExists,
  exportCharacterization,
  importCharacterization,
  listCharacterizationExecutions,
  getCharacterizationExecution,
  generateCharacterization,
  cancelCharacterizationGeneration,
  getCharacterizationDesignSnapshot,
  getCharacterizationResultCount,
  getCharacterizationResults,
  explorePrevalence,
} from '@/services/characterization.service'
import { logger } from '@/utils/logger'
import type { CharacterizationDefinition } from '@/models/characterization.types'

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  const fetchMock = global.fetch as ReturnType<typeof vi.fn>
  fetchMock.mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response)
}

const validDesign: CharacterizationDefinition = {
  id: 1,
  name: 'My Characterization',
  cohorts: [{ id: 100, name: 'Cohort A' }],
  featureAnalyses: [{ id: 7 }],
  stratas: [],
}

describe('CharacterizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listCharacterizations', () => {
    it('returns parsed list from a bare array', async () => {
      mockFetchOnce([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ])

      const result = await listCharacterizations()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohort-characterization?size=10000'),
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
    })

    it('handles a `{ content: [...] }` page wrapper', async () => {
      mockFetchOnce({ content: [{ id: 5, name: 'C' }] })

      const result = await listCharacterizations()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(5)
    })

    it('throws and logs on parse failure', async () => {
      mockFetchOnce([{ id: 'not-a-number', name: 'oops' }])

      await expect(listCharacterizations()).rejects.toThrow(
        'Invalid response from /cohort-characterization'
      )
      expect(logger.error).toHaveBeenCalled()
    })

    it('throws and logs on HTTP error', async () => {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
      } as unknown as Response)

      await expect(listCharacterizations()).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getCharacterization', () => {
    it('GETs /design and returns parsed design', async () => {
      mockFetchOnce(validDesign)

      const result = await getCharacterization(1)

      expect(result?.name).toBe('My Characterization')
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1/design')
    })

    it('throws on parse failure', async () => {
      mockFetchOnce({ name: 'missing required fields' })

      await expect(getCharacterization(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('createCharacterization', () => {
    it('POSTs to /cohort-characterization', async () => {
      mockFetchOnce(validDesign)

      const result = await createCharacterization(validDesign)

      expect(result.id).toBe(1)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization')
      expect(init.method).toBe('POST')
    })
  })

  describe('updateCharacterization', () => {
    it('PUTs to /cohort-characterization/{id}', async () => {
      mockFetchOnce(validDesign)

      const result = await updateCharacterization(validDesign)

      expect(result.id).toBe(1)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1')
      expect(init.method).toBe('PUT')
    })

    it('throws when id is missing', async () => {
      await expect(
        updateCharacterization({
          ...validDesign,
          id: undefined,
        })
      ).rejects.toThrow('updateCharacterization requires def.id')
    })
  })

  describe('deleteCharacterization', () => {
    it('DELETEs to /cohort-characterization/{id}', async () => {
      mockFetchOnce(undefined)

      await expect(deleteCharacterization(42)).resolves.toBeUndefined()

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/42')
      expect(init.method).toBe('DELETE')
    })
  })

  describe('copyCharacterization', () => {
    it('POSTs to /{id} (no body) and returns the new design', async () => {
      mockFetchOnce({ ...validDesign, id: 99 })

      const result = await copyCharacterization(1)

      expect(result.id).toBe(99)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1')
      expect(init.method).toBe('POST')
    })
  })

  describe('characterizationNameExists', () => {
    it('returns boolean from response', async () => {
      mockFetchOnce(true)
      await expect(characterizationNameExists(0, 'name')).resolves.toBe(true)
    })

    it('encodes the name parameter', async () => {
      mockFetchOnce(false)
      await characterizationNameExists(0, 'a b')

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain('name=a%20b')
    })
  })

  describe('exportCharacterization', () => {
    it('returns the raw response', async () => {
      mockFetchOnce({ some: 'design' })
      const result = await exportCharacterization(1)
      expect(result).toEqual({ some: 'design' })
    })
  })

  describe('importCharacterization', () => {
    it('POSTs to /import', async () => {
      mockFetchOnce(validDesign)

      const result = await importCharacterization({ raw: 'design' })

      expect(result.id).toBe(1)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/import')
      expect(init.method).toBe('POST')
    })
  })

  describe('listCharacterizationExecutions', () => {
    it('returns parsed executions', async () => {
      mockFetchOnce([
        { id: 1, status: 'COMPLETED', sourceKey: 'CDM_A' },
        { id: 2, status: 'RUNNING', sourceKey: 'CDM_B' },
      ])

      const result = await listCharacterizationExecutions(1)

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('COMPLETED')
    })

    it('throws on parse failure', async () => {
      mockFetchOnce([{ id: 1, status: 'BOGUS_STATUS', sourceKey: 'CDM_A' }])

      await expect(listCharacterizationExecutions(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getCharacterizationExecution', () => {
    it('returns parsed execution', async () => {
      mockFetchOnce({ id: 1, status: 'COMPLETED', sourceKey: 'CDM_A' })

      const result = await getCharacterizationExecution(1)

      expect(result?.id).toBe(1)
    })
  })

  describe('generateCharacterization', () => {
    it('POSTs to /{id}/generation/{sourceKey}', async () => {
      mockFetchOnce({ id: 1, status: 'PENDING', sourceKey: 'CDM_A' })

      const result = await generateCharacterization(1, 'CDM_A')

      expect(result.id).toBe(1)
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1/generation/CDM_A')
      expect(init.method).toBe('POST')
    })
  })

  describe('cancelCharacterizationGeneration', () => {
    it('DELETEs /{id}/generation/{sourceKey}', async () => {
      mockFetchOnce(undefined)

      await expect(cancelCharacterizationGeneration(1, 'CDM_A')).resolves.toBeUndefined()

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toContain('/cohort-characterization/1/generation/CDM_A')
      expect(init.method).toBe('DELETE')
    })
  })

  describe('getCharacterizationDesignSnapshot', () => {
    it('returns the raw design', async () => {
      mockFetchOnce({ some: 'snapshot' })
      const result = await getCharacterizationDesignSnapshot(99)
      expect(result).toEqual({ some: 'snapshot' })
    })
  })

  describe('getCharacterizationResultCount', () => {
    it('returns a number', async () => {
      mockFetchOnce(123)
      const result = await getCharacterizationResultCount(1)
      expect(result).toBe(123)
    })

    it('throws on non-number response', async () => {
      mockFetchOnce({ count: 5 })
      await expect(getCharacterizationResultCount(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('getCharacterizationResults', () => {
    it('returns the raw array', async () => {
      mockFetchOnce([{ row: 1 }, { row: 2 }])

      const result = await getCharacterizationResults(1, { thresholdValuePct: 0 })

      expect(result).toHaveLength(2)
    })

    it('throws when response is not an array', async () => {
      mockFetchOnce({ not: 'an array' })

      await expect(
        getCharacterizationResults(1, { thresholdValuePct: 0 })
      ).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('explorePrevalence', () => {
    it('GETs the explore prevalence URL', async () => {
      mockFetchOnce({ stats: 'data' })

      const result = await explorePrevalence(1, 2, 3, 4)

      expect(result).toEqual({ stats: 'data' })
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      const [url] = fetchMock.mock.calls[0]
      expect(url).toContain(
        '/cohort-characterization/generation/1/explore/prevalence/2/3/4'
      )
    })
  })

  // Catch-block coverage for façade methods missing an explicit error path.
  describe('error logging across façade', () => {
    function force500(): void {
      const fetchMock = global.fetch as ReturnType<typeof vi.fn>
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
      } as unknown as Response)
    }

    it('getCharacterization catch path', async () => {
      force500()
      await expect(getCharacterization(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('createCharacterization catch path', async () => {
      force500()
      await expect(createCharacterization(validDesign)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('updateCharacterization catch path', async () => {
      force500()
      await expect(updateCharacterization(validDesign)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('deleteCharacterization catch path', async () => {
      force500()
      await expect(deleteCharacterization(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('copyCharacterization catch path', async () => {
      force500()
      await expect(copyCharacterization(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('characterizationNameExists catch path', async () => {
      force500()
      await expect(characterizationNameExists(0, 'name')).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('exportCharacterization catch path', async () => {
      force500()
      await expect(exportCharacterization(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('importCharacterization catch path', async () => {
      force500()
      await expect(importCharacterization({ design: 'x' })).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('listCharacterizationExecutions catch path', async () => {
      force500()
      await expect(listCharacterizationExecutions(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('getCharacterizationExecution catch path', async () => {
      force500()
      await expect(getCharacterizationExecution(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('generateCharacterization catch path', async () => {
      force500()
      await expect(generateCharacterization(1, 'EUNOMIA')).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('cancelCharacterizationGeneration catch path', async () => {
      force500()
      await expect(
        cancelCharacterizationGeneration(1, 'EUNOMIA')
      ).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('getCharacterizationDesignSnapshot catch path', async () => {
      force500()
      await expect(getCharacterizationDesignSnapshot(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('getCharacterizationResultCount catch path', async () => {
      force500()
      await expect(getCharacterizationResultCount(1)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('explorePrevalence catch path', async () => {
      force500()
      await expect(explorePrevalence(1, 2, 3, 4)).rejects.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
