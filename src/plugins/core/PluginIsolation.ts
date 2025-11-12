export function setupPluginIsolation(): void {
  // Configure single-spa error handling
  window.addEventListener('single-spa:routing-event', (evt) => {
    console.log('[PluginIsolation] Routing event:', evt);
  });

  window.addEventListener('single-spa:app-change', (evt: any) => {
    console.log('[PluginIsolation] App change:', {
      appsThatBecameActive: evt.detail?.appsThatBecameActive,
      appsThatBecameInactive: evt.detail?.appsThatBecameInactive,
    });
  });

  // Global error handler for uncaught plugin errors
  window.addEventListener('error', (event) => {
    if (event.filename?.includes('/plugins/')) {
      console.error('[PluginIsolation] Uncaught plugin error:', event.error);
      event.preventDefault(); // Prevent error from bubbling
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[PluginIsolation] Unhandled promise rejection:', event.reason);
  });
}

export function createPluginErrorBoundary(): void {
  // This will be used by PluginContainer.vue via onErrorCaptured
  console.log('[PluginIsolation] Error boundary created');
}
