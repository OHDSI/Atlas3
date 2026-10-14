import { describe, it, expect } from 'vitest'
import { tr } from '../../helpers/i18n-mock'

describe('tr', () => {
  it('resolves a key from en.json', () => {
    expect(tr('common.save')).toBe('Save')
  })

  it('interpolates {name} params', () => {
    expect(tr('cs.browser.compare.vennDiagramTotalAmountConcepts', { count: 3 })).toBe(
      'The total amount of concepts: 3'
    )
  })

  it('throws on a key that is not in en.json', () => {
    expect(() => tr('no.such.key')).toThrow('"no.such.key" is not a string in en.json')
  })
})
