"use client"

import { useEffect, useState, memo } from "react"
import { MarkdownRenderer } from "./markdown-renderer"

interface HighPerformanceStreamingTextProps {
  content: string
  isStreaming: boolean
  className?: string
}

export const HighPerformanceStreamingText = memo(function HighPerformanceStreamingText({ 
  content, 
  isStreaming, 
  className = "" 
}: HighPerformanceStreamingTextProps) {
  const [displayContent, setDisplayContent] = useState("")
  
  // Simple throttling for streaming content
  useEffect(() => {
    if (isStreaming) {
      const timeout = setTimeout(() => setDisplayContent(content), 50)
      return () => clearTimeout(timeout)
    } else {
      setDisplayContent(content)
    }
  }, [content, isStreaming])

  return (
    <div className={className}>
      <MarkdownRenderer content={displayContent} />
      {isStreaming && <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />}
    </div>
  )
})

// Export for backward compatibility
export const StreamingText = HighPerformanceStreamingText
