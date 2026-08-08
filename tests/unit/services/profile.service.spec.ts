import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPerson, getCohortConceptSets } from '@/services/profile.service'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const minimalProfile = {
  gender: 'FEMALE', yearOfBirth: 1972, monthOfBirth: null, dayOfBirth: null,
  ageAtIndex: 52, recordCount: 0,
  records: [], cohorts: [], observationPeriods: [],
}

describe('getPerson', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls /{sourceKey}/person/{id}?cohort=0 when no cohortId given', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue(minimalProfile)
    const result = await getPerson('SYNPUF', 1234)
    expect(httpGet).toHaveBeenCalledWith('/SYNPUF/person/1234?cohort=0')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.gender).toBe('FEMALE')
  })

  it('passes cohortId in query string when provided', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue(minimalProfile)
    await getPerson('SYNPUF', 1234, 42)
    expect(httpGet).toHaveBeenCalledWith('/SYNPUF/person/1234?cohort=42')
  })

  it('returns failure on schema mismatch', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue({ wrong: 'shape' })
    const result = await getPerson('SYNPUF', 1)
    expect(result.success).toBe(false)
  })

  it('returns failure carrying a 404 status on HTTP 404', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockRejectedValue(new ApiError('Not Found', 404, null))
    const result = await getPerson('SYNPUF', 99)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.status).toBe(404)
  })

  it('does not map a 500 error to a 404 status even if the message mentions 404', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError('server error 404 in upstream', 500, null)
    )
    const result = await getPerson('SYNPUF', 1)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.status).toBe(500)
  })
})

describe('getCohortConceptSets', () => {
  beforeEach(() => vi.clearAllMocks())

  it('extracts conceptSets from cohort definition expression', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42,
      name: 'Hypertension',
      expression: JSON.stringify({
        ConceptSets: [
          { id: 0, name: 'ACE Inhibitors', expression: { items: [] } },
          { id: 1, name: 'HTN Diagnosis', expression: { items: [] } },
        ],
      }),
    })
    const result = await getCohortConceptSets(42)
    expect(httpGet).toHaveBeenCalledWith('/cohortdefinition/42')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0]?.name).toBe('ACE Inhibitors')
    }
  })

  it('handles parsed (non-string) expressions', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42, name: 'X',
      expression: { ConceptSets: [{ id: 7, name: 'Z', expression: { items: [] } }] },
    })
    const result = await getCohortConceptSets(42)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toHaveLength(1)
  })

  it('returns empty array when ConceptSets missing', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1, name: 'Y', expression: '{"x":1}',
    })
    const result = await getCohortConceptSets(1)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([])
  })
})

describe('getCohortConceptSets — error paths', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns failure when httpGet throws', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))
    const result = await getCohortConceptSets(1)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.message).toBe('boom')
  })

  it('returns empty array when expression is malformed JSON string', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, name: 'x', expression: '{not json' })
    const result = await getCohortConceptSets(1)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual([])
  })
})
