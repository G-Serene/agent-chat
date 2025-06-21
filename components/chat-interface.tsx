"use client"

import type React from "react"
import type { FormEvent } from "react"
import { Message } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageList } from "@/components/message-list"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendHorizonal, Sparkles, Code, BarChart3, AlertTriangle, CornerDownLeft, FileText, Plus, Table, GitBranch, PieChart, LineChart, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useRef } from "react"
import { toast } from "sonner"

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
    title: "Discover data",
    prompt: "Help me discover and explore data assets across Data Platform",
    icon: <FileText className="w-4 h-4 mr-2 text-red-500" />,
  },
  {
    title: "Write code",
    prompt: "Write code to integrate with Data Platform APIs and services",
    icon: <Code className="w-4 h-4 mr-2 text-red-500" />,
  },
  {
    title: "Create chart",
    prompt: "Generate interactive charts and visualizations from my data",
    icon: <BarChart3 className="w-4 h-4 mr-2 text-red-500" />,
  },
  {
    title: "Sales chart",
    prompt: "Show me monthly sales data as a bar chart with revenue and units sold",
    icon: <TrendingUp className="w-4 h-4 mr-2 text-red-500" />,
  },
  {
    title: "Data table",
    prompt: "Display customer information in an interactive sortable table",
    icon: <Table className="w-4 h-4 mr-2 text-red-500" />,
  },
  {
    title: "Process diagram",
    prompt: "Create a flowchart showing the data processing workflow",
    icon: <GitBranch className="w-4 h-4 mr-2 text-red-500" />,
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const hasMessages =
    messages.length > 1 ||
    (messages.length === 1 &&
      messages[0].role !== "assistant" &&
      messages[0].content !== "What would you like to work on today?")

  const handleFileAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const newFiles = Array.from(files)
      setAttachedFiles(prev => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) attached`)
      
      // Reset the input so the same file can be selected again
      event.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    toast.success("File removed")
  }

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
        ) : (          <ScrollArea className="h-full">
            <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-8 text-center">
              <div className="p-4 bg-gradient-to-br from-muted to-muted/50 rounded-sm mb-6 shadow-lg">
                <Sparkles className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">Welcome to Agent Chat!</h2>
              <p className="text-muted-foreground mb-8 max-w-md text-base sm:text-lg">
                What would you like to explore?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                {quickPrompts.map((item) => (
                  <Button
                    key={item.title}
                    variant="outline"
                    className="p-3 sm:p-4 h-auto text-left justify-start bg-background hover:bg-muted/80 transition-all duration-200 group border-2 hover:border-slate-300 min-h-[70px] sm:min-h-[80px]"
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
      )}      {/* Input Area */}
      <div className="p-4 sm:p-6 bg-transparent flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-2 text-sm"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="max-w-32 truncate">{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeFile(index)}
                  >
                    <Plus className="w-3 h-3 rotate-45 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} id="chat-form">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".txt,.pdf,.doc,.docx,.csv,.json,.md"
            />            {/* Main Input Container - Rectangular with rounded corners */}
            <div className="relative bg-background border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black/40 dark:focus-within:border-white/40">
              
              {/* Top Section - Text Input */}
              <div className="px-6 pt-4 pb-2">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask DataFlow"
                  className="w-full min-h-[40px] max-h-40 resize-none border-0 bg-transparent focus:ring-0 focus:outline-none text-base placeholder:text-muted-foreground/70"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e as any)
                    }
                  }}
                />
              </div>
              
              {/* Divider Line */}              {/* Bottom Section - Action Buttons */}
              <div className="flex items-center justify-between px-4 py-3">
                {/* Left Side - File Attachment */}
                <div className="flex items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    title="Add attachment"
                    onClick={handleFileAttachment}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Right Side - AI Features and Send Button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    title="AI Features"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading || !input.trim()}
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg bg-slate-700 hover:bg-slate-800 text-white shadow-md transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
                      (isLoading || !input.trim()) && "bg-muted text-muted-foreground cursor-not-allowed transform-none",
                    )}
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <CornerDownLeft className="w-4 h-4 animate-pulse" />
                    ) : (
                      <SendHorizonal className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>          </form>
          
          <p className="text-xs text-muted-foreground mt-3 text-center px-2">
            AI agents can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}
