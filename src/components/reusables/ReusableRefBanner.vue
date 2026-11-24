<!--
  Shown above a use of a reusable imported into the cohort. Names the
  reusable and the version the cohort holds, links to it, says how many places
  use it, and offers to update the cohort to the reusable's current version
  (every use moves together), detach this use into a plain copy, or remove it.
  The logic below the banner is read-only while it is a use.
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
    <span
      v-if="entry"
      class="reusable-ref-banner__text"
    >
      {{ t('reusables.reference.from') }}
      <router-link
        :to="{ name: 'reusable-edit', params: { id: entry.RefId } }"
        class="reusable-ref-banner__link"
        data-testid="reusable-ref-link"
      >{{ entry.Name || `#${entry.RefId}` }}</router-link>
      <span
        v-if="typeof entry.Version === 'number'"
        class="reusable-ref-banner__version"
        data-testid="reusable-ref-version"
      >{{ t('reusables.reference.version', { version: entry.Version }) }}</span>
      <span
        v-if="useCount > 1"
        class="reusable-ref-banner__version"
        data-testid="reusable-ref-uses"
      >· {{ t('reusables.reference.uses', { count: useCount }) }}</span>
    </span>
    <span
      v-else
      class="reusable-ref-banner__text"
    >
      {{ t('reusables.reference.from') }}
    </span>

    <AtlasChip
      v-if="!entry"
      tone="warning"
      size="xs"
      data-testid="reusable-ref-no-entry"
    >
      {{ t('reusables.reference.noEntry') }}
    </AtlasChip>
    <AtlasChip
      v-else-if="newerVersion !== null"
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
      :title="useCount > 1 ? t('reusables.reference.updateAllHelp', { count: useCount }).value : undefined"
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
      @click="detach"
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
      @click="remove"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { AtlasButton, AtlasChip, AtlasIcon, AtlasSpacer } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useNotifications } from '@/stores/notifications'
import type { Criteria, CriteriaGroup, ReusableUse } from '@/models/circe-types'
import {
  detachUse,
  findEntry,
  findUses,
  fitsKind,
  pruneCatalog,
  updateEntry,
  type ReusableKind,
} from './reusable-catalog'
import { useReusableInsertHost } from './reusable-insert-host'
import { getCurrentReusable, hasNewerVersion, type CurrentReusable } from './reusable-reference'

const props = withDefaults(
  defineProps<{
    /** The criterion or group this banner sits above. */
    target: Criteria | CriteriaGroup
    use: ReusableUse
    kind: ReusableKind
    removable?: boolean
  }>(),
  { removable: true }
)

const emit = defineEmits<{
  remove: []
}>()

const { t } = useI18n()
const notify = useNotifications()
const host = useReusableInsertHost()

const root = computed(() => host?.getCatalogRoot?.() ?? null)
const entry = computed(() => (root.value ? findEntry(root.value, props.kind, props.use.Id) : undefined))
const useCount = computed(() =>
  root.value && entry.value ? findUses(root.value, props.kind, entry.value.Id).length : 0
)

const current = ref<CurrentReusable | null>(null)
const missing = ref(false)

const newerVersion = computed(() => {
  const latest = current.value
  if (!entry.value || !latest || !fitsKind(latest.design, props.kind)) return null
  if (!hasNewerVersion(entry.value, latest.source)) return null
  return latest.source.Version ?? null
})

watch(
  () => entry.value?.RefId,
  async refId => {
    if (refId === undefined) return
    const result = await getCurrentReusable(refId)
    current.value = result
    missing.value = result === null
  },
  { immediate: true }
)

function update() {
  if (!current.value || !host || !root.value || !entry.value) return
  const { design, source } = current.value
  updateEntry(root.value, props.kind, entry.value, design, source, host)
  host.onInserted?.()
  notify.success(
    t('reusables.reference.updated', { name: source.Name ?? '', version: source.Version ?? '' }).value
  )
}

function detach() {
  detachUse(props.target, props.kind)
  if (root.value) pruneCatalog(root.value)
}

async function remove() {
  // Taken before the parent removes the use, which unmounts this banner.
  const catalog = root.value
  emit('remove')
  // Once the use is gone, drop the entry if that was its last use.
  await nextTick()
  if (catalog) pruneCatalog(catalog)
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
