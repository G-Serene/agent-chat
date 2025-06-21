import type { Message } from "@ai-sdk/react"

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

export interface TimelineGroup {
  label: string
  sessions: ChatSessionSummary[]
  sortOrder: number
}

export type TimelineGrouping = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month" | "older"

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

// Helper function to determine timeline group for a given date
function getTimelineGroup(date: Date): { group: TimelineGrouping; label: string; sortOrder: number } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  
  const startOfLastWeek = new Date(startOfWeek)
  startOfLastWeek.setDate(startOfWeek.getDate() - 7)
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate >= today) {
    return { group: "today", label: "Today", sortOrder: 0 }
  } else if (messageDate >= yesterday) {
    return { group: "yesterday", label: "Yesterday", sortOrder: 1 }
  } else if (messageDate >= startOfWeek) {
    return { group: "this-week", label: "This Week", sortOrder: 2 }
  } else if (messageDate >= startOfLastWeek) {
    return { group: "last-week", label: "Last Week", sortOrder: 3 }
  } else if (messageDate >= startOfMonth) {
    return { group: "this-month", label: "This Month", sortOrder: 4 }
  } else if (messageDate >= startOfLastMonth) {
    return { group: "last-month", label: "Last Month", sortOrder: 5 }
  } else {
    return { group: "older", label: "Older", sortOrder: 6 }
  }
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

  static getSessionsByTimeline(): TimelineGroup[] {
    const sessions = this.getSessionSummaries()
    const groupMap = new Map<TimelineGrouping, ChatSessionSummary[]>()
    const groupLabels = new Map<TimelineGrouping, { label: string; sortOrder: number }>()

    // Group sessions by timeline
    sessions.forEach((session) => {
      const date = new Date(session.timestamp)
      const { group, label, sortOrder } = getTimelineGroup(date)
      
      if (!groupMap.has(group)) {
        groupMap.set(group, [])
        groupLabels.set(group, { label, sortOrder })
      }
      
      groupMap.get(group)!.push(session)
    })

    // Convert to timeline groups and sort
    const timelineGroups: TimelineGroup[] = Array.from(groupMap.entries()).map(([group, sessions]) => {
      const { label, sortOrder } = groupLabels.get(group)!
      return {
        label,
        sessions: sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        sortOrder
      }
    })

    return timelineGroups.sort((a, b) => a.sortOrder - b.sortOrder)
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
      
      // Check if this is actually new content (more messages than before)
      const previousMessageCount = existingIndex !== -1 ? sessions[existingIndex].messages.length : 0
      const isNewContent = messages.length > previousMessageCount

      const sessionData: ChatSession = {
        id: sessionId,
        title: generateChatTitle(messages),
        messages,
        createdAt: existingIndex === -1 ? new Date().toISOString() : sessions[existingIndex].createdAt,
        // Only update timestamp if there are actually new messages (not just loading existing ones)
        updatedAt: isNewContent ? new Date().toISOString() : (existingIndex !== -1 ? sessions[existingIndex].updatedAt : new Date().toISOString()),
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
