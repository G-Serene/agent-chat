"use client"

import type { Message } from "@ai-sdk/ui-utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { User, Wrench, ExternalLink, Copy, Check, Code, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { useState, memo, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { detectArtifacts } from "@/lib/artifact-detector"
import { HighPerformanceStreamingText as StreamingText } from "@/components/high-performance-streaming-text"
import { AIAssistantIcon } from "@/components/ai-assistant-icon"

interface MessageBubbleProps {
  message: Message
  onArtifactToggle: (artifactId?: string) => void
  isStreaming?: boolean
  isLastMessage?: boolean
}

// Remove code blocks for display
function removeCodeBlocks(content: string): string {
  return content.replace(/```[\w]*\s*\n[\s\S]*?\n```/g, "").trim()
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onArtifactToggle,
  isStreaming = false,
  isLastMessage = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user"
  const hasToolInvocations = message.toolInvocations && message.toolInvocations.length > 0
  const [copied, setCopied] = useState(false)
  const [showArtifactNotification, setShowArtifactNotification] = useState(false)

  // Extract content using AI SDK standard approach
  const messageContent = message.content || ""

  // Memoize expensive operations
  const contentWithoutCodeBlocks = useMemo(() => removeCodeBlocks(messageContent), [messageContent])
  // Memoize expensive operations with proper cleanup
  const artifacts = useMemo(() => {
    // Only detect artifacts when not streaming to avoid unnecessary recalculations
    if (isStreaming) return []
    return detectArtifacts(messageContent, message.id)
  }, [messageContent, message.id, isStreaming])

  // Cleanup effect for memory management
  useEffect(() => {
    return () => {
      // Cleanup any pending operations when component unmounts
      if (artifacts.length > 50) {
        console.warn('Large number of artifacts detected, consider pagination')
      }
    }
  }, [artifacts.length])

  // For non-streaming messages, filter code blocks for display
  const displayContent = isStreaming && isLastMessage && !isUser ? messageContent : contentWithoutCodeBlocks

  // Show artifact notification after streaming completes
  useEffect(() => {
    if (!isStreaming && artifacts.length > 0 && !isUser) {
      const timer = setTimeout(() => {
        setShowArtifactNotification(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setShowArtifactNotification(false)
    }
  }, [isStreaming, artifacts.length, isUser])

  // Determine if this message should stream
  const shouldStream = !isUser && isStreaming && isLastMessage && messageContent.length > 0

  // Debug logging only in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("Should stream?", { 
      shouldStream, 
      isUser, 
      isStreaming, 
      isLastMessage, 
      messageId: message.id,
      contentLength: displayContent.length,
      rawContentLength: messageContent.length
    })
  }

  const handleCopy = () => {
    navigator.clipboard
      .writeText(messageContent)
      .then(() => {
        setCopied(true)
        toast.success("Copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        toast.error("Failed to copy.")
        console.error("Failed to copy text: ", err)
      })
  }
  const handleViewArtifacts = () => {
    if (artifacts.length > 0) {
      onArtifactToggle(artifacts[0].id)
    } else {
      onArtifactToggle()
    }
  }  // Standard markdown components with zero spacing
  const markdownComponents = {    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return (
          <code className="font-mono bg-muted px-1 py-0.5 rounded text-sm break-all overflow-wrap-anywhere word-break-break-word max-w-full" {...props}>
            {children}
          </code>
        )
      }
      return null
    },    pre: () => null,    p: ({ node, ...props }: any) => <p className="mb-1 last:mb-0 leading-normal" {...props} />,    ul: ({ node, ...props }: any) => (
      <ul className="mb-1 space-y-0" style={{ paddingLeft: '1.5rem', listStyleType: 'disc', listStylePosition: 'outside' }} {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className="mb-1 space-y-0" style={{ paddingLeft: '1.5rem', listStyleType: 'decimal', listStylePosition: 'outside' }} {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li className="leading-normal break-words" style={{ display: 'list-item' }} {...props} />
    ),
    strong: ({ node, ...props }: any) => <strong className="font-semibold" {...props} />,
    em: ({ node, ...props }: any) => <em className="italic" {...props} />,
    br: () => <br />,
    h1: ({ node, ...props }: any) => <div className="font-bold text-lg leading-tight" {...props} />,
    h2: ({ node, ...props }: any) => <div className="font-bold text-base leading-tight" {...props} />,
    h3: ({ node, ...props }: any) => <div className="font-semibold text-base leading-tight" {...props} />,
    h4: ({ node, ...props }: any) => <div className="font-semibold leading-tight" {...props} />,
    h5: ({ node, ...props }: any) => <div className="font-medium leading-tight" {...props} />,
    h6: ({ node, ...props }: any) => <div className="font-medium leading-tight" {...props} />,
  }

  // Don't render empty messages
  if (!messageContent && !hasToolInvocations) {
    return null
  }  return (
    <div className={cn("flex w-full max-w-full gap-3 text-wrap-responsive break-words overflow-wrap-anywhere", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-9 h-9 mt-1 flex items-center justify-center flex-shrink-0">
          <AIAssistantIcon size={24} />
        </div>
      )}      <div className={cn("flex flex-col gap-1 min-w-0 text-wrap-responsive", isUser ? "items-end max-w-[min(80%,600px)] ml-auto" : "items-start max-w-[min(90%,800px)] mr-auto")}>        <div
          className={cn(
            "relative group min-w-0 text-wrap-responsive",
            "break-words overflow-wrap-anywhere hyphens-auto word-break-break-word",
            isUser 
              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 rounded-2xl px-4 py-3 shadow-sm rounded-br-none" 
              : "bg-transparent text-foreground py-1", // Minimal padding for agent
          )}
        >
          {/* Message Content */}
          {shouldStream ? (            <StreamingText
              content={messageContent}
              isStreaming={true}
              className={cn(
                "max-w-none text-wrap-responsive w-full [&>*]:mb-1 [&>*:last-child]:mb-0", 
                "break-words overflow-wrap-anywhere word-break-break-word hyphens-auto",
                isUser ? "text-gray-900 dark:text-gray-100" : "text-foreground"
              )}
            />) : (            <div className="w-full max-w-none text-wrap-responsive break-words overflow-wrap-anywhere word-break-break-word hyphens-auto [&>*]:mb-1 [&>*:last-child]:mb-0 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:mb-1 [&_ol]:mb-1 [&_li]:mb-0">
              <ReactMarkdown components={markdownComponents}>{displayContent}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Tool Invocations */}
        {hasToolInvocations && (
          <div className="mt-3 space-y-2">
            {message.toolInvocations?.map((toolInvocation) => (
              <Card
                key={toolInvocation.toolCallId}
                className={cn("p-3 border shadow-none", isUser ? "bg-slate-600/50 border-white/20" : "bg-muted/50")}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-red-500" />
                    <span className="font-semibold text-sm">Tool: {toolInvocation.toolName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewArtifacts}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3 mr-1 text-red-500" />
                    View Details
                  </Button>
                </div>

                {toolInvocation.state === "result" && toolInvocation.result && (
                  <div className="text-sm opacity-90">
                    {typeof toolInvocation.result === "string"
                      ? toolInvocation.result
                      : JSON.stringify(toolInvocation.result, null, 2)}
                  </div>
                )}

                {toolInvocation.state === "call" && toolInvocation.args && (
                  <pre className="text-xs opacity-80 bg-black/5 dark:bg-white/5 p-2 rounded-md mt-1 overflow-x-auto">
                    <code>{JSON.stringify(toolInvocation.args, null, 2)}</code>
                  </pre>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Copy button */}
        {!isUser && messageContent && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground bg-card border"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3 text-red-500" /> : <Copy className="w-3 h-3" />}
          </Button>
        )}

        {/* Artifact Notification */}
        {showArtifactNotification && !isUser && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-800 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              {messageContent.includes("```chart") || messageContent.includes('"chartType"') ? (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Chart created</span>
                </>
              ) : (
                <>
                  <Code className="w-4 h-4" />                  <span className="text-sm font-medium">
                    {artifacts.length} artifact{artifacts.length > 1 ? "s" : ""} created
                  </span>
                </>
              )}
            </div>
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewArtifacts}
                className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 p-0 h-auto"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Details
              </Button>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground px-1">
          {new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>      {isUser && (
        <Avatar className="w-9 h-9 mt-1 shadow-sm flex-shrink-0">
          <AvatarFallback className="bg-slate-100 text-slate-600">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
})
