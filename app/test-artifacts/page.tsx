"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArtifactDebugger } from "@/components/artifact-debugger"
import { ChartRenderer } from "@/components/chart-renderer"
import { TableRenderer } from "@/components/table-renderer"
import { DebugPanel } from "@/components/debug-panel"
import { detectArtifacts } from "@/lib/artifact-detector"
import { BarChart3, Table, Code, TestTube } from "lucide-react"

const testArtifacts = {
  chart: {
    content: JSON.stringify({
      chartType: "bar",
      title: "Enhanced Chart Detection Test",
      data: [
        { month: "Jan", sales: 12000, profit: 3000 },
        { month: "Feb", sales: 15000, profit: 4500 },
        { month: "Mar", sales: 18000, profit: 5200 },
        { month: "Apr", sales: 14000, profit: 4100 },
        { month: "May", sales: 19000, profit: 5800 }
      ],
      config: {
        title: "Monthly Sales & Profit Analysis",
        subtitle: "Q1-Q2 Performance Review",
        xAxis: { dataKey: "month", label: "Month" },
        yAxis: { label: "Amount ($)" },
        legend: true,
        grid: true,
        series: [
          { dataKey: "sales", fill: "#dc2626", name: "Sales Revenue" },
          { dataKey: "profit", fill: "#2563eb", name: "Net Profit" }
        ]
      }
    }, null, 2),
    title: "Enhanced Chart Test"
  },
  table: {
    content: JSON.stringify({
      type: "table",
      title: "Enhanced Table Detection Test",
      columns: [
        { key: "id", label: "Customer ID", type: "number", sortable: true },
        { key: "company", label: "Company Name", type: "string", sortable: true },
        { key: "revenue", label: "Annual Revenue", type: "currency", sortable: true },
        { key: "growth", label: "Growth Rate", type: "number", sortable: true },
        { key: "status", label: "Status", type: "string", sortable: true }
      ],
      data: [
        { id: 1, company: "ACME Corporation", revenue: 1250000, growth: 15.2, status: "Active" },
        { id: 2, company: "Beta Industries", revenue: 890000, growth: 8.7, status: "Active" },
        { id: 3, company: "Gamma Solutions", revenue: 2100000, growth: 22.1, status: "Premium" },
        { id: 4, company: "Delta Systems", revenue: 750000, growth: 5.3, status: "Active" },
        { id: 5, company: "Epsilon Tech", revenue: 1750000, growth: 18.9, status: "Premium" }
      ],
      summary: {
        totalRows: 5,
        totalColumns: 5,
        lastUpdated: new Date().toISOString()
      }
    }, null, 2),
    title: "Enhanced Table Test"
  }
}

export default function ArtifactTestPage() {
  const [detectionResults, setDetectionResults] = useState<any[]>([])

  const testDetection = (type: 'chart' | 'table') => {
    const testContent = `Here's your ${type} data:

\`\`\`${type}
${testArtifacts[type].content}
\`\`\``
    
    const artifacts = detectArtifacts(testContent, `test-${type}-${Date.now()}`)
    setDetectionResults(artifacts)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <TestTube className="w-8 h-8 text-blue-500" />
          Artifact Enhancement Test Lab
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the enhanced artifact detection system with improved pattern matching, 
          content-based detection, and modern Vercel AI SDK integration.
        </p>
      </div>

      <Tabs defaultValue="detection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="detection">Detection Tests</TabsTrigger>
          <TabsTrigger value="rendering">Rendering Tests</TabsTrigger>
          <TabsTrigger value="debugging">Debug Tools</TabsTrigger>
          <TabsTrigger value="integration">API Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="detection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Enhanced Detection Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => testDetection('chart')}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <BarChart3 className="w-6 h-6 text-teal-500" />
                  Test Chart Detection
                </Button>
                
                <Button 
                  onClick={() => testDetection('table')}
                  className="h-20 flex flex-col gap-2"
                  variant="outline"
                >
                  <Table className="w-6 h-6 text-orange-500" />
                  Test Table Detection
                </Button>
              </div>

              {detectionResults.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Detection Results:</h3>
                  {detectionResults.map((artifact, index) => (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{artifact.type}</Badge>
                          <Badge variant="outline">{artifact.language}</Badge>
                          <span className="font-medium">{artifact.title}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>ID:</strong> {artifact.id}</div>
                          <div><strong>Content Length:</strong> {artifact.content.length} chars</div>
                          <div><strong>Filename:</strong> {artifact.filename}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>        <TabsContent value="rendering" className="space-y-6">
          <div className="space-y-6">
            {/* Full Component Tests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    Chart Renderer Test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartRenderer artifact={testArtifacts.chart} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table className="w-5 h-5 text-orange-500" />
                    Table Renderer Test
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TableRenderer artifact={testArtifacts.table} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="debugging" className="space-y-6">
          <ArtifactDebugger />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <DebugPanel />
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">Key Improvements</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200">
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Enhanced Detection:</strong> Content-based pattern matching beyond language tags</li>
            <li><strong>JSON Structure Analysis:</strong> Detects chart and table patterns in JSON content</li>
            <li><strong>Flexible Language Tags:</strong> Works with chart, visualization, json, and table tags</li>
            <li><strong>Intent Detection:</strong> Recognizes artifact requests without explicit formatting</li>
            <li><strong>Simplified System Prompt:</strong> Consistent JSON format guidance</li>
            <li><strong>Modern AI SDK:</strong> Latest Vercel AI SDK v5 patterns with tool streaming</li>
            <li><strong>Debug Tools:</strong> Comprehensive testing and monitoring capabilities</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
