<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AtlasCard, AtlasChip, AtlasDataTable } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import type { RelatedConcept } from '@/models/concept-detail.types'

const { t } = useI18n()

const props = defineProps<{ related: RelatedConcept[]; sourceKey?: string }>()

// Prefer the explicit sourceKey prop. The drawer renders this table over other
// routes, so route.params.sourceKey is empty there and the link would no-op.
// Fall back to the route param for the stand-alone /concept/:sourceKey page.
const route = useRoute()
const sourceKey = computed(() => props.sourceKey || ((route.params.sourceKey as string) ?? ''))
const conceptDrawer = useConceptDetailDrawerStore()

function openConceptDetail(conceptId: number) {
  if (!sourceKey.value) return
  conceptDrawer.open(sourceKey.value, conceptId)
}

interface Row {
  conceptId: number
  conceptName: string
  conceptCode: string
  vocabularyId: string
  domainId: string
  standardConcept: string | null
  relationship: string
}

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const c of props.related) {
    for (const r of c.relationships) {
      out.push({
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        conceptCode: c.conceptCode,
        vocabularyId: c.vocabularyId,
        domainId: c.domainId,
        standardConcept: c.standardConcept,
        relationship: r.relationshipName,
      })
    }
  }
  return out
})

const headers = computed(() => [
  { title: t('facets.caption.relationship', 'Relationship').value, key: 'relationship', sortable: true },
  { title: t('columns.conceptName', 'Concept Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true },
  { title: t('columns.code', 'Code').value, key: 'conceptCode', sortable: true },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true },
  { title: t('columns.standard', 'Standard').value, key: 'standardConcept', sortable: true, width: 80 },
])
</script>

<template>
  <AtlasCard
    padding="none"
    data-testid="concept-related-table"
  >
    <header class="card-title">
      <span>{{ t('cs.manager.concept.tabs.relatedConcepts.caption', 'Related Concepts').value }}</span>
      <span class="muted">{{ t('components.conceptDetail.relationshipsCount', '{count} relationships', { count: rows.length }).value }}</span>
    </header>
    <p
      v-if="rows.length === 0"
      class="empty"
    >
      {{ t('components.conceptDetail.noRelatedConcepts', 'No related concepts found.').value }}
    </p>
    <AtlasDataTable
      v-else
      :headers="headers"
      :items="rows"
      :items-per-page="25"
    >
      <template #[`item.relationship`]="{ item }">
        <AtlasChip size="sm">
          {{ item.relationship }}
        </AtlasChip>
      </template>
      <template #[`item.conceptName`]="{ item }">
        <a
          href="#"
          class="concept-link"
          @click.prevent="openConceptDetail(item.conceptId)"
        >
          {{ item.conceptName }}
        </a>
      </template>
      <template #[`item.standardConcept`]="{ item }">
        <AtlasChip
          v-if="item.standardConcept === 'S'"
          size="xs"
          tone="success"
        >
          S
        </AtlasChip>
        <AtlasChip
          v-else-if="item.standardConcept === 'C'"
          size="xs"
        >
          C
        </AtlasChip>
        <span
          v-else
          class="muted"
        >—</span>
      </template>
    </AtlasDataTable>
  </AtlasCard>
</template>

<style scoped>
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  justify-content: space-between;
  font-weight: 600;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
}
.muted { color: rgba(0, 0, 0, 0.4); font-size: 11px; }
.empty { padding: 24px; color: rgba(0, 0, 0, 0.6); font-size: 13px; margin: 0; text-align: center; }
.concept-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.concept-link:hover { text-decoration: underline; }

.v-theme--dark .card-title,
.v-theme--dark .muted,
.v-theme--dark .empty {
  color: var(--atlas-color-on-surface-variant);
}
.v-theme--dark .card-title {
  border-bottom-color: var(--atlas-color-outline);
}
</style>
