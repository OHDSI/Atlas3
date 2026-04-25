import { describe, it, expect } from 'vitest'
import atlasConfig from '@/config/atlas-config.json'

type AttrEntry = { id: string; type?: string }
type AttributeMapping = Record<string, AttrEntry[]>

describe('atlas-config attributeMapping', () => {
  const attributeMapping = (atlasConfig as { attributeMapping: AttributeMapping }).attributeMapping

  it('does not expose a "default" concept-set attribute alongside the event-level concept set', () => {
    const offenders: string[] = []
    for (const [filterType, attrs] of Object.entries(attributeMapping)) {
      for (const attr of attrs) {
        if (attr.id === 'default') {
          offenders.push(`${filterType} has attribute id="default" type="${attr.type}"`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
