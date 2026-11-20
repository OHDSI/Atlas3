import type { Capability, JsonSchema } from '@/plugins/host/capabilities/types'
import { applyCapability, type ApplyResult } from '@/plugins/host/capabilities/apply'
import type { WebMcpHost } from './webmcpHost'

type ApplyFn = (name: string, args: Record<string, unknown>) => Promise<ApplyResult>

const FEATURE_ANALYSIS_TOOLS = new Set(['create_feature_analysis', 'update_feature_analysis'])
const CUSTOM_SQL_TYPE = 'CUSTOM_FE'

// WebMCP calls apply without a confirmation step, and custom feature analysis
// SQL later runs against the CDM database with WebAPI's credentials, so agents
// on this surface may only write criteria-set designs.
function rejectsCustomSql(name: string, args: Record<string, unknown>): boolean {
  if (!FEATURE_ANALYSIS_TOOLS.has(name)) return false
  if (args.type === CUSTOM_SQL_TYPE) return true
  return name === 'update_feature_analysis' && typeof args.design === 'string'
}

function withoutCustomSqlType(name: string, schema: JsonSchema): JsonSchema {
  if (!FEATURE_ANALYSIS_TOOLS.has(name)) return schema
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
  const typeProp = properties?.type
  if (!properties || !typeProp || !Array.isArray(typeProp.enum)) return schema
  return {
    ...schema,
    properties: {
      ...properties,
      type: { ...typeProp, enum: typeProp.enum.filter(v => v !== CUSTOM_SQL_TYPE) },
    },
  }
}

export function registerWebMcpCapabilities(
  host: WebMcpHost,
  capabilities: Capability[],
  apply: ApplyFn = applyCapability
): () => void {
  const disposers = capabilities.map(cap =>
    host.registerTool({
      name: cap.name,
      description: cap.description,
      inputSchema: withoutCustomSqlType(cap.name, cap.schema),
      execute: async (args) => {
        const input = args ?? {}
        if (rejectsCustomSql(cap.name, input)) {
          return { applied: false, error: 'Custom SQL feature analyses cannot be written over WebMCP.' }
        }
        return apply(cap.name, input)
      },
    }))
  return () => disposers.forEach(d => d())
}
