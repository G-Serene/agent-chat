"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import type { Message } from "@ai-sdk/react"
import { ChatInterface } from "@/components/chat-interface"
import { Sidebar } from "@/components/sidebar"
import { ArtifactWindow } from "@/components/artifact-window"
import { Button } from "@/components/ui/button"
import { PanelLeftOpen, PanelLeftClose, LayoutGrid } from "lucide-react"
import { Toaster, toast } from "sonner"
import { detectArtifacts, type ArtifactContent } from "@/lib/artifact-detector"
import { ChatStorage, type ChatSessionSummary } from "@/lib/chat-storage"

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [artifactsOpen, setArtifactsOpen] = useState(false)
  const [artifactWindowWidth, setArtifactWindowWidth] = useState(400)
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | undefined>(undefined)
  const [chatSessions, setChatSessions] = useState<ChatSessionSummary[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>("")
  const [chatComponentKey, setChatComponentKey] = useState(0)

  // Define initial messages structure using a memoized function based on session ID
  const getInitialMessagesForSession = useCallback(
    (sessionId: string): Message[] => [
      {
        id: `initial-message-${sessionId || Date.now()}`,
        role: "assistant" as const,
        content:
          "Hello! I'm your AI Agent assistant. I can help you with code, analysis, diagrams, and various tasks. What would you like to work on today?",
      },
    ],
    [],
  )

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/chat",
    id: currentSessionId,
    key: chatComponentKey.toString(),
    body: {
      session_id: currentSessionId,
    },
    initialMessages: currentSessionId ? getInitialMessagesForSession(currentSessionId) : [],
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
            icon: <LayoutGrid className="w-4 h-4 text-blue-500" />,
          })
        }
      }
    },
    keepLastMessageOnError: true,
  })

  // Initialize session on mount
  useEffect(() => {
    const savedSessionId = ChatStorage.getCurrentSessionId()
    const sessions = ChatStorage.getSessionSummaries()
    const savedSidebarWidth = localStorage.getItem("agent-chat-sidebar-width")

    setChatSessions(sessions)

    if (savedSidebarWidth) {
      setSidebarWidth(Number.parseInt(savedSidebarWidth, 10))
    }

    if (savedSessionId && sessions.find((s) => s.id === savedSessionId)) {
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
        setMessages(getInitialMessagesForSession(currentSessionId))
      }
      ChatStorage.setCurrentSessionId(currentSessionId)
    }
  }, [currentSessionId, chatComponentKey, setMessages, getInitialMessagesForSession])

  // Save messages to storage
  useEffect(() => {
    if (currentSessionId && messages && messages.length > 0) {
      const isOnlyInitialPlaceholder = messages.length === 1 && messages[0].id.startsWith("initial-message-")
      if (
        !isOnlyInitialPlaceholder ||
        messages[0].content !== getInitialMessagesForSession(currentSessionId)[0].content
      ) {
        ChatStorage.saveSession(currentSessionId, messages)
        setChatSessions(ChatStorage.getSessionSummaries())
      }
    }
  }, [messages, currentSessionId, getInitialMessagesForSession])

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

  const chatWidth = useMemo(() => {
    const currentSidebarWidth = sidebarOpen ? sidebarWidth : 0
    const artifactWidth = artifactsOpen ? artifactWindowWidth : 0
    return `calc(100vw - ${currentSidebarWidth}px - ${artifactWidth}px)`
  }, [sidebarOpen, sidebarWidth, artifactsOpen, artifactWindowWidth])

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
      const updatedSessions = ChatStorage.getSessionSummaries()
      setChatSessions(updatedSessions)

      if (sessionId === currentSessionId) {
        const newSessionId = updatedSessions.length > 0 ? updatedSessions[0].id : ChatStorage.createNewSession()
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
    setChatSessions([])

    const newSessionId = ChatStorage.createNewSession()
    resetChatStateAndSwitchSession(newSessionId)

    toast.success("Chat history cleared successfully")
  }, [resetChatStateAndSwitchSession])

  const handleSidebarResize = useCallback((newWidth: number) => {
    setSidebarWidth(newWidth)
    localStorage.setItem("agent-chat-sidebar-width", newWidth.toString())
  }, [])

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-background to-slate-50 dark:from-slate-950 dark:via-background dark:to-slate-950 relative overflow-hidden">
        {sidebarOpen && (
          <div
            className="overflow-hidden border-r bg-background/80 backdrop-blur-md shadow-sm z-40 flex-shrink-0 transition-all duration-300 ease-in-out relative"
            style={{ width: `${sidebarWidth}px` }}
          >
            <Sidebar
              onNewChat={handleNewChat}
              chatSessions={chatSessions}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              onClearHistory={handleClearHistory}
            />

            {/* Resize Handle */}
            <div
              className="absolute top-0 right-0 w-1 h-full bg-border hover:bg-blue-500 cursor-col-resize transition-colors duration-200 group"
              onMouseDown={(e) => {
                e.preventDefault()
                const startX = e.clientX
                const startWidth = sidebarWidth

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = Math.max(280, Math.min(500, startWidth + (e.clientX - startX)))
                  handleSidebarResize(newWidth)
                }

                const handleMouseUp = () => {
                  document.removeEventListener("mousemove", handleMouseMove)
                  document.removeEventListener("mouseup", handleMouseUp)
                  document.body.style.cursor = "default"
                  document.body.style.userSelect = "auto"
                }

                document.addEventListener("mousemove", handleMouseMove)
                document.addEventListener("mouseup", handleMouseUp)
                document.body.style.cursor = "col-resize"
                document.body.style.userSelect = "none"
              }}
            >
              <div className="absolute inset-y-0 -right-1 w-3 group-hover:bg-blue-500/20" />
            </div>
          </div>
        )}

        <div
          className="flex flex-col min-w-0 transition-all duration-300 ease-in-out flex-grow"
          style={{ width: chatWidth }}
        >
          <header className="flex items-center justify-between p-3 border-b bg-background/80 backdrop-blur-md shadow-sm z-30">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              </Button>
              <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                Agent Chat
              </h1>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {currentSessionId && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                  Session: {currentSessionId.slice(-8)}
                </div>
              )}
              {allArtifacts.length > 0 && (
                <Button
                  variant={artifactsOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleArtifactToggle()}
                  className="relative text-muted-foreground hover:text-foreground"
                >
                  <LayoutGrid className="h-4 w-4 text-blue-500 mr-2" />
                  Artifacts ({allArtifacts.length})
                  {!artifactsOpen && (
                    <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background" />
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
          </div>
        </div>

        {artifactsOpen && (
          <ArtifactWindow
            artifacts={allArtifacts}
            isOpen={artifactsOpen}
            onClose={() => setArtifactsOpen(false)}
            onResize={setArtifactWindowWidth}
            initialWidth={artifactWindowWidth}
            selectedArtifactId={selectedArtifactId}
          />
        )}
      </div>
    </>
  )
}
