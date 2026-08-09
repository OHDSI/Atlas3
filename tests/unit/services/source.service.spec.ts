/**
 * Unit Tests: Source Service
 *
 * Tests for data source CRUD operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchCDMSources,
  getSourceDetails,
  createSource,
  updateSource,
  deleteSource,
  testConnection,
  refreshSourceCache
} from '@/services/source.service'

// Mock http-client
vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
  getBaseUrl: vi.fn(() => '/WebAPI')
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'mock-token'
  }))
}))

describe('SourceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  describe('fetchCDMSources', () => {
    // http-client is module-mocked above (vi.mock('@/services/http-client', ...)),
    // so these stub httpGet directly rather than the raw fetch response the
    // real client would see — consistent with every other test in this file.
    it('returns the parsed source list', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([
        {
          sourceKey: 'SYNPUF1K',
          sourceName: 'SYNPUF 1K',
          sourceDialect: 'postgresql',
          daimons: [],
          sourceId: 1,
          sourceConnection: 'connection string',
        },
      ])

      const result = await fetchCDMSources()

      expect(httpGet).toHaveBeenCalledWith('/source/sources')
      expect(result.success).toBe(true)
      if (result.success) expect(result.data[0]?.sourceKey).toBe('SYNPUF1K')
    })

    it('fails with the status when the source list is rejected', async () => {
      const { httpGet } = await import('@/services/http-client')
      const { ApiError } = await import('@/services/api-error')
      vi.mocked(httpGet).mockRejectedValue(new ApiError('HTTP 403: Forbidden', 403, 'no access'))

      const result = await fetchCDMSources()

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.status).toBe(403)
    })

    it('reports a malformed source list as an ApiResult failure carrying the Zod issues', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([
        { sourceKey: 'SYNPUF1K', sourceName: 'SYNPUF 1K' /* missing sourceDialect/daimons */ },
      ])

      const result = await fetchCDMSources()

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected fetchCDMSources to fail')
      } else {
        expect(result.error.message).toBe('Invalid source list response')
        expect(result.error.status).toBe(0)
        const issues = JSON.parse(result.error.body as string)
        expect(Array.isArray(issues)).toBe(true)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getSourceDetails', () => {
    it('returns source details', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockSource = {
        sourceId: 1,
        sourceName: 'Test CDM',
        sourceDialect: 'postgresql',
        sourceKey: 'TEST_CDM',
        connectionString: 'jdbc:postgresql://localhost:5432/cdm',
        daimons: [
          { daimonType: 'CDM', tableQualifier: 'cdm', priority: 0 }
        ]
      }

      vi.mocked(httpGet).mockResolvedValue(mockSource)

      const result = await getSourceDetails(1)

      expect(httpGet).toHaveBeenCalledWith('/source/1')
      expect(result.sourceName).toBe('Test CDM')
      expect(result.sourceKey).toBe('TEST_CDM')
    })

    it('throws on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Connection failed'))

      await expect(getSourceDetails(1)).rejects.toThrow('Unable to load source details')
    })
  })

  describe('createSource', () => {
    it('creates a source without keyfile', async () => {
      const { httpPost } = await import('@/services/http-client')
      const mockResponse = {
        sourceId: 2,
        sourceName: 'New Source',
        sourceDialect: 'postgresql',
        sourceKey: 'NEW_SOURCE'
      }

      vi.mocked(httpPost).mockResolvedValue(mockResponse)

      const result = await createSource({
        name: 'New Source',
        dialect: 'postgresql',
        key: 'NEW_SOURCE',
        connectionString: 'jdbc:postgresql://localhost:5432/newdb'
      })

      expect(httpPost).toHaveBeenCalledWith('/source', expect.objectContaining({
        sourceName: 'New Source',
        sourceDialect: 'postgresql',
        sourceKey: 'NEW_SOURCE'
      }))
      expect(result.sourceId).toBe(2)
    })

    it('creates a source with username and password', async () => {
      const { httpPost } = await import('@/services/http-client')
      const mockResponse = {
        sourceId: 3,
        sourceName: 'Auth Source',
        sourceDialect: 'postgresql',
        sourceKey: 'AUTH_SOURCE'
      }

      vi.mocked(httpPost).mockResolvedValue(mockResponse)

      await createSource({
        name: 'Auth Source',
        dialect: 'postgresql',
        key: 'AUTH_SOURCE',
        connectionString: 'jdbc:postgresql://localhost:5432/authdb',
        username: 'admin',
        password: 'secret'
      })

      expect(httpPost).toHaveBeenCalledWith('/source', expect.objectContaining({
        username: 'admin',
        password: 'secret'
      }))
    })

    it('creates a source with daimons', async () => {
      const { httpPost } = await import('@/services/http-client')
      const mockResponse = {
        sourceId: 4,
        sourceName: 'Full Source',
        sourceDialect: 'postgresql',
        sourceKey: 'FULL_SOURCE'
      }

      vi.mocked(httpPost).mockResolvedValue(mockResponse)

      await createSource({
        name: 'Full Source',
        dialect: 'postgresql',
        key: 'FULL_SOURCE',
        connectionString: 'jdbc:postgresql://localhost:5432/fulldb',
        daimons: [
          { daimonType: 'CDM', tableQualifier: 'cdm' },
          { daimonType: 'Vocabulary', tableQualifier: 'vocab', priority: 1 }
        ]
      })

      expect(httpPost).toHaveBeenCalledWith('/source', expect.objectContaining({
        daimons: expect.arrayContaining([
          expect.objectContaining({ daimonType: 'CDM', tableQualifier: 'cdm' })
        ])
      }))
    })

    it('creates a source with Kerberos settings', async () => {
      const { httpPost } = await import('@/services/http-client')
      const mockResponse = {
        sourceId: 5,
        sourceName: 'Kerb Source',
        sourceDialect: 'impala',
        sourceKey: 'KERB_SOURCE'
      }

      vi.mocked(httpPost).mockResolvedValue(mockResponse)

      await createSource({
        name: 'Kerb Source',
        dialect: 'impala',
        key: 'KERB_SOURCE',
        connectionString: 'jdbc:impala://localhost:21050',
        krbAuthMethod: 'KEYTAB',
        krbAdminServer: 'kdc.example.com'
      })

      expect(httpPost).toHaveBeenCalledWith('/source', expect.objectContaining({
        krbAuthMethod: 'KEYTAB',
        krbAdminServer: 'kdc.example.com'
      }))
    })

    it('creates a source with keyfile using multipart form', async () => {
      const mockResponse = {
        sourceId: 6,
        sourceName: 'Keyfile Source',
        sourceDialect: 'bigquery',
        sourceKey: 'BQ_SOURCE'
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const keyfile = new File(['{"type": "service_account"}'], 'keyfile.json', { type: 'application/json' })

      const result = await createSource({
        name: 'Keyfile Source',
        dialect: 'bigquery',
        key: 'BQ_SOURCE',
        connectionString: 'jdbc:bigquery://project'
      }, keyfile)

      expect(global.fetch).toHaveBeenCalledWith(
        '/WebAPI/source',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )
      expect(result.sourceId).toBe(6)
    })

    it('throws on network error', async () => {
      const { httpPost } = await import('@/services/http-client')
      vi.mocked(httpPost).mockRejectedValue(new Error('Server error'))

      await expect(createSource({
        name: 'Fail Source',
        dialect: 'postgresql',
        key: 'FAIL',
        connectionString: 'jdbc:postgresql://localhost/fail'
      })).rejects.toThrow('Unable to create data source')
    })
  })

  describe('updateSource', () => {
    it('updates a source without keyfile', async () => {
      const { httpPut } = await import('@/services/http-client')
      const mockResponse = {
        sourceId: 1,
        sourceName: 'Updated Source',
        sourceDialect: 'postgresql',
        sourceKey: 'UPDATED_SOURCE'
      }

      vi.mocked(httpPut).mockResolvedValue(mockResponse)

      const result = await updateSource(1, {
        name: 'Updated Source',
        dialect: 'postgresql',
        key: 'UPDATED_SOURCE',
        connectionString: 'jdbc:postgresql://localhost:5432/updated'
      })

      expect(httpPut).toHaveBeenCalledWith('/source/1', expect.objectContaining({
        sourceName: 'Updated Source'
      }))
      expect(result.sourceName).toBe('Updated Source')
    })

    it('updates a source with keyfile using multipart form', async () => {
      const mockResponse = {
        sourceId: 1,
        sourceName: 'Updated BQ Source',
        sourceDialect: 'bigquery',
        sourceKey: 'BQ_UPDATED'
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const keyfile = new File(['{"type": "service_account"}'], 'new-keyfile.json')

      const result = await updateSource(1, {
        name: 'Updated BQ Source',
        dialect: 'bigquery',
        key: 'BQ_UPDATED',
        connectionString: 'jdbc:bigquery://project'
      }, keyfile)

      expect(global.fetch).toHaveBeenCalledWith(
        '/WebAPI/source/1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.any(FormData)
        })
      )
      expect(result.sourceId).toBe(1)
    })

    it('throws on network error', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockRejectedValue(new Error('Update failed'))

      await expect(updateSource(1, {
        name: 'Fail Update',
        dialect: 'postgresql',
        key: 'FAIL',
        connectionString: 'jdbc:postgresql://localhost/fail'
      })).rejects.toThrow('Unable to update data source')
    })
  })

  describe('deleteSource', () => {
    it('deletes a source', async () => {
      const { httpDelete } = await import('@/services/http-client')
      vi.mocked(httpDelete).mockResolvedValue(undefined)

      await deleteSource(1)

      expect(httpDelete).toHaveBeenCalledWith('/source/1')
    })

    it('throws on network error', async () => {
      const { httpDelete } = await import('@/services/http-client')
      vi.mocked(httpDelete).mockRejectedValue(new Error('Delete failed'))

      await expect(deleteSource(1)).rejects.toThrow('Unable to delete data source')
    })
  })

  describe('testConnection', () => {
    it('returns true on successful connection test', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue({ status: 'OK' })

      const result = await testConnection('TEST_CDM')

      expect(httpGet).toHaveBeenCalledWith('/source/TEST_CDM/connectionCheck')
      expect(result).toBe(true)
    })

    it('returns false on connection test failure', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Connection refused'))

      const result = await testConnection('BAD_SOURCE')

      expect(result).toBe(false)
    })
  })

  describe('refreshSourceCache', () => {
    it('refreshes source cache', async () => {
      const { httpPost } = await import('@/services/http-client')
      vi.mocked(httpPost).mockResolvedValue({ status: 'started' })

      await refreshSourceCache('TEST_CDM')

      expect(httpPost).toHaveBeenCalledWith('/source/TEST_CDM/refreshSourceCache')
    })

    it('throws on network error', async () => {
      const { httpPost } = await import('@/services/http-client')
      vi.mocked(httpPost).mockRejectedValue(new Error('Refresh failed'))

      await expect(refreshSourceCache('TEST_CDM')).rejects.toThrow('Unable to refresh source cache')
    })
  })
})
