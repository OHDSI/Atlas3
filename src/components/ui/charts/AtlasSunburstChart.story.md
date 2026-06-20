# AtlasSunburstChart

Custom ECharts sunburst using d3-partition layout for pathway analysis. Renders concentric color bands for combination (bit-mask) nodes.

## Props
- `data: SunburstNode` — root node with `name`, optional `value`, and `children`
- `colors: (key: string) => string` — required color resolver function mapping node keys to color strings
- `minHeight?: number` — minimum chart height in pixels (default 500)
