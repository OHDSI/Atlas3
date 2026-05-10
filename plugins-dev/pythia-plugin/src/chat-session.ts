// Module-level chat session manager. The Chat instance lives outside any
// component setup() so it survives parcel unmount/remount. Multiple sessions
// are stored in localStorage; the user can switch between them via the
// toolbar picker without losing in-flight history.

import { ref, watch } from 'vue'
import { Chat } from '@ai-sdk/vue'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai'
import type { RouteContext } from './shell-bridge'
import type { AskState, Checklist, ProposalState } from './types'
import {
  activeChecklist,
  applyChecklistToolCall,
  checklistHistory,
  isChecklistTool,
  resetChecklists,
  restoreChecklists,
  snapshotChecklists,
} from './checklist-state'

const INDEX_KEY = 'cohort-agent-plugin.sessions.v1.index'
const ACTIVE_KEY = 'cohort-agent-plugin.sessions.v1.active'
const SESSION_KEY = (id: string) => `cohort-agent-plugin.session.v1.${id}`

export const CLIENT_SIDE_TOOLS = new Set([
  'add_criterion',
  'add_criteria',
  'set_entry_event',
  'set_observation_window',
  'add_exit_criterion',
  'set_censor_event',
  'embed_concept_set_in_cohort',
  // Legacy alias kept for any sessions persisted before the rename.
  'create_concept_set',
  'add_inclusion_rule',
  'navigate_to',
  'create_standalone_concept_set',
  'create_feature_analysis',
  'create_characterization',
  'create_pathway',
  'create_incidence_rate',
  // Edit-existing artifact tools (Phase 3 — partial-merge into open editor)
  'update_concept_set',
  'update_feature_analysis',
  'update_characterization',
  'update_pathway',
  'update_incidence_rate',
])

export const sessionToken = ref<string | null>(null)
export const sessionSourceKey = ref<string | null>(null)
// Updated by ChatPanel.send() with a fresh ShellContext snapshot before
// each chat request, so the model sees where the user is at submit time
// rather than at panel-mount time.
export const sessionRouteContext = ref<RouteContext | null>(null)
export const proposals = ref<Record<string, ProposalState>>({})
// Active ask_user prompts. Keyed by toolCallId so a refresh mid-question
// can re-render the buttons without losing state.
export const asks = ref<Record<string, AskState>>({})

// Live token getter set by the host on parcel mount. We prefer this over
// reading sessionToken because Atlas3 silently refreshes the JWT in the
// background — a snapshot taken at panel-mount time goes stale and the
// next chat request 401s.
let tokenProvider: (() => Promise<string>) | null = null
export function setTokenProvider(fn: (() => Promise<string>) | null) {
  tokenProvider = fn
}

export interface SessionMeta {
  id: string
  title: string
  updatedAt: number
}

export const sessionIndex = ref<SessionMeta[]>([])
export const activeSessionId = ref<string>('')

interface PersistedSession {
  messages: UIMessage[]
  proposals: Record<string, ProposalState>
  activeChecklist?: Checklist | null
  checklistHistory?: Checklist[]
  asks?: Record<string, AskState>
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or storage disabled — silently ignore
  }
}

function readIndex(): SessionMeta[] {
  return safeRead<SessionMeta[]>(INDEX_KEY, [])
}

function writeIndex(idx: SessionMeta[]) {
  safeWrite(INDEX_KEY, idx)
  sessionIndex.value = [...idx].sort((a, b) => b.updatedAt - a.updatedAt)
}

function readSession(id: string): PersistedSession {
  const sess = safeRead<PersistedSession>(SESSION_KEY(id), { messages: [], proposals: {} })
  return {
    messages: sess.messages ?? [],
    proposals: sess.proposals ?? {},
    activeChecklist: sess.activeChecklist ?? null,
    checklistHistory: Array.isArray(sess.checklistHistory) ? sess.checklistHistory : [],
    asks: sess.asks ?? {},
  }
}

function writeSession(id: string, sess: PersistedSession) {
  safeWrite(SESSION_KEY(id), sess)
}

function deleteSession(id: string) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.removeItem(SESSION_KEY(id)) } catch { /* noop */ }
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveTitle(messages: UIMessage[]): string {
  for (const m of messages) {
    if (m.role === 'user') {
      const parts = (m.parts ?? []) as Array<{ type?: string; text?: string }>
      for (const p of parts) {
        if (p.type === 'text' && typeof p.text === 'string' && p.text.trim()) {
          const t = p.text.trim().replace(/\s+/g, ' ')
          return t.length > 60 ? t.slice(0, 57) + '…' : t
        }
      }
    }
  }
  return 'New chat'
}

let chatInstance: Chat<UIMessage> | null = null

function ensureActiveSession(): string {
  let active = safeRead<string>(ACTIVE_KEY, '')
  const idx = readIndex()
  sessionIndex.value = [...idx].sort((a, b) => b.updatedAt - a.updatedAt)
  if (!active || !idx.some(s => s.id === active)) {
    if (idx.length > 0) {
      active = idx[0].id
    } else {
      active = newSessionId()
      const meta: SessionMeta = { id: active, title: 'New chat', updatedAt: Date.now() }
      writeIndex([...idx, meta])
    }
    safeWrite(ACTIVE_KEY, active)
  }
  activeSessionId.value = active
  return active
}

function attachPersistence(chat: Chat<UIMessage>) {
  const persistAll = () => {
    const id = activeSessionId.value
    if (!id) return
    const snap = snapshotChecklists()
    writeSession(id, {
      messages: JSON.parse(JSON.stringify(chat.messages)) as UIMessage[],
      proposals: proposals.value,
      activeChecklist: snap.active,
      checklistHistory: snap.history,
      asks: asks.value,
    })
  }
  watch(
    () => chat.messages,
    msgs => {
      const id = activeSessionId.value
      if (!id) return
      persistAll()
      const idx = readIndex()
      const next: SessionMeta[] = idx.some(s => s.id === id)
        ? idx.map(s => (s.id === id ? { ...s, title: deriveTitle(msgs), updatedAt: Date.now() } : s))
        : [...idx, { id, title: deriveTitle(msgs), updatedAt: Date.now() }]
      writeIndex(next)
    },
    { deep: true }
  )
  watch(proposals, persistAll, { deep: true })
  watch(activeChecklist, persistAll, { deep: true })
  watch(checklistHistory, persistAll, { deep: true })
  watch(asks, persistAll, { deep: true })
}

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

export function getChatInstance(): Chat<UIMessage> {
  if (chatInstance) return chatInstance
  const id = ensureActiveSession()
  const persisted = readSession(id)
  proposals.value = persisted.proposals
  asks.value = persisted.asks ?? {}
  restoreChecklists({
    active: persisted.activeChecklist ?? null,
    history: persisted.checklistHistory ?? [],
  })

  const transport = new DefaultChatTransport({
    api: '/WebAPI/trexsql/agent/chat',
    headers: async () => {
      // Always re-read the token at request time. Atlas3 refreshes JWTs in
      // the background, so a cached value goes stale and causes 401s on
      // long-lived sessions.
      const live = tokenProvider ? await tokenProvider() : null
      const token = live || sessionToken.value
      const h: Record<string, string> = {}
      if (token) h['Authorization'] = `Bearer ${token}`
      return h
    },
    body: () => ({
      sourceKey: sessionSourceKey.value,
      routeContext: sessionRouteContext.value,
    }),
  })

  // Hard cap on the auto-loop. The @ai-sdk/vue Chat keeps ONE assistant
  // message per user turn — auto-resends extend that same message's
  // `parts` array with more tool-call/text blocks rather than appending
  // a fresh message. We use the number of tool-input-available parts on
  // the last assistant message as the step proxy: each auto-resend
  // typically produces one new tool call. Two earlier versions of this
  // predicate (counting whole messages, then counting `step-start`
  // parts) didn't bite because (a) message count stays at 1 and (b)
  // bao's SSE doesn't emit `start-step` chunks, so step-start parts
  // never materialise.
  // 15 covers a typical "build me a complex cohort" flow:
  //   ~2 search_existing_cohorts/search_phenotypes (orientation)
  // + ~5 search_concepts (entry/inclusion/exclusion concept lookups)
  // + ~5 client-side proposals (entry, observation, inclusion, exit, censor)
  // + ~3 buffer for retries or refinements.
  // Tighter caps starve complex flows; a much higher cap re-introduces the
  // "tool-loop forever" failure mode the cap was added to prevent.
  const MAX_AUTO_STEPS = 15
  const sendAutomaticallyWithCap: NonNullable<ConstructorParameters<typeof Chat<UIMessage>>[0]['sendAutomaticallyWhen']> = ({ messages }) => {
    if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) return false
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || !Array.isArray(last.parts)) return false
    let toolCallCount = 0
    for (const p of last.parts) {
      const t = (p as { type?: string }).type
      // Both shapes the @ai-sdk/vue stream produces for tool calls:
      // the canonical 'tool-input-available' (output-available state)
      // and the legacy/short-form 'tool-<name>' part.
      if (t === 'tool-input-available') {
        toolCallCount += 1
      } else if (typeof t === 'string' && t.startsWith('tool-') && t !== 'tool-output-available') {
        toolCallCount += 1
      }
    }
    return toolCallCount < MAX_AUTO_STEPS
  }

  const chat = new Chat<UIMessage>({
    transport,
    messages: persisted.messages,
    sendAutomaticallyWhen: sendAutomaticallyWithCap,
    onToolCall: ({ toolCall }: { toolCall: { toolCallId: string; toolName: string; input: unknown } }) => {
      if (isChecklistTool(toolCall.toolName)) {
        const result = applyChecklistToolCall(toolCall.toolName, toolCall.input)
        chat.addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result,
        })
        return
      }
      if (toolCall.toolName === 'ask_user') {
        const args = (toolCall.input ?? {}) as {
          question?: unknown
          options?: unknown
          allowCustom?: unknown
        }
        const optionsRaw = Array.isArray(args.options) ? args.options : []
        const options: AskState['options'] = optionsRaw
          .map((o: unknown) => {
            const oo = o as { id?: unknown; label?: unknown; description?: unknown }
            const id = typeof oo.id === 'string' ? oo.id : ''
            const label = typeof oo.label === 'string' ? oo.label : ''
            if (!id || !label) return null
            return {
              id,
              label,
              description: typeof oo.description === 'string' ? oo.description : undefined,
            }
          })
          .filter((o): o is AskState['options'][number] => o !== null)
        const { groupId, groupIndex } = locateGroup(chat.messages, toolCall.toolCallId)
        asks.value[toolCall.toolCallId] = {
          id: toolCall.toolCallId,
          question: typeof args.question === 'string' ? args.question : '',
          options,
          allowCustom: !!args.allowCustom,
          status: 'pending',
          groupId,
          groupIndex,
        }
        chat.addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: true,
            presented: true,
            awaitingUserChoice: true,
            instruction:
              'The question has been shown to the user as clickable options. STOP calling tools. End your turn with a one-line preamble; the user will pick an option and the next user message will be their answer.',
          },
        })
        return
      }
      if (CLIENT_SIDE_TOOLS.has(toolCall.toolName)) {
        const { groupId, groupIndex } = locateGroup(chat.messages, toolCall.toolCallId)
        proposals.value[toolCall.toolCallId] = {
          id: toolCall.toolCallId,
          toolName: toolCall.toolName,
          args: (toolCall.input ?? {}) as ProposalState['args'],
          status: 'pending',
          groupId,
          groupIndex,
        }
        // Auto-stub so the multi-turn loop can continue, but make the
        // message itself terminal so the model stops calling more tools
        // and produces its final summary text instead.
        chat.addToolResult({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: true,
            presented: true,
            awaitingUserDecision: true,
            instruction: 'The proposal has been shown to the user as an interactive card. STOP calling tools now. End your turn with a brief one-paragraph summary of what you proposed and wait for the user to accept, reject, or refine.',
          },
        })
      }
    },
  })

  attachPersistence(chat)
  chatInstance = chat
  return chat
}

export function newChat() {
  const id = newSessionId()
  safeWrite(ACTIVE_KEY, id)
  activeSessionId.value = id
  proposals.value = {}
  asks.value = {}
  resetChecklists()
  if (chatInstance) chatInstance.messages = []
  // Add the empty session to the index so the picker shows it; it gets a
  // real title once the user sends the first message.
  const idx = readIndex()
  writeIndex([...idx, { id, title: 'New chat', updatedAt: Date.now() }])
}

export function switchToSession(id: string) {
  if (id === activeSessionId.value) return
  const persisted = readSession(id)
  safeWrite(ACTIVE_KEY, id)
  activeSessionId.value = id
  proposals.value = persisted.proposals
  asks.value = persisted.asks ?? {}
  restoreChecklists({
    active: persisted.activeChecklist ?? null,
    history: persisted.checklistHistory ?? [],
  })
  if (chatInstance) chatInstance.messages = persisted.messages
}

export function deleteChatSession(id: string) {
  deleteSession(id)
  const idx = readIndex().filter(s => s.id !== id)
  writeIndex(idx)
  if (activeSessionId.value === id) {
    if (idx.length > 0) {
      switchToSession(idx[0].id)
    } else {
      newChat()
    }
  }
}

export function clearCurrentSession() {
  if (chatInstance) chatInstance.messages = []
  proposals.value = {}
  asks.value = {}
  resetChecklists()
  const id = activeSessionId.value
  if (id) {
    writeSession(id, {
      messages: [],
      proposals: {},
      activeChecklist: null,
      checklistHistory: [],
      asks: {},
    })
    const idx = readIndex().map(s =>
      s.id === id ? { ...s, title: 'New chat', updatedAt: Date.now() } : s
    )
    writeIndex(idx)
  }
}
