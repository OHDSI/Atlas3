/**
 * Permission Service
 * 
 * Handles permission checking with Apache Shiro-style wildcard matching.
 * Implements LRU cache with TTL for performance optimization.
 */

import type { PermissionRule, PermissionCache, PermissionCacheEntry } from '@/types/auth';

class PermissionService {
  private cache: PermissionCache = {
    entries: new Map(),
    totalHits: 0,
    totalMisses: 0,
    lastClearedAt: null,
    maxSize: 1000,
    ttlMs: 5 * 60 * 1000 // 5 minutes
  };

  /**
   * Check if user has a specific permission
   * 
   * @param requiredPermission - Permission string to check (e.g., "cohort:123:get")
   * @param userPermissions - Array of user's permission strings
   * @returns true if user has permission, false otherwise
   */
  hasPermission(requiredPermission: string, userPermissions: string[]): boolean {
    // Check cache first (T073)
    const cached = this.getCachedResult(requiredPermission);
    if (cached !== null) {
      this.cache.totalHits++;
      return cached;
    }

    this.cache.totalMisses++;

    // Check for exact match optimization (T073)
    if (userPermissions.includes(requiredPermission)) {
      this.cacheResult(requiredPermission, true);
      return true;
    }

    // Check for global wildcard (T074)
    if (userPermissions.includes('*')) {
      this.cacheResult(requiredPermission, true);
      return true;
    }

    // Check each user permission for wildcard match (T075)
    const result = userPermissions.some(userPerm =>
      this.checkWildcardMatch(userPerm, requiredPermission)
    );

    // Cache result
    this.cacheResult(requiredPermission, result);

    return result;
  }

  /**
   * Check wildcard match between user permission and required permission
   * 
   * Implements Apache Shiro-style pattern matching with colon separator.
   * 
   * @param userPerm - User's permission (may contain wildcards)
   * @param requiredPerm - Required permission (typically specific)
   * @returns true if user permission matches required permission
   */
  checkWildcardMatch(userPerm: string, requiredPerm: string): boolean {
    // Exact match
    if (userPerm === requiredPerm) return true;

    // Global wildcard
    if (userPerm === '*') return true;

    const userLevels = userPerm.split(':');
    const requiredLevels = requiredPerm.split(':');

    // Compare each level (T075)
    for (let i = 0; i < Math.max(userLevels.length, requiredLevels.length); i++) {
      const userLevel = userLevels[i] || '';
      const requiredLevel = requiredLevels[i] || '';

      // User has wildcard at this level - match
      if (userLevel === '*') continue;

      // Required is wildcard - match
      if (requiredLevel === '*') continue;

      // Exact match at this level - continue
      if (userLevel === requiredLevel) continue;

      // No match at this level - fail
      return false;
    }

    return true;
  }

  /**
   * Parse permission string into rule object (T071)
   * 
   * @param permission - Permission string (e.g., "cohort:123:get")
   * @returns Parsed permission rule
   */
  parsePermission(permission: string): PermissionRule {
    const parts = permission.split(':');
    const resource = parts[0] || '';
    const instance = parts[1] || '';
    const action = parts[2] || '';

    const wildcardLevels: number[] = [];
    if (resource === '*') wildcardLevels.push(0);
    if (instance === '*') wildcardLevels.push(1);
    if (action === '*') wildcardLevels.push(2);

    return {
      original: permission,
      resource,
      instance,
      action,
      hasWildcard: wildcardLevels.length > 0,
      wildcardLevels
    };
  }

  /**
   * Get cached permission check result (T076-T077)
   * 
   * @param permission - Permission string
   * @returns Cached result or null if not found/expired
   */
  private getCachedResult(permission: string): boolean | null {
    const entry = this.cache.entries.get(permission);
    if (!entry) return null;

    // Check TTL (T077)
    const now = Date.now();
    if (now >= entry.expiresAt.getTime()) {
      this.cache.entries.delete(permission);
      return null;
    }

    entry.hitCount++;
    return entry.result;
  }

  /**
   * Cache permission check result (T076-T078)
   * 
   * @param permission - Permission string
   * @param result - Check result to cache
   */
  private cacheResult(permission: string, result: boolean): void {
    // LRU eviction if at capacity (T078)
    if (this.cache.entries.size >= this.cache.maxSize) {
      const firstKey = this.cache.entries.keys().next().value as string;
      if (firstKey) {
        this.cache.entries.delete(firstKey);
      }
    }

    const now = new Date();
    const entry: PermissionCacheEntry = {
      result,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + this.cache.ttlMs),
      hitCount: 0
    };

    this.cache.entries.set(permission, entry);
  }

  /**
   * Clear permission cache (T079)
   * 
   * Should be called on login, logout, or token refresh
   */
  clearCache(): void {
    this.cache.entries.clear();
    this.cache.totalHits = 0;
    this.cache.totalMisses = 0;
    this.cache.lastClearedAt = new Date();
  }

  /**
   * Get cache statistics (T080)
   * 
   * @returns Cache hit rate and size metrics
   */
  getCacheStats() {
    const totalChecks = this.cache.totalHits + this.cache.totalMisses;
    const hitRate = totalChecks > 0 ? (this.cache.totalHits / totalChecks) * 100 : 0;

    return {
      hitRate,
      size: this.cache.entries.size,
      totalChecks
    };
  }
}

export const permissionService = new PermissionService();
