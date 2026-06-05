# Build an Atlas3 plugin with `@ohdsi/atlas-ui`

This guide shows how to build an Atlas3 plugin that looks and behaves like the
native Atlas application by using the `@ohdsi/atlas-ui` component library and
Atlas theme. It documents the real contract used by the reference plugin in
[`plugins-dev/hello-world-plugin`](../plugins-dev/hello-world-plugin), which is
a complete, working starter you can copy.

## 1. The plugin contract

An Atlas3 plugin is a [single-spa](https://single-spa.js.org/) **parcel** built
in **`system` module format**. Its entry module must export three lifecycle
functions:

```ts
export const bootstrap = vueLifecycles.bootstrap;
export const mount = vueLifecycles.mount;
export const unmount = vueLifecycles.unmount;
```

The host loads the built `system`-format bundle, calls `bootstrap` once, then
`mount`/`unmount` as the plugin is shown and hidden. (An optional `update`
lifecycle is also supported.)

The host injects props into each lifecycle. The shape the host passes is defined
by `PluginProps` in [`src/models/PluginModels.ts`](../src/models/PluginModels.ts):

```ts
export interface PluginProps {
  name: string
  mountParcel: unknown
  singleSpa: unknown
  authContext: AuthContext
  messageBus: PluginMessageBus
}
```

In practice you forward the three you care about (`name`, `authContext`,
`messageBus`) into your root component.

### `authContext`

Information about the current user and session
(`AuthContext` in `PluginModels.ts`):

```ts
export interface AuthContext {
  user: {
    id: string
    username: string
    email?: string
    permissions: string[]
  } | null
  token: string | null
  isAuthenticated: boolean
  hasPermission(permission: string): boolean
}
```

Use it to gate UI on `isAuthenticated`, greet `user.username`, attach `token`
to your own API calls, or check `hasPermission('...')`.

### `messageBus`

A typed channel for talking to the host
(`PluginMessageBus` in `PluginModels.ts`):

```ts
export interface PluginMessageBus {
  send<T = unknown>(type: string, payload: T): void
  request<TRequest = unknown, TResponse = unknown>(
    type: string,
    payload: TRequest
  ): Promise<TResponse>
  subscribe<T = unknown>(type: string, callback: (payload: T) => void): () => void
}
```

- `send` — fire-and-forget a message to the host.
- `request` — send a message and await a response.
- `subscribe` — listen for messages of a type; returns an unsubscribe function.

The host understands a set of message types (`HostMessageType` in
`PluginModels.ts`), e.g. `navigation:request`, `navigation:back`,
`notification:show`, `data:request`, `data:update`, `auth:refresh`,
`error:report`, and `custom`. The reference plugin uses several of them:

```ts
// Show a toast in the host
props.messageBus.send('notification:show', {
  message: 'Hello from the plugin!', type: 'info', duration: 3000,
});

// Ask the host to navigate
props.messageBus.send('navigation:request', { path: '/' });

// Request data and await the response
const data = await props.messageBus.request('data:request', {
  resource: 'user-preferences',
});
```

## 2. Install

Add `@ohdsi/atlas-ui` and its `vue` + `vuetify` peer dependencies, plus
`vite-plugin-vuetify` as a dev dependency. From the reference plugin's
[`package.json`](../plugins-dev/hello-world-plugin/package.json):

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vuetify": "^3.5.0",
    "@ohdsi/atlas-ui": "file:../../packages/atlas-ui"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "single-spa-vue": "^3.0.0",
    "typescript": "^5.9.0",
    "vite": "^5.4.21",
    "vite-plugin-vuetify": "^2.1.2",
    "vue-tsc": "^2.1.0"
  }
}
```

> In this monorepo `@ohdsi/atlas-ui` is referenced as a local
> `file:../../packages/atlas-ui` dependency. A standalone plugin would depend on
> the published package version instead.

## 3. Vite config

Build the plugin as a `system`-format library and register
`vite-plugin-vuetify` so Vuetify components auto-import. From the reference
plugin's [`vite.config.mjs`](../plugins-dev/hello-world-plugin/vite.config.mjs):

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    lib: { entry: './src/main.ts', formats: ['system'], fileName: 'index' },
    rollupOptions: { external: [], output: { format: 'system' } },
    outDir: '../../public/plugins/hello-world-plugin',
  },
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production') },
});
```

The `system` format is what makes the bundle loadable by single-spa, and
`outDir` writes the built bundle where the host serves plugins from.

## 4. Set up the theme

Create the single-spa Vue lifecycles in `main.ts` and, inside `handleInstance`,
install Vuetify with the Atlas theme. `buildVuetifyOptions()` (from
`@ohdsi/atlas-ui`) returns ready-made Vuetify options that include the native
Atlas look plus matching **light and dark** themes. Import the library's
`style.css` once so the `--atlas-*` design tokens and component styles are
available. From the reference plugin's
[`main.ts`](../plugins-dev/hello-world-plugin/src/main.ts):

```ts
import { h, createApp } from 'vue';
import singleSpaVue from 'single-spa-vue';
import { createVuetify } from 'vuetify';
import { buildVuetifyOptions } from '@ohdsi/atlas-ui';
import '@ohdsi/atlas-ui/style.css';
import App from './App.vue';

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
    app.use(createVuetify(buildVuetifyOptions()));
    app.provide('pluginProps', props);
  },
});

export const bootstrap = vueLifecycles.bootstrap;
export const mount = vueLifecycles.mount;
export const unmount = vueLifecycles.unmount;
```

Because Vuetify is installed with `buildVuetifyOptions()`, your plugin uses the
exact same theme palette and tokens as the host Atlas application — you do not
need to define your own colors.

> `buildVuetifyOptions(primaryOverride?)` optionally accepts a primary color
> override, but most plugins should call it with no arguments to stay aligned
> with the host theme.

## 5. Use components

Import the Atlas components you need directly from `@ohdsi/atlas-ui` and wrap
your UI in a `<v-theme-provider>` so the theme (and `with-background`) applies.
From the reference plugin's
[`App.vue`](../plugins-dev/hello-world-plugin/src/App.vue):

```vue
<template>
  <v-theme-provider :theme="theme" with-background>
    <div style="padding: 24px; max-width: 800px; margin: 0 auto;">
      <h1 style="color: rgb(var(--v-theme-primary));">Hello World Plugin</h1>

      <AtlasAlert v-if="authContext?.isAuthenticated" severity="info">
        Welcome, {{ authContext.user?.username }}!
      </AtlasAlert>

      <AtlasCard padding="md">
        <AtlasButton @click="sendNotification">Show notification</AtlasButton>
        <AtlasButton variant="secondary" @click="requestNavigation">Navigate home</AtlasButton>
        <AtlasButton variant="tonal" @click="requestData">Request data</AtlasButton>
      </AtlasCard>
    </div>
  </v-theme-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AtlasButton, AtlasCard, AtlasAlert } from '@ohdsi/atlas-ui';

const props = defineProps<{ name: string; authContext: AuthContext; messageBus: MessageBus }>();
const theme = ref<'light' | 'dark'>('light');
</script>
```

The full library catalog of `Atlas*` components is browsable in the atlas-ui
Histoire stories.

## 6. Theming and dark mode

Atlas exposes its design tokens and palette as CSS variables. Style your plugin
with these variables instead of hardcoded colors so dark mode follows the host
automatically:

- **`--v-theme-*`** — Vuetify theme palette channels. Use them with `rgb(...)`,
  e.g. `color: rgb(var(--v-theme-primary));` or
  `color: rgb(var(--v-theme-on-surface));`.
- **`--atlas-*`** — Atlas design tokens such as spacing and radii, e.g.
  `border-radius: var(--atlas-radius-md);`.

Because both light and dark themes ship in `buildVuetifyOptions()`, switching the
`theme` bound to `<v-theme-provider>` (or following the host's theme) swaps every
token at once. The reference plugin demonstrates a manual toggle:

```vue
<AtlasButton
  variant="ghost"
  size="sm"
  @click="theme = theme === 'dark' ? 'light' : 'dark'"
>
  {{ theme === 'dark' ? '☾ Dark' : '☀ Light' }}
</AtlasButton>
```

**Do not** hardcode hex colors and **do not** ship your own Vuetify theme that
diverges from Atlas — that breaks the native look and dark-mode support.

## 7. Reference

[`plugins-dev/hello-world-plugin`](../plugins-dev/hello-world-plugin) is a
complete, working plugin built with `@ohdsi/atlas-ui`. Copy it as a starting
point: it wires up the single-spa lifecycles, installs the Atlas theme, consumes
`authContext` and `messageBus`, and demonstrates Atlas components with light/dark
theming.
