<template>
  <div
    class="apikeys-admin"
    data-testid="apikeys-admin"
  >
    <v-card>
      <v-card-title>{{ t('apiKeys.admin.title') }}</v-card-title>
      <v-card-text>
        <p class="text-body-1 mb-4">
          {{ t('apiKeys.admin.help') }}
        </p>

        <div class="apikeys-admin__toolbar">
          <AtlasTextField
            v-model="filter"
            :label="t('apiKeys.admin.filter').value"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            class="apikeys-admin__filter"
            data-testid="apikeys-admin-filter"
          />
          <AtlasSwitch
            v-model="showDisabled"
            :label="t('apiKeys.admin.showDisabled').value"
            hide-details
            data-testid="apikeys-admin-show-disabled"
          />
        </div>

        <AtlasAlert
          v-if="error"
          severity="danger"
          density="compact"
          class="mb-4"
        >
          <div class="d-flex align-center justify-space-between">
            <span>{{ error }}</span>
            <AtlasButton
              variant="ghost"
              size="sm"
              @click="loadKeys"
            >
              {{ t('common.retry') }}
            </AtlasButton>
          </div>
        </AtlasAlert>

        <AtlasDataTable
          :headers="headers"
          :items="visibleKeys"
          :loading="loading"
          :no-data-text="t('apiKeys.admin.empty').value"
          data-testid="apikeys-admin-table"
        >
          <template #item.owner="{ item }">
            {{ ownerLabel(item as AdminApiKeyInfo) }}
          </template>
          <template #item.createdAt="{ item }">
            {{ formatDate((item as AdminApiKeyInfo).createdAt, '—') }}
          </template>
          <template #item.expiresAt="{ item }">
            {{ formatDate((item as AdminApiKeyInfo).expiresAt, t('apiKeys.list.never').value) }}
          </template>
          <template #item.lastUsedAt="{ item }">
            {{ formatDate((item as AdminApiKeyInfo).lastUsedAt, t('apiKeys.list.neverUsed').value) }}
          </template>
          <template #item.status="{ item }">
            <AtlasChip
              :tone="statusTone(item as AdminApiKeyInfo)"
              size="sm"
            >
              {{ statusLabel(item as AdminApiKeyInfo) }}
            </AtlasChip>
          </template>
          <template #item.actions="{ item }">
            <AtlasIconButton
              v-if="!(item as AdminApiKeyInfo).disabled"
              icon="mdi-cancel"
              size="sm"
              variant="text"
              tone="neutral"
              :aria-label="t('apiKeys.list.revoke').value"
              :data-testid="`apikeys-admin-revoke-${(item as AdminApiKeyInfo).keyIdentifier}`"
              @click="confirm('revoke', item as AdminApiKeyInfo)"
            />
            <AtlasIconButton
              icon="mdi-delete-outline"
              size="sm"
              variant="text"
              tone="danger"
              :aria-label="t('common.delete').value"
              :data-testid="`apikeys-admin-delete-${(item as AdminApiKeyInfo).keyIdentifier}`"
              @click="confirm('delete', item as AdminApiKeyInfo)"
            />
          </template>
        </AtlasDataTable>
      </v-card-text>
    </v-card>

    <AtlasDialog
      v-model="dialogOpen"
      eyebrow="CONFIRM"
      :title="dialogTitle"
      max-width="480"
      @close="dialogOpen = false"
    >
      <span data-testid="apikeys-admin-confirm-message">{{ dialogMessage }}</span>
      <template #actions>
        <AtlasButton
          variant="ghost"
          data-testid="apikeys-admin-cancel"
          @click="dialogOpen = false"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          :loading="actioning"
          data-testid="apikeys-admin-confirm"
          @click="performAction"
        >
          {{ pendingAction === 'delete' ? t('common.delete') : t('apiKeys.list.revoke') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  AtlasAlert,
  AtlasButton,
  AtlasChip,
  AtlasDataTable,
  AtlasDialog,
  AtlasIconButton,
  AtlasTextField,
} from '@/components/ui'
import AtlasSwitch from '@/components/ui/AtlasSwitch.vue'
import type { AtlasChipTone } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useNotifications } from '@/stores/notifications'
import { adminDeleteApiKey, adminRevokeApiKey, listAllApiKeys } from '@/services/apikey.service'
import { apiKeyInstantToDate, type AdminApiKeyInfo } from '@/models/apikey.types'
import { formatDateTime } from '@/utils/format'

type Action = 'revoke' | 'delete'

const { t } = useI18n()
const notify = useNotifications()

const keys = ref<AdminApiKeyInfo[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const filter = ref('')
const showDisabled = ref(false)
const dialogOpen = ref(false)
const pendingAction = ref<Action>('revoke')
const selectedKey = ref<AdminApiKeyInfo | null>(null)
const actioning = ref(false)

const headers = computed(() => [
  { title: t('apiKeys.admin.owner').value, key: 'owner', value: (key: unknown) => ownerLabel(key as AdminApiKeyInfo) },
  { title: t('columns.name').value, key: 'name' },
  { title: t('apiKeys.list.columns.identifier').value, key: 'keyIdentifier' },
  { title: t('columns.created').value, key: 'createdAt' },
  { title: t('apiKeys.list.columns.expires').value, key: 'expiresAt' },
  { title: t('apiKeys.list.columns.lastUsed').value, key: 'lastUsedAt' },
  { title: t('columns.status').value, key: 'status', sortable: false },
  { title: t('columns.actions').value, key: 'actions', sortable: false },
])

const visibleKeys = computed(() => {
  const needle = (filter.value ?? '').trim().toLowerCase()
  return keys.value.filter(key => {
    if (!showDisabled.value && key.disabled) return false
    if (!needle) return true
    return [key.ownerLogin, key.ownerName, key.name, key.keyIdentifier]
      .some(field => field?.toLowerCase().includes(needle))
  })
})

function ownerLabel(key: AdminApiKeyInfo): string {
  return key.ownerName && key.ownerName !== key.ownerLogin
    ? `${key.ownerName} (${key.ownerLogin})`
    : key.ownerLogin
}

function formatDate(value: string | number | null | undefined, fallback: string): string {
  const date = apiKeyInstantToDate(value)
  return date ? formatDateTime(date) : fallback
}

function isExpired(key: AdminApiKeyInfo): boolean {
  const expires = apiKeyInstantToDate(key.expiresAt)
  return !!expires && expires.getTime() < Date.now()
}

function statusLabel(key: AdminApiKeyInfo): string {
  if (key.disabled) return t('apiKeys.list.status.disabled').value
  if (isExpired(key)) return t('apiKeys.list.status.expired').value
  return t('apiKeys.list.status.active').value
}

function statusTone(key: AdminApiKeyInfo): AtlasChipTone {
  if (key.disabled) return 'neutral'
  if (isExpired(key)) return 'warning'
  return 'success'
}

const dialogTitle = computed(() => pendingAction.value === 'delete'
  ? t('apiKeys.list.deleteConfirmTitle').value
  : t('apiKeys.list.revokeConfirmTitle').value)

const dialogMessage = computed(() => {
  const key = selectedKey.value
  if (!key) return ''
  const params = { name: key.name, owner: ownerLabel(key) }
  return pendingAction.value === 'delete'
    ? t('apiKeys.admin.deleteConfirm', params).value
    : t('apiKeys.admin.revokeConfirm', params).value
})

async function loadKeys() {
  loading.value = true
  error.value = null
  const result = await listAllApiKeys()
  if (result.success) {
    keys.value = result.data
  } else {
    error.value = result.error.message
  }
  loading.value = false
}

function confirm(action: Action, key: AdminApiKeyInfo) {
  pendingAction.value = action
  selectedKey.value = key
  dialogOpen.value = true
}

async function performAction() {
  const key = selectedKey.value
  if (!key) return
  const action = pendingAction.value
  actioning.value = true
  const result = action === 'delete'
    ? await adminDeleteApiKey(key.keyIdentifier)
    : await adminRevokeApiKey(key.keyIdentifier)
  actioning.value = false
  dialogOpen.value = false
  if (result.success) {
    notify.success(t(action === 'delete' ? 'apiKeys.list.deleted' : 'apiKeys.list.revoked').value)
    await loadKeys()
  } else {
    notify.danger(t(action === 'delete' ? 'apiKeys.list.deleteError' : 'apiKeys.list.revokeError').value)
  }
}

onMounted(loadKeys)
</script>

<style scoped>
.apikeys-admin__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.apikeys-admin__filter { flex: 1 1 260px; max-width: 420px; }
</style>
