export type Rgb = [number, number, number]
export type Rgba = [number, number, number, number]

export function parseColor(value: string): Rgba {
  const trimmed = value.trim()
  if (trimmed.startsWith('#')) {
    let h = trimmed.slice(1)
    if (h.length === 3 || h.length === 4) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('')
    }
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return [r, g, b, a]
  }
  const match = trimmed.match(/rgba?\(([^)]+)\)/)
  if (!match) throw new Error(`Unsupported color format: ${value}`)
  const parts = match[1]!.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length < 3) throw new Error(`Unsupported color format: ${value}`)
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1]
}

export function composite(fg: string, bg: string): Rgb {
  const [r, g, b, a] = parseColor(fg)
  const [br, bg_, bb] = parseColor(bg)
  return [r * a + br * (1 - a), g * a + bg_ * (1 - a), b * a + bb * (1 - a)]
}

export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (raw: number) => {
    const c = raw / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(composite(fg, bg))
  const b = relativeLuminance(composite(bg, fg))
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

const toHex = ([r, g, b]: Rgb): string =>
  '#' +
  [r, g, b]
    .map((n) => Math.round(n).toString(16).padStart(2, '0'))
    .join('')

export function lightenUntil(color: string, background: string, target: number): string {
  const [r, g, b] = parseColor(color)
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const mixed = toHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t])
    if (contrastRatio(mixed, background) >= target) return mixed
  }
  return '#ffffff'
}
