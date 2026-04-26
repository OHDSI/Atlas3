import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPerson } from '@/services/profile.service'

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

  it('returns failure with code "NOT_FOUND" on HTTP 404', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('HTTP 404: Not Found'))
    const result = await getPerson('SYNPUF', 99)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBe('NOT_FOUND')
  })

  it('does not map a 500 error to NOT_FOUND even if message mentions 404', async () => {
    const { httpGet } = await import('@/services/http-client')
    ;(httpGet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('HTTP 500: server error 404 in upstream'))
    const result = await getPerson('SYNPUF', 1)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.code).toBeUndefined()
  })
})
