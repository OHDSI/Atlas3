/**
 * WebAPI service info (GET /info). Public endpoint describing the server's
 * configuration, independent of the logged-in user.
 */
import { httpGet } from '@/services/http-client'

export interface WebApiInfo {
  version?: string
  configuration?: {
    plugins?: Record<string, unknown>
    [key: string]: unknown
  }
}

export async function getWebApiInfo(): Promise<WebApiInfo> {
  return httpGet<WebApiInfo>('/info', { skipAuth: true })
}

/**
 * Whether the TrexSQL plugin is registered and active on the server.
 * WebAPI omits the key when the plugin isn't loaded, so absent means disabled.
 */
export async function isTrexSQLPluginEnabled(): Promise<boolean> {
  const info = await getWebApiInfo()
  return info.configuration?.plugins?.trexsqlEnabled === true
}
