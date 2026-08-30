<template>
  <div
    v-if="createdLabel || updatedLabel"
    class="asset-authorship"
    data-testid="asset-authorship"
  >
    <span
      v-if="createdLabel"
      data-testid="asset-authorship-created"
    >{{ createdLabel }}</span>
    <span
      v-if="createdLabel && updatedLabel"
      class="asset-authorship__sep"
      aria-hidden="true"
    >·</span>
    <span
      v-if="updatedLabel"
      data-testid="asset-authorship-updated"
    >{{ updatedLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/date-format'
import { userDisplayName } from '@/utils/user-display'

interface Props {
  createdBy?: unknown
  createdDate?: string | number | null
  modifiedBy?: unknown
  modifiedDate?: string | number | null
}

const props = defineProps<Props>()

const { tv } = useI18n()

function line(labelWithUser: string, labelDateOnly: string, user: unknown, date: string | number | null | undefined) {
  const name = userDisplayName(user)
  if (!name && !date) return null
  if (!name) return `${labelDateOnly} ${formatDate(date)}`
  return date ? `${labelWithUser} ${name}, ${formatDate(date)}` : `${labelWithUser} ${name}`
}

const createdLabel = computed(() =>
  line(
    tv('common.authorship.createdBy', 'Created by'),
    tv('common.authorship.created', 'Created'),
    props.createdBy,
    props.createdDate
  )
)

// Suppressed entirely until the asset has actually been modified. On something
// only ever created it would otherwise restate the line beside it, which is the
// noise the "show modified only when it differs" question in #269 is about.
const updatedLabel = computed(() => {
  if (!props.modifiedDate) return null
  return line(
    tv('common.authorship.updatedBy', 'Updated by'),
    tv('common.authorship.updated', 'Updated'),
    props.modifiedBy,
    props.modifiedDate
  )
})
</script>

<style scoped>
.asset-authorship {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.asset-authorship__sep {
  opacity: 0.6;
}
</style>
