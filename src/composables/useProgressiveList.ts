/**
 * useProgressiveList Composable
 * Renders a long list in frame-sized chunks: the first `initial` items
 * render immediately and the rest are appended `chunk` at a time on
 * subsequent animation frames. The page paints right away and stays
 * responsive while a table with thousands of rows fills in.
 */
import { computed, onScopeDispose, ref, watch } from 'vue'

interface UseProgressiveListOptions {
  initial?: number
  chunk?: number
}

export function useProgressiveList<T>(
  source: () => T[],
  options: UseProgressiveListOptions = {}
) {
  const { initial = 200, chunk = 400 } = options
  const canSchedule = typeof requestAnimationFrame === 'function'

  const limit = ref(canSchedule ? initial : Infinity)
  let handle: number | null = null

  function cancel() {
    if (handle !== null) {
      cancelAnimationFrame(handle)
      handle = null
    }
  }

  function grow() {
    handle = null
    if (limit.value >= source().length) return
    limit.value += chunk
    schedule()
  }

  function schedule() {
    if (canSchedule && handle === null) handle = requestAnimationFrame(grow)
  }

  // A new list starts over from the first chunk.
  watch(source, () => {
    cancel()
    limit.value = canSchedule ? initial : Infinity
    schedule()
  }, { immediate: true })

  onScopeDispose(cancel)

  const visible = computed(() => {
    const list = source()
    return limit.value >= list.length ? list : list.slice(0, limit.value)
  })

  const complete = computed(() => limit.value >= source().length)

  return { visible, complete }
}
