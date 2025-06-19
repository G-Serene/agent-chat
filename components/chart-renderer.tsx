"use client"

import { useState, useEffect } from "react"
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  Bar,
  Line,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Loader2, AlertCircle } from "lucide-react"

interface ChartRendererProps {
  artifact: {
    content: string
  }
}

// Minimalist color palette - Black, White, Red
const COLORS = [
  "#000000", // Pure Black
  "#ef4444", // Red
  "#666666", // Medium Gray
  "#999999", // Light Gray
  "#dc2626", // Dark Red
  "#333333", // Dark Gray
  "#f87171", // Light Red
  "#525252", // Charcoal
]

// Minimalist chart theme
const CHART_THEME = {
  fontSize: 12,
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  colors: {
    text: "#000000", // Pure Black
    textLight: "#666666", // Medium Gray
    grid: "#f3f4f6", // Very Light Gray
    background: "#ffffff", // Pure White
    accent: "#ef4444", // Red
  },
}

// Function to clean JSON by removing comments
function cleanJsonString(jsonString: string): string {
  // Remove single-line comments (// comment)
  let cleaned = jsonString.replace(/\/\/.*$/gm, "")

  // Remove multi-line comments (/* comment */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "")

  // Remove trailing commas before closing brackets/braces
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1")

  return cleaned.trim()
}

export function ChartRenderer({ artifact }: ChartRendererProps) {
  const [chartData, setChartData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawContent, setRawContent] = useState<string>("")

  useEffect(() => {
    const parseChartData = async () => {
      setIsLoading(true)
      setError(null)
      setRawContent(artifact.content)

      try {
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Clean the JSON string first
        const cleanedJson = cleanJsonString(artifact.content)
        console.log("🧹 Cleaned JSON:", cleanedJson)

        const parsed = JSON.parse(cleanedJson)
        setChartData(parsed)
      } catch (error) {
        console.error("Failed to parse chart JSON:", error)
        setError("Invalid Chart Data - The provided data contains invalid JSON syntax.")
      } finally {
        setIsLoading(false)
      }
    }

    parseChartData()
  }, [artifact.content])

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-sm font-medium">Rendering chart...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <p className="font-semibold">{error}</p>
        </div>
        <p className="mb-2">Common issues:</p>
        <ul className="list-disc list-inside text-xs space-y-1 mb-3">
          <li>Remove JavaScript-style comments (// or /* */)</li>
          <li>Remove trailing commas before closing brackets</li>
          <li>Ensure all strings are properly quoted</li>
          <li>Check for missing commas between properties</li>
        </ul>
        <details className="text-xs">
          <summary className="cursor-pointer hover:text-red-600 dark:hover:text-red-300 font-medium">
            Show original content
          </summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto font-mono whitespace-pre-wrap max-h-40">
            {rawContent}
          </pre>
        </details>
        <div className="mt-3 p-2 bg-muted border border-border rounded-sm">
          <p className="text-foreground font-medium text-xs mb-1">✅ Corrected version:</p>
          <pre className="text-muted-foreground text-xs font-mono whitespace-pre-wrap">
            {`{
  "chartType": "pie",
  "data": [
    {"region": "East", "avg_temp": 81.33},
    {"region": "Midwest", "avg_temp": 76.67},
    {"region": "West", "avg_temp": 69.67}
  ],
  "config": {
    "title": "Average June Temperatures by Region",
    "subtitle": "Grouped by East, Midwest, and West",
    "footer": "Data updated as of June 16, 2025",
    "legend": true,
    "series": [
      {"dataKey": "avg_temp", "fill": "#3b82f6", "name": "Avg Temperature (°F)"}
    ]
  }
}`}
          </pre>
        </div>
      </div>
    )
  }

  const { chartType, data, config } = chartData

  if (!chartType || !data) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <p className="font-semibold">Invalid Chart Configuration</p>
        </div>
        <p>Chart must have 'chartType' and 'data' properties.</p>
      </div>
    )
  }

  // Custom tooltip component for consistent styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Custom legend component for consistent styling
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderChart = () => {
    const commonProps = {
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    }

    switch (chartType) {
      case "bar":
        return (
          <BarChart data={data} {...commonProps}>
            {config?.grid && <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} strokeWidth={1} />}
            <XAxis
              dataKey={config?.xAxis?.dataKey || "name"}
              tick={{ fontSize: CHART_THEME.fontSize, fill: CHART_THEME.colors.text }}
              axisLine={{ stroke: CHART_THEME.colors.grid }}
              tickLine={{ stroke: CHART_THEME.colors.grid }}
              {...(config?.xAxis || {})}
            />
            <YAxis
              tick={{ fontSize: CHART_THEME.fontSize, fill: CHART_THEME.colors.text }}
              axisLine={{ stroke: CHART_THEME.colors.grid }}
              tickLine={{ stroke: CHART_THEME.colors.grid }}
              {...(config?.yAxis || {})}
            />
            <Tooltip content={<CustomTooltip />} />
            {config?.legend && <Legend content={<CustomLegend />} />}
            {config?.series?.map((s: any, i: number) => (
              <Bar
                key={i}
                dataKey={s.dataKey}
                fill={s.fill || COLORS[i % COLORS.length]}
                radius={[2, 2, 0, 0]}
                {...s}
              />
            ))}
          </BarChart>
        )

      case "line":
        return (
          <LineChart data={data} {...commonProps}>
            {config?.grid && <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} strokeWidth={1} />}
            <XAxis
              dataKey={config?.xAxis?.dataKey || "name"}
              tick={{ fontSize: CHART_THEME.fontSize, fill: CHART_THEME.colors.text }}
              axisLine={{ stroke: CHART_THEME.colors.grid }}
              tickLine={{ stroke: CHART_THEME.colors.grid }}
              {...(config?.xAxis || {})}
            />
            <YAxis
              tick={{ fontSize: CHART_THEME.fontSize, fill: CHART_THEME.colors.text }}
              axisLine={{ stroke: CHART_THEME.colors.grid }}
              tickLine={{ stroke: CHART_THEME.colors.grid }}
              {...(config?.yAxis || {})}
            />
            <Tooltip content={<CustomTooltip />} />
            {config?.legend && <Legend content={<CustomLegend />} />}
            {config?.series?.map((s: any, i: number) => (
              <Line
                key={i}
                dataKey={s.dataKey}
                stroke={s.stroke || s.fill || COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                {...s}
              />
            ))}
          </LineChart>
        )

      case "area":
        return (
          <AreaChart data={data} {...commonProps}>
            {config?.grid && <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.colors.grid} strokeWidth={1} />}
            <XAxis
              dataKey={config?.xAxis?.dataKey || "name"}
              tick={{ fontSize: CHART_THEME.fontSize, fill: CHART_THEME.colors.text }}
              axisLine={{ stroke: CHART_THEME.colors.grid }}
              tickLine={{ stroke: CHART_THEME.colors.grid }}
              {...(config?.xAxis || {})}
            />
            <YAxis
              tick={{ fontSize: CHART_THEME.fontSize, fill: CHART_THEME.colors.text }}
              axisLine={{ stroke: CHART_THEME.colors.grid }}
              tickLine={{ stroke: CHART_THEME.colors.grid }}
              {...(config?.yAxis || {})}
            />
            <Tooltip content={<CustomTooltip />} />
            {config?.legend && <Legend content={<CustomLegend />} />}
            {config?.series?.map((s: any, i: number) => (
              <Area
                key={i}
                dataKey={s.dataKey}
                stroke={s.stroke || s.fill || COLORS[i % COLORS.length]}
                fill={s.fill || COLORS[i % COLORS.length]}
                fillOpacity={0.6}
                strokeWidth={2}
                {...s}
              />
            ))}
          </AreaChart>
        )

      case "pie":
        return (
          <PieChart {...commonProps}>
            <Tooltip content={<CustomTooltip />} />
            {config?.legend && <Legend content={<CustomLegend />} />}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey={config?.series?.[0]?.dataKey || "avg_temp"}
              nameKey={config?.series?.[0]?.nameKey || "region"}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )

      default:
        return (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-2">
              Unsupported chart type:{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">{chartType}</code>
            </p>
            <p className="text-sm">Supported types: bar, line, area, pie</p>
          </div>
        )
    }
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Chart Header */}
      {chartData.config?.title && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
            {chartData.config.title}
          </h3>
          {chartData.config?.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-1">{chartData.config.subtitle}</p>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={450}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer */}
      {chartData.config?.footer && (
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{chartData.config.footer}</p>
        </div>
      )}
    </div>
  )
}
