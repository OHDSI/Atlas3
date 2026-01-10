import { h, createApp } from 'vue';
import singleSpaVue from 'single-spa-vue';
import App from './App.vue';

// Plugin props interface - exported for type checking in other files
export interface PluginProps {
  name: string;
  mountParcel: unknown;
  singleSpa: unknown;
  authContext: {
    user: unknown;
    token: string | null;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
  };
  messageBus: {
    send: (type: string, payload: unknown) => void;
    request: <T>(type: string, payload: unknown) => Promise<T>;
    subscribe: (type: string, callback: (data: unknown) => void) => () => void;
  };
}

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, {
        name: (this as PluginProps).name,
        authContext: (this as PluginProps).authContext,
        messageBus: (this as PluginProps).messageBus,
      });
    },
  },
  handleInstance(app, props) {
    app.provide('pluginProps', props);
  },
});

export const bootstrap = vueLifecycles.bootstrap;
export const mount = vueLifecycles.mount;
export const unmount = vueLifecycles.unmount;
