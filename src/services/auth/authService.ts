import type { LoginCredentials, UserInfo, AuthProvider } from '@/models/auth.types'
import { useAuthStore } from '@/stores/auth'
import { authConfig } from '@/config/auth.config'
import { storageManager } from './storageManager'
import { logger } from '@/utils/logger'

export interface IAuthService {
  login(provider: string, credentials?: LoginCredentials): Promise<void>
  logout(): Promise<void>
  refreshToken(): Promise<boolean>
  fetchUserInfo(): Promise<UserInfo>
  runAs(targetUsername: string): Promise<void>
  exitRunAs(): Promise<void>
}

class AuthService implements IAuthService {
  private get webAPIRoot(): string {
    return authConfig.webAPIRoot
  }

  /**
   * Detect if Google IAP is enabled
   */
  async detectIAP(): Promise<boolean> {
    try {
      const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
      const response = await fetch(`${baseUrl}info`, {
        method: 'HEAD',
      })
      
      // IAP sets x-goog-iap-jwt-assertion header
      return response.headers.has('x-goog-iap-jwt-assertion')
    } catch (error) {
      return false
    }
  }

  /**
   * Authenticate via Google IAP
   */
  async loginWithIAP(): Promise<void> {
    const authStore = useAuthStore()
    authStore.setAuthenticating(true)
    authStore.setError(null)

    try {
      const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
      const response = await fetch(`${baseUrl}user/login/iap`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('IAP authentication failed')
      }

      const token = response.headers.get('Bearer')
      if (!token) {
        throw new Error('No token received from IAP authentication')
      }

      authStore.setToken(token)
      authStore.setAuthClient('IAP')

      const userInfo = await this.fetchUserInfo()
      authStore.setUser(userInfo)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IAP authentication failed'
      authStore.setError(message)
      throw error
    } finally {
      authStore.setAuthenticating(false)
    }
  }

  async login(provider: string, credentials?: LoginCredentials): Promise<void> {
    const authStore = useAuthStore()
    authStore.setAuthenticating(true)
    authStore.setError(null)

    try {
      logger.debug('Auth', 'Login attempt', { provider, webAPIRoot: this.webAPIRoot })
      let response: Response

      if (credentials) {
        const formData = new URLSearchParams()
        formData.append('login', credentials.username)
        formData.append('password', credentials.password)

        // Ensure proper URL formatting with slash
        const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
        const url = `${baseUrl}${provider}`
        logger.debug('Auth', 'POST to', url)
        logger.debug('Auth', 'Credentials', { username: credentials.username, password: '***' })

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        })

        logger.debug('Auth', 'Response status', response.status)
        logger.debug('Auth', 'Response headers', Object.fromEntries(response.headers.entries()))
      } else {
        // OAuth/redirect provider - ensure proper URL with slash
        const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'

        // Build redirect URL with hash route (Atlas pattern)
        const hashRoute = window.location.hash
        const loginUrl = `${baseUrl}${provider}`

        // Redirect with optional redirectUrl parameter for hash routes
        window.location.href = hashRoute ? `${loginUrl}?redirectUrl=${encodeURIComponent(hashRoute)}` : loginUrl
        return
      }

      if (!response.ok) {
        const errorHeader = response.headers.get('x-auth-error')
        const errorBody = await response.text()
        logger.error('Auth', 'Login failed', {
          status: response.status,
          errorHeader,
          errorBody
        })
        throw new Error(errorHeader || errorBody || 'Authentication failed')
      }

      const token = response.headers.get('Bearer')
      logger.debug('Auth', 'Token received', token ? 'YES' : 'NO')
      
      if (!token) {
        throw new Error('No token received from server')
      }

      authStore.setToken(token)

      const userInfo = await this.fetchUserInfo()
      authStore.setUser(userInfo)

      import('@/stores/locale').then(({ useLocaleStore }) => {
        useLocaleStore().fetchAvailableLocales()
      }).catch((err) => {
        logger.warn('Auth', 'Failed to refresh locales after login', err)
      })

      authStore.closeLoginModal()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed'
      authStore.setError(message)
      throw error
    } finally {
      authStore.setAuthenticating(false)
    }
  }

  async logout(): Promise<void> {
    const authStore = useAuthStore()

    try {
      const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'

      // Get auth client and token before clearing - needed for provider-specific logout
      const authClient = storageManager.getAuthClient()
      const logoutUrl = storageManager.getLogoutUrl()
      const token = authStore.token

      // First, invalidate the JWT on WebAPI
      logger.info('Auth', 'Invalidating JWT on WebAPI')
      await fetch(`${baseUrl}user/logout`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((e) => logger.warn('Auth', 'WebAPI logout call failed', e))

      if (authClient === 'IAP') {
        // Google IAP logout - clear auth then redirect
        logger.info('Auth', 'Performing Google IAP logout')
        authStore.clearAuth()
        window.location.href = '/_gcp_iap/clear_login_cookie'
        return
      } else if (authClient === 'SAML') {
        // SAML Single Logout - needs token for session identification
        logger.info('Auth', 'Performing SAML Single Logout')
        const response = await fetch(`${baseUrl}user/logout/saml`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        authStore.clearAuth()

        if (response.ok) {
          const data = await response.json().catch(() => null)
          if (data?.redirect) {
            logger.info('Auth', 'Redirecting to SAML logout endpoint', data.redirect)
            window.location.href = data.redirect
            return
          }
        }
      } else if (logoutUrl) {
        // OIDC Single Logout - redirect to identity provider's end session endpoint
        logger.info('Auth', 'Performing OIDC Single Logout', logoutUrl)
        authStore.clearAuth()
        const currentUrl = window.location.origin + window.location.pathname
        const separator = logoutUrl.includes('?') ? '&' : '?'
        const fullLogoutUrl = `${logoutUrl}${separator}post_logout_redirect_uri=${encodeURIComponent(currentUrl)}`
        window.location.href = fullLogoutUrl
        return
      } else {
        // Standard logout - just clear local state
        authStore.clearAuth()
      }
    } catch (error) {
      logger.error('Auth', 'Logout failed', error)
      authStore.clearAuth()
    }
  }

  async refreshToken(): Promise<boolean> {
    const authStore = useAuthStore()
    const currentToken = authStore.token

    if (!currentToken) {
      return false
    }

    authStore.setRefreshing(true)

    try {
      const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
      const response = await fetch(`${baseUrl}user/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ token: currentToken }),
      })

      if (!response.ok) {
        return false
      }

      const newToken = response.headers.get('Bearer')
      if (!newToken) {
        return false
      }

      authStore.setToken(newToken)
      return true
    } catch (error) {
      logger.error('Auth', 'Token refresh failed', error)
      return false
    } finally {
      authStore.setRefreshing(false)
    }
  }

  async fetchUserInfo(): Promise<UserInfo> {
    const authStore = useAuthStore()

    const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
    const response = await fetch(`${baseUrl}user/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    const data = await response.json()

    return {
      login: data.login,
      name: data.name,
      displayName: data.name || data.login,
      email: data.email,
      permissionIdx: data.permissions || {},
      trexsqlCacheEnabled: data.trexsqlCacheEnabled ?? false,
    }
  }

  async runAs(targetUsername: string): Promise<void> {
    const authStore = useAuthStore()

    const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
    const response = await fetch(`${baseUrl}user/runas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({ username: targetUsername }),
    })

    if (!response.ok) {
      throw new Error('Failed to run as user')
    }

    const newToken = response.headers.get('Bearer')
    if (!newToken) {
      throw new Error('No token received from run-as')
    }

    authStore.setToken(newToken)
    const userInfo = await this.fetchUserInfo()
    authStore.setRunAsState(userInfo)
  }

  async exitRunAs(): Promise<void> {
    const authStore = useAuthStore()

    if (!authStore.originalUser) {
      throw new Error('Not currently running as another user')
    }

    const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
    const response = await fetch(`${baseUrl}user/runas/exit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to exit run-as')
    }

    const originalToken = response.headers.get('Bearer')
    if (!originalToken) {
      throw new Error('No token received from exit run-as')
    }

    authStore.setToken(originalToken)
    authStore.exitRunAsState(authStore.originalUser)
  }

  async fetchOAuthProviders(): Promise<AuthProvider[]> {
    try {
      const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
      const url = `${baseUrl}auth/providers`
      logger.debug('Auth', 'Fetching auth providers from', url)

      const response = await fetch(url, {
        method: 'GET',
      })

      logger.debug('Auth', 'OAuth providers response status', response.status)

      if (!response.ok) {
        logger.warn('Auth', 'Failed to fetch OAuth providers from WebAPI - status', response.status)
        return []
      }

      const rawProviders = await response.json()
      logger.debug('Auth', 'OAuth providers from WebAPI', rawProviders)
      if (!Array.isArray(rawProviders)) {
        return []
      }
      // Map WebAPI field names to frontend field names
      // WebAPI returns 'useCredentialsForm', frontend expects 'isUseCredentialsForm'
      return rawProviders.map((p) => ({
        name: p.name as string,
        url: p.url as string,
        ajax: p.ajax as boolean,
        icon: p.icon as string,
        isUseCredentialsForm: (p.useCredentialsForm ?? p.isUseCredentialsForm ?? false) as boolean,
        logoutUrl: p.logoutUrl as string | undefined,
      }))
    } catch (error) {
      logger.error('Auth', 'Error fetching OAuth providers', error)
      return []
    }
  }
}

export const authService = new AuthService()
