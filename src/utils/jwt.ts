/**
 * JWT Parsing Utilities
 * 
 * Utilities for parsing JWT tokens and extracting claims like expiration time.
 * Uses the jose library for secure token parsing with validation.
 */

import { decodeJwt } from 'jose';
import type { JWTPayload } from '@/types/auth';

/**
 * Extract expiration date from JWT token
 * 
 * @param token - JWT token string
 * @returns Date object representing token expiration, or null if parsing fails or exp claim missing
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const payload = decodeJwt(token) as JWTPayload;
    if (payload.exp) {
      return new Date(payload.exp * 1000); // Convert Unix timestamp to Date
    }
    return null;
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * 
 * @param token - JWT token string
 * @returns true if token is expired or unparseable, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true; // Treat unparseable tokens as expired
  return expiration.getTime() <= Date.now();
}

/**
 * Parse JWT token and return full payload
 * 
 * @param token - JWT token string
 * @returns JWT payload object, or null if parsing fails
 */
export function getTokenPayload(token: string): JWTPayload | null {
  try {
    return decodeJwt(token) as JWTPayload;
  } catch (error) {
    console.error('Failed to parse JWT:', error);
    return null;
  }
}
