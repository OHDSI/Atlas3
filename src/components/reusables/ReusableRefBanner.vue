<!--
  Shown above logic that was inserted from a reusable by reference. Names the
  reusable and the version the logic came from, links to it, and offers to
  update to the reusable's current version or detach into a plain copy. The
  logic below the banner is read-only while it is a reference.
-->
<template>
  <div
    class="reusable-ref-banner"
    data-testid="reusable-ref-banner"
  >
    <AtlasIcon
      icon="mdi-puzzle-outline"
      size="18"
      class="reusable-ref-banner__icon"
    />
    <span class="reusable-ref-banner__text">
      {{ t('reusables.reference.from') }}
      <router-link
        :to="{ name: 'reusable-edit', params: { id: reference.Id } }"
        class="reusable-ref-banner__link"
        data-testid="reusable-ref-link"
      >{{ reference.Name || `#${reference.Id}` }}</router-link>
      <span
        v-if="typeof reference.Version === 'number'"
        class="reusable-ref-banner__version"
        data-testid="reusable-ref-version"
      >{{ t('reusables.reference.version', { version: reference.Version }) }}</span>
    </span>

    <AtlasChip
      v-if="newerVersion !== null"
      tone="info"
      size="xs"
      data-testid="reusable-ref-update-available"
    >
      {{ t('reusables.reference.updateAvailable', { version: newerVersion }) }}
    </AtlasChip>
    <AtlasChip
      v-else-if="missing"
      tone="warning"
      size="xs"
      data-testid="reusable-ref-missing"
    >
      {{ t('reusables.reference.missing') }}
    </AtlasChip>

    <AtlasSpacer />

    <AtlasButton
      v-if="newerVersion !== null"
      variant="ghost"
      size="sm"
      :loading="updating"
      data-testid="reusable-ref-update"
      @click="update"
    >
      {{ t('reusables.reference.update', { version: newerVersion }) }}
    </AtlasButton>
    <AtlasButton
      variant="ghost"
      size="sm"
      :title="t('reusables.reference.detachHelp').value"
      data-testid="reusable-ref-detach"
      @click="emit('detach')"
    >
      {{ t('reusables.reference.detach') }}
    </AtlasButton>
    <AtlasButton
      v-if="removable"
      icon="mdi-delete"
      variant="ghost"
      color="error"
      size="sm"
      :aria-label="t('common.delete').value"
      data-testid="reusable-ref-remove"
      @click="emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AtlasButton, AtlasChip, AtlasIcon, AtlasSpacer } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useNotifications } from '@/stores/notifications'
import type { ReusableRef } from '@/models/circe-types'
import {
  canInsertByReference,
  instantiateReusable,
  type ReusableInstance,
} from './reusable-design'
import { useReusableInsertHost } from './reusable-insert-host'
import { getCurrentReusable, hasNewerVersion, type CurrentReusable } from './reusable-reference'

const props = withDefaults(
  defineProps<{
    reference: ReusableRef
    /** What the reference stands in for, so an update can be checked to still fit. */
    kind: 'criteria' | 'group'
    removable?: boolean
  }>(),
  { removable: true }
)

const emit = defineEmits<{
  update: [instance: ReusableInstance]
  detach: []
  remove: []
}>()

const { t } = useI18n()
const notify = useNotifications()
const host = useReusableInsertHost()

const current = ref<CurrentReusable | null>(null)
const missing = ref(false)
const updating = ref(false)

/** Whether the current version still has the shape this reference stands in for. */
const fits = computed(() => {
  const design = current.value?.design
  if (!design || !canInsertByReference(design)) return false
  return props.kind === 'group' ? design.type === 'CRITERIA_GROUP' : design.type === 'INITIAL_EVENT'
})

const newerVersion = computed(() => {
  const latest = current.value?.reference
  if (!latest || !fits.value || !hasNewerVersion(props.reference, latest)) return null
  return latest.Version ?? null
})

onMounted(async () => {
  const result = await getCurrentReusable(props.reference.Id)
  current.value = result
  missing.value = result === null
})

function update() {
  if (!current.value || !host) return
  updating.value = true
  const instance = instantiateReusable(current.value.design, host.getConceptSets(), {}, {
    reference: current.value.reference,
  })
  for (const conceptSet of instance.conceptSets) host.addConceptSet(conceptSet)
  emit('update', instance)
  host.onInserted?.()
  updating.value = false
  notify.success(
    t('reusables.reference.updated', {
      name: current.value.reference.Name ?? '',
      version: current.value.reference.Version ?? '',
    }).value
  )
}
</script>

<style scoped>
.reusable-ref-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 6px 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 0.875rem;
}

.reusable-ref-banner__icon {
  color: rgb(var(--v-theme-primary));
}

.reusable-ref-banner__link {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.reusable-ref-banner__version {
  margin-left: 4px;
  color: rgba(var(--v-theme-on-surface), 0.64);
}
</style>
