/**
 * Session Synchronization Service
 *
 * Synchronizes authentication state across browser tabs using localStorage events.
 * Detects login, logout, and token refresh events in other tabs.
 */

import type { StorageSyncEvent, AuthEventType, SessionSyncConfig } from '@/types/auth';
import { logger } from '@/utils/logger';

class SessionSyncService {
  private active = false;
  private boundHandler: ((e: StorageEvent) => void) | null = null;

  private config: SessionSyncConfig = {
    storageKey: 'bearerToken', // Match existing localStorage key
    syncLogin: true,
    syncLogout: true,
    syncRefresh: true,
    debounceMs: 100
  };

  /**
   * Initialize cross-tab session sync
   *
   * Sets up storage event listener to detect auth changes in other tabs
   */
  initialize(): void {
    if (this.active) {
      logger.warn('SessionSync', 'Already initialized');
      return;
    }

    this.boundHandler = this.handleStorageEvent.bind(this);
    window.addEventListener('storage', this.boundHandler);
    this.active = true;
    logger.info('SessionSync', 'Cross-tab session sync initialized');
  }

  /**
   * Stop session sync
   *
   * Removes storage event listener
   */
  stop(): void {
    if (this.boundHandler) {
      window.removeEventListener('storage', this.boundHandler);
      this.boundHandler = null;
    }
    this.active = false;
    logger.info('SessionSync', 'Cross-tab session sync stopped');
  }

  /**
   * Handle storage events from other tabs
   * 
   * @param event - StorageEvent from browser
   */
  private handleStorageEvent(event: StorageEvent): void {
    // Only handle auth token changes from localStorage
    if (event.key !== this.config.storageKey || event.storageArea !== localStorage) {
      return;
    }

    const syncEvent: StorageSyncEvent = {
      eventType: this.deriveEventType(event.oldValue, event.newValue),
      oldValue: event.oldValue,
      newValue: event.newValue,
      timestamp: new Date(),
      key: event.key
    };

    logger.debug('SessionSync', 'Storage sync event detected', syncEvent.eventType);
    this.processEvent(syncEvent);
  }

  /**
   * Derive event type from old/new values
   * 
   * @param oldValue - Previous token value
   * @param newValue - New token value
   * @returns Event type classification
   */
  private deriveEventType(oldValue: string | null, newValue: string | null): AuthEventType {
    if (!oldValue && newValue) return 'login';
    if (oldValue && !newValue) return 'logout';
    if (oldValue && newValue && oldValue !== newValue) return 'refresh';
    return 'unknown';
  }

  /**
   * Process sync event and update auth store
   * 
   * @param event - Parsed storage sync event
   */
  private async processEvent(event: StorageSyncEvent): Promise<void> {
    // Import auth store dynamically to avoid circular dependency
    const { useAuthStore } = await import('@/stores/auth');
    const authStore = useAuthStore();

    switch (event.eventType) {
      case 'login':
        if (this.config.syncLogin && event.newValue) {
          logger.info('SessionSync', 'Syncing login from another tab');
          authStore.setToken(event.newValue);
          
          // Fetch user info for the new token
          try {
            const { authService } = await import('@/services/auth/authService');
            const userInfo = await authService.fetchUserInfo();
            authStore.setUser(userInfo);
          } catch (error) {
            logger.error('SessionSync', 'Failed to fetch user info on login sync', error);
          }
        }
        break;

      case 'logout':
        if (this.config.syncLogout) {
          logger.info('SessionSync', 'Syncing logout from another tab');
          authStore.clearAuth();
          authStore.openLoginModal();
        }
        break;

      case 'refresh':
        if (this.config.syncRefresh && event.newValue) {
          logger.info('SessionSync', 'Syncing token refresh from another tab');
          authStore.setToken(event.newValue);
        }
        break;

      default:
        logger.warn('SessionSync', 'Unknown storage sync event type');
    }
  }

  /**
   * Check if session sync is active
   * 
   * @returns true if sync is running
   */
  isActive(): boolean {
    return this.active;
  }
}

export const sessionSyncService = new SessionSyncService();
