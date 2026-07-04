import { describe, it, expect, vi, afterEach } from 'vitest'
import { getWebMcpHost } from '@/plugins/host/webmcp/webmcpHost'

afterEach(() => { delete (globalThis.navigator as any).modelContext })

describe('getWebMcpHost', () => {
  it('returns null when navigator.modelContext is absent', () => {
    expect(getWebMcpHost()).toBeNull()
  })
  it('wraps registerTool when present', () => {
    const registerTool = vi.fn().mockReturnValue({ unregister: vi.fn() })
    ;(globalThis.navigator as any).modelContext = { registerTool }
    const host = getWebMcpHost()!
    host.registerTool({ name: 't', description: 'd', inputSchema: { type: 'object' }, execute: async () => 1 })
    expect(registerTool).toHaveBeenCalledOnce()
    expect(registerTool.mock.calls[0][0].name).toBe('t')
  })
})
