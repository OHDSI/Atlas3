// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  extractKeys,
  findMissing,
  findParentCollision,
  findBatchCollision,
  findFallbackConflicts,
} from '../i18n-check.mjs'

describe('extractKeys', () => {
  it('extracts a key with an inline fallback', () => {
    expect(extractKeys(`t('common.save', 'Save')`)).toEqual([
      { key: 'common.save', fallback: 'Save' },
    ])
  })

  it('extracts a key with no fallback', () => {
    expect(extractKeys(`t('common.save')`)).toEqual([{ key: 'common.save', fallback: null }])
  })

  it('extracts tv() as well as t()', () => {
    expect(extractKeys(`tv('a.b', 'X')`)).toEqual([{ key: 'a.b', fallback: 'X' }])
  })

  it('ignores keys with no dot', () => {
    expect(extractKeys(`t('save', 'Save')`)).toEqual([])
  })

  it('does not match identifiers ending in t', () => {
    expect(extractKeys(`expect('a.b').toBe(1); it('a.b', () => {})`)).toEqual([])
  })

  it('treats a params-object second argument as no fallback', () => {
    expect(extractKeys(`t('a.b', { count: 2 })`)).toEqual([{ key: 'a.b', fallback: null }])
  })
})

describe('findMissing', () => {
  const en = { common: { save: 'Save' } }

  it('reports a key absent from en.json', () => {
    const missing = findMissing(en, [
      { key: 'common.save', fallback: 'Save', file: 'a.vue' },
      { key: 'common.back', fallback: 'Back', file: 'b.vue' },
    ])
    expect(missing).toEqual([{ key: 'common.back', fallback: 'Back', file: 'b.vue' }])
  })

  it('reports nothing when every key resolves', () => {
    expect(findMissing(en, [{ key: 'common.save', fallback: 'Save', file: 'a.vue' }])).toEqual([])
  })

  it('does not treat an object node as a resolved key', () => {
    expect(findMissing(en, [{ key: 'common', fallback: null, file: 'a.vue' }])).toHaveLength(1)
  })
})

describe('findParentCollision', () => {
  const en = { common: { save: 'Save' } }

  it('reports the ancestor string a key would overwrite', () => {
    expect(findParentCollision(en, 'common.save.now')).toBe('common.save')
  })

  it('returns null when no ancestor is a string', () => {
    expect(findParentCollision(en, 'common.back')).toBeNull()
  })
})

describe('findBatchCollision', () => {
  it('reports another key in the same batch that this key would nest under', () => {
    expect(findBatchCollision(['foo.bar', 'foo.bar.baz'], 'foo.bar.baz')).toBe('foo.bar')
  })

  it('does not flag a near-miss that only shares a text prefix, not a dot boundary', () => {
    expect(findBatchCollision(['foo.bar', 'foo.barbaz'], 'foo.barbaz')).toBeNull()
  })

  it('returns null when no other key in the batch is an ancestor', () => {
    expect(findBatchCollision(['foo.bar', 'foo.qux'], 'foo.bar')).toBeNull()
  })
})

describe('findFallbackConflicts', () => {
  it('flags a key used with two different literal fallbacks', () => {
    const conflicts = findFallbackConflicts([
      { key: 'common.to', fallback: 'To', file: 'a.vue' },
      { key: 'common.to', fallback: 'to', file: 'b.vue' },
    ])
    expect(conflicts).toEqual([
      {
        key: 'common.to',
        fallbacks: [
          { fallback: 'To', files: ['a.vue'] },
          { fallback: 'to', files: ['b.vue'] },
        ],
      },
    ])
  })

  it('does not flag the same fallback repeated at many call sites', () => {
    const conflicts = findFallbackConflicts([
      { key: 'common.save', fallback: 'Save', file: 'a.vue' },
      { key: 'common.save', fallback: 'Save', file: 'b.vue' },
      { key: 'common.save', fallback: 'Save', file: 'c.vue' },
    ])
    expect(conflicts).toEqual([])
  })

  it('does not flag a fallback at one site and no fallback at another', () => {
    const conflicts = findFallbackConflicts([
      { key: 'common.save', fallback: 'Save', file: 'a.vue' },
      { key: 'common.save', fallback: null, file: 'b.vue' },
    ])
    expect(conflicts).toEqual([])
  })
})
