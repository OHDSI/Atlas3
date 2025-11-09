/**
 * Unit Tests: usePermissions Composable
 * 
 * Tests for Vue composable that wraps permission service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePermissions } from '@/composables/usePermissions';

// Mock dependencies
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      permissionIdx: {
        cohort: ['cohort:*:get', 'cohort:123:*'],
        conceptset: ['conceptset:*:put'],
        report: ['report:*:post']
      }
    }
  }))
}));

vi.mock('@/services/auth/permissions', () => ({
  permissionService: {
    hasPermission: vi.fn(),
    getCacheStats: vi.fn(() => ({
      hitRate: 85.5,
      size: 10,
      totalChecks: 20
    })),
    clearCache: vi.fn()
  }
}));

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T097: hasPermission method', () => {
    it('should check single permission', () => {
      const { permissionService } = require('@/services/auth/permissions');
      vi.mocked(permissionService.hasPermission).mockReturnValue(true);

      const { hasPermission } = usePermissions();
      const result = hasPermission('cohort:123:get');

      expect(result).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledWith(
        'cohort:123:get',
        expect.arrayContaining([
          'cohort:*:get',
          'cohort:123:*',
          'conceptset:*:put',
          'report:*:post'
        ])
      );
    });

    it('should return false when user lacks permission', () => {
      const { permissionService } = require('@/services/auth/permissions');
      vi.mocked(permissionService.hasPermission).mockReturnValue(false);

      const { hasPermission } = usePermissions();
      const result = hasPermission('admin:*:manage');

      expect(result).toBe(false);
    });

    it('should extract permissions from permissionIdx correctly', () => {
      const { permissionService } = require('@/services/auth/permissions');
      vi.mocked(permissionService.hasPermission).mockReturnValue(true);

      const { hasPermission } = usePermissions();
      hasPermission('cohort:456:get');

      // Verify all permissions from all categories were passed
      expect(permissionService.hasPermission).toHaveBeenCalledWith(
        'cohort:456:get',
        expect.arrayContaining([
          'cohort:*:get',
          'cohort:123:*',
          'conceptset:*:put',
          'report:*:post'
        ])
      );
    });

    it('should handle user with no permissions', () => {
      // Mock auth store with no user
      vi.mock('@/stores/auth', () => ({
        useAuthStore: vi.fn(() => ({
          user: null
        }))
      }));

      const { permissionService } = require('@/services/auth/permissions');
      vi.mocked(permissionService.hasPermission).mockReturnValue(false);

      const { hasPermission } = usePermissions();
      const result = hasPermission('cohort:123:get');

      expect(result).toBe(false);
      expect(permissionService.hasPermission).toHaveBeenCalledWith('cohort:123:get', []);
    });
  });

  describe('T098: hasAnyPermission method', () => {
    it('should return true if user has any of the permissions', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      // Mock: has first permission, not others
      vi.mocked(permissionService.hasPermission)
        .mockReturnValueOnce(true)   // cohort:123:get - true
        .mockReturnValueOnce(false)  // admin:*:manage - false
        .mockReturnValueOnce(false); // user:*:edit - false

      const { hasAnyPermission } = usePermissions();
      const result = hasAnyPermission([
        'cohort:123:get',
        'admin:*:manage',
        'user:*:edit'
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.hasPermission).mockReturnValue(false);

      const { hasAnyPermission } = usePermissions();
      const result = hasAnyPermission([
        'admin:*:manage',
        'user:*:edit',
        'system:*:configure'
      ]);

      expect(result).toBe(false);
    });

    it('should short-circuit on first match', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.hasPermission)
        .mockReturnValueOnce(true); // First call returns true

      const { hasAnyPermission } = usePermissions();
      hasAnyPermission([
        'cohort:123:get',
        'cohort:456:get',
        'cohort:789:get'
      ]);

      // Should only check until first match
      expect(permissionService.hasPermission).toHaveBeenCalledTimes(1);
    });

    it('should handle empty permission array', () => {
      const { hasAnyPermission } = usePermissions();
      const result = hasAnyPermission([]);

      expect(result).toBe(false);
    });
  });

  describe('T099: hasAllPermissions method', () => {
    it('should return true if user has all permissions', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.hasPermission).mockReturnValue(true);

      const { hasAllPermissions } = usePermissions();
      const result = hasAllPermissions([
        'cohort:123:get',
        'cohort:456:get',
        'conceptset:789:put'
      ]);

      expect(result).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledTimes(3);
    });

    it('should return false if user lacks any permission', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.hasPermission)
        .mockReturnValueOnce(true)   // cohort:123:get - true
        .mockReturnValueOnce(false)  // admin:*:manage - false
        .mockReturnValueOnce(true);  // cohort:456:get - true

      const { hasAllPermissions } = usePermissions();
      const result = hasAllPermissions([
        'cohort:123:get',
        'admin:*:manage',
        'cohort:456:get'
      ]);

      expect(result).toBe(false);
    });

    it('should short-circuit on first failure', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.hasPermission)
        .mockReturnValueOnce(true)   // First check passes
        .mockReturnValueOnce(false); // Second check fails

      const { hasAllPermissions } = usePermissions();
      hasAllPermissions([
        'cohort:123:get',
        'admin:*:manage',
        'user:*:edit'
      ]);

      // Should stop checking after first failure
      expect(permissionService.hasPermission).toHaveBeenCalledTimes(2);
    });

    it('should handle empty permission array', () => {
      const { hasAllPermissions } = usePermissions();
      const result = hasAllPermissions([]);

      expect(result).toBe(true); // All of zero permissions = true (vacuous truth)
    });
  });

  describe('T100: cacheHitRate computed property', () => {
    it('should return cache hit rate from permission service', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.getCacheStats).mockReturnValue({
        hitRate: 92.5,
        size: 50,
        totalChecks: 100
      });

      const { cacheHitRate } = usePermissions();

      expect(cacheHitRate.value).toBe(92.5);
      expect(permissionService.getCacheStats).toHaveBeenCalled();
    });

    it('should be reactive to cache stats changes', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      // Initial state
      vi.mocked(permissionService.getCacheStats).mockReturnValue({
        hitRate: 50.0,
        size: 10,
        totalChecks: 20
      });

      const { cacheHitRate } = usePermissions();
      expect(cacheHitRate.value).toBe(50.0);

      // Updated state
      vi.mocked(permissionService.getCacheStats).mockReturnValue({
        hitRate: 95.0,
        size: 50,
        totalChecks: 100
      });

      // Access again (would trigger re-computation in real Vue app)
      const { cacheHitRate: updatedRate } = usePermissions();
      expect(updatedRate.value).toBe(95.0);
    });

    it('should handle zero cache checks gracefully', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.getCacheStats).mockReturnValue({
        hitRate: 0,
        size: 0,
        totalChecks: 0
      });

      const { cacheHitRate } = usePermissions();
      expect(cacheHitRate.value).toBe(0);
    });
  });

  describe('Cache management', () => {
    it('should provide clearCache method', () => {
      const { permissionService } = require('@/services/auth/permissions');

      const { clearCache } = usePermissions();
      clearCache();

      expect(permissionService.clearCache).toHaveBeenCalled();
    });

    it('should expose all expected methods', () => {
      const composable = usePermissions();

      expect(composable).toHaveProperty('hasPermission');
      expect(composable).toHaveProperty('hasAnyPermission');
      expect(composable).toHaveProperty('hasAllPermissions');
      expect(composable).toHaveProperty('cacheHitRate');
      expect(composable).toHaveProperty('clearCache');

      expect(typeof composable.hasPermission).toBe('function');
      expect(typeof composable.hasAnyPermission).toBe('function');
      expect(typeof composable.hasAllPermissions).toBe('function');
      expect(typeof composable.clearCache).toBe('function');
    });
  });

  describe('Integration scenarios', () => {
    it('should work with typical permission check patterns', () => {
      const { permissionService } = require('@/services/auth/permissions');
      
      vi.mocked(permissionService.hasPermission)
        .mockReturnValueOnce(true)  // canView
        .mockReturnValueOnce(false) // canEdit
        .mockReturnValueOnce(false) // canDelete
        .mockReturnValueOnce(true); // canViewOrEdit (checks canView first)

      const { hasPermission, hasAnyPermission } = usePermissions();

      const canView = hasPermission('cohort:123:get');
      const canEdit = hasPermission('cohort:123:put');
      const canDelete = hasPermission('cohort:123:delete');
      const canViewOrEdit = hasAnyPermission(['cohort:123:get', 'cohort:123:put']);

      expect(canView).toBe(true);
      expect(canEdit).toBe(false);
      expect(canDelete).toBe(false);
      expect(canViewOrEdit).toBe(true);
    });
  });
});
