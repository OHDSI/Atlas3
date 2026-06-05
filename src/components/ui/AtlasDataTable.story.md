# AtlasDataTable

Data grid wrapping Vuetify's `VDataTable` with compact density, brand defaults and full slot forwarding for custom cells.

```vue
<AtlasDataTable :headers="headers" :items="items"><template #item.status="{ item }">...</template></AtlasDataTable>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `headers` | `Header[]` | `(required)` | Column definitions ({ key, title, value, sortable, align, width }). |
| `items` | `unknown[]` | `(required)` | Row data. |
| `loading` | `boolean` | `false` | Shows the loading indicator. |
| `itemsPerPage` | `number` | `10` | Page size. |
| `page` | `number` | `1` | Current page (1-based). Use v-model:page. |
| `sortBy` | `SortItem[]` | `[]` | Active sort. Use v-model:sort-by. |
| `height` | `number \| string` | — | Fixed table height (enables internal scroll). |
| `fixedHeader` | `boolean` | `false` | Keeps the header visible while scrolling. |
| `hideDefaultFooter` | `boolean` | `false` | Hides the pagination footer. |
| `noDataText` | `string` | — | Text shown when there are no items. |
| `loadingText` | `string` | — | Text shown while loading. |
| `caption` | `string` | — | Accessible label (aria-label) for the table. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `update:page` | `number` | Emitted on page change. |
| `update:itemsPerPage` | `number` | Emitted on page-size change. |
| `update:sortBy` | `SortItem[]` | Emitted on sort change. |

## Slots

| Name | Description |
|------|-------------|
| `(all VDataTable slots)` | Every slot is forwarded, e.g. #item.<key> for custom cell rendering. |
