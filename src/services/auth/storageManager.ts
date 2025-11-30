import { logger } from '@/utils/logger'

export class StorageManager {
  private readonly TOKEN_KEY = 'bearerToken'
  private readonly AUTH_CLIENT_KEY = 'auth-client'

  saveToken(token: string): void {
    try {
      localStorage.setItem(this.TOKEN_KEY, token)
      document.cookie = `${this.TOKEN_KEY}=${token}; path=/; SameSite=Lax`
    } catch (error) {
      logger.error('StorageManager', 'Failed to save token', error)
    }
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY)
    } catch (error) {
      logger.error('StorageManager', 'Failed to get token', error)
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

  clearAll(): void {
    this.clearToken()
    this.clearAuthClient()
  }
}

export const storageManager = new StorageManager()
