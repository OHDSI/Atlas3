/**
 * MCP provenance service
 *
 * Reads the history of AI-agent tool calls that WebAPI's MCP server recorded
 * against a cohort definition or concept set: which tool ran, at which
 * reasoning step, the clinical rationale and evidence the agent gave, and the
 * outcome. Served by GET /{cohortdefinition|conceptset}/{id}/mcp-provenance
 * (OHDSI/WebAPI#2580).
 */
import { z } from 'zod'
import { httpGet } from '@/services/http-client'
import { ApiError, parseOrThrow, unwrapList } from '@/services/api-error'

export const provenanceOutcomeSchema = z.enum(['STARTED', 'SUCCESS', 'ERROR', 'REJECTED', 'DENIED'])

export const provenanceEntrySchema = z.object({
  id: z.number(),
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().nullish(),
  reasoningStep: z.string().nullish(),
  tool: z.string(),
  outcome: provenanceOutcomeSchema,
  clinicalRationale: z.string().nullish(),
  evidenceReference: z.string().nullish(),
  errorMessage: z.string().nullish(),
  userLogin: z.string().nullish(),
  startedAt: z.number(),
  finishedAt: z.number().nullish(),
})

export type ProvenanceOutcome = z.infer<typeof provenanceOutcomeSchema>
export type ProvenanceEntry = z.infer<typeof provenanceEntrySchema>

/** The WebAPI resource the provenance belongs to. */
export type ProvenanceKind = 'cohortdefinition' | 'conceptset'

/** One agent session: the calls that share a W3C trace id, in the order they ran. */
export interface ProvenanceTrace {
  traceId: string
  startedAt: number
  userLogin: string | null
  entries: ProvenanceEntry[]
}

const entryListSchema = z.array(provenanceEntrySchema)

/**
 * Fetch the agent history of one cohort definition or concept set, oldest call first.
 *
 * A WebAPI without the MCP server has no provenance endpoint; its 404 means
 * "no agent history", not an error.
 */
export async function getProvenance(kind: ProvenanceKind, id: number): Promise<ProvenanceEntry[]> {
  let payload: unknown
  try {
    payload = await httpGet<unknown>(`/${kind}/${id}/mcp-provenance`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return []
    }
    throw err
  }
  return parseOrThrow(entryListSchema, unwrapList(payload), 'Failed to validate agent history data')
}

/** Group entries into agent sessions, ordered by each session's first call. */
export function groupByTrace(entries: ProvenanceEntry[]): ProvenanceTrace[] {
  const traces = new Map<string, ProvenanceTrace>()
  for (const entry of [...entries].sort((a, b) => a.startedAt - b.startedAt || a.id - b.id)) {
    let trace = traces.get(entry.traceId)
    if (!trace) {
      trace = {
        traceId: entry.traceId,
        startedAt: entry.startedAt,
        userLogin: entry.userLogin ?? null,
        entries: [],
      }
      traces.set(entry.traceId, trace)
    }
    trace.entries.push(entry)
  }
  return [...traces.values()]
}
