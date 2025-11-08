/**
 * ECharts Configuration Utilities
 * Feature: 005-cohort-reports
 * Task: T024
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
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params
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
      formatter: (params: any) => {
        const value = params.value.toLocaleString()
        const percent = params.percent.toFixed(1)
        return `${params.name}<br/><strong>${value}</strong> (${percent}%)`
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
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params
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
      formatter: (params: any) => {
        const value = params.value.toLocaleString()
        return `${params.name}<br/><strong>${value}</strong>`
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
export function createResizeHandler(chart: any, debounceMs = 150) {
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
