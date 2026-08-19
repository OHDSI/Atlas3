/**
 * Test Helper: Component Wrapper
 * Utility for mounting Vue components with common test configuration
 */

import { mount, shallowMount, type MountingOptions, type VueWrapper, type DOMWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createTestVuetify } from './vuetify-setup'
import type { Component } from 'vue'

const PassthroughStub = {
  template: '<div><slot /></div>',
}

// Shared inline menu stub for unit tests: keep activator and content in the
// wrapper so tests can assert behavior without teleport/overlay plumbing.
export const InlineAtlasMenuStub = {
  name: 'AtlasMenu',
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div class="menu-stub"><slot name="activator" :props="{}" /><slot /></div>',
}

/**
 * Options for mounting components in tests
 */
export interface TestMountOptions<T> extends Omit<MountingOptions<T>, 'global'> {
  /** Whether to use shallow mounting (default: false) */
  shallow?: boolean
  /** Custom Pinia instance (creates new one if not provided) */
  pinia?: Pinia
  /** Additional global plugins */
  plugins?: unknown[]
  /** Component stubs */
  stubs?: Record<string, boolean | Component>
  /** Global mocks */
  mocks?: Record<string, unknown>
  /** Whether to include Vuetify (default: true) */
  withVuetify?: boolean
}

/**
 * Mount a Vue component with common test configuration
 * Automatically sets up Pinia and Vuetify
 */
export function mountComponent<T extends Component>(
  component: T,
  options: TestMountOptions<T> = {}
): VueWrapper<InstanceType<T>> {
  const {
    shallow = false,
    pinia,
    plugins = [],
    stubs = {},
    mocks = {},
    withVuetify = true,
    ...mountOptions
  } = options

  // Create or use provided Pinia instance
  const piniaInstance = pinia ?? createPinia()
  setActivePinia(piniaInstance)

  // Build plugins array
  const globalPlugins: unknown[] = [piniaInstance]
  if (withVuetify) {
    globalPlugins.push(createTestVuetify())
  }
  globalPlugins.push(...plugins)

  const mountFn = shallow ? shallowMount : mount

  return mountFn(component, {
    ...mountOptions,
    global: {
      plugins: globalPlugins,
      stubs: {
        'v-chart': true,
        // Simplify Vue/Vuetify rendering infrastructure; keep behavior real.
        Teleport: true,
        teleport: true,
        Transition: PassthroughStub,
        transition: PassthroughStub,
        TransitionGroup: PassthroughStub,
        'transition-group': PassthroughStub,
        VDialogTransition: PassthroughStub,
        VMenuTransition: PassthroughStub,
        VFadeTransition: PassthroughStub,
        VScaleTransition: PassthroughStub,
        VExpandTransition: PassthroughStub,
        VExpandXTransition: PassthroughStub,
        ...stubs,
      },
      mocks,
    },
  }) as VueWrapper<InstanceType<T>>
}

/**
 * Find element by data-testid attribute
 */
export function findByTestId(wrapper: VueWrapper, testId: string): DOMWrapper<Element> {
  return wrapper.find(`[data-testid="${testId}"]`)
}

/**
 * Find all elements by data-testid attribute
 */
export function findAllByTestId(wrapper: VueWrapper, testId: string): DOMWrapper<Element>[] {
  return wrapper.findAll(`[data-testid="${testId}"]`)
}

/**
 * Wait for component to settle (useful for async operations)
 */
export async function waitForComponent(wrapper: VueWrapper, timeout = 100): Promise<void> {
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, timeout))
  await wrapper.vm.$nextTick()
}

/**
 * Trigger input event and wait for component update
 */
export async function setInputValue(
  wrapper: VueWrapper,
  selector: string,
  value: string
): Promise<void> {
  const input = wrapper.find(selector)
  await input.setValue(value)
  await wrapper.vm.$nextTick()
}

/**
 * Click element and wait for component update
 */
export async function clickAndWait(wrapper: VueWrapper, selector: string): Promise<void> {
  const element = wrapper.find(selector)
  await element.trigger('click')
  await wrapper.vm.$nextTick()
}

/**
 * Get emitted events of a specific type
 */
export function getEmittedEvents<T = unknown>(wrapper: VueWrapper, eventName: string): T[] {
  const events = wrapper.emitted(eventName)
  return events ? events.map(e => e[0] as T) : []
}

/**
 * Assert that component emitted event with specific payload
 */
export function expectEmitted<T = unknown>(
  wrapper: VueWrapper,
  eventName: string,
  expectedPayload?: T
): void {
  const emitted = wrapper.emitted(eventName)
  expect(emitted).toBeTruthy()
  if (expectedPayload !== undefined && emitted) {
    expect(emitted[emitted.length - 1][0]).toEqual(expectedPayload)
  }
}
