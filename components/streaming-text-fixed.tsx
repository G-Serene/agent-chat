"use client"

import ReactMarkdown from "react-markdown"
import { useEffect, useRef, useState } from "react"

interface StreamingTextProps {
  content: string
  isStreaming: boolean
  className?: string
}

export function StreamingText({ content, isStreaming, className = "" }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayContent, setDisplayContent] = useState("")
  
  // Update display content immediately when content changes
  useEffect(() => {
    setDisplayContent(content)
    
    // Force immediate DOM update for streaming content
    if (isStreaming && containerRef.current) {
      // Use requestAnimationFrame to ensure immediate rendering
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
        }
      })
    }
  }, [content, isStreaming])
  
  // Debug logging to check if content updates in real-time
  if (isStreaming) {
    console.log("🎬 StreamingText update:", displayContent.length, "chars, last 20:", displayContent.slice(-20))
  }

  // Standard markdown components for consistent styling
  const markdownComponents = {
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
  }

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
}
