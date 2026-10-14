// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { collectReferences, findUnused, findDuplicates } from '../i18n-usage.core.mjs'

describe('collectReferences', () => {
  it('collects keys passed to t()/tv()', () => {
    const refs = collectReferences(`t('common.save', 'Save'); tv("a.b")`)
    expect([...refs].sort()).toEqual(['a.b', 'common.save'])
  })

  it('collects keys held in config fields', () => {
    const refs = collectReferences(`{ nameKey: 'attributes.age.name', i18nKey: "x.y" }`)
    expect(refs.has('attributes.age.name')).toBe(true)
    expect(refs.has('x.y')).toBe(true)
  })

  it('collects plain template literals but not interpolated ones', () => {
    const refs = collectReferences('const a = `plain.key`; const b = `versions.errors.${code}`')
    expect(refs.has('plain.key')).toBe(true)
    expect([...refs].some(r => r.startsWith('versions.errors'))).toBe(false)
  })

  it('ignores undotted strings', () => {
    expect(collectReferences(`t('save')`).size).toBe(0)
  })
})

describe('findUnused', () => {
  it('reports keys with no reference', () => {
    expect(findUnused(['a.b', 'c.d'], new Set(['a.b']), [])).toEqual(['c.d'])
  })

  it('keeps keys under a dynamic prefix', () => {
    expect(findUnused(['versions.errors.E1', 'x.y'], new Set(), ['versions.errors.'])).toEqual([
      'x.y',
    ])
  })

  it('does not treat a prefix match without a dot boundary as a reference', () => {
    expect(findUnused(['a.bc'], new Set(['a.b']), [])).toEqual(['a.bc'])
  })
})

describe('findDuplicates', () => {
  it('groups keys by case- and whitespace-insensitive English', () => {
    const en = { a: { x: 'Save' }, b: { y: ' save ' }, c: 'Other' }
    expect(findDuplicates(en)).toEqual([{ value: 'save', keys: ['a.x', 'b.y'] }])
  })

  it('can be limited to a set of keys', () => {
    const en = { a: 'Save', b: 'Save', c: 'Save' }
    expect(findDuplicates(en, new Set(['a', 'c']))).toEqual([{ value: 'save', keys: ['a', 'c'] }])
  })
})
