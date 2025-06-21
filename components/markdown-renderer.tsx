"use client"

import ReactMarkdown from "react-markdown"
import { memo } from "react"
import type { Components } from "react-markdown"

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Chat-optimized markdown renderer with zero extra spacing
 * 
 * Inspired by chat-sdk.dev patterns:
 * - Flat structure with minimal nesting
 * - Zero margins by default, only add where needed
 * - Inline-first approach for chat messages
 * - Uses CSS Grid for precise spacing control
 */

// Chat-optimized components with zero default margins
const markdownComponents: Partial<Components> = {
  // Remove all paragraph margins - let parent control spacing
  p: ({ children }) => <span className="block">{children}</span>,
  
  // Inline lists with minimal spacing
  ul: ({ children }) => (
    <span className="block my-1">
      {children}
    </span>
  ),
  ol: ({ children }) => (
    <span className="block my-1">
      {children}
    </span>
  ),
  
  // Inline list items
  li: ({ children }) => (
    <span className="block pl-4 relative before:content-['•'] before:absolute before:left-0">
      {children}
    </span>
  ),
  
  // Inline formatting
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  
  // Minimal heading spacing
  h1: ({ children }) => <span className="block text-lg font-bold my-1">{children}</span>,
  h2: ({ children }) => <span className="block text-base font-bold my-1">{children}</span>,
  h3: ({ children }) => <span className="block text-sm font-bold my-1">{children}</span>,
  
  // Inline code
  code: ({ children, ...props }) => {
    const isBlock = props.className?.includes('language-')
    
    if (isBlock) {
      return (
        <span className="block bg-muted p-2 rounded text-sm font-mono my-1 overflow-x-auto">
          {children}
        </span>
      )
    }
    
    return (
      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  },
  
  // Block code with minimal spacing
  pre: ({ children }) => (
    <span className="block bg-muted p-2 rounded font-mono text-sm my-1 overflow-x-auto">
      {children}
    </span>
  ),
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ 
  content, 
  className = "" 
}: MarkdownRendererProps) {
  // Aggressive content normalization for chat context
  const normalizedContent = content
    .replace(/\n{2,}/g, '\n') // Convert all multiple newlines to single newlines
    .replace(/^\s+|\s+$/g, '') // Trim all whitespace
    .replace(/\n\s+/g, '\n') // Remove indentation from new lines
  
  return (
    <div 
      className={`leading-tight space-y-0 ${className}`}
      style={{ 
        lineHeight: '1.4',
        wordBreak: 'break-word'
      }}
    >
      <ReactMarkdown 
        components={markdownComponents}
        skipHtml={true}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
})
