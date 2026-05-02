import { decodeJwt } from 'jose'
import type { AuthToken, JWTPayload } from '@/models/auth.types'
import { logger } from '@/utils/logger'

export class TokenManager {
  parseToken(token: string): AuthToken | null {
    try {
      if (!this.isValidJWT(token)) {
        return null
      }

      const payload = decodeJwt(token) as JWTPayload
      const expirationDate = payload.exp ? new Date(payload.exp * 1000) : new Date(0)
      const isExpired = this.isTokenExpired(token)

      return {
        token,
        payload,
        expirationDate,
        isExpired,
      }
    } catch (error) {
      logger.error('TokenManager', 'Failed to parse token', error)
      return null
    }
  }

  isValidJWT(token: string): boolean {
    try {
      const parts = token.split('.')
      return parts.length === 3 && parts.every(p => p.length > 0)
    } catch {
      return false
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = decodeJwt(token)
      if (!payload.exp) return true
      return Date.now() >= payload.exp * 1000
    } catch {
      return true
    }
  }

  getExpirationDate(token: string): Date | null {
    try {
      const payload = decodeJwt(token)
      return payload.exp ? new Date(payload.exp * 1000) : null
    } catch {
      return null
    }
  }

  getTimeUntilExpiration(token: string): number {
    const expirationDate = this.getExpirationDate(token)
    if (!expirationDate) return 0
    return Math.max(0, expirationDate.getTime() - Date.now())
  }

  shouldRefresh(token: string, thresholdMs: number): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration(token)
    return timeUntilExpiration > 0 && timeUntilExpiration <= thresholdMs
  }
}

export const tokenManager = new TokenManager()
