import { logger } from '@/utils/logger';

export function setupPluginIsolation(): void {
  // Configure single-spa error handling
  window.addEventListener('single-spa:routing-event', (evt) => {
    logger.debug('PluginIsolation', 'Routing event', evt);
  });

  window.addEventListener('single-spa:app-change', (evt: any) => {
    logger.debug('PluginIsolation', 'App change', {
      appsThatBecameActive: evt.detail?.appsThatBecameActive,
      appsThatBecameInactive: evt.detail?.appsThatBecameInactive,
    });
  });

  // Global error handler for uncaught plugin errors
  window.addEventListener('error', (event) => {
    if (event.filename?.includes('/plugins/')) {
      logger.error('PluginIsolation', 'Uncaught plugin error', event.error);
      event.preventDefault(); // Prevent error from bubbling
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('PluginIsolation', 'Unhandled promise rejection', event.reason);
  });
}

export function createPluginErrorBoundary(): void {
  // This will be used by PluginContainer.vue via onErrorCaptured
  logger.debug('PluginIsolation', 'Error boundary created');
}
