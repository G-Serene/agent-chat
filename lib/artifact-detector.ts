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

export function detectArtifacts(content: string, messageId?: string): ArtifactContent[] {
  const artifacts: ArtifactContent[] = []
  let blockIndex = 0

  console.log("🔍 Detecting artifacts for message:", messageId, "Content length:", content.length)

  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || "unknown"
    const code = match[2]
    blockIndex++

    // Skip 'text' language blocks for artifact panel
    if (language.toLowerCase() === "text") {
      console.log(`Skipping 'text' language block for artifacts: ${code.substring(0, 50)}...`)
      continue
    }

    if (code.length > 0) {
      const type = getArtifactType(language)
      let title = ""

      if (type === "diagram" && language.toLowerCase() === "mermaid") {
        title = `Mermaid Diagram ${blockIndex}`
      } else if (type === "chart") {
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
        title = chartTypeMap[language.toLowerCase()] || `Data Chart ${blockIndex}`
      } else if (type === "table") {
        title = `Data Table ${blockIndex}`
      } else {
        title = `${language} Block ${blockIndex}`
      }

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

      if (language.toLowerCase() === "html" || language.toLowerCase() === "xml") {
        artifact.tabs = [
          { id: "preview", label: "Preview", content: code, type: "preview" },
          { id: "source", label: "Source", content: code, type: "source" },
        ]
      }

      console.log("✅ Created artifact:", artifactId, "for message:", messageId)
      artifacts.push(artifact)
    }
  }

  console.log("✅ Total artifacts detected:", artifacts.length)
  return artifacts
}

function getArtifactType(language: string): ArtifactContent["type"] {
  const langLower = language.toLowerCase()
  const codeLanguages = [
    "javascript",
    "python",
    "java",
    "cpp",
    "c",
    "go",
    "rust",
    "php",
    "ruby",
    "swift",
    "kotlin",
    "typescript",
    "jsx",
    "tsx",
    "bash",
    "shell",
    "sql",
    "r",
    "matlab",
    "scala",
    "perl",
    "unknown",
  ]
  const diagramLanguages = ["mermaid", "dot", "plantuml"]
  const dataLanguages = ["json", "csv", "xml", "yaml", "toml"]
  const webLanguages = ["html", "svg"]
  const chartLanguages = ["chart", "pie", "bar", "line", "area", "scatter", "radar", "composed", "treemap", "funnel", "heatmap", "donut", "visualization", "graph", "plot", "dashboard"]
  const tableLanguages = ["table", "tabular"]

  if (tableLanguages.includes(langLower)) return "table"
  if (chartLanguages.includes(langLower)) return "chart"
  if (diagramLanguages.includes(langLower)) return "diagram"
  if (dataLanguages.includes(langLower)) return "data"
  if (webLanguages.includes(langLower)) return "html"
  if (codeLanguages.includes(langLower)) return "code"

  return "code"
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
