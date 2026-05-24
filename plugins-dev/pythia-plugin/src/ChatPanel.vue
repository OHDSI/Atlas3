<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { AuthContext, MessageBus, Translator } from './main'
import {
  applyProposal,
  getShellContext,
  proposalFromToolCall,
  rejectProposal,
} from './shell-bridge'
import {
  activeSessionId,
  asks,
  clearCurrentSession,
  continueChat,
  deleteChatSession,
  getChatInstance,
  maxStepsReached,
  newChat,
  proposals,
  resolveProposal,
  sessionIndex,
  sessionRouteContext,
  sessionSourceKey,
  sessionToken,
  setHostBridge,
  setTokenProvider,
  switchToSession,
} from './chat-session'
import { activePlan, markStepProgress } from './plan-state'
import PlanCard from './PlanCard.vue'
import type { PlanStep } from './types'
import CriterionProposalCard from './CriterionProposalCard.vue'
import ObservationWindowProposalCard from './ObservationWindowProposalCard.vue'
import ExitCriterionProposalCard from './ExitCriterionProposalCard.vue'
import InclusionRuleProposalCard from './InclusionRuleProposalCard.vue'
import StandaloneConceptSetProposalCard from './StandaloneConceptSetProposalCard.vue'
import FeatureAnalysisProposalCard from './FeatureAnalysisProposalCard.vue'
import CharacterizationProposalCard from './CharacterizationProposalCard.vue'
import PathwayProposalCard from './PathwayProposalCard.vue'
import IncidenceRateProposalCard from './IncidenceRateProposalCard.vue'
import UpdateProposalCard from './UpdateProposalCard.vue'
import ProposalGroupCard from './ProposalGroupCard.vue'
import AskUserCard from './AskUserCard.vue'
import StarterPrompts from './StarterPrompts.vue'
import UndoToast from './UndoToast.vue'
import type { AskState, ProposalState } from './types'

const props = defineProps<{
  authContext: AuthContext
  messageBus: MessageBus
  t: Translator
  getToken?: () => Promise<string>
}>()

const inputText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// The Chat instance lives in chat-session.ts as a module-level singleton so
// it survives this component's mount/unmount cycle (FAB open/close) and is
// hydrated from localStorage on first instantiation. Messages, status, and
// errors are reactive Vue refs inside the Chat.
const chat = getChatInstance()

const messages = computed(() => chat.messages)
const status = computed(() => chat.status)
const error = computed(() => chat.error)
const isStreaming = computed(() => status.value === 'streaming' || status.value === 'submitted')

const proposalList = computed(() => Object.values(proposals.value))
const askList = computed<AskState[]>(() => Object.values(asks.value))

interface ProposalGroup {
  id: string
  items: ProposalState[]
  // Single-item legacy groups (no recorded groupId, or model issued one
  // tool call in a turn) render inline without the wrapper.
  isLegacy: boolean
}

// Bucket proposals by parent assistant-message id. Legacy proposals (no
// groupId) become their own singleton group so they keep rendering exactly
// as they did before grouping landed.
const proposalGroups = computed<ProposalGroup[]>(() => {
  const buckets = new Map<string, ProposalGroup>()
  for (const p of proposalList.value) {
    if (!p.groupId) {
      buckets.set(`__legacy:${p.id}`, {
        id: `__legacy:${p.id}`,
        items: [p],
        isLegacy: true,
      })
      continue
    }
    let g = buckets.get(p.groupId)
    if (!g) {
      g = { id: p.groupId, items: [], isLegacy: false }
      buckets.set(p.groupId, g)
    }
    g.items.push(p)
  }
  for (const g of buckets.values()) {
    g.items.sort((a, b) => (a.groupIndex ?? 0) - (b.groupIndex ?? 0))
  }
  return Array.from(buckets.values())
})

// The last assistant message — that's where the typing indicator attaches
// while a response is streaming. We track it by id so a brand-new
// assistant message that hasn't received any text part yet still gets the
// dots (rendered as a standalone bubble in that case).
const lastAssistantMessage = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') return messages.value[i]
  }
  return null
})

const showTypingIndicator = computed(() => {
  if (!isStreaming.value) return false
  return true
})

// True only for the LAST part overall of the last assistant message AND
// only when that part is text. Keeps the dots glued to the bottom of the
// streaming bubble so any tool chip that arrives next still appears
// ABOVE the typing indicator. When the last part isn't text (e.g. a
// fresh tool-call chip), this returns false and the standalone bubble
// below picks up the indicator.
function isTrailingAssistantTextPart(
  msg: { id: string; role: string; parts?: unknown[] },
  partIdx: number
): boolean {
  if (!showTypingIndicator.value) return false
  if (msg.role !== 'assistant') return false
  if (lastAssistantMessage.value?.id !== msg.id) return false
  const parts = (msg.parts ?? []) as Array<{ type?: string }>
  if (partIdx !== parts.length - 1) return false
  return !!textOf(parts[partIdx])
}

// True when the assistant is mid-stream but the bottom of the
// conversation isn't a text part the dots are already glued to. Covers:
//   - No assistant message yet (user just sent, first chunk pending)
//   - Last assistant part is a tool-call chip (newest tool sits above
//     the dots; the standalone bubble adds them below it)
const showStandaloneTypingBubble = computed(() => {
  if (!showTypingIndicator.value) return false
  const last = lastAssistantMessage.value
  if (!last) {
    const tail = messages.value[messages.value.length - 1]
    return tail?.role === 'user'
  }
  const parts = (last.parts ?? []) as Array<{ type?: string }>
  const tailPart = parts[parts.length - 1]
  // If the last part is text, the trailing dots inside the text bubble
  // are already showing — don't duplicate.
  return !textOf(tailPart)
})

function textOf(part: unknown): string {
  if (part && typeof part === 'object' && 'type' in part && (part as { type: string }).type === 'text') {
    const t = (part as { text?: unknown }).text
    return typeof t === 'string' ? t : ''
  }
  return ''
}

// Configure marked: GFM (tables, strikethrough), break-on-newline, no IDs.
marked.setOptions({ gfm: true, breaks: true })

// Map both raw emoji glyphs and explicit `:mdi-name:` shortcodes to MDI
// icon spans. Atlas3 already loads `@mdi/font` in the host, so the icon
// spans render via the shared font without bundling MDI in the plugin.
const EMOJI_TO_MDI: Record<string, string> = {
  '🔍': 'magnify',
  '🔎': 'magnify',
  '🧪': 'flask',
  '⚗️': 'flask-outline',
  '⚙️': 'cog',
  '📋': 'clipboard-text',
  '📊': 'chart-bar',
  '📈': 'chart-line',
  '✅': 'check-circle',
  '✔️': 'check',
  '❌': 'close-circle',
  '⚠️': 'alert',
  '💡': 'lightbulb-on',
  '🚨': 'alarm-light',
  '💊': 'pill',
  '🩺': 'stethoscope',
  '🧬': 'dna',
  '🏥': 'hospital-building',
  '👤': 'account',
  '👥': 'account-group',
  '📝': 'note-edit',
  '📄': 'file-document',
  '🗒️': 'note-text',
  '🔗': 'link-variant',
  '🎯': 'bullseye',
  '⏱️': 'timer',
  '📅': 'calendar',
  '🔢': 'numeric',
  '🟢': 'circle',
  '🔵': 'circle',
  '🟡': 'circle',
  '🔴': 'circle',
  '🟠': 'circle',
  '⭐': 'star',
  '➕': 'plus',
  '➖': 'minus',
  '🛑': 'stop-circle',
  '🚫': 'cancel',
  '👍': 'thumb-up',
  '👎': 'thumb-down',
}

function iconSpan(mdiName: string): string {
  // `mdi mdi-NAME` is the standard @mdi/font class pair. Inline-icon style
  // keeps it aligned with surrounding text.
  return `<i class="mdi mdi-${mdiName} cohort-agent-chat__inline-icon" aria-hidden="true"></i>`
}

function replaceEmojis(html: string): string {
  let out = html
  // Explicit shortcode: `:mdi-magnify:` or `:mag:` (we accept the prefix or bare)
  out = out.replace(/:mdi-([a-z0-9-]+):/g, (_, name) => iconSpan(name))
  // Raw emoji glyphs
  for (const [glyph, mdi] of Object.entries(EMOJI_TO_MDI)) {
    if (out.includes(glyph)) {
      out = out.split(glyph).join(iconSpan(mdi))
    }
  }
  return out
}

function renderMarkdown(src: string): string {
  if (!src) return ''
  const html = marked.parse(src, { async: false }) as string
  const withIcons = replaceEmojis(html)
  return DOMPurify.sanitize(withIcons, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'aria-hidden'],
    ADD_TAGS: ['i'],
  })
}

function cardComponentFor(toolName: string) {
  switch (toolName) {
    case 'set_observation_window': return ObservationWindowProposalCard
    case 'add_exit_criterion': return ExitCriterionProposalCard
    case 'add_inclusion_rule':
    case 'add_criteria': return InclusionRuleProposalCard
    case 'create_standalone_concept_set': return StandaloneConceptSetProposalCard
    case 'create_feature_analysis': return FeatureAnalysisProposalCard
    case 'create_characterization': return CharacterizationProposalCard
    case 'create_pathway': return PathwayProposalCard
    case 'create_incidence_rate': return IncidenceRateProposalCard
    case 'update_concept_set':
    case 'update_feature_analysis':
    case 'update_characterization':
    case 'update_pathway':
    case 'update_incidence_rate': return UpdateProposalCard
    default: return CriterionProposalCard
  }
}

async function send(text: string) {
  const trimmed = text.trim()
  if (!trimmed || isStreaming.value) return
  maxStepsReached.value = false
  // If there are pending ask_user prompts and the user typed instead of
  // clicking, mark them resolved so the buttons disable and the card
  // doesn't claim credit for an answer it didn't receive. Then schedule
  // dismissal so the resolved card doesn't linger forever.
  for (const a of Object.values(asks.value)) {
    if (a.status === 'pending') {
      a.status = 'answered'
      a.chosen = { label: '(typed reply)' }
      dismissAskLater(a.id, DISMISS_ANSWERED_MS)
    }
  }
  // Re-fetch shell context per send so the model sees the user's CURRENT
  // route + open artifact, not whatever was true at panel-mount time. The
  // body callback in chat-session reads sessionRouteContext.value at
  // request time.
  try {
    const ctx = await getShellContext(props.messageBus)
    sessionSourceKey.value = ctx.sourceKey
    sessionRouteContext.value = ctx.routeContext ?? null
  } catch {
    // Stale context is preferable to no context — keep last known.
  }
  await chat.sendMessage({ text: trimmed })
  inputText.value = ''
}

function onAnswer(askId: string, answer: { id?: string; label: string }) {
  const a = asks.value[askId]
  if (!a || a.status !== 'pending') return
  a.status = 'answered'
  a.chosen = answer
  maxStepsReached.value = false
  // The user's selection feeds the next turn as a normal user message.
  // We deliberately don't go through send() here because that would
  // re-mark all pending asks as "(typed reply)" — but this IS the answer
  // for this ask; for any others still pending the model just hasn't
  // gotten back to them yet. In practice there's only one pending ask at
  // a time.
  void chat.sendMessage({ text: answer.label })
  dismissAskLater(askId, DISMISS_ANSWERED_MS)
}

function onClearSession() {
  clearCurrentSession()
}

function onStop() {
  // chat.stop() aborts the in-flight fetch (and the auto-loop's next POST,
  // since predicate-driven sends require status === 'ready').
  void chat.stop()
}

function onNewChat() {
  newChat()
}

async function onContinue() {
  // Re-snapshot the shell context so the resumed turn sees the user's
  // current route, same as a normal send().
  try {
    const ctx = await getShellContext(props.messageBus)
    sessionSourceKey.value = ctx.sourceKey
    sessionRouteContext.value = ctx.routeContext ?? null
  } catch {
    // Stale context is preferable to no context — keep last known.
  }
  continueChat()
}

function onSwitchSession(id: string) {
  switchToSession(id)
}

function onDeleteSession(id: string, ev: Event) {
  ev.stopPropagation()
  deleteChatSession(id)
}

function formatTimestamp(ts: number): string {
  const now = Date.now()
  const diff = Math.max(0, now - ts)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ts).toLocaleDateString()
}

function onSubmit(e: Event) {
  e.preventDefault()
  send(inputText.value)
}

// Resolved proposal cards self-dismiss after a short delay so the chat
// stream stays clean. Accepted cards linger ~2.5s to give the user a beat
// of "applied!" feedback; rejected cards disappear faster.
const DISMISS_ACCEPTED_MS = 2500
const DISMISS_REJECTED_MS = 1500
const DISMISS_ANSWERED_MS = 2000

function dismissProposalLater(id: string, delay: number) {
  setTimeout(() => {
    delete proposals.value[id]
  }, delay)
}

function dismissAskLater(id: string, delay: number) {
  setTimeout(() => {
    delete asks.value[id]
  }, delay)
}

function onAccept(id: string) {
  const p = proposals.value[id]
  if (!p) return
  p.status = 'accepted'
  const proposal = proposalFromToolCall(p.toolName, p.args)
  if (proposal) {
    applyProposal(props.messageBus, proposal)
    const kind = (proposal as { kind?: string }).kind
    if (kind) markStepProgress(kind, 'done')
  }
  resolveProposal(id, 'accepted', { addToolResult: (r) => chat.addToolResult(r) })
  dismissProposalLater(id, DISMISS_ACCEPTED_MS)
}

function onOpenStep(step: PlanStep) {
  if (!step.linkedRoute) return
  applyProposal(props.messageBus, {
    kind: 'navigate',
    route: { name: step.linkedRoute, params: {} },
  } as never)
  markStepProgress(step.linkedRoute, 'in_progress')
}

function onReject(id: string) {
  const p = proposals.value[id]
  if (!p) return
  p.status = 'rejected'
  rejectProposal(props.messageBus, id)
  resolveProposal(id, 'rejected', { addToolResult: (r) => chat.addToolResult(r) })
  dismissProposalLater(id, DISMISS_REJECTED_MS)
}

function onAcceptGroup(groupId: string) {
  const items = proposalList.value.filter(p => p.groupId === groupId && p.status === 'pending')
  for (const p of items) onAccept(p.id)
}

function onRejectGroup(groupId: string) {
  const items = proposalList.value.filter(p => p.groupId === groupId && p.status === 'pending')
  for (const p of items) onReject(p.id)
}

function pickStarter(text: string) {
  send(text)
}

// Smooth scroll to bottom on new chunks while user is near bottom.
function maybeScrollToBottom() {
  nextTick(() => {
    const el = messagesContainer.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (nearBottom) el.scrollTop = el.scrollHeight
  })
}
watch(() => messages.value.length, maybeScrollToBottom)
watch(
  () => {
    const last = messages.value[messages.value.length - 1]
    return last?.parts ? JSON.stringify(last.parts).length : 0
  },
  maybeScrollToBottom
)

const SIZE_STORAGE_KEY = 'pythia.chatPanel.size'
const MIN_W = 320
const MIN_H = 400
const rootRef = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)
let overlayPanel: HTMLElement | null = null

function rootEl(): HTMLElement | null {
  const r = rootRef.value
  if (!r) return null
  if (r instanceof HTMLElement) return r
  return (r as { $el?: HTMLElement }).$el ?? null
}

function maxW(): number {
  return Math.max(MIN_W, Math.floor(window.innerWidth * 0.9))
}
function maxH(): number {
  return Math.max(MIN_H, Math.floor(window.innerHeight * 0.9))
}
function clampW(w: number): number {
  return Math.min(maxW(), Math.max(MIN_W, Math.round(w)))
}
function clampH(h: number): number {
  return Math.min(maxH(), Math.max(MIN_H, Math.round(h)))
}

function findOverlayPanel(): HTMLElement | null {
  let el: HTMLElement | null = rootEl()
  while (el) {
    if (el.classList && el.classList.contains('plugin-overlay-panel')) return el
    el = el.parentElement
  }
  return null
}

function applySize(w: number, h: number) {
  if (!overlayPanel) return
  overlayPanel.style.width = `${w}px`
  overlayPanel.style.height = `${h}px`
  // Override the host's `max-width: calc(100vw - 48px)` style so user-set
  // sizes can exceed the host default while still respecting our own max.
  overlayPanel.style.maxWidth = 'none'
  overlayPanel.style.maxHeight = 'none'
}

function loadSavedSize() {
  if (!overlayPanel) return
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { w?: number; h?: number }
    if (typeof parsed.w === 'number' && typeof parsed.h === 'number') {
      applySize(clampW(parsed.w), clampH(parsed.h))
    }
  } catch {
    // Corrupt entry; ignore and let host defaults stand.
  }
}

function saveSize(w: number, h: number) {
  try {
    localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify({ w, h }))
  } catch {
    // Quota/private mode — non-fatal.
  }
}

type ResizeAxis = 'x' | 'y' | 'xy'

function startResize(axis: ResizeAxis, ev: PointerEvent) {
  if (!overlayPanel) overlayPanel = findOverlayPanel()
  if (!overlayPanel) return
  ev.preventDefault()
  const rect = overlayPanel.getBoundingClientRect()
  const startX = ev.clientX
  const startY = ev.clientY
  const startW = rect.width
  const startH = rect.height
  const target = ev.currentTarget as HTMLElement
  try { target.setPointerCapture(ev.pointerId) } catch { /* not all browsers */ }

  const prevUserSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'

  const onMove = (e: PointerEvent) => {
    // Panel is anchored bottom-right, so dragging the top-left corner
    // inward (positive dx/dy) shrinks; dragging outward grows.
    let w = startW
    let h = startH
    if (axis === 'x' || axis === 'xy') w = clampW(startW - (e.clientX - startX))
    if (axis === 'y' || axis === 'xy') h = clampH(startH - (e.clientY - startY))
    applySize(w, h)
  }
  const onUp = (e: PointerEvent) => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
    document.body.style.userSelect = prevUserSelect
    try { target.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    if (overlayPanel) {
      const r = overlayPanel.getBoundingClientRect()
      saveSize(Math.round(r.width), Math.round(r.height))
    }
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

function onResizeLeft(e: PointerEvent) { startResize('x', e) }
function onResizeTop(e: PointerEvent) { startResize('y', e) }
function onResizeCorner(e: PointerEvent) { startResize('xy', e) }

onMounted(async () => {
  // Cache a snapshot for first paint, but install the live getToken so the
  // transport always re-reads the current (possibly refreshed) JWT.
  sessionToken.value = props.authContext.token
  if (props.getToken) setTokenProvider(props.getToken)
  setHostBridge({
    bus: props.messageBus,
    applyProposal: (p) => applyProposal(props.messageBus, p as never),
  })
  overlayPanel = findOverlayPanel()
  loadSavedSize()
  const ctx = await getShellContext(props.messageBus)
  sessionSourceKey.value = ctx.sourceKey
  sessionRouteContext.value = ctx.routeContext ?? null
})

// Don't call chat.stop() on unmount — the Chat singleton outlives this
// component, so an in-flight request should keep streaming even if the
// user closes and reopens the panel.
</script>

<template>
  <v-card
    ref="rootRef"
    class="cohort-agent-chat"
    flat
    rounded="lg"
  >
    <div
      class="cohort-agent-chat__resize cohort-agent-chat__resize--left"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat width"
      @pointerdown="onResizeLeft"
    />
    <div
      class="cohort-agent-chat__resize cohort-agent-chat__resize--top"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize chat height"
      @pointerdown="onResizeTop"
    />
    <div
      class="cohort-agent-chat__resize cohort-agent-chat__resize--corner"
      role="separator"
      aria-label="Resize chat"
      @pointerdown="onResizeCorner"
    />
    <v-toolbar
      density="compact"
      color="surface"
      class="cohort-agent-chat__toolbar"
    >
      <v-icon
        icon="mdi-chat-processing-outline"
        class="cohort-agent-chat__title-icon ms-3 me-2"
      />
      <v-toolbar-title class="text-body-1 font-weight-medium">
        {{ t('cohortAgent.title', 'Pythia AI Agent') }}
      </v-toolbar-title>
      <v-spacer />
      <v-menu
        location="bottom end"
        :close-on-content-click="false"
      >
        <template #activator="{ props: act }">
          <v-btn
            v-bind="act"
            :title="t('cohortAgent.history', 'Chat history')"
            icon="mdi-history"
            size="small"
            variant="text"
          />
        </template>
        <v-card
          min-width="280"
          max-width="360"
          class="cohort-agent-chat__history"
        >
          <v-list
            density="compact"
            nav
            max-height="360"
          >
            <v-list-item
              prepend-icon="mdi-plus"
              :title="t('cohortAgent.newChat', 'New chat')"
              @click="onNewChat"
            />
            <v-divider v-if="sessionIndex.length > 0" />
            <v-list-item
              v-for="s in sessionIndex"
              :key="s.id"
              :active="s.id === activeSessionId"
              :title="s.title"
              :subtitle="formatTimestamp(s.updatedAt)"
              @click="onSwitchSession(s.id)"
            >
              <template #append>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  :title="t('cohortAgent.deleteChat', 'Delete chat')"
                  @click="(ev: Event) => onDeleteSession(s.id, ev)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-menu>
      <v-btn
        v-if="messages.length > 0"
        :title="t('cohortAgent.clear', 'Clear chat')"
        icon="mdi-broom"
        size="small"
        variant="text"
        @click="onClearSession"
      />
    </v-toolbar>

    <div
      v-if="activePlan"
      class="cohort-agent-chat__pinned"
    >
      <PlanCard
        :plan="activePlan"
        @open-step="onOpenStep"
      />
    </div>

    <UndoToast />

    <div
      ref="messagesContainer"
      class="cohort-agent-chat__messages"
    >
      <StarterPrompts
        v-if="messages.length === 0"
        @pick="pickStarter"
      />

      <template
        v-for="msg in messages"
        :key="msg.id"
      >
        <div
          v-for="(part, idx) in (msg.parts || [])"
          :key="`${msg.id}-${idx}`"
          class="cohort-agent-chat__row"
          :class="`cohort-agent-chat__row--${msg.role}`"
        >
          <!-- User messages stay plain text; assistant/system render markdown. -->
          <div
            v-if="textOf(part) && msg.role === 'user'"
            class="cohort-agent-chat__bubble cohort-agent-chat__bubble--user"
          >
            {{ textOf(part) }}
          </div>
          <div
            v-else-if="textOf(part)"
            class="cohort-agent-chat__bubble cohort-agent-chat__markdown"
            :class="`cohort-agent-chat__bubble--${msg.role}`"
          >
            <span v-html="renderMarkdown(textOf(part))" />
            <span
              v-if="isTrailingAssistantTextPart(msg, idx)"
              class="cohort-agent-chat__typing cohort-agent-chat__typing--trailing"
              aria-label="Assistant is typing"
            >
              <span class="cohort-agent-chat__typing-dot" />
              <span class="cohort-agent-chat__typing-dot" />
              <span class="cohort-agent-chat__typing-dot" />
            </span>
          </div>

          <v-chip
            v-else-if="typeof part.type === 'string' && part.type.startsWith('tool-')"
            size="small"
            variant="tonal"
            color="info"
            class="cohort-agent-chat__tool-chip"
            label
          >
            <template #prepend>
              <v-icon
                icon="mdi-tools"
                size="18"
              />
            </template>
            {{ part.type.replace(/^tool-/, '') }}
          </v-chip>
        </div>
      </template>

      <div
        v-if="showStandaloneTypingBubble"
        class="cohort-agent-chat__row cohort-agent-chat__row--assistant"
      >
        <div
          class="cohort-agent-chat__bubble cohort-agent-chat__bubble--assistant cohort-agent-chat__bubble--typing"
          aria-label="Assistant is typing"
        >
          <span class="cohort-agent-chat__typing">
            <span class="cohort-agent-chat__typing-dot" />
            <span class="cohort-agent-chat__typing-dot" />
            <span class="cohort-agent-chat__typing-dot" />
          </span>
        </div>
      </div>

      <AskUserCard
        v-for="ask in askList"
        :key="ask.id"
        :ask="ask"
        @answer="onAnswer"
      />

      <template
        v-for="group in proposalGroups"
        :key="group.id"
      >
        <component
          :is="cardComponentFor(group.items[0].toolName)"
          v-if="group.items.length === 1"
          :proposal="group.items[0]"
          @accept="onAccept"
          @reject="onReject"
        />
        <ProposalGroupCard
          v-else
          :group-id="group.id"
          :items="group.items"
          :card-component-for="cardComponentFor"
          @accept-all="onAcceptGroup"
          @reject-all="onRejectGroup"
          @accept-one="onAccept"
          @reject-one="onReject"
        />
      </template>

      <div
        v-if="maxStepsReached && !isStreaming"
        class="continue-card"
      >
        <div class="card-header">
          <span class="badge">Step limit reached</span>
        </div>
        <div class="continue-message">
          {{ t('cohortAgent.continuePrompt', 'The agent paused after reaching its per-turn step budget. Continue to let it keep working on your request.') }}
        </div>
        <div class="actions">
          <button
            type="button"
            class="continue-btn"
            @click="onContinue"
          >
            {{ t('cohortAgent.continueButton', 'Continue') }}
          </button>
        </div>
      </div>

      <v-alert
        v-if="error"
        type="error"
        density="compact"
        class="mt-2"
      >
        {{ error.message }}
      </v-alert>
    </div>

    <v-divider />

    <v-sheet
      class="cohort-agent-chat__composer pa-2"
      elevation="0"
    >
      <form
        class="d-flex"
        @submit="onSubmit"
      >
        <v-text-field
          v-model="inputText"
          :placeholder="t('cohortAgent.inputPlaceholder', 'Describe the cohort you want to build…')"
          variant="outlined"
          density="compact"
          hide-details
          single-line
          autocomplete="off"
        />
        <v-btn
          v-if="isStreaming"
          :title="t('cohortAgent.stop', 'Stop')"
          color="error"
          icon="mdi-stop"
          variant="flat"
          class="ms-2"
          @click="onStop"
        />
        <v-btn
          v-else
          type="submit"
          :disabled="!inputText.trim()"
          color="primary"
          icon="mdi-send"
          variant="flat"
          class="ms-2"
        />
      </form>
    </v-sheet>
  </v-card>
</template>

<style scoped>
.cohort-agent-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: rgb(var(--v-theme-background));
  position: relative;
}
.cohort-agent-chat__resize {
  position: absolute;
  z-index: 5;
  touch-action: none;
  background: transparent;
}
.cohort-agent-chat__resize--left {
  top: 12px;
  bottom: 0;
  left: 0;
  width: 6px;
  cursor: ew-resize;
}
.cohort-agent-chat__resize--top {
  top: 0;
  left: 12px;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}
.cohort-agent-chat__resize--corner {
  top: 0;
  left: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
.cohort-agent-chat__toolbar {
  flex: 0 0 auto;
  /* Vuetify's compact toolbar collapses inner padding; restore breathing
     room so the leading icon and trailing buttons aren't flush with the
     panel edges. */
  padding-inline: 4px;
}
.cohort-agent-chat__toolbar :deep(.v-toolbar__content) {
  padding-inline: 0;
}
.cohort-agent-chat__title-icon {
  opacity: 0.85;
}
.cohort-agent-chat__messages {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cohort-agent-chat__row { display: flex; flex-direction: column; }
.cohort-agent-chat__row--user { align-items: flex-end; }
.cohort-agent-chat__row--assistant, .cohort-agent-chat__row--system { align-items: flex-start; }
.cohort-agent-chat__bubble {
  max-width: 92%;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.cohort-agent-chat__bubble--user {
  background: #1f425a;          /* Atlas3 primary */
  color: #ffffff;
}
.cohort-agent-chat__bubble--assistant,
.cohort-agent-chat__bubble--system {
  background: #f1f4f7;
  color: #1f2937;
  border: 1px solid #e3e8ee;
}
.cohort-agent-chat__markdown :deep(p) { margin: 0 0 0.5em; }
.cohort-agent-chat__markdown :deep(p:last-child) { margin-bottom: 0; }
.cohort-agent-chat__markdown :deep(ul),
.cohort-agent-chat__markdown :deep(ol) { margin: 0.25em 0 0.5em 1.25em; padding: 0; }
.cohort-agent-chat__markdown :deep(li) { margin: 0.15em 0; }
.cohort-agent-chat__markdown :deep(strong) { font-weight: 600; }
.cohort-agent-chat__markdown :deep(em) { font-style: italic; }
.cohort-agent-chat__markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.85em;
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 4px;
}
.cohort-agent-chat__markdown :deep(pre) {
  background: rgba(0, 0, 0, 0.06);
  padding: 8px 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.4em 0;
}
.cohort-agent-chat__markdown :deep(pre code) {
  background: transparent;
  padding: 0;
}
.cohort-agent-chat__markdown :deep(a) {
  color: #1f425a;
  text-decoration: underline;
}
.cohort-agent-chat__markdown :deep(h1),
.cohort-agent-chat__markdown :deep(h2),
.cohort-agent-chat__markdown :deep(h3),
.cohort-agent-chat__markdown :deep(h4) {
  font-weight: 600;
  margin: 0.4em 0 0.25em;
  font-size: 1em;
}
.cohort-agent-chat__markdown :deep(.cohort-agent-chat__inline-icon) {
  font-size: 1.1em;
  vertical-align: -0.15em;
  margin: 0 0.15em 0 0.05em;
  color: #1f425a;
}
.cohort-agent-chat__markdown :deep(blockquote) {
  border-left: 3px solid #cbd5e1;
  margin: 0.4em 0;
  padding: 0.1em 0.6em;
  color: #475569;
}
.cohort-agent-chat__markdown :deep(table) {
  border-collapse: collapse;
  margin: 0.4em 0;
  font-size: 0.85em;
}
.cohort-agent-chat__markdown :deep(th),
.cohort-agent-chat__markdown :deep(td) {
  border: 1px solid #cbd5e1;
  padding: 4px 8px;
  text-align: left;
}
.cohort-agent-chat__text {
  white-space: pre-wrap;
  word-break: break-word;
}
.cohort-agent-chat__tool-chip {
  align-self: flex-start;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.cohort-agent-chat__tool-chip :deep(.v-chip__prepend) {
  margin-inline-end: 6px;
}
.cohort-agent-chat__composer { flex: 0 0 auto; }
.cohort-agent-chat__pinned {
  flex: 0 0 auto;
  padding: 6px 12px 0;
  background: rgb(var(--v-theme-background));
}
.cohort-agent-chat__typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cohort-agent-chat__typing--trailing {
  margin-left: 6px;
  vertical-align: middle;
}
.cohort-agent-chat__typing-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.35;
  animation: cohort-agent-typing 1.2s infinite ease-in-out;
}
.cohort-agent-chat__typing-dot:nth-child(2) { animation-delay: 0.15s; }
.cohort-agent-chat__typing-dot:nth-child(3) { animation-delay: 0.3s; }
.cohort-agent-chat__bubble--typing {
  color: #4b5563;
  padding: 10px 14px;
}
@keyframes cohort-agent-typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30% { transform: translateY(-3px); opacity: 0.9; }
}
.continue-card {
  border: 1px solid #fde68a;
  border-left: 3px solid #d97706;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 6px 0;
  background: #fffbeb;
  font-size: 0.8125rem;
}
.continue-card .card-header { margin-bottom: 4px; }
.continue-card .badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  background: #fde68a;
  color: #78350f;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.continue-card .continue-message {
  color: #1f2937;
  line-height: 1.4;
  margin-bottom: 6px;
}
.continue-card .actions { display: flex; justify-content: flex-end; }
.continue-card .continue-btn {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #d97706;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}
.continue-card .continue-btn:hover { background: #b45309; }
</style>
