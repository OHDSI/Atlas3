<template>
  <AtlasPageShell
    hero
    compact
    eyebrow="ACCOUNT"
    :title="t('apiKeys.list.title', 'API Keys').value"
    :subtitle="t('apiKeys.list.subtitle', 'Manage personal API keys for programmatic access to WebAPI.').value"
  >
    <template #actions>
      <AtlasButton
        icon="mdi-plus"
        data-testid="apikeys-create"
        @click="showCreateDialog = true"
      >
        {{ t('apiKeys.list.newButton', 'New Key') }}
      </AtlasButton>
    </template>

    <AtlasAlert
      v-if="error"
      severity="danger"
      density="compact"
      class="apikeys-view__alert"
    >
      <div class="d-flex align-center justify-space-between">
        <span>{{ error }}</span>
        <AtlasButton
          variant="ghost"
          size="sm"
          @click="loadKeys"
        >
          {{ t('common.retry', 'Retry') }}
        </AtlasButton>
      </div>
    </AtlasAlert>

    <AtlasDataTable
      :headers="headers"
      :items="keys"
      :loading="loading"
      :no-data-text="t('apiKeys.list.empty', 'You haven\'t created any API keys yet.').value"
      data-testid="apikeys-table"
    >
      <template #item.expiresAt="{ item }">
        {{ formatExpires((item as ApiKeyInfo).expiresAt) }}
      </template>
      <template #item.lastUsedAt="{ item }">
        {{ formatLastUsed((item as ApiKeyInfo).lastUsedAt) }}
      </template>
      <template #item.createdAt="{ item }">
        {{ formatDate((item as ApiKeyInfo).createdAt) }}
      </template>
      <template #item.status="{ item }">
        <AtlasChip
          :tone="statusTone(item as ApiKeyInfo)"
          size="sm"
        >
          {{ statusLabel(item as ApiKeyInfo) }}
        </AtlasChip>
      </template>
      <template #item.actions="{ item }">
        <AtlasIconButton
          v-if="!(item as ApiKeyInfo).disabled"
          icon="mdi-cancel"
          size="sm"
          variant="text"
          tone="neutral"
          :aria-label="t('apiKeys.list.revoke', 'Revoke').value"
          :data-testid="`apikeys-revoke-${(item as ApiKeyInfo).keyIdentifier}`"
          @click="confirmRevoke(item as ApiKeyInfo)"
        />
        <AtlasIconButton
          icon="mdi-delete-outline"
          size="sm"
          variant="text"
          tone="danger"
          :aria-label="t('apiKeys.list.delete', 'Delete').value"
          :data-testid="`apikeys-delete-${(item as ApiKeyInfo).keyIdentifier}`"
          @click="confirmDelete(item as ApiKeyInfo)"
        />
      </template>
    </AtlasDataTable>
  </AtlasPageShell>

  <ApiKeyCreateDialog
    v-model="showCreateDialog"
    @created="loadKeys"
  />

  <AtlasDialog
    v-model="showRevokeDialog"
    eyebrow="CONFIRM"
    :title="t('apiKeys.list.revokeConfirmTitle', 'Revoke API Key').value"
    max-width="480"
    @close="showRevokeDialog = false"
  >
    <span v-if="selectedKey">{{ revokeMessage }}</span>
    <template #actions>
      <AtlasButton
        variant="ghost"
        data-testid="apikeys-revoke-cancel"
        @click="showRevokeDialog = false"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :loading="actioning"
        data-testid="apikeys-revoke-confirm"
        @click="performRevoke"
      >
        {{ t('apiKeys.list.revoke', 'Revoke') }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <AtlasDialog
    v-model="showDeleteDialog"
    eyebrow="CONFIRM"
    :title="t('apiKeys.list.deleteConfirmTitle', 'Delete API Key').value"
    max-width="480"
    @close="showDeleteDialog = false"
  >
    <span v-if="selectedKey">{{ deleteMessage }}</span>
    <template #actions>
      <AtlasButton
        variant="ghost"
        data-testid="apikeys-delete-cancel"
        @click="showDeleteDialog = false"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :loading="actioning"
        data-testid="apikeys-delete-confirm"
        @click="performDelete"
      >
        {{ t('apiKeys.list.delete', 'Delete') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  AtlasPageShell,
  AtlasButton,
  AtlasAlert,
  AtlasDataTable,
  AtlasChip,
  AtlasIconButton,
  AtlasDialog,
} from '@/components/ui'
import type { AtlasChipTone } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useNotifications } from '@/stores/notifications'
import { listApiKeys, revokeApiKey, deleteApiKey } from '@/services/apikey.service'
import { apiKeyInstantToDate, type ApiKeyInfo } from '@/models/apikey.types'
import { formatDateTime } from '@/utils/format'
import ApiKeyCreateDialog from '@/components/apikey/ApiKeyCreateDialog.vue'

const { t } = useI18n()
const notify = useNotifications()

const keys = ref<ApiKeyInfo[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showCreateDialog = ref(false)
const showRevokeDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedKey = ref<ApiKeyInfo | null>(null)
const actioning = ref(false)

const headers = computed(() => [
  { title: t('apiKeys.list.columns.name', 'Name').value, key: 'name' },
  { title: t('apiKeys.list.columns.description', 'Description').value, key: 'description' },
  { title: t('apiKeys.list.columns.identifier', 'Key Identifier').value, key: 'keyIdentifier' },
  { title: t('apiKeys.list.columns.created', 'Created').value, key: 'createdAt' },
  { title: t('apiKeys.list.columns.expires', 'Expires').value, key: 'expiresAt' },
  { title: t('apiKeys.list.columns.lastUsed', 'Last Used').value, key: 'lastUsedAt' },
  { title: t('apiKeys.list.columns.status', 'Status').value, key: 'status', sortable: false },
  { title: t('apiKeys.list.columns.actions', 'Actions').value, key: 'actions', sortable: false },
])

function formatDate(value: string | number | null | undefined): string {
  const date = apiKeyInstantToDate(value)
  return date ? formatDateTime(date) : '—'
}

function formatExpires(value: string | number | null | undefined): string {
  const date = apiKeyInstantToDate(value)
  return date ? formatDateTime(date) : t('apiKeys.list.never', 'Never').value
}

function formatLastUsed(value: string | number | null | undefined): string {
  const date = apiKeyInstantToDate(value)
  return date ? formatDateTime(date) : t('apiKeys.list.neverUsed', 'Never used').value
}

function isExpired(key: ApiKeyInfo): boolean {
  const expires = apiKeyInstantToDate(key.expiresAt)
  return !!expires && expires.getTime() < Date.now()
}

function statusLabel(key: ApiKeyInfo): string {
  if (key.disabled) return t('apiKeys.list.status.disabled', 'Disabled').value
  if (isExpired(key)) return t('apiKeys.list.status.expired', 'Expired').value
  return t('apiKeys.list.status.active', 'Active').value
}

function statusTone(key: ApiKeyInfo): AtlasChipTone {
  if (key.disabled) return 'neutral'
  if (isExpired(key)) return 'warning'
  return 'success'
}

async function loadKeys() {
  loading.value = true
  error.value = null
  const result = await listApiKeys()
  if (result.success) {
    keys.value = result.data
  } else {
    error.value = result.error.message
  }
  loading.value = false
}

function confirmRevoke(key: ApiKeyInfo) {
  selectedKey.value = key
  showRevokeDialog.value = true
}

function confirmDelete(key: ApiKeyInfo) {
  selectedKey.value = key
  showDeleteDialog.value = true
}

const revokeMessage = computed(() => {
  if (!selectedKey.value) return ''
  return t(
    'apiKeys.list.revokeConfirm',
    `Revoke the key '${selectedKey.value.name}'? It will stop working immediately, but stays listed here.`,
    { name: selectedKey.value.name }
  ).value
})

const deleteMessage = computed(() => {
  if (!selectedKey.value) return ''
  return t(
    'apiKeys.list.deleteConfirm',
    `Permanently delete the key '${selectedKey.value.name}'? This cannot be undone.`,
    { name: selectedKey.value.name }
  ).value
})

async function performRevoke() {
  if (!selectedKey.value) return
  actioning.value = true
  const result = await revokeApiKey(selectedKey.value.keyIdentifier)
  actioning.value = false
  showRevokeDialog.value = false
  if (result.success) {
    notify.success(t('apiKeys.list.revoked', 'API key revoked').value)
    await loadKeys()
  } else {
    notify.danger(t('apiKeys.list.revokeError', 'Failed to revoke API key').value)
  }
}

async function performDelete() {
  if (!selectedKey.value) return
  actioning.value = true
  const result = await deleteApiKey(selectedKey.value.keyIdentifier)
  actioning.value = false
  showDeleteDialog.value = false
  if (result.success) {
    notify.success(t('apiKeys.list.deleted', 'API key deleted').value)
    await loadKeys()
  } else {
    notify.danger(t('apiKeys.list.deleteError', 'Failed to delete API key').value)
  }
}

onMounted(loadKeys)
</script>

<style scoped>
.apikeys-view__alert {
  margin-bottom: 16px;
}
</style>
