/**
 * Browser auto-instrumentation for performance traces.
 *
 * Kept apart from telemetry.ts so it can be swapped without touching the
 * usage events, the scrubbing or the config handling. instrumentation-fetch
 * and instrumentation-xml-http-request are soft-deprecated in favour of the
 * Browser SIG packages (`@opentelemetry/browser-instrumentation`); moving to
 * those should only mean changing this file.
 */
import type { Instrumentation } from '@opentelemetry/instrumentation'

export interface BrowserInstrumentationOptions {
  /** Trace fetch/XHR calls, propagating `traceparent` to WebAPI. */
  traceApiCalls: boolean
  /** Trace initial page load timing. */
  traceDocumentLoad: boolean
  /**
   * The exporters' own URLs. Excluding them is not optional: without it every
   * export POST creates a span, which creates another export, forever.
   */
  ignoreUrls: string[]
}

export async function loadBrowserInstrumentations(
  options: BrowserInstrumentationOptions
): Promise<Instrumentation[]> {
  const instrumentations: Instrumentation[] = []

  if (options.traceApiCalls) {
    const [{ FetchInstrumentation }, { XMLHttpRequestInstrumentation }] = await Promise.all([
      import('@opentelemetry/instrumentation-fetch'),
      import('@opentelemetry/instrumentation-xml-http-request'),
    ])
    instrumentations.push(
      new FetchInstrumentation({ ignoreUrls: options.ignoreUrls }),
      new XMLHttpRequestInstrumentation({ ignoreUrls: options.ignoreUrls })
    )
  }

  if (options.traceDocumentLoad) {
    const { DocumentLoadInstrumentation } =
      await import('@opentelemetry/instrumentation-document-load')
    instrumentations.push(new DocumentLoadInstrumentation())
  }

  return instrumentations
}
