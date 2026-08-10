/**
 * Incidence Rate Service
 * CRUD, tagging, generation, and reporting for incidence-rate analyses
 * (WebAPI /ir/...)
 */
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import { unwrap, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { logger } from '@/utils/logger'
import {
  IncidenceRateSummarySchema,
  IncidenceRateWireSchema,
  IncidenceRateExpressionSchema,
  IncidenceRateInfoBySourceSchema,
  IncidenceRateInfoListSchema,
  IncidenceRateReportSchema,
} from '@/models/incidence-rate.types'
import type {
  IncidenceRate,
  IncidenceRateInfoBySource,
  IncidenceRateReport,
} from '@/models/incidence-rate.types'
import { z } from 'zod'

const CONTEXT = 'IncidenceRateService'

// The OHDSI WebAPI ships `expression` as a JSON-encoded string on the wire
// for both reads and writes. Decode/encode at the boundary so the editor
// always works with a parsed object.
function decodeIRExpression(wire: unknown): IncidenceRate {
  const { expression: raw, ...rest } = parseOrThrow(
    IncidenceRateWireSchema,
    wire,
    'Invalid incidence rate response'
  )
  if (!raw) {
    return {
      ...rest,
      expression: IncidenceRateExpressionSchema.parse({
        timeAtRisk: {
          start: { DateField: 'StartDate', Offset: 0 },
          end: { DateField: 'StartDate', Offset: 0 },
        },
      }),
    } as IncidenceRate
  }
  let parsedExpr: unknown
  try {
    parsedExpr = JSON.parse(raw)
  } catch {
    throw new Error('expression is not valid JSON')
  }
  const expr = parseOrThrow(IncidenceRateExpressionSchema, parsedExpr, 'Invalid incidence rate expression')
  return { ...rest, expression: expr } as IncidenceRate
}

function encodeIRForSave(ir: IncidenceRate): Record<string, unknown> {
  const { expression, ...rest } = ir
  return { ...rest, expression: JSON.stringify(expression) }
}

/** GET /ir/ — list of all incidence rate analyses (no expression in payload). */
export async function listIncidenceRates(): Promise<ApiResult<IncidenceRate[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/ir/')
    return parseOrThrow(
      z.array(IncidenceRateSummarySchema.passthrough()),
      data,
      'Invalid incidence rate list response'
    ) as IncidenceRate[]
  }, CONTEXT)
}

/** GET /ir/{id} — full IR definition (decodes expression JSON string). */
export async function getIncidenceRate(id: number): Promise<ApiResult<IncidenceRate>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/ir/${id}`)
    return decodeIRExpression(data)
  }, CONTEXT)
}

/** POST /ir/ — create. */
export async function createIncidenceRate(ir: IncidenceRate): Promise<ApiResult<IncidenceRate>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/ir/', encodeIRForSave(ir))
    return decodeIRExpression(data)
  }, CONTEXT)
}

/** PUT /ir/{id} — update. */
export async function saveIncidenceRate(
  id: number,
  ir: IncidenceRate
): Promise<ApiResult<IncidenceRate>> {
  return unwrap(async () => {
    const data = await httpPut<unknown>(`/ir/${id}`, encodeIRForSave(ir))
    return decodeIRExpression(data)
  }, CONTEXT)
}

/** GET /ir/{id}/copy — server-side duplicate. */
export async function copyIncidenceRate(id: number): Promise<ApiResult<IncidenceRate>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/ir/${id}/copy`)
    return decodeIRExpression(data)
  }, CONTEXT)
}

/** DELETE /ir/{id}. */
export async function deleteIncidenceRate(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/ir/${id}`)
  }, CONTEXT)
}

/** GET /ir/{id}/exists?name=... — uniqueness check (id=0 for unsaved). */
export async function existsIncidenceRate(name: string, id = 0): Promise<ApiResult<number>> {
  return unwrap(async () => {
    const data = await httpGet<number>(`/ir/${id}/exists?name=${encodeURIComponent(name)}`)
    return typeof data === 'number' ? data : 0
  }, CONTEXT)
}

/**
 * Export an incidence-rate analysis design as a JSON-importable object.
 * GET /ir/{id}/design
 */
export async function exportIncidenceRate(id: number): Promise<unknown> {
  try {
    return await httpGet<unknown>(`/ir/${id}/design`)
  } catch (err) {
    logger.error('IncidenceRate', `exportIncidenceRate(${id}) failed`, err)
    throw err
  }
}

/**
 * Import an incidence-rate analysis design. Server creates a new analysis.
 * POST /ir/design
 */
export async function importIncidenceRate(design: unknown): Promise<IncidenceRate> {
  const data = await httpPost<unknown>('/ir/design', design)
  return decodeIRExpression(data)
}

/** POST /ir/{id}/tag/{tagId}. */
export async function assignIncidenceRateTag(id: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpPost(`/ir/${id}/tag/${tagId}`, undefined)
  }, CONTEXT)
}

/** DELETE /ir/{id}/tag/{tagId}. */
export async function unassignIncidenceRateTag(
  id: number,
  tagId: number
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/ir/${id}/tag/${tagId}`)
  }, CONTEXT)
}

/** GET /ir/{id}/info — array of execution info, one per source. */
export async function listIncidenceRateInfo(
  id: number
): Promise<ApiResult<IncidenceRateInfoBySource[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/ir/${id}/info`)
    return parseOrThrow(IncidenceRateInfoListSchema, data, 'Invalid info list response')
  }, CONTEXT)
}

/** GET /ir/{id}/info/{sourceKey} — execution info + summary list for one source. */
export async function getIncidenceRateInfoBySource(
  id: number,
  sourceKey: string
): Promise<ApiResult<IncidenceRateInfoBySource>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/ir/${id}/info/${sourceKey}`)
    return parseOrThrow(IncidenceRateInfoBySourceSchema, data, 'Invalid info-by-source response')
  }, CONTEXT)
}

/** GET /ir/{id}/execute/{sourceKey} — start a generation.
 * The endpoint returns a Spring JobExecutionResource, not an IRExecutionInfo —
 * the canonical shape arrives via the next /info poll. We treat it as fire-and-forget. */
export async function generateIncidenceRate(
  id: number,
  sourceKey: string
): Promise<ApiResult<null>> {
  return unwrap(async () => {
    await httpGet<unknown>(`/ir/${id}/execute/${sourceKey}`)
    return null
  }, CONTEXT)
}

/** DELETE /ir/{id}/execute/{sourceKey} — cancel a running generation. */
export async function cancelIncidenceRateGeneration(
  id: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/ir/${id}/execute/${sourceKey}`)
  }, CONTEXT)
}

/** DELETE /ir/{id}/info/{sourceKey} — clear results. */
export async function deleteIncidenceRateInfo(
  id: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/ir/${id}/info/${sourceKey}`)
  }, CONTEXT)
}

/** GET /ir/{id}/report/{sourceKey}?targetId=&outcomeId= — full report. */
export async function getIncidenceRateReport(
  id: number,
  sourceKey: string,
  targetId: number,
  outcomeId: number
): Promise<ApiResult<IncidenceRateReport>> {
  return unwrap(async () => {
    const url = `/ir/${id}/report/${sourceKey}?targetId=${targetId}&outcomeId=${outcomeId}`
    const data = await httpGet<unknown>(url)
    return parseOrThrow(
      IncidenceRateReportSchema.passthrough(),
      data,
      'Invalid report response'
    ) as IncidenceRateReport
  }, CONTEXT)
}
