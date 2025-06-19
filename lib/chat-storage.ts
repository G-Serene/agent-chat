import type { Message } from "@ai-sdk/ui-utils"

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

const STORAGE_KEY = "agent-chat-sessions"
const CURRENT_SESSION_KEY = "agent-chat-current-session"

// Generate a title from the first user message
function generateChatTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user")
  if (!firstUserMessage || !firstUserMessage.content) {
    return "New Chat"
  }

  const content = typeof firstUserMessage.content === "string" 
    ? firstUserMessage.content 
    : String(firstUserMessage.content)

  // Take first 50 characters and clean up
  const title = content.substring(0, 50).trim()
  return title.length < content.length ? title + "..." : title
}

// Get last message preview
function getLastMessagePreview(messages: Message[]): string {
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage || !lastMessage.content) {
    return "No messages"
  }

  const content = typeof lastMessage.content === "string" 
    ? lastMessage.content 
    : String(lastMessage.content)

  // Remove code blocks for preview
  const cleanContent = content.replace(/```[\s\S]*?```/g, "[code]").trim()
  const preview = cleanContent.substring(0, 100).trim()
  return preview.length < cleanContent.length ? preview + "..." : preview || "Empty message"
}

export class ChatStorage {
  static getAllSessions(): ChatSession[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Failed to load chat sessions:", error)
      return []
    }
  }

  static getSessionSummaries(): ChatSessionSummary[] {
    const sessions = this.getAllSessions()
    return sessions
      .map((session) => ({
        id: session.id,
        title: session.title,
        lastMessage: getLastMessagePreview(session.messages),
        timestamp: session.updatedAt,
        messageCount: session.messages.length,
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  static getSession(sessionId: string): ChatSession | null {
    const sessions = this.getAllSessions()
    return sessions.find((s) => s.id === sessionId) || null
  }

  static saveSession(sessionId: string, messages: Message[]): void {
    if (typeof window === "undefined") return

    try {
      const sessions = this.getAllSessions()
      const existingIndex = sessions.findIndex((s) => s.id === sessionId)

      const sessionData: ChatSession = {
        id: sessionId,
        title: generateChatTitle(messages),
        messages,
        createdAt: existingIndex === -1 ? new Date().toISOString() : sessions[existingIndex].createdAt,
        updatedAt: new Date().toISOString(),
      }

      if (existingIndex === -1) {
        sessions.push(sessionData)
      } else {
        sessions[existingIndex] = sessionData
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error("Failed to save chat session:", error)
    }
  }

  static deleteSession(sessionId: string): void {
    if (typeof window === "undefined") return

    try {
      const sessions = this.getAllSessions()
      const filtered = sessions.filter((s) => s.id !== sessionId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error("Failed to delete chat session:", error)
    }
  }

  static getCurrentSessionId(): string | null {
    if (typeof window === "undefined") return null

    try {
      return localStorage.getItem(CURRENT_SESSION_KEY)
    } catch (error) {
      console.error("Failed to get current session:", error)
      return null
    }
  }

  static setCurrentSessionId(sessionId: string): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
    } catch (error) {
      console.error("Failed to set current session:", error)
    }
  }

  static createNewSession(): string {
    return crypto.randomUUID()
  }
}
