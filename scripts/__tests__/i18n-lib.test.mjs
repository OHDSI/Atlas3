// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  hashSource,
  isExcludedPath,
  flattenStrings,
  translatableSource,
  computeStatus,
  deltaKeys,
  assembleLocale,
  placeholders,
} from '../i18n-lib.mjs'

const EN = {
  locale: 'en',
  format: { number: '# ###.##', date: { datetime: 'MM/DD/YYYY' } },
  navigation: { home: 'Home', jobs: 'Jobs', feedback: 'Feedback' },
  common: { save: 'Save', greet: 'Hello {name}' },
}

describe('hashSource', () => {
  it('is stable and content-sensitive', () => {
    expect(hashSource('Home')).toBe(hashSource('Home'))
    expect(hashSource('Home')).not.toBe(hashSource('home'))
  })
})

describe('isExcludedPath', () => {
  it('excludes locale marker and the format subtree only', () => {
    expect(isExcludedPath('locale')).toBe(true)
    expect(isExcludedPath('format')).toBe(true)
    expect(isExcludedPath('format.date.datetime')).toBe(true)
    expect(isExcludedPath('navigation.home')).toBe(false)
  })
})

describe('flatten / translatableSource', () => {
  it('flattens string leaves to dot paths', () => {
    expect(flattenStrings(EN).get('navigation.home')).toBe('Home')
  })
  it('drops excluded keys from the translatable set', () => {
    const keys = [...translatableSource(EN).keys()]
    expect(keys).toContain('navigation.home')
    expect(keys).not.toContain('locale')
    expect(keys.some(k => k.startsWith('format'))).toBe(false)
  })
  it('rejects non-string leaves', () => {
    expect(() => flattenStrings({ a: 5 })).toThrow()
  })
})

describe('placeholders', () => {
  it('captures {x} and <%= x %> tokens', () => {
    expect(placeholders('Hi {name} and <%= other %>')).toEqual(['<%= other %>', '{name}'])
  })
})

describe('computeStatus', () => {
  const ja = { locale: 'ja', navigation: { home: 'ホーム', jobs: 'ジョブ', feedback: 'フィードバック' }, common: { save: '保存', greet: 'こんにちは {name}' } }
  const fullManifest = Object.fromEntries(
    [...translatableSource(EN)].map(([k, v]) => [k, hashSource(v)])
  )

  it('reports all ok when manifest matches', () => {
    const s = computeStatus(EN, ja, fullManifest)
    expect(s.new).toEqual([])
    expect(s.stale).toEqual([])
    expect(s.removed).toEqual([])
    expect(s.ok.length).toBe(translatableSource(EN).size)
  })

  it('flags new (no manifest entry), stale (hash mismatch), removed (gone from en)', () => {
    const manifest = { ...fullManifest }
    delete manifest['navigation.jobs'] // never recorded → new
    manifest['common.save'] = 'deadbeef0000' // wrong hash → stale
    manifest['navigation.OLD'] = hashSource('Old') // not in en → removed

    const s = computeStatus(EN, { ...ja, navigation: { ...ja.navigation, OLD: '古い' } }, manifest)
    expect(s.new).toContain('navigation.jobs')
    expect(s.stale).toContain('common.save')
    expect(s.removed).toContain('navigation.OLD')
  })

  it('treats a recorded key missing from the locale file as new', () => {
    const jaMissing = { navigation: { home: 'ホーム' } }
    const s = computeStatus(EN, jaMissing, fullManifest)
    expect(s.new).toContain('navigation.jobs')
  })
})

describe('deltaKeys', () => {
  it('is new + stale, sorted', () => {
    const s = { new: ['b'], stale: ['a'], ok: [], removed: [] }
    expect(deltaKeys(s)).toEqual(['a', 'b'])
  })
})

describe('assembleLocale', () => {
  it('preserves en order, sets locale code, copies format, omits untranslated', () => {
    const translations = new Map([
      ['navigation.home', 'ホーム'],
      ['common.save', '保存'],
      // navigation.jobs / feedback / common.greet intentionally untranslated
    ])
    const out = assembleLocale(EN, 'ja', translations)
    expect(out.locale).toBe('ja')
    expect(out.format).toEqual(EN.format) // format copied verbatim
    expect(out.navigation.home).toBe('ホーム')
    expect(out.navigation.jobs).toBeUndefined() // omitted → runtime falls back to English
    expect(out.common.greet).toBeUndefined()
    // key order follows en (locale, format, navigation, common)
    expect(Object.keys(out)).toEqual(['locale', 'format', 'navigation', 'common'])
  })
})
