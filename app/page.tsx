"use client"

import { useState, useMemo, useEffect, useCallback, startTransition } from "react"
import { useChat } from "@ai-sdk/react"
import type { Message } from "@ai-sdk/react"

import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { ArtifactWindow } from "@/components/artifact-window"
import { UserMenu } from "@/components/auth/user-menu"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { PanelLeftOpen, PanelLeftClose, LayoutGrid } from "lucide-react"
import { toast } from "sonner"
import { detectArtifacts, type ArtifactContent } from "@/lib/artifact-detector"
import { PerformanceMonitor } from "@/components/performance-monitor"
import { ChatStorage, type TimelineGroup } from "@/lib/chat-storage"
import { cn } from "@/lib/utils"
import { useThrottledResize } from "@/hooks/use-resize-optimization"
import { useMCP } from "@/components/mcp/mcp-provider"

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizingSidebar, setIsResizingSidebar] = useState(false)
  const [isResizingArtifact, setIsResizingArtifact] = useState(false)
  const [artifactsOpen, setArtifactsOpen] = useState(false)
  const [artifactWindowWidth, setArtifactWindowWidth] = useState(400)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | undefined>(undefined)
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>("")
  const [chatComponentKey, setChatComponentKey] = useState(0)

  // MCP hook for tool and resource management
  const mcp = useMCP()



  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    id: currentSessionId,
    body: {
      session_id: currentSessionId,
      selected_tools: mcp.selectedTools
    },
    initialMessages: [],
    onError: (err) => {
      console.error("❌ Chat error:", err)
      toast.error("An error occurred", { description: err.message })
    },
    onFinish: (message) => {
      console.log("✅ Message finished streaming:", message.content?.substring(0, 100) + "...")
      if (message.content) {
        const artifacts = detectArtifacts(message.content, message.id)
        if (artifacts.length > 0) {
          setArtifactsOpen(true)
          setSelectedArtifactId(artifacts[0].id)
          toast.success(`${artifacts.length} artifact${artifacts.length > 1 ? "s" : ""} generated`, {
            description: "Check the artifacts panel for details.",
            icon: <LayoutGrid className="w-4 h-4 text-accent" />,
          })
        }
      }
    },
    keepLastMessageOnError: true,
  })

  // Extract artifacts from messages
  const allArtifacts = useMemo(() => {
    const artifacts: ArtifactContent[] = []
    messages.forEach((message) => {
      if (message.role === "assistant" && message.content) {
        const isLastMessage = message === messages[messages.length - 1]
        const isCurrentlyStreaming = isLastMessage && isLoading
        if (!isCurrentlyStreaming) {
          const messageArtifacts = detectArtifacts(message.content, message.id)
          artifacts.push(...messageArtifacts)
        }
      }
    })
    return artifacts
  }, [messages, isLoading])

  // Initialize session on mount
  useEffect(() => {
    const savedSessionId = ChatStorage.getCurrentSessionId()
    const timelineGroups = ChatStorage.getSessionsByTimeline()
    const savedSidebarWidth = localStorage.getItem("agent-chat-sidebar-width")

    setTimelineGroups(timelineGroups)

    if (savedSidebarWidth) {
      setSidebarWidth(Number.parseInt(savedSidebarWidth, 10))
    }

    if (savedSessionId && timelineGroups.some(group => 
      group.sessions.some(session => session.id === savedSessionId)
    )) {
      setCurrentSessionId(savedSessionId)
    } else {
      const newSessionId = ChatStorage.createNewSession()
      setCurrentSessionId(newSessionId)
      ChatStorage.setCurrentSessionId(newSessionId)
    }
    setChatComponentKey((prev) => prev + 1)
  }, [])

  // Load messages from storage when session ID changes
  useEffect(() => {
    if (currentSessionId) {
      const session = ChatStorage.getSession(currentSessionId)
      if (session && session.messages.length > 0) {
        console.log("📂 Loading existing session:", currentSessionId, "with", session.messages.length, "messages")
        setMessages(session.messages)
      } else {
        console.log("🆕 Initializing new or empty session:", currentSessionId)
        setMessages([])
      }
      ChatStorage.setCurrentSessionId(currentSessionId)
    }
  }, [currentSessionId, chatComponentKey, setMessages])

  // Save messages to storage
  useEffect(() => {
    if (currentSessionId && messages && messages.length > 0) {
      ChatStorage.saveSession(currentSessionId, messages)
      setTimelineGroups(ChatStorage.getSessionsByTimeline())
    }
  }, [messages, currentSessionId])

  // Calculate default artifact window width
  useEffect(() => {
    const updateDefaultWidth = () => {
      const windowWidth = window.innerWidth
      const defaultArtifactWidth = Math.max(300, Math.min(800, windowWidth * 0.4))
      setArtifactWindowWidth(defaultArtifactWidth)
    }
    updateDefaultWidth()
    window.addEventListener("resize", updateDefaultWidth)
    return () => window.removeEventListener("resize", updateDefaultWidth)
  }, [])

  const handleArtifactToggle = (artifactId?: string) => {
    if (artifactId) {
      setSelectedArtifactId(artifactId)
      setArtifactsOpen(true)
    } else {
      setArtifactsOpen(!artifactsOpen)
    }
  }

  const resetChatStateAndSwitchSession = useCallback((newSessionId: string) => {
    setArtifactsOpen(false)
    setSelectedArtifactId(undefined)
    setCurrentSessionId(newSessionId)
    setChatComponentKey((prev) => prev + 1)
    ChatStorage.setCurrentSessionId(newSessionId)
  }, [])

  const handleNewChat = useCallback(() => {
    console.log("🆕 Creating new chat session")
    const newSessionId = ChatStorage.createNewSession()
    resetChatStateAndSwitchSession(newSessionId)
    toast.info("New chat started.")
  }, [resetChatStateAndSwitchSession])

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      if (sessionId !== currentSessionId) {
        console.log("🔄 Switching to session:", sessionId)
        resetChatStateAndSwitchSession(sessionId)
      }
    },
    [currentSessionId, resetChatStateAndSwitchSession],
  )

  const handleSessionDelete = useCallback(
    (sessionId: string) => {
      ChatStorage.deleteSession(sessionId)
      const updatedTimelineGroups = ChatStorage.getSessionsByTimeline()
      setTimelineGroups(updatedTimelineGroups)

      if (sessionId === currentSessionId) {
        // Find the first available session from timeline groups
        const firstSession = updatedTimelineGroups.find(group => group.sessions.length > 0)?.sessions[0]
        const newSessionId = firstSession ? firstSession.id : ChatStorage.createNewSession()
        resetChatStateAndSwitchSession(newSessionId)
      }
      toast.success("Chat session deleted.")
    },
    [currentSessionId, resetChatStateAndSwitchSession],
  )

  const handleClearHistory = useCallback(() => {
    console.log("🧹 Clearing all chat history")
    localStorage.removeItem("agent-chat-sessions")
    localStorage.removeItem("agent-chat-current-session")
    setTimelineGroups([])

    const newSessionId = ChatStorage.createNewSession()
    resetChatStateAndSwitchSession(newSessionId)

    toast.success("Chat history cleared successfully")
  }, [resetChatStateAndSwitchSession])
  const handleSidebarResize = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth)
    localStorage.setItem("agent-chat-sidebar-width", newWidth.toString())
  }, [])

  // Optimized throttled resize for sidebar
  const throttledSidebarResize = useThrottledResize(handleSidebarResize, 3)

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-muted via-background to-secondary dark:from-slate-900 dark:via-background dark:to-slate-950 relative overflow-hidden">        {sidebarOpen && (
          <div
            className={cn(
              "overflow-hidden border-r bg-background/80 backdrop-blur-md shadow-sm z-40 flex-shrink-0 relative",
              !isResizingSidebar && "transition-all duration-300 ease-in-out"
            )}
            style={{ 
              width: `${sidebarWidth}px`,
              transform: 'translateZ(0)', // Hardware acceleration
              willChange: isResizingSidebar ? 'width' : 'auto'
            }}
          >
            <Sidebar
              onNewChat={handleNewChat}
              timelineGroups={timelineGroups}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              onClearHistory={handleClearHistory}
            />            {/* Resize Handle */}
            <div
              className={cn(
                "absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors duration-200 group",
                isResizingSidebar ? "bg-accent/30" : "bg-border hover:bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                setIsResizingSidebar(true)
                const startX = e.clientX
                const startWidth = sidebarWidth

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = Math.max(280, Math.min(500, startWidth + (e.clientX - startX)))
                  throttledSidebarResize(newWidth)
                }

                const handleMouseUp = () => {
                  document.removeEventListener("mousemove", handleMouseMove)
                  document.removeEventListener("mouseup", handleMouseUp)
                  document.body.style.cursor = "default"
                  document.body.style.userSelect = "auto"
                  setIsResizingSidebar(false)
                }

                document.addEventListener("mousemove", handleMouseMove)
                document.addEventListener("mouseup", handleMouseUp)
                document.body.style.cursor = "col-resize"
                document.body.style.userSelect = "none"
              }}
            >
              <div className={cn(
                "absolute inset-y-0 -right-1 w-3 transition-all duration-200",
                isResizingSidebar ? "bg-accent/20" : "group-hover:bg-accent/20"
              )} />
            </div>
          </div>
        )}        <div
          className={cn(
            "flex flex-col min-w-0 flex-1 overflow-hidden",
            (!isResizingSidebar && !isResizingArtifact) && "transition-all duration-300 ease-in-out"
          )}
          style={{ 
            transform: 'translateZ(0)', // Hardware acceleration
            willChange: (isResizingSidebar || isResizingArtifact) ? 'width' : 'auto'
          }}
        >
          <header className="flex items-center justify-between p-3 border-b bg-background/90 backdrop-blur-md shadow-sm z-30 border-border/50 dark:border-border/50">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-muted-foreground hover:text-primary hover:bg-accent/10 dark:hover:bg-accent/10 flex-shrink-0"
              >
                {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              </Button>
              <Logo 
                src="/data-flow-logo.svg"
                srcDark="/data-flow-logo-dark.svg"
                alt="DataFlow Logo"
                width={200}
                height={40}
                fallbackText="Agent Chat"
                className="min-w-0 flex-1"
              />
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* User Menu */}
              <UserMenu currentSessionId={currentSessionId} />
              
              {/* Artifacts Toggle */}
              {allArtifacts.length > 0 && (
                <Button
                  variant={artifactsOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleArtifactToggle()}
                  className="relative text-muted-foreground hover:text-primary hover:bg-accent/10 dark:hover:bg-accent/10"
                >
                  <LayoutGrid className="h-4 w-4 text-accent mr-2" />
                  Artifacts ({allArtifacts.length})
                  {!artifactsOpen && (
                    <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
                  )}
                </Button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            {currentSessionId && (
              <ChatInterface
                key={chatComponentKey}
                messages={messages}
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                error={error}
                onArtifactToggle={handleArtifactToggle}
                isArtifactsPanelOpen={artifactsOpen}
              />
            )}
          </div>        </div>

        {artifactsOpen && (
          <ArtifactWindow
            artifacts={allArtifacts}
            isOpen={artifactsOpen}
            onClose={() => setArtifactsOpen(false)}
            onResize={(width) => {
              setArtifactWindowWidth(width)
            }}
            onResizeStart={() => setIsResizingArtifact(true)}
            onResizeEnd={() => setIsResizingArtifact(false)}
            initialWidth={artifactWindowWidth}
            selectedArtifactId={selectedArtifactId}
          />
        )}
      </div>
    </>
  )
}
