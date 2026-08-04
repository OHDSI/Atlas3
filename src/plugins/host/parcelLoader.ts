import { mountRootParcel } from 'single-spa'
import { pluginRegistry } from '@/plugins/core/PluginRegistry'
import { storageManager } from '@/services/auth/storageManager'
import { useLocaleStore } from '@/stores/locale'
import { logger } from '@/utils/logger'

function buildI18n() {
  const localeStore = useLocaleStore()
  return (key: string, defaultValue?: string): string => {
    const parts = key.split('.')
    let cursor: unknown = localeStore.translations
    for (const part of parts) {
      if (cursor && typeof cursor === 'object' && part in (cursor as Record<string, unknown>)) {
        cursor = (cursor as Record<string, unknown>)[part]
      } else {
        return defaultValue ?? key
      }
    }
    return typeof cursor === 'string' ? cursor : defaultValue ?? key
  }
}

interface PluginModule {
  bootstrap: (props: unknown) => Promise<void>
  mount: (props: unknown) => Promise<void>
  unmount: (props: unknown) => Promise<void>
  update?: (props: unknown) => Promise<void>
}

export interface ParcelHandle {
  unmount(): Promise<unknown>
  update?(props: Record<string, unknown>): Promise<unknown>
  mountPromise: Promise<unknown>
}

const moduleCache = new Map<string, Promise<PluginModule>>()
const cssLoadedFor = new Set<string>()

function pluginEntryUrl(entryPoint: string): string {
  const isAbsolute = entryPoint.startsWith('/') || entryPoint.startsWith('http')
  return isAbsolute
    ? entryPoint
    : `${import.meta.env.BASE_URL}/plugins/${entryPoint}`.replace('//', '/')
}

function injectPluginStylesheet(pluginId: string, entryPoint: string) {
  if (cssLoadedFor.has(pluginId)) return
  // Vite emits the plugin's CSS as `style.css` next to the JS entry. We
  // inject it once the first time this plugin mounts; the link element
  // stays in <head> for the lifetime of the page (re-mounts are cheap).
  const jsUrl = pluginEntryUrl(entryPoint)
  const cssUrl = jsUrl.replace(/index\.system\.js$/, 'style.css').replace(/\.js$/, '.css')
  if (cssUrl === jsUrl) return // entry doesn't end with .js — bail
  const id = `plugin-style-${pluginId}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = cssUrl
  link.dataset.pluginId = pluginId
  document.head.appendChild(link)
  cssLoadedFor.add(pluginId)
}

async function loadModule(pluginId: string): Promise<PluginModule> {
  const cached = moduleCache.get(pluginId)
  if (cached) return cached

  const instance = pluginRegistry.getPlugin(pluginId)
  if (!instance) throw new Error(`Plugin ${pluginId} is not registered`)

  const url = pluginEntryUrl(instance.registration.entryPoint)
  injectPluginStylesheet(pluginId, instance.registration.entryPoint)

  if (!window.System) {
    throw new Error('SystemJS is not available')
  }

  const promise = window.System.import<PluginModule>(url).then(mod => {
    if (!mod.bootstrap || !mod.mount || !mod.unmount) {
      throw new Error(`Plugin ${pluginId} is missing required lifecycle methods`)
    }
    return mod
  })

  moduleCache.set(pluginId, promise)
  promise.catch(() => moduleCache.delete(pluginId))
  return promise
}

export async function mountPluginParcel(
  pluginId: string,
  domElement: HTMLElement,
  extraProps: Record<string, unknown> = {}
): Promise<ParcelHandle> {
  const instance = pluginRegistry.getPlugin(pluginId)
  if (!instance) throw new Error(`Plugin ${pluginId} is not registered`)

  const mod = await loadModule(pluginId)

  const parcelProps = {
    name: instance.registration.name,
    appId: instance.registration.id,
    authContext: instance.authContext,
    messageBus: instance.messageBus,
    domElement,
    getToken: async () => storageManager.getToken() || '',
    locale: document.documentElement.lang || 'en',
    isAtlas: true,
    t: buildI18n(),
    ...extraProps,
  }

  logger.debug('parcelLoader', `Mounting parcel for ${pluginId}`)
  return mountRootParcel(mod as never, parcelProps as never) as ParcelHandle
}
