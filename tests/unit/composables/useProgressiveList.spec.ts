import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

import { useProgressiveList } from '@/composables/useProgressiveList'

describe('useProgressiveList', () => {
  let frames: FrameRequestCallback[] = []

  function flushFrame() {
    const pending = frames
    frames = []
    pending.forEach(cb => cb(performance.now()))
  }

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames[id - 1] = () => {} })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function setup(length: number, options = { initial: 2, chunk: 3 }) {
    const source = ref(Array.from({ length }, (_, i) => i))
    const scope = effectScope()
    const result = scope.run(() => useProgressiveList(() => source.value, options))!
    return { source, scope, ...result }
  }

  it('renders the first chunk at once and the rest one frame at a time', () => {
    const { visible, complete } = setup(7)
    expect(visible.value).toEqual([0, 1])
    expect(complete.value).toBe(false)

    flushFrame()
    expect(visible.value).toEqual([0, 1, 2, 3, 4])

    flushFrame()
    expect(visible.value).toHaveLength(7)
    expect(complete.value).toBe(true)

    flushFrame()
    expect(frames).toHaveLength(0)
  })

  it('returns short lists whole without scheduling frames', () => {
    const { visible, complete } = setup(2)
    expect(visible.value).toEqual([0, 1])
    flushFrame()
    expect(complete.value).toBe(true)
    expect(frames).toHaveLength(0)
  })

  it('starts over from the first chunk when the list changes', async () => {
    const { source, visible } = setup(10)
    flushFrame()
    expect(visible.value).toHaveLength(5)

    source.value = Array.from({ length: 10 }, (_, i) => i + 100)
    await nextTick()
    expect(visible.value).toEqual([100, 101])
  })

  it('renders everything when animation frames are unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined)
    const { visible, complete } = setup(50)
    expect(visible.value).toHaveLength(50)
    expect(complete.value).toBe(true)
  })
})
