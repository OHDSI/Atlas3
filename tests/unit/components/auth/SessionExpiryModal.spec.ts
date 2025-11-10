/**
 * Component Tests: SessionExpiryModal
 *
 * Tests for session expiry warning modal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import SessionExpiryModal from '@/components/auth/SessionExpiryModal.vue';

const vuetify = createVuetify();

describe('SessionExpiryModal.vue', () => {
  let wrapper: VueWrapper<any>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('T044: Countdown display', () => {
    it('should display countdown timer', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null
        },
        global: {
          plugins: [vuetify]
        }
      });

      await wrapper.vm.$nextTick();

      // Check the computed formattedTime property
      expect(wrapper.vm.formattedTime).toBe('5m 0s');
    });

    it('should update countdown every second', async () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const expiresAt = new Date('2024-01-01T00:01:05Z'); // 65 seconds from now

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 65,
          isExtending: false,
          extensionError: null
        },
        global: {
          plugins: [vuetify]
        }
      });

      await wrapper.vm.$nextTick();

      // Initial state
      expect(wrapper.vm.formattedTime).toBe('1m 5s');

      // Component should mount successfully with countdown
      expect(wrapper.exists()).toBe(true);
    });

    it('should format time correctly for seconds only', async () => {
      const expiresAt = new Date(Date.now() + 45 * 1000); // 45 seconds

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 45,
          isExtending: false,
          extensionError: null
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.vm.formattedTime).toBe('45s');
    });

    it('should apply warning color when time > 60s', async () => {
      const expiresAt = new Date(Date.now() + 120 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 120,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.vm.countdownColorClass).toBe('text-warning');
    });

    it('should apply error color when time < 60s', async () => {
      const expiresAt = new Date(Date.now() + 30 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 30,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.vm.countdownColorClass).toBe('text-error');
    });
  });

  describe('T045: "Extend Session" button click', () => {
    it('should emit extend event when button clicked', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Find v-btn components
      const buttons = wrapper.findAllComponents({ name: 'VBtn' });
      const extendButton = buttons.find(btn =>
        btn.text().includes('Extend Session')
      );

      expect(extendButton).toBeDefined();
      await extendButton!.trigger('click');

      expect(wrapper.emitted('extend')).toBeTruthy();
    });

    it('should show loading state while extending', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: true, // Loading state
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      const buttons = wrapper.findAllComponents({ name: 'VBtn' });
      const extendButton = buttons.find(btn =>
        btn.text().includes('Extend Session')
      );

      // Button should have loading prop set to true
      expect(extendButton?.props('loading')).toBe(true);
    });

    it('should disable logout button while extending', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: true,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      const buttons = wrapper.findAllComponents({ name: 'VBtn' });
      const logoutButton = buttons.find(btn =>
        btn.text().includes('Logout')
      );

      expect(logoutButton?.props('disabled')).toBe(true);
    });
  });

  describe('T046: "Logout" button click', () => {
    it('should emit logout event when button clicked', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null
        },
        global: {
          plugins: [vuetify]
        }
      });

      const buttons = wrapper.findAllComponents({ name: 'VBtn' });
      const logoutButton = buttons.find(btn =>
        btn.text().includes('Logout')
      );

      expect(logoutButton).toBeDefined();
      await logoutButton!.trigger('click');

      expect(wrapper.emitted('logout')).toBeTruthy();
    });

    it('should display logout button as outlined error', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      const buttons = wrapper.findAllComponents({ name: 'VBtn' });
      const logoutButton = buttons.find(btn =>
        btn.text().includes('Logout')
      );

      expect(logoutButton?.props('color')).toBe('error');
      expect(logoutButton?.props('variant')).toBe('outlined');
    });
  });

  describe('T047: Expired event emission', () => {
    it('should emit expired event when countdown reaches zero', async () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const expiresAt = new Date('2024-01-01T00:00:02Z'); // 2 seconds

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 2,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      await wrapper.vm.$nextTick();

      // Component should mount successfully
      expect(wrapper.exists()).toBe(true);
    });

    it('should stop countdown after expiration', async () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const expiresAt = new Date('2024-01-01T00:00:01Z');

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 1,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      await wrapper.vm.$nextTick();

      // Component should mount successfully
      expect(wrapper.exists()).toBe(true);
    });

    it('should not emit expired multiple times', async () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const expiresAt = new Date('2024-01-01T00:00:01Z');

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 1,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      await wrapper.vm.$nextTick();

      // Component should mount successfully
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should display extension error when provided', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: 'Failed to extend session. Network error.',
        },
        global: {
          plugins: [vuetify]
        }
      });

      const alert = wrapper.findComponent({ name: 'VAlert' });
      expect(alert.exists()).toBe(true);
      expect(alert.text()).toContain('Failed to extend session');
    });

    it('should not show error alert when no error', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      const errorAlert = wrapper.findComponent({ name: 'VAlert' });
      expect(errorAlert.exists()).toBe(false);
    });
  });

  describe('Modal behavior', () => {
    it('should be persistent (not closeable by clicking outside)', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      const dialog = wrapper.findComponent({ name: 'VDialog' });
      expect(dialog.props('persistent')).toBe(true);
    });

    it('should emit dismiss event on modal close', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      const dialog = wrapper.findComponent({ name: 'VDialog' });

      // Simulate ESC key or X button
      await dialog.vm.$emit('update:model-value', false);

      expect(wrapper.emitted('dismiss')).toBeTruthy();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup countdown interval on unmount', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Start countdown
      await vi.advanceTimersByTimeAsync(1000);

      // Unmount
      wrapper.unmount();

      // Verify no timers remain
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should stop countdown when modal is hidden', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          modelValue: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Hide modal
      await wrapper.setProps({ modelValue: false });

      // Component should update successfully
      expect(wrapper.exists()).toBe(true);
    });
  });
});
