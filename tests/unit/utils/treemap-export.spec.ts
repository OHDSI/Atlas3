/**
 * Treemap Export Tests
 * Tests SVG/PNG download helpers. DOM-touching APIs are mocked since jsdom
 * does not implement <canvas>.toBlob, URL.createObjectURL, or Image loading.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadSVG, downloadPNG } from '@/utils/treemap-export'

describe('treemap-export', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let originalCreateObjectURL: typeof URL.createObjectURL | undefined
  let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined
  // Some other test files in the suite overwrite global.Blob with a vi.fn() and
  // never restore it. When the global mock is later cleared by vi.clearAllMocks(),
  // `new Blob(...)` returns an empty object without `.type`. tests/setup.ts
  // captures the real Blob on `globalThis.__OriginalBlob` before any test file
  // runs; we restore from that snapshot here so this file is resilient to
  // ordering under the singleFork pool.
  const RealBlob =
    (globalThis as { __OriginalBlob?: typeof Blob }).__OriginalBlob ?? Blob
  let priorBlob: typeof Blob | undefined

  beforeEach(() => {
    priorBlob = globalThis.Blob
    globalThis.Blob = RealBlob

    originalCreateObjectURL = URL.createObjectURL
    originalRevokeObjectURL = URL.revokeObjectURL

    let counter = 0
    createObjectURLMock = vi.fn(() => `blob:mock-url-${++counter}`)
    revokeObjectURLMock = vi.fn()

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    })
  })

  afterEach(() => {
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: originalCreateObjectURL,
      })
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: originalRevokeObjectURL,
      })
    }
    if (priorBlob) {
      globalThis.Blob = priorBlob
    }
    vi.restoreAllMocks()
  })

  /** Build a minimal SVG element that XMLSerializer can serialize. */
  function createSvg(width = 100, height = 50): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    // jsdom's getBoundingClientRect returns zeros — patch to return our dims.
    svg.getBoundingClientRect = () =>
      ({
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    return svg
  }

  describe('downloadSVG', () => {
    it('serializes the SVG and triggers a download with the given filename', () => {
      const svg = createSvg()

      // Spy on anchor click to confirm the download was triggered.
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      const appendSpy = vi.spyOn(document.body, 'appendChild')

      downloadSVG(svg, 'chart.svg')

      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      const blobArg = createObjectURLMock.mock.calls[0][0] as Blob
      expect(blobArg).toBeInstanceOf(Blob)
      expect(blobArg.type).toBe('image/svg+xml')

      expect(clickSpy).toHaveBeenCalledTimes(1)

      // The anchor should have href set to the mock blob URL and matching download attr.
      const anchorArg = appendSpy.mock.calls.find(
        ([el]) => (el as Element).nodeName === 'A'
      )?.[0] as HTMLAnchorElement
      expect(anchorArg).toBeDefined()
      expect(anchorArg.download).toBe('chart.svg')
      expect(anchorArg.href).toContain('blob:mock-url-')

      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)
    })

    it('removes the anchor element after the click', () => {
      const svg = createSvg()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      downloadSVG(svg, 'a.svg')

      // No <a> elements should remain in the body.
      const anchors = document.body.querySelectorAll('a')
      expect(anchors.length).toBe(0)
    })
  })

  describe('downloadPNG', () => {
    it('renders the SVG to a canvas and triggers a PNG download', async () => {
      const svg = createSvg(120, 80)

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      // Stub Image so onload fires synchronously.
      const originalImage = window.Image
      class FakeImage {
        onload: (() => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        private _src = ''
        set src(value: string) {
          this._src = value
          // Trigger load asynchronously so the awaiter is wired up first.
          queueMicrotask(() => this.onload?.())
        }
        get src() {
          return this._src
        }
      }
      (window as unknown as { Image: typeof Image }).Image =
        FakeImage as unknown as typeof Image

      // Stub canvas methods that jsdom does not implement.
      const fillRect = vi.fn()
      const drawImage = vi.fn()
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue({
          fillStyle: '',
          fillRect,
          drawImage,
        } as unknown as CanvasRenderingContext2D)

      const toBlobSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'toBlob')
        .mockImplementation(function (this: HTMLCanvasElement, cb) {
          cb(new Blob(['png-bytes'], { type: 'image/png' }))
        })

      try {
        await downloadPNG(svg, 'chart.png')
      } finally {
        (window as unknown as { Image: typeof Image }).Image = originalImage
      }

      // First createObjectURL is for the SVG blob, second is for the PNG blob.
      expect(createObjectURLMock).toHaveBeenCalledTimes(2)
      expect(getContextSpy).toHaveBeenCalledWith('2d')
      expect(fillRect).toHaveBeenCalledWith(0, 0, 120, 80)
      expect(drawImage).toHaveBeenCalled()
      expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/png')
      expect(clickSpy).toHaveBeenCalledTimes(1)

      // Two revokes: SVG URL then PNG URL.
      expect(revokeObjectURLMock).toHaveBeenCalledTimes(2)
    })

    it('does nothing when canvas.toBlob yields null', async () => {
      const svg = createSvg(50, 50)

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      const originalImage = window.Image
      class FakeImage {
        onload: (() => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        set src(_value: string) {
          queueMicrotask(() => this.onload?.())
        }
      }
      (window as unknown as { Image: typeof Image }).Image =
        FakeImage as unknown as typeof Image

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D)

      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        cb,
      ) {
        cb(null)
      })

      try {
        await downloadPNG(svg, 'chart.png')
      } finally {
        (window as unknown as { Image: typeof Image }).Image = originalImage
      }

      // No PNG download should have been triggered.
      expect(clickSpy).not.toHaveBeenCalled()
      // Only one revoke (the SVG URL); the PNG URL is never created.
      expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)
    })

    it('rejects when image fails to load', async () => {
      const svg = createSvg()

      const originalImage = window.Image
      class FakeImage {
        onload: (() => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        set src(_value: string) {
          queueMicrotask(() => this.onerror?.(new Error('img boom')))
        }
      }
      (window as unknown as { Image: typeof Image }).Image =
        FakeImage as unknown as typeof Image

      try {
        await expect(downloadPNG(svg, 'chart.png')).rejects.toBeDefined()
      } finally {
        (window as unknown as { Image: typeof Image }).Image = originalImage
      }
    })

    it('clamps zero-width/height to a minimum of 1', async () => {
      const svg = createSvg(0, 0)

      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      const originalImage = window.Image
      class FakeImage {
        onload: (() => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        set src(_value: string) {
          queueMicrotask(() => this.onload?.())
        }
      }
      (window as unknown as { Image: typeof Image }).Image =
        FakeImage as unknown as typeof Image

      const fillRect = vi.fn()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        fillStyle: '',
        fillRect,
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D)

      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        this: HTMLCanvasElement,
        cb,
      ) {
        cb(new Blob(['x'], { type: 'image/png' }))
      })

      try {
        await downloadPNG(svg, 'chart.png')
      } finally {
        (window as unknown as { Image: typeof Image }).Image = originalImage
      }

      // fillRect should have been called with (0, 0, 1, 1) — Math.max(1, 0).
      expect(fillRect).toHaveBeenCalledWith(0, 0, 1, 1)
    })
  })
})
