"use client"

import ReactMarkdown from "react-markdown"
import { memo } from "react"

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Single, consistent markdown configuration for the entire app
const markdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc list-inside mb-2" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal list-inside mb-2" {...props} />,
  li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
  em: ({ node, ...props }: any) => <em className="italic" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mb-2 mt-3 first:mt-0" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold mb-2 mt-3 first:mt-0" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold mb-1 mt-2 first:mt-0" {...props} />,
  code: ({ node, inline, ...props }: any) => {
    if (inline) {
      return <code className="font-mono bg-muted px-1 py-0.5 rounded text-sm" {...props} />
    }
    return <code {...props} />
  },
  pre: ({ node, ...props }: any) => <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-3" {...props} />,
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ 
  content, 
  className = "" 
}: MarkdownRendererProps) {
  // Normalize content by removing excessive whitespace
  const normalizedContent = content
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ newlines with 2
    .replace(/^\s+|\s+$/g, '') // Trim start/end whitespace
    .replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
  
  return (
    <div className={className}>
      <ReactMarkdown components={markdownComponents}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
})
