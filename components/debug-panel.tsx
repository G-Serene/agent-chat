"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Bug, Settings } from "lucide-react"
import { ArtifactDebugger } from "./artifact-debugger"

export function DebugPanel() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testMCP = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/mcp")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to test MCP connection",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-orange-500" />
          MCP Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testMCP} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing MCP Connection...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Test MCP Connection
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.success && result.data?.connected ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <Badge variant={result.success && result.data?.connected ? "default" : "destructive"}>
                {result.success && result.data?.connected ? "MCP Connected" : "MCP Disconnected"}
              </Badge>
              {result.data?.connectedCount && (
                <Badge variant="outline">
                  {result.data.connectedCount} server{result.data.connectedCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            <div className="bg-muted p-3 rounded-md">
              <pre className="text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Artifact Detection Debug Section */}
        <div className="border-t pt-4">
          <ArtifactDebugger />
        </div>
      </CardContent>
    </Card>
  )
}
