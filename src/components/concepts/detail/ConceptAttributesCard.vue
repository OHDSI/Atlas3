<script setup lang="ts">
import { AtlasCard } from '@/components/ui'
import type { Concept } from '@/models/concept-set.types'

defineProps<{ concept: Concept }>()
</script>

<template>
  <AtlasCard
    padding="none"
    data-testid="concept-attributes-card"
  >
    <header class="card-title">
      Concept Details
    </header>
    <div class="card-body">
      <dl class="kv">
        <dt>Concept ID</dt><dd class="mono">
          {{ concept.conceptId }}
        </dd>
        <dt>Concept Code</dt><dd class="mono">
          {{ concept.conceptCode }}
        </dd>
        <dt>Domain</dt><dd>{{ concept.domainId }}</dd>
        <dt>Vocabulary</dt><dd>{{ concept.vocabularyId }}</dd>
        <dt>Concept Class</dt><dd>{{ concept.conceptClassId }}</dd>
        <dt>Standard Concept</dt><dd>{{ concept.standardConcept ?? '—' }}</dd>
        <dt>Invalid Reason</dt><dd>{{ concept.invalidReason ?? '—' }}</dd>
      </dl>
    </div>
  </AtlasCard>
</template>

<style scoped>
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.card-body {
  padding: 16px;
}
.kv {
  display: grid;
  grid-template-columns: 140px 1fr 140px 1fr;
  row-gap: 6px;
  column-gap: 16px;
  font-size: 13px;
  margin: 0;
}
.kv dt {
  color: rgba(0, 0, 0, 0.6);
}
.kv dd {
  margin: 0;
  font-weight: 500;
}
.mono {
  font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
}
@media (max-width: 768px) {
  .kv {
    grid-template-columns: 140px 1fr;
  }
}
</style>
