<!-- src/components/ui/AtlasDataTable.vue -->
<template>
  <v-data-table
    v-model:sort-by="sortByModel"
    :headers="headers"
    :items="items"
    :loading="loading"
    :height="height"
    :fixed-header="fixedHeader"
    :hide-default-footer="hideDefaultFooter"
    :no-data-text="noDataText"
    :loading-text="loadingText"
    :aria-label="caption"
    density="compact"
    v-bind="tableBind"
    @update:page="onUpdatePage"
    @update:items-per-page="onUpdateItemsPerPage"
  >
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { computed, ref, watch, useAttrs } from 'vue'

interface SortItem {
  key: string
  order?: 'asc' | 'desc'
}

interface Header {
  key: string
  title?: string
  value?: string | ((item: unknown) => unknown)
  sortable?: boolean
  align?: 'start' | 'center' | 'end'
  width?: number | string
  [k: string]: unknown
}

interface Props {
  headers: Header[]
  items: unknown[]
  loading?: boolean
  itemsPerPage?: number
  page?: number
  sortBy?: SortItem[]
  height?: number | string
  fixedHeader?: boolean
  hideDefaultFooter?: boolean
  noDataText?: string
  loadingText?: string
  caption?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  itemsPerPage: undefined,
  page: undefined,
  sortBy: undefined,
  height: undefined,
  fixedHeader: false,
  hideDefaultFooter: false,
  noDataText: undefined,
  loadingText: undefined,
  caption: undefined,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:itemsPerPage': [count: number]
  'update:sortBy': [sortBy: SortItem[]]
}>()

defineOptions({ inheritAttrs: false })

// When a caller doesn't bind `sort-by` (the common case), fall back to
// internal state so v-data-table still owns and applies its own sort
// instead of being pinned to a static prop that never changes. Callers that
// DO bind `sort-by`/`v-model:sort-by` keep full control, unchanged.
const internalSortBy = ref<SortItem[]>([])
const sortByModel = computed<SortItem[]>({
  get: () => props.sortBy ?? internalSortBy.value,
  set: v => {
    internalSortBy.value = v
    emit('update:sortBy', v)
  },
})

// Vuetify treats `page`/`items-per-page` as externally controlled when the
// vnode carries the prop key AND an `onUpdate:` listener. This wrapper always
// attaches the listeners, so binding the props unconditionally made every
// table controlled — including callers that never round-trip page state,
// whose pager was then pinned to a value nothing ever updated (#203, #222).
// Forward the keys only when the caller actually provided them.
const attrs = useAttrs()

// A caller that binds `page`/`items-per-page` one-way, as a starting value it
// never writes back (`:items-per-page="25"`), still makes the table
// controlled: the footer's choice was emitted and then immediately overwritten
// by the unchanged prop, leaving the pager inert (#266). Hold the user's choice
// here so it survives, and drop it whenever the caller pushes a new value down,
// which keeps a real `v-model` binding authoritative.
const pageOverride = ref<number | undefined>(undefined)
const itemsPerPageOverride = ref<number | undefined>(undefined)

watch(
  () => props.page,
  () => {
    pageOverride.value = undefined
  }
)
watch(
  () => props.itemsPerPage,
  () => {
    itemsPerPageOverride.value = undefined
  }
)

function onUpdatePage(v: number) {
  pageOverride.value = v
  emit('update:page', v)
}

function onUpdateItemsPerPage(v: number) {
  itemsPerPageOverride.value = v
  emit('update:itemsPerPage', v)
}

// Single merged v-bind: Vue's SFC compiler rejects multiple bare `v-bind`
// directives on one element, so the conditional pagination keys and the
// forwarded $attrs have to combine here.
const tableBind = computed(() => {
  const { density: _d, ...restAttrs } = attrs as Record<string, unknown>
  void _d
  const bind: Record<string, unknown> = { ...restAttrs }
  // The override only applies on top of a prop the caller actually passed. A
  // caller that binds neither key stays fully uncontrolled, as #203/#222 needs.
  if (props.page !== undefined) bind.page = pageOverride.value ?? props.page
  if (props.itemsPerPage !== undefined) {
    bind['items-per-page'] = itemsPerPageOverride.value ?? props.itemsPerPage
  }
  return bind
})
</script>
