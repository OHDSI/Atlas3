<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AtlasCard } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import type { Concept } from '@/models/concept-set.types'

const { t } = useI18n()
import type { RelatedConcept } from '@/models/concept-detail.types'

const props = defineProps<{
  concept: Concept
  parents: RelatedConcept[]
  children: RelatedConcept[]
  sourceKey?: string
}>()

// Prefer the explicit sourceKey prop (the drawer renders this component over
// other routes, so route.params.sourceKey is empty there and links would
// resolve to /concept//<id>, a 404). Fall back to the route param for
// stand-alone /concept/:sourceKey/:conceptId usage.
const route = useRoute()
const sourceKey = computed(
  () => props.sourceKey || ((route.params.sourceKey as string) ?? '')
)

const conceptDrawer = useConceptDetailDrawerStore()

// "View full" opens the in-place concept-detail drawer (an overlay) for this
// concept instead of routing to a stand-alone page — that keeps the user in
// the cohort editor flow. We hide the link when the drawer is already showing
// this exact concept, since clicking it there would be a confusing no-op.
const isInDrawerForThisConcept = computed(
  () =>
    conceptDrawer.isOpen &&
    conceptDrawer.sourceKey === sourceKey.value &&
    conceptDrawer.conceptId === props.concept.conceptId
)

const canViewFull = computed(
  () => !!sourceKey.value && !!props.concept.conceptId && !isInDrawerForThisConcept.value
)

function viewFull() {
  if (!canViewFull.value) return
  conceptDrawer.open(sourceKey.value, props.concept.conceptId)
}

// Jumping to a parent/child concept opens it in the same side-panel drawer
// rather than routing the whole app to the stand-alone concept page — that
// keeps the user in their current flow (cohort editor, search, etc.).
function openConcept(conceptId: number) {
  if (!sourceKey.value) return
  conceptDrawer.open(sourceKey.value, conceptId)
}

const isEmpty = computed(() => props.parents.length === 0 && props.children.length === 0)

const visibleParents = computed(() => props.parents.slice(0, 3))
const visibleChildren = computed(() => props.children.slice(0, 6))
</script>

<template>
  <AtlasCard
    padding="none"
    data-testid="concept-hierarchy-minimap"
  >
    <header class="card-title">
      <span>{{ t('cs.manager.concept.tabs.hierarchy.caption', 'Hierarchy').value }}</span>
      <a
        v-if="!isEmpty && canViewFull"
        href="#"
        class="view-full"
        data-testid="view-full"
        @click.prevent="viewFull"
      >{{ t('components.conceptDetail.viewFull', 'View full').value }} →</a>
    </header>
    <div class="card-body">
      <p
        v-if="isEmpty"
        class="empty"
      >
        {{ t('components.conceptDetail.noHierarchyForConcept', 'No hierarchy found for this concept.').value }}
      </p>
      <template v-else>
        <ul class="tree">
          <li
            v-for="p in visibleParents"
            :key="p.conceptId"
            class="node faded"
          >
            <span class="chev">▸</span>
            <a
              href="#"
              class="node-link"
              @click.prevent="openConcept(p.conceptId)"
            >
              {{ p.conceptName }}
            </a>
          </li>
          <li
            class="node current"
            data-testid="hierarchy-current"
          >
            <span class="chev">●</span>
            <span class="node-link">{{ concept.conceptName }}</span>
          </li>
          <li
            v-for="c in visibleChildren"
            :key="c.conceptId"
            class="node child"
          >
            <span class="chev">▸</span>
            <a
              href="#"
              class="node-link"
              @click.prevent="openConcept(c.conceptId)"
            >
              {{ c.conceptName }}
            </a>
          </li>
          <li
            v-if="children.length > visibleChildren.length"
            class="node muted"
          >
            … {{ t('components.conceptDetail.moreDescendants', '{count} more descendants', { count: children.length - visibleChildren.length }).value }}
          </li>
        </ul>
      </template>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.view-full {
  font-size: 11px;
  text-transform: none;
  font-weight: 400;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.card-body { padding: 16px; }
.tree { list-style: none; padding: 0; margin: 0; font-size: 13px; }
.node { display: flex; align-items: center; gap: 4px; padding: 2px 0; }
.node.faded { color: rgba(0, 0, 0, 0.6); }
.node.current {
  background: rgba(25, 118, 210, 0.12);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 3px;
  margin: 2px 0;
}
.node.child { padding-left: 16px; }
.node.muted { color: rgba(0, 0, 0, 0.4); padding-left: 16px; font-size: 11px; }
.chev { width: 14px; color: rgba(0, 0, 0, 0.4); flex-shrink: 0; }
.node-link {
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-link:hover { text-decoration: underline; }
.empty { color: rgba(0, 0, 0, 0.6); font-size: 12px; margin: 0; }
</style>
