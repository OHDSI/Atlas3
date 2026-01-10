/**
 * Test Helper: Component Test Utilities
 * Provides a unified mounting helper for Vue components with all necessary providers
 */

import { mount, shallowMount, type MountingOptions, type VueWrapper } from '@vue/test-utils'
import { type Component, type DefineComponent } from 'vue'
import { createTestVuetify } from './vuetify-mock'
import { createTestRouter } from './router-mock'
import { createTestStore, type CreateTestingPiniaOptions } from './store-mock'
import type { RouteRecordRaw } from 'vue-router'

export interface MountComponentOptions<T extends Component> extends Omit<MountingOptions<T>, 'global'> {
  /** Store configuration */
  storeOptions?: CreateTestingPiniaOptions
  /** Custom routes for router */
  routes?: RouteRecordRaw[]
  /** Initial route path */
  initialRoute?: string
  /** Whether to use shallow mounting (default: false) */
  shallow?: boolean
  /** Additional plugins to include */
  plugins?: unknown[]
  /** Component stubs */
  stubs?: Record<string, Component | boolean | string>
  /** Provide/inject mocks */
  provide?: Record<string | symbol, unknown>
  /** Global mocks */
  mocks?: Record<string, unknown>
}

/**
 * Mount a Vue component with all necessary test providers
 * @param component The component to mount
 * @param options Mount options
 */
export function mountComponent<T extends Component>(
  component: T,
  options: MountComponentOptions<T> = {}
): VueWrapper<InstanceType<T extends DefineComponent<infer P> ? DefineComponent<P> : T>> {
  const {
    storeOptions,
    routes,
    initialRoute,
    shallow = false,
    plugins = [],
    stubs = {},
    provide = {},
    mocks = {},
    props,
    slots,
    attachTo,
  } = options

  const vuetify = createTestVuetify()
  const pinia = createTestStore(storeOptions)
  const router = createTestRouter(routes, initialRoute)

  const mountFn = shallow ? shallowMount : mount

  const mountOptions: MountingOptions<T> = {
    props: props as MountingOptions<T>['props'],
    slots,
    attachTo,
    global: {
      plugins: [vuetify, pinia, router, ...plugins],
      stubs: {
        // Default stubs for heavy/external components
        'v-chart': true,
        Teleport: true,
        ...stubs,
      },
      provide,
      mocks,
    },
  }

  return mountFn(component, mountOptions) as VueWrapper<InstanceType<T extends DefineComponent<infer P> ? DefineComponent<P> : T>>
}

/**
 * Shallow mount a component (convenience wrapper)
 */
export function shallowMountComponent<T extends Component>(
  component: T,
  options: Omit<MountComponentOptions<T>, 'shallow'> = {}
): VueWrapper<InstanceType<T extends DefineComponent<infer P> ? DefineComponent<P> : T>> {
  return mountComponent(component, { ...options, shallow: true })
}

/**
 * Wait for all pending promises and Vue updates
 */
export async function flushAllPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Find element by data-testid attribute
 */
export function findByTestId(wrapper: VueWrapper, testId: string) {
  return wrapper.find(`[data-testid="${testId}"]`)
}

/**
 * Find all elements by data-testid attribute
 */
export function findAllByTestId(wrapper: VueWrapper, testId: string) {
  return wrapper.findAll(`[data-testid="${testId}"]`)
}

// Re-export helpers for convenience
export { createTestVuetify } from './vuetify-mock'
export { createTestRouter, createRouterMocks } from './router-mock'
export { createTestStore, createAuthenticatedStore, createUnauthenticatedStore } from './store-mock'
export { createI18nMock, mockUseI18n } from './i18n-mock'
