import { describe, it, expect } from 'vitest'
import { buildManifest } from '../../../../../scripts/emit-capabilities-manifest.mjs'
import { CAPABILITIES } from '@/plugins/host/capabilities/registry'

describe('capabilities manifest generator', () => {
  it('emits one entry per capability, sorted by name', () => {
    const m = buildManifest(CAPABILITIES)
    expect(m).toHaveLength(CAPABILITIES.length)
    expect(m.map(e => e.name)).toEqual([...m.map(e => e.name)].sort())
  })
  it('each entry carries name, description, object schema', () => {
    for (const e of buildManifest(CAPABILITIES)) {
      expect(typeof e.name).toBe('string')
      expect(typeof e.description).toBe('string')
      expect(e.schema.type).toBe('object')
    }
  })
})
