# AtlasLineChart

Line chart wrapper over ECharts.

## Props
- `data: LineChartData` — `{ xAxisType?, categories?, monthCodes?, xValues?, series, xAxisLabel?, yAxisLabel? }`. `series[].data` is always `number[]` y-values; the x source depends on `xAxisType`: in `category` mode supply `categories` (string labels), in `time` mode supply `monthCodes` (YYYYMM codes), and in `value` mode supply `xValues` (numeric x positions). All x arrays must be index-aligned to `series[].data`.
- `xAxisType?: 'category' | 'value' | 'time'` — default `'category'`. Overrides `data.xAxisType` when provided.
- `loading?: boolean`, `height?: number` (default `400`)
- `showExport?: boolean` — default `true`. When `true`, renders an export toolbar above the chart with PNG/SVG download buttons.
- `exportFilename?: string` — default `'line-chart'`. Base filename (without extension) used by the export toolbar.

## Events
- `export-success(format: 'png' | 'svg', filename: string)` — emitted when the user successfully exports the chart.
- `export-error(format: 'png' | 'svg', error: Error)` — emitted when chart export fails.

Use `time` for date series (e.g. observations by month) and `value` for numeric scalars (e.g. cumulative observation). Category mode spaces points evenly by index — only correct for discrete labels.
