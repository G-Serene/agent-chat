"use client"

import type React from "react"
import type { Message } from "ai"
import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageList } from "@/components/message-list"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendHorizonal, Sparkles, Code, BarChart3, AlertTriangle, CornerDownLeft, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInterfaceProps {
  messages: Message[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement> | React.ChangeEvent<HTMLInputElement>) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>, chatRequestOptions?: { data?: Record<string, string> }) => void
  isLoading: boolean
  error: Error | undefined
  onArtifactToggle: (artifactId?: string) => void
  isArtifactsPanelOpen: boolean
}

const quickPrompts = [
  {
    title: "Write code",
    prompt: "Write a Python script to analyze data from a CSV file",
    icon: <Code className="w-4 h-4 mr-2 text-black dark:text-white" />,
  },
  {
    title: "Create diagram",
    prompt: "Create a flowchart showing a typical data processing pipeline",
    icon: <BarChart3 className="w-4 h-4 mr-2 text-red-500" />,
  },
  {
    title: "Analyze data",
    prompt: "Help me analyze and visualize sales data trends",
    icon: <FileText className="w-4 h-4 mr-2 text-black dark:text-white" />,
  },
  {
    title: "What can you do?",
    prompt: "What are your capabilities and how can you help me?",
    icon: <Sparkles className="w-4 h-4 mr-2 text-red-500" />,
  },
]

export function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error,
  onArtifactToggle,
  isArtifactsPanelOpen,
}: ChatInterfaceProps) {
  const hasMessages =
    messages.length > 1 ||
    (messages.length === 1 &&
      messages[0].role !== "assistant" &&
      messages[0].content !==
        "Hello! I'm your AI Agent assistant. I can help you with code, analysis, diagrams, and various tasks. What would you like to work on today?")

  const handlePromptClick = (prompt: string) => {
    const syntheticEvent = {
      target: { value: prompt },
    } as React.ChangeEvent<HTMLInputElement>
    handleInputChange(syntheticEvent)

    setTimeout(() => {
      const form = document.getElementById("chat-form") as HTMLFormElement
      if (form) {
        const submitEvent = new Event("submit", { bubbles: true, cancelable: true })
        form.dispatchEvent(submitEvent)
      }
    }, 100)
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 relative">
        {hasMessages ? (
          <MessageList messages={messages} onArtifactToggle={onArtifactToggle} isLoading={isLoading} />
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col items-center justify-center min-h-full p-8 text-center">
              <div className="p-4 bg-gradient-to-br from-muted to-muted/50 rounded-sm mb-6 shadow-lg">
                <Sparkles className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">Welcome to Agent Chat!</h2>
              <p className="text-muted-foreground mb-8 max-w-md text-lg">
                I'm your AI agent assistant. I can help with code, analysis, diagrams, and much more. What would you
                like to explore?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {quickPrompts.map((item) => (
                  <Button
                    key={item.title}
                    variant="outline"
                    className="p-4 h-auto text-left justify-start bg-background hover:bg-muted/80 transition-all duration-200 group border-2 hover:border-slate-300 min-h-[80px]"
                    onClick={() => handlePromptClick(item.prompt)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-sm mb-1">{item.title}</div>
                        <div className="text-sm text-muted-foreground group-hover:text-foreground/80 leading-relaxed break-words whitespace-normal">
                          {item.prompt}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 border-t bg-destructive/10 flex-shrink-0">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span>Error: {error.message}</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-background/80 backdrop-blur-md flex-shrink-0">
        <form onSubmit={handleSubmit} id="chat-form" className="flex items-end gap-3">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me to write code, create diagrams, analyze data, or anything else..."
            className="min-h-[48px] max-h-40 resize-none pr-16 border-input focus:ring-2 focus:ring-slate-400 shadow-sm text-base"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as any)
              }
            }}
          />
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !input.trim()}
            className={cn(
              "bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
              isLoading && "bg-muted text-muted-foreground",
            )}
            aria-label="Send message"
          >
            {isLoading ? <CornerDownLeft className="w-5 h-5 animate-pulse" /> : <SendHorizonal className="w-5 h-5" />}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI agents can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
