import { registerApplication, start, triggerAppChange, getAppNames, getAppStatus } from 'single-spa'
import { PluginRegistry } from './PluginRegistry'
import { PluginInstance } from '@/models/PluginModels'
import { logger } from '@/utils/logger'
import { useWebAPIStore } from '@/stores/webapi'
import { storageManager } from '@/services/auth/storageManager'

export class PluginLoader {
  private registry: PluginRegistry
  private loadingTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private retryAttempts: Map<string, number> = new Map()
  private readonly MAX_RETRIES = 3
  private readonly LOADING_TIMEOUT = 30000
  private sourceWatcherUnsubscribe: (() => void) | null = null

  constructor(registry: PluginRegistry) {
    this.registry = registry
  }

  async loadPlugin(plugin: PluginInstance): Promise<void> {
    const { registration } = plugin
    // If entryPoint is absolute (starts with / or http), use it directly
    // Otherwise, prepend BASE_URL/plugins/
    const isAbsolutePath =
      registration.entryPoint.startsWith('/') || registration.entryPoint.startsWith('http')
    const pluginUrl = isAbsolutePath
      ? registration.entryPoint
      : `${import.meta.env.BASE_URL}/plugins/${registration.entryPoint}`.replace('//', '/')

    logger.info('PluginLoader', `Loading plugin: ${registration.id} from ${pluginUrl}`)

    try {
      this.registry.updatePluginState(registration.id, 'loading')

      const startTime = performance.now()

      const timeoutId = setTimeout(() => {
        const error = new Error(
          `Plugin ${registration.id} loading timeout after ${this.LOADING_TIMEOUT}ms`
        )
        this.registry.setPluginError(registration.id, error, true)
      }, this.LOADING_TIMEOUT)

      this.loadingTimeouts.set(registration.id, timeoutId)

      let pluginModule: {
        bootstrap: (props: unknown) => Promise<void>
        mount: (props: unknown) => Promise<void>
        unmount: (props: unknown) => Promise<void>
        update?: (props: unknown) => Promise<void>
      }

      try {
        if (!window.System) {
          throw new Error('SystemJS is not available')
        }

        const importedModule = await window.System.import(pluginUrl).catch((err: Error) => {
          throw new Error(`Failed to import plugin module: ${err.message}`)
        })

        pluginModule = importedModule as typeof pluginModule

        if (!pluginModule.bootstrap || !pluginModule.mount || !pluginModule.unmount) {
          throw new Error(
            `Plugin ${registration.id} is missing required lifecycle methods (bootstrap, mount, unmount)`
          )
        }

        const loadTime = performance.now() - startTime
        this.registry.updatePluginMetrics(registration.id, { loadTime })

        clearTimeout(timeoutId)
        this.loadingTimeouts.delete(registration.id)

        this.registry.updatePluginState(registration.id, 'loaded')
        logger.info('PluginLoader', `Plugin ${registration.id} loaded in ${loadTime.toFixed(0)}ms`)
      } catch (error) {
        clearTimeout(timeoutId)
        this.loadingTimeouts.delete(registration.id)
        throw error
      }

      registerApplication({
        name: registration.id,
        app: () => Promise.resolve(pluginModule),
        activeWhen: location => {
          const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
          const pluginPath = `${basePath}/plugins/${registration.id}/`
          return location.pathname.startsWith(pluginPath)
        },
        customProps: () => {
          const containerId = `plugin-${registration.id}`
          const domElement = document.getElementById(containerId)
          const urlParams = new URLSearchParams(window.location.search)
          let datasetId = urlParams.get('datasetId') || undefined

          if (!datasetId) {
            const webApiStore = useWebAPIStore()
            datasetId = webApiStore.selectedSource || webApiStore.sources[0]?.sourceKey || undefined
          }

          return {
            name: registration.name,
            authContext: plugin.authContext,
            messageBus: plugin.messageBus,
            domElement: domElement,
            containerId: containerId,
            appId: registration.id,
            getToken: async () => storageManager.getToken() || '',
            username: plugin.authContext.user?.username,
            idpUserId: plugin.authContext.user?.id,
            datasetId: datasetId,
            locale: document.documentElement.lang || 'en',
            isAtlas: true,
            autoMount: false,
            uiFilesUrl: `${import.meta.env.BASE_URL}plugins/${registration.id}/`.replace('//', '/'),
          }
        },
      })

      plugin.application = { name: registration.id }
    } catch (error) {
      logger.error('PluginLoader', `Failed to load plugin ${registration.id}`, error)
      this.handleLoadError(registration.id, error as Error)
    }
  }

  private handleLoadError(pluginId: string, error: Error): void {
    const attempts = this.retryAttempts.get(pluginId) || 0

    if (attempts < this.MAX_RETRIES) {
      this.retryAttempts.set(pluginId, attempts + 1)
      logger.info(
        'PluginLoader',
        `Retry ${attempts + 1}/${this.MAX_RETRIES} for plugin ${pluginId}`
      )

      setTimeout(
        () => {
          const plugin = this.registry.getPlugin(pluginId)
          if (plugin) {
            this.loadPlugin(plugin)
          }
        },
        1000 * (attempts + 1)
      ) // Exponential backoff
    } else {
      this.registry.setPluginError(pluginId, error, false)
      this.retryAttempts.delete(pluginId)
    }
  }

  async retryPlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.getPlugin(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (plugin.error) {
      plugin.error = undefined
    }

    this.retryAttempts.delete(pluginId)
    await this.loadPlugin(plugin)
  }

  startPluginFramework(): void {
    start({ urlRerouteOnly: true })
    logger.info('PluginLoader', 'Plugin framework started')

    ;(
      window as unknown as {
        __singleSpa: {
          getAppNames: typeof getAppNames
          getAppStatus: typeof getAppStatus
          triggerAppChange: typeof triggerAppChange
        }
      }
    ).__singleSpa = {
      getAppNames,
      getAppStatus,
      triggerAppChange,
    }

    setTimeout(() => triggerAppChange(), 100)
    this.watchSourceChanges()
  }

  private watchSourceChanges(): void {
    if (this.sourceWatcherUnsubscribe) {
      this.sourceWatcherUnsubscribe()
      this.sourceWatcherUnsubscribe = null
    }

    const webApiStore = useWebAPIStore()
    let lastDatasetId: string | null = null

    const checkAndNotify = () => {
      const datasetId = webApiStore.selectedSource || webApiStore.sources[0]?.sourceKey || null
      if (datasetId && datasetId !== lastDatasetId) {
        lastDatasetId = datasetId
        this.notifyPluginsOfPropChange(datasetId)
        return true
      }
      return false
    }

    if (checkAndNotify()) {
      return
    }

    this.sourceWatcherUnsubscribe = webApiStore.$subscribe((_mutation, state) => {
      const datasetId = state.selectedSource || state.sources[0]?.sourceKey || null
      if (datasetId && datasetId !== lastDatasetId) {
        lastDatasetId = datasetId
        this.notifyPluginsOfPropChange(datasetId)
      }
    })

    webApiStore.fetchSources().catch(error => {
      logger.error('PluginLoader', 'Failed to fetch CDM sources', error)
    })
  }

  dispose(): void {
    if (this.sourceWatcherUnsubscribe) {
      this.sourceWatcherUnsubscribe()
      this.sourceWatcherUnsubscribe = null
    }

    this.loadingTimeouts.forEach(timeout => clearTimeout(timeout))
    this.loadingTimeouts.clear()
    this.retryAttempts.clear()
  }

  private notifyPluginsOfPropChange(datasetId: string): void {
    getAppNames().forEach(appId => {
      window.dispatchEvent(
        new CustomEvent('custom-props-changed', {
          detail: { appId, datasetId },
        })
      )
    })
  }
}
