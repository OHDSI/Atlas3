/** Tiny helper: download an SVG element as PNG or SVG. */
export function downloadSVG(svg: SVGSVGElement, filename: string) {
  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  URL.revokeObjectURL(url)
}

export async function downloadPNG(svg: SVGSVGElement, filename: string): Promise<void> {
  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const canvas = document.createElement('canvas')
  const rect = svg.getBoundingClientRect()
  canvas.width = Math.max(1, rect.width)
  canvas.height = Math.max(1, rect.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)

  canvas.toBlob(b => {
    if (!b) return
    const u = URL.createObjectURL(b)
    triggerDownload(u, filename)
    URL.revokeObjectURL(u)
  }, 'image/png')
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
