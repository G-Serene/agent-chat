"use client"

import { Message } from "@ai-sdk/react"
import { MessageBubble } from "@/components/message-bubble"
import { useEffect, useRef, useCallback, startTransition } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MessageListProps {
  messages: Message[]
  onArtifactToggle?: (artifactId?: string) => void
  isLoading: boolean
}

export function MessageList({ messages, onArtifactToggle, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(messages.length)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Use startTransition for non-urgent scroll updates
    scrollTimeoutRef.current = setTimeout(() => {
      startTransition(() => {
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ 
              behavior: "smooth",
              block: "end"
            })
          }
        })
      })    }, 150) // Increased delay for better performance
  }, [])

  useEffect(() => {
    // Only scroll when a new message is added, not when content changes
    const currentMessageCount = messages.length
    const hasNewMessage = currentMessageCount > prevMessageCountRef.current
    
    // Also check if the last message has significantly grown (for streaming)
    const lastMessage = messages[messages.length - 1]
    const isStreamingLastMessage = isLoading && lastMessage?.role === "assistant"
    
    if (hasNewMessage || isStreamingLastMessage) {
      // Use longer delays during streaming to prevent UI blocking
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        startTransition(() => {
          requestAnimationFrame(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ 
                behavior: "smooth",
                block: "end"
              })
            }
          })
        })
      }, isStreamingLastMessage ? 300 : 150) // More aggressive throttling during streaming
    }
    
    prevMessageCountRef.current = currentMessageCount
  }, [messages.length, isLoading]) // Removed scrollToBottom from dependencies

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])
  return (    <ScrollArea className="flex-1 h-full" ref={scrollAreaRef}>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 min-h-full max-w-none min-w-0 text-wrap-responsive break-words overflow-wrap-anywhere">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            // Determine if this message is currently streaming
            const isLastMessage = index === messages.length - 1
            const isStreaming = isLastMessage && isLoading && message.role === "assistant"

            return (              <motion.div
                key={message.id}
                layout={!isStreaming} // Disable layout animation during streaming
                initial={isStreaming ? {} : { opacity: 0, y: 20, scale: 0.95 }} // Disable initial animation during streaming
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={isStreaming ? {} : { opacity: 0, y: -10, scale: 0.95 }} // Disable exit animation during streaming
                transition={isStreaming ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }} // No animation during streaming
                className="w-full min-w-0 text-wrap-responsive break-words overflow-wrap-anywhere"
                style={isStreaming ? { willChange: "auto" } : {}} // Optimize for streaming
              >
                <MessageBubble
                  message={message}
                  onArtifactToggle={onArtifactToggle}
                  isStreaming={isStreaming}
                  isLastMessage={isLastMessage}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-start"
          >
            <div className="flex items-center gap-2 p-3 rounded-full bg-muted text-muted-foreground max-w-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Assistant is typing...</span>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>
    </ScrollArea>
  )
}
