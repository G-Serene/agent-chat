"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { detectArtifacts } from "@/lib/artifact-detector"
import { Code, BarChart3, Table, GitBranch, FileText, RefreshCw } from "lucide-react"

export function ArtifactDebugger() {
  const [input, setInput] = useState("")
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [lastProcessed, setLastProcessed] = useState<string>("")

  const testSamples = [
    {
      name: "JSON Chart Data (should be 'chart')",
      content: `Here's the customer analysis:

\`\`\`json
{
  "chartType": "bar",
  "title": "Customer Account Types by Age Group",
  "data": [
    {"name": "18-24 years", "Checking": 1, "Savings": 0, "Credit": 0, "Loan": 0},
    {"name": "25-34 years", "Checking": 1, "Savings": 1, "Credit": 1, "Loan": 0},
    {"name": "35-44 years", "Checking": 0, "Savings": 0, "Credit": 2, "Loan": 0},
    {"name": "45-54 years", "Checking": 0, "Savings": 1, "Credit": 0, "Loan": 1},
    {"name": "55-64 years", "Checking": 0, "Savings": 1, "Credit": 0, "Loan": 0},
    {"name": "65 years and above", "Checking": 1, "Savings": 0, "Credit": 0, "Loan": 1}
  ]
}
\`\`\`
`
    },
    {
      name: "Python Code (should be 'code')",
      content: `Here's the Python API code:

\`\`\`python
import requests

# Define the base URL for your Data Platform API
BASE_URL = "https://api.dataplatform.com/v1"

def get_data(endpoint, params=None):
    """Send a GET request to the specified endpoint."""
    url = f"{BASE_URL}{endpoint}"
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
    return None
\`\`\``
    },
    {
      name: "Chart JSON",
      content: `Here's your sales data:

\`\`\`chart
{
  "chartType": "bar",
  "title": "Monthly Sales",
  "data": [
    {"month": "Jan", "sales": 12000},
    {"month": "Feb", "sales": 15000},
    {"month": "Mar", "sales": 18000}
  ],
  "config": {
    "xAxis": {"dataKey": "month"},
    "yAxis": {"label": "Sales ($)"},
    "series": [{"dataKey": "sales", "fill": "#dc2626"}]
  }
}
\`\`\``
    },
    {
      name: "Table JSON",
      content: `Customer data:

\`\`\`table
{
  "title": "Customer List",
  "columns": [
    {"key": "id", "label": "ID", "type": "number"},
    {"key": "name", "label": "Name", "type": "string"},
    {"key": "revenue", "label": "Revenue", "type": "currency"}
  ],
  "data": [
    {"id": 1, "name": "ACME Corp", "revenue": 50000},
    {"id": 2, "name": "Beta Inc", "revenue": 35000}
  ]
}
\`\`\``
    },
    {
      name: "Mixed Content",
      content: `Let me create a visualization for you:

\`\`\`json
{
  "chartType": "pie",
  "title": "Market Share",
  "data": [
    {"name": "Product A", "value": 40},
    {"name": "Product B", "value": 35},
    {"name": "Product C", "value": 25}
  ]
}
\`\`\`

And here's the detailed breakdown:

\`\`\`json
{
  "type": "table",
  "columns": [
    {"key": "product", "label": "Product", "type": "string"},
    {"key": "share", "label": "Market Share %", "type": "number"}
  ],
  "data": [
    {"product": "Product A", "share": 40},
    {"product": "Product B", "share": 35},
    {"product": "Product C", "share": 25}
  ]
}
\`\`\``
    },
    {
      name: "Intent Detection",
      content: `I need to create a chart showing sales trends over the last quarter. Can you generate a line chart with monthly revenue data?`
    }
  ]

  const processInput = () => {
    if (!input.trim()) return
    
    const detected = detectArtifacts(input, `debug-${Date.now()}`)
    
    setArtifacts(detected)
    setLastProcessed(input)
  }

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "chart": return <BarChart3 className="w-4 h-4 text-teal-500" />
      case "table": return <Table className="w-4 h-4 text-orange-500" />
      case "diagram": return <GitBranch className="w-4 h-4 text-purple-500" />
      case "code": return <Code className="w-4 h-4 text-accent" />
      default: return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Artifact Detection Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Test Content:</label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your AI response content here to test artifact detection..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={processInput} disabled={!input.trim()}>
              Detect Artifacts
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setInput("")
                setArtifacts([])
                setLastProcessed("")
              }}
            >
              Clear
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quick Test Samples:</label>
            <div className="grid grid-cols-2 gap-2">
              {testSamples.map((sample, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(sample.content)}
                  className="text-left justify-start"
                >
                  {sample.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {artifacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detection Results ({artifacts.length} artifacts found)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {artifacts.map((artifact, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {getArtifactIcon(artifact.type)}
                    <span className="font-medium">{artifact.title}</span>
                    <Badge variant="secondary">{artifact.type}</Badge>
                    {artifact.language && (
                      <Badge variant="outline">{artifact.language}</Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <strong>ID:</strong> {artifact.id}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <strong>Filename:</strong> {artifact.filename}
                  </div>
                  
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      Content ({artifact.content.length} chars)
                    </summary>
                    <ScrollArea className="h-32 mt-2">
                      <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                        {artifact.content}
                      </pre>
                    </ScrollArea>
                  </details>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lastProcessed && artifacts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">No Artifacts Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The input was processed but no artifacts were found. This could be because:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>The content doesn't contain code blocks with supported language tags</li>
              <li>The JSON structure doesn't match expected artifact patterns</li>
              <li>The content doesn't trigger content-based pattern detection</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
