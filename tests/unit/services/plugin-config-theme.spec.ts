import { describe, it, expect } from 'vitest'
import { PluginManifestSchema } from '@/models/PluginModels'

const base = { version: '1.0.0', plugins: [] }

describe('plugins.json theme.defaultMode', () => {
  it('accepts light, dark, and system', () => {
    for (const defaultMode of ['light', 'dark', 'system']) {
      const result = PluginManifestSchema.safeParse({
        ...base,
        settings: { theme: { defaultMode } },
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects an unknown mode', () => {
    const result = PluginManifestSchema.safeParse({
      ...base,
      settings: { theme: { defaultMode: 'neon' } },
    })
    expect(result.success).toBe(false)
  })

  it('stays valid when defaultMode is absent', () => {
    const result = PluginManifestSchema.safeParse({
      ...base,
      settings: { theme: { primaryColor: '#1f425a' } },
    })
    expect(result.success).toBe(true)
  })
})
