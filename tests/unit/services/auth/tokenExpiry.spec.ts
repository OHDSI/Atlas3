import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenExpiryService } from '@/services/auth/tokenExpiry';
import { createPinia, setActivePinia } from 'pinia';

// Create mock instances
const mockAuthStore = {
  showSessionExpiryModal: vi.fn(),
  hideSessionExpiryModal: vi.fn()
};

// Mock dependencies
vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: { getExpirationDate: vi.fn() }
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore)
}));

describe('TokenExpiryService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockAuthStore.showSessionExpiryModal.mockClear();
    mockAuthStore.hideSessionExpiryModal.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timer setup', () => {
    it('should setup expiry warning timer for valid token', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      // Token expires in 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('valid-token');

      const state = tokenExpiryService.getTimerState();
      expect(state.timerId).not.toBeNull();
      expect(state.expirationTime).toEqual(expiresAt);
      expect(state.warningShown).toBe(false);
    });

    it('should not setup timer for invalid token', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(null);

      tokenExpiryService.setupExpiryWarning('invalid-token');

      const state = tokenExpiryService.getTimerState();
      expect(state.timerId).toBeNull();
      expect(state.expirationTime).toBeNull();
    });

    it('should cancel existing timer when setting up new one', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      // First token
      const expires1 = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expires1);
      tokenExpiryService.setupExpiryWarning('token1');
      
      const state1 = tokenExpiryService.getTimerState();
      const timer1 = state1.timerId;
      expect(timer1).not.toBeNull();

      // Second token (should cancel first timer)
      const expires2 = new Date(Date.now() + 15 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expires2);
      tokenExpiryService.setupExpiryWarning('token2');

      const state2 = tokenExpiryService.getTimerState();
      expect(state2.timerId).not.toBe(timer1);
      expect(state2.expirationTime).toEqual(expires2);
    });
  });

  describe('Warning shown at correct time', () => {
    it('should show warning 5 minutes before expiration', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      // Token expires in 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');

      // Advance to 4 minutes - should not show warning yet
      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);
      expect(mockAuthStore.showSessionExpiryModal).not.toHaveBeenCalled();

      // Advance to 5 minutes (warning time) - should show warning
      await vi.advanceTimersByTimeAsync(1 * 60 * 1000);
      
      // Wait for async call
      await vi.waitFor(() => {
        expect(mockAuthStore.showSessionExpiryModal).toHaveBeenCalledWith(expiresAt);
      });
    });

    it('should show warning immediately if token already in warning window', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      // Token expires in 3 minutes (already past warning time)
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');

      // Wait for async call
      await vi.waitFor(() => {
        expect(mockAuthStore.showSessionExpiryModal).toHaveBeenCalledWith(expiresAt);
      });
    });

    it('should calculate warning time correctly', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');

      const state = tokenExpiryService.getTimerState();
      const expectedWarningTime = new Date(expiresAt.getTime() - 5 * 60 * 1000);
      
      expect(state.warningTime).toEqual(expectedWarningTime);
    });
  });

  describe('Duplicate warning prevention', () => {
    it('should not show warning twice for same token', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      // Using shared mockAuthStore
      
      // mockAuthStore already defined
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');

      // Advance to warning time
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockAuthStore.showSessionExpiryModal).toHaveBeenCalledTimes(1);

      // Try to show warning again manually
      tokenExpiryService.showExpiryWarning(expiresAt);
      
      // Should still be called only once
      expect(mockAuthStore.showSessionExpiryModal).toHaveBeenCalledTimes(1);
    });

    it('should update warningShown flag when warning is shown', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');

      let state = tokenExpiryService.getTimerState();
      expect(state.warningShown).toBe(false);

      // Advance to warning time
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      state = tokenExpiryService.getTimerState();
      expect(state.warningShown).toBe(true);
    });

    it('should allow warning for new token after cancellation', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      // Using shared mockAuthStore
      
      // mockAuthStore already defined
      
      // First token
      const expires1 = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expires1);
      tokenExpiryService.setupExpiryWarning('token1');
      
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockAuthStore.showSessionExpiryModal).toHaveBeenCalledTimes(1);

      // Cancel and setup new token
      tokenExpiryService.cancelExpiryWarning();
      
      const expires2 = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expires2);
      tokenExpiryService.setupExpiryWarning('token2');

      // Should allow warning for new token
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockAuthStore.showSessionExpiryModal).toHaveBeenCalledTimes(2);
    });
  });

  describe('Timer cancellation on token change', () => {
    it('should cancel timer on cancelExpiryWarning()', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');
      
      let state = tokenExpiryService.getTimerState();
      expect(state.timerId).not.toBeNull();

      tokenExpiryService.cancelExpiryWarning();

      state = tokenExpiryService.getTimerState();
      expect(state.timerId).toBeNull();
      expect(state.expirationTime).toBeNull();
      expect(state.warningTime).toBeNull();
      expect(state.warningShown).toBe(false);
    });

    it('should not trigger warning after cancellation', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager');
      // Using shared mockAuthStore
      
      // mockAuthStore already defined
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expiresAt);

      tokenExpiryService.setupExpiryWarning('token');
      
      // Cancel before warning time
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000);
      tokenExpiryService.cancelExpiryWarning();

      // Advance past warning time
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

      // Should not have shown warning
      expect(mockAuthStore.showSessionExpiryModal).not.toHaveBeenCalled();
    });

    it('should handle dismissExpiryWarning()', async () => {
      tokenExpiryService.dismissExpiryWarning();

      // Wait for async call
      await vi.waitFor(() => {
        expect(mockAuthStore.hideSessionExpiryModal).toHaveBeenCalled();
      });
    });
  });

  describe('State management', () => {
    it('should provide timer state snapshot', () => {
      const state = tokenExpiryService.getTimerState();

      expect(state).toHaveProperty('timerId');
      expect(state).toHaveProperty('expirationTime');
      expect(state).toHaveProperty('warningTime');
      expect(state).toHaveProperty('warningShown');
      expect(state).toHaveProperty('modalOpen');
    });
  });
});
