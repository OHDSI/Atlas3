# AtlasPieChart

Pie/donut chart over ECharts.

## Props
- `data: PieChartData[]` — `{ name, value }[]`
- `title?: string` — optional chart title
- `loading?: boolean` — shows skeleton while true (default `false`)
- `height?: number` — chart height in px (default `400`)
- `showExport?: boolean` — show PNG/SVG download toolbar (default `true`)
- `exportFilename?: string` — base filename for exported file (default `'pie-chart'`)

## Emits
- `export-success(format: 'png' | 'svg', filename: string)` — fired after a successful download
- `export-error(format: 'png' | 'svg', error: Error)` — fired if export fails
