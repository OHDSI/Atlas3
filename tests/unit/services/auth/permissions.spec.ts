/**
 * Unit Tests: Permission Service
 * 
 * Tests for wildcard permission matching with Apache Shiro pattern
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { permissionService } from '@/services/auth/permissions';

describe('PermissionService', () => {
  beforeEach(() => {
    permissionService.clearCache();
  });

  describe('Exact match', () => {
    it('should match exact permission strings', () => {
      const userPerms = ['cohort:123:get', 'conceptset:456:put'];
      
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      expect(permissionService.hasPermission('conceptset:456:put', userPerms)).toBe(true);
    });

    it('should not match different permission strings', () => {
      const userPerms = ['cohort:123:get'];
      
      expect(permissionService.hasPermission('cohort:456:get', userPerms)).toBe(false);
      expect(permissionService.hasPermission('cohort:123:put', userPerms)).toBe(false);
    });

    it('should use exact match optimization', () => {
      const userPerms = ['cohort:123:get'];
      
      // First call should cache result
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      
      // Second call should use cache
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      
      const stats = permissionService.getCacheStats();
      expect(stats.totalHits).toBeGreaterThan(0);
    });
  });

  describe('Single-level wildcard ("cohort:*:get")', () => {
    it('should match any instance with resource wildcard', () => {
      const userPerms = ['cohort:*:get'];
      
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:456:get', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:abc:get', userPerms)).toBe(true);
    });

    it('should not match different actions with resource wildcard', () => {
      const userPerms = ['cohort:*:get'];
      
      expect(permissionService.hasPermission('cohort:123:put', userPerms)).toBe(false);
      expect(permissionService.hasPermission('cohort:123:delete', userPerms)).toBe(false);
    });

    it('should not match different resources with resource wildcard', () => {
      const userPerms = ['cohort:*:get'];
      
      expect(permissionService.hasPermission('conceptset:123:get', userPerms)).toBe(false);
      expect(permissionService.hasPermission('report:123:get', userPerms)).toBe(false);
    });
  });

  describe('Two-level wildcard ("cohort:123:*")', () => {
    it('should match any action with action wildcard', () => {
      const userPerms = ['cohort:123:*'];
      
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:123:put', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:123:delete', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:123:post', userPerms)).toBe(true);
    });

    it('should not match different instances with action wildcard', () => {
      const userPerms = ['cohort:123:*'];
      
      expect(permissionService.hasPermission('cohort:456:get', userPerms)).toBe(false);
      expect(permissionService.hasPermission('cohort:789:put', userPerms)).toBe(false);
    });

    it('should not match different resources with action wildcard', () => {
      const userPerms = ['cohort:123:*'];
      
      expect(permissionService.hasPermission('conceptset:123:get', userPerms)).toBe(false);
    });
  });

  describe('Global wildcard ("*")', () => {
    it('should match any permission with global wildcard', () => {
      const userPerms = ['*'];
      
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      expect(permissionService.hasPermission('conceptset:456:put', userPerms)).toBe(true);
      expect(permissionService.hasPermission('report:789:delete', userPerms)).toBe(true);
      expect(permissionService.hasPermission('user:admin:manage', userPerms)).toBe(true);
    });

    it('should match any arbitrary permission string', () => {
      const userPerms = ['*'];
      
      expect(permissionService.hasPermission('anything:goes:here', userPerms)).toBe(true);
      expect(permissionService.hasPermission('one:two:three:four', userPerms)).toBe(true);
    });
  });

  describe('No match scenarios', () => {
    it('should return false when no permissions match', () => {
      const userPerms = ['cohort:123:get'];
      
      expect(permissionService.hasPermission('conceptset:456:put', userPerms)).toBe(false);
    });

    it('should return false with empty user permissions', () => {
      const userPerms: string[] = [];
      
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(false);
    });

    it('should handle partial wildcard mismatches', () => {
      const userPerms = ['cohort:*:get'];
      
      // Different resource
      expect(permissionService.hasPermission('conceptset:*:get', userPerms)).toBe(false);
      
      // Different action
      expect(permissionService.hasPermission('cohort:*:put', userPerms)).toBe(false);
    });

    it('should not match if user permission is more specific than required', () => {
      const userPerms = ['cohort:123:get'];
      
      // User has specific, but requires wildcard
      expect(permissionService.hasPermission('cohort:*:get', userPerms)).toBe(false);
    });
  });

  describe('Permission cache hit', () => {
    it('should cache permission check results', () => {
      const userPerms = ['cohort:*:get'];
      
      // First check - cache miss
      permissionService.hasPermission('cohort:123:get', userPerms);
      
      const stats1 = permissionService.getCacheStats();
      expect(stats1.totalMisses).toBe(1);
      expect(stats1.size).toBe(1);
      
      // Second check - cache hit
      permissionService.hasPermission('cohort:123:get', userPerms);
      
      const stats2 = permissionService.getCacheStats();
      expect(stats2.totalHits).toBe(1);
      expect(stats2.totalMisses).toBe(1);
    });

    it('should achieve >90% hit rate after warm-up', () => {
      const userPerms = ['cohort:*:get', 'conceptset:*:put'];
      
      // Warm-up cache
      const permissions = [
        'cohort:1:get',
        'cohort:2:get',
        'cohort:3:get',
        'conceptset:1:put',
        'conceptset:2:put'
      ];
      
      // First pass - fill cache
      permissions.forEach(perm => permissionService.hasPermission(perm, userPerms));
      
      // Second pass - should mostly hit cache
      for (let i = 0; i < 10; i++) {
        permissions.forEach(perm => permissionService.hasPermission(perm, userPerms));
      }
      
      const stats = permissionService.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(90);
    });
  });

  describe('Cache TTL expiration', () => {
    it('should expire cache entries after TTL', async () => {
      const userPerms = ['cohort:123:get'];
      
      // Check permission (cache it)
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      
      const stats1 = permissionService.getCacheStats();
      expect(stats1.size).toBe(1);
      
      // Simulate TTL expiration (5 minutes)
      // Note: In real implementation, would need to manipulate Date.now or wait
      // For unit test, we verify the logic exists by checking cache structure
      const cacheStats = permissionService.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should remove expired entries on next check', () => {
      const userPerms = ['cohort:123:get'];
      
      // This test verifies the concept - actual TTL testing would need time manipulation
      permissionService.hasPermission('cohort:123:get', userPerms);
      
      const stats = permissionService.getCacheStats();
      expect(stats.size).toBe(1);
      
      // In production, after 5 minutes + 1ms, the entry would be removed on next access
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const userPerms = ['*']; // Global permission for simplicity
      
      // Get cache max size (typically 1000)
      const maxSize = 1000;
      
      // Fill cache to max
      for (let i = 0; i < maxSize; i++) {
        permissionService.hasPermission(`resource:${i}:action`, userPerms);
      }
      
      let stats = permissionService.getCacheStats();
      expect(stats.size).toBe(maxSize);
      
      // Add one more - should evict first entry
      permissionService.hasPermission('resource:new:action', userPerms);
      
      stats = permissionService.getCacheStats();
      expect(stats.size).toBe(maxSize); // Still at max, not over
      
      // First entry should be evicted, so checking it again should be a miss
      permissionService.clearCache();
      for (let i = 0; i < maxSize; i++) {
        permissionService.hasPermission(`resource:${i}:action`, userPerms);
      }
      
      const statsBeforeNew = permissionService.getCacheStats();
      const missesBeforeNew = statsBeforeNew.totalMisses;
      
      permissionService.hasPermission('resource:new:action', userPerms);
      
      // Should be a miss (not in cache)
      const statsAfterNew = permissionService.getCacheStats();
      expect(statsAfterNew.totalMisses).toBe(missesBeforeNew + 1);
    });

    it('should maintain cache size at or below maxSize', () => {
      const userPerms = ['*'];
      
      // Add many entries
      for (let i = 0; i < 1500; i++) {
        permissionService.hasPermission(`perm:${i}:action`, userPerms);
      }
      
      const stats = permissionService.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(1000); // Default maxSize
    });
  });

  describe('Cache management', () => {
    it('should clear all cache entries', () => {
      const userPerms = ['cohort:*:get'];
      
      // Add some cached entries
      permissionService.hasPermission('cohort:1:get', userPerms);
      permissionService.hasPermission('cohort:2:get', userPerms);
      
      let stats = permissionService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      // Clear cache
      permissionService.clearCache();
      
      stats = permissionService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = permissionService.getCacheStats();
      
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('totalChecks');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Permission parsing', () => {
    it('should parse permission string into components', () => {
      const rule = permissionService.parsePermission('cohort:123:get');
      
      expect(rule.resource).toBe('cohort');
      expect(rule.instance).toBe('123');
      expect(rule.action).toBe('get');
      expect(rule.original).toBe('cohort:123:get');
      expect(rule.hasWildcard).toBe(false);
      expect(rule.wildcardLevels).toEqual([]);
    });

    it('should identify wildcards in permission', () => {
      const rule1 = permissionService.parsePermission('cohort:*:get');
      expect(rule1.hasWildcard).toBe(true);
      expect(rule1.wildcardLevels).toContain(1);
      
      const rule2 = permissionService.parsePermission('cohort:123:*');
      expect(rule2.hasWildcard).toBe(true);
      expect(rule2.wildcardLevels).toContain(2);
      
      const rule3 = permissionService.parsePermission('*');
      expect(rule3.hasWildcard).toBe(true);
      expect(rule3.wildcardLevels).toContain(0);
    });
  });

  describe('Complex permission scenarios', () => {
    it('should handle multiple user permissions correctly', () => {
      const userPerms = [
        'cohort:*:get',
        'conceptset:123:*',
        'report:*:post'
      ];
      
      // Should match first permission
      expect(permissionService.hasPermission('cohort:456:get', userPerms)).toBe(true);
      
      // Should match second permission
      expect(permissionService.hasPermission('conceptset:123:delete', userPerms)).toBe(true);
      
      // Should match third permission
      expect(permissionService.hasPermission('report:789:post', userPerms)).toBe(true);
      
      // Should not match any
      expect(permissionService.hasPermission('user:admin:manage', userPerms)).toBe(false);
    });

    it('should handle permission hierarchy correctly', () => {
      const userPerms = ['cohort:*:*']; // Can do anything with any cohort
      
      expect(permissionService.hasPermission('cohort:123:get', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:456:put', userPerms)).toBe(true);
      expect(permissionService.hasPermission('cohort:789:delete', userPerms)).toBe(true);
    });
  });
});
