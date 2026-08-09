import { describe, it, expect, vi } from 'vitest'
import { registerWebMcpCapabilities } from '@/plugins/host/webmcp/register'
import type { WebMcpHost } from '@/plugins/host/webmcp/webmcpHost'
import type { Capability } from '@/plugins/host/capabilities/types'

const caps: Capability[] = [
  { name: 'set_entry_event', description: 'd', schema: { type: 'object' }, requiresApproval: true },
]
function fakeHost() {
  const defs: any[] = []
  return { host: { registerTool: (d: any) => { defs.push(d); return () => {} } } as WebMcpHost, defs }
}

describe('registerWebMcpCapabilities', () => {
  it('registers one tool per capability with its schema', () => {
    const { host, defs } = fakeHost()
    registerWebMcpCapabilities(host, caps, vi.fn().mockResolvedValue({ applied: true }))
    expect(defs).toHaveLength(1)
    expect(defs[0].name).toBe('set_entry_event')
    expect(defs[0].inputSchema).toEqual({ type: 'object' })
  })
  it('execute applies directly (no gate) and returns the result', async () => {
    const { host, defs } = fakeHost()
    const apply = vi.fn().mockResolvedValue({ applied: true, kind: 'addEntryEvent', id: 5 })
    registerWebMcpCapabilities(host, caps, apply)
    const out = await defs[0].execute({ conceptId: 1 })
    expect(apply).toHaveBeenCalledWith('set_entry_event', { conceptId: 1 })
    expect(out).toMatchObject({ applied: true, id: 5 })
  })
})
