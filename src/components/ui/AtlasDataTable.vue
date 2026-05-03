<!-- src/components/ui/AtlasDataTable.vue -->
<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :loading="loading"
    :items-per-page="itemsPerPage"
    :page="page"
    :sort-by="sortBy"
    :height="height"
    :fixed-header="fixedHeader"
    :hide-default-footer="hideDefaultFooter"
    :no-data-text="noDataText"
    :loading-text="loadingText"
    density="compact"
    v-bind="forwardAttrs"
    @update:page="(v: number) => $emit('update:page', v)"
    @update:items-per-page="(v: number) => $emit('update:itemsPerPage', v)"
    @update:sort-by="(v: SortItem[]) => $emit('update:sortBy', v)"
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
import { computed, useAttrs } from 'vue'

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
}

withDefaults(defineProps<Props>(), {
  loading: false,
  itemsPerPage: 10,
  page: 1,
  sortBy: () => [],
  height: undefined,
  fixedHeader: false,
  hideDefaultFooter: false,
  noDataText: undefined,
  loadingText: undefined,
})

defineEmits<{
  'update:page': [page: number]
  'update:itemsPerPage': [count: number]
  'update:sortBy': [sortBy: SortItem[]]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const forwardAttrs = computed(() => {
  const { density: _d, ...rest } = attrs as Record<string, unknown>
  void _d
  return rest
})
</script>
