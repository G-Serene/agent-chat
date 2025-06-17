"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"

interface ChatMessageMermaidRendererProps {
  code: string
}

export function ChatMessageMermaidRenderer({ code }: ChatMessageMermaidRendererProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)
    setSvg(null)

    const renderMermaid = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default

        // Initialize Mermaid with better config
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
          fontFamily: "system-ui, sans-serif",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
          sequence: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        })

        if (code && isMounted) {
          // Generate a unique ID for each diagram
          const uniqueId = `mermaid-chat-${Math.random().toString(36).substring(2, 15)}`

          // Validate and render
          const isValid = await mermaid.parse(code)
          if (!isValid) {
            throw new Error("Invalid Mermaid syntax")
          }

          const result = await mermaid.render(uniqueId, code)

          if (isMounted) {
            setSvg(result.svg)
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Mermaid rendering error:", err)
          setError(err instanceof Error ? err.message : "Failed to render diagram")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    renderMermaid()

    return () => {
      isMounted = false
    }
  }, [code])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[120px] bg-muted/30 rounded-lg my-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Rendering diagram...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg my-2">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-semibold text-sm">Diagram Error</span>
        </div>
        <p className="text-sm mb-2">{error}</p>
        <details className="text-xs">
          <summary className="cursor-pointer hover:text-destructive/80">Show code</summary>
          <pre className="mt-2 p-2 bg-destructive/20 rounded text-xs overflow-auto whitespace-pre-wrap">{code}</pre>
        </details>
      </div>
    )
  }

  if (svg) {
    return (
      <div className="my-2 p-4 bg-card rounded-lg border overflow-auto">
        <div
          ref={ref}
          className="mermaid-diagram flex justify-center items-center min-h-[100px]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    )
  }

  return null
}
