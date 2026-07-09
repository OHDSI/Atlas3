import type { Capability } from '@/plugins/host/capabilities/types'
import { applyCapability, type ApplyResult } from '@/plugins/host/capabilities/apply'
import type { WebMcpHost } from './webmcpHost'

type ApplyFn = (name: string, args: Record<string, unknown>) => Promise<ApplyResult>

export function registerWebMcpCapabilities(
  host: WebMcpHost,
  capabilities: Capability[],
  apply: ApplyFn = applyCapability
): () => void {
  const disposers = capabilities.map(cap =>
    host.registerTool({
      name: cap.name,
      description: cap.description,
      inputSchema: cap.schema,
      execute: (args) => apply(cap.name, args ?? {}),
    }))
  return () => disposers.forEach(d => d())
}
