import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-web'
import type { AnalyticsConfig } from '@/config/app-config.types'

/**
 * These tests pin the privacy contract, the usage-event semantics, and the
 * things that would silently break telemetry: URL query strings must be
 * stripped unless someone writes a literal `false`, usage events must not be
 * sampled, and the exporters' own endpoints must be excluded from
 * instrumentation or every export causes another export.
 */

interface EmittedRecord {
  eventName?: string
  severityNumber?: number
  attributes: Record<string, unknown>
}

/** What the module handed to the OTel SDK, captured by the mocks below. */
const captured: {
  providerConfig?: Record<string, unknown>
  exporter?: SpanExporter
  spanBatchOptions?: { maxExportBatchSize?: number }
  traceUrl?: string
  logUrl?: string
  logBatchOptions?: { maxExportBatchSize?: number }
  ignoreUrls?: Array<string | RegExp>
  instrumentationCount?: number
  ratio?: number
  /** Per LoggerProvider instance, so listeners left by earlier tests cannot write here. */
  emitted?: EmittedRecord[]
  /** How many records had been emitted when the processor's own flush ran. */
  emittedAtFlush?: number
} = {}

vi.mock('@opentelemetry/sdk-trace-web', () => ({
  WebTracerProvider: class {
    constructor(cfg: Record<string, unknown>) {
      captured.providerConfig = cfg
    }
    register() {}
  },
  BatchSpanProcessor: class {
    constructor(exporter: SpanExporter, options?: { maxExportBatchSize?: number }) {
      captured.exporter = exporter
      captured.spanBatchOptions = options
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
      captured.traceUrl = cfg.url
    }
    export(_spans: ReadableSpan[], cb: (r: unknown) => void) {
      cb({ code: 0 })
    }
    shutdown() {
      return Promise.resolve()
    }
  },
}))

vi.mock('@opentelemetry/sdk-logs', () => ({
  LoggerProvider: class {
    private readonly records: EmittedRecord[] = []
    constructor(_cfg: unknown) {
      captured.emitted = this.records
    }
    getLogger() {
      return { emit: (r: EmittedRecord) => this.records.push(r) }
    }
  },
  BatchLogRecordProcessor: class {
    constructor(options: { maxExportBatchSize?: number }) {
      captured.logBatchOptions = options
      // What the real browser processor does: flush on hide, listening on
      // document, registered before the module's own listeners.
      const records = () => captured.emitted?.length ?? 0
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') captured.emittedAtFlush = records()
      })
    }
  },
}))

vi.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: class {
    constructor(cfg: { url?: string }) {
      captured.logUrl = cfg.url
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

const authState = { user: { login: 'jane.doe@example.org' } as { login: string } | null }
vi.mock('@/stores/auth', async () => {
  const { reactive } = await import('vue')
  const store = reactive(authState)
  return { useAuthStore: () => store }
})

interface FakeRoute {
  name?: string
  path: string
  query?: Record<string, string>
  matched: Array<{ path: string }>
}

function route(path: string, pattern?: string, extra: Partial<FakeRoute> = {}): FakeRoute {
  return { path, matched: pattern ? [{ path: pattern }] : [], ...extra }
}

/** Drives the router the module subscribed to. */
let afterEachHook: ((to: FakeRoute, from: FakeRoute, failure?: unknown) => void) | null = null
const currentRoute: { value: FakeRoute } = { value: route('/home', '/home', { name: 'home' }) }
const routerMock = {
  afterEach: (cb: typeof afterEachHook) => {
    afterEachHook = cb
  },
  isReady: () => Promise.resolve(),
  currentRoute,
} as unknown as import('vue-router').Router

function navigate(to: FakeRoute, failure?: unknown) {
  const from = currentRoute.value
  if (!failure) currentRoute.value = to
  afterEachHook?.(to, from, failure)
}

let visibility: DocumentVisibilityState = 'visible'
Object.defineProperty(document, 'visibilityState', {
  configurable: true,
  get: () => visibility,
})
function setVisibility(state: DocumentVisibilityState) {
  visibility = state
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
}

/** Lets the router.isReady() / identity-hash promises settle. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

async function initWith(analytics: Partial<AnalyticsConfig>) {
  vi.resetModules()
  for (const k of Object.keys(captured)) delete (captured as Record<string, unknown>)[k]
  afterEachHook = null
  currentRoute.value = route('/home', '/home', { name: 'home' })
  visibility = 'visible'
  sessionStorage.clear()

  const { defaultAppConfig } = await import('@/config/app-config.defaults')
  vi.doMock('@/config/app-config.loader', () => ({
    getAppConfig: () => ({
      ...defaultAppConfig,
      analytics: { ...defaultAppConfig.analytics, ...analytics },
    }),
  }))

  const mod = await import('@/services/analytics/telemetry')
  await mod.initTelemetry(routerMock)
  await settle()
  return mod
}

/** Runs a span through whatever exporter chain the module built. */
function exportSpan(attributes: Record<string, unknown>): Record<string, unknown> {
  const span = { attributes } as unknown as ReadableSpan
  captured.exporter?.export([span], () => {})
  return attributes
}

function events(name: string): EmittedRecord[] {
  return (captured.emitted ?? []).filter(r => r.eventName === name)
}

const ENABLED = { provider: 'otlp', endpoint: '/otlp' } as const

describe('analytics/telemetry', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.doUnmock('@/config/app-config.loader')
  })

  describe('activation', () => {
    it('does not load the SDK when the provider is none', async () => {
      await initWith({ provider: 'none', endpoint: '/otlp' })
      expect(captured.providerConfig).toBeUndefined()
      expect(captured.emitted).toBeUndefined()
    })

    it('does not load the SDK without an endpoint', async () => {
      await initWith({ provider: 'otlp', endpoint: '' })
      expect(captured.providerConfig).toBeUndefined()
    })

    it('posts traces to <endpoint>/v1/traces and events to <endpoint>/v1/logs', async () => {
      await initWith(ENABLED)
      expect(captured.traceUrl).toBe('/otlp/v1/traces')
      expect(captured.logUrl).toBe('/otlp/v1/logs')
    })

    it('does not double the slash when the endpoint has a trailing one', async () => {
      await initWith({ ...ENABLED, endpoint: '/otlp/' })
      expect(captured.traceUrl).toBe('/otlp/v1/traces')
      expect(captured.logUrl).toBe('/otlp/v1/logs')
    })

    it('keeps export batches small enough for the 1 MB ingest cap', async () => {
      await initWith(ENABLED)
      expect(captured.spanBatchOptions?.maxExportBatchSize).toBeLessThanOrEqual(128)
      expect(captured.logBatchOptions?.maxExportBatchSize).toBeLessThanOrEqual(128)
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

    it('strips query strings from error messages too', async () => {
      const mod = await initWith(ENABLED)
      mod.trackError(new TypeError('Failed to fetch https://atlas/WebAPI/search?q=diabetes now'))
      expect(events('atlas.error')[0].attributes['exception.message']).toBe(
        'Failed to fetch https://atlas/WebAPI/search now'
      )
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
    it('excludes its own export endpoints, or exports would recurse forever', async () => {
      await initWith(ENABLED)
      expect(captured.ignoreUrls).toEqual(['/otlp/v1/traces', '/otlp/v1/logs'])
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
    it('passes the configured ratio to the trace sampler', async () => {
      await initWith({ ...ENABLED, sampleRatio: 0.25 })
      expect(captured.ratio).toBe(0.25)
    })

    it('falls back to 1 for a non-finite ratio', async () => {
      await initWith({ ...ENABLED, sampleRatio: NaN })
      expect(captured.ratio).toBe(1)
    })

    it('never samples usage events, whatever the trace ratio', async () => {
      const mod = await initWith({ ...ENABLED, sampleRatio: 0 })
      mod.trackAction('cohort.generate')
      expect(events('atlas.action')).toHaveLength(1)
    })
  })

  describe('page views', () => {
    it('records the landing page, whose navigation predates telemetry', async () => {
      await initWith(ENABLED)
      navigate(route('/cohortdefinitions', '/cohortdefinitions'))

      const views = events('atlas.page_view')
      expect(views).toHaveLength(1)
      expect(views[0].attributes['page.name']).toBe('/home')
      expect(views[0].attributes['page.route_name']).toBe('home')
    })

    it('reports dwell time when the view ends', async () => {
      await initWith(ENABLED)
      navigate(route('/next', '/next'))
      expect(typeof events('atlas.page_view')[0].attributes['page.duration_ms']).toBe('number')
    })

    it('does not split a visit on query-only replaces (tabs, drawers, run=)', async () => {
      await initWith(ENABLED)
      navigate(route('/cohortdefinition/7', '/cohortdefinition/:id'))
      navigate(
        route('/cohortdefinition/7', '/cohortdefinition/:id', { query: { tab: 'generation' } })
      )
      navigate(route('/cohortdefinition/7', '/cohortdefinition/:id', { query: { run: '3' } }))
      navigate(route('/home', '/home'))

      const names = events('atlas.page_view').map(v => v.attributes['page.name'])
      expect(names).toEqual(['/home', '/cohortdefinition/:id'])
    })

    it('starts a new view when the path changes under the same pattern', async () => {
      await initWith(ENABLED)
      navigate(route('/cohortdefinition/7', '/cohortdefinition/:id'))
      navigate(route('/cohortdefinition/8', '/cohortdefinition/:id'))
      navigate(route('/home', '/home'))

      expect(events('atlas.page_view')).toHaveLength(3)
    })

    it('ignores navigations that failed', async () => {
      await initWith(ENABLED)
      navigate(route('/blocked', '/blocked'), new Error('aborted'))
      expect(events('atlas.page_view')).toHaveLength(0)
    })

    it('emits the last view on hide, before the processor flushes', async () => {
      await initWith(ENABLED)
      setVisibility('hidden')

      expect(events('atlas.page_view')).toHaveLength(1)
      expect(captured.emittedAtFlush).toBe(1)
    })

    it('starts a new view when the tab is shown again', async () => {
      await initWith(ENABLED)
      setVisibility('hidden')
      setVisibility('visible')
      setVisibility('hidden')

      expect(events('atlas.page_view')).toHaveLength(2)
    })

    it('emits the open view on pagehide', async () => {
      await initWith(ENABLED)
      window.dispatchEvent(new Event('pagehide'))
      expect(events('atlas.page_view')).toHaveLength(1)
    })
  })

  describe('route naming (PHI)', () => {
    it('uses the route pattern, not the resolved path with real ids', async () => {
      await initWith(ENABLED)
      navigate(route('/cohortdefinition/4821', '/cohortdefinition/:id', { name: 'cohort-detail' }))
      setVisibility('hidden')

      const view = events('atlas.page_view')[1]
      expect(view.attributes['page.name']).toBe('/cohortdefinition/:id')
      expect(view.attributes['page.route_name']).toBe('cohort-detail')
    })

    it('falls back to regex-normalising a path no route matched', async () => {
      await initWith(ENABLED)
      navigate(route('/cohortdefinition/4821/report'))
      setVisibility('hidden')

      expect(events('atlas.page_view')[1].attributes['page.name']).toBe(
        '/cohortdefinition/:id/report'
      )
    })

    it('normalises long hex ids in an unmatched path too', async () => {
      await initWith(ENABLED)
      navigate(route('/export/a3f9c1d2e4b50617'))
      setVisibility('hidden')

      expect(events('atlas.page_view')[1].attributes['page.name']).toBe('/export/:id')
    })
  })

  describe('actions and errors', () => {
    it('is a no-op throughout when telemetry is disabled', async () => {
      const mod = await initWith({ provider: 'none', endpoint: '/otlp' })
      expect(() => {
        mod.trackAction('generate_cohort')
        mod.trackError(new Error('boom'))
      }).not.toThrow()
      expect(captured.emitted).toBeUndefined()
    })

    it('records an action as an atlas.action event grouped by action.name', async () => {
      const mod = await initWith(ENABLED)
      mod.trackAction('generate_cohort', { 'criteria.count': 7, 'cohort.id': undefined })

      const [event] = events('atlas.action')
      expect(event.attributes['action.name']).toBe('generate_cohort')
      expect(event.attributes['criteria.count']).toBe(7)
      expect(event.attributes).not.toHaveProperty('cohort.id')
    })

    it('stamps events with the session and the current page', async () => {
      const mod = await initWith(ENABLED)
      navigate(route('/cohortdefinition/1', '/cohortdefinition/:id'))
      mod.trackAction('generate_cohort')
      mod.trackError(new Error('boom'))

      for (const event of [...events('atlas.action'), ...events('atlas.error')]) {
        expect(event.attributes['page.name']).toBe('/cohortdefinition/:id')
        expect(event.attributes['session.id']).toMatch(/^[0-9a-f]{32}$/)
      }
    })

    it('keeps one session id across reloads of the tab', async () => {
      const first = await initWith(ENABLED)
      first.trackAction('a')
      const id = events('atlas.action')[0].attributes['session.id']
      const stored = sessionStorage.getItem('atlas3.telemetry.session')

      expect(stored).toBe(id)
    })

    it('records an error as an ERROR-severity atlas.error event', async () => {
      const mod = await initWith(ENABLED)
      mod.trackError(new TypeError('cannot read x'), { 'error.source': 'test' })

      const [event] = events('atlas.error')
      expect(event.severityNumber).toBe(17)
      expect(event.attributes['exception.type']).toBe('TypeError')
      expect(event.attributes['exception.message']).toBe('cannot read x')
      expect(event.attributes['error.source']).toBe('test')
      expect(typeof event.attributes['exception.stacktrace']).toBe('string')
    })

    it('truncates a long exception message rather than forwarding it whole', async () => {
      const mod = await initWith(ENABLED)
      mod.trackError(new Error('x'.repeat(5000)))
      expect((events('atlas.error')[0].attributes['exception.message'] as string).length).toBe(500)
    })

    it('handles a non-Error rejection without throwing', async () => {
      const mod = await initWith(ENABLED)
      expect(() => mod.trackError('plain string reason')).not.toThrow()
      const [event] = events('atlas.error')
      expect(event.attributes['exception.type']).toBe('string')
      expect(event.attributes).not.toHaveProperty('exception.stacktrace')
    })
  })

  describe('user identity', () => {
    it('sends no user identity by default', async () => {
      const mod = await initWith(ENABLED)
      mod.trackAction('a')
      const { attributes } = events('atlas.action')[0]
      expect(attributes).not.toHaveProperty('enduser.pseudo.id')
      expect(attributes).not.toHaveProperty('enduser.id')
    })

    it('sends only a SHA-256 pseudonym when identifyUsers is true', async () => {
      const mod = await initWith({ ...ENABLED, identifyUsers: true })
      mod.trackAction('a')

      const { attributes } = events('atlas.action')[0]
      expect(attributes['enduser.pseudo.id']).toBe(await mod.pseudonymize('jane.doe@example.org'))
      expect(JSON.stringify(attributes)).not.toContain('jane.doe')
    })

    it.each(['true', 1, 'yes'])('stays off for the non-boolean value %p', async value => {
      const mod = await initWith({ ...ENABLED, identifyUsers: value as unknown as boolean })
      mod.trackAction('a')
      expect(events('atlas.action')[0].attributes).not.toHaveProperty('enduser.pseudo.id')
    })

    it('hashes with SHA-256', async () => {
      const mod = await initWith(ENABLED)
      expect(await mod.pseudonymize('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
      )
    })
  })
})
