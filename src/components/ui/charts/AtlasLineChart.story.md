# AtlasLineChart

Line chart wrapper over ECharts.

## Props
- `data: LineChartData` — `{ xAxisType?, categories?, monthCodes?, xValues?, series }`
- `xAxisType?: 'category' | 'value' | 'time'` — default `'category'`. In `time`/`value` mode, supply `monthCodes`/`xValues` aligned to each series' `data`.
- `loading?: boolean`, `height?: number`

Use `time` for date series (e.g. observations by month) and `value` for numeric scalars (e.g. cumulative observation). Category mode spaces points evenly by index — only correct for discrete labels.
