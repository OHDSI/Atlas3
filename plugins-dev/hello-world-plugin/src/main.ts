import { h, createApp } from 'vue';
import singleSpaVue from 'single-spa-vue';
import App from './App.vue';

interface PluginProps {
  name: string;
  mountParcel: any;
  singleSpa: any;
  authContext: {
    user: any;
    token: string | null;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
  };
  messageBus: {
    send: (type: string, payload: any) => void;
    request: <T>(type: string, payload: any) => Promise<T>;
    subscribe: (type: string, callback: (data: any) => void) => () => void;
  };
}

const vueLifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App, {
        name: (this as any).name,
        authContext: (this as any).authContext,
        messageBus: (this as any).messageBus,
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
