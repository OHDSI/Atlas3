import { describe, it, expect, beforeEach } from 'vitest'

import { usePluginOverlay } from '@/plugins/host/pluginOverlayState'

describe('pluginOverlayState', () => {
  beforeEach(() => {
    // Reset module-level state by calling close()
    usePluginOverlay().close()
  })

  it('starts hidden (openPluginId is null)', () => {
    const overlay = usePluginOverlay()
    expect(overlay.openPluginId.value).toBeNull()
  })

  it('open() sets the openPluginId to the provided value', () => {
    const overlay = usePluginOverlay()
    overlay.open('plugin-a')
    expect(overlay.openPluginId.value).toBe('plugin-a')
  })

  it('close() resets openPluginId to null', () => {
    const overlay = usePluginOverlay()
    overlay.open('plugin-a')
    overlay.close()
    expect(overlay.openPluginId.value).toBeNull()
  })

  it('toggle() opens when nothing is open', () => {
    const overlay = usePluginOverlay()
    overlay.toggle('plugin-a')
    expect(overlay.openPluginId.value).toBe('plugin-a')
  })

  it('toggle() closes when the same id is already open', () => {
    const overlay = usePluginOverlay()
    overlay.open('plugin-a')
    overlay.toggle('plugin-a')
    expect(overlay.openPluginId.value).toBeNull()
  })

  it('toggle() switches to a different id when another is open', () => {
    const overlay = usePluginOverlay()
    overlay.open('plugin-a')
    overlay.toggle('plugin-b')
    expect(overlay.openPluginId.value).toBe('plugin-b')
  })

  it('openPluginId is exposed as readonly', () => {
    const overlay = usePluginOverlay()
    // readonly refs are objects with a .value getter; assigning should not
    // change the underlying state (vue logs a warn in dev, no throw)
    expect(overlay.openPluginId.value).toBeNull()
    overlay.open('plugin-a')
    expect(overlay.openPluginId.value).toBe('plugin-a')
  })
})
