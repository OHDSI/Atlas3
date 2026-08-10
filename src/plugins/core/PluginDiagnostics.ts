import { logger } from '@/utils/logger'

export function setupPluginDiagnostics(): void {
  window.addEventListener('single-spa:routing-event', evt => {
    logger.debug('PluginDiagnostics', 'Routing event', evt)
  })

  window.addEventListener('single-spa:app-change', ((
    evt: CustomEvent<{
      appsThatBecameActive?: string[]
      appsThatBecameInactive?: string[]
    }>
  ) => {
    logger.debug('PluginDiagnostics', 'App change', {
      appsThatBecameActive: evt.detail?.appsThatBecameActive,
      appsThatBecameInactive: evt.detail?.appsThatBecameInactive,
    })
  }) as EventListener)

  window.addEventListener('error', event => {
    if (event.filename?.includes('/plugins/')) {
      logger.error('PluginDiagnostics', 'Uncaught plugin error', event.error)
      event.preventDefault()
    }
  })
}
