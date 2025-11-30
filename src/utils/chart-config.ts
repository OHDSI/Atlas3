/**
 * ECharts Configuration Utilities
 *
 * Provides default configuration helpers for all chart types
 */

import type { EChartsOption } from 'echarts'
import type { BarChartData, PieChartData, LineChartData, TreemapNode } from '@/models/report.types'

/**
 * Default color palette matching Vuetify theme
 */
export const CHART_COLORS = [
  '#1976D2', // primary blue
  '#43A047', // success green
  '#FB8C00', // warning orange
  '#E53935', // error red
  '#8E24AA', // purple
  '#00ACC1', // cyan
  '#FDD835', // yellow
  '#6D4C41', // brown
  '#546E7A', // blue-grey
  '#7CB342', // light green
  '#F4511E', // deep orange
  '#5E35B1'  // deep purple
]

/**
 * Default bar chart configuration
 */
export function defaultBarChartOptions(data: BarChartData): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: unknown) => {
        const paramsArray = Array.isArray(params) ? params : [params]
        const param = paramsArray[0] as { name: string; seriesName: string; value: number }
        const value = param.value.toLocaleString()
        const unit = data.unit ? ` ${data.unit}` : ''
        return `${param.name}<br/>${param.seriesName}: <strong>${value}${unit}</strong>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLabel: {
        rotate: data.categories.length > 10 ? 45 : 0,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: data.unit || 'Count',
      axisLabel: {
        formatter: (value: number) => value.toLocaleString()
      }
    },
    series: [
      {
        name: data.unit || 'Count',
        type: 'bar',
        data: data.values,
        itemStyle: {
          color: CHART_COLORS[0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
}

/**
 * Default pie chart configuration
 */
export function defaultPieChartOptions(data: PieChartData[], title?: string): EChartsOption {
  return {
    title: title ? {
      text: title,
      left: 'center',
      top: '5%',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        const value = p.value.toLocaleString()
        const percent = p.percent.toFixed(1)
        return `${p.name}<br/><strong>${value}</strong> (${percent}%)`
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      data: data.map(item => item.name)
    },
    series: [
      {
        name: title || 'Distribution',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['60%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length]
          }
        }))
      }
    ]
  }
}

/**
 * Default line chart configuration
 */
export function defaultLineChartOptions(data: LineChartData, title?: string): EChartsOption {
  return {
    title: title ? {
      text: title,
      left: 'center',
      top: '5%',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    } : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const paramsArray = Array.isArray(params) ? params : [params]
        const param = paramsArray[0] as { name: string; seriesName: string; value: number }
        const value = param.value.toLocaleString()
        return `${param.name}<br/>${param.seriesName}: <strong>${value}</strong>`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: title ? '15%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.xAxis,
      axisLabel: {
        rotate: data.xAxis.length > 20 ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => value.toLocaleString()
      }
    },
    series: [
      {
        name: data.seriesName || 'Value',
        type: 'line',
        smooth: true,
        data: data.yAxis,
        itemStyle: {
          color: CHART_COLORS[0]
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_COLORS[0] + '80' },
              { offset: 1, color: CHART_COLORS[0] + '10' }
            ]
          }
        },
        emphasis: {
          focus: 'series'
        }
      }
    ]
  }
}

/**
 * Default treemap configuration
 */
export function defaultTreemapOptions(data: TreemapNode[], title?: string): EChartsOption {
  return {
    title: title ? {
      text: title,
      left: 'center',
      top: '5%',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }
        const value = p.value.toLocaleString()
        return `${p.name}<br/><strong>${value}</strong>`
      }
    },
    series: [
      {
        type: 'treemap',
        top: title ? '15%' : '5%',
        bottom: '5%',
        left: '5%',
        right: '5%',
        roam: false,
        nodeClick: 'zoomToNode',
        breadcrumb: {
          show: true,
          emptyItemWidth: 25,
          height: 22,
          top: title ? '10%' : '0%'
        },
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'truncate',
          ellipsis: '...'
        },
        upperLabel: {
          show: true,
          height: 30,
          color: '#fff'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          gapWidth: 2
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              gapWidth: 3
            }
          },
          {
            colorSaturation: [0.35, 0.5],
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderColorSaturation: 0.6
            }
          }
        ],
        data: assignTreemapColors(data)
      }
    ]
  }
}

/**
 * Assign colors to treemap nodes recursively
 */
function assignTreemapColors(nodes: TreemapNode[], colorIndex = 0): TreemapNode[] {
  return nodes.map((node, index) => {
    const currentColorIndex = (colorIndex + index) % CHART_COLORS.length
    const color = CHART_COLORS[currentColorIndex]

    return {
      ...node,
      itemStyle: {
        ...node.itemStyle,
        color: node.itemStyle?.color || color
      },
      children: node.children
        ? assignTreemapColors(node.children, currentColorIndex * 2)
        : undefined
    }
  })
}

/**
 * Responsive chart resize handler
 */
export function createResizeHandler(chart: { isDisposed: () => boolean; resize: () => void }, debounceMs = 150) {
  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  const handleResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }

    resizeTimer = setTimeout(() => {
      if (chart && !chart.isDisposed()) {
        chart.resize()
      }
    }, debounceMs)
  }

  return handleResize
}

/**
 * Export chart configuration with consistent styling
 */
export function getExportConfig(backgroundColor = '#ffffff') {
  return {
    backgroundColor,
    pixelRatio: 2, // 2x for high-DPI displays
    excludeComponents: ['toolbox']
  }
}

// ============================================================================
// Dashboard-specific Chart Configurations
// ============================================================================

import type { BarChartData as DatasourceBarChartData, PieChartData as DatasourcePieChartData, LineChartData as DatasourceLineChartData, MultiLineChartData as DatasourceMultiLineChartData } from '@/models/datasource.types'

/**
 * Dashboard Gender Pie Chart Configuration
 */
export function dashboardGenderPieOptions(data: DatasourcePieChartData[]): EChartsOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        const value = p.value.toLocaleString()
        const percent = p.percent.toFixed(1)
        return `<strong>${p.name}</strong><br/>Count: ${value}<br/>Percentage: ${percent}%`
      }
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      left: 'center'
    },
    series: [
      {
        name: 'Gender Distribution',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 12
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length]
          }
        }))
      }
    ]
  }
}

/**
 * Dashboard Age Bar Chart Configuration
 */
export function dashboardAgeBarOptions(data: DatasourceBarChartData): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: unknown) => {
        const paramsArray = Array.isArray(params) ? params : [params]
        const param = paramsArray[0] as { name: string; value: number }
        const value = param.value.toLocaleString()
        return `<strong>Age: ${param.name}</strong><br/>${data.unit || 'Count'}: ${value}`
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '8%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      name: 'Age Group',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        rotate: data.categories.length > 12 ? 45 : 0,
        interval: 0,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      name: data.unit || 'Person Count',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        formatter: (value: number) => value.toLocaleString()
      }
    },
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length],
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      }
    }))
  }
}

/**
 * Dashboard Cumulative Observation Line Chart Configuration
 */
export function dashboardCumulativeLineOptions(data: DatasourceLineChartData): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const paramsArray = Array.isArray(params) ? params : [params]
        const param = paramsArray[0] as { name: string; value: number | string }
        const value = typeof param.value === 'number' ? param.value.toFixed(1) : param.value
        return `<strong>${data.xAxisLabel || 'Year'}: ${param.name}</strong><br/>${data.yAxisLabel || 'Percentage'}: ${value}%`
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '10%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.categories,
      name: data.xAxisLabel || 'Year',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      name: data.yAxisLabel || 'Percent of Persons',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        formatter: (value: number) => `${value}%`
      }
    },
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length]
      },
      lineStyle: {
        width: 2.5
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: CHART_COLORS[index % CHART_COLORS.length] + '50' },
            { offset: 1, color: CHART_COLORS[index % CHART_COLORS.length] + '10' }
          ]
        }
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        }
      }
    }))
  }
}

/**
 * Dashboard Observation by Month Line Chart Configuration
 */
export function dashboardObservationMonthLineOptions(data: DatasourceLineChartData): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const paramsArray = Array.isArray(params) ? params : [params]
        const param = paramsArray[0] as { name: string; value: number }
        const value = param.value.toLocaleString()
        return `<strong>${param.name}</strong><br/>${data.yAxisLabel || 'Observations'}: ${value}`
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '12%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.categories,
      name: data.xAxisLabel || 'Month',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: {
        rotate: data.categories.length > 24 ? 45 : 0,
        fontSize: 10,
        interval: Math.max(0, Math.floor(data.categories.length / 12) - 1)
      }
    },
    yAxis: {
      type: 'value',
      name: data.yAxisLabel || 'Observation Count',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        formatter: (value: number) => value.toLocaleString()
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 10
      }
    ],
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      smooth: false,
      data: s.data,
      symbol: 'none',
      sampling: 'lttb',
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length]
      },
      lineStyle: {
        width: 2
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: 3
        }
      }
    }))
  }
}

/**
 * Multi-Line Chart Configuration for Data Density Reports
 */
export function multiLineChartOptions(data: DatasourceMultiLineChartData): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: data.series.map(s => s.name),
      type: 'scroll',
      bottom: 0,
      left: 'center'
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '12%',
      top: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.categories,
      axisLabel: {
        rotate: data.categories.length > 24 ? 45 : 0,
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => value.toLocaleString()
      }
    },
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data,
      symbol: 'circle',
      symbolSize: 4,
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length]
      },
      lineStyle: {
        width: 2
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        }
      }
    }))
  }
}

/**
 * Clinical Domain Treemap Configuration
 */
export function clinicalDomainTreemapOptions(nodes: TreemapNode[]): EChartsOption {
  // Calculate prevalence range for color mapping
  const values = extractAllValues(nodes)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as {
          name: string;
          value: number;
          data: { prevalence?: number; metric?: number }
        }
        const value = p.value.toLocaleString()
        const name = p.name
        const prevalence = p.data.prevalence
        const metric = p.data.metric

        let tooltip = `<strong>${name}</strong><br/>`
        tooltip += `Value: ${value}<br/>`
        if (prevalence !== undefined) {
          tooltip += `Prevalence: ${prevalence.toFixed(2)}%<br/>`
        }
        if (metric !== undefined) {
          tooltip += `Metric: ${metric.toFixed(2)}`
        }

        return tooltip
      }
    },
    series: [
      {
        type: 'treemap',
        top: '5%',
        bottom: '5%',
        left: '5%',
        right: '5%',
        roam: true,
        nodeClick: 'zoomToNode',
        breadcrumb: {
          show: true,
          emptyItemWidth: 25,
          height: 22,
          top: '0%'
        },
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'truncate',
          ellipsis: '...',
          fontSize: 12
        },
        upperLabel: {
          show: true,
          height: 30,
          color: '#fff',
          fontSize: 14,
          fontWeight: 'bold'
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          gapWidth: 2
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              gapWidth: 3
            }
          },
          {
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderColorSaturation: 0.6
            }
          }
        ],
        // Visual mapping for prevalence intensity (light to dark)
        visualMin: minValue,
        visualMax: maxValue,
        visualDimension: 0,
        colorMappingBy: 'value',
        color: [
          '#e3f2fd', // Very light blue (low prevalence)
          '#90caf9', // Light blue
          '#42a5f5', // Medium blue
          '#1e88e5', // Dark blue
          '#1565c0'  // Very dark blue (high prevalence)
        ],
        data: nodes
      }
    ]
  }
}

// Helper function to extract all values for color mapping
function extractAllValues(nodes: TreemapNode[]): number[] {
  const values: number[] = []
  
  function traverse(node: TreemapNode) {
    values.push(node.value)
    if (node.children) {
      node.children.forEach(traverse)
    }
  }
  
  nodes.forEach(traverse)
  return values.length > 0 ? values : [0]
}

