# Known issues and follow-ups

Findings surfaced while remediating the ATLAS v3.0 code review (branch `worktree-review`,
2026-08-07) that were deliberately **not** fixed there. Each was verified, not assumed.
Ordered by severity.

## Critical — restoring a concept-set version wipes its concepts

Not introduced by the remediation branch; pre-existing.

`src/stores/concept-sets.ts:537` assigns the version endpoint's `entityDTO` directly into
`currentSet`. WebAPI's `ConceptSetVersionFullDTO` declares `items` as a **sibling** of
`entityDTO`, not a field inside it, so `entityDTO` never carries the concepts. Nothing in
`src/services/concept-set-versions.service.ts` reads that sibling.

`savePreviewAsCurrent` (`concept-sets.ts:587`) then passes `currentSet.value` to `update`
→ `updateConceptSet`, which PUTs `(conceptSet.items || []).map(...)` to
`/conceptset/{id}/items` (`src/services/concept-set.service.ts:214-224`) — an empty list.

So previewing a historical concept-set version and clicking save-as-current empties the
concept set, behind a success toast. Concept sets are shared building blocks, so this also
invalidates every cohort definition referencing that set.

The cohort store had the identical defect; it was fixed on the remediation branch by having
the editor fetch and convert the versioned DTO rather than trusting `entityDTO` to be the
internal shape (`src/components/cohort/CohortBuilder.vue`, `applyAtlasCohort`). The concept-set
fix additionally needs to read the sibling `items`, or call the unused
`getVersionExpression` endpoint (`concept-set-versions.service.ts:84`).

## Important — ATLAS + WebAPI 3.0 OIDC login cannot work

Cross-repo; needs a WebAPI change, not an ATLAS one.

`OidcAuthConfig.java:171` (WebAPI, branch `webapi-3.0`) returns the JWT with
`appendFragmentParam(callbackUi, "token", jwt)`. That helper joins with `&` when the URL
already contains `#`, and the documented callback is
`SECURITY_AUTH_OAUTH_CALLBACK_UI=http://localhost/atlas/#/oauth/callback`
(`docker-compose.yml:83`). The redirect therefore lands on
`…/atlas/#/oauth/callback&token=<jwt>`, which `createWebHashHistory` parses as a single
path segment — `to.query.token` is never populated.

The same file already contains the correct helper, `appendQueryParam` (`:193-200`), whose
comment reads *"Insert before any URL fragment so SPA hash-route callbacks keep the param
queryable"*. It is used on the failure path at `:141` and not on the success path at `:171`.

WebAPI also never sets a `bearerToken` cookie or localStorage value (`grep` for
`bearerToken|addCookie|Set-Cookie` over `src/main/java` returns nothing), so neither token
source ATLAS accepts is fed by the backend today.

OIDC ships disabled (`docker-compose.yml:75`), which is why this has gone unnoticed. ATLAS
should **not** re-accept a token from the URL to work around it — tokens in URLs leak via
history, referrer headers and access logs.

## Important — incidence-rate version preview is unreachable

`IncidenceRateVersionsPanel.vue:48` declares `assetType: 'ir'`, and
`VersionsTabContent.vue:123-125` builds `/${assetType}/${assetId}/version/${n}` →
`/ir/5/version/3`. The real route is `/incidence-rates/:id(\d+)/version/:version`
(`src/router/routes.ts:310`). `handleCopy` (`:189-194`) has the same defect.

Even with the path corrected, `IncidenceRateManagerView.vue:35-56` ignores
`route.params.version` and unconditionally calls `store.loadIR(id)`, which nulls
`previewVersion`. `PathwayManagerView.vue:14-29` branches correctly and is the model to follow.

Consequence: `useIncidenceRateStore().savePreviewAsCurrent()` always returns `false`, so the
incidence-rate half of the version-restore work cannot be exercised through the UI.

## Minor — carried forward

| Area | Issue |
| --- | --- |
| `src/stores/cohort.ts` | `requestSave` overwrites `saveTimeoutId` without clearing the previous timer, so overlapping saves can still steal each other's resolver. `notifySaved` clears correctly; the gap is on the request side. |
| `src/router/index.ts:60` | `?route=/plugins/<x>/<y>` passes the deeplink guard by resolving to the plugin subtree's own wildcard rather than `not-found`. Same-origin only; `PluginContainer` degrades gracefully; hash routing bypasses the guard anyway. The `resolved.matched.length === 0` disjunct is now dead code. |
| `public/plugin-runtime.js` | The `single-spa-vue` import's `.catch` lets the chain resolve, so `ensurePluginRuntime` can report ready with `single-spa-vue` unregistered. The `!window.Vue` guard returns a resolved promise for the same reason. |
| `public/vendor/` | Ships the **dev** builds of Vue and vue-router. Now lazily loaded, so the page-load cost is mitigated, but `.prod.js` remains the right target. |
| `src/services/webapi.ts` (`getCohortPrintFriendly`), `src/services/auth/authService.ts`, `src/services/trexsql.service.ts` | Call `fetch()` directly, bypassing `httpClient` — no retry, no shared auth handling, no error-body surfacing. Belongs with the `webapi.ts` consolidation plan. |
| `src/services/webapi.ts` / `src/services/concept-search.service.ts` | `searchConcepts` is implemented twice against the same endpoint. Same plan. |
| `src/composables/useCohortBuilder.ts`, `src/composables/useVersionPreview.ts` | Unreferenced except by their own tests. |
| `scripts/i18n-check.mjs` | Extractor sees single-quoted keys only; a new key that is a *prefix* of an existing object could still collapse it on `--backfill`; the collision-refusal branch has no automated test. |
| `tests/unit/router/` | Every spec mocks `generatePluginRoutes` to `[]`, so no test can observe plugin-route interactions. |
| `tests/unit/stores/pathway.spec.ts`, `incidence-rate.spec.ts` | Assert only that `isPreviewMode` flips, never that the entity reverts. Both already mock a distinctly-named current entity for this purpose. |
| `tests/component/cohort/CohortBuilder.spec.ts` | The version-preview regression test asserts `cohortName` as its only witness that the editor's local refs resynced. Asserting `entryEvents`, or a post-preview `handleSave()` payload, would pin the actual failure mode. |
| `.husky/pre-commit` | Runs `npm run lint`, which no longer autofixes and now carries `--max-warnings 0`. Commits block where they previously self-healed; use `npm run lint:fix`. |
| `tests/e2e/` | Five suites remain disabled — see `docs/e2e-coverage-gaps.md`. |
