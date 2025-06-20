"use client"

import ReactMarkdown from "react-markdown"
import { useEffect, useRef, useState, memo, useMemo } from "react"

interface StreamingTextProps {
  content: string
  isStreaming: boolean
  className?: string
}

export const StreamingTextOptimized = memo(function StreamingTextOptimized({ 
  content, 
  isStreaming, 
  className = "" 
}: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayContent, setDisplayContent] = useState("")
  const lastUpdateTimeRef = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  // Throttle content updates during streaming to improve performance
  useEffect(() => {
    const now = Date.now()
    
    if (isStreaming) {
      // Clear any pending timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      // Throttle updates to every 50ms during streaming for better performance
      if (now - lastUpdateTimeRef.current >= 50) {
        setDisplayContent(content)
        lastUpdateTimeRef.current = now
      } else {
        // Batch rapid updates
        updateTimeoutRef.current = setTimeout(() => {
          setDisplayContent(content)
          lastUpdateTimeRef.current = Date.now()
        }, 50)
      }
    } else {
      // Update immediately when not streaming
      setDisplayContent(content)
    }
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [content, isStreaming])
  
  // Memoize markdown components to prevent recreation on every render
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return (
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-sm" {...props}>
            {children}
          </code>
        )
      }
      return null // Block code will be handled elsewhere
    },
    pre: () => null, // Skip pre tags to avoid code block rendering
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc list-inside mb-2 space-y-0" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside mb-2 space-y-0" {...props} />,
    li: ({ node, ...props }: any) => <li className="mb-0" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mb-3" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mb-2" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold mb-2" {...props} />,
  }), [])

  // If streaming, show content with cursor 
  if (isStreaming) {
    return (
      <div ref={containerRef} className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
        <div className="whitespace-pre-wrap break-words">
          {displayContent}
          <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
        </div>
      </div>
    )
  }

  // When not streaming, render as markdown
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {displayContent}
      </ReactMarkdown>
    </div>
  )
})

// For backward compatibility
export const StreamingText = StreamingTextOptimized
