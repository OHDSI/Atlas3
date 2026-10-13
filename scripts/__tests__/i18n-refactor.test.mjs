// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  deleteByPath,
  planRenames,
  applyPlan,
  pruneKeys,
  rewriteSource,
  convertLegacyPlaceholders,
} from '../i18n-refactor.core.mjs'

describe('deleteByPath', () => {
  it('removes the leaf and emptied parents', () => {
    const obj = { a: { b: { c: 'x' } }, d: 'y' }
    deleteByPath(obj, 'a.b.c')
    expect(obj).toEqual({ d: 'y' })
  })

  it('keeps parents that still have children', () => {
    const obj = { a: { b: 'x', c: 'y' } }
    deleteByPath(obj, 'a.b')
    expect(obj).toEqual({ a: { c: 'y' } })
  })

  it('ignores missing paths', () => {
    const obj = { a: 'x' }
    deleteByPath(obj, 'a.b.c')
    deleteByPath(obj, 'z')
    expect(obj).toEqual({ a: 'x' })
  })
})

describe('planRenames', () => {
  const en = { a: { one: 'Save', two: 'Save', three: 'Other' }, common: { save: 'Save' } }

  it('plans a rename onto a free key', () => {
    expect(planRenames(en, { 'a.three': 'b.other' })).toEqual({
      renames: [['a.three', 'b.other']],
      merges: [],
      errors: [],
    })
  })

  it('plans a merge onto an existing key with the same English', () => {
    expect(planRenames(en, { 'a.one': 'common.save' }).merges).toEqual([['a.one', 'common.save']])
  })

  it('merges several sources into one new key', () => {
    const plan = planRenames(en, { 'a.one': 'shared.save', 'a.two': 'shared.save' })
    expect(plan.renames).toEqual([['a.one', 'shared.save']])
    expect(plan.merges).toEqual([['a.two', 'shared.save']])
    expect(plan.errors).toEqual([])
  })

  it('refuses a merge whose English differs', () => {
    expect(planRenames(en, { 'a.three': 'common.save' }).errors).toHaveLength(1)
  })

  it('refuses unknown sources, nesting under a string, and replacing an object', () => {
    const { errors } = planRenames(en, {
      'a.missing': 'x.y',
      'a.one': 'common.save.deep',
      'a.two': 'common',
    })
    expect(errors).toHaveLength(3)
  })

  it('refuses chained renames', () => {
    expect(planRenames(en, { 'a.one': 'a.two', 'a.two': 'x.y' }).errors.length).toBeGreaterThan(0)
  })
})

describe('applyPlan', () => {
  it('moves values and manifest hashes for renames', () => {
    const locale = { a: { old: 'Hozon' } }
    const manifest = { 'a.old': 'h1' }
    applyPlan(locale, manifest, { renames: [['a.old', 'b.new']], merges: [] })
    expect(locale).toEqual({ b: { new: 'Hozon' } })
    expect(manifest).toEqual({ 'b.new': 'h1' })
  })

  it("keeps the target's translation on merge", () => {
    const locale = { a: { old: 'X' }, common: { save: 'Y' } }
    const manifest = { 'a.old': 'h1', 'common.save': 'h2' }
    applyPlan(locale, manifest, { renames: [], merges: [['a.old', 'common.save']] })
    expect(locale).toEqual({ common: { save: 'Y' } })
    expect(manifest).toEqual({ 'common.save': 'h2' })
  })

  it("adopts the source's translation on merge when the target has none", () => {
    const locale = { a: { old: 'X' } }
    const manifest = { 'a.old': 'h1' }
    applyPlan(locale, manifest, { renames: [], merges: [['a.old', 'common.save']] })
    expect(locale).toEqual({ common: { save: 'X' } })
    expect(manifest).toEqual({ 'common.save': 'h1' })
  })

  it('tolerates a locale without the key and no manifest', () => {
    const locale = { other: 'x' }
    applyPlan(locale, undefined, { renames: [['a.old', 'b.new']], merges: [] })
    expect(locale).toEqual({ other: 'x' })
  })
})

describe('pruneKeys', () => {
  it('drops keys from a locale and its manifest', () => {
    const locale = { a: { b: 'x', c: 'y' } }
    const manifest = { 'a.b': 'h', 'a.c': 'h' }
    pruneKeys(locale, manifest, ['a.b'])
    expect(locale).toEqual({ a: { c: 'y' } })
    expect(manifest).toEqual({ 'a.c': 'h' })
  })
})

describe('rewriteSource', () => {
  const map = { 'a.b': 'x.y' }

  it('rewrites quoted keys in any quote style', () => {
    expect(rewriteSource(`t('a.b'); tv("a.b"); k = \`a.b\``, map)).toBe(
      `t('x.y'); tv("x.y"); k = \`x.y\``
    )
  })

  it('leaves longer keys sharing the prefix alone', () => {
    expect(rewriteSource(`t('a.bc'); t('a.b.c')`, map)).toBe(`t('a.bc'); t('a.b.c')`)
  })

  it('returns the input unchanged when nothing matches', () => {
    const src = `t('q.r')`
    expect(rewriteSource(src, map)).toBe(src)
  })
})

describe('convertLegacyPlaceholders', () => {
  it('converts <%= x %> in all spacing variants', () => {
    expect(convertLegacyPlaceholders('<%= a %> and <%=b%> and <%=  c%>')).toBe('{a} and {b} and {c}')
  })

  it('leaves {x} placeholders alone', () => {
    expect(convertLegacyPlaceholders('Hi {name}')).toBe('Hi {name}')
  })
})
