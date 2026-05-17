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
import { proposalFromToolCall } from './shell-bridge'
import type { MessageBus } from './main'
import type { AskState, Plan, ProposalState } from './types'
import {
  activePlan,
  applyPlanToolCall,
  isPlanTool,
  planHistory,
  resetPlans,
  restorePlans,
  snapshotPlans,
} from './plan-state'

let _hostBus: MessageBus | null = null
let hostApplyProposal: ((p: unknown) => void) | null = null
export function setHostBridge(opts: { bus: MessageBus; applyProposal: (p: unknown) => void }) {
  _hostBus = opts.bus
  void _hostBus // reserved for Task 7 — kept for future handler wiring
  hostApplyProposal = opts.applyProposal
}

export interface LastNavigation {
  id: string             // tool call id, used to dedupe display
  toName: string         // route the agent navigated to
  reason?: string
  previous: { name: string; params: Record<string, string | number> } | null
  at: number             // Date.now() — used by ChatPanel to expire after 5s
}

export const lastNavigation = ref<LastNavigation | null>(null)

export interface NavigateHandlerDeps {
  addToolResult: (r: { tool: string; toolCallId: string; output: unknown }) => void
  applyProposal: (p: unknown) => void
}

export function handleNavigateTool(
  toolCall: { toolCallId: string; input: unknown },
  deps: NavigateHandlerDeps
): void {
  const proposal = proposalFromToolCall(
    'navigate_to',
    (toolCall.input ?? {}) as Parameters<typeof proposalFromToolCall>[1]
  )
  if (!proposal) {
    deps.addToolResult({
      tool: 'navigate_to',
      toolCallId: toolCall.toolCallId,
      output: {
        success: false,
        applied: false,
        error: 'Unknown or hidden view',
        instruction:
          'navigate_to was rejected because the view is not in the route manifest. List your available views or pick a different one.',
      },
    })
    return
  }
  const route = (proposal as unknown as { route: { name: string }; reason?: string }).route
  const reason = (proposal as unknown as { reason?: string }).reason

  // Capture the previous route from the last-fetched shell context so the
  // user can undo. sessionRouteContext is refreshed by ChatPanel before
  // each message send, so it reflects where the user was AT SEND TIME —
  // which is when the model decided to navigate.
  const ctx = sessionRouteContext.value
  const previous = ctx?.routeName
    ? { name: ctx.routeName, params: { ...(ctx.routeParams ?? {}) } as Record<string, string | number> }
    : null

  deps.applyProposal(proposal)

  lastNavigation.value = {
    id: toolCall.toolCallId,
    toName: route.name,
    reason,
    previous,
    at: Date.now(),
  }

  deps.addToolResult({
    tool: 'navigate_to',
    toolCallId: toolCall.toolCallId,
    output: {
      success: true,
      applied: true,
      route: route.name,
      undoAvailable: previous !== null,
      instruction:
        'You took the user to a new view. Continue your turn; the user can undo via the toast if they wanted to stay.',
    },
  })
}

export function undoLastNavigation(): boolean {
  const ln = lastNavigation.value
  if (!ln || !ln.previous || !hostApplyProposal) return false
  hostApplyProposal({
    kind: 'navigate',
    route: { name: ln.previous.name, params: ln.previous.params },
    reason: 'Undo Pythia navigation',
  })
  lastNavigation.value = null
  return true
}

export function dismissLastNavigation(): void {
  lastNavigation.value = null
}

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
  'add_inclusion_rule',
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
  activePlan?: Plan | null
  planHistory?: Plan[]
  // Legacy field names from before the Checklist→Plan rename. Kept on the
  // read path so old persisted sessions don't drop their plan card. Not
  // written by current code.
  activeChecklist?: Plan | null
  checklistHistory?: Plan[]
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
    // Prefer the new field names; fall back to the legacy
    // `activeChecklist`/`checklistHistory` for sessions persisted before
    // the rename so old chats don't lose their plan card.
    activePlan: sess.activePlan ?? sess.activeChecklist ?? null,
    planHistory: Array.isArray(sess.planHistory)
      ? sess.planHistory
      : Array.isArray(sess.checklistHistory)
        ? sess.checklistHistory
        : [],
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
    const snap = snapshotPlans()
    writeSession(id, {
      messages: JSON.parse(JSON.stringify(chat.messages)) as UIMessage[],
      proposals: proposals.value,
      activePlan: snap.active,
      planHistory: snap.history,
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
  watch(activePlan, persistAll, { deep: true })
  watch(planHistory, persistAll, { deep: true })
  watch(asks, persistAll, { deep: true })
}

function resolveMaxAutoSteps(): number {
  const DEFAULT = 15
  const parse = (raw: unknown): number | null => {
    if (typeof raw !== 'string' && typeof raw !== 'number') return null
    const n = typeof raw === 'number' ? raw : parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  // Runtime override (dev convenience). Set with
  //   localStorage.setItem('pythiaMaxAutoSteps', '25')
  // in DevTools, then refresh — no rebuild needed.
  if (typeof localStorage !== 'undefined') {
    const ls = parse(localStorage.getItem('pythiaMaxAutoSteps'))
    if (ls !== null) return ls
  }
  // Build-time env var, baked in by Vite (prefix VITE_* so it's exposed
  // to the bundle). Set in docker-compose.yml or your shell when
  // building the plugin.
  const env = parse(import.meta.env?.VITE_PYTHIA_MAX_AUTO_STEPS)
  if (env !== null) return env
  return DEFAULT
}

import { locateGroup } from './locate-group'
export { locateGroup }

export interface ProposalResolver {
  addToolResult: (r: { tool: string; toolCallId: string; output: unknown }) => void
}

const PROPOSAL_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const proposalTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearProposalTimers() {
  for (const t of proposalTimers.values()) clearTimeout(t)
  proposalTimers.clear()
}

export function recordProposal(
  toolCall: { toolCallId: string; toolName: string; input: unknown },
  deps: ProposalResolver,
  groupInfo?: { groupId?: string; groupIndex?: number }
): void {
  const groupId = groupInfo?.groupId
  const groupIndex = groupInfo?.groupIndex
  proposals.value[toolCall.toolCallId] = {
    id: toolCall.toolCallId,
    toolName: toolCall.toolName,
    args: (toolCall.input ?? {}) as ProposalState['args'],
    status: 'pending',
    groupId,
    groupIndex,
  }
  // Timeout fallback: if the user closes the panel without deciding, the
  // model would otherwise be stuck waiting on this tool-result forever.
  // After 10 minutes, stub a pending decision so the loop terminates.
  const t = setTimeout(() => {
    if (proposals.value[toolCall.toolCallId]?.status === 'pending') {
      deps.addToolResult({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: {
          decision: 'pending',
          timeout: true,
          instruction:
            'The user has not decided within 10 minutes. End your turn with a brief recap; they can act on the proposal card later.',
        },
      })
    }
    proposalTimers.delete(toolCall.toolCallId)
  }, PROPOSAL_TIMEOUT_MS)
  proposalTimers.set(toolCall.toolCallId, t)
}

export function resolveProposal(
  toolCallId: string,
  decision: 'accepted' | 'rejected',
  deps: ProposalResolver
): void {
  const p = proposals.value[toolCallId]
  if (!p) return
  const timer = proposalTimers.get(toolCallId)
  if (timer) {
    clearTimeout(timer)
    proposalTimers.delete(toolCallId)
  }
  deps.addToolResult({
    tool: p.toolName,
    toolCallId,
    output: {
      decision,
      instruction:
        decision === 'accepted'
          ? 'The user accepted your proposal. Continue your turn — propose the next step or summarise.'
          : 'The user rejected your proposal. Ask one clarifying question or propose an alternative; do not re-propose the same thing.',
    },
  })
}

export function getChatInstance(): Chat<UIMessage> {
  if (chatInstance) return chatInstance
  const id = ensureActiveSession()
  const persisted = readSession(id)
  proposals.value = persisted.proposals
  asks.value = persisted.asks ?? {}
  restorePlans({
    active: persisted.activePlan ?? null,
    history: persisted.planHistory ?? [],
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
  // Configurable via VITE_PYTHIA_MAX_AUTO_STEPS at build time, with a
  // dev-convenience runtime override at localStorage.pythiaMaxAutoSteps
  // (no rebuild needed — set it in DevTools, refresh).
  // 15 is the working default for typical "build me a complex cohort"
  // flows (~2 orientation searches + ~5 concept lookups + ~5 client-side
  // proposals + ~3 buffer). Bump it when sparse local vocabularies push
  // the model into long retry chains; tighten it if you observe the
  // "tool-loop forever" failure mode the cap was added to prevent.
  const MAX_AUTO_STEPS = resolveMaxAutoSteps()
  // bao runs ONE Bedrock turn per request and ends with a `finish` chunk
  // carrying a `finishReason` ("tool-calls" | "stop" | "length" | "error").
  // The client is supposed to drive the multi-turn loop only when the model
  // wants more tool round-trips (i.e. `tool-calls`). bao does NOT emit
  // step boundary chunks, so the AI SDK's `lastAssistantMessageIsComplete-
  // WithToolCalls` predicate looks at the whole message as a single step
  // and stays true even after the model has finalised — re-prompting
  // forever. We capture the last finishReason in `onFinish` (fired before
  // `shouldSendAutomatically`) and gate the predicate on it.
  let lastFinishReason: string | undefined
  const sendAutomaticallyWithCap: NonNullable<ConstructorParameters<typeof Chat<UIMessage>>[0]['sendAutomaticallyWhen']> = ({ messages }) => {
    if (lastFinishReason !== 'tool-calls') return false
    if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) return false
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || !Array.isArray(last.parts)) return false
    let toolCallCount = 0
    for (const p of last.parts) {
      const t = (p as { type?: string }).type
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
    onFinish: ({ finishReason }) => {
      lastFinishReason = finishReason
    },
    onToolCall: ({ toolCall }: { toolCall: { toolCallId: string; toolName: string; input: unknown } }) => {
      if (toolCall.toolName === 'navigate_to') {
        if (!hostApplyProposal) return
        handleNavigateTool(
          { toolCallId: toolCall.toolCallId, input: toolCall.input },
          {
            addToolResult: (r) => chat.addToolResult(r),
            applyProposal: hostApplyProposal,
          }
        )
        return
      }
      if (isPlanTool(toolCall.toolName)) {
        const result = applyPlanToolCall(toolCall.toolName, toolCall.input)
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
        recordProposal(
          { toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, input: toolCall.input },
          { addToolResult: (r) => chat.addToolResult(r) },
          { groupId, groupIndex }
        )
        // No auto-stub — accept/reject in ChatPanel calls resolveProposal,
        // which sends the real outcome as the tool-result.
      }
    },
  })

  attachPersistence(chat)
  chatInstance = chat
  return chat
}

export function newChat() {
  clearProposalTimers()
  const id = newSessionId()
  safeWrite(ACTIVE_KEY, id)
  activeSessionId.value = id
  proposals.value = {}
  asks.value = {}
  resetPlans()
  if (chatInstance) chatInstance.messages = []
  // Add the empty session to the index so the picker shows it; it gets a
  // real title once the user sends the first message.
  const idx = readIndex()
  writeIndex([...idx, { id, title: 'New chat', updatedAt: Date.now() }])
}

export function switchToSession(id: string) {
  if (id === activeSessionId.value) return
  clearProposalTimers()
  const persisted = readSession(id)
  safeWrite(ACTIVE_KEY, id)
  activeSessionId.value = id
  proposals.value = persisted.proposals
  asks.value = persisted.asks ?? {}
  restorePlans({
    active: persisted.activePlan ?? null,
    history: persisted.planHistory ?? [],
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
  clearProposalTimers()
  if (chatInstance) chatInstance.messages = []
  proposals.value = {}
  asks.value = {}
  resetPlans()
  const id = activeSessionId.value
  if (id) {
    writeSession(id, {
      messages: [],
      proposals: {},
      activePlan: null,
      planHistory: [],
      asks: {},
    })
    const idx = readIndex().map(s =>
      s.id === id ? { ...s, title: 'New chat', updatedAt: Date.now() } : s
    )
    writeIndex(idx)
  }
}
