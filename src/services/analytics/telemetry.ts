/**
 * Browser telemetry via OpenTelemetry.
 *
 * Spans go to the same `atlas3-otel-gateway` the WebAPI Java agent uses, so
 * frontend and backend telemetry land in one SigNoz instance and nothing
 * leaves the deployment.
 *
 * The practical win over a product-analytics SDK: fetch calls are traced with
 * W3C `traceparent` propagation, so one trace in SigNoz runs from the click in
 * the browser through the WebAPI request down to the SQL it issued.
 *
 * Privacy posture for an OMOP/clinical tool. OTel instrumentation never reads
 * DOM text, so cohort names, condition concepts and filter values cannot leak
 * through element content the way autocapture could — that whole class of leak
 * is gone by construction. What remains is URLs, because Atlas puts free-text
 * concept searches in query strings. So `scrubUrlQueryStrings` is on whenever
 * absent and comes off only for a literal `false` (see `optedOut()`), and it is
 * enforced twice: here before export, and again in the gateway.
 */
import type { Attributes, Context, Span as ApiSpan } from '@opentelemetry/api'
import type { ReadableSpan, Span, SpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-web'
import type { RouteLocationNormalized, Router } from 'vue-router'
import type { AnalyticsConfig } from '@/config/app-config.types'
import { getAppConfig } from '@/config/app-config.loader'
import { logger } from '@/utils/logger'

type Tracer = import('@opentelemetry/api').Tracer
type OtelApi = typeof import('@opentelemetry/api')

let tracer: Tracer | null = null
/**
 * The `@opentelemetry/api` namespace, kept from the dynamic import so the
 * synchronous track* helpers can reach `SpanStatusCode` / `ROOT_CONTEXT`
 * without a static import pulling the package into the main bundle.
 */
let otel: OtelApi | null = null
/** Read by the enrichment processor; updated as the Atlas session changes. */
let currentUserId: string | null = null
/** The page the user is on, for correlating actions and errors to a screen. */
let currentPageName: string | null = null
/** Open `page_view` span. Its duration is the dwell time on that screen. */
let openPageView: ApiSpan | null = null

/** Longest exception message forwarded; see the note in `trackError`. */
const MAX_EXCEPTION_MESSAGE = 500

/**
 * Fail-safe reading of a privacy flag: the protection stays on unless the
 * value is exactly `false`. `undefined`, `null`, `0`, `'false'` and anything
 * else all keep it enabled, so neither an omitted key nor a mistyped one can
 * silently start sending concept searches.
 */
function optedOut(value: unknown): boolean {
  return value === false
}

/** Span attributes that carry a URL and therefore need query-string scrubbing. */
const URL_ATTRIBUTES = ['url.full', 'http.url', 'url.query', 'http.target'] as const

/**
 * Drops query strings while keeping the route, from both the real query string
 * and the one inside the hash. Atlas is hash-routed, so a URL looks like
 * `https://host/atlas/#/search?query=diabetes` — the path identifies the screen
 * (worth keeping) and the query identifies what was looked up (not).
 */
export function scrubUrl(value: string): string | undefined {
  if (value === '') return undefined
  try {
    const url = new URL(value, window.location.origin)
    url.search = ''
    const queryStart = url.hash.indexOf('?')
    if (queryStart !== -1) url.hash = url.hash.slice(0, queryStart)
    return url.toString()
  } catch {
    // Unparseable: drop it rather than forward something we cannot inspect.
    return undefined
  }
}

function scrubAttributes(attributes: Attributes): void {
  for (const key of URL_ATTRIBUTES) {
    const value = attributes[key]
    if (typeof value !== 'string') continue
    if (key === 'url.query' || key === 'http.target') {
      // Nothing in these is worth keeping once the query is removed.
      delete attributes[key]
      continue
    }
    const cleaned = scrubUrl(value)
    if (cleaned === undefined) delete attributes[key]
    else attributes[key] = cleaned
  }
}

/**
 * Wraps the OTLP exporter and strips URL query strings on the way out. Done at
 * the exporter rather than per-instrumentation so it covers every span,
 * whatever produced it — including instrumentations added later.
 */
class ScrubbingSpanExporter implements SpanExporter {
  constructor(private readonly inner: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter['export']>[1]): void {
    for (const span of spans) scrubAttributes(span.attributes)
    this.inner.export(spans, resultCallback)
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown()
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve()
  }
}

/** Stamps the Atlas login onto every span, so SigNoz can group by operator. */
class UserEnrichmentProcessor implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    if (currentUserId) span.setAttribute('enduser.id', currentUserId)
  }
  onEnd(_span: ReadableSpan): void {}
  forceFlush(): Promise<void> {
    return Promise.resolve()
  }
  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}

/**
 * Starts browser telemetry when configured. Safe to call unconditionally and
 * safe to call twice; never rejects, because telemetry must not be able to
 * break application bootstrap.
 */
export async function initTelemetry(router: Router): Promise<void> {
  if (tracer) return

  let config: AnalyticsConfig
  try {
    config = getAppConfig().analytics
  } catch (error) {
    logger.warn('Telemetry', 'App config not loaded yet, skipping telemetry init', error)
    return
  }

  if (config.provider !== 'otlp') {
    logger.debug('Telemetry', 'Browser telemetry disabled by configuration')
    return
  }
  // An unrendered `${...}` reaches here when the container entrypoint did not
  // substitute it, or when `npm run dev` runs against the production template.
  if (config.endpoint === '' || config.endpoint.includes('${')) {
    logger.debug('Telemetry', 'No OTLP endpoint configured, telemetry inactive')
    return
  }

  try {
    const [
      { WebTracerProvider, BatchSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler },
      { OTLPTraceExporter },
      { resourceFromAttributes },
      { registerInstrumentations },
      api,
    ] = await Promise.all([
      import('@opentelemetry/sdk-trace-web'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/instrumentation'),
      import('@opentelemetry/api'),
    ])
    otel = api

    const tracesUrl = `${config.endpoint.replace(/\/$/, '')}/v1/traces`

    let exporter: SpanExporter = new OTLPTraceExporter({ url: tracesUrl })
    if (!optedOut(config.scrubUrlQueryStrings)) {
      exporter = new ScrubbingSpanExporter(exporter)
    }

    const ratio = Number.isFinite(config.sampleRatio) ? config.sampleRatio : 1
    const provider = new WebTracerProvider({
      resource: resourceFromAttributes({
        'service.name': 'atlas3-frontend',
        'service.namespace': 'atlas3',
        'browser.language': navigator.language,
      }),
      sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(ratio) }),
      spanProcessors: [new UserEnrichmentProcessor(), new BatchSpanProcessor(exporter)],
    })
    // Registers the W3C traceparent propagator, which is what makes fetch calls
    // to /WebAPI continue the browser's trace instead of starting a new one.
    provider.register()

    await registerBrowserInstrumentations(config, tracesUrl, registerInstrumentations)

    tracer = provider.getTracer('atlas3-frontend')

    trackRouteChanges(router)
    captureUnhandledErrors()
    if (!optedOut(config.identifyUsers)) await bindUserIdentity()

    logger.info('Telemetry', 'OpenTelemetry browser tracing initialized', { url: tracesUrl })
  } catch (error) {
    logger.warn('Telemetry', 'Telemetry initialization failed, continuing without it', error)
  }
}

async function registerBrowserInstrumentations(
  config: AnalyticsConfig,
  tracesUrl: string,
  registerInstrumentations: typeof import('@opentelemetry/instrumentation').registerInstrumentations
): Promise<void> {
  const instrumentations = []

  if (!optedOut(config.traceApiCalls)) {
    const [{ FetchInstrumentation }, { XMLHttpRequestInstrumentation }] = await Promise.all([
      import('@opentelemetry/instrumentation-fetch'),
      import('@opentelemetry/instrumentation-xml-http-request'),
    ])
    // Ignoring the exporter's own endpoint is not optional: without it every
    // export POST creates a span, which creates another export, forever.
    const ignoreUrls = [tracesUrl]
    instrumentations.push(
      new FetchInstrumentation({ ignoreUrls }),
      new XMLHttpRequestInstrumentation({ ignoreUrls })
    )
  }

  if (!optedOut(config.traceDocumentLoad)) {
    const { DocumentLoadInstrumentation } = await import(
      '@opentelemetry/instrumentation-document-load'
    )
    instrumentations.push(new DocumentLoadInstrumentation())
  }

  if (instrumentations.length > 0) registerInstrumentations({ instrumentations })
}

/**
 * Names a screen by its route *pattern*, never its resolved path, so a span
 * reads `/cohortdefinition/:id` rather than embedding the id a user opened.
 *
 * Vue Router already hands us the pattern in `matched`, which is better than
 * regex-normalising the path: it is the real definition, so it cannot mangle a
 * legitimately numeric path segment or miss a non-numeric id. The regex is only
 * a fallback for a path no route matched (404s, bad deeplinks), where there is
 * no pattern to borrow.
 */
function routePattern(to: RouteLocationNormalized): string {
  const matched = to.matched[to.matched.length - 1]
  if (matched?.path) return matched.path
  return to.path.replace(/\/\d+/g, '/:id').replace(/\/[0-9a-f-]{16,}/gi, '/:id')
}

/**
 * Opens a `page_view` span per screen and closes it on the way out, so the
 * span's duration is the dwell time. Deliberately a root span: if it were the
 * parent of everything that happens on the page, every request for the whole
 * visit would collapse into one enormous trace and the browser-to-SQL traces
 * would stop being readable.
 */
export function trackPageView(pageName: string, attributes?: Attributes): void {
  endPageView()
  currentPageName = pageName
  if (!tracer || !otel) return
  openPageView = tracer.startSpan(
    'page_view',
    { attributes: { 'page.name': pageName, ...attributes } },
    otel.ROOT_CONTEXT
  )
}

/** Closes the open page_view span, which is what records the dwell time. */
export function endPageView(): void {
  openPageView?.end()
  openPageView = null
}

function trackRouteChanges(router: Router): void {
  router.afterEach(to => {
    trackPageView(routePattern(to), {
      'page.route_name': typeof to.name === 'string' ? to.name : undefined,
    })
  })

  // Without this the last screen of a session is never recorded: its span is
  // still open when the tab goes away, and the batch processor can only flush
  // spans that have ended. `pagehide` fires where `beforeunload` is unreliable
  // (mobile, tab discard).
  window.addEventListener('pagehide', endPageView)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') endPageView()
  })
}

/**
 * Keeps `enduser.id` in step with the Atlas session: set on login, cleared on
 * logout so the next operator on a shared workstation is not attributed to the
 * previous one.
 */
async function bindUserIdentity(): Promise<void> {
  const [{ watch }, { useAuthStore }] = await Promise.all([import('vue'), import('@/stores/auth')])
  const authStore = useAuthStore()

  watch(
    () => authStore.user?.login ?? null,
    login => {
      // Login only. Display name and email are deliberately not sent.
      currentUserId = login
    },
    { immediate: true }
  )
}

/**
 * Records a product event as a zero-duration span, queryable in SigNoz by
 * name. The low-level helper behind `trackAction`; prefer that one so events
 * share a name prefix and are easy to group.
 *
 * A no-op when telemetry is disabled, so call sites need no feature check.
 */
export function trackEvent(name: string, attributes?: Attributes): void {
  if (!tracer) return
  const span = tracer.startSpan(name, {
    attributes: { ...(currentPageName ? { 'page.name': currentPageName } : {}), ...attributes },
  })
  span.end()
}

/**
 * Records a deliberate user action — "cohort generation was triggered",
 * "export ran". Spans are named `action:<name>` so one SigNoz query
 * (`name LIKE 'action:%'`, grouped by `action.name`) gives a feature-adoption
 * ranking across everything instrumented.
 *
 * Attribute values must be counts, enums or flags, never user-entered text:
 * `criteria.count: 7` is useful and safe, a cohort name is neither.
 */
export function trackAction(actionName: string, metadata?: Attributes): void {
  trackEvent(`action:${actionName}`, { 'action.name': actionName, ...metadata })
}

/**
 * Records a frontend exception as a failed span, so friction shows up next to
 * the API errors and slow queries that often caused it.
 *
 * Note on content: `exception.message` is whatever threw, and an API error
 * echoing a user's search term would land here. That is why the message is
 * truncated and why this is worth a look during a privacy review — it is the
 * one attribute in this module not derived from a route pattern or a count.
 * It stays inside the deployment either way; nothing is sent off-site.
 */
export function trackError(error: unknown, metadata?: Attributes): void {
  if (!tracer || !otel) return
  const message = error instanceof Error ? error.message : String(error)
  const span = tracer.startSpan(
    'frontend.error',
    {
      attributes: {
        ...(currentPageName ? { 'page.name': currentPageName } : {}),
        'error.type': error instanceof Error ? error.name : typeof error,
        ...metadata,
      },
    },
    otel.ROOT_CONTEXT
  )
  if (error instanceof Error) {
    span.recordException({
      name: error.name,
      message: message.slice(0, MAX_EXCEPTION_MESSAGE),
      stack: error.stack,
    })
  }
  span.setStatus({
    code: otel.SpanStatusCode.ERROR,
    message: message.slice(0, MAX_EXCEPTION_MESSAGE),
  })
  span.end()
}

/**
 * Forwards uncaught errors and unhandled rejections. Added as listeners rather
 * than by assigning `window.onerror`, so Atlas's existing handlers in main.ts
 * keep running and keep logging to the console.
 */
function captureUnhandledErrors(): void {
  window.addEventListener('error', event => {
    // Resource load failures (img/script 404) also fire `error` on window but
    // carry no `error` object; they are already visible as fetch spans.
    if (event.error) trackError(event.error, { 'error.source': 'window.onerror' })
  })
  window.addEventListener('unhandledrejection', event => {
    trackError(event.reason, { 'error.source': 'unhandledrejection' })
  })
}
