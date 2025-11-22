import type { LoginCredentials, UserInfo, AuthProvider } from '@/models/auth.types'
import { useAuthStore } from '@/stores/auth'
import { authConfig } from '@/config/auth.config'
import { storageManager } from './storageManager'

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
      console.log('[Auth] Login attempt:', { provider, webAPIRoot: this.webAPIRoot })
      let response: Response

      if (credentials) {
        const formData = new URLSearchParams()
        formData.append('login', credentials.username)
        formData.append('password', credentials.password)

        // Ensure proper URL formatting with slash
        const baseUrl = this.webAPIRoot.endsWith('/') ? this.webAPIRoot : this.webAPIRoot + '/'
        const url = `${baseUrl}${provider}`
        console.log('[Auth] POST to:', url)
        console.log('[Auth] Credentials:', { username: credentials.username, password: '***' })

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        })

        console.log('[Auth] Response status:', response.status)
        console.log('[Auth] Response headers:', Object.fromEntries(response.headers.entries()))
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
        console.error('[Auth] Login failed:', { 
          status: response.status, 
          errorHeader, 
          errorBody 
        })
        throw new Error(errorHeader || errorBody || 'Authentication failed')
      }

      const token = response.headers.get('Bearer')
      console.log('[Auth] Token received:', token ? 'YES' : 'NO')
      
      if (!token) {
        throw new Error('No token received from server')
      }

      authStore.setToken(token)

      const userInfo = await this.fetchUserInfo()
      authStore.setUser(userInfo)

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

      // Get auth client to determine logout method
      const authClient = storageManager.getAuthClient()

      if (authClient === 'IAP') {
        // Google IAP logout - redirect to IAP logout URL
        console.log('[Auth] Performing Google IAP logout')
        window.location.href = '/_gcp_iap/clear_login_cookie'
        return
      } else if (authClient === 'SAML') {
        // SAML Single Logout
        console.log('[Auth] Performing SAML Single Logout')
        const response = await fetch(`${baseUrl}user/logout/saml`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Check if the response contains a redirect URL (auth-proxy OIDC logout)
        if (response.ok) {
          const data = await response.json().catch(() => null)
          if (data?.redirect) {
            console.log('[Auth] Redirecting to OIDC logout endpoint:', data.redirect)
            authStore.clearAuth()
            window.location.href = data.redirect
            return
          }
        }
      } else {
        // Standard logout for other providers
        console.log('[Auth] Performing standard logout')
        const response = await fetch(`${baseUrl}user/logout`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Check if the response contains a redirect URL (auth-proxy OIDC logout)
        if (response.ok) {
          const data = await response.json().catch(() => null)
          if (data?.redirect) {
            console.log('[Auth] Redirecting to OIDC logout endpoint:', data.redirect)
            authStore.clearAuth()
            window.location.href = data.redirect
            return
          }
        }
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
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
      console.error('Token refresh failed:', error)
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
      const url = `${baseUrl}user/oauth/providers`
      console.log('[Auth] Fetching OAuth providers from:', url)

      const response = await fetch(url, {
        method: 'GET',
      })

      console.log('[Auth] OAuth providers response status:', response.status)

      if (!response.ok) {
        console.warn('[Auth] Failed to fetch OAuth providers from WebAPI - status:', response.status)
        return []
      }

      const providers = await response.json()
      console.log('[Auth] OAuth providers from WebAPI:', providers)
      return Array.isArray(providers) ? providers : []
    } catch (error) {
      console.error('[Auth] Error fetching OAuth providers:', error)
      return []
    }
  }
}

export const authService = new AuthService()
