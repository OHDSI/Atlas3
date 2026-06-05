<!-- src/components/ui/AtlasDialog.story.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import AtlasDialog from './AtlasDialog.vue'
import AtlasButton from './AtlasButton.vue'
import AtlasTextField from './AtlasTextField.vue'

const open = ref(false)
const openWithSubtitle = ref(false)
const openWithForm = ref(false)
const openPersistent = ref(false)
const formName = ref('')
</script>

<template>
  <Story
    title="AtlasDialog"
    group="tier-a"
  >
    <Variant title="confirm dialog">
      <AtlasButton @click="open = true">
        Open dialog
      </AtlasButton>
      <AtlasDialog
        v-model="open"
        eyebrow="CONFIRM"
        title="Discard changes?"
        @close="open = false"
      >
        <p>This will lose any unsaved edits.</p>
        <template #actions>
          <AtlasButton
            variant="ghost"
            @click="open = false"
          >
            Cancel
          </AtlasButton>
          <AtlasButton
            variant="danger"
            @click="open = false"
          >
            Discard
          </AtlasButton>
        </template>
      </AtlasDialog>
    </Variant>

    <Variant title="with subtitle">
      <AtlasButton @click="openWithSubtitle = true">
        Open
      </AtlasButton>
      <AtlasDialog
        v-model="openWithSubtitle"
        eyebrow="COHORT"
        title="Save current cohort"
        subtitle="Saves a new version with your latest changes."
        @close="openWithSubtitle = false"
      >
        <p>Body content here.</p>
        <template #actions>
          <AtlasButton
            variant="ghost"
            @click="openWithSubtitle = false"
          >
            Cancel
          </AtlasButton>
          <AtlasButton @click="openWithSubtitle = false">
            Save
          </AtlasButton>
        </template>
      </AtlasDialog>
    </Variant>

    <Variant title="with form body">
      <AtlasButton @click="openWithForm = true">
        Open
      </AtlasButton>
      <AtlasDialog
        v-model="openWithForm"
        eyebrow="NEW"
        title="Create cohort"
        :max-width="640"
        @close="openWithForm = false"
      >
        <AtlasTextField
          v-model="formName"
          label="Cohort name"
          required
        />
        <template #actions>
          <AtlasButton
            variant="ghost"
            @click="openWithForm = false"
          >
            Cancel
          </AtlasButton>
          <AtlasButton @click="openWithForm = false">
            Create
          </AtlasButton>
        </template>
      </AtlasDialog>
    </Variant>

    <Variant title="persistent (no overlay close)">
      <AtlasButton @click="openPersistent = true">
        Open persistent
      </AtlasButton>
      <AtlasDialog
        v-model="openPersistent"
        eyebrow="ATTENTION"
        title="Required action"
        persistent
        @close="openPersistent = false"
      >
        <p>You must explicitly dismiss this dialog. Clicking the overlay or pressing escape won't close it.</p>
        <template #actions>
          <AtlasButton @click="openPersistent = false">
            OK
          </AtlasButton>
        </template>
      </AtlasDialog>
    </Variant>
  </Story>
</template>
