/**
 * SessionExpiryModal Component Interface
 * 
 * Type definitions specifically for the SessionExpiryModal Vue component
 * that displays the expiry warning and handles user actions.
 */

import type { Component } from 'vue';

/**
 * Props interface for SessionExpiryModal.vue
 * 
 * @example
 * ```vue
 * <SessionExpiryModal
 *   :visible="expiryModalOpen"
 *   :expires-at="sessionExpiresAt"
 *   :remaining-seconds="remainingTime"
 *   :is-extending="isRefreshing"
 *   :extension-error="refreshError"
 *   @extend="handleExtend"
 *   @logout="handleLogout"
 *   @dismiss="handleDismiss"
 * />
 * ```
 */
export interface SessionExpiryModalProps {
  /**
   * Controls modal visibility
   *
   * Should be bound to reactive state that updates when:
   * - Expiry warning timer fires
   * - User extends session (closes modal)
   * - User logs out (closes modal)
   * - Token expires (replaced by login modal)
   */
  modelValue: boolean;

  /**
   * Timestamp when the session will expire
   * 
   * Extracted from JWT exp claim.
   * Used to calculate remaining time display.
   */
  expiresAt: Date;

  /**
   * Remaining seconds until session expires
   * 
   * Updated every second while modal is open.
   * When reaches 0, should trigger logout automatically.
   */
  remainingSeconds: number;

  /**
   * Whether the extend session operation is in progress
   * 
   * Used to show loading spinner on "Extend Session" button
   * and disable buttons during operation.
   */
  isExtending: boolean;

  /**
   * Error message if session extension failed
   * 
   * Displayed as alert/banner in modal with retry option.
   * Cleared when user retries or dismisses modal.
   * 
   * @example "Failed to extend session. Network error."
   */
  extensionError: string | null;
}

/**
 * Events emitted by SessionExpiryModal component
 */
export interface SessionExpiryModalEmits {
  /**
   * Emitted when user clicks "Extend Session" button
   * 
   * Parent should:
   * 1. Set isExtending=true
   * 2. Call token refresh service
   * 3. On success: close modal, clear error
   * 4. On failure: show extensionError, keep modal open
   */
  (event: 'extend'): void;

  /**
   * Emitted when user clicks "Logout" button
   * 
   * Parent should:
   * 1. Call auth store logout()
   * 2. Close expiry modal
   * 3. Show login modal
   * 4. Clear all timers
   */
  (event: 'logout'): void;

  /**
   * Emitted when modal is dismissed via X button or ESC key
   * 
   * Parent should treat as implicit "Extend Session":
   * 1. Attempt token refresh
   * 2. Close modal
   * 3. If refresh fails, show error and reopen modal
   */
  (event: 'dismiss'): void;

  /**
   * Emitted when countdown reaches 0 (time expired)
   * 
   * Parent should:
   * 1. Force logout
   * 2. Close expiry modal
   * 3. Show login modal
   * 4. Display "Session expired" message
   */
  (event: 'expired'): void;
}

/**
 * Slots available in SessionExpiryModal component
 */
export interface SessionExpiryModalSlots {
  /**
   * Custom header content
   * 
   * Default: "Session Expiring Soon"
   */
  header?: Component;

  /**
   * Custom message/description
   * 
   * Default: Shows remaining time and prompt to extend
   */
  message?: Component;

  /**
   * Custom footer/actions
   * 
   * Default: "Extend Session" and "Logout" buttons
   */
  actions?: Component;

  /**
   * Custom error display
   * 
   * Default: Alert banner with error message
   */
  error?: Component;
}

/**
 * Internal state managed by SessionExpiryModal component
 */
export interface SessionExpiryModalState {
  /**
   * Interval ID for countdown timer
   * Updates remainingSeconds every second
   */
  countdownInterval: NodeJS.Timeout | null;

  /**
   * Local copy of remaining seconds
   * Computed from expiresAt - now, updated every second
   */
  localRemainingSeconds: number;

  /**
   * Whether modal is being dismissed (closing animation)
   */
  isDismissing: boolean;

  /**
   * Whether extend operation completed successfully
   * Used to show brief success message before closing
   */
  extendSuccess: boolean;
}

/**
 * Methods exposed by SessionExpiryModal component ref
 * 
 * @example
 * ```typescript
 * const modalRef = ref<SessionExpiryModalRef>();
 * 
 * // Force update remaining time
 * modalRef.value?.updateRemainingTime();
 * 
 * // Programmatically show modal
 * modalRef.value?.show();
 * ```
 */
export interface SessionExpiryModalRef {
  /**
   * Manually update the remaining time display
   * Useful if parent needs to force sync
   */
  updateRemainingTime(): void;

  /**
   * Programmatically show the modal
   */
  show(): void;

  /**
   * Programmatically hide the modal
   */
  hide(): void;

  /**
   * Reset modal state (clear errors, reset countdown)
   */
  reset(): void;
}

/**
 * Vuetify theme options for the modal
 */
export interface SessionExpiryModalTheme {
  /**
   * Modal background color
   * Default: Uses theme surface color
   */
  backgroundColor?: string;

  /**
   * Warning icon color
   * Default: 'warning' from theme
   */
  iconColor?: string;

  /**
   * Extend button color
   * Default: 'primary' from theme
   */
  primaryButtonColor?: string;

  /**
   * Logout button color
   * Default: 'error' from theme
   */
  secondaryButtonColor?: string;

  /**
   * Countdown text color
   * Default: 'warning' when >60s, 'error' when <60s
   */
  countdownColor?: string;
}

/**
 * Configuration options for SessionExpiryModal
 */
export interface SessionExpiryModalConfig {
  /**
   * Show countdown in header
   * Default: true
   */
  showCountdown: boolean;

  /**
   * Show warning icon
   * Default: true
   */
  showIcon: boolean;

  /**
   * Enable keyboard shortcuts
   * - Enter: Extend session
   * - ESC: Dismiss (extend)
   * Default: true
   */
  enableKeyboardShortcuts: boolean;

  /**
   * Auto-focus "Extend Session" button when modal opens
   * Default: true
   */
  autoFocusExtendButton: boolean;

  /**
   * Show logout button
   * Set false to only allow session extension
   * Default: true
   */
  showLogoutButton: boolean;

  /**
   * Modal width (CSS value)
   * Default: '480px'
   */
  width: string;

  /**
   * Modal max-width (CSS value)
   * Default: '90vw'
   */
  maxWidth: string;

  /**
   * Z-index for modal overlay
   * Default: 2000
   */
  zIndex: number;

  /**
   * Whether modal can be dismissed by clicking overlay
   * Default: false (must explicitly extend or logout)
   */
  persistent: boolean;
}

/**
 * Type for countdown formatting function
 */
export type CountdownFormatter = (seconds: number) => string;

/**
 * Default countdown formatter
 * 
 * @example
 * formatCountdown(125) // "2m 5s"
 * formatCountdown(45) // "45s"
 */
export const defaultCountdownFormatter: CountdownFormatter = (seconds: number): string => {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
  return `${seconds}s`;
};

/**
 * Accessibility (a11y) configuration
 */
export interface SessionExpiryModalA11y {
  /**
   * ARIA label for modal
   * Default: "Session expiring soon"
   */
  modalLabel: string;

  /**
   * ARIA label for extend button
   * Default: "Extend session"
   */
  extendButtonLabel: string;

  /**
   * ARIA label for logout button
   * Default: "Logout"
   */
  logoutButtonLabel: string;

  /**
   * ARIA label for close button
   * Default: "Dismiss and extend session"
   */
  closeButtonLabel: string;

  /**
   * ARIA live region for countdown
   * Default: "polite"
   */
  countdownLiveRegion: 'off' | 'polite' | 'assertive';

  /**
   * Announce countdown changes every N seconds
   * Default: 30 (announce at 30s intervals)
   */
  announceInterval: number;
}
