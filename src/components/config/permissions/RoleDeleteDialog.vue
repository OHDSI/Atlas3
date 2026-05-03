<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="CONFIRM"
    title="Delete Role?"
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
        This role is assigned to
        <strong>{{ userCount }} user{{ userCount !== 1 ? 's' : '' }}</strong>.
      </div>
      <div class="text-body-2 mt-2">
        Deleting this role will remove it from all assigned users.
      </div>
    </AtlasAlert>

    <p class="text-body-1">
      Are you sure you want to delete the role
      <strong>"{{ role?.name }}"</strong>?
    </p>

    <p class="text-body-2 text-medium-emphasis mt-2">
      This action cannot be undone.
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
        Cancel
      </AtlasButton>
      <AtlasButton
        variant="danger"
        :disabled="deleting"
        :loading="deleting"
        @click="handleDelete"
      >
        Delete Role
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog } from '@/components/ui'
import { ref, watch } from 'vue'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'

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
      serverError.value = 'Failed to delete role. Please try again.'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
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
