import { logger } from '@/utils/logger'

export class StorageManager {
  private readonly TOKEN_KEY = 'bearerToken'
  private readonly AUTH_CLIENT_KEY = 'auth-client'
  private readonly LOGOUT_URL_KEY = 'auth-logout-url'
  private readonly RUN_AS_TOKEN_STACK_KEY = 'atlas-run-as-token-stack-v1'

  saveToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token)
      // Secure is added only under https: on a plain-http deployment the
      // browser would refuse to store the cookie at all, and the token is
      // already travelling in the clear there anyway.
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `${this.TOKEN_KEY}=${token}; path=/; SameSite=Lax${secure}`
    } catch (error) {
      logger.error('StorageManager', 'Failed to save token', error)
    }
  }

  getToken(): string | null {
    const runAsToken = this.getActiveRunAsToken()
    if (runAsToken) {
      return runAsToken
    }

    try {
      return localStorage.getItem(this.TOKEN_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to get token', error)
      return null
    }
  }

  getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to get stored token', error)
      return null
    }
  }

  clearToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY)
      document.cookie = `${this.TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    } catch (error) {
      logger.error('StorageManager', 'Failed to clear token', error)
    }
  }

  getRunAsTokenStack(): string[] {
    try {
      const serialized = sessionStorage.getItem(this.RUN_AS_TOKEN_STACK_KEY)
      if (!serialized) return []

      const stack: unknown = JSON.parse(serialized)
      if (
        !Array.isArray(stack) ||
        stack.length < 2 ||
        !stack.every(token => typeof token === 'string' && token.length > 0)
      ) {
        this.clearRunAsTokenStack()
        return []
      }

      return stack
    } catch (error) {
      logger.error('StorageManager', 'Failed to get Run-As token stack', error)
      this.clearRunAsTokenStack()
      return []
    }
  }

  hasRunAsSession(): boolean {
    return this.getRunAsTokenStack().length > 1
  }

  getActiveRunAsToken(): string | null {
    const stack = this.getRunAsTokenStack()
    return stack[stack.length - 1] ?? null
  }

  getPreviousRunAsToken(): string | null {
    const stack = this.getRunAsTokenStack()
    return stack.length > 1 ? stack[stack.length - 2] ?? null : null
  }

  pushRunAsToken(currentToken: string, targetToken: string): void {
    const stack = this.getRunAsTokenStack()
    const nextStack = stack.length > 1 ? [...stack, targetToken] : [currentToken, targetToken]
    this.saveRunAsTokenStack(nextStack)
  }

  popRunAsToken(): string | null {
    const stack = this.getRunAsTokenStack()
    if (stack.length <= 1) return null

    stack.pop()
    if (stack.length === 1) {
      this.clearRunAsTokenStack()
      return stack[0] ?? null
    }

    this.saveRunAsTokenStack(stack)
    return stack[stack.length - 1] ?? null
  }

  replaceActiveRunAsToken(token: string): void {
    const stack = this.getRunAsTokenStack()
    if (stack.length <= 1) {
      throw new Error('Cannot refresh a Run-As token when no Run-As session is active')
    }

    stack[stack.length - 1] = token
    this.saveRunAsTokenStack(stack)
  }

  clearRunAsTokenStack(): void {
    try {
      sessionStorage.removeItem(this.RUN_AS_TOKEN_STACK_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to clear Run-As token stack', error)
    }
  }

  private saveRunAsTokenStack(stack: string[]): void {
    try {
      sessionStorage.setItem(this.RUN_AS_TOKEN_STACK_KEY, JSON.stringify(stack))
    } catch (error) {
      logger.error('StorageManager', 'Failed to save Run-As token stack', error)
      throw error
    }
  }

  saveAuthClient(authClient: string): void {
    try {
      localStorage.setItem(this.AUTH_CLIENT_KEY, authClient)
    } catch (error) {
      logger.error('StorageManager', 'Failed to save auth client', error)
    }
  }

  getAuthClient(): string | null {
    try {
      return localStorage.getItem(this.AUTH_CLIENT_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to get auth client', error)
      return null
    }
  }

  clearAuthClient(): void {
    try {
      localStorage.removeItem(this.AUTH_CLIENT_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to clear auth client', error)
    }
  }

  saveLogoutUrl(logoutUrl: string): void {
    try {
      localStorage.setItem(this.LOGOUT_URL_KEY, logoutUrl)
    } catch (error) {
      logger.error('StorageManager', 'Failed to save logout URL', error)
    }
  }

  getLogoutUrl(): string | null {
    try {
      return localStorage.getItem(this.LOGOUT_URL_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to get logout URL', error)
      return null
    }
  }

  clearLogoutUrl(): void {
    try {
      localStorage.removeItem(this.LOGOUT_URL_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to clear logout URL', error)
    }
  }

  clearAll(): void {
    this.clearRunAsTokenStack()
    this.clearToken()
    this.clearAuthClient()
    this.clearLogoutUrl()
  }
}

export const storageManager = new StorageManager()
