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
    expect(registerTool.mock.calls.length).toBe(28)
  })
  it('does not throw and returns a no-op disposer when registerTool throws', () => {
    const registerTool = vi.fn().mockImplementation(() => {
      throw new Error('invalid-schema')
    })
    ;(globalThis.navigator as any).modelContext = { registerTool }
    let disposer: (() => void) | undefined
    expect(() => {
      disposer = initWebMcp()
    }).not.toThrow()
    expect(typeof disposer).toBe('function')
    expect(() => disposer!()).not.toThrow()
  })
})
