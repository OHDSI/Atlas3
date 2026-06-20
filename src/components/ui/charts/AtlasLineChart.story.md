# AtlasLineChart

Line chart wrapper over ECharts.

## Props
- `data: LineChartData` — `{ xAxisType?, categories?, monthCodes?, xValues?, series, xAxisLabel?, yAxisLabel? }`. `series[].data` is always `number[]` y-values; the x source depends on `xAxisType`: in `category` mode supply `categories` (string labels), in `time` mode supply `monthCodes` (YYYYMM codes), and in `value` mode supply `xValues` (numeric x positions). All x arrays must be index-aligned to `series[].data`.
- `xAxisType?: 'category' | 'value' | 'time'` — default `'category'`. Overrides `data.xAxisType` when provided.
- `loading?: boolean`, `height?: number`

Use `time` for date series (e.g. observations by month) and `value` for numeric scalars (e.g. cumulative observation). Category mode spaces points evenly by index — only correct for discrete labels.
