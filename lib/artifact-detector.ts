export interface ArtifactContent {
  id: string
  type: "code" | "text" | "data" | "diagram" | "html" | "chart" | "table"
  language?: string
  title: string
  content: string
  filename?: string
  messageId?: string
  blockIndex?: number
  tabs?: Array<{
    id: string
    label: string
    content: string
    type: "preview" | "source"
  }>
}

// Performance optimization: Cache regex patterns
const CODE_BLOCK_REGEX = /```(\w+)?\s*\n([\s\S]*?)\n```/g
const CHART_PATTERNS = [
  /create.*chart/i, /generate.*graph/i, /visualize.*data/i,
  /plot.*data/i, /bar chart/i, /line chart/i, /pie chart/i,
  /show.*chart/i, /display.*graph/i
]
const TABLE_PATTERNS = [
  /create.*table/i, /generate.*table/i, /show.*table/i,
  /display.*data.*table/i, /tabular.*data/i, /data.*grid/i
]

export function detectArtifacts(content: string, messageId?: string): ArtifactContent[] {
  const artifacts: ArtifactContent[] = []
  let blockIndex = 0

  let match

  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    const language = (match[1] || "unknown").toLowerCase()
    const code = match[2]
    blockIndex++

    // Skip 'text' language blocks for artifact panel
    if (language === "text") {
      continue
    }

    if (code.length > 0) {
      // Enhanced type detection that looks at content, not just language tags
      const type = getEnhancedArtifactType(language, code)
      let title = getEnhancedTitle(type, language, code, blockIndex)

      // Create a unique ID that includes message context
      const artifactId = messageId
        ? `${messageId}-${type}-${language}-${blockIndex}`
        : `art-${type}-${language}-${blockIndex}-${Math.random().toString(36).substring(2, 9)}`

      const artifact: ArtifactContent = {
        id: artifactId,
        type: type,
        language,
        title: title,
        content: code,
        filename: getFilename(language, blockIndex, type),
        messageId: messageId,
        blockIndex: blockIndex,
      }

      if (language === "html" || language === "xml") {
        artifact.tabs = [
          { id: "preview", label: "Preview", content: code, type: "preview" },
          { id: "source", label: "Source", content: code, type: "source" },
        ]
      }

      artifacts.push(artifact)
      
      // Debug logging to track artifact creation
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Artifact] Created from code block: ${type} (${language}) - ID: ${artifactId}`)
      }
    }
  }

  // Also check for content patterns without code blocks, but pass existing artifacts to avoid duplicates
  const contentArtifacts = detectContentPatterns(content, messageId, blockIndex, artifacts)
  if (contentArtifacts.length > 0 && process.env.NODE_ENV === 'development') {
    console.log(`[Artifact] Created ${contentArtifacts.length} artifacts from content patterns`)
  }
  artifacts.push(...contentArtifacts)

  // Final debug log
  if (process.env.NODE_ENV === 'development' && artifacts.length > 0) {
    console.log(`[Artifact] Total artifacts detected: ${artifacts.length}`)
  }

  return artifacts
}

function getEnhancedArtifactType(language: string, code: string): ArtifactContent["type"] {
  const langLower = language.toLowerCase()
  
  // Language-based detection with priority for programming languages
  const codeLanguages = [
    "javascript", "python", "java", "cpp", "c", "go", "rust", "php", "ruby", 
    "swift", "kotlin", "typescript", "jsx", "tsx", "bash", "shell", "sql", 
    "r", "matlab", "scala", "perl", "csharp", "fsharp", "unknown"
  ]
  const diagramLanguages = ["mermaid", "dot", "plantuml"]
  const dataLanguages = ["csv", "xml", "yaml", "toml"] // Removed "json" to allow content detection
  const webLanguages = ["html", "svg"]
  const chartLanguages = [
    "chart", "pie", "bar", "line", "area", "scatter", "radar", "composed", 
    "treemap", "funnel", "heatmap", "donut", "visualization", "graph", "plot", "dashboard"
  ]
  const tableLanguages = ["table", "tabular"]

  // First check explicit type languages
  if (tableLanguages.includes(langLower)) return "table"
  if (chartLanguages.includes(langLower)) return "chart"
  if (diagramLanguages.includes(langLower)) return "diagram"
  if (webLanguages.includes(langLower)) return "html"
  if (dataLanguages.includes(langLower)) return "data"
  
  // For programming languages, always return "code" regardless of content
  if (codeLanguages.includes(langLower)) return "code"
  
  // Special handling for JSON - allow content-based detection for charts/tables
  if (langLower === "json") {
    const contentType = detectContentType(code)
    if (contentType === "chart" || contentType === "table") {
      return contentType
    }
    return "data" // Default for JSON that's not chart/table
  }
  
  // For other ambiguous cases, do content-based detection
  const contentType = detectContentType(code)
  if (contentType) {
    return contentType
  }
  
  // Default fallback
  return "code"
}

function detectContentType(code: string): ArtifactContent["type"] | null {
  // First check if this looks like programming code
  const codeIndicators = [
    'import ', 'from ', 'def ', 'function ', 'class ', 'const ', 'let ', 'var ',
    'if (', 'for (', 'while (', 'try:', 'except:', 'catch (', 'throw ',
    '#include', 'public class', 'private ', 'protected ', 'static ',
    '#!/', 'package ', 'use ', 'require(', 'module.exports',
    'async ', 'await ', 'return ', 'yield ', 'lambda ', 'print(',
    'console.log', 'System.out', 'echo ', 'printf(', 'scanf(',
    'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE TABLE',
    'ALTER TABLE', 'DROP TABLE', 'INDEX', 'WHERE', 'JOIN'
  ]
  
  if (codeIndicators.some(indicator => code.includes(indicator))) {
    return null // Let language-based detection handle it
  }

  try {
    const parsed = JSON.parse(code)
    
    // Chart detection patterns - look for chart-specific properties
    if (parsed.chartType || parsed.type === 'chart' || 
        parsed.data?.datasets || parsed.datasets ||
        parsed.labels || parsed.x || parsed.y ||
        parsed.series || parsed.config?.type ||
        parsed.options?.plugins || parsed.options?.scales) {
      return 'chart'
    }
    
    // Enhanced chart detection - check if data array has multiple numeric values
    if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
      const firstItem = parsed.data[0]
      if (typeof firstItem === 'object' && firstItem !== null) {
        const keys = Object.keys(firstItem)
        const numericKeys = keys.filter(key => 
          key !== 'name' && key !== 'label' && key !== 'category' && 
          typeof firstItem[key] === 'number'
        )
        
        // If we have multiple numeric columns, it's likely a chart
        if (numericKeys.length >= 1 && (parsed.title || parsed.chartType || numericKeys.length > 1)) {
          return 'chart'
        }
      }
    }
    
    // Table detection patterns - be more specific
    if (parsed.type === 'table' || parsed.columns || 
        (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0 && 
         typeof parsed.data[0] === 'object' && !parsed.chartType)) {
      return 'table'
    }
    
    // Additional table check for array of objects with consistent structure
    if (Array.isArray(parsed) && parsed.length > 0 && 
        typeof parsed[0] === 'object' && parsed[0] !== null &&
        !parsed.some(item => item.chartType || item.datasets)) {
      // Check if it's a consistent table structure
      const firstKeys = Object.keys(parsed[0])
      const isConsistentTable = parsed.every(item => 
        typeof item === 'object' && item !== null &&
        Object.keys(item).length === firstKeys.length
      )
      if (isConsistentTable) {
        return 'table'
      }
    }
  } catch {
    // If JSON parsing fails, try other detection methods
  }
  
  // String-based content detection - be more specific
  const lowerCode = code.toLowerCase()
  
  // Chart detection keywords - only if they appear in context
  const chartKeywords = [
    'charttype', 'barchart', 'linechart', 'piechart', 'areachart',
    'chart.js', 'recharts', 'chartjs'
  ]
  
  if (chartKeywords.some(keyword => lowerCode.includes(keyword))) {
    return 'chart'
  }
  
  // Table detection keywords - only very specific ones
  const tableKeywords = [
    '"type": "table"', "'type': 'table'", '"columns":', "'columns':",
    '"rows":', "'rows':", '<table', '<thead>', '<tbody>'
  ]
  
  if (tableKeywords.some(keyword => lowerCode.includes(keyword))) {
    return 'table'
  }
  
  return null
}

function getEnhancedTitle(type: ArtifactContent["type"], language: string, code: string, blockIndex: number): string {
  if (type === "diagram" && language === "mermaid") {
    return `Mermaid Diagram ${blockIndex}`
  } 
  
  if (type === "chart") {
    // Try to extract chart type from content
    const chartType = extractChartType(code, language)
    return chartType ? `${chartType} Chart` : `Data Chart ${blockIndex}`
  } 
  
  if (type === "table") {
    return `Data Table ${blockIndex}`
  }
  
  // More specific chart titles based on language
  const chartTypeMap: Record<string, string> = {
    'bar': 'Bar Chart',
    'line': 'Line Chart', 
    'pie': 'Pie Chart',
    'area': 'Area Chart',
    'scatter': 'Scatter Plot',
    'radar': 'Radar Chart',
    'composed': 'Composed Chart',
    'visualization': 'Data Visualization',
    'graph': 'Data Graph',
    'plot': 'Data Plot',
    'dashboard': 'Dashboard'
  }
  
  return chartTypeMap[language] || `${language} Block ${blockIndex}`
}

function extractChartType(code: string, language: string): string | null {
  try {
    const parsed = JSON.parse(code)
    if (parsed.chartType) return parsed.chartType
    if (parsed.type) return parsed.type
    if (parsed.config?.type) return parsed.config.type
  } catch {
    // Continue with string-based detection
  }
  
  const lowerCode = code.toLowerCase()
  const typePatterns = [
    { pattern: /bar/i, type: 'Bar' },
    { pattern: /line/i, type: 'Line' },
    { pattern: /pie/i, type: 'Pie' },
    { pattern: /scatter/i, type: 'Scatter' },
    { pattern: /area/i, type: 'Area' },
    { pattern: /radar/i, type: 'Radar' }
  ]
  
  for (const { pattern, type } of typePatterns) {
    if (pattern.test(code)) {
      return type
    }
  }
  
  return null
}

function detectContentPatterns(content: string, messageId?: string, startIndex: number = 0, existingArtifacts: ArtifactContent[] = []): ArtifactContent[] {
  const artifacts: ArtifactContent[] = []
  const lowerContent = content.toLowerCase()
  
  // Look for chart-related language patterns
  for (const pattern of CHART_PATTERNS) {
    if (pattern.test(content)) {
      // Check if we already have a chart artifact from code blocks or previous patterns
      const hasChartArtifact = existingArtifacts.some(a => a.type === 'chart') || artifacts.some(a => a.type === 'chart')
      if (!hasChartArtifact) {
        const artifactId = messageId
          ? `${messageId}-chart-intent-${startIndex + 1}`
          : `art-chart-intent-${startIndex + 1}-${Math.random().toString(36).substring(2, 9)}`
        
        artifacts.push({
          id: artifactId,
          type: 'chart',
          language: 'json',
          title: 'Chart Visualization',
          content: '{\n  "type": "chart",\n  "chartType": "bar",\n  "data": []\n}',
          filename: `chart_${startIndex + 1}.json`,
          messageId: messageId,
          blockIndex: startIndex + 1
        })
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Artifact] Created chart from pattern intent - ID: ${artifactId}`)
        }
        break
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`[Artifact] Skipped chart pattern - existing chart artifact found`)
      }
    }
  }
  
  // Look for table-related language patterns
  for (const pattern of TABLE_PATTERNS) {
    if (pattern.test(content)) {
      // Check if we already have a table artifact from code blocks or previous patterns
      const hasTableArtifact = existingArtifacts.some(a => a.type === 'table') || artifacts.some(a => a.type === 'table')
      if (!hasTableArtifact) {
        const artifactId = messageId
          ? `${messageId}-table-intent-${startIndex + 1}`
          : `art-table-intent-${startIndex + 1}-${Math.random().toString(36).substring(2, 9)}`
        
        artifacts.push({
          id: artifactId,
          type: 'table',
          language: 'json',
          title: 'Data Table',
          content: '{\n  "type": "table",\n  "columns": [],\n  "rows": []\n}',
          filename: `table_${startIndex + 1}.json`,
          messageId: messageId,
          blockIndex: startIndex + 1
        })
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Artifact] Created table from pattern intent - ID: ${artifactId}`)
        }
        break
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`[Artifact] Skipped table pattern - existing table artifact found`)
      }
    }
  }
  
  return artifacts
}

function getFilename(language: string, counter: number, type: ArtifactContent["type"]): string {
  const extensions: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    cpp: "cpp",
    c: "c",
    go: "go",
    rust: "rs",
    php: "php",
    ruby: "rb",
    swift: "swift",
    kotlin: "kt",
    html: "html",
    css: "css",
    json: "json",
    xml: "xml",
    yaml: "yml",
    markdown: "md",
    sql: "sql",
    bash: "sh",
    shell: "sh",
    r: "r",
    matlab: "m",
    scala: "scala",
    perl: "pl",
    mermaid: "mmd",
    chart: "chart.json",
    table: "table.json",
    tabular: "table.json",
    visualization: "chart.json",
    graph: "chart.json",
    plot: "chart.json",
    dashboard: "dashboard.json",
  }
  const ext = extensions[language.toLowerCase()] || "txt"
  return `${type}_${counter}.${ext}`
}
