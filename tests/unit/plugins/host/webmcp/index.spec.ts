import { describe, it, expect, vi, afterEach } from 'vitest'
import { initWebMcp } from '@/plugins/host/webmcp'

afterEach(() => { delete (globalThis.navigator as any).modelContext })

describe('initWebMcp', () => {
  it('is a no-op when navigator.modelContext is absent', () => {
    expect(() => initWebMcp()).not.toThrow()
  })
  it('registers every capability when the API is present', () => {
    const registerTool = vi.fn().mockReturnValue({ unregister: vi.fn() })
    ;(globalThis.navigator as any).modelContext = { registerTool }
    initWebMcp()
    expect(registerTool.mock.calls.length).toBe(19)
  })
})
