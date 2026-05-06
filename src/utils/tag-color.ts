const DEFAULT_TAG_COLOR = '#1976D2'

export function tagColor(hex: string | null | undefined): string {
  return hex && /^#?[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_TAG_COLOR
}

export function tagContrastColor(hex: string | null | undefined): string {
  const c = tagColor(hex).replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
