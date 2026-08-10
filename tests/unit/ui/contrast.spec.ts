import { describe, it, expect } from 'vitest'
import { contrastRatio, lightenUntil, relativeLuminance, parseColor } from '@/ui/contrast'

describe('parseColor', () => {
  it('parses 6-digit hex as fully opaque', () => {
    expect(parseColor('#161618')).toEqual([22, 22, 24, 1])
  })

  it('parses 3-digit hex by doubling each nibble', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1])
  })

  it('parses rgb() with an implicit alpha of 1', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30, 1])
  })

  it('parses rgba() with an explicit alpha', () => {
    expect(parseColor('rgba(255,255,255,.36)')).toEqual([255, 255, 255, 0.36])
  })

  it('throws on a malformed rgb() with fewer than three components', () => {
    expect(() => parseColor('rgb(10,20)')).toThrow('Unsupported color format: rgb(10,20)')
  })
})

describe('relativeLuminance', () => {
  it('returns 0 for black and 1 for white', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5)
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
  })
})

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  })

  it('returns 1 for a colour against itself', () => {
    expect(contrastRatio('#1f425a', '#1f425a')).toBeCloseTo(1, 5)
  })

  it('composites a translucent foreground over the background before measuring', () => {
    // rgba(255,255,255,.36) over #161618 is the dark outline-strong token.
    expect(contrastRatio('rgba(255,255,255,.36)', '#161618')).toBeCloseTo(3.34, 1)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#6aa3cb', '#161618')).toBeCloseTo(contrastRatio('#161618', '#6aa3cb'), 5)
  })
})

describe('lightenUntil', () => {
  it('returns the colour unchanged when it already meets the target', () => {
    expect(lightenUntil('#6aa3cb', '#161618', 4.5)).toBe('#6aa3cb')
  })

  it('lightens a too-dark colour until it clears the target', () => {
    const result = lightenUntil('#1f425a', '#161618', 4.5)
    expect(result).toBe('#6d8494')
    expect(contrastRatio(result, '#161618')).toBeGreaterThanOrEqual(4.5)
  })

  it('lightens pure black to a mid grey that clears the target', () => {
    expect(lightenUntil('#000000', '#161618', 4.5)).toBe('#7f7f7f')
  })

  // 21:1 is the maximum contrast any colour pair can reach, so 22 is unreachable
  // and drives the loop to its fallback.
  it('falls back to white when no mix reaches the target', () => {
    expect(lightenUntil('#000000', '#ffffff', 22)).toBe('#ffffff')
  })
})
