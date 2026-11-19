export interface WebMcpToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

export interface WebMcpHost {
  registerTool(def: WebMcpToolDef): () => void
}

export function getWebMcpHost(): WebMcpHost | null {
  // The current WebMCP draft moved the entry point to document; early browser
  // builds still expose it on navigator.
  const mc =
    (document as unknown as { modelContext?: unknown }).modelContext ??
    (navigator as unknown as { modelContext?: unknown }).modelContext
  if (!mc || typeof (mc as { registerTool?: unknown }).registerTool !== 'function') return null
  const api = mc as { registerTool: (d: unknown) => { unregister?: () => void } }
  return {
    registerTool(def) {
      const handle = api.registerTool({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
        execute: def.execute,
      })
      return () => handle?.unregister?.()
    },
  }
}
