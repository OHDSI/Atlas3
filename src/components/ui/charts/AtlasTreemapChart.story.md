# AtlasTreemapChart

ECharts treemap wrapper for hierarchical concept data with zoom interaction and export.

## Props
- `data: TreemapNode[]` — array of treemap nodes with `name`, `value`, and optional `children`
- `title?: string` — optional chart title
- `loading?: boolean` — show skeleton while loading
- `height?: number` — chart height in pixels (default 500)
- `enableZoom?: boolean` — enable zoom/roam (default true)
- `showExport?: boolean` — show export toolbar (default true)
- `exportFilename?: string` — filename for exported image
