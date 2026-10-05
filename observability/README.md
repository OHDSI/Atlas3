# Observability & product analytics

Two independent, opt-in integrations. Neither is active in a default
`docker compose up`.

| Concern | How | Where it attaches | Code touched in the monitored component |
|---|---|---|---|
| Frontend usage / UX | OTel browser SDK → SigNoz | `config-local.json` → `src/services/analytics/telemetry.ts` | 1 line in `src/main.ts` |
| APM, logs, JVM metrics | OTel Java agent → SigNoz | `JAVA_TOOL_OPTIONS` in the compose overlay | none |

Both halves emit OpenTelemetry into the same collector, so **one trace runs
from the click in the browser through the WebAPI request down to the SQL it
issued**, and nothing leaves the deployment. There is no third-party analytics
SDK and no external egress.

WebAPI is genuinely untouched: no Java source, no `logback.xml`, no
`application.properties`. The agent instruments Spring Boot, Logback, HikariCP
and the JDBC driver by bytecode injection at JVM startup.

## Quick start

```bash
docker network create atlas3-observability

# 1. SigNoz backend (separate compose project, separate lifecycle)
./observability/signoz/fetch.sh
cd observability/signoz/upstream/docker
docker compose -f docker-compose.yaml -f ../../docker-compose.override.yml up -d
cd -

# 2. Complete SigNoz first-run setup — REQUIRED, see below
open http://localhost:3301

# 3. Atlas + telemetry
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d --build
```

Atlas stays on `http://localhost`. SigNoz's UI is remapped to **3301**: upstream
publishes it on 8080, which Atlas's WebAPI already uses. Override with
`SIGNOZ_UI_PORT`.

To go back to a clean core environment, drop the second `-f`. The WebAPI image
still contains the agent jar, but without `JAVA_TOOL_OPTIONS` it is never
loaded.

### First-run setup is not optional

**SigNoz's collector does not open its OTLP ports until you have created the
admin account in the UI.** Until then port 4317 refuses connections, the Java
agent's exports fail, and the only symptom is retry warnings in
`atlas3-otel-gateway`'s log — SigNoz's own containers all report healthy, and
its collector even logs "Everything is ready". Visit the UI and register before
concluding anything is misconfigured.

Telemetry sent during that window is not necessarily lost: the gateway's
`sending_queue` buffers it and the retry succeeds once the port opens.

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
   `src/services/analytics/telemetry.ts` wraps the OTLP exporter, so the scrub
   covers every span whatever instrumentation produced it. `optedOut()` returns
   `true` only for `=== false`.
4. **Gateway** — `transform/scrub` strips the same attributes server-side, so a
   stale browser build or a future SDK change cannot widen what is stored.

`tests/unit/services/analytics/telemetry.spec.ts` pins 1-3.

| Flag | Default | Effect |
|---|---|---|
| `scrubUrlQueryStrings` | on | Query strings removed from `url.full` / `http.url`; `url.query` and `http.target` dropped entirely. Route paths are kept, which is what makes spans useful |
| `traceApiCalls` | on | fetch/XHR spans with `traceparent` propagation — the browser-to-SQL trace |
| `traceDocumentLoad` | on | Page load timing |
| `identifyUsers` | on | Sends the Atlas login as `enduser.id` — never display name or email |
| `sampleRatio` | 1 | Head sampling; lower it on a busy deployment |

Server side, the equivalent control is the JDBC statement sanitizer, pinned
`true` in the overlay: OMOP SQL carries concept ids and date ranges as inline
literals, and the sanitizer is what reduces span text to query shape.
`OTEL_INSTRUMENTATION_JDBC_EXPERIMENTAL_CAPTURE_QUERY_PARAMETERS` is pinned
`false` for the same reason.

### Verified behaviour

Measured by driving Atlas in a real headless Chromium and reading SigNoz's
ClickHouse directly:

| Sent | Result in SigNoz |
|---|---|
| Browser load of `#/conceptsets?query=<marker>` | `documentLoad`, `documentFetch`, 34 `resourceFetch` spans; marker **0 occurrences** |
| A real search term typed into the concept search box | **0 occurrences** in `signoz_traces` and `signoz_logs` |
| Visiting 4 screens with different dwell times | `page_view` per screen with distinct durations (`/cohorts` 2 views, avg 3.81s); no real id in any `page.name` |
| An unhandled promise rejection | `frontend.error` span, status ERROR, correlated to `page.name` — it also caught Atlas's real plugin-loader `SyntaxError`s unprompted |
| Browser fetch to `/WebAPI/source/sources` | one trace, 10 spans, both services — browser `GET` → `GET /WebAPI/source/sources` → `SourceRepository.findAll` → `SELECT webapi.source` |
| Span with `url.query` / `http.target` / querystring in `http.url` | kept; all three scrubbed, route path and sanitized `db.statement` retained |
| Span on `/WebAPI/info` (healthcheck) | dropped |
| Log at DEBUG / INFO | dropped |
| Log at WARN / ERROR / unspecified | kept (4 ERROR / 2 WARN from real traffic, 3 carrying `trace_id`) |
| WebAPI JVM + HikariCP metrics | 53 metric families, 16 of them `jvm.*` |

## UX measurement

Three questions, three span shapes. All of it goes through the same pipeline as
the WebAPI telemetry, so friction and its cause sit side by side.

| UX question | Span | Produced by |
|---|---|---|
| Which screens get used, and for how long | `page_view`, duration = dwell time | automatic, via `router.afterEach` |
| Which features get used | `action:<name>` | explicit `trackAction()` calls |
| Where users get stuck | `frontend.error` (failed span) + fetch spans with 4xx/5xx | automatic for uncaught errors and API calls |

### The helpers

```ts
import { trackAction } from '@/services/analytics/telemetry'

trackAction('cohort.generate', {
  'cohort.id': cohortId,
  'source.id': sourceId,
  'cohort.critical_count': criticalCount,
})
```

`trackPageView` and the error capture are wired automatically; `trackAction` is
the one you add by hand. **Attribute values must be counts, enums, ids or
flags — never user-entered text.** A cohort name, a concept name or a search
term in an attribute defeats the whole scrubbing design, which only covers
URLs. `src/stores/concept-search.ts` records `search.term_length` and
`search.result_count` and deliberately not `term`.

Screens are named by route *pattern*, never resolved path: Vue Router already
hands us `/cohortdefinition/:id`, which is strictly better than regex-replacing
digits (it cannot mangle a legitimately numeric segment or miss a non-numeric
id). The regex fallback only applies to paths no route matched.

### Instrumented so far

| Action | Call site |
|---|---|
| `cohort.generate` / `cohort.generate_all` | `src/components/cohort/CohortGenerationSection.vue` |
| `concept.search` | `src/stores/concept-search.ts` (the one point all three search entries funnel through, and the only place the result count is known) |
| `cohort.export` | `src/components/cohort/CohortBuilder.vue` |

Page views and errors needed no per-feature work, so the cheap win is already
in. Add `trackAction` to further buttons a few at a time.

### SigNoz queries

Build these in SigNoz's query builder (Traces → group by). The ClickHouse
equivalents below are what was actually run to verify them, and are handy for
checking data arrival without the UI:

**1. Feature adoption ranking**

```sql
SELECT attributes_string['action.name'] AS action, count() AS uses
FROM signoz_traces.distributed_signoz_index_v3
WHERE name LIKE 'action:%'
GROUP BY action ORDER BY uses DESC;
```

**2. Page views and dwell time**

```sql
SELECT attributes_string['page.name'] AS page,
       count() AS views,
       round(avg(duration_nano)/1e9, 2) AS avg_dwell_s
FROM signoz_traces.distributed_signoz_index_v3
WHERE name = 'page_view'
GROUP BY page ORDER BY views DESC;
```

**3. Friction**

```sql
SELECT attributes_string['page.name'] AS page,
       attributes_string['error.type'] AS type,
       attributes_string['error.source'] AS source,
       status_message
FROM signoz_traces.distributed_signoz_index_v3
WHERE name = 'frontend.error'
ORDER BY timestamp DESC;
```

**4. Perceived speed** — no query needed: open any browser span in SigNoz's
trace view and the WebAPI and SQL spans are already nested under it.

A ready-made dashboard JSON is deliberately not shipped here: SigNoz's
dashboard schema changes between releases, and an untested one would be worse
than these four recipes. Build the panels once from the queries above and
export the dashboard from your own instance if you want it version-controlled.

## Why a gateway collector

`atlas3-otel-gateway` does two jobs that cannot be done in WebAPI without
editing it:

- **Severity filtering.** The Java agent has no level threshold, so "WARN and
  ERROR only" has to happen downstream. Doing it in the gateway leaves
  WebAPI's console logging fully intact for `docker logs`.
- **A second scrub pass**, independent of the agent's own configuration.

Point `OTEL_EXPORTER_OTLP_ENDPOINT` directly at SigNoz to remove the hop — you
lose both of the above.

## Known caveats

- **SigNoz is pinned to v0.129.0 on purpose.** SigNoz deprecated its bundled
  Compose manifests in **v0.130.0** and no longer distributes them; install
  moved to its `foundryctl` CLI. v0.129.0 is the last release with a Compose
  file in the repo. `fetch.sh` asserts the layout and fails loudly rather than
  extracting the wrong thing. To move to a current SigNoz, follow
  <https://signoz.io/docs/install/docker/> and repoint `SIGNOZ_OTLP_ENDPOINT` —
  the Atlas side only emits OTLP and does not care what receives it.
- **Do not pin an older SigNoz than v0.129.0.** Releases around v0.64 use
  `bitnami/zookeeper`, which Broadcom removed from Docker Hub; those stacks no
  longer start at all. v0.129.0 uses SigNoz's own `signoz/zookeeper` mirror.
- **WSL 2 + Docker Desktop.** SigNoz documents ClickHouse Keeper crashing in a
  restart loop (exit 139) under Docker Desktop's virtualization on Windows, and
  recommends Docker Engine installed natively inside WSL. The v0.129.0 stack
  uses ZooKeeper rather than Keeper and came up cleanly here, but bear it in
  mind if ClickHouse misbehaves.
- `JAVA_TOOL_OPTIONS` applies to every JVM in the WebAPI container. A plugin
  that forks its own `java` process (trexsql ships a `Main-Class`) is
  instrumented too, under the same service name. Harmless, but it explains
  unexpected spans.
- `docker/webapi/Dockerfile` pins the agent version via build arg and verifies
  the jar's `Premain-Class`. Pass `OTEL_AGENT_SHA256` to also pin the digest.
- **Editing `observability/otel-gateway/config.yaml` needs the container
  recreated, not just `up -d`.** Compose does not notice content changes behind
  a bind mount, so the collector keeps running its old config — which is how a
  scrub rule that was present in the file silently failed to apply during
  testing here. Use
  `docker compose ... up -d --force-recreate atlas3-otel-gateway`.
- `/otlp` is a publicly writable ingest path. That is inherent to any
  client-side telemetry — the browser has to be able to post — but it means
  anyone who can reach Atlas can push arbitrary spans into SigNoz. Put a rate
  limit in front of it if Atlas is internet-facing.
- The OTel browser SDK is a lazy chunk: with `provider: "none"` it is never
  requested, and the main bundle contains no SDK code.
- Running `npm run dev` against the production template leaves
  `${OTLP_ENDPOINT}` unsubstituted; the module detects that and stays inactive
  rather than initialising with a placeholder.
- **PostHog was evaluated and dropped.** Self-hosting it is 38 services and
  PostHog's own installer warns it needs 8GB+ of memory, wants a real domain
  for Let's Encrypt TLS, and binds 80/443 — which collides with Atlas's Caddy.
  Using PostHog Cloud would have meant sending usage data off-site. Routing
  frontend telemetry into the SigNoz instance already running here costs no new
  infrastructure and keeps everything on-prem; the trade is losing
  product-analytics features such as funnels, retention and session replay.
- `observability/signoz/upstream/` is fetched, not committed — it is
  gitignored, and `fetch.sh` recreates it.
