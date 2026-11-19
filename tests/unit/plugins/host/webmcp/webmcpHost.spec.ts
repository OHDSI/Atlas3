import { describe, it, expect, vi, afterEach } from 'vitest'
import { getWebMcpHost } from '@/plugins/host/webmcp/webmcpHost'

afterEach(() => {
  delete (globalThis.navigator as any).modelContext
  delete (globalThis.document as any).modelContext
})

describe('getWebMcpHost', () => {
  it('returns null when neither document nor navigator has modelContext', () => {
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
  it('uses document.modelContext, the entry point of the current draft', () => {
    const registerTool = vi.fn().mockReturnValue({})
    ;(globalThis.document as any).modelContext = { registerTool }
    getWebMcpHost()!.registerTool({ name: 'd', description: 'd', inputSchema: {}, execute: async () => 1 })
    expect(registerTool).toHaveBeenCalledOnce()
  })
  it('prefers document.modelContext over navigator.modelContext', () => {
    const viaDocument = vi.fn().mockReturnValue({})
    const viaNavigator = vi.fn().mockReturnValue({})
    ;(globalThis.document as any).modelContext = { registerTool: viaDocument }
    ;(globalThis.navigator as any).modelContext = { registerTool: viaNavigator }
    getWebMcpHost()!.registerTool({ name: 'd', description: 'd', inputSchema: {}, execute: async () => 1 })
    expect(viaDocument).toHaveBeenCalledOnce()
    expect(viaNavigator).not.toHaveBeenCalled()
  })
})
