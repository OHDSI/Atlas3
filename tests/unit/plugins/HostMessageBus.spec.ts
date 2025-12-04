import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HostMessageBus,
  createHostMessageBus,
  getHostMessageBus,
  setupGlobalMessageHandler
} from '@/plugins/messaging/HostMessageBus';
import type { HostMessage } from '@/models/PluginModels';

describe.skip('HostMessageBus', () => {
  let messageBus: HostMessageBus;

  beforeEach(() => {
    messageBus = new HostMessageBus('test-plugin');

    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  describe('send', () => {
    it('should dispatch custom event with message', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      messageBus.send('test-message', { data: 'test' });

      expect(dispatchEventSpy).toHaveBeenCalled();

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('plugin-message');
      expect(event.detail.type).toBe('test-message');
      expect(event.detail.sourcePluginId).toBe('test-plugin');
      expect(event.detail.payload).toEqual({ data: 'test' });
    });

    it('should include timestamp in message', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      messageBus.send('test', {});

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.timestamp).toBeInstanceOf(Date);
    });

    it('should handle different payload types', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      // String payload
      messageBus.send('string-test', 'hello');
      expect((dispatchEventSpy.mock.calls[0][0] as CustomEvent).detail.payload).toBe('hello');

      // Number payload
      messageBus.send('number-test', 42);
      expect((dispatchEventSpy.mock.calls[1][0] as CustomEvent).detail.payload).toBe(42);

      // Array payload
      messageBus.send('array-test', [1, 2, 3]);
      expect((dispatchEventSpy.mock.calls[2][0] as CustomEvent).detail.payload).toEqual([1, 2, 3]);

      // Null payload
      messageBus.send('null-test', null);
      expect((dispatchEventSpy.mock.calls[3][0] as CustomEvent).detail.payload).toBeNull();
    });

    it('should not include callbackId in send messages', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      messageBus.send('test', {});

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.callbackId).toBeUndefined();
    });
  });

  describe('request', () => {
    it('should send request and return promise', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request('data:request', { resource: 'test' });

      expect(dispatchEventSpy).toHaveBeenCalled();

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.callbackId).toBeDefined();

      // Simulate response
      messageBus.handleResponse(event.detail.callbackId, { success: true });

      const response = await requestPromise;
      expect(response).toEqual({ success: true });
    });

    it('should timeout after 30 seconds', async () => {
      vi.useFakeTimers();

      const requestPromise = messageBus.request('test', {});

      // Fast-forward time
      vi.advanceTimersByTime(30000);

      await expect(requestPromise).rejects.toThrow('timeout');

      vi.useRealTimers();
    });

    it('should reject on error response', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request('test', {});

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;

      const error = new Error('Request failed');
      messageBus.handleResponse(event.detail.callbackId, null, error);

      await expect(requestPromise).rejects.toThrow('Request failed');
    });

    it('should generate unique callback IDs for multiple requests', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      messageBus.request('test1', {});
      messageBus.request('test2', {});
      messageBus.request('test3', {});

      const callbackId1 = (dispatchEventSpy.mock.calls[0][0] as CustomEvent).detail.callbackId;
      const callbackId2 = (dispatchEventSpy.mock.calls[1][0] as CustomEvent).detail.callbackId;
      const callbackId3 = (dispatchEventSpy.mock.calls[2][0] as CustomEvent).detail.callbackId;

      expect(callbackId1).not.toBe(callbackId2);
      expect(callbackId2).not.toBe(callbackId3);
      expect(callbackId1).not.toBe(callbackId3);
    });

    it('should include pluginId in callback ID', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      messageBus.request('test', {});

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.callbackId).toMatch(/^req-test-plugin-\d+$/);
    });

    it('should not timeout if response arrives in time', async () => {
      vi.useFakeTimers();
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request('test', {});
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;

      // Advance time but not past timeout
      vi.advanceTimersByTime(15000);

      // Respond before timeout
      messageBus.handleResponse(event.detail.callbackId, { success: true });

      const response = await requestPromise;
      expect(response).toEqual({ success: true });

      // Now advance past timeout - should not reject since already resolved
      vi.advanceTimersByTime(20000);

      vi.useRealTimers();
    });

    it('should handle typed request and response', async () => {
      interface TestRequest {
        action: string;
        id: number;
      }

      interface TestResponse {
        result: string;
        count: number;
      }

      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request<TestRequest, TestResponse>('typed-request', {
        action: 'fetch',
        id: 123
      });

      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      messageBus.handleResponse(event.detail.callbackId, { result: 'success', count: 5 });

      const response = await requestPromise;
      expect(response.result).toBe('success');
      expect(response.count).toBe(5);
    });
  });

  describe('subscribe', () => {
    it('should register callback for message type', () => {
      const callback = vi.fn();

      messageBus.subscribe('test-event', callback);
      messageBus.handleIncomingMessage('test-event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();

      const unsubscribe = messageBus.subscribe('test-event', callback);
      unsubscribe();

      messageBus.handleIncomingMessage('test-event', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      messageBus.subscribe('test-event', callback1);
      messageBus.subscribe('test-event', callback2);

      messageBus.handleIncomingMessage('test-event', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle multiple unsubscribes safely', () => {
      const callback = vi.fn();

      const unsubscribe = messageBus.subscribe('test-event', callback);

      // Call unsubscribe multiple times
      unsubscribe();
      unsubscribe();
      unsubscribe();

      messageBus.handleIncomingMessage('test-event', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specific callback', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      messageBus.subscribe('test-event', callback1);
      const unsubscribe2 = messageBus.subscribe('test-event', callback2);
      messageBus.subscribe('test-event', callback3);

      unsubscribe2();

      messageBus.handleIncomingMessage('test-event', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should allow same callback to subscribe to multiple message types', () => {
      const callback = vi.fn();

      messageBus.subscribe('type-a', callback);
      messageBus.subscribe('type-b', callback);

      messageBus.handleIncomingMessage('type-a', { data: 'a' });
      messageBus.handleIncomingMessage('type-b', { data: 'b' });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith({ data: 'a' });
      expect(callback).toHaveBeenCalledWith({ data: 'b' });
    });

    it('should handle typed subscriptions', () => {
      interface TypedPayload {
        message: string;
        code: number;
      }

      const callback = vi.fn<[TypedPayload], void>();

      messageBus.subscribe<TypedPayload>('typed-event', callback);
      messageBus.handleIncomingMessage('typed-event', { message: 'test', code: 200 });

      expect(callback).toHaveBeenCalledWith({ message: 'test', code: 200 });
    });
  });

  describe('handleIncomingMessage', () => {
    it('should notify all subscribers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      messageBus.subscribe('notification', callback1);
      messageBus.subscribe('notification', callback2);

      messageBus.handleIncomingMessage('notification', { message: 'Hello' });

      expect(callback1).toHaveBeenCalledWith({ message: 'Hello' });
      expect(callback2).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should not call subscribers for different message types', () => {
      const callback = vi.fn();

      messageBus.subscribe('type-a', callback);
      messageBus.handleIncomingMessage('type-b', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle message with no subscribers gracefully', () => {
      expect(() => {
        messageBus.handleIncomingMessage('no-subscribers', { data: 'test' });
      }).not.toThrow();
    });

    it('should pass different payload types correctly', () => {
      const callback = vi.fn();

      messageBus.subscribe('test', callback);

      messageBus.handleIncomingMessage('test', 'string payload');
      expect(callback).toHaveBeenLastCalledWith('string payload');

      messageBus.handleIncomingMessage('test', 42);
      expect(callback).toHaveBeenLastCalledWith(42);

      messageBus.handleIncomingMessage('test', null);
      expect(callback).toHaveBeenLastCalledWith(null);

      messageBus.handleIncomingMessage('test', undefined);
      expect(callback).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('handleResponse', () => {
    it('should resolve pending request with response', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request('test', {});
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;

      messageBus.handleResponse(event.detail.callbackId, { data: 'response' });

      const response = await requestPromise;
      expect(response).toEqual({ data: 'response' });
    });

    it('should reject pending request with error', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request('test', {});
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;

      const error = new Error('Something went wrong');
      messageBus.handleResponse(event.detail.callbackId, null, error);

      await expect(requestPromise).rejects.toThrow('Something went wrong');
    });

    it('should handle response for non-existent callbackId gracefully', () => {
      expect(() => {
        messageBus.handleResponse('non-existent-callback-id', { data: 'test' });
      }).not.toThrow();
    });

    it('should remove pending request after handling', async () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const requestPromise = messageBus.request('test', {});
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent;
      const callbackId = event.detail.callbackId;

      messageBus.handleResponse(callbackId, { data: 'response' });
      await requestPromise;

      // Try to handle response again - should be no-op
      messageBus.handleResponse(callbackId, { data: 'another response' });
    });
  });
});

describe.skip('Factory Functions', () => {
  afterEach(() => {
    // Clear singleton instances between tests
    vi.resetModules();
  });

  describe('createHostMessageBus', () => {
    it('should create a new message bus instance', () => {
      const bus = createHostMessageBus('plugin-1');

      expect(bus).toBeInstanceOf(HostMessageBus);
    });

    it('should return the same instance for the same pluginId', () => {
      const bus1 = createHostMessageBus('plugin-1');
      const bus2 = createHostMessageBus('plugin-1');

      expect(bus1).toBe(bus2);
    });

    it('should create different instances for different pluginIds', () => {
      const bus1 = createHostMessageBus('plugin-1');
      const bus2 = createHostMessageBus('plugin-2');

      expect(bus1).not.toBe(bus2);
    });

    it('should maintain state across calls', () => {
      const bus = createHostMessageBus('plugin-with-state');
      const callback = vi.fn();

      bus.subscribe('test', callback);

      const sameBus = createHostMessageBus('plugin-with-state');
      sameBus.handleIncomingMessage('test', { data: 'test' });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('getHostMessageBus', () => {
    it('should return existing message bus', () => {
      const created = createHostMessageBus('existing-plugin');
      const retrieved = getHostMessageBus('existing-plugin');

      expect(retrieved).toBe(created);
    });

    it('should return undefined for non-existent pluginId', () => {
      const bus = getHostMessageBus('non-existent-plugin');

      expect(bus).toBeUndefined();
    });

    it('should not create new instance', () => {
      const before = getHostMessageBus('new-plugin');
      expect(before).toBeUndefined();

      // Still undefined after get
      const after = getHostMessageBus('new-plugin');
      expect(after).toBeUndefined();
    });
  });
});

describe.skip('setupGlobalMessageHandler', () => {
  let mockRouter: { push: ReturnType<typeof vi.fn>; back: ReturnType<typeof vi.fn> };
  let mockNotificationService: { show: ReturnType<typeof vi.fn> };
  let _eventListener: EventListener;

  beforeEach(() => {
    mockRouter = {
      push: vi.fn(),
      back: vi.fn()
    };

    mockNotificationService = {
      show: vi.fn()
    };

    // Capture the event listener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, listener) => {
      if (event === 'plugin-message') {
        eventListener = listener as EventListener;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register plugin-message event listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    setupGlobalMessageHandler(mockRouter);

    expect(addEventListenerSpy).toHaveBeenCalledWith('plugin-message', expect.any(Function));
  });

  it('should handle navigation:request messages', () => {
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'navigation:request',
      sourcePluginId: 'test-plugin',
      payload: { path: '/test-route' },
      timestamp: new Date()
    };

    window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));

    expect(mockRouter.push).toHaveBeenCalledWith('/test-route');
  });

  it('should handle navigation:back messages', () => {
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'navigation:back',
      sourcePluginId: 'test-plugin',
      payload: {},
      timestamp: new Date()
    };

    window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('should handle notification:show messages with notification service', () => {
    setupGlobalMessageHandler(mockRouter, mockNotificationService);

    const message: HostMessage = {
      type: 'notification:show',
      sourcePluginId: 'test-plugin',
      payload: { message: 'Test notification', type: 'info' },
      timestamp: new Date()
    };

    window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));

    expect(mockNotificationService.show).toHaveBeenCalledWith({
      message: 'Test notification',
      type: 'info'
    });
  });

  it('should handle notification:show messages without notification service', () => {
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'notification:show',
      sourcePluginId: 'test-plugin',
      payload: { message: 'Test notification' },
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });

  it('should handle data:request messages', () => {
    const _bus = createHostMessageBus('data-plugin');
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'data:request',
      sourcePluginId: 'data-plugin',
      payload: { resource: 'users' },
      callbackId: 'test-callback-123',
      timestamp: new Date()
    };

    window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));

    // The handler should respond with mock data
    // We can't easily test this without exposing internals, but we can verify no errors
  });

  it('should handle data:request without callbackId gracefully', () => {
    createHostMessageBus('data-plugin');
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'data:request',
      sourcePluginId: 'data-plugin',
      payload: { resource: 'users' },
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });

  it('should handle error:report messages', () => {
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'error:report',
      sourcePluginId: 'error-plugin',
      payload: { error: new Error('Plugin error'), context: { action: 'load' } },
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });

  it('should handle unknown message types gracefully', () => {
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'unknown:message:type',
      sourcePluginId: 'test-plugin',
      payload: {},
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });

  it('should work without router', () => {
    setupGlobalMessageHandler(null);

    const message: HostMessage = {
      type: 'navigation:request',
      sourcePluginId: 'test-plugin',
      payload: { path: '/test' },
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });

  it('should handle navigation:back without router', () => {
    setupGlobalMessageHandler(null);

    const message: HostMessage = {
      type: 'navigation:back',
      sourcePluginId: 'test-plugin',
      payload: {},
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });

  it('should handle data:request for non-existent plugin', () => {
    setupGlobalMessageHandler(mockRouter);

    const message: HostMessage = {
      type: 'data:request',
      sourcePluginId: 'non-existent-plugin',
      payload: { resource: 'users' },
      callbackId: 'test-callback',
      timestamp: new Date()
    };

    expect(() => {
      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }));
    }).not.toThrow();
  });
});
