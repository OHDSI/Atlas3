// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  extractKeys,
  findMissing,
  findParentCollision,
  findBatchCollision,
  findFallbackConflicts,
  lintEnglish,
  findRedundantFallbacks,
  stripFallbacks,
  unescapeLiteral,
  extractConfigKeys,
} from '../i18n-check.core.mjs'

describe('extractKeys', () => {
  it('extracts double-quoted keys', () => {
    expect(extractKeys(`t("common.save")`)).toEqual([{ key: 'common.save', fallback: null }])
  })

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

describe('lintEnglish', () => {
  it('accepts {name} placeholders', () => {
    expect(lintEnglish({ a: { b: 'Hi {name}' } })).toEqual([])
  })

  it('rejects <%= %> placeholders', () => {
    expect(lintEnglish({ a: { b: 'Hi <%= name %>' } })).toEqual([
      '"a.b" uses a <%= %> placeholder; write {name} instead',
    ])
  })

  it('rejects numbered Atlas 2.x style keys', () => {
    expect(lintEnglish({ a: { cohortErasText_2: 'x', textfield: 'y', field_17: 'z' } })).toEqual([
      '"a.cohortErasText_2" is a numbered key; name it after what the string is for',
      '"a.textfield" is a numbered key; name it after what the string is for',
      '"a.field_17" is a numbered key; name it after what the string is for',
    ])
  })

  it('accepts keys that merely contain digits', () => {
    expect(lintEnglish({ columns: { p25: 'P25' }, x: { accessDenied403: 'No' } })).toEqual([])
  })

  it('ignores the untranslated format subtree', () => {
    expect(lintEnglish({ format: { x: '<%= y %>' } })).toEqual([])
  })
})

describe('stripFallbacks', () => {
  const en = { a: { b: 'Save', c: 'Hi {n}', q: "It's", d: 'Say "hi"' } }

  it('drops a fallback that repeats en.json', () => {
    expect(stripFallbacks(`t('a.b', 'Save').value`, en)).toBe(`t('a.b').value`)
  })

  it('keeps the params argument after the fallback', () => {
    expect(stripFallbacks(`tv('a.c', 'Hi {n}', { n })`, en)).toBe(`tv('a.c', { n })`)
  })

  it('compares the unescaped value of quoted and template literals', () => {
    expect(stripFallbacks(`t('a.q', 'It\\'s')`, en)).toBe(`t('a.q')`)
    expect(stripFallbacks(`t("a.d", "Say \\"hi\\"")`, en)).toBe(`t("a.d")`)
    expect(stripFallbacks('t(\'a.b\', `Save`)', en)).toBe(`t('a.b')`)
  })

  it('handles calls spread over several lines', () => {
    expect(stripFallbacks(`t(\n  'a.b',\n  'Save'\n)`, en)).toBe(`t(\n  'a.b'\n)`)
  })

  it('leaves a fallback whose wording differs from en.json for a person to decide', () => {
    const src = `t('a.b', 'Save cohort')`
    expect(stripFallbacks(src, en)).toBe(src)
  })

  it('leaves keys missing from en.json alone so --backfill can lift them', () => {
    const src = `t('x.y', 'New text')`
    expect(stripFallbacks(src, en)).toBe(src)
  })

  it('leaves interpolated templates and non-literal fallbacks alone', () => {
    const src = 't(\'a.b\', `Save ${x}`); t(\'a.b\', label)'
    expect(stripFallbacks(src, en)).toBe(src)
  })

  it('does not touch identifiers ending in t', () => {
    const src = `emit('a.b', 'Save')`
    expect(stripFallbacks(src, en)).toBe(src)
  })
})

describe('findRedundantFallbacks', () => {
  it('reports key, line and whether the wording diverges from en.json', () => {
    const src = `x\nt('a.b', 'Save')\nt('a.b', 'Save all')\nt('x.y', 'New')`
    expect(findRedundantFallbacks(src, { a: { b: 'Save' } })).toEqual([
      { key: 'a.b', line: 2, divergent: false, fallback: 'Save', english: 'Save' },
      { key: 'a.b', line: 3, divergent: true, fallback: 'Save all', english: 'Save' },
    ])
  })
})

describe('unescapeLiteral', () => {
  it('unescapes quotes, backslashes and common escapes', () => {
    expect(unescapeLiteral("Data source \\'{key}\\' not found")).toBe("Data source '{key}' not found")
    expect(unescapeLiteral('a\\\\b')).toBe('a\\b')
    expect(unescapeLiteral('line\\nnext \\u2014 \\x41')).toBe('line\nnext \u2014 A')
  })

  it('leaves plain text alone', () => {
    expect(unescapeLiteral('Hi {name}')).toBe('Hi {name}')
  })
})

describe('extractConfigKeys', () => {
  it('extracts *Key fields from JSON config', () => {
    const json = '{ "nameKey": "attributes.age.name", "descriptionKey": "a.b", "name": "Age", "key": "x.y" }'
    expect(extractConfigKeys(json)).toEqual([
      { key: 'attributes.age.name', fallback: null },
      { key: 'a.b', fallback: null },
    ])
  })
})
