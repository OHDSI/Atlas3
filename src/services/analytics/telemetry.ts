/**
 * Browser telemetry via OpenTelemetry, sent to the same gateway as the WebAPI
 * Java agent so nothing leaves the deployment. Two signals, for two questions,
 * following the OTel Browser SIG's split:
 *
 * - **Usage events** (OTLP logs): page views with dwell time, deliberate
 *   actions, frontend errors. Never sampled, and each carries `session.id`,
 *   so counts stay right whatever the trace sampling ratio is.
 * - **Performance traces** (spans): fetch/XHR calls and document load,
 *   head-sampled by `sampleRatio`. Fetches carry W3C `traceparent`, so a
 *   browser request continues into WebAPI and down to the SQL it issued.
 *
 * A trace starts at the request, not at the click. The default
 * StackContextManager does not carry context across `await`, and Atlas's
 * http-client awaits the auth token before every fetch, so an action cannot
 * parent the requests it causes. ZoneContextManager would, but needs
 * async/await transpiled to ES2015. Actions and requests are correlated by
 * `session.id` and time instead.
 *
 * Privacy posture for an OMOP/clinical tool. OTel instrumentation never reads
 * DOM text, so cohort names, condition concepts and filter values cannot leak
 * through element content the way autocapture could — that whole class of leak
 * is gone by construction. What remains is URLs, because Atlas puts free-text
 * concept searches in query strings. So `scrubUrlQueryStrings` is on whenever
 * absent and comes off only for a literal `false` (see `optedOut()`), and it is
 * enforced twice: here before export, and again in the gateway.
 */
import type { Attributes, Context } from '@opentelemetry/api'
import type { AnyValueMap, Logger } from '@opentelemetry/api-logs'
import type { ReadableSpan, Span, SpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-web'
import type { RouteLocationNormalized, Router } from 'vue-router'
import type { AnalyticsConfig } from '@/config/app-config.types'
import { getAppConfig } from '@/config/app-config.loader'
import { logger } from '@/utils/logger'
import { loadBrowserInstrumentations } from './instrumentations'

/** Usage events go here; null while telemetry is off. */
let eventLogger: Logger | null = null
/** Identifies one browser tab's visit; attached to every event and span. */
let sessionId: string | null = null
/** SHA-256 of the login, only when `identifyUsers` is literally `true`. */
let pseudoUserId: string | null = null
/** Bumped on every login change so a slow hash cannot land on the next user. */
let identityGeneration = 0
/** The page the user is on, for correlating actions and errors to a screen. */
let currentPageName: string | null = null
/** Whether URL query strings are stripped; mirrors the config flag. */
let scrubQueries = true

interface OpenView {
  name: string
  path: string
  routeName?: string
  startedAt: number
}
/** The screen being viewed. Its event is emitted when it ends, with dwell. */
let openView: OpenView | null = null

/** Longest exception message / stack trace forwarded; see `trackError`. */
const MAX_EXCEPTION_MESSAGE = 500
const MAX_EXCEPTION_STACK = 4000
/**
 * Records per export request. Keeps each POST well under the 1 MB body cap
 * that Caddy and the gateway put on the public browser path.
 */
const MAX_EXPORT_BATCH = 128
/** `SeverityNumber` values from api-logs, inlined to keep it out of the main bundle. */
const SEVERITY_INFO = 9
const SEVERITY_ERROR = 17
const SESSION_STORAGE_KEY = 'atlas3.telemetry.session'

/**
 * Fail-safe reading of a privacy flag: the protection stays on unless the
 * value is exactly `false`. `undefined`, `null`, `0`, `'false'` and anything
 * else all keep it enabled, so neither an omitted key nor a mistyped one can
 * silently start sending concept searches.
 */
function optedOut(value: unknown): boolean {
  return value === false
}

/** The mirror image, for features that send more: on only for a literal `true`. */
function optedIn(value: unknown): boolean {
  return value === true
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

/**
 * Strips query strings embedded in free text, such as a `Failed to fetch
 * https://host/WebAPI/vocabulary/search?q=diabetes` error message.
 */
function scrubText(value: string): string {
  return scrubQueries ? value.replace(/\?[^\s'"]+/g, '') : value
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

/** Session and (opt-in) pseudonymous user, shared by events and spans. */
function sessionAttributes(): Attributes {
  return {
    ...(sessionId ? { 'session.id': sessionId } : {}),
    ...(pseudoUserId ? { 'enduser.pseudo.id': pseudoUserId } : {}),
  }
}

/** Stamps session and user onto every span, so traces join up with events. */
class SessionEnrichmentProcessor implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    span.setAttributes(sessionAttributes())
  }
  onEnd(_span: ReadableSpan): void {}
  forceFlush(): Promise<void> {
    return Promise.resolve()
  }
  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}

function randomId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * One id per tab, surviving reloads. sessionStorage can be unavailable
 * (privacy modes, blocked storage); a per-load id is the fallback.
 */
function resolveSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
  } catch {
    // fall through to a fresh id
  }
  const id = randomId()
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  } catch {
    // not persisted; still valid for this page load
  }
  return id
}

/**
 * SHA-256 of the login, hex-encoded, for `enduser.pseudo.id`. Pseudonymous,
 * not anonymous: anyone holding the list of logins can recompute it. Returns
 * null where WebCrypto is unavailable (non-secure contexts), so the login is
 * never sent in the clear as a fallback.
 */
export async function pseudonymize(login: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(login))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Starts browser telemetry when configured. Safe to call unconditionally and
 * safe to call twice; never rejects, because telemetry must not be able to
 * break application bootstrap.
 */
export async function initTelemetry(router: Router): Promise<void> {
  if (eventLogger) return

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
  if (config.endpoint.trim() === '') {
    logger.debug('Telemetry', 'No OTLP endpoint configured, telemetry inactive')
    return
  }

  try {
    const [
      { WebTracerProvider, BatchSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler },
      { OTLPTraceExporter },
      { LoggerProvider, BatchLogRecordProcessor },
      { OTLPLogExporter },
      { resourceFromAttributes },
      { registerInstrumentations },
    ] = await Promise.all([
      import('@opentelemetry/sdk-trace-web'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/sdk-logs'),
      import('@opentelemetry/exporter-logs-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/instrumentation'),
    ])

    scrubQueries = !optedOut(config.scrubUrlQueryStrings)
    sessionId = resolveSessionId()
    const base = config.endpoint.replace(/\/$/, '')
    const tracesUrl = `${base}/v1/traces`
    const logsUrl = `${base}/v1/logs`
    const resource = resourceFromAttributes({
      'service.name': 'atlas3-frontend',
      'service.namespace': 'atlas3',
      'browser.language': navigator.language,
    })

    // Performance traces.
    let spanExporter: SpanExporter = new OTLPTraceExporter({ url: tracesUrl })
    if (scrubQueries) spanExporter = new ScrubbingSpanExporter(spanExporter)
    const ratio = Number.isFinite(config.sampleRatio) ? config.sampleRatio : 1
    const tracerProvider = new WebTracerProvider({
      resource,
      sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(ratio) }),
      spanProcessors: [
        new SessionEnrichmentProcessor(),
        new BatchSpanProcessor(spanExporter, { maxExportBatchSize: MAX_EXPORT_BATCH }),
      ],
    })
    // Registers the W3C traceparent propagator, which is what makes fetch calls
    // to /WebAPI continue the browser's trace instead of starting a new one.
    tracerProvider.register()

    const instrumentations = await loadBrowserInstrumentations({
      traceApiCalls: !optedOut(config.traceApiCalls),
      traceDocumentLoad: !optedOut(config.traceDocumentLoad),
      ignoreUrls: [tracesUrl, logsUrl],
    })
    if (instrumentations.length > 0) registerInstrumentations({ instrumentations })

    // Usage events. Not sampled: every page view, action and error counts.
    const loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter({ url: logsUrl }),
          maxExportBatchSize: MAX_EXPORT_BATCH,
        }),
      ],
    })
    eventLogger = loggerProvider.getLogger('atlas3-frontend')

    captureUnhandledErrors()
    if (optedIn(config.identifyUsers)) await bindUserIdentity()
    trackRouteChanges(router)

    logger.info('Telemetry', 'OpenTelemetry browser telemetry initialized', { base })
  } catch (error) {
    logger.warn('Telemetry', 'Telemetry initialization failed, continuing without it', error)
  }
}

/** Drops undefined values, which OTLP has no encoding for. */
function definedOnly(attributes: Attributes): AnyValueMap {
  const out: AnyValueMap = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

function emitEvent(name: string, attributes: Attributes, severityNumber = SEVERITY_INFO): void {
  if (!eventLogger) return
  eventLogger.emit({
    eventName: name,
    // Also the body, so backends that do not surface EventName yet still
    // show what the record is.
    body: name,
    severityNumber,
    severityText: severityNumber >= SEVERITY_ERROR ? 'ERROR' : 'INFO',
    attributes: definedOnly({
      ...sessionAttributes(),
      ...(currentPageName ? { 'page.name': currentPageName } : {}),
      ...attributes,
    }),
  })
}

/**
 * Names a screen by its route *pattern*, never its resolved path, so an event
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
 * Opens a view of `route` unless it is already the open one. Comparing the
 * resolved path means a query-only `router.replace` (tabs, drawers, `run=`)
 * stays in the same view, while moving to another cohort starts a new one.
 */
function startView(route: RouteLocationNormalized): void {
  if (openView?.path === route.path) return
  endView()
  const name = routePattern(route)
  currentPageName = name
  openView = {
    name,
    path: route.path,
    routeName: typeof route.name === 'string' ? route.name : undefined,
    startedAt: performance.now(),
  }
}

/** Emits the open view's `atlas.page_view` event with its dwell time. */
function endView(): void {
  if (!openView) return
  const view = openView
  openView = null
  emitEvent('atlas.page_view', {
    'page.name': view.name,
    'page.route_name': view.routeName,
    'page.duration_ms': Math.round(performance.now() - view.startedAt),
  })
}

function trackRouteChanges(router: Router): void {
  router.afterEach((to, _from, failure) => {
    if (failure) return
    if (document.visibilityState === 'hidden') {
      endView()
      return
    }
    startView(to)
  })

  // The landing page: its navigation finished before this module loaded, so
  // afterEach never saw it.
  void router.isReady().then(() => {
    if (document.visibilityState !== 'hidden') startView(router.currentRoute.value)
  })

  // Dwell is visible time. Hiding the tab ends the view; showing it again
  // starts a new one. Both listeners are capture-phase on window so they run
  // before the batch processors' own visibilitychange/pagehide flush, which
  // listens on document: the view's event is queued in time to go out with
  // that flush instead of being lost with the tab.
  window.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') endView()
      else startView(router.currentRoute.value)
    },
    { capture: true }
  )
  window.addEventListener('pagehide', endView, { capture: true })
}

/**
 * Keeps `enduser.pseudo.id` in step with the Atlas session: set on login,
 * cleared on logout so the next operator on a shared workstation is not
 * attributed to the previous one. Only the hash is sent, never the login.
 */
async function bindUserIdentity(): Promise<void> {
  const [{ watch }, { useAuthStore }] = await Promise.all([import('vue'), import('@/stores/auth')])
  const authStore = useAuthStore()

  watch(
    () => authStore.user?.login ?? null,
    login => {
      pseudoUserId = null
      const generation = ++identityGeneration
      if (!login) return
      void pseudonymize(login).then(id => {
        if (generation === identityGeneration) pseudoUserId = id
      })
    },
    { immediate: true }
  )
}

/**
 * Records a deliberate user action — "cohort generation was triggered",
 * "export ran" — as an `atlas.action` event. Grouping those by `action.name`
 * gives a feature-adoption ranking across everything instrumented.
 *
 * Attribute values must be counts, enums or flags, never user-entered text:
 * `criteria.count: 7` is useful and safe, a cohort name is neither.
 *
 * A no-op when telemetry is disabled, so call sites need no feature check.
 */
export function trackAction(actionName: string, metadata?: Attributes): void {
  emitEvent('atlas.action', { 'action.name': actionName, ...metadata })
}

/**
 * Records a frontend exception as an `atlas.error` event, so friction shows up
 * next to the API errors and slow queries that often caused it.
 *
 * Note on content: `exception.message` is whatever threw, and an API error
 * echoing a user's search term would land here. That is why it is truncated
 * and query-scrubbed here, has values redacted again in the gateway, and is
 * worth a look during a privacy review — it is the one attribute in this
 * module not derived from a route pattern or a count.
 */
export function trackError(error: unknown, metadata?: Attributes): void {
  if (!eventLogger) return
  const message = error instanceof Error ? error.message : String(error)
  emitEvent(
    'atlas.error',
    {
      'exception.type': error instanceof Error ? error.name : typeof error,
      'exception.message': scrubText(message.slice(0, MAX_EXCEPTION_MESSAGE)),
      'exception.stacktrace':
        error instanceof Error && error.stack
          ? scrubText(error.stack.slice(0, MAX_EXCEPTION_STACK))
          : undefined,
      ...metadata,
    },
    SEVERITY_ERROR
  )
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
