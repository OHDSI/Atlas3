// Pure helper — no dependency on `@ai-sdk/vue` or any other plugin-only
// module. Lives in its own file so the root vitest run (which doesn't
// install the plugin's node_modules) can import + unit-test it without
// pulling in the `Chat` transport bundle.

import type { UIMessage } from 'ai'

/**
 * Find the assistant UIMessage that owns a given toolCallId so the
 * proposal we're about to record can carry a stable `groupId`. We walk
 * backward from the most recent message because in normal flow the tool
 * call we're handling lives on the most-recently-appended assistant
 * message. The loop bails immediately when found.
 *
 * Returns `{ groupId: undefined }` if the parent isn't found yet (rare —
 * onToolCall fires synchronously after the part lands, so it should
 * already be there). Callers must tolerate that — the proposal then
 * renders as a legacy singleton.
 */
export function locateGroup(
  messages: ReadonlyArray<UIMessage>,
  toolCallId: string
): { groupId?: string; groupIndex?: number } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant' || !Array.isArray(m.parts)) continue
    let toolIndex = 0
    for (const part of m.parts) {
      const t = (part as { type?: string }).type
      if (typeof t !== 'string') continue
      const isToolPart =
        t === 'tool-input-available' ||
        t === 'tool-output-available' ||
        t.startsWith('tool-')
      if (!isToolPart) continue
      const cid = (part as { toolCallId?: string }).toolCallId
      if (cid === toolCallId) {
        return { groupId: m.id, groupIndex: toolIndex }
      }
      toolIndex += 1
    }
  }
  return {}
}
