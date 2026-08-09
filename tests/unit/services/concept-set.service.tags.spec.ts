import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))

import {
  assignTagToConceptSet,
  unassignTagFromConceptSet,
} from '@/services/concept-set.service'
import { httpPost, httpDelete } from '@/services/http-client'

describe('ConceptSetService tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(httpPost).mockResolvedValue(undefined)
    vi.mocked(httpDelete).mockResolvedValue(undefined)
  })

  it('POSTs the raw tagId to /conceptset/{id}/tag/', async () => {
    const result = await assignTagToConceptSet(42, 7)
    expect(result.success).toBe(true)
    expect(httpPost).toHaveBeenCalledWith('/conceptset/42/tag/', 7)
  })

  it('DELETEs /conceptset/{id}/tag/{tagId}', async () => {
    const result = await unassignTagFromConceptSet(42, 7)
    expect(result.success).toBe(true)
    expect(httpDelete).toHaveBeenCalledWith('/conceptset/42/tag/7')
  })

  it('returns the server error message when the request fails', async () => {
    vi.mocked(httpPost).mockRejectedValue(new Error('HTTP 500: err'))
    const result = await assignTagToConceptSet(1, 2)
    expect(result.success).toBe(false)
    expect(result.error).toContain('err')
  })

  it('returns the server error message when unassigning fails', async () => {
    vi.mocked(httpDelete).mockRejectedValue(new Error('HTTP 500: err'))
    const result = await unassignTagFromConceptSet(1, 2)
    expect(result.success).toBe(false)
    expect(result.error).toContain('err')
  })
})
