<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AtlasCard } from '@/components/ui'
import type { Concept } from '@/models/concept-set.types'
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
      <span>Hierarchy</span>
      <a
        v-if="!isEmpty"
        href="#"
        class="view-full"
      >View full →</a>
    </header>
    <div class="card-body">
      <p
        v-if="isEmpty"
        class="empty"
      >
        No hierarchy found for this concept.
      </p>
      <template v-else>
        <ul class="tree">
          <li
            v-for="p in visibleParents"
            :key="p.conceptId"
            class="node faded"
          >
            <span class="chev">▸</span>
            <router-link
              :to="`/concept/${sourceKey}/${p.conceptId}`"
              class="node-link"
            >
              {{ p.conceptName }}
            </router-link>
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
            <router-link
              :to="`/concept/${sourceKey}/${c.conceptId}`"
              class="node-link"
            >
              {{ c.conceptName }}
            </router-link>
          </li>
          <li
            v-if="children.length > visibleChildren.length"
            class="node muted"
          >
            … {{ children.length - visibleChildren.length }} more descendants
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
