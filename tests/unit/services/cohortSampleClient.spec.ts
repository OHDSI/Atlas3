import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpClient: vi.fn(),
  getBaseUrl: () => 'http://test/WebAPI',
}))

import {
  listCohortSamples,
  createCohortSample,
  getCohortSample,
  refreshCohortSample,
  deleteCohortSample,
  hasCohortSamples,
} from '@/services/webapi'
import { httpClient } from '@/services/http-client'

const httpMock = vi.mocked(httpClient as unknown as ReturnType<typeof vi.fn>)

const sampleObj = {
  id: 1,
  name: 'demo',
  size: 100,
  createdDate: '2026-04-26T10:00:00Z',
  createdBy: { name: 'ohdsi' },
  cohortDefinitionId: 1,
  sourceId: 1,
}

describe('cohort-sample API client', () => {
  beforeEach(() => httpMock.mockReset())

  it('listCohortSamples parses the WebAPI envelope', async () => {
    httpMock.mockResolvedValueOnce({
      cohortDefinitionId: 1,
      sourceId: 1,
      generationStatus: 'COMPLETE',
      isValid: true,
      samples: [sampleObj],
    })
    const result = await listCohortSamples(1, 'EUNOMIA')
    expect(result).not.toBeNull()
    expect(result?.samples).toHaveLength(1)
    expect(httpMock.mock.calls[0]![0]).toBe('/cohortsample/1/EUNOMIA')
  })

  it('listCohortSamples returns null on a malformed response', async () => {
    httpMock.mockResolvedValueOnce({ unexpected: 'shape' })
    expect(await listCohortSamples(1, 'EUNOMIA')).toBeNull()
  })

  it('hasCohortSamples returns the boolean payload directly', async () => {
    httpMock.mockResolvedValueOnce(true)
    expect(await hasCohortSamples(1)).toBe(true)
    httpMock.mockResolvedValueOnce(false)
    expect(await hasCohortSamples(1)).toBe(false)
  })

  it('getCohortSample requests elements when withElements is true', async () => {
    httpMock.mockResolvedValueOnce(sampleObj)
    await getCohortSample(1, 'EUNOMIA', 7, { withElements: true })
    expect(httpMock.mock.calls[0]![0]).toContain('?fields=elements')
  })

  it('createCohortSample posts the parameters as JSON', async () => {
    httpMock.mockResolvedValueOnce(sampleObj)
    const params = { name: 'demo', size: 100 }
    await createCohortSample(1, 'EUNOMIA', params)
    const [url, opts] = httpMock.mock.calls[0]! as [string, { method: string; body: string }]
    expect(url).toBe('/cohortsample/1/EUNOMIA')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual(params)
  })

  it('createCohortSample re-throws on transport errors', async () => {
    httpMock.mockRejectedValueOnce(new Error('boom'))
    await expect(createCohortSample(1, 'EUNOMIA', { name: 'x', size: 1 })).rejects.toThrow('boom')
  })

  it('refreshCohortSample posts to the refresh subpath', async () => {
    httpMock.mockResolvedValueOnce(sampleObj)
    await refreshCohortSample(1, 'EUNOMIA', 7)
    const [url, opts] = httpMock.mock.calls[0]! as [string, { method: string }]
    expect(url).toBe('/cohortsample/1/EUNOMIA/7/refresh')
    expect(opts.method).toBe('POST')
  })

  it('deleteCohortSample sends DELETE', async () => {
    httpMock.mockResolvedValueOnce(undefined)
    expect(await deleteCohortSample(1, 'EUNOMIA', 7)).toBe(true)
    const [url, opts] = httpMock.mock.calls[0]! as [string, { method: string }]
    expect(url).toBe('/cohortsample/1/EUNOMIA/7')
    expect(opts.method).toBe('DELETE')
  })
})
