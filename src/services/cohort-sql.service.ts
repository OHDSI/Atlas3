/**
 * cohort-sql.service
 *
 * The SQL behind a cohort definition, for reading and exporting (#321).
 *
 * WebAPI builds it in two steps, and both are worth understanding before
 * calling them:
 *
 * 1. `POST /cohortdefinition/sql` turns an expression into OHDSI *template*
 *    SQL — still carrying `@cdm_database_schema` and friends. That template is
 *    the portable artifact: it runs anywhere once its parameters are supplied,
 *    which is what makes it worth showing by default.
 * 2. `POST /sqlrender/translate` renders a template for one database dialect.
 *
 * Neither call needs a saved cohort. The expression travels in the request
 * body, so SQL can be read off a design that has never been saved.
 */
import { z } from 'zod'
import { httpPostRead } from '@/services/http-client'
import { unwrap, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import type { CohortExpression } from '@/models/circe-types'

const CONTEXT = 'CohortSqlService'

const GenerateSqlResultSchema = z.object({
  templateSql: z.string(),
})

const TranslatedStatementSchema = z.object({
  targetSQL: z.string(),
})

/**
 * Dialects offered for translation.
 *
 * Deliberately *not* `SUPPORTED_DIALECTS` from `datasource.types.ts`. Those are
 * WebAPI source codes (`SQL_SERVER`); SqlRender's `targetDialect` takes its own
 * names (`sql server`). The two lists look alike and mean different things, so
 * mapping between them would break quietly the first time either one moved —
 * as a wrong translation rather than an obvious error.
 */
export const SQLRENDER_DIALECTS = [
  { value: 'sql server', label: 'SQL Server' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'redshift', label: 'Amazon Redshift' },
  { value: 'bigquery', label: 'Google BigQuery' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'spark', label: 'Spark' },
  { value: 'synapse', label: 'Azure Synapse' },
  { value: 'impala', label: 'Impala' },
  { value: 'netezza', label: 'IBM Netezza' },
  { value: 'pdw', label: 'Microsoft PDW' },
  { value: 'hive', label: 'Hive' },
] as const

export type SqlRenderDialect = (typeof SQLRENDER_DIALECTS)[number]['value']

/** OHDSI template SQL for `expression`, parameters left unresolved. */
export async function generateCohortSql(
  expression: CohortExpression
): Promise<ApiResult<string>> {
  return unwrap(async () => {
    const data = await httpPostRead<unknown>('/cohortdefinition/sql', { expression })
    return parseOrThrow(
      GenerateSqlResultSchema,
      data,
      'Cohort SQL response did not contain templateSql'
    ).templateSql
  }, CONTEXT)
}

/** `sql` rendered for one database dialect. */
export async function translateSql(
  sql: string,
  targetDialect: string
): Promise<ApiResult<string>> {
  return unwrap(async () => {
    const data = await httpPostRead<unknown>('/sqlrender/translate', { sql, targetDialect })
    return parseOrThrow(
      TranslatedStatementSchema,
      data,
      'SQL translation response did not contain targetSQL'
    ).targetSQL
  }, CONTEXT)
}
