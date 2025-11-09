/**
 * Session Synchronization Service
 * 
 * Synchronizes authentication state across browser tabs using localStorage events.
 * Detects login, logout, and token refresh events in other tabs.
 */

import type { StorageSyncEvent, AuthEventType, SessionSyncConfig } from '@/types/auth';

class SessionSyncService {
  private active = false;
  
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
      console.warn('[SessionSync] Already initialized');
      return;
    }

    window.addEventListener('storage', this.handleStorageEvent.bind(this));
    this.active = true;
    console.log('[SessionSync] Cross-tab session sync initialized');
  }

  /**
   * Stop session sync
   * 
   * Removes storage event listener
   */
  stop(): void {
    window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    this.active = false;
    console.log('[SessionSync] Cross-tab session sync stopped');
  }

  /**
   * Handle storage events from other tabs (T050-T051)
   * 
   * @param event - StorageEvent from browser
   */
  private handleStorageEvent(event: StorageEvent): void {
    // Only handle auth token changes from localStorage (T051)
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

    console.log('[SessionSync] Storage sync event detected:', syncEvent.eventType);
    this.processEvent(syncEvent);
  }

  /**
   * Derive event type from old/new values (T052)
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
   * Process sync event and update auth store (T053-T056)
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
          console.log('[SessionSync] Syncing login from another tab (T054)');
          authStore.setToken(event.newValue);
          
          // Fetch user info for the new token (T054)
          try {
            const { authService } = await import('@/services/auth/authService');
            const userInfo = await authService.fetchUserInfo();
            authStore.setUser(userInfo);
          } catch (error) {
            console.error('[SessionSync] Failed to fetch user info on login sync:', error);
          }
        }
        break;

      case 'logout':
        if (this.config.syncLogout) {
          console.log('[SessionSync] Syncing logout from another tab (T055)');
          authStore.clearAuth();
          authStore.openLoginModal();
        }
        break;

      case 'refresh':
        if (this.config.syncRefresh && event.newValue) {
          console.log('[SessionSync] Syncing token refresh from another tab (T056)');
          authStore.setToken(event.newValue);
        }
        break;

      default:
        console.warn('[SessionSync] Unknown storage sync event type');
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
