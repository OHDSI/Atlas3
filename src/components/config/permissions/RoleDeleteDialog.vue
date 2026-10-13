<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="CONFIRM"
    :title="t('components.config.permissions.deleteRoleTitle').value"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <AtlasAlert
      v-if="userCount > 0"
      severity="warning"
      class="mb-4"
    >
      <div class="text-body-1">
        {{ t('components.config.permissions.roleAssignedTo').value }}
        <strong>{{ userCount }}
          {{
            userCount !== 1
              ? t('components.config.permissions.usersWord').value
              : t('components.config.permissions.userWord').value
          }}</strong>.
      </div>
      <div class="text-body-2 mt-2">
        {{
          t('components.config.permissions.deleteRemovesFromUsers').value
        }}
      </div>
    </AtlasAlert>

    <p class="text-body-1">
      {{
        t('components.config.permissions.confirmDeleteRolePrefix').value
      }}
      <strong>"{{ role?.name }}"</strong>?
    </p>

    <p class="text-body-2 text-medium-emphasis mt-2">
      {{ t('common.cannotUndo').value }}
    </p>

    <AtlasAlert
      v-if="serverError"
      severity="danger"
      class="mt-4"
      :closable="true"
      @close="serverError = null"
    >
      {{ serverError }}
    </AtlasAlert>
    <template #actions>
      <AtlasButton
        variant="ghost"
        :disabled="deleting"
        @click="handleClose"
      >
        {{ t('common.cancel').value }}
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :disabled="deleting"
        :loading="deleting"
        @click="handleDelete"
      >
        {{ t('components.config.permissions.deleteRoleButton').value }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog } from '@/components/ui'
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'

const { t, tv } = useI18n()

interface Props {
  modelValue: boolean
  role: Role | null
  userCount?: number // FR-005: Show number of assigned users
}

const props = withDefaults(defineProps<Props>(), {
  userCount: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const { deleteRole } = useRoles()

const deleting = ref(false)
const serverError = ref<string | null>(null)

// Watch for dialog open to reset error state
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      serverError.value = null
    }
  }
)

async function handleDelete() {
  if (!props.role) return

  serverError.value = null
  deleting.value = true

  try {
    const success = await deleteRole(props.role.id)

    if (success) {
      emit('success')
      emit('update:modelValue', false)
    } else {
      serverError.value = tv('components.config.permissions.deleteRoleError')
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.unexpectedError')
    serverError.value = message
  } finally {
    deleting.value = false
  }
}

function handleClose() {
  if (!deleting.value) {
    serverError.value = null
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
/* No custom styles needed - using Vuetify defaults */
</style>
