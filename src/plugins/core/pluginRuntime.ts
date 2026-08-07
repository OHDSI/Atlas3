const VENDOR_SCRIPTS = [
  './vendor/system.js',
  './vendor/named-register.js',
  './vendor/vue.global.js',
  './vendor/vue-router.global.js',
  './plugin-runtime.js',
]

declare global {
  interface Window {
    __atlasPluginRuntimeReady?: Promise<void>
  }
}

let pending: Promise<void> | null = null

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.addEventListener('load', () => resolve())
    el.addEventListener('error', () => reject(new Error(`Failed to load plugin runtime: ${src}`)))
    document.head.appendChild(el)
  })
}

export async function ensurePluginRuntime(): Promise<void> {
  if (window.System) return
  if (pending) return pending

  pending = (async () => {
    // Appended together and marked async=false so the browser preloads all
    // five in parallel but still executes them in dependency order.
    const loads = VENDOR_SCRIPTS.map(injectScript)
    await Promise.all(loads)
    await window.__atlasPluginRuntimeReady
    if (!window.System) {
      throw new Error('Failed to load plugin runtime: SystemJS did not initialise')
    }
  })()

  pending.catch(() => {
    pending = null
  })

  return pending
}
