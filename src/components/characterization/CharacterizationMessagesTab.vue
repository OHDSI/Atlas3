<!--
  CharacterizationMessagesTab

  Read-only validation report. Runs `validateCharacterization` against the
  current draft and renders the messages grouped by severity. The builder
  uses the same validator to gate the Save button.

  Empty state ("No issues") is shown when there are zero messages of any
  level. Sections that contain no messages are hidden.
-->
<template>
  <div
    class="char-messages-tab"
    data-testid="char-messages-tab"
  >
    <div
      v-if="messages.length === 0"
      class="char-messages-tab__empty"
      data-testid="char-messages-empty"
    >
      <v-icon
        color="success"
        size="small"
        class="me-2"
      >
        mdi-check-circle
      </v-icon>
      {{ t('common.noData', 'No issues. Design is valid.') }}
    </div>

    <template v-else>
      <section
        v-if="errors.length > 0"
        class="char-messages-tab__group"
        data-testid="char-messages-group-errors"
      >
        <h3 class="char-messages-tab__group-title">
          {{ t('characterizations.editor.validation.headers.errors', 'Errors') }}
          ({{ errors.length }})
        </h3>
        <v-list
          density="comfortable"
          class="char-messages-tab__list"
        >
          <v-list-item
            v-for="(msg, idx) in errors"
            :key="`error-${idx}`"
            data-testid="char-messages-item-error"
          >
            <template #prepend>
              <v-icon
                color="error"
                size="small"
              >
                mdi-alert-circle
              </v-icon>
            </template>
            <v-list-item-title>{{ formatMessage(msg) }}</v-list-item-title>
            <v-list-item-subtitle>{{ msg.field }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </section>

      <section
        v-if="warnings.length > 0"
        class="char-messages-tab__group"
        data-testid="char-messages-group-warnings"
      >
        <h3 class="char-messages-tab__group-title">
          {{ t('facets.values.warning', 'Warnings') }}
          ({{ warnings.length }})
        </h3>
        <v-list
          density="comfortable"
          class="char-messages-tab__list"
        >
          <v-list-item
            v-for="(msg, idx) in warnings"
            :key="`warning-${idx}`"
            data-testid="char-messages-item-warning"
          >
            <template #prepend>
              <v-icon
                color="warning"
                size="small"
              >
                mdi-alert
              </v-icon>
            </template>
            <v-list-item-title>{{ formatMessage(msg) }}</v-list-item-title>
            <v-list-item-subtitle>{{ msg.field }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </section>

      <section
        v-if="infos.length > 0"
        class="char-messages-tab__group"
        data-testid="char-messages-group-infos"
      >
        <h3 class="char-messages-tab__group-title">
          {{ t('facets.values.info', 'Notes') }}
          ({{ infos.length }})
        </h3>
        <v-list
          density="comfortable"
          class="char-messages-tab__list"
        >
          <v-list-item
            v-for="(msg, idx) in infos"
            :key="`info-${idx}`"
            data-testid="char-messages-item-info"
          >
            <template #prepend>
              <v-icon
                color="info"
                size="small"
              >
                mdi-information-outline
              </v-icon>
            </template>
            <v-list-item-title>{{ formatMessage(msg) }}</v-list-item-title>
            <v-list-item-subtitle>{{ msg.field }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import {
  validateCharacterization,
  type ValidationMessage,
} from '@/utils/characterization-validators'
import type { CharacterizationDefinition } from '@/models/characterization.types'

const props = defineProps<{
  characterization: CharacterizationDefinition | null
}>()

const { t } = useI18n()

const messages = computed<ValidationMessage[]>(() => {
  if (!props.characterization) return []
  return validateCharacterization(props.characterization)
})

const errors = computed(() => messages.value.filter((m) => m.level === 'error'))
const warnings = computed(() => messages.value.filter((m) => m.level === 'warning'))
const infos = computed(() => messages.value.filter((m) => m.level === 'info'))

function formatMessage(msg: ValidationMessage): string {
  if (msg.ruleId) {
    const key = `characterizations.editor.validation.rules.${msg.ruleId}`
    const translated = msg.params
      ? t(key, msg.message, msg.params).value
      : t(key, msg.message).value
    if (translated && translated !== key) return translated
  }
  return msg.message
}
</script>

<style scoped>
.char-messages-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.char-messages-tab__empty {
  display: flex;
  align-items: center;
  padding: 16px 0;
  color: #2e7d32;
  font-style: italic;
}

.char-messages-tab__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.char-messages-tab__group-title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.char-messages-tab__list {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}
</style>
