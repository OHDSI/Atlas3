# AtlasBoxPlotChart

ECharts box-and-whisker plot for statistical distributions by category.

## Props
- `data: BoxPlotData[]` — array of distributions with `category`, `min`, `p10`, `p25`, `median`, `p75`, `p90`, `max`
- `title?: string` — optional chart title
- `loading?: boolean` — show skeleton while loading
- `height?: number` — chart height in pixels (default 400)
- `showExport?: boolean` — show export toolbar (default true)
- `exportFilename?: string` — filename for exported image
