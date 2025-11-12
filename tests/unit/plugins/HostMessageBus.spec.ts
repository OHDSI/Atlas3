import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HostMessageBus } from '@/plugins/messaging/HostMessageBus';

describe('HostMessageBus', () => {
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
  });
});
