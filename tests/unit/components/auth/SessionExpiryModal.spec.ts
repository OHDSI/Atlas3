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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Should display formatted time
      expect(wrapper.text()).toContain('5m 0s');
    });

    it('should update countdown every second', async () => {
      const expiresAt = new Date(Date.now() + 65 * 1000); // 65 seconds

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 65,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Initial state
      expect(wrapper.text()).toContain('1m 5s');

      // Advance 1 second
      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('1m 4s');

      // Advance another second
      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('1m 3s');
    });

    it('should format time correctly for seconds only', async () => {
      const expiresAt = new Date(Date.now() + 45 * 1000); // 45 seconds

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 45,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.text()).toContain('45s');
      expect(wrapper.text()).not.toContain('0m');
    });

    it('should apply warning color when time > 60s', async () => {
      const expiresAt = new Date(Date.now() + 120 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 120,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const countdown = wrapper.find('strong');
      expect(countdown.classes()).toContain('text-warning');
    });

    it('should apply error color when time < 60s', async () => {
      const expiresAt = new Date(Date.now() + 30 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 30,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const countdown = wrapper.find('strong');
      expect(countdown.classes()).toContain('text-error');
    });
  });

  describe('T045: "Extend Session" button click', () => {
    it('should emit extend event when button clicked', async () => {
      const onExtend = vi.fn();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend,
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const extendButton = wrapper.findAll('button').find(btn => 
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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: true, // Loading state
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const extendButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Extend Session')
      );

      // Button should have loading prop
      expect(extendButton?.attributes('loading')).toBeDefined();
    });

    it('should disable logout button while extending', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: true,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const logoutButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Logout')
      );

      expect(logoutButton?.attributes('disabled')).toBeDefined();
    });
  });

  describe('T046: "Logout" button click', () => {
    it('should emit logout event when button clicked', async () => {
      const onLogout = vi.fn();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout,
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const logoutButton = wrapper.findAll('button').find(btn => 
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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      const logoutButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Logout')
      );

      expect(logoutButton?.attributes('color')).toBe('error');
      expect(logoutButton?.attributes('variant')).toBe('outlined');
    });
  });

  describe('T047: Expired event emission', () => {
    it('should emit expired event when countdown reaches zero', async () => {
      const expiresAt = new Date(Date.now() + 2000); // 2 seconds

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 2,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Advance time to expiration
      await vi.advanceTimersByTimeAsync(2000);
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('expired')).toBeTruthy();
    });

    it('should stop countdown after expiration', async () => {
      const expiresAt = new Date(Date.now() + 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 1,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.vm.$nextTick();

      // Should have emitted expired
      expect(wrapper.emitted('expired')).toBeTruthy();

      // Countdown should stop (not go negative)
      expect(wrapper.text()).toContain('0s');
    });

    it('should not emit expired multiple times', async () => {
      const expiresAt = new Date(Date.now() + 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 1,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.vm.$nextTick();
      
      await vi.advanceTimersByTimeAsync(1000);
      await wrapper.vm.$nextTick();

      // Should only emit once
      expect(wrapper.emitted('expired')?.length).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should display extension error when provided', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: 'Failed to extend session. Network error.',
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      expect(wrapper.text()).toContain('Failed to extend session');
    });

    it('should not show error alert when no error', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      wrapper = mount(SessionExpiryModal, {
        props: {
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
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
          visible: true,
          expiresAt,
          remainingSeconds: 300,
          isExtending: false,
          extensionError: null,
          onExtend: vi.fn(),
          onLogout: vi.fn(),
          onDismiss: vi.fn()
        },
        global: {
          plugins: [vuetify]
        }
      });

      // Hide modal
      await wrapper.setProps({ visible: false });

      // Verify countdown stopped
      const timerCount = vi.getTimerCount();
      expect(timerCount).toBeLessThan(1);
    });
  });
});
