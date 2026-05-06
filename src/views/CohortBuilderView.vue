<template>
  <AtlasPageShell
    hero
    compact
    :eyebrow="eyebrow"
  >
    <template #title>
      <input
        :value="cohortName"
        type="text"
        class="cohort-builder-view__title-input"
        :placeholder="placeholder"
        :aria-label="t('columns.name', 'Cohort name').value"
        @input="onTitleInput"
      >
    </template>

    <template #subtitle>
      <input
        :value="cohortDescription"
        type="text"
        class="cohort-builder-view__subtitle-input"
        :placeholder="subtitlePlaceholder"
        :aria-label="t('columns.description', 'Description').value"
        @input="onSubtitleInput"
      >
    </template>

    <!-- Toolbar shares the title row. We render it here (in the
         page-shell hero header) but the state still lives in
         <cohort-builder> below — we read it through `builderRef`,
         which exposes a proxy via defineExpose. -->
    <template
      v-if="builderRef"
      #actions
    >
      <div class="cohort-builder-view__actions">
        <cohort-toolbar-status
          :concept-set-count="builderRef.conceptSetCount"
          :validation-count="builderRef.validationCount"
          :validation-color="builderRef.validationColor"
          :is-validating="builderRef.isValidating"
          :version-count="builderRef.versionCount"
          :tag-count="builderRef.tagCount"
          :cohort-id="builderRef.cohortId"
          :is-previewing-version="builderRef.isPreviewingVersion"
          @show-concept-sets="builderRef.openConceptSetsDialog()"
          @show-validation="builderRef.openValidationDialog()"
          @show-versions="builderRef.openVersionsDialog()"
          @show-tags="builderRef.openTagsDialog()"
        />

        <span class="cohort-builder-view__divider" />

        <cohort-toolbar-actions
          :can-save="builderRef.canSave"
          :show-generate="!!builderRef.cohortId"
          :is-previewing-version="builderRef.isPreviewingVersion"
          @cancel="builderRef.handleCancel()"
          @save="builderRef.handleSave()"
          @generate="builderRef.openGenerationPanel()"
        />
      </div>
    </template>

    <cohort-builder
      :id="id"
      ref="builderRef"
      :name="cohortName"
      :description="cohortDescription"
      hide-internal-breadcrumb
      hide-internal-toolbar
      @update:name="onUpdateName"
      @update:description="onUpdateDescription"
    />
  </AtlasPageShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AtlasPageShell } from '@/components/ui'
import CohortBuilder from '@/components/cohort/CohortBuilder.vue'
import CohortToolbarStatus from '@/components/cohort/CohortToolbarStatus.vue'
import CohortToolbarActions from '@/components/cohort/CohortToolbarActions.vue'
import { useI18n } from '@/composables/useI18n'

/**
 * CohortBuilderView - Main cohort builder page
 *
 * Hosts the page-shell hero header (eyebrow + inline-edit title +
 * inline-edit description + toolbar). The cohort-builder owns the
 * state and exposes it through defineExpose; the View reads it via
 * a template ref.
 */
const props = defineProps<{
  id?: string
}>()

const { t } = useI18n()

const cohortName = ref('')
const cohortDescription = ref('')
const builderRef = ref<InstanceType<typeof CohortBuilder> | null>(null)

const eyebrow = computed(() => {
  if (props.id) {
    return `${t('common.cohortDefinition', 'Cohort definition').value} · #${props.id}`
  }
  return t('common.cohortDefinition', 'Cohort definition').value
})

const placeholder = computed(() => t('cohortDefinitions.newDefinition', 'New cohort').value)

const subtitlePlaceholder = computed(
  () =>
    t(
      'cohortDefinitions.descriptionPlaceholder',
      'Add a description (optional) — purpose, scope, references…'
    ).value
)

function onTitleInput(event: Event) {
  const target = event.target as HTMLInputElement
  cohortName.value = target.value
}

function onSubtitleInput(event: Event) {
  const target = event.target as HTMLInputElement
  cohortDescription.value = target.value
}

function onUpdateName(name: string) {
  cohortName.value = name
}

function onUpdateDescription(description: string) {
  cohortDescription.value = description
}
</script>

<style scoped>
/* Inline-edit cohort title — looks like the hero h1 but is a
 * full-width text input. Border lights up on hover/focus so the
 * affordance is discoverable. */
.cohort-builder-view__title-input {
  width: 100%;
  font-size: 26px;
  font-weight: 300;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  background: transparent;
  border: 0;
  border-bottom: 1px solid transparent;
  padding: 0 0 2px;
  transition: border-color 120ms ease;
}
.cohort-builder-view__title-input::placeholder {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  font-weight: 400;
}
.cohort-builder-view__title-input:hover {
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
.cohort-builder-view__title-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-bottom-color: rgb(var(--v-theme-primary));
}

/* Inline-edit description — same hover/focus underline pattern as
 * the title, sized to the page-shell subtitle (13 px). */
.cohort-builder-view__subtitle-input {
  width: 100%;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
  background: transparent;
  border: 0;
  border-bottom: 1px solid transparent;
  padding: 2px 0;
  transition: border-color 120ms ease;
}
.cohort-builder-view__subtitle-input::placeholder {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.6;
}
.cohort-builder-view__subtitle-input:hover {
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
.cohort-builder-view__subtitle-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-bottom-color: rgb(var(--v-theme-primary));
}

.cohort-builder-view__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cohort-builder-view__divider {
  display: inline-block;
  width: 1px;
  height: 22px;
  background: rgb(var(--v-theme-outline-variant, 224, 224, 224));
}
</style>
