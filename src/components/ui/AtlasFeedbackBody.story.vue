<script setup lang="ts">
import AtlasFeedbackBody from './AtlasFeedbackBody.vue'
import AtlasButton from './AtlasButton.vue'
</script>

<template>
  <Story
    title="AtlasFeedbackBody"
    group="components"
  >
    <Variant title="severities">
      <div style="display:flex; flex-direction:column; gap:12px;">
        <AtlasFeedbackBody
          severity="info"
          title="Heads up"
        >
          An analysis run is queued and will start shortly.
        </AtlasFeedbackBody>
        <AtlasFeedbackBody
          severity="success"
          title="Generation complete"
        >
          The cohort generated successfully on all sources.
        </AtlasFeedbackBody>
        <AtlasFeedbackBody
          severity="warning"
          title="Partial results"
        >
          Two sources timed out and were skipped.
        </AtlasFeedbackBody>
        <AtlasFeedbackBody
          severity="danger"
          title="Generation failed"
        >
          The SQL could not be translated for this dialect.
        </AtlasFeedbackBody>
      </div>
    </Variant>

    <Variant title="neutral note">
      <AtlasFeedbackBody
        tone="neutral"
        title="Note"
      >
        Concept sets are shared across every analysis in this design.
      </AtlasFeedbackBody>
    </Variant>

    <Variant title="with count">
      <AtlasFeedbackBody
        severity="warning"
        title="Validation warnings"
        :count="3"
      >
        Resolve these before generating the cohort.
      </AtlasFeedbackBody>
    </Variant>

    <Variant title="closable + elevated">
      <AtlasFeedbackBody
        severity="info"
        title="New version available"
        elevated
        closable
      >
        A newer version of this concept set has been published.
      </AtlasFeedbackBody>
    </Variant>

    <Variant title="with actions">
      <AtlasFeedbackBody
        severity="danger"
        title="Unsaved changes"
      >
        Leaving now will discard your edits.
        <template #actions>
          <AtlasButton
            size="sm"
            variant="primary"
          >
            Save
          </AtlasButton>
          <AtlasButton
            size="sm"
            variant="ghost"
          >
            Discard
          </AtlasButton>
        </template>
      </AtlasFeedbackBody>
    </Variant>
  </Story>
</template>
