<script setup lang="ts">
import { ref } from 'vue'
import AtlasSnackbar from './AtlasSnackbar.vue'
import AtlasButton from './AtlasButton.vue'

const open = ref(false)
const openSuccess = ref(false)
const openWarning = ref(false)
const openDanger = ref(false)
const openTop = ref(false)
</script>

<template>
  <Story
    title="AtlasSnackbar"
    group="components"
  >
    <Variant title="info">
      <AtlasButton @click="open = true">
        Show info snackbar
      </AtlasButton>
      <AtlasSnackbar
        v-model="open"
        text="An informational message."
      />
    </Variant>
    <Variant title="success">
      <AtlasButton
        variant="secondary"
        @click="openSuccess = true"
      >
        Show success
      </AtlasButton>
      <AtlasSnackbar
        v-model="openSuccess"
        severity="success"
        text="Cohort saved."
      />
    </Variant>
    <Variant title="warning">
      <AtlasButton
        variant="secondary"
        @click="openWarning = true"
      >
        Show warning
      </AtlasButton>
      <AtlasSnackbar
        v-model="openWarning"
        severity="warning"
        text="No data sources selected."
      />
    </Variant>
    <Variant title="danger">
      <AtlasButton
        variant="danger"
        @click="openDanger = true"
      >
        Show danger
      </AtlasButton>
      <AtlasSnackbar
        v-model="openDanger"
        severity="danger"
        text="Failed to generate cohort."
        :timeout="-1"
      />
    </Variant>
    <Variant title="top location">
      <AtlasButton @click="openTop = true">
        Show at top
      </AtlasButton>
      <AtlasSnackbar
        v-model="openTop"
        location="top"
        text="Top of viewport."
      />
    </Variant>
  </Story>
</template>
