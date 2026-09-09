/**
 * Cohort SQL export (#321).
 *
 * WebAPI builds the query in two steps: `/cohortdefinition/sql` returns a
 * SqlRender template still carrying its `@parameters`, and `/sqlrender/translate`
 * renders that template for one database dialect.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockAuthStore = {
  executeWithUserRefresh: vi.fn((operation: () => Promise<unknown>) => operation()),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: 'mock-token', ...mockAuthStore })),
}))

import { generateCohortSql, translateSql, SQLRENDER_DIALECTS } from '@/services/cohort-sql.service'
import { defaultExpression } from '@/models/circe-types'

const TEMPLATE_SQL = 'SELECT * FROM @cdm_database_schema.person'

describe('services/cohort-sql.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  // Not `...Once`: these endpoints go through httpPostRead, which retries, so a
  // one-shot mock would hand `undefined` to the retry and mask the real result.
  function respondWith(body: unknown, ok = true, status = 200) {
    mockFetch.mockResolvedValue({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      text: async () => JSON.stringify(body),
    })
  }

  describe('generateCohortSql', () => {
    it('posts the expression and returns the template SQL', async () => {
      respondWith({ templateSql: TEMPLATE_SQL })

      const result = await generateCohortSql(defaultExpression)

      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data).toBe(TEMPLATE_SQL)

      const [url, init] = mockFetch.mock.calls[0]
      expect(String(url)).toContain('/cohortdefinition/sql')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({ expression: defaultExpression })
    })

    it('surfaces the server message when circe cannot build the query', async () => {
      respondWith({ message: 'Cannot invoke getCriteriaList()' }, false, 500)

      const result = await generateCohortSql(defaultExpression)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.message).toContain('Cannot invoke getCriteriaList()')
    })

    it('fails rather than returning undefined when the response has no templateSql', async () => {
      respondWith({ somethingElse: 'x' })

      const result = await generateCohortSql(defaultExpression)

      expect(result.success).toBe(false)
    })
  })

  describe('translateSql', () => {
    it('posts the template and dialect, and returns the translated SQL', async () => {
      respondWith({ targetSQL: 'SELECT * FROM cdm.person' })

      const result = await translateSql(TEMPLATE_SQL, 'postgresql')

      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data).toBe('SELECT * FROM cdm.person')

      const [url, init] = mockFetch.mock.calls[0]
      expect(String(url)).toContain('/sqlrender/translate')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body as string)).toEqual({
        sql: TEMPLATE_SQL,
        targetDialect: 'postgresql',
      })
    })

    it('fails rather than returning undefined when the response has no targetSQL', async () => {
      respondWith({ nope: true })

      const result = await translateSql(TEMPLATE_SQL, 'oracle')

      expect(result.success).toBe(false)
    })
  })

  describe('SQLRENDER_DIALECTS', () => {
    // These are SqlRender target names, deliberately not the WebAPI source
    // dialect codes in datasource.types.ts (SQL_SERVER vs "sql server").
    it('uses SqlRender target names, not WebAPI source codes', () => {
      const values = SQLRENDER_DIALECTS.map(d => d.value)
      expect(values).toContain('sql server')
      expect(values).toContain('postgresql')
      expect(values).not.toContain('SQL_SERVER')
      expect(values.every(v => v === v.toLowerCase())).toBe(true)
    })
  })
})
