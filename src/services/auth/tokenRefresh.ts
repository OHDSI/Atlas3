/**
 * Token Refresh Service
 * 
 * Handles automatic token refresh with retry logic and prevents duplicate requests.
 * Implements exponential backoff retry pattern.
 */

import type { TokenRefreshState, TokenRefreshConfig } from '@/types/auth';

class TokenRefreshService {
  private state: TokenRefreshState = {
    isRefreshing: false,
    refreshPromise: null,
    retryCount: 0,
    lastRefreshTime: null,
    lastFailureTime: null,
    lastError: null
  };

  private config: TokenRefreshConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    refreshBufferMinutes: 5,
    refreshEndpoint: '/user/refresh',
    tokenHeader: 'bearer'
  };

  /**
   * Refresh authentication token
   * 
   * Implements single in-flight request pattern - if refresh is already in progress,
   * returns the existing promise instead of creating a new request.
   * 
   * @param retryCount - Number of retry attempts (internal use)
   * @returns Promise resolving to true if successful, false otherwise
   */
  async refreshToken(retryCount = 0): Promise<boolean> {
    // Return existing promise if refresh already in progress
    if (this.state.refreshPromise) {
      console.log('[TokenRefresh] Refresh already in progress, returning existing promise');
      return this.state.refreshPromise;
    }

    this.state.isRefreshing = true;
    this.state.retryCount = retryCount;
    this.state.refreshPromise = this.executeRefresh(retryCount);

    try {
      const result = await this.state.refreshPromise;
      return result;
    } finally {
      this.state.isRefreshing = false;
      this.state.refreshPromise = null;
    }
  }

  /**
   * Execute token refresh with exponential backoff retry
   * 
   * @param retryCount - Current retry attempt number
   * @returns Promise resolving to true if successful, false otherwise
   */
  private async executeRefresh(retryCount: number): Promise<boolean> {
    try {
      console.log(`[TokenRefresh] Attempting token refresh (attempt ${retryCount + 1}/${this.config.maxRetries + 1})`);
      
      // Import authService to call refresh endpoint
      const { authService } = await import('@/services/auth/authService');
      const success = await authService.refreshToken();

      if (success) {
        this.state.lastRefreshTime = new Date();
        this.state.lastError = null;
        this.state.retryCount = 0;
        console.log('[TokenRefresh] Token refreshed successfully');
        return true;
      }

      throw new Error('No token in refresh response');
    } catch (error) {
      this.state.lastFailureTime = new Date();
      this.state.lastError = error as Error;

      // Retry with exponential backoff
      if (retryCount < this.config.maxRetries) {
        const delayMs = this.config.baseDelayMs * Math.pow(2, retryCount);
        console.log(`[TokenRefresh] Refresh failed, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.refreshToken(retryCount + 1);
      }

      console.error('[TokenRefresh] Token refresh failed after max retries:', error);
      
      // Force logout on final failure
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      authStore.clearAuth();
      authStore.openLoginModal();
      
      throw error;
    }
  }

  /**
   * Get current refresh state for debugging and monitoring
   * 
   * @returns Copy of current token refresh state
   */
  getState(): TokenRefreshState {
    return { ...this.state };
  }
}

export const tokenRefreshService = new TokenRefreshService();
