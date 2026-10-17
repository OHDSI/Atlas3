# Observability & product analytics

Two independent, opt-in integrations. Neither is active in a default
`docker compose up`.

| Concern | How | Where it attaches | Code touched in the monitored component |
|---|---|---|---|
| Frontend usage / UX and performance | OTel browser SDK | `config-local.json` → `src/services/analytics/telemetry.ts` | 1 line in `src/main.ts` |
| APM, logs, JVM metrics | OTel Java agent | `JAVA_TOOL_OPTIONS` in the compose overlay | none |

Both emit OpenTelemetry into one gateway collector, which forwards to
**whatever OTLP backend the deployment runs**. Atlas only speaks standard OTLP
and `OTEL_*` settings; it does not depend on a particular vendor. The overlay
ships [Grafana LGTM](https://github.com/grafana/docker-otel-lgtm) as a
lightweight development backend, and the same setup feeds SigNoz, Jaeger, an
existing company collector, or a SaaS vendor (see [Backends](#backends)).

Nothing leaves the deployment unless you point the gateway somewhere that
does. There is no third-party analytics SDK.

WebAPI is untouched: no Java source, no `logback.xml`, no
`application.properties`. The agent instruments Spring Boot, Logback, HikariCP
and the JDBC driver by bytecode injection at JVM startup.

## Quick start (development, Grafana LGTM)

```bash
docker compose -f docker-compose.yml \
               -f docker-compose.observability.yml --profile lgtm up -d --build
```

Atlas stays on `http://localhost`. Grafana is on
**<http://localhost:3000>** (loopback only, override with `OTEL_LGTM_UI_PORT`);
Explore → Tempo for traces, Loki for logs and usage events, Prometheus for
metrics. LGTM keeps data in memory and is for development only.

To go back to a clean core environment, drop the second `-f`. The WebAPI image
still contains the agent jar, but without `JAVA_TOOL_OPTIONS` it is never
loaded, and the frontend serves its baked `config-local.json` unchanged.

## Backends

The gateway exports OTLP/gRPC to `OTEL_GATEWAY_EXPORT_ENDPOINT`
(default `atlas3-lgtm:4317`, the dev profile):

```bash
OTEL_GATEWAY_EXPORT_ENDPOINT=otel-collector.example.org:4317 \
OTEL_GATEWAY_EXPORT_INSECURE=false \
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

| Variable | Default | Meaning |
|---|---|---|
| `OTEL_GATEWAY_EXPORT_ENDPOINT` | `atlas3-lgtm:4317` | Any OTLP/gRPC receiver |
| `OTEL_GATEWAY_EXPORT_INSECURE` | `true` | `false` to require TLS |
| `OTEL_COLLECTOR_VERSION` | `0.162.0` | Gateway image tag |
| `OTEL_TRACES_SAMPLE_RATIO` | `1.0` | WebAPI trace sampling |
| `OTEL_BROWSER_SAMPLE_RATIO` | `1` | Browser trace sampling (usage events are never sampled) |
| `OTEL_ENVIRONMENT` | `local` | `deployment.environment.name` |

For a backend that needs auth headers or accepts OTLP/HTTP only, edit the
exporter in `observability/otel-gateway/config.yaml` (an `otlp_http`
exporter and/or `headers:`). If the backend runs as a separate compose
project, attach `atlas3-otel-gateway` to its network with your own override
file, or reach it by host address.

**SigNoz** is one option among these: install it as SigNoz documents (since
v0.130.0 that is its Foundry CLI rather than a Compose file), then point
`OTEL_GATEWAY_EXPORT_ENDPOINT` at its collector's 4317. Note SigNoz publishes
its UI on 8080 by default, which Atlas's WebAPI already uses.

## What the browser sends

Two signals, for two questions, following the OTel Browser SIG's split:

| Signal | Content | Sampled? | Path |
|---|---|---|---|
| **Usage events** (OTLP logs) | `atlas.page_view`, `atlas.action`, `atlas.error` | never | `/otlp/v1/logs` |
| **Performance traces** (spans) | fetch/XHR calls, document load | `sampleRatio` | `/otlp/v1/traces` |

Every event and span carries `session.id` (one per browser tab, kept across
reloads) so a session's events and its requests can be lined up.

### Usage events

| Event | Attributes | Emitted |
|---|---|---|
| `atlas.page_view` | `page.name` (route pattern), `page.route_name`, `page.duration_ms` | when the view ends: navigation to another path, tab hidden, page closed |
| `atlas.action` | `action.name` + the call site's counts/ids/enums | `trackAction()` |
| `atlas.error` | `exception.type`, `exception.message` (≤500 chars), `exception.stacktrace`, `error.source` | uncaught errors and unhandled rejections |

`page.duration_ms` is visible dwell time: hiding the tab ends the view,
showing it again starts a new one. A view is keyed on the resolved path, so a
query-only `router.replace` (tabs, drawers, `run=`) stays within one view,
while moving from one cohort to another starts a new one. The landing page is
recorded even though its navigation completes before telemetry loads. On tab
close the event is queued before the SDK's own flush on `visibilitychange`, so
the last screen is not lost.

Events are the event name in the record body as well as in `EventName`, so
backends that do not surface `EventName` yet still show what each record is.

### Performance traces and what they connect

Fetches carry W3C `traceparent`, so a browser request continues into WebAPI
and down to the SQL it issued: one trace runs browser `GET` →
`GET /WebAPI/...` → repository → `SELECT ...`.

**A trace starts at the request, not at the click.** The default
`StackContextManager` does not carry context across `await`, and Atlas's
`http-client.ts` awaits the auth token before every fetch, so an action cannot
be the parent of the requests it causes. `ZoneContextManager` would carry it,
but requires async/await to be transpiled to ES2015, which Atlas does not do.
Correlate an action with its requests by `session.id` and time instead.

## Privacy model

Browser telemetry is OpenTelemetry, not a product-analytics SDK, and that
removes the largest leak vector by construction: **OTel instrumentation never
reads DOM text**, so cohort names, condition concepts and filter values cannot
escape through element content the way click-autocapture could.

What remains is URLs, because Atlas puts free-text concept searches and filters
in query strings — including inside the hash, since it is a hash-routed SPA.
`scrubUrlQueryStrings` handles that, and it is on whenever unconfigured and off
only for a literal `false`, enforced in four places:

1. **Defaults** — `src/config/app-config.defaults.ts` sets it `true`. A
   `config-local.json` with no `analytics` block, or one setting only
   `endpoint`, inherits it (the loader merges the block rather than replacing).
2. **Validation** — `z.boolean()` in `app-config.schema.ts`. A non-boolean
   fails the whole config and the loader falls back to the full defaults, so
   `"scrubUrlQueryStrings": "no"` ends up scrubbing, not leaking.
3. **Browser, before export** — `ScrubbingSpanExporter` in
   `src/services/analytics/telemetry.ts` wraps the span exporter, so the scrub
   covers every span whatever instrumentation produced it, and error messages
   are scrubbed before they become events. `optedOut()` returns `true` only for
   `=== false`.
4. **Gateway** — `transform/scrub` strips the same attributes server-side, so a
   stale browser build or a future SDK change cannot widen what is stored.

| Flag | Default | Effect |
|---|---|---|
| `scrubUrlQueryStrings` | on | Query strings removed from `url.full` / `http.url` and error messages; `url.query` and `http.target` dropped entirely |
| `traceApiCalls` | on | fetch/XHR spans with `traceparent` propagation |
| `traceDocumentLoad` | on | Page load timing |
| `identifyUsers` | **off** | When literally `true`, adds `enduser.pseudo.id` = SHA-256 of the login. The login itself is never sent |
| `sampleRatio` | 1 | Head sampling for performance traces only |

`identifyUsers` is opt-in because logins are often email addresses. The hash is
pseudonymous, not anonymous — anyone with the list of logins can recompute
it — so enable it only where per-operator analysis is agreed. It needs a
secure context (HTTPS or localhost) for WebCrypto; elsewhere nothing is sent.

Server side:

- The JDBC query sanitizer is pinned on
  (`OTEL_INSTRUMENTATION_COMMON_DB_QUERY_SANITIZATION_ENABLED`): OMOP SQL
  carries concept ids and date ranges as inline literals, and the sanitizer
  reduces span text to query shape.
  `OTEL_INSTRUMENTATION_JDBC_EXPERIMENTAL_CAPTURE_QUERY_PARAMETERS` is pinned
  `false`, and the gateway deletes `db.query.parameter.*` regardless.
- **Exception messages bypass the statement sanitizer**, and databases echo
  values into them (Postgres `Key (person_id)=(123) already exists`,
  `Failing row contains (...)`, `invalid input syntax ...: "abc"`, quoted SQL
  literals). `transform/redact_exceptions` in the gateway replaces those values
  with `?` in exception events, span status messages, log exception attributes
  and log bodies, keeping column names and error shape.

### The public ingest path

The browser has to be able to post, so `/otlp` is writable by anyone who can
reach Atlas. It is kept as narrow as the SDK needs:

- Caddy forwards only `POST /otlp/v1/traces` and `POST /otlp/v1/logs`, with a
  1 MB body cap; everything else under `/otlp` is a 404. There is no browser
  metrics path.
- The browser lands on its own gateway receiver (port 4319, not published),
  separate from the one WebAPI's agent uses.
- The gateway overwrites `service.name` to `atlas3-frontend` on everything that
  arrives that way, so a sender cannot pose as `atlas3-webapi`.

Put a rate limit in front of it if Atlas is internet-facing.

### Verified behaviour

Measured with the LGTM profile (agent 2.32.0, collector 0.162.0), driving Atlas
in headless Chromium and reading Loki and Tempo directly:

| Sent | Result |
|---|---|
| Land on `#/?query=<marker>`, log in, visit `/cohorts`, replace `?tab=a` → `?tab=b`, open concept search with a typed term, close the tab | `atlas.page_view` for `/` (landing), one for `/cohorts` (3.5 s, not split by the query replaces), one for `/concepts` emitted on tab close; every event carries `session.id` |
| Search markers in the URL, the search box and an error message's query string | **0 occurrences** in Loki or Tempo; error message reads `boom https://localhost/WebAPI/x` |
| Concept search that fails in WebAPI (HTTP 500) | One trace: browser `POST` (`session.id`, status ERROR) → `POST /WebAPI/vocabulary/{sourceKey}/search` → repositories → `SELECT ...` with literals as `?` |
| The login (`admin`) with `identifyUsers` at its default | **0 occurrences** |
| WebAPI logs | WARN/ERROR only (INFO dropped); healthcheck spans dropped |
| WebAPI metrics | `jvm.*`, `db.client.connections.*` (HikariCP), `http.server.request.duration` |
| Through Caddy: `POST /otlp/v1/metrics`, `GET /otlp/v1/traces`, 1.1 MB body | 404, 404, 413 |
| Through Caddy: a log claiming `service.name=atlas3-webapi` with `Key (person_id)=(98765)` | Stored as `atlas3-frontend`, body `Key (person_id)=(?)` |

## Adding actions

```ts
import { trackAction } from '@/services/analytics/telemetry'

trackAction('cohort.generate', {
  'cohort.id': cohortId,
  'source.id': sourceId,
  'cohort.critical_count': criticalCount,
})
```

Page views and error capture are automatic; `trackAction` is the one you add by
hand. **Attribute values must be counts, enums, ids or flags — never
user-entered text.** A cohort name, a concept name or a search term in an
attribute defeats the whole scrubbing design, which only covers URLs.
`src/stores/concept-search.ts` records `search.term_length` and
`search.result_count` and deliberately not `term`.

Screens are named by route *pattern*, never resolved path: Vue Router already
hands us `/cohortdefinition/:id`, which is strictly better than regex-replacing
digits. The regex fallback only applies to paths no route matched.

| Action | Call site |
|---|---|
| `cohort.generate` / `cohort.generate_all` | `src/components/cohort/CohortGenerationSection.vue` |
| `concept.search` | `src/stores/concept-search.ts` (the one point all three search entries funnel through, and the only place the result count is known) |
| `cohort.export` | `src/components/cohort/CohortBuilder.vue` |

The instrumentation that produces performance spans lives in
`src/services/analytics/instrumentations.ts`, apart from the events and the
scrubbing. `instrumentation-fetch` / `-xml-http-request` are soft-deprecated in
favour of the Browser SIG packages; moving to those should only touch that
file.

## Querying in Grafana LGTM

Starting points for the dev profile. OTLP attributes appear in Loki as
structured metadata with dots turned into underscores.

**Feature adoption** (Loki):

```logql
sum by (action_name) (count_over_time({service_name="atlas3-frontend"} |= "atlas.action" [24h]))
```

**Page views and dwell** (Loki):

```logql
sum by (page_name) (count_over_time({service_name="atlas3-frontend"} |= "atlas.page_view" [24h]))
avg by (page_name) (avg_over_time({service_name="atlas3-frontend"} |= "atlas.page_view" | unwrap page_duration_ms [24h]))
```

**Friction** (Loki):

```logql
{service_name="atlas3-frontend"} |= "atlas.error"
```

**One session** (Loki, then Tempo by the same attribute):

```logql
{service_name="atlas3-frontend"} | session_id="<id>"
```

```traceql
{ span.session.id = "<id>" }
```

**Slow requests end to end** (Tempo):

```traceql
{ resource.service.name = "atlas3-webapi" && duration > 2s }
```

## Why a gateway collector

`atlas3-otel-gateway` does jobs that cannot be done in WebAPI without editing
it, or should not be trusted to the browser:

- **Severity filtering.** The Java agent has no level threshold, so "WARN and
  ERROR only" for WebAPI logs happens here, leaving WebAPI's console logging
  intact for `docker logs`. Browser usage events have their own pipeline and
  are not filtered.
- **A second scrub pass** and **exception value redaction**, independent of
  the agent's and the browser's own configuration.
- **Containing the public browser path** (separate receiver, forced
  `service.name`, no metrics).
- **One place to choose the backend.**

## Known limitations

- **Cohort generation joins the request's trace.** Generation runs on
  WebAPI's `batchTaskExecutor`, and the agent carries the submitting request's
  context into that pool, so generation SQL appears in the HTTP request's trace,
  which can then last hours. The agent's Spring Batch instrumentation does not
  support Batch 5
  ([opentelemetry-java-instrumentation#7306](https://github.com/open-telemetry/opentelemetry-java-instrumentation/issues/7306)).
  The fix is a small WebAPI change — a new root span per job, linked to the
  request — planned for WebAPI 3.1
  ([OHDSI/WebAPI#2557](https://github.com/OHDSI/WebAPI/pull/2557)). It will
  also make tail sampling in the gateway practical (keep errors and slow
  traces).
- `JAVA_TOOL_OPTIONS` applies to every JVM in the WebAPI container. A plugin
  that forks its own `java` process (trexsql ships a `Main-Class`) is
  instrumented too, under the same service name.
- `docker/webapi/Dockerfile` pins the agent version via build arg and verifies
  the jar's `Premain-Class`. Pass `OTEL_AGENT_SHA256` to also pin the digest.
- **Editing `observability/otel-gateway/config.yaml` needs the container
  recreated**, not just `up -d`: Compose does not notice content changes behind
  a bind mount. Use
  `docker compose ... up -d --force-recreate atlas3-otel-gateway`.
- **The frontend entrypoint never rewrites a config you mount.** It adds the
  `analytics` block only to the image's own `config-local.json`, and only when
  `ANALYTICS_PROVIDER` is set and the values are valid (`OTEL_SAMPLE_RATIO` a
  number in [0, 1], `OTLP_ENDPOINT` a path or http(s) URL); otherwise it logs
  why and leaves the file alone. With your own `config-local.json`, set
  `analytics` in it directly (see `public/config-local.example.json`).
- The OTel browser SDK is a lazy chunk: with `provider: "none"` it is never
  requested, and the main bundle contains no SDK code.
