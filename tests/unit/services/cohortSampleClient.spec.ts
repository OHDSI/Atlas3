import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpDelete: vi.fn(),
  getBaseUrl: () => 'http://test/WebAPI',
}))

import {
  listCohortSamples,
  createCohortSample,
  getCohortSample,
  refreshCohortSample,
  deleteCohortSample,
  hasCohortSamples,
} from '@/services/cohort-sample.service'
import { httpGet, httpPost, httpDelete } from '@/services/http-client'

const httpGetMock = vi.mocked(httpGet)
const httpPostMock = vi.mocked(httpPost)
const httpDeleteMock = vi.mocked(httpDelete)

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
  beforeEach(() => vi.clearAllMocks())

  it('listCohortSamples parses the WebAPI envelope', async () => {
    httpGetMock.mockResolvedValueOnce({
      cohortDefinitionId: 1,
      sourceId: 1,
      generationStatus: 'COMPLETE',
      isValid: true,
      samples: [sampleObj],
    })
    const result = await listCohortSamples(1, 'EUNOMIA')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.samples).toHaveLength(1)
    expect(httpGetMock.mock.calls[0]![0]).toBe('/cohortsample/1/EUNOMIA')
  })

  it('listCohortSamples reports a malformed response as a failure, not an empty list', async () => {
    httpGetMock.mockResolvedValueOnce({ unexpected: 'shape' })
    const result = await listCohortSamples(1, 'EUNOMIA')
    expect(result.success).toBe(false)
  })

  it('hasCohortSamples returns the boolean payload directly', async () => {
    httpGetMock.mockResolvedValueOnce(true)
    const trueResult = await hasCohortSamples(1)
    expect(trueResult).toEqual({ success: true, data: true })

    httpGetMock.mockResolvedValueOnce(false)
    const falseResult = await hasCohortSamples(1)
    expect(falseResult).toEqual({ success: true, data: false })
  })

  it('getCohortSample requests elements when withElements is true', async () => {
    httpGetMock.mockResolvedValueOnce(sampleObj)
    await getCohortSample(1, 'EUNOMIA', 7, { withElements: true })
    expect(httpGetMock.mock.calls[0]![0]).toContain('?fields=elements')
  })

  it('getCohortSample omits the elements query param by default', async () => {
    httpGetMock.mockResolvedValueOnce(sampleObj)
    await getCohortSample(1, 'EUNOMIA', 7)
    expect(httpGetMock.mock.calls[0]![0]).toBe('/cohortsample/1/EUNOMIA/7')
  })

  it('getCohortSample reports a malformed sample as a failure carrying the Zod issues', async () => {
    httpGetMock.mockResolvedValueOnce({ id: 'not-a-number', name: 'demo' })
    const result = await getCohortSample(1, 'EUNOMIA', 7)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toBe('Invalid cohort sample response')
      expect(result.error.status).toBe(0)
      const issues = JSON.parse(result.error.body as string)
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('createCohortSample posts the parameters as JSON', async () => {
    httpPostMock.mockResolvedValueOnce(sampleObj)
    const params = { name: 'demo', size: 100 }
    await createCohortSample(1, 'EUNOMIA', params)
    const [url, body] = httpPostMock.mock.calls[0]!
    expect(url).toBe('/cohortsample/1/EUNOMIA')
    expect(body).toEqual(params)
  })

  it('createCohortSample reports transport errors as a failure rather than throwing', async () => {
    httpPostMock.mockRejectedValueOnce(new Error('boom'))
    const result = await createCohortSample(1, 'EUNOMIA', { name: 'x', size: 1 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.message).toBe('boom')
  })

  it('createCohortSample reports a malformed response as a failure carrying the Zod issues', async () => {
    httpPostMock.mockResolvedValueOnce({ id: 'not-a-number', name: 'demo' })
    const result = await createCohortSample(1, 'EUNOMIA', { name: 'x', size: 1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toBe('Invalid cohort sample response')
      expect(result.error.status).toBe(0)
      const issues = JSON.parse(result.error.body as string)
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('refreshCohortSample posts to the refresh subpath', async () => {
    httpPostMock.mockResolvedValueOnce(sampleObj)
    await refreshCohortSample(1, 'EUNOMIA', 7)
    const [url] = httpPostMock.mock.calls[0]!
    expect(url).toBe('/cohortsample/1/EUNOMIA/7/refresh')
  })

  it('refreshCohortSample reports a malformed response as a failure carrying the Zod issues', async () => {
    httpPostMock.mockResolvedValueOnce({ id: 'not-a-number', name: 'demo' })
    const result = await refreshCohortSample(1, 'EUNOMIA', 7)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toBe('Invalid cohort sample response')
      expect(result.error.status).toBe(0)
      const issues = JSON.parse(result.error.body as string)
      expect(issues.length).toBeGreaterThan(0)
    }
  })

  it('deleteCohortSample sends DELETE', async () => {
    httpDeleteMock.mockResolvedValueOnce(undefined)
    const result = await deleteCohortSample(1, 'EUNOMIA', 7)
    expect(result).toEqual({ success: true, data: undefined })
    const [url] = httpDeleteMock.mock.calls[0]!
    expect(url).toBe('/cohortsample/1/EUNOMIA/7')
  })
})
