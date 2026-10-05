import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-web'
import type { AnalyticsConfig } from '@/config/app-config.types'

/**
 * These tests pin the privacy contract and the two things that would silently
 * break telemetry: URL query strings must be stripped unless someone writes a
 * literal `false`, and the exporter's own endpoint must be excluded from
 * instrumentation or every export causes another export.
 */

/** What the module handed to the OTel SDK, captured by the mocks below. */
const captured: {
  providerConfig?: Record<string, unknown>
  exporter?: SpanExporter
  otlpConfig?: { url?: string }
  ignoreUrls?: Array<string | RegExp>
  instrumentationCount?: number
  ratio?: number
} = {}

interface RecordedSpan {
  name: string
  attributes: Record<string, unknown>
  ended: boolean
  status?: { code: unknown; message?: string }
  exceptions: unknown[]
  isRoot: boolean
}
const recorded: RecordedSpan[] = []
const ROOT = Symbol('root-context')

function makeSpan(name: string, opts: { attributes?: Record<string, unknown> }, ctx?: unknown) {
  const span: RecordedSpan = {
    name,
    attributes: opts?.attributes ?? {},
    ended: false,
    exceptions: [],
    isRoot: ctx === ROOT,
  }
  recorded.push(span)
  return {
    end: () => {
      span.ended = true
    },
    setStatus: (status: { code: unknown; message?: string }) => {
      span.status = status
    },
    recordException: (e: unknown) => span.exceptions.push(e),
  }
}

vi.mock('@opentelemetry/api', () => ({
  ROOT_CONTEXT: ROOT,
  SpanStatusCode: { ERROR: 2, OK: 1 },
}))

vi.mock('@opentelemetry/sdk-trace-web', () => ({
  WebTracerProvider: class {
    constructor(cfg: Record<string, unknown>) {
      captured.providerConfig = cfg
    }
    register() {}
    getTracer() {
      return { startSpan: makeSpan }
    }
  },
  BatchSpanProcessor: class {
    constructor(exporter: SpanExporter) {
      captured.exporter = exporter
    }
  },
  ParentBasedSampler: class {
    constructor(_cfg: unknown) {}
  },
  TraceIdRatioBasedSampler: class {
    constructor(ratio: number) {
      captured.ratio = ratio
    }
  },
}))

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class {
    constructor(cfg: { url?: string }) {
      captured.otlpConfig = cfg
    }
    export(_spans: ReadableSpan[], cb: (r: unknown) => void) {
      cb({ code: 0 })
    }
    shutdown() {
      return Promise.resolve()
    }
  },
}))

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: (a: Record<string, unknown>) => a,
}))

vi.mock('@opentelemetry/instrumentation', () => ({
  registerInstrumentations: (cfg: { instrumentations: unknown[] }) => {
    captured.instrumentationCount = cfg.instrumentations.length
  },
}))

vi.mock('@opentelemetry/instrumentation-fetch', () => ({
  FetchInstrumentation: class {
    constructor(cfg: { ignoreUrls?: Array<string | RegExp> }) {
      captured.ignoreUrls = cfg.ignoreUrls
    }
  },
}))
vi.mock('@opentelemetry/instrumentation-xml-http-request', () => ({
  XMLHttpRequestInstrumentation: class {
    constructor(_cfg: unknown) {}
  },
}))
vi.mock('@opentelemetry/instrumentation-document-load', () => ({
  DocumentLoadInstrumentation: class {},
}))

/** Captures the afterEach callback so tests can drive a navigation. */
let navigate: ((to: unknown) => void) | null = null
const routerMock = {
  afterEach: (cb: (to: unknown) => void) => {
    navigate = cb
  },
  currentRoute: { value: { name: 'home', path: '/', matched: [] } },
} as unknown as import('vue-router').Router

async function initWith(analytics: Partial<AnalyticsConfig>) {
  vi.resetModules()
  for (const k of Object.keys(captured)) delete (captured as Record<string, unknown>)[k]
  recorded.length = 0

  const { defaultAppConfig } = await import('@/config/app-config.defaults')
  vi.doMock('@/config/app-config.loader', () => ({
    getAppConfig: () => ({
      ...defaultAppConfig,
      analytics: { ...defaultAppConfig.analytics, ...analytics },
    }),
  }))

  const mod = await import('@/services/analytics/telemetry')
  await mod.initTelemetry(routerMock)
  return mod
}

/** Runs a span through whatever exporter chain the module built. */
function exportSpan(attributes: Record<string, unknown>): Record<string, unknown> {
  const span = { attributes } as unknown as ReadableSpan
  captured.exporter?.export([span], () => {})
  return attributes
}

const ENABLED = { provider: 'otlp', endpoint: '/otlp' } as const

describe('analytics/telemetry', () => {
  beforeEach(() => {
    vi.resetModules()
    recorded.length = 0
  })
  afterEach(() => {
    vi.doUnmock('@/config/app-config.loader')
  })

  describe('activation', () => {
    it('does not load the SDK when the provider is none', async () => {
      await initWith({ provider: 'none', endpoint: '/otlp' })
      expect(captured.providerConfig).toBeUndefined()
    })

    it('does not load the SDK without an endpoint', async () => {
      await initWith({ provider: 'otlp', endpoint: '' })
      expect(captured.providerConfig).toBeUndefined()
    })

    it('treats an unsubstituted env template as not configured', async () => {
      await initWith({ provider: 'otlp', endpoint: '${OTLP_ENDPOINT}' })
      expect(captured.providerConfig).toBeUndefined()
    })

    it('posts traces to <endpoint>/v1/traces', async () => {
      await initWith(ENABLED)
      expect(captured.otlpConfig?.url).toBe('/otlp/v1/traces')
    })

    it('does not double the slash when the endpoint has a trailing one', async () => {
      await initWith({ ...ENABLED, endpoint: '/otlp/' })
      expect(captured.otlpConfig?.url).toBe('/otlp/v1/traces')
    })
  })

  describe('URL scrubbing defaults to ON', () => {
    it('strips query strings when the flag is omitted', async () => {
      await initWith(ENABLED)
      const out = exportSpan({
        'url.full': 'https://atlas/atlas/?token=abc#/search?query=diabetes',
        'url.query': 'query=diabetes',
        'http.url': 'https://atlas/WebAPI/vocabulary/search?q=diabetes',
      })

      expect(out['url.full']).toBe('https://atlas/atlas/#/search')
      expect(out['http.url']).toBe('https://atlas/WebAPI/vocabulary/search')
      expect(out).not.toHaveProperty('url.query')
    })

    it.each([undefined, null, 0, 'false', ''])(
      'keeps scrubbing on for the non-boolean value %p',
      async value => {
        await initWith({ ...ENABLED, scrubUrlQueryStrings: value as unknown as boolean })
        const out = exportSpan({ 'url.query': 'query=diabetes' })
        expect(out).not.toHaveProperty('url.query')
      }
    )

    it('keeps the route path, which is what makes spans useful', async () => {
      await initWith(ENABLED)
      const out = exportSpan({ 'url.full': 'https://atlas/atlas/#/cohortdefinition/42' })
      expect(out['url.full']).toBe('https://atlas/atlas/#/cohortdefinition/42')
    })

    it('drops a URL it cannot parse rather than forwarding it', async () => {
      await initWith(ENABLED)
      const out = exportSpan({ 'url.full': 'http://[' })
      expect(out).not.toHaveProperty('url.full')
    })
  })

  describe('URL scrubbing opt-out', () => {
    it('honours a literal false', async () => {
      await initWith({ ...ENABLED, scrubUrlQueryStrings: false })
      const out = exportSpan({ 'url.query': 'query=diabetes' })
      expect(out['url.query']).toBe('query=diabetes')
    })
  })

  describe('instrumentation', () => {
    it('excludes its own export endpoint, or exports would recurse forever', async () => {
      await initWith(ENABLED)
      expect(captured.ignoreUrls).toContain('/otlp/v1/traces')
    })

    it('registers fetch, xhr and document-load by default', async () => {
      await initWith(ENABLED)
      expect(captured.instrumentationCount).toBe(3)
    })

    it('can drop API-call tracing', async () => {
      await initWith({ ...ENABLED, traceApiCalls: false })
      expect(captured.instrumentationCount).toBe(1)
    })

    it('registers nothing when both instrumentation groups are off', async () => {
      await initWith({ ...ENABLED, traceApiCalls: false, traceDocumentLoad: false })
      expect(captured.instrumentationCount).toBeUndefined()
    })
  })

  describe('sampling', () => {
    it('passes the configured ratio through', async () => {
      await initWith({ ...ENABLED, sampleRatio: 0.25 })
      expect(captured.ratio).toBe(0.25)
    })

    it('falls back to 1 for a non-finite ratio', async () => {
      await initWith({ ...ENABLED, sampleRatio: NaN })
      expect(captured.ratio).toBe(1)
    })
  })

  describe('route naming (PHI)', () => {
    it('uses the route pattern, not the resolved path with real ids', async () => {
      await initWith(ENABLED)
      navigate?.({
        name: 'cohort-detail',
        path: '/cohortdefinition/4821',
        matched: [{ path: '/cohortdefinition/:id' }],
      })

      const view = recorded.find(s => s.name === 'page_view')
      expect(view?.attributes['page.name']).toBe('/cohortdefinition/:id')
      expect(view?.attributes['page.route_name']).toBe('cohort-detail')
    })

    it('falls back to regex-normalising a path no route matched', async () => {
      await initWith(ENABLED)
      navigate?.({ name: undefined, path: '/cohortdefinition/4821/report', matched: [] })

      expect(recorded.find(s => s.name === 'page_view')?.attributes['page.name']).toBe(
        '/cohortdefinition/:id/report'
      )
    })

    it('normalises long hex ids in an unmatched path too', async () => {
      await initWith(ENABLED)
      navigate?.({ name: undefined, path: '/export/a3f9c1d2e4b50617', matched: [] })

      expect(recorded.find(s => s.name === 'page_view')?.attributes['page.name']).toBe(
        '/export/:id'
      )
    })
  })

  describe('UX measurement API', () => {
    it('is a no-op throughout when telemetry is disabled', async () => {
      const mod = await initWith({ provider: 'none', endpoint: '/otlp' })
      mod.trackAction('generate_cohort')
      mod.trackPageView('/cohortdefinition/:id')
      mod.trackError(new Error('boom'))
      expect(recorded).toHaveLength(0)
    })

    it('names actions `action:<name>` so one query ranks feature adoption', async () => {
      const mod = await initWith(ENABLED)
      mod.trackAction('generate_cohort', { 'criteria.count': 7 })

      const span = recorded.find(s => s.name === 'action:generate_cohort')
      expect(span).toBeDefined()
      expect(span?.attributes['action.name']).toBe('generate_cohort')
      expect(span?.attributes['criteria.count']).toBe(7)
      expect(span?.ended).toBe(true)
    })

    it('keeps a page_view span open so its duration is the dwell time', async () => {
      const mod = await initWith(ENABLED)
      mod.trackPageView('/conceptset/:id')

      const span = recorded.find(s => s.name === 'page_view')
      expect(span?.attributes['page.name']).toBe('/conceptset/:id')
      // Still open: ending it on navigation away is what measures dwell.
      expect(span?.ended).toBe(false)
      // Root span — nesting the visit would swallow every request on the page
      // into one trace.
      expect(span?.isRoot).toBe(true)

      mod.endPageView()
      expect(span?.ended).toBe(true)
    })

    it('closes the previous page_view when a new one opens', async () => {
      const mod = await initWith(ENABLED)
      mod.trackPageView('/first')
      mod.trackPageView('/second')

      const views = recorded.filter(s => s.name === 'page_view')
      expect(views).toHaveLength(2)
      expect(views[0].ended).toBe(true)
      expect(views[1].ended).toBe(false)
    })

    it('stamps actions and errors with the current page', async () => {
      const mod = await initWith(ENABLED)
      mod.trackPageView('/cohortdefinition/:id')
      mod.trackAction('generate_cohort')
      mod.trackError(new Error('boom'))

      expect(recorded.find(s => s.name === 'action:generate_cohort')?.attributes['page.name']).toBe(
        '/cohortdefinition/:id'
      )
      expect(recorded.find(s => s.name === 'frontend.error')?.attributes['page.name']).toBe(
        '/cohortdefinition/:id'
      )
    })

    it('records an error as a failed span with the exception attached', async () => {
      const mod = await initWith(ENABLED)
      mod.trackError(new TypeError('cannot read x'), { 'error.source': 'test' })

      const span = recorded.find(s => s.name === 'frontend.error')
      expect(span?.attributes['error.type']).toBe('TypeError')
      expect(span?.attributes['error.source']).toBe('test')
      expect(span?.status?.code).toBe(2)
      expect(span?.exceptions).toHaveLength(1)
      expect(span?.ended).toBe(true)
    })

    it('truncates a long exception message rather than forwarding it whole', async () => {
      const mod = await initWith(ENABLED)
      mod.trackError(new Error('x'.repeat(5000)))

      const span = recorded.find(s => s.name === 'frontend.error')
      expect((span?.status?.message as string).length).toBe(500)
    })

    it('handles a non-Error rejection without throwing', async () => {
      const mod = await initWith(ENABLED)
      expect(() => mod.trackError('plain string reason')).not.toThrow()
      const span = recorded.find(s => s.name === 'frontend.error')
      expect(span?.attributes['error.type']).toBe('string')
      expect(span?.exceptions).toHaveLength(0)
    })
  })
})
