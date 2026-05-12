<script setup lang="ts">
import { ref } from 'vue'
import type { AskOption, AskState } from './types'

const props = defineProps<{ ask: AskState }>()
const emit = defineEmits<{
  answer: [askId: string, answer: { id?: string; label: string }]
}>()

const showCustom = ref(false)
const customText = ref('')

function pick(option: AskOption) {
  if (props.ask.status !== 'pending') return
  emit('answer', props.ask.id, { id: option.id, label: option.label })
}

function submitCustom() {
  if (props.ask.status !== 'pending') return
  const text = customText.value.trim()
  if (!text) return
  emit('answer', props.ask.id, { label: text })
  customText.value = ''
  showCustom.value = false
}

function toggleCustom() {
  showCustom.value = !showCustom.value
}
</script>

<template>
  <div
    class="ask-card"
    :class="{ answered: ask.status === 'answered' }"
  >
    <div class="card-header">
      <span class="badge">Question</span>
    </div>
    <div class="question">
      {{ ask.question }}
    </div>
    <div
      v-if="ask.status === 'pending'"
      class="options"
    >
      <button
        v-for="opt in ask.options"
        :key="opt.id"
        type="button"
        class="option"
        @click="pick(opt)"
      >
        <span class="opt-label">{{ opt.label }}</span>
        <span
          v-if="opt.description"
          class="opt-desc"
        >{{ opt.description }}</span>
      </button>
      <div
        v-if="ask.allowCustom"
        class="custom-row"
      >
        <button
          type="button"
          class="custom-toggle"
          @click="toggleCustom"
        >
          {{ showCustom ? 'Cancel' : 'Other…' }}
        </button>
        <div
          v-if="showCustom"
          class="custom-input"
        >
          <input
            v-model="customText"
            type="text"
            :aria-label="ask.question || 'Custom answer'"
            placeholder="Type your answer…"
            @keydown.enter.prevent="submitCustom"
          >
          <button
            type="button"
            class="custom-send"
            :disabled="!customText.trim()"
            @click="submitCustom"
          >
            Send
          </button>
        </div>
      </div>
    </div>
    <div
      v-else-if="ask.chosen"
      class="status-line"
    >
      <span v-if="ask.chosen.label === '(typed reply)'">Answered by message</span>
      <span v-else>You picked: <strong>{{ ask.chosen.label }}</strong></span>
    </div>
  </div>
</template>

<style scoped>
.ask-card {
  border: 1px solid #c7d2fe;
  border-left: 3px solid #4f46e5;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 6px 0;
  background: #f8fafc;
  font-size: 0.8125rem;
}
.ask-card.answered { opacity: 0.65; }
.card-header { margin-bottom: 4px; }
.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.question {
  font-weight: 600;
  color: #111827;
  line-height: 1.35;
  margin-bottom: 6px;
}
.options { display: flex; flex-direction: column; gap: 4px; }
.option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  cursor: pointer;
  font: inherit;
}
.option:hover { background: #eef2ff; border-color: #818cf8; }
.opt-label { font-weight: 600; color: #1f2937; font-size: 0.8125rem; }
.opt-desc { font-size: 0.6875rem; color: #6b7280; margin-top: 2px; }
.custom-row { margin-top: 4px; display: flex; flex-direction: column; gap: 4px; }
.custom-toggle {
  align-self: flex-start;
  background: transparent;
  border: 0;
  color: #4f46e5;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 0;
  text-decoration: underline;
}
.custom-input { display: flex; gap: 4px; }
.custom-input input {
  flex: 1 1 auto;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.8125rem;
}
.custom-send {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #4f46e5;
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
}
.custom-send:disabled { opacity: 0.5; cursor: not-allowed; }
.status-line { margin-top: 4px; font-size: 0.75rem; color: #4338ca; }
</style>
