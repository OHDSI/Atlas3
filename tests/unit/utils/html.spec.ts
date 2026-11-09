import { describe, it, expect } from 'vitest'
import { escapeHtml, sanitizeHtml } from '@/utils/html'

describe('escapeHtml', () => {
  it('escapes markup-significant characters', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe(
      '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;'
    )
  })
})

describe('sanitizeHtml', () => {
  it('keeps ordinary formatting', () => {
    const html = '<h2>Cohort</h2><ul><li><strong>a</strong></li></ul><table><tr><td>1</td></tr></table>'
    expect(sanitizeHtml(html)).toBe(
      '<h2>Cohort</h2><ul><li><strong>a</strong></li></ul><table><tbody><tr><td>1</td></tr></tbody></table>'
    )
  })

  it('strips scripts, event handlers and javascript: URLs', () => {
    const out = sanitizeHtml(
      '<p>x<script>alert(1)</script><img src="y" onerror="alert(2)"><a href="javascript:alert(3)">l</a></p>'
    )
    expect(out).not.toMatch(/script|onerror|javascript:/i)
    expect(out).toContain('<img src="y">')
  })
})
