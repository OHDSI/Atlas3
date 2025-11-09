/**
 * Unit Tests: Token Refresh Service
 * 
 * Tests for automatic token refresh with retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenRefreshService } from '@/services/auth/tokenRefresh';

// Mock dependencies
vi.mock('@/services/auth/authService', () => ({
  authService: {
    refreshToken: vi.fn()
  }
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    clearAuth: vi.fn(),
    openLoginModal: vi.fn()
  }))
}));

describe('TokenRefreshService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('T019: Successful token refresh', () => {
    it('should refresh token successfully', async () => {
      const { authService } = await import('@/services/auth/authService');
      vi.mocked(authService.refreshToken).mockResolvedValue(true);

      const result = await tokenRefreshService.refreshToken();

      expect(result).toBe(true);
      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
      
      const state = tokenRefreshService.getState();
      expect(state.isRefreshing).toBe(false);
      expect(state.lastRefreshTime).toBeInstanceOf(Date);
      expect(state.lastError).toBeNull();
      expect(state.retryCount).toBe(0);
    });

    it('should update state correctly on success', async () => {
      const { authService } = await import('@/services/auth/authService');
      vi.mocked(authService.refreshToken).mockResolvedValue(true);

      await tokenRefreshService.refreshToken();

      const state = tokenRefreshService.getState();
      expect(state.lastRefreshTime).not.toBeNull();
      expect(state.lastError).toBeNull();
    });
  });

  describe('T020: Exponential backoff retry logic', () => {
    it('should retry with exponential backoff (1s, 2s, 4s)', async () => {
      const { authService } = await import('@/services/auth/authService');
      
      // Mock to fail first 2 times, succeed on 3rd
      vi.mocked(authService.refreshToken)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);

      const refreshPromise = tokenRefreshService.refreshToken();

      // First retry after 1s
      await vi.advanceTimersByTimeAsync(1000);
      
      // Second retry after 2s more
      await vi.advanceTimersByTimeAsync(2000);
      
      // Should succeed now
      const result = await refreshPromise;
      
      expect(result).toBe(true);
      expect(authService.refreshToken).toHaveBeenCalledTimes(3);
    });

    it('should apply correct delay between retries', async () => {
      const { authService } = await import('@/services/auth/authService');
      
      vi.mocked(authService.refreshToken)
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(true);

      const startTime = Date.now();
      const refreshPromise = tokenRefreshService.refreshToken();

      // Advance through retries
      await vi.advanceTimersByTimeAsync(1000); // First retry
      await vi.advanceTimersByTimeAsync(2000); // Second retry
      
      await refreshPromise;
      
      // Total delay should be 1s + 2s = 3s
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('T021: Single in-flight request prevention', () => {
    it('should return same promise for concurrent refresh calls', async () => {
      const { authService } = await import('@/services/auth/authService');
      
      // Mock slow refresh (2 seconds)
      vi.mocked(authService.refreshToken).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 2000))
      );

      // Start multiple refreshes concurrently
      const promise1 = tokenRefreshService.refreshToken();
      const promise2 = tokenRefreshService.refreshToken();
      const promise3 = tokenRefreshService.refreshToken();

      // All should be the same promise
      expect(promise1).toBe(promise2);
      expect(promise2).toBe(promise3);

      // Advance time and wait for completion
      await vi.advanceTimersByTimeAsync(2000);
      await Promise.all([promise1, promise2, promise3]);

      // Should only call authService once
      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should allow new refresh after previous completes', async () => {
      const { authService } = await import('@/services/auth/authService');
      vi.mocked(authService.refreshToken).mockResolvedValue(true);

      // First refresh
      await tokenRefreshService.refreshToken();
      expect(authService.refreshToken).toHaveBeenCalledTimes(1);

      // Second refresh (should be a new call)
      await tokenRefreshService.refreshToken();
      expect(authService.refreshToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('T022: Max retry exceeded scenario', () => {
    it('should fail after max retries (3 attempts)', async () => {
      const { authService } = await import('@/services/auth/authService');
      const { useAuthStore } = await import('@/stores/auth');
      
      const mockAuthStore = useAuthStore();
      
      // Mock to always fail
      vi.mocked(authService.refreshToken).mockRejectedValue(new Error('Server error'));

      const refreshPromise = tokenRefreshService.refreshToken();

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(1000); // Retry 1
      await vi.advanceTimersByTimeAsync(2000); // Retry 2
      await vi.advanceTimersByTimeAsync(4000); // Retry 3

      // Should throw after max retries
      await expect(refreshPromise).rejects.toThrow('Server error');
      
      // Should have attempted 4 times total (initial + 3 retries)
      expect(authService.refreshToken).toHaveBeenCalledTimes(4);
      
      // Should trigger logout
      expect(mockAuthStore.clearAuth).toHaveBeenCalled();
      expect(mockAuthStore.openLoginModal).toHaveBeenCalled();
    });

    it('should update state with error on final failure', async () => {
      const { authService } = await import('@/services/auth/authService');
      
      const error = new Error('Persistent error');
      vi.mocked(authService.refreshToken).mockRejectedValue(error);

      const refreshPromise = tokenRefreshService.refreshToken();

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000);

      await expect(refreshPromise).rejects.toThrow();

      const state = tokenRefreshService.getState();
      expect(state.lastError).toBe(error);
      expect(state.lastFailureTime).toBeInstanceOf(Date);
    });
  });

  describe('State management', () => {
    it('should provide state snapshot via getState()', async () => {
      const state = tokenRefreshService.getState();

      expect(state).toHaveProperty('isRefreshing');
      expect(state).toHaveProperty('refreshPromise');
      expect(state).toHaveProperty('retryCount');
      expect(state).toHaveProperty('lastRefreshTime');
      expect(state).toHaveProperty('lastFailureTime');
      expect(state).toHaveProperty('lastError');
    });

    it('should not allow direct state mutation', async () => {
      const state1 = tokenRefreshService.getState();
      const state2 = tokenRefreshService.getState();

      // Should be different objects (copies)
      expect(state1).not.toBe(state2);
      
      // Mutating returned state should not affect service
      state1.isRefreshing = true;
      expect(tokenRefreshService.getState().isRefreshing).toBe(false);
    });
  });
});
