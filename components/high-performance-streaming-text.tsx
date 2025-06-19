"use client"

import ReactMarkdown from "react-markdown"
import { useEffect, useRef, useState, memo, useMemo, startTransition } from "react"

interface HighPerformanceStreamingTextProps {
  content: string
  isStreaming: boolean
  className?: string
}

// Split text into manageable chunks for better performance
function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(0, i + chunkSize))
  }
  return chunks
}

export const HighPerformanceStreamingText = memo(function HighPerformanceStreamingText({ 
  content, 
  isStreaming, 
  className = "" 
}: HighPerformanceStreamingTextProps) {
  const [displayContent, setDisplayContent] = useState("")
  const lastUpdateTimeRef = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const requestIdRef = useRef<number | undefined>(undefined)
  
  // More aggressive throttling for streaming content
  useEffect(() => {
    if (isStreaming) {
      // Cancel any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current)
      }
      
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current
      
      // Throttle to 200ms for very aggressive performance optimization
      if (timeSinceLastUpdate >= 200) {
        // Use startTransition for non-urgent updates during streaming
        startTransition(() => {
          setDisplayContent(content)
        })
        lastUpdateTimeRef.current = now
      } else {
        // Batch rapid updates with longer delay
        updateTimeoutRef.current = setTimeout(() => {
          startTransition(() => {
            setDisplayContent(content)
          })
          lastUpdateTimeRef.current = Date.now()
        }, 200)
      }
    } else {
      // Immediate update when not streaming
      setDisplayContent(content)
    }
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current)
      }
    }
  }, [content, isStreaming])
  
  // Memoize markdown components to prevent recreation
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return (
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-sm" {...props}>
            {children}
          </code>
        )
      }
      return null
    },
    pre: () => null,
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc list-inside mb-2" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside mb-2" {...props} />,
    li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mb-3" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mb-2" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold mb-2" {...props} />,
  }), [])

  // For streaming, show simplified text without markdown parsing to improve performance
  if (isStreaming) {
    return (
      <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
        <div 
          className="whitespace-pre-wrap break-words"
          style={{ 
            // Use CSS for better performance instead of JS animations
            willChange: 'contents',
            contain: 'layout style'
          }}
        >
          {displayContent}
          <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
        </div>
      </div>
    )
  }

  // When not streaming, render full markdown
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {displayContent}
      </ReactMarkdown>
    </div>
  )
})

// Export for backward compatibility
export const StreamingText = HighPerformanceStreamingText
