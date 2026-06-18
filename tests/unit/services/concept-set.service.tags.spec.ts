import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  assignTagToConceptSet,
  unassignTagFromConceptSet,
} from '@/services/concept-set.service'

describe('ConceptSetService tags', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs the raw tagId to /conceptset/{id}/tag/', async () => {
    const ok = await assignTagToConceptSet(42, 7)
    expect(ok).toBe(true)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/conceptset/42/tag/')
    expect(options.method).toBe('POST')
    expect(options.body).toBe('7')
  })

  it('DELETEs /conceptset/{id}/tag/{tagId}', async () => {
    const ok = await unassignTagFromConceptSet(42, 7)
    expect(ok).toBe(true)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/conceptset/42/tag/7')
    expect(options.method).toBe('DELETE')
  })

  it('returns false when the request fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'err' })
    expect(await assignTagToConceptSet(1, 2)).toBe(false)
  })
})
