# WebMCP capability surface

ATLAS exposes its cohort-builder and artifact-editing capabilities directly to
the browser's built-in [WebMCP](https://github.com/webmachinelearning/webmcp)
API (`navigator.modelContext`), currently shipping as an origin-trial /
preview feature behind a flag in Chrome 146+. This lets any WebMCP-aware
client running in the same browser tab — a browser extension, DevTools
console, or an in-page agent — call ATLAS tools without going through Pythia.

## Feature detection, not a hard dependency

`navigator.modelContext` does not exist in most browsers today. ATLAS never
assumes it is present:

- `getWebMcpHost()` (`src/plugins/host/webmcp/webmcpHost.ts`) checks for
  `navigator.modelContext.registerTool` and returns `null` if it is missing.
- `initWebMcp()` (`src/plugins/host/webmcp/index.ts`) calls `getWebMcpHost()`
  once at boot, from `src/main.ts` immediately after `setupPythiaBridge()`. If
  the host is `null` it logs a debug line and returns a no-op disposer — no
  tools are registered, and nothing about app startup changes.
- When the host **is** present, `initWebMcp()` registers every entry in
  `CAPABILITIES` (`src/plugins/host/capabilities/registry.ts`) via
  `registerWebMcpCapabilities` and returns a single dispose-all function.

## Ungated by design

Every other agent surface in ATLAS — Pythia — puts a human in the loop:
capabilities marked `requiresApproval: true` render a confirmation card and
wait for the user to accept or reject before anything is written.

WebMCP tools do **not** go through that card. `registerWebMcpCapabilities`
wires each tool's `execute` directly to `applyCapability`, the same function
Pythia uses *after* a card is accepted — the WebMCP path just skips straight
to it. Calling a WebMCP tool applies the change immediately and resolves with
`{ applied: true, kind, id, name }` (or `{ applied: false }` if the capability
name doesn't translate to a known proposal).

This is intentional, not an oversight: WebMCP is a low-level tool-execution
protocol with no concept of a confirmation UI, and building one into ATLAS
for this surface would just be a second, redundant approval mechanism.
Human-in-the-loop is Pythia's responsibility, not WebMCP's. If a review step
is wanted for WebMCP-driven changes, it belongs in the WebMCP *client*
(the extension or agent calling into `navigator.modelContext`), not in ATLAS.

## What's exposed

The 19 registered tools are exactly the entries in `CAPABILITIES` — the same
artifact-editing operations Pythia can propose: cohort criteria and entry
events, exit/censor definitions, concept-set create/update, feature analyses,
characterizations, pathways, incidence-rate analyses, saving the open cohort,
and `navigate_to` for moving between views. There is no separate WebMCP-only
tool list and no subset filtering — registering fewer tools than
`CAPABILITIES.length` (19) is a bug.

## Security note

Because WebMCP execution is ungated, any script or extension with access to
`navigator.modelContext` in a logged-in ATLAS tab can create, save, or update
cohorts, concept sets, and analyses under that user's WebAPI session and
permissions — with no ATLAS-side confirmation step. An auto-approving
external agent effectively acts with the full authority of the logged-in
user for every capability in the registry.

Consequences to design around:

- **Browser WebMCP clients are expected to gate tool calls at their own
  layer.** ATLAS provides the tools; it deliberately does not provide the
  review UI for this surface. A well-behaved WebMCP client should show the
  user what it's about to call before calling it.
- `navigate_to` is the one capability that is comparatively low-risk to
  invoke without review — it only changes the current route and is
  side-effect-light (no server write), so an errant call is cheap to undo.
  Every other capability performs a real WebAPI mutation.
- This surface only exists when `navigator.modelContext` exists, i.e. an
  opted-in preview browser. It does not change behavior in any browser
  without WebMCP support.

## Manual verification (Chrome 146+ preview)

1. Use Chrome 146 or newer with the WebMCP preview flag/origin trial enabled.
   Run `docker compose up`, open `https://localhost`, and log in.
2. Open DevTools console. Confirm `navigator.modelContext` is defined, and
   that the console log shows
   `webmcp: registering 19 capabilities (ungated)`.
3. Invoke `set_entry_event` from a WebMCP client (or directly via
   `navigator.modelContext` in the console) and confirm the cohort store
   updates immediately — no confirmation card appears — and the call
   resolves `{ applied: true, ... }`.
4. Invoke `navigate_to` and confirm the route changes.
5. With Pythia also mounted in the same session, confirm Pythia's own agent
   path still shows approval cards as usual — the two surfaces are
   independent, and enabling WebMCP does not weaken Pythia's gating.
