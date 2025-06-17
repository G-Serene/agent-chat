"use client"

import type { Message } from "ai"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { User, Wrench, ExternalLink, Copy, Check, Code, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { useState, memo, useMemo, useEffect } from "react"
import { toast } from "sonner"
import { detectArtifacts } from "@/lib/artifact-detector"
import { StreamingText } from "@/components/streaming-text"
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

  // Debug logging
  console.log("MessageBubble render:", {
    messageId: message.id,
    isStreaming,
    isLastMessage,
    isUser,
    contentLength: messageContent.length,
    content: messageContent.slice(0, 50) + "...",
  })

  // For non-streaming messages, filter code blocks for display
  const displayContent = isStreaming && isLastMessage && !isUser ? messageContent : removeCodeBlocks(messageContent)

  // Only detect artifacts for completed messages
  const messageArtifacts = useMemo(
    () =>
      message.role === "assistant" && messageContent && !isStreaming
        ? detectArtifacts(messageContent, message.id)
        : [],
    [message.role, messageContent, message.id, isStreaming],
  )

  // Show artifact notification after streaming completes
  useEffect(() => {
    if (!isStreaming && messageArtifacts.length > 0 && !isUser) {
      const timer = setTimeout(() => {
        setShowArtifactNotification(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setShowArtifactNotification(false)
    }
  }, [isStreaming, messageArtifacts.length, isUser])

  // Determine if this message should stream
  const shouldStream = !isUser && isStreaming && isLastMessage && messageContent.length > 0

  console.log("Should stream?", { 
    shouldStream, 
    isUser, 
    isStreaming, 
    isLastMessage, 
    messageId: message.id,
    contentLength: displayContent.length,
    rawContentLength: messageContent.length
  })

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
    if (messageArtifacts.length > 0) {
      onArtifactToggle(messageArtifacts[0].id)
    } else {
      onArtifactToggle()
    }
  }

  // Standard markdown components
  const markdownComponents = {
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
  }

  // Don't render empty messages
  if (!messageContent && !hasToolInvocations) {
    return null
  }

  return (
    <div className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-9 h-9 mt-1 flex items-center justify-center">
          <AIAssistantIcon size={24} />
        </div>
      )}

      <div className={cn("flex flex-col gap-1 w-full", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative group rounded-2xl px-4 py-3 shadow-md max-w-xl lg:max-w-2xl xl:max-w-3xl break-words",
            isUser ? "bg-gray-200 text-gray-900 rounded-br-none" : "bg-card text-card-foreground border rounded-bl-none",
          )}
        >
          {/* Message Content */}
          {shouldStream ? (
            <StreamingText
              content={messageContent}
              isStreaming={true}
              className={cn("prose prose-sm max-w-none", isUser ? "text-gray-900" : "dark:prose-invert")}
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
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
                    <Wrench className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-sm">Tool: {toolInvocation.toolName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleViewArtifacts}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-3 h-3 mr-1 text-blue-500" />
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
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          </Button>
        )}

        {/* Artifact Notification */}
        {showArtifactNotification && !isUser && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              {messageContent.includes("```chart") || messageContent.includes('"chartType"') ? (
                <>
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-medium">Chart created</span>
                </>
              ) : (
                <>
                  <Code className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {messageArtifacts.length} artifact{messageArtifacts.length > 1 ? "s" : ""} created
                  </span>
                </>
              )}
            </div>
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewArtifacts}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-0 h-auto"
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
      </div>

      {isUser && (
        <Avatar className="w-9 h-9 mt-1 shadow-sm">
          <AvatarFallback className="bg-slate-100 text-slate-600">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
})
