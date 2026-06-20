# AtlasTrellisChart

ECharts small-multiple line charts for stratified demographic analysis across categories.

## Props
- `data: TrellisChartData` — object with `categories: string[]` and `series: TrellisSeries[]`; each series has `name`, `category`, and `data: { x, y }[]`
- `title?: string` — optional chart title
- `loading?: boolean` — show skeleton while loading
- `height?: number` — chart height in pixels (default 600)
- `showExport?: boolean` — show export toolbar (default true)
- `exportFilename?: string` — filename for exported image
