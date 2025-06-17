"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Bug } from "lucide-react"

export function DebugPanel() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testBackend = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test-backend")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Failed to test backend",
        healthy: false,
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
          Backend Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testBackend} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Backend...
            </>
          ) : (
            "Test Backend Connection"
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.healthy ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <Badge variant={result.healthy ? "default" : "destructive"}>
                {result.healthy ? "Connected" : "Failed"}
              </Badge>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <pre className="text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
