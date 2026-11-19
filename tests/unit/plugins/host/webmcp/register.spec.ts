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

  describe('custom SQL feature analyses', () => {
    const faCaps: Capability[] = ['create_feature_analysis', 'update_feature_analysis'].map(name => ({
      name,
      description: 'd',
      schema: {
        type: 'object',
        properties: { type: { type: 'string', enum: ['PRESET', 'CRITERIA_SET', 'CUSTOM_FE'] }, design: {} },
      },
      requiresApproval: true,
    }))

    it('removes CUSTOM_FE from the advertised type enum', () => {
      const { host, defs } = fakeHost()
      registerWebMcpCapabilities(host, faCaps, vi.fn())
      for (const d of defs) {
        expect(d.inputSchema.properties.type.enum).toEqual(['PRESET', 'CRITERIA_SET'])
      }
      expect((faCaps[0].schema as any).properties.type.enum).toContain('CUSTOM_FE')
    })

    it.each([
      ['create_feature_analysis', { name: 'X', type: 'CUSTOM_FE', design: 'drop table person' }],
      ['update_feature_analysis', { id: 1, type: 'CUSTOM_FE', design: 'select 1' }],
      ['update_feature_analysis', { id: 1, design: 'delete from person' }],
    ])('rejects %s with SQL without applying it', async (name, args) => {
      const { host, defs } = fakeHost()
      const apply = vi.fn()
      registerWebMcpCapabilities(host, faCaps, apply)
      const out = await defs.find(d => d.name === name).execute(args)
      expect(apply).not.toHaveBeenCalled()
      expect(out).toMatchObject({ applied: false })
      expect(out.error).toMatch(/SQL/)
    })

    it('still applies criteria-set designs', async () => {
      const { host, defs } = fakeHost()
      const apply = vi.fn().mockResolvedValue({ applied: true })
      registerWebMcpCapabilities(host, faCaps, apply)
      await defs[0].execute({ name: 'X', type: 'CRITERIA_SET', design: [] })
      expect(apply).toHaveBeenCalledOnce()
    })
  })
})
