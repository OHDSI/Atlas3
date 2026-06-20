# AtlasBarChart

Categorical bar chart over ECharts.

## Props
- `data: BarChartData` — `{ categories, values, unit? }`
- `loading?: boolean` — shows skeleton while true (default `false`)
- `height?: number` — chart height in px (default `400`)
- `showExport?: boolean` — show PNG/SVG download toolbar (default `true`)
- `exportFilename?: string` — base filename for exported file (default `'bar-chart'`)

## Emits
- `export-success(format: 'png' | 'svg', filename: string)` — fired after a successful download
- `export-error(format: 'png' | 'svg', error: Error)` — fired if export fails
