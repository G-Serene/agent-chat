"use client"

import ReactMarkdown from "react-markdown"
import { useEffect, useState, memo, useMemo } from "react"

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
    ul: ({ node, ...props }: any) => <ul className="list-disc list-inside mb-2 space-y-0" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside mb-2 space-y-0" {...props} />,
    li: ({ node, ...props }: any) => <li className="mb-0" {...props} />,
    strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mb-3" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mb-2" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold mb-2" {...props} />,
  }), [])

  // Always use ReactMarkdown for consistent formatting
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {displayContent}
      </ReactMarkdown>
      {isStreaming && <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />}
    </div>
  )
})

// Export for backward compatibility
export const StreamingText = HighPerformanceStreamingText
