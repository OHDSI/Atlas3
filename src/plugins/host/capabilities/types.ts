export type JsonSchema = Record<string, unknown>

export interface Capability {
  name: string
  description: string
  schema: JsonSchema
  requiresApproval: boolean
}
