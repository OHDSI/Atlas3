import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import {
  assignReusableTag,
  copyReusable,
  createReusable,
  deleteReusable,
  getReusable,
  listReusables,
  unassignReusableTag,
  updateReusable,
} from '@/services/reusable.service'

const reusable = {
  id: 3,
  name: 'Diabetes logic',
  description: 'T2DM',
  data: '{"type":"CRITERIA_GROUP"}',
  createdBy: { login: 'alice', name: 'Alice' },
  createdDate: 1700000000000,
  tags: [],
}

describe('reusable.service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists reusables from the page wrapper', async () => {
    vi.mocked(httpGet).mockResolvedValue({ content: [reusable], totalElements: 1 })

    const result = await listReusables()

    expect(httpGet).toHaveBeenCalledWith('/reusable?size=100000')
    expect(result).toMatchObject({ success: true, data: [{ id: 3, name: 'Diabetes logic' }] })
  })

  it('also accepts a bare array', async () => {
    vi.mocked(httpGet).mockResolvedValue([reusable])

    expect(await listReusables()).toMatchObject({ success: true, data: [{ id: 3 }] })
  })

  it('reports a malformed list as a failure', async () => {
    vi.mocked(httpGet).mockResolvedValue({ content: [{ id: 'x' }] })

    expect(await listReusables()).toMatchObject({
      success: false,
      error: { message: 'Invalid response from /reusable' },
    })
  })

  it('gets one reusable', async () => {
    vi.mocked(httpGet).mockResolvedValue(reusable)

    expect(await getReusable(3)).toMatchObject({ success: true, data: { id: 3 } })
    expect(httpGet).toHaveBeenCalledWith('/reusable/3')
  })

  it('creates and updates with only the fields WebAPI accepts', async () => {
    vi.mocked(httpPost).mockResolvedValue(reusable)
    vi.mocked(httpPut).mockResolvedValue(reusable)
    const edited = { ...reusable, description: undefined, tags: [{ id: 1, name: 'x' }] }

    await createReusable(edited)
    await updateReusable(3, edited)

    const payload = { name: 'Diabetes logic', description: null, data: '{"type":"CRITERIA_GROUP"}' }
    expect(httpPost).toHaveBeenCalledWith('/reusable', payload)
    expect(httpPut).toHaveBeenCalledWith('/reusable/3', payload)
  })

  it('copies with a POST to the reusable itself', async () => {
    vi.mocked(httpPost).mockResolvedValue({ ...reusable, id: 9, name: 'COPY OF Diabetes logic' })

    const result = await copyReusable(3)

    expect(httpPost).toHaveBeenCalledWith('/reusable/3', {})
    expect(result).toMatchObject({ success: true, data: { id: 9 } })
  })

  it('deletes, and assigns and removes tags', async () => {
    vi.mocked(httpDelete).mockResolvedValue(undefined)
    vi.mocked(httpPost).mockResolvedValue(undefined)

    expect((await deleteReusable(3)).success).toBe(true)
    expect((await assignReusableTag(3, 12)).success).toBe(true)
    expect((await unassignReusableTag(3, 12)).success).toBe(true)

    expect(httpDelete).toHaveBeenCalledWith('/reusable/3')
    expect(httpPost).toHaveBeenCalledWith('/reusable/3/tag', 12)
    expect(httpDelete).toHaveBeenCalledWith('/reusable/3/tag/12')
  })

  it('turns a request failure into a failed result', async () => {
    vi.mocked(httpDelete).mockRejectedValue(new Error('HTTP 403: Forbidden'))

    expect(await deleteReusable(3)).toMatchObject({ success: false, error: { message: 'HTTP 403: Forbidden' } })
  })
})
