"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  X,
  Download,
  Copy,
  Check,
  Code,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  GripVertical,
  BarChart3,
  GitBranch,
  Grid,
  Table,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import python from "react-syntax-highlighter/dist/esm/languages/prism/python"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript"
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx"
import json from "react-syntax-highlighter/dist/esm/languages/prism/json"
import css from "react-syntax-highlighter/dist/esm/languages/prism/css"
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml"
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash"
import java from "react-syntax-highlighter/dist/esm/languages/prism/java"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql"
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp"
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp"
import go from "react-syntax-highlighter/dist/esm/languages/prism/go"
import php from "react-syntax-highlighter/dist/esm/languages/prism/php"
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby"
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust"
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift"
import type { ArtifactContent } from "@/lib/artifact-detector"
import { ChartRenderer } from "./chart-renderer"
import { TableRenderer } from "./table-renderer"
import { ChatMessageMermaidRenderer } from "./chat-message-mermaid-renderer"
import { useThrottledResize } from "@/hooks/use-resize-optimization"

SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("jsx", jsx)
SyntaxHighlighter.registerLanguage("typescript", typescript)
SyntaxHighlighter.registerLanguage("tsx", tsx)
SyntaxHighlighter.registerLanguage("json", json)
SyntaxHighlighter.registerLanguage("css", css)
SyntaxHighlighter.registerLanguage("yaml", yaml)
SyntaxHighlighter.registerLanguage("markdown", markdown)
SyntaxHighlighter.registerLanguage("bash", bash)
SyntaxHighlighter.registerLanguage("shell", bash)
SyntaxHighlighter.registerLanguage("java", java)
SyntaxHighlighter.registerLanguage("sql", sql)
SyntaxHighlighter.registerLanguage("csharp", csharp)
SyntaxHighlighter.registerLanguage("cpp", cpp)
SyntaxHighlighter.registerLanguage("go", go)
SyntaxHighlighter.registerLanguage("php", php)
SyntaxHighlighter.registerLanguage("ruby", ruby)
SyntaxHighlighter.registerLanguage("rust", rust)
SyntaxHighlighter.registerLanguage("swift", swift)

interface ArtifactWindowProps {
  artifacts: ArtifactContent[]
  isOpen: boolean
  onClose: () => void
  onResize?: (width: number) => void
  onResizeStart?: () => void
  onResizeEnd?: () => void
  initialWidth?: number
  selectedArtifactId?: string
}

export function ArtifactWindow({
  artifacts,
  isOpen,
  onClose,
  onResize,
  onResizeStart,
  onResizeEnd,
  initialWidth = 400,
  selectedArtifactId,
}: ArtifactWindowProps) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(0)
  const [isMaximized, setIsMaximized] = useState(false)
  const [viewMode, setViewMode] = useState<"single" | "grid">("single")
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  const minWidth = 350
  const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.8 : 1200

  // Optimized resize callback with throttling
  const throttledResize = useThrottledResize((newWidth: number) => {
    setWidth(newWidth)
    onResize?.(newWidth)
  }, 3) // 3px threshold for smoother performance

  // Update current artifact when selectedArtifactId changes or artifacts change
  useEffect(() => {
    if (selectedArtifactId && artifacts.length > 0) {
      const index = artifacts.findIndex((artifact) => artifact.id === selectedArtifactId)
      if (index !== -1) {
        setCurrentArtifactIndex(index)
      }
    } else if (artifacts.length > 0) {
      // Default to the latest (last) artifact
      setCurrentArtifactIndex(artifacts.length - 1)
    }
  }, [selectedArtifactId, artifacts])

  // Reset to latest artifact when new artifacts are added
  useEffect(() => {
    if (artifacts.length > 0 && !selectedArtifactId) {
      setCurrentArtifactIndex(artifacts.length - 1)
    }
  }, [artifacts.length, selectedArtifactId])
  useEffect(() => {
    setWidth(initialWidth)
  }, [initialWidth])

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false)
      }
    }

    if (isMaximized) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when maximized
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isMaximized])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    onResizeStart?.()
  }, [onResizeStart])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    onResizeEnd?.()
  }, [onResizeEnd])
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        // For relative positioned element, calculate from viewport edge
        const newWidth = window.innerWidth - e.clientX
        const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
        
        // Use the throttled resize for smooth performance
        throttledResize(clampedWidth)
      }
    },
    [isResizing, minWidth, maxWidth, throttledResize],
  )

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error("Failed to copy to clipboard")
    }
  }

  const handleDownload = (artifact: ArtifactContent) => {
    const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = artifact.filename || `artifact.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${artifact.filename}`)
  }

  const navigateArtifact = (direction: "prev" | "next") => {
    if (direction === "prev" && currentArtifactIndex > 0) {
      setCurrentArtifactIndex(currentArtifactIndex - 1)
    } else if (direction === "next" && currentArtifactIndex < artifacts.length - 1) {
      setCurrentArtifactIndex(currentArtifactIndex + 1)
    }
  }

  const getArtifactIcon = (type: ArtifactContent["type"], language?: string) => {
    if (type === "diagram") {
      return <GitBranch className="w-4 h-4 text-purple-500" />
    }
    if (type === "chart") {
      return <BarChart3 className="w-4 h-4 text-teal-500" />
    }
    if (type === "table") {
      return <Table className="w-4 h-4 text-orange-500" />
    }
    if (type === "code" || type === "text") {
      return <Code className="w-4 h-4 text-accent" />
    }
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  if (!isOpen || artifacts.length === 0) return null

  // Safety check for currentArtifact
  const currentArtifact = artifacts[currentArtifactIndex]
  if (!currentArtifact) {
    console.warn("Current artifact is undefined, index:", currentArtifactIndex, "artifacts length:", artifacts.length)
    return null
  }

  return (    <div
      ref={containerRef}
      className={cn(
        "h-full bg-background border-l-2 shadow-lg flex-shrink-0 flex flex-col",
        isMaximized && "fixed inset-0 z-50 border-l-0 bg-background/95 backdrop-blur-sm", // Full screen overlay when maximized
        !isMaximized && (!isResizing && "transition-all duration-300 ease-in-out")
      )}
      style={{ 
        width: isMaximized ? "100vw" : `${width}px`,
        height: isMaximized ? "100vh" : "100%",
        transform: 'translateZ(0)', // Hardware acceleration
        willChange: isResizing ? 'width' : 'auto'
      }}
    >
      {!isMaximized && (        <div
          ref={resizeHandleRef}
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute left-0 top-0 w-4 h-full cursor-col-resize bg-transparent transition-colors flex items-center justify-center group",
            isResizing ? "bg-accent/20 z-50" : "hover:bg-accent/10 z-40"
          )}
        >
          <div className={cn(
            "w-1 h-12 bg-border transition-colors rounded-full",
            isResizing ? "bg-accent" : "group-hover:bg-accent"
          )} />
          <GripVertical className={cn(
            "w-3 h-3 text-muted-foreground absolute transition-colors",
            isResizing ? "text-accent" : "group-hover:text-accent"
          )} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-lg">Artifacts</h2>
          <Badge variant="secondary" className="text-sm px-2 py-1">
            {currentArtifactIndex + 1} of {artifacts.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {artifacts.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === "single" ? "grid" : "single")}
              className="h-9 w-9"
              title={viewMode === "single" ? "Grid view" : "Single view"}
            >
              <Grid className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)} className="h-9 w-9">
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Controls */}
      {artifacts.length > 1 && viewMode === "single" && (
        <div className="flex items-center justify-between p-3 border-b bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateArtifact("prev")}
            disabled={currentArtifactIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {artifacts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentArtifactIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentArtifactIndex
                    ? "bg-accent"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                )}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateArtifact("next")}
            disabled={currentArtifactIndex === artifacts.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {viewMode === "single" ? (
            // Single Artifact View
            <Card className="overflow-hidden border-2">
              <CardHeader className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex-shrink-0">
                      {getArtifactIcon(currentArtifact.type, currentArtifact.language)}
                    </div>
                    <h3 className="font-semibold text-base truncate">{currentArtifact.title}</h3>
                    {currentArtifact.language && (
                      <Badge variant="outline" className="text-sm px-2 py-1">
                        {currentArtifact.language}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(currentArtifact.content, currentArtifact.id)}
                    >
                      {copiedId === currentArtifact.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(currentArtifact)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <ArtifactRenderer artifact={currentArtifact} />
              </CardContent>
            </Card>
          ) : (
            // Grid View
            <div className="grid gap-4">
              {artifacts.map((artifact, index) => (
                <Card
                  key={artifact.id}
                  className={cn(
                    "overflow-hidden border cursor-pointer transition-all hover:shadow-md",
                    index === currentArtifactIndex ? "border-accent shadow-md" : "border-border",
                  )}
                  onClick={() => {
                    setCurrentArtifactIndex(index)
                    setViewMode("single")
                  }}
                >
                  <CardHeader className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="flex-shrink-0">{getArtifactIcon(artifact.type, artifact.language)}</div>
                        <h3 className="font-medium text-sm truncate">{artifact.title}</h3>
                        {artifact.language && (
                          <Badge variant="outline" className="text-xs px-1 py-0.5">
                            {artifact.language}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {artifact.content.substring(0, 100)}...
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function ArtifactRenderer({ artifact }: { artifact: ArtifactContent }) {
  if (artifact.type === "table") {
    return <TableRenderer artifact={artifact} />
  }
  if (artifact.type === "chart") {
    return <ChartRenderer artifact={artifact} />
  }
  if (artifact.type === "diagram" && artifact.language?.toLowerCase() === "mermaid") {
    return <ChatMessageMermaidRenderer code={artifact.content} />
  }
  // Default to code rendering for 'code', 'text' types or if language is present
  if (artifact.type === "code" || artifact.type === "text" || artifact.language) {
    return (
      <div className="rounded-lg overflow-hidden border bg-[#0d1117]">
        <SyntaxHighlighter
          PreTag="pre"
          language={(artifact.language || "text").toLowerCase()}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1rem",
            fontSize: "14px",
            lineHeight: "1.6",
            backgroundColor: "transparent",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowX: "auto",
            width: "100%",
            boxSizing: "border-box",
          }}
          codeTagProps={{
            style: {
              fontFamily: '"Fira Code", "Dank Mono", "Operator Mono", "Consolas", "Menlo", "Monaco", monospace',
              whiteSpace: "inherit",
              wordBreak: "inherit",
              display: "block",
              width: "100%",
            },
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: "2em",
            paddingRight: "0.5em",
            color: "#6e7681",
            fontSize: "13px",
            userSelect: "none",
          }}
        >
          {String(artifact.content)}
        </SyntaxHighlighter>
      </div>
    )
  }

  // Fallback for any other unhandled artifact type
  return (
    <div className="bg-muted/30 p-4 rounded-lg border">
      <p className="font-semibold">Unsupported artifact type: {artifact.type}</p>
      <pre className="text-sm whitespace-pre-wrap break-words font-mono leading-relaxed">{artifact.content}</pre>
    </div>
  )
}
