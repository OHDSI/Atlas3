window.__atlasPluginRuntimeReady = (function () {
  'use strict'

  if (!window.System) {
    // eslint-disable-next-line no-console -- classic script outside the module graph; no logger available
    console.error('[SystemJS] window.System is not available!')
    return Promise.resolve()
  }

  if (!window.Vue) {
    // eslint-disable-next-line no-console -- classic script outside the module graph; no logger available
    console.error('[SystemJS] window.Vue is not available!')
    // Unlike the window.System guard above (whose absence is re-verified
    // downstream by ensurePluginRuntime), nothing else checks window.Vue -
    // resolving here would let the runtime report "ready" with the 'vue'
    // SystemJS module exporting nothing, breaking every plugin silently.
    return rejected(new Error('[SystemJS] window.Vue is not available!'))
  }

  // A synchronous throw inside a classic <script> fires the window's error
  // event, not the script element's — injectScript would still resolve via
  // 'load' and callers would await an ever-undefined global. Catch it here
  // so registration failures always surface as a rejected promise.
  try {
    return registerRuntime()
  } catch (err) {
    return rejected(err)
  }

  // ensurePluginRuntime attaches its await a task later at best - or never,
  // if vendor-script loading fails first - so an eagerly-created rejection
  // must be pre-marked as handled or it fires unhandledrejection.
  function rejected(err) {
    var p = Promise.reject(err)
    p.catch(function () {})
    return p
  }

  function registerRuntime() {
    // Register Vue module
    window.System.register('vue', [], function(_export, _context) {
      'use strict';
      return {
        setters: [],
        execute: function() {
          // Export the entire Vue object as default
          _export('default', window.Vue);

          // Export all Vue APIs (comprehensive list)
          var vueExports = [
            'h', 'createApp', 'ref', 'reactive', 'computed', 'watch',
            'onMounted', 'onUnmounted', 'provide', 'inject', 'nextTick',
            'defineComponent', 'toRefs', 'toRef', 'createElementBlock',
            'openBlock', 'createCommentVNode', 'createElementVNode',
            'createBlock', 'createVNode', 'withCtx', 'renderList',
            'Fragment', 'Teleport', 'Suspense', 'KeepAlive', 'Transition',
            'TransitionGroup', 'withDirectives', 'resolveComponent',
            'resolveDirective', 'resolveDynamicComponent', 'mergeProps',
            'toHandlers', 'renderSlot', 'createSlots', 'withModifiers',
            'withKeys', 'vShow', 'vModelText', 'vModelCheckbox',
            'vModelRadio', 'vModelSelect', 'vModelDynamic', 'shallowRef',
            'shallowReactive', 'readonly', 'shallowReadonly', 'isRef',
            'isReactive', 'isReadonly', 'isProxy', 'toRaw', 'markRaw',
            'unref', 'proxyRefs', 'customRef', 'triggerRef', 'watchEffect',
            'watchPostEffect', 'watchSyncEffect', 'onBeforeMount',
            'onBeforeUpdate', 'onUpdated', 'onBeforeUnmount', 'onActivated',
            'onDeactivated', 'onErrorCaptured', 'onRenderTracked',
            'onRenderTriggered', 'onServerPrefetch', 'getCurrentInstance',
            'useSlots', 'useAttrs', 'useCssModule', 'useCssVars'
          ];

          vueExports.forEach(function(key) {
            if (window.Vue[key]) {
              _export(key, window.Vue[key]);
            }
          });

          // Also re-export every other own property of window.Vue so
          // libraries like Vuetify can pick up newer/less-common APIs
          // (camelize, toValue, useId, useTemplateRef, effectScope, etc.)
          // without us having to track Vue's API surface manually.
          Object.keys(window.Vue).forEach(function(key) {
            if (!vueExports.includes(key)) {
              _export(key, window.Vue[key]);
            }
          });
        }
      };
    });

    // Register Vue Router module
    window.System.register('vue-router', [], function(_export, _context) {
      'use strict';
      return {
        setters: [],
        execute: function() {
          _export('default', window.VueRouter);
          _export('createRouter', window.VueRouter.createRouter);
          _export('createWebHashHistory', window.VueRouter.createWebHashHistory);
          _export('useRouter', window.VueRouter.useRouter);
          _export('useRoute', window.VueRouter.useRoute);
        }
      };
    });

    // Register vuetify against the host's singleton instance.
    // The host stores it on window.__atlasVuetify after createVuetifyInstance
    // runs (see src/main.ts). Plugins that mark `vuetify` as a Rollup
    // external resolve it through SystemJS at runtime, so they share the
    // same instance and the same theme.
    window.System.register('vuetify', [], function(_export) {
      return {
        setters: [],
        execute: function() {
          _export('default', window.__atlasVuetify);
        }
      };
    });
    // Vuetify components are accessed via auto-import in source plugins;
    // for plugins that resolve them through bare imports, they're picked
    // up from the host's singleton (already registered above).
    window.System.register('vuetify/components', [], function(_export) {
      return {
        setters: [],
        execute: function() {
          _export(window.__atlasVuetify ? window.__atlasVuetify.components || {} : {});
        }
      };
    });
    window.System.register('vuetify/directives', [], function(_export) {
      return {
        setters: [],
        execute: function() {
          _export(window.__atlasVuetify ? window.__atlasVuetify.directives || {} : {});
        }
      };
    });

    // Load and register single-spa-vue
    var chain = window.System.import('./vendor/single-spa-vue.js').then(function(module) {
      // Register it under the 'single-spa-vue' name
      window.System.register('single-spa-vue', [], function(_export) {
        return {
          setters: [],
          execute: function() {
            _export('default', module.default);
          }
        };
      });
    }).catch(function(err) {
      // eslint-disable-next-line no-console -- classic script outside the module graph; no logger available
      console.error('[SystemJS] Failed to load single-spa-vue:', err);
      // Rethrow so the failure reaches ensurePluginRuntime's rejection path
      // instead of letting this chain resolve with single-spa-vue unregistered.
      throw err;
    });
    // Same handled-marking as rejected(): if a sibling vendor script fails
    // first, Promise.all rejects and ensurePluginRuntime never awaits this
    // chain, so its rejection would surface as unhandledrejection.
    chain.catch(function () {});
    return chain;
  }
})()
