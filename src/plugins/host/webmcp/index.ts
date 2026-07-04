import { CAPABILITIES } from '@/plugins/host/capabilities/registry'
import { getWebMcpHost } from './webmcpHost'
import { registerWebMcpCapabilities } from './register'
import { logger } from '@/utils/logger'

export function initWebMcp(): () => void {
  const host = getWebMcpHost()
  if (!host) {
    logger.debug('webmcp', 'navigator.modelContext absent — skipping')
    return () => {}
  }
  logger.info('webmcp', `registering ${CAPABILITIES.length} capabilities (ungated)`)
  return registerWebMcpCapabilities(host, CAPABILITIES)
}
